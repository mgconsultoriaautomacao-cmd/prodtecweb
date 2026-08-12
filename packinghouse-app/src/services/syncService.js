// No longer using node-fetch, using global fetch from Electron 28+
function getHeaders(key, tenantId, authToken = null) {
  const h = {
    'apikey': key,
    'Authorization': (authToken && authToken.includes('.')) ? `Bearer ${authToken}` : `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  if (tenantId) {
    h['x-tenant-id'] = tenantId;
  }
  return h;
}

async function refreshSupabaseSession(db, config) {
  const { supabase_url, supabase_key, auth_refresh_token } = config;
  if (!supabase_url || !supabase_key || !auth_refresh_token) return null;

  const cleanUrl = supabase_url.replace(/\/$/, '');
  console.log('Sync: Token expired, attempting refresh...');
  try {
    const res = await fetch(`${cleanUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'apikey': supabase_key,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: auth_refresh_token })
    });

    if (res.ok) {
      const data = await res.json();
      const newToken = data.access_token;
      const newRefresh = data.refresh_token;

      await new Promise((resolve, reject) => {
        db.run(`insert into config(key, value) values('auth_token', ?), ('auth_refresh_token', ?) on conflict(key) do update set value=excluded.value`, [newToken, newRefresh], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      console.log('Sync: Token refreshed successfully.');
      return newToken;
    } else {
      console.error('Sync: Refresh token failed.');
      return null;
    }
  } catch (e) {
    console.error('Sync: Refresh token error:', e);
    return null;
  }
}

async function logFetchError(res, tableName, direction = 'down') {
  const status = res.status;
  const statusText = res.statusText;
  let errorBody = '';
  try {
    errorBody = await res.text();
  } catch (e) {
    errorBody = '(could not read error body)';
  }
  console.error(`Sync [${direction}]: ${tableName} failed. Status: ${status} ${statusText}. Body: ${errorBody}`);
  
  if (status === 401) {
    const { BrowserWindow } = require('electron');
    const { getDb } = require('../db');
    const db = getDb();
    
    if (db) {
      db.run("update config set value = null where key = 'auth_token'");
    }
    
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      wins[0].webContents.send('sync:auth-error', { status, body: errorBody });
    }
  }
}



async function syncToSupabase(db) {
  const config = await new Promise((resolve, reject) => {
    db.all(`select key, value from config where key in ('supabase_url', 'supabase_key', 'tenant_id', 'auth_token', 'auth_refresh_token')`, (err, rows) => {
      if (err) return reject(err);
      const c = {};
      rows.forEach(r => c[r.key] = r.value);
      resolve(c);
    });
  });

  if (!config.supabase_url || !config.supabase_key) {
    console.log('Sync: Skipped sync TO Supabase (Missing credentials)');
    return;
  }

  console.log(`Sync: Starting sync TO ${config.supabase_url}...`);
  const url = config.supabase_url.replace(/\/$/, '');
  const key = config.supabase_key;
  const tenantId = config.tenant_id || null;
  const authToken = config.auth_token || null;
  const headers = getHeaders(key, tenantId, authToken);

  // 1. Sync Scan Events
  const unsyncedScans = await new Promise((resolve, reject) => {
    db.all(`
      select 
        s.*, 
        e.name as employee_name, 
        w.name as weight_name, w.weight_kg,
        p.code as parcel_code,
        f.name as fruit_name,
        v.name as variety_name
      from scan_events s
      left join employees e on s.employee_id = e.id
      left join box_weights w on s.weight_id = w.id
      left join parcels p on s.parcel_id = p.id
      left join fruits f on s.fruit_id = f.id
      left join varieties v on s.variety_id = v.id
      where s.synced = 0 limit 100
    `, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

  if (unsyncedScans.length > 0) {
    try {
      const body = unsyncedScans.map(s => ({
        local_id: s.id,
        ts: new Date(s.ts).toISOString(),
        station_id: s.station_id,
        role: s.role,
        employee_name: s.employee_name || 'DESCONHECIDO',
        raw_barcode: s.raw_barcode,
        weight_name: s.weight_name || 'PADRAO',
        weight_kg: s.weight_kg || 0,
        parcel_code: s.parcel_code || null,
        fruit_name: s.fruit_name || null,
        variety_name: s.variety_name || null,
        caliber: s.caliber || null,
        tenant_id: tenantId
      }));

      let res = await fetch(`${url}/rest/v1/production_scans`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (res.status === 401) {
        const newToken = await refreshSupabaseSession(db, config);
        if (newToken) {
          config.auth_token = newToken; // Update config for subsequent calls in this cycle
          headers.Authorization = `Bearer ${newToken}`;
          res = await fetch(`${url}/rest/v1/production_scans`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
          });
        }
      }

      if (res.ok) {
        const ids = unsyncedScans.map(s => s.id).join(',');
        db.run(`update scan_events set synced = 1 where id in (${ids})`);
        console.log(`Sync [up]: Uploaded ${unsyncedScans.length} scans.`);
      } else {
        await logFetchError(res, 'production_scans', 'up');
      }
    } catch (e) {
      console.error('Sync production_scans failed', e);
    }
  }

  // 2. Sync Quality Audits
  const unsyncedAudits = await new Promise((resolve, reject) => {
    db.all(`
      select q.*, p.remote_id as parcel_remote_id, e.barcode as employee_barcode
      from quality_audits q
      left join parcels p on q.parcel_id = p.id
      left join employees e on q.employee_id = e.id
      where q.synced = 0 limit 100
    `, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });

  if (unsyncedAudits.length > 0) {
    try {
      const body = unsyncedAudits.map(q => ({
        ts: new Date(q.ts).toISOString(),
        station_id: q.station_id,
        employee_barcode: q.employee_barcode,
        penalty_boxes: q.penalty_boxes,
        reason: q.reason,
        issue_type: q.issue_type,
        parcel_id: q.parcel_remote_id || null,
        tenant_id: tenantId,
        inspector_name: 'Desktop App'
      }));

      const res = await fetch(`${url}/rest/v1/quality_audits`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const ids = unsyncedAudits.map(q => q.id).join(',');
        db.run(`update quality_audits set synced = 1 where id in (${ids})`);
        console.log(`Sync [up]: Uploaded ${unsyncedAudits.length} quality audits.`);
      } else {
        await logFetchError(res, 'quality_audits', 'up');
      }
    } catch (e) {
      console.error('Sync quality audits failed', e);
    }
  }

  // 3. Helper for Administrative Data
  async function uploadDict(localTable, remoteTable, getSql, mapRow, matchField, remoteIdField = 'id', onConflictParam = 'on_conflict=barcode') {
    const unsynced = await new Promise((resolve) => {
      db.all(getSql, (err, rows) => resolve(rows || []));
    });

    if (unsynced.length === 0) return;

    try {
      const body = unsynced.map(mapRow);
      const endpoint = `${url}/rest/v1/${remoteTable}?${onConflictParam}`;
      let fetchOpts = {
        method: 'POST',
        headers: { ...headers, 'Prefer': 'return=representation,resolution=merge-duplicates' },
        body: JSON.stringify(body)
      };

      let res = await fetch(endpoint, fetchOpts);

      if (res.status === 401) {
        const newToken = await refreshSupabaseSession(db, config);
        if (newToken) {
          config.auth_token = newToken;
          fetchOpts.headers.Authorization = `Bearer ${newToken}`;
          res = await fetch(endpoint, fetchOpts);
        }
      }

      if (res.ok) {
        const returned = await res.json();
        for (const rem of returned) {
          const matchVal = rem[matchField];
          if (remoteIdField) {
             await new Promise(r => db.run(`update ${localTable} set remote_id = ?, synced = 1 where ${matchField} = ?`, [rem[remoteIdField], matchVal], () => r()));
          } else {
             await new Promise(r => db.run(`update ${localTable} set synced = 1 where ${matchField} = ?`, [matchVal], () => r()));
          }
        }
        console.log(`Sync [up]: Uploaded ${unsynced.length} to ${remoteTable}.`);
      } else {
        await logFetchError(res, remoteTable, 'up');
      }
    } catch (e) {
      console.error(`Sync upload ${remoteTable} failed`, e);
    }
  }

  // Upload Employees
  await uploadDict(
    'employees', 'employees',
    `select * from employees where synced = 0 limit 100`,
    e => ({ ...(e.remote_id ? { id: e.remote_id } : {}), tenant_id: tenantId, barcode: e.barcode, name: e.name, role: e.role, active: Boolean(e.active), photo_path: e.photo_path }),
    'barcode',
    'id',
    'on_conflict=barcode,role'
  );

  // Upload Fruits
  await uploadDict(
    'fruits', 'fruits',
    `select * from fruits where synced = 0 limit 100`,
    f => ({ ...(f.remote_id ? { id: f.remote_id } : {}), tenant_id: tenantId, name: f.name, active: Boolean(f.active) }),
    'name'
  );

  // Upload Varieties
  await uploadDict(
    'varieties', 'varieties',
    `select * from varieties where synced = 0 limit 100`,
    v => ({ ...(v.remote_id ? { id: v.remote_id } : {}), tenant_id: tenantId, name: v.name, active: Boolean(v.active) }),
    'name'
  );

  // Upload Parcels
  await uploadDict(
    'parcels', 'parcels',
    `select * from parcels where synced = 0 limit 100`,
    p => ({ ...(p.remote_id ? { id: p.remote_id } : {}), tenant_id: tenantId, code: p.code, active: Boolean(p.active) }),
    'code'
  );

  // Upload Box Weights
  await uploadDict(
    'box_weights', 'box_weights',
    `select * from box_weights where synced = 0 limit 100`,
    w => ({ ...(w.remote_id ? { id: w.remote_id } : {}), tenant_id: tenantId, name: w.name, weight_kg: w.weight_kg, active: Boolean(w.active) }),
    'name'
  );

  // Upload Barcode Mappings
  const unsyncedMappings = await new Promise(r => db.all(`
    select bm.*, e.remote_id as emp_remote, w.remote_id as weight_remote 
    from barcode_mappings bm
    left join employees e on bm.employee_id = e.id
    left join box_weights w on bm.weight_id = w.id
    where bm.synced = 0 limit 100
  `, (err, rows) => r(rows || [])));

  if (unsyncedMappings.length > 0) {
    // Only upload if the related employee and weight have remote_ids (meaning they were synced first)
    const readyToUpload = unsyncedMappings.filter(m => m.emp_remote && m.weight_remote);
    if (readyToUpload.length > 0) {
      try {
        const body = readyToUpload.map(m => ({
          barcode: m.barcode,
          employee_id: m.emp_remote,
          weight_id: m.weight_remote,
          tenant_id: tenantId
        }));
        let fetchOpts = {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=representation, resolution=merge-duplicates' },
          body: JSON.stringify(body)
        };
        let res = await fetch(`${url}/rest/v1/barcode_mappings`, fetchOpts);
        if (res.status === 401) {
          const newToken = await refreshSupabaseSession(db, config);
          if (newToken) {
            config.auth_token = newToken;
            fetchOpts.headers.Authorization = `Bearer ${newToken}`;
            res = await fetch(`${url}/rest/v1/barcode_mappings`, fetchOpts);
          }
        }
        if (res.ok) {
          const ids = readyToUpload.map(m => `'${m.barcode}'`).join(',');
          await new Promise(r => db.run(`update barcode_mappings set synced = 1 where barcode in (${ids})`, () => r()));
          console.log(`Sync [up]: Uploaded ${readyToUpload.length} barcode_mappings.`);
        }
      } catch (e) {
        console.error('Sync upload barcode_mappings failed', e);
      }
    }
  }

}

async function syncFromSupabase(db) {
  const config = await new Promise((resolve, reject) => {
    db.all(`select key, value from config where key in ('supabase_url', 'supabase_key', 'tenant_id', 'auth_token', 'auth_refresh_token')`, (err, rows) => {
      if (err) return reject(err);
      const c = {};
      rows.forEach(r => c[r.key] = r.value);
      resolve(c);
    });
  });

  if (!config.supabase_url || !config.supabase_key) {
    console.log('Sync: Skipped sync FROM Supabase (Missing credentials)');
    return;
  }

  console.log(`Sync: Starting sync FROM ${config.supabase_url}...`);
  const url = config.supabase_url.replace(/\/$/, '');
  const key = config.supabase_key;
  const tenantId = config.tenant_id || null;
  const authToken = config.auth_token || null;
  const tenantFilter = tenantId ? `&tenant_id=eq.${tenantId}` : '';
  const headers = getHeaders(key, tenantId, authToken);
  
  if (!authToken) {
    console.warn('Sync [down]: No auth_token found. Sync might fail if RLS is enabled.');
  }

  console.log(`Sync [down]: Starting download with TenantID: ${tenantId || 'GLOBAL'}`);

  const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  try {
    // 0. Sync Tenant Config (Metas)
    if (tenantId) {
      const tRes = await fetch(`${url}/rest/v1/tenants?id=eq.${tenantId}&select=target_per_hour_packer,target_per_hour_stacker,value_per_box_packer,value_per_box_stacker`, { headers });
      if (tRes.ok) {
        const [tenant] = await tRes.json();
        if (tenant) {
          const stmt = db.prepare(`insert into config(key, value) values(?, ?) on conflict(key) do update set value=excluded.value`);
          if(tenant.target_per_hour_packer) stmt.run('target_per_hour_packer', String(tenant.target_per_hour_packer));
          if(tenant.target_per_hour_stacker) stmt.run('target_per_hour_stacker', String(tenant.target_per_hour_stacker));
          if(tenant.value_per_box_packer) stmt.run('value_per_box_packer', String(tenant.value_per_box_packer));
          if(tenant.value_per_box_stacker) stmt.run('value_per_box_stacker', String(tenant.value_per_box_stacker));
          stmt.finalize();
          console.log('Sync [down]: Tenant config (metas) updated.');
        }
      }
    }

    // 1. Sync Employees
    let eRes = await fetch(`${url}/rest/v1/employees?select=*${tenantFilter}&limit=5000`, {
      headers: headers
    });
    if (eRes.status === 401) {
      const newToken = await refreshSupabaseSession(db, config);
      if (newToken) {
        config.auth_token = newToken; // Update config for subsequent calls
        headers.Authorization = `Bearer ${newToken}`;
        eRes = await fetch(`${url}/rest/v1/employees?select=*${tenantFilter}&limit=5000`, { headers: headers });
      }
    }
    if (eRes.ok) {
      const remoteEmployees = await eRes.json();
      console.log(`Sync [down]: Fetched ${remoteEmployees.length} employees.`);
      for (const e of remoteEmployees) {
        try {
          // Try update by remote_id first
          const updated = await dbRun(`
            UPDATE employees SET
              barcode = ?, name = ?, role = ?, sector = ?,
              active = ?, photo_path = ?, updated_at = ?, synced = 1
            WHERE remote_id = ?
          `, [e.barcode, e.name, e.role, e.sector, e.active ? 1 : 0, e.photo_path,
              e.updated_at ? new Date(e.updated_at).getTime() : Date.now(), e.id]);

          if (updated.changes === 0) {
            // Not found by remote_id — try to match by (barcode, role) and update remote_id
            const byBarcode = await dbRun(`
              UPDATE employees SET
                name = ?, sector = ?, active = ?, photo_path = ?,
                remote_id = ?, updated_at = ?, synced = 1
              WHERE barcode = ? AND role = ?
            `, [e.name, e.sector, e.active ? 1 : 0, e.photo_path,
                e.id, e.updated_at ? new Date(e.updated_at).getTime() : Date.now(),
                e.barcode, e.role]);

            if (byBarcode.changes === 0) {
              // Truly new employee — insert
              await dbRun(`
                INSERT OR IGNORE INTO employees
                  (barcode, name, role, sector, active, photo_path, remote_id, created_at, updated_at, synced)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
              `, [e.barcode, e.name, e.role, e.sector, e.active ? 1 : 0, e.photo_path,
                  e.id, Date.now(), e.updated_at ? new Date(e.updated_at).getTime() : Date.now()]);
            }
          }
        } catch (err) {
          console.error(`Sync [down]: Error saving employee ${e.name} (${e.barcode}):`, err.message);
        }
      }
      console.log(`Sync [down]: Employees updated.`);
    } else {
      await logFetchError(eRes, 'employees');
    }

    // 2. Sync Box Weights
    let wRes = await fetch(`${url}/rest/v1/box_weights?select=*${tenantFilter}&limit=5000`, {
      headers: headers
    });
    if (wRes.status === 401) {
      const newToken = await refreshSupabaseSession(db, config);
      if (newToken) {
        config.auth_token = newToken; // Update config for subsequent calls
        headers.Authorization = `Bearer ${newToken}`;
        wRes = await fetch(`${url}/rest/v1/box_weights?select=*${tenantFilter}&limit=5000`, { headers: headers });
      }
    }
    if (wRes.ok) {
      const remoteWeights = await wRes.json();
      console.log(`Sync [down]: Fetched ${remoteWeights.length} box_weights.`);
      for (const w of remoteWeights) {
        await dbRun(`
          insert into box_weights (name, weight_kg, active, remote_id, created_at, updated_at)
          values (?, ?, ?, ?, ?, ?)
          on conflict(remote_id) do update set
            name = excluded.name,
            weight_kg = excluded.weight_kg,
            active = excluded.active,
            updated_at = excluded.updated_at,
            synced = 1
          where synced = 1 or excluded.updated_at > box_weights.updated_at
        `, [w.name, w.weight_kg, w.active ? 1 : 0, w.id, Date.now(), w.updated_at ? new Date(w.updated_at).getTime() : Date.now()]);
      }
    } else {
      await logFetchError(wRes, 'box_weights');
    }

    // 3. Sync Quality Audits
    let qRes = await fetch(`${url}/rest/v1/quality_audits?select=*&order=ts.desc&limit=100${tenantFilter}`, {
      headers: headers
    });
    if (qRes.status === 401) {
      const newToken = await refreshSupabaseSession(db, config);
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        qRes = await fetch(`${url}/rest/v1/quality_audits?select=*&order=ts.desc&limit=100${tenantFilter}`, { headers: headers });
      }
    }
    if (qRes.ok) {
      const remoteAudits = await qRes.json();
      console.log(`Sync [down]: Fetched ${remoteAudits.length} quality_audits.`);
      for (const q of remoteAudits) {
        // Find local employee ID by remote_id OR barcode
        const localEmp = await new Promise((resolve) => {
          db.get(`
            select id from employees 
            where remote_id = ? or barcode = ?
          `, [q.employee_id, q.employee_barcode || q.employee_id], (err, row) => {
            resolve(row?.id || null);
          });
        });

        if (localEmp) {
          await dbRun(`
            insert into quality_audits (ts, station_id, employee_id, parcel_id, penalty_boxes, issue_type, reason, remote_id, synced)
            values (?, ?, ?, (select id from parcels where remote_id=?), ?, ?, ?, ?, 1)
            on conflict(remote_id) do update set
              penalty_boxes = excluded.penalty_boxes,
              reason = excluded.reason,
              synced = 1
          `, [new Date(q.ts).getTime(), q.station_id, localEmp, q.parcel_id, q.penalty_boxes, q.issue_type, q.reason, q.id]);
        } else {
          console.warn(`Sync [down]: Could not map quality audit ${q.id} to any local employee.`);
        }
      }

    } else {
      await logFetchError(qRes, 'quality_audits');
    }

    // 4. Sync Today's Production Scans (to fill the dashboard)
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayIso = today.toISOString();
    
    const scansRes = await fetch(`${url}/rest/v1/production_scans?ts=gte.${todayIso}&select=*${tenantFilter}`, {
      headers: headers
    });
    
    if (scansRes.ok) {
      const remoteScans = await scansRes.json();
      console.log(`Sync [down]: Fetched ${remoteScans.length} scans from today.`);
      for (const s of remoteScans) {
        // We only insert if we don't have it (remote_id would be nice, but scan_events doesn't have it yet)
        // For now, let's just insert and hope for the best or skip if we have a scan at the exact same TS and employee
        const localEmp = await new Promise((resolve) => {
          db.get('select id from employees where remote_id=?', [s.employee_id], (err, row) => resolve(row ? row.id : null));
        });
        
        if (!localEmp) continue;

        await dbRun(`
          insert into scan_events (ts, station_id, scanner_id, role, employee_id, raw_barcode, weight_id, parcel_id, fruit_id, variety_id, synced)
          select ?, ?, 'REMOTE', 'EMBALADOR', ?, ?, 
                 (select id from box_weights where remote_id=?),
                 (select id from parcels where remote_id=?),
                 (select id from fruits where remote_id=?),
                 (select id from varieties where remote_id=?),
                 1
          where not exists (
            select 1 from scan_events where ts = ? and raw_barcode = ?
          )
        `, [
          new Date(s.ts).getTime(), s.station_id, localEmp, s.raw_barcode, s.weight_id, s.parcel_id, s.fruit_id, s.variety_id,
          new Date(s.ts).getTime(), s.raw_barcode
        ]);
        
        // Update hourly_stats for the dashboard
        const ts = new Date(s.ts).getTime();
        const hs = ts - (ts % 3600000); // hourStartMs
        
        try {
          await dbRun(`
            insert into hourly_stats(hour_start, station_id, role, employee_id, produced_count, quality_deducted)
            values(?,?, 'EMBALADOR', ?, 1, 0)
            on conflict(hour_start, station_id, role, employee_id) do update set
              produced_count = produced_count + 1
          `, [hs, s.station_id, localEmp]);
        } catch (err) {
          console.error("Ignorando scan remoto por constraint falha (hourly_stats):", err.message);
        }
      }
    }

    // 5. Sync Parcels
    const pRes = await fetch(`${url}/rest/v1/parcels?select=*${tenantFilter}&limit=5000`, {
      headers: headers
    });
    if (pRes.ok) {
      const rem = await pRes.json();
      console.log(`Sync [down]: Fetched ${rem.length} parcels.`);
      for (const p of rem) {
        try {
          await dbRun(`
            insert into parcels (code, active, remote_id, created_at, updated_at, synced)
            values (?, ?, ?, ?, ?, 1)
            on conflict(remote_id) do update set
              code = excluded.code,
              active = excluded.active,
              updated_at = excluded.updated_at,
              synced = 1
            where synced = 1 or excluded.updated_at > parcels.updated_at
          `, [p.code, p.active ? 1 : 0, p.id, Date.now(), p.updated_at ? new Date(p.updated_at).getTime() : Date.now()]);
        } catch (err) {
          console.error(`Sync [down]: Error saving parcel ${p.code}:`, err.message);
        }
      }
      console.log(`Sync [down]: Parcels updated.`);
    }

    // 6. Sync Fruits
    const fRes = await fetch(`${url}/rest/v1/fruits?select=*${tenantFilter}&limit=5000`, {
      headers: headers
    });
    if (fRes.ok) {
      const rem = await fRes.json();
      console.log(`Sync [down]: Fetched ${rem.length} fruits.`);
      for (const f of rem) {
        await dbRun(`
          insert into fruits (name, active, remote_id, created_at, updated_at)
          values (?, ?, ?, ?, ?)
          on conflict(remote_id) do update set
            name = excluded.name,
            active = excluded.active,
            updated_at = excluded.updated_at,
            synced = 1
          where synced = 1 or excluded.updated_at > fruits.updated_at
        `, [f.name, f.active ? 1 : 0, f.id, Date.now(), f.updated_at ? new Date(f.updated_at).getTime() : Date.now()]);
      }
    }

    // 7. Sync Varieties
    const vRes = await fetch(`${url}/rest/v1/varieties?select=*${tenantFilter}&limit=5000`, {
      headers: headers
    });
    if (vRes.ok) {
      const rem = await vRes.json();
      console.log(`Sync [down]: Fetched ${rem.length} varieties.`);
      for (const v of rem) {
        await dbRun(`
          insert into varieties (name, active, remote_id, created_at, updated_at)
          values (?, ?, ?, ?, ?)
          on conflict(remote_id) do update set
            name = excluded.name,
            active = excluded.active,
            updated_at = excluded.updated_at,
            synced = 1
          where synced = 1 or excluded.updated_at > varieties.updated_at
        `, [v.name, v.active ? 1 : 0, v.id, Date.now(), v.updated_at ? new Date(v.updated_at).getTime() : Date.now()]);
      }
    }

    // 8. Sync Barcode Mappings
    const bmRes = await fetch(`${url}/rest/v1/barcode_mappings?select=*${tenantFilter}`, {
      headers: headers
    });
    if (bmRes.ok) {
      const rem = await bmRes.json();
      console.log(`Sync [down]: Fetched ${rem.length} barcode_mappings.`);
      for (const bm of rem) {
        await dbRun(`
          insert into barcode_mappings (barcode, employee_id, weight_id, created_at, updated_at)
          values (?, (select id from employees where remote_id=?), (select id from box_weights where remote_id=?), ?, ?)
          on conflict(barcode) do update set
            employee_id = excluded.employee_id,
            weight_id = excluded.weight_id,
            updated_at = excluded.updated_at
        `, [bm.barcode, bm.employee_id, bm.weight_id, Date.now(), Date.now()]);
      }
    }

    // 9. Sync Parcel Links (Parcelas -> Frutas -> Variedades)
    const plRes = await fetch(`${url}/rest/v1/parcel_links?select=*${tenantFilter}`, {
      headers: headers
    });
    if (plRes.ok) {
      const rem = await plRes.json();
      console.log(`Sync [down]: Fetched ${rem.length} parcel_links.`);
      await dbRun('DELETE FROM parcel_fruit_varieties');
      for (const pl of rem) {
        if (pl.variety_id) {
          try {
            await dbRun(`
              insert or ignore into parcel_fruit_varieties (parcel_id, fruit_id, variety_id)
              values (
                (select id from parcels where remote_id=?),
                (select id from fruits where remote_id=?),
                (select id from varieties where remote_id=?)
              )
            `, [pl.parcel_id, pl.fruit_id, pl.variety_id]);
          } catch (err) {
            console.error(`Sync [down]: Error linking parcel ${pl.parcel_id}:`, err.message);
          }
        }
      }
    }

  } catch (e) {
    console.error('Sync critical failure:', e);
  } finally {
    console.log('Sync [down]: Finished cycle.');
  }
}

module.exports = {
  syncToSupabase,
  syncFromSupabase
};
