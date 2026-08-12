// Using global fetch from Electron 28+
const { nowMs, hourStartMs, dayStartMs, isoDateToday, startOfDayMs, endOfDayMs } = require('./time');
global.WebSocket = require('ws');
const { createClient } = require('@supabase/supabase-js');

function createAppService(db) {
  const normRole = (r) => (r === 'EMPILHADOR' ? 'EMPILHADOR' : 'EMBALADOR');
  const normStation = (s) => String(s || 'ST01');
  const sanitizeNum = (v, def = 0) => {
    if (v === undefined || v === null) return def;
    const clean = String(v).replace(',', '.');
    const n = Number(clean);
    return isNaN(n) ? def : n;
  };

  function all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  function run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  async function configGetAll() {
    const rows = await all(`select key, value from config`);
    return Object.fromEntries(rows.map(r => [r.key, r.value]));
  }

  async function configSet(obj) {
    const entries = Object.entries(obj || {});
    for (const [k, v] of entries) {
      if (v === null || v === undefined || v === 'null') {
        await run(`delete from config where key=?`, [String(k)]);
      } else {
        await run(`
          insert into config(key, value) values(?, ?)
          on conflict(key) do update set value=excluded.value
        `, [String(k), String(v)]);
      }
    }
    return { ok: true };
  }

  async function dbReset() {
    try {
      const tablesToClear = [
        'employees', 'parcels', 'fruits', 'varieties', 'box_weights',
        'scan_events', 'hourly_stats', 'quality_audits', 'barcode_mappings',
        'parcel_pairs'
      ];
      for (const table of tablesToClear) {
        await run(`DELETE FROM ${table}`);
      }
      await run(`DELETE FROM config WHERE key IN ('auth_token', 'auth_refresh_token', 'user_id', 'auth_email', 'tenant_id')`);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  const DEFAULT_SUPA_URL = 'https://yiigaohjvvieeooxsban.supabase.co';
  const DEFAULT_SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpaWdhb2hqdnZpZWVvb3hzYmFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTY1NzksImV4cCI6MjA5MDE5MjU3OX0.CjzcyltkTXHsi0zO7IL-sb5Psy7yMTAnJ7GRQ4maFK8';

  async function authLogin({ email, password }) {
    const config = await configGetAll();
    const url = config.supabase_url || DEFAULT_SUPA_URL;
    const key = config.supabase_key || DEFAULT_SUPA_KEY;

    if (!url || !key) return { ok: false, error: 'CONFIG_MISSING' };

    const sb = createClient(url, key);
    const { data, error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[AuthLogin] Erro Supabase:', error);
      return { ok: false, error: error.message };
    }
    
    console.log('[AuthLogin] Sucesso Auth. Verificando Tenant para UID:', data.user.id);

    const { data: tenants, error: e1 } = await sb.from('tenant_users')
      .select('tenant_id,role,whatsapp')
      .eq('user_id', data.user.id);

    if (e1) console.error('[AuthLogin] Erro ao buscar Tenant:', e1);

    if (!tenants || tenants.length === 0 || e1) {
      console.warn('[AuthLogin] Usuário sem Tenant vinculado.');
      return { ok: false, error: 'Usuário não vinculado a empresa.' };
    }

    await configSet({
      supabase_url: url,
      supabase_key: key,
      auth_token: data.session.access_token,
      auth_refresh_token: data.session.refresh_token,
      user_id: data.user.id,
      auth_email: email,
      tenant_id: tenants[0].tenant_id,
      tenant_role: tenants[0].role,
      tenant_whatsapp: tenants[0].whatsapp
    });

    return { ok: true, user: data.user };
  }

  async function authCheck() {
    const config = await configGetAll();
    const token = config.auth_token;
    if (!token || token === 'null' || token === 'undefined') return { ok: false };
    
    const url = config.supabase_url || DEFAULT_SUPA_URL;
    const key = config.supabase_key || DEFAULT_SUPA_KEY;
    
    // Tenta renovar a sessão se possível (Supabase JWT dura 1h)
    if (config.auth_refresh_token && config.auth_refresh_token !== 'null') {
      try {
        const sb = createClient(url, key);
        const { data, error } = await sb.auth.setSession({
          access_token: config.auth_token,
          refresh_token: config.auth_refresh_token
        });
        if (!error && data.session) {
          await configSet({
            auth_token: data.session.access_token,
            auth_refresh_token: data.session.refresh_token
          });
          console.log('Auth: Session refreshed successfully.');
          return { ok: true, email: config.auth_email };
        }
      } catch (e) {
        console.error('Auth: Refresh failed:', e);
      }
    }
    return { ok: true, email: config.auth_email };
  }

  async function employeesList() {
    return all(`
      select id, barcode, name, role, photo_path, active
      from employees
      order by active desc, name asc
    `);
  }

  async function employeesAdd({ barcode, name, role, photo_path = null }) {
    const b = String(barcode || '').trim();
    const n = String(name || '').trim();
    const r = normRole(role);
    if (!b || !n) return { ok: false, error: 'MISSING_FIELDS' };

    const ts = nowMs();
    await run(`
      insert into employees(barcode, name, role, photo_path, active, created_at, updated_at, synced)
      values(?,?,?,?,1,?,?,0)
      on conflict(barcode, role) do update set
        name=excluded.name,
        photo_path=excluded.photo_path,
        active=1,
        updated_at=excluded.updated_at,
        synced=0
    `, [b, n, r, photo_path, ts, ts]);

    return { ok: true };
  }

  async function employeesUpdate({ id, barcode, name, role, photo_path = null, active = 1 }) {
    const empId = Number(id);
    const b = String(barcode || '').trim();
    const n = String(name || '').trim();
    const r = normRole(role);
    if (!empId || !b || !n) return { ok: false, error: 'MISSING_FIELDS' };

    await run(`
      update employees
      set barcode=?, name=?, role=?, photo_path=?, active=?, updated_at=?, synced=0
      where id=?
    `, [b, n, r, photo_path, Number(active ? 1 : 0), nowMs(), empId]);

    return { ok: true };
  }

  async function employeesDelete({ id }) {
    await run(`
      update employees
      set active=0, updated_at=?, synced=0
      where id=?
    `, [nowMs(), Number(id)]);
    return { ok: true };
  }

  async function fruitsList() {
    return all(`
      select id, name, active
      from fruits
      order by active desc, name asc
    `);
  }

  async function fruitsAdd({ name }) {
    const n = String(name || '').trim();
    if (!n) return { ok: false, error: 'MISSING_NAME' };

    const ts = nowMs();
    await run(`
      insert into fruits(name, active, created_at, updated_at, synced)
      values(?,1,?,?,0)
      on conflict(name) do update set
        active=1,
        updated_at=excluded.updated_at,
        synced=0
    `, [n, ts, ts]);

    return { ok: true };
  }

  async function fruitsUpdate({ id, name, active = 1 }) {
    const fid = Number(id);
    const n = String(name || '').trim();
    if (!fid || !n) return { ok: false, error: 'MISSING_FIELDS' };

    await run(`
      update fruits
      set name=?, active=?, updated_at=?, synced=0
      where id=?
    `, [n, Number(active ? 1 : 0), nowMs(), fid]);

    return { ok: true };
  }

  async function fruitsDelete({ id }) {
    await run(`
      update fruits
      set active=0, updated_at=?, synced=0
      where id=?
    `, [nowMs(), Number(id)]);
    return { ok: true };
  }

  async function varietiesList() {
    return all(`
      select id, name, active
      from varieties
      order by active desc, name asc
    `);
  }

  async function varietiesAdd({ name }) {
    const n = String(name || '').trim();
    if (!n) return { ok: false, error: 'MISSING_NAME' };

    const ts = nowMs();
    await run(`
      insert into varieties(name, active, created_at, updated_at, synced)
      values(?,1,?,?,0)
      on conflict(name) do update set
        active=1,
        updated_at=excluded.updated_at,
        synced=0
    `, [n, ts, ts]);

    return { ok: true };
  }

  async function varietiesUpdate({ id, name, active = 1 }) {
    const vid = Number(id);
    const n = String(name || '').trim();
    if (!vid || !n) return { ok: false, error: 'MISSING_FIELDS' };

    await run(`
      update varieties
      set name=?, active=?, updated_at=?, synced=0
      where id=?
    `, [n, Number(active ? 1 : 0), nowMs(), vid]);

    return { ok: true };
  }

  async function varietiesDelete({ id }) {
    await run(`
      update varieties
      set active=0, updated_at=?, synced=0
      where id=?
    `, [nowMs(), Number(id)]);
    return { ok: true };
  }

  async function parcelsList() {
    return all(`
      select id, code, active
      from parcels
      order by active desc, code asc
    `);
  }

  async function parcelsAdd({ code }) {
    const c = String(code || '').trim().toUpperCase();
    if (!c) return { ok: false, error: 'MISSING_CODE' };

    const ts = nowMs();
    await run(`
      insert into parcels(code, active, created_at, updated_at, synced)
      values(?,1,?,?,0)
      on conflict(code) do update set
        active=1,
        updated_at=excluded.updated_at,
        synced=0
    `, [c, ts, ts]);

    return { ok: true };
  }

  async function parcelsUpdate({ id, code, active = 1 }) {
    const pid = Number(id);
    const c = String(code || '').trim().toUpperCase();
    if (!pid || !c) return { ok: false, error: 'MISSING_FIELDS' };

    await run(`
      update parcels
      set code=?, active=?, updated_at=?, synced=0
      where id=?
    `, [c, Number(active ? 1 : 0), nowMs(), pid]);

    return { ok: true };
  }

  async function parcelsDelete({ id }) {
    await run(`
      update parcels
      set active=0, updated_at=?, synced=0
      where id=?
    `, [nowMs(), Number(id)]);
    return { ok: true };
  }

  async function parcelPairsList({ parcelId }) {
    const pid = Number(parcelId);
    if (!pid) return [];

    return all(`
      select
        pfv.fruit_id as fruitId,
        f.name as fruitName,
        pfv.variety_id as varietyId,
        v.name as varietyName
      from parcel_fruit_varieties pfv
      join fruits f on f.id = pfv.fruit_id
      join varieties v on v.id = pfv.variety_id
      where pfv.parcel_id = ?
      order by f.name asc, v.name asc
    `, [pid]);
  }

  async function parcelPairAdd({ parcelId, fruitId, varietyId }) {
    const pid = Number(parcelId);
    const fid = Number(fruitId);
    const vid = Number(varietyId);
    if (!pid || !fid || !vid) return { ok: false, error: 'MISSING_FIELDS' };

    await run(`
      insert or ignore into parcel_fruit_varieties(parcel_id, fruit_id, variety_id)
      values(?,?,?)
    `, [pid, fid, vid]);

    return { ok: true };
  }

  async function parcelPairRemove({ parcelId, fruitId, varietyId }) {
    const pid = Number(parcelId);
    const fid = Number(fruitId);
    const vid = Number(varietyId);
    if (!pid || !fid || !vid) return { ok: false, error: 'MISSING_FIELDS' };

    await run(`
      delete from parcel_fruit_varieties
      where parcel_id=? and fruit_id=? and variety_id=?
    `, [pid, fid, vid]);

    return { ok: true };
  }

  async function parcelFruitsList({ parcelId }) {
    const pid = Number(parcelId);
    if (!pid) return [];

    return all(`
      select distinct f.id, f.name
      from parcel_fruit_varieties pfv
      join fruits f on f.id = pfv.fruit_id
      where pfv.parcel_id=? and f.active=1
      order by f.name asc
    `, [pid]);
  }

  async function parcelVarietiesList({ parcelId, fruitId }) {
    const pid = Number(parcelId);
    const fid = Number(fruitId);
    if (!pid || !fid) return [];

    return all(`
      select distinct v.id, v.name
      from parcel_fruit_varieties pfv
      join varieties v on v.id = pfv.variety_id
      where pfv.parcel_id=? and pfv.fruit_id=? and v.active=1
      order by v.name asc
    `, [pid, fid]);
  }

  async function boxWeightsList() {
    return all(`
      select id, name, weight_kg, active
      from box_weights
      order by active desc, weight_kg asc, name asc
    `);
  }

  async function boxWeightsAdd({ name, weight_kg }) {
    const n = String(name || '').trim();
    const w = Number(weight_kg || 0);
    if (!n) return { ok: false, error: 'MISSING_NAME' };

    const ts = nowMs();
    await run(`
      insert into box_weights(name, weight_kg, active, created_at, updated_at, synced)
      values(?,?,1,?,?,0)
      on conflict(name) do update set
        weight_kg=excluded.weight_kg,
        active=1,
        updated_at=excluded.updated_at,
        synced=0
    `, [n, w, ts, ts]);

    return { ok: true };
  }

  async function boxWeightsUpdate({ id, name, weight_kg, active = 1 }) {
    const wid = Number(id);
    const n = String(name || '').trim();
    const w = Number(weight_kg || 0);
    if (!wid || !n) return { ok: false, error: 'MISSING_FIELDS' };

    await run(`
      update box_weights
      set name=?, weight_kg=?, active=?, updated_at=?, synced=0
      where id=?
    `, [n, w, Number(active ? 1 : 0), nowMs(), wid]);

    return { ok: true };
  }

  async function boxWeightsDelete({ id }) {
    await run(`
      update box_weights
      set active=0, updated_at=?, synced=0
      where id=?
    `, [nowMs(), Number(id)]);
    return { ok: true };
  }
  
  async function barcodeMappingsList() {
    return all(`
      select 
        bm.barcode, 
        bm.employee_id as employeeId, 
        e.name as employeeName,
        bm.weight_id as weightId,
        w.name as weightName
      from barcode_mappings bm
      join employees e on e.id = bm.employee_id
      join box_weights w on w.id = bm.weight_id
      order by bm.updated_at desc
    `);
  }

  async function barcodeMappingsAdd({ barcode, employeeId, weightId }) {
    const b = String(barcode || '').trim();
    const eid = Number(employeeId);
    const wid = Number(weightId);
    if (!b || !eid || !wid) return { ok: false, error: 'MISSING_FIELDS' };

    const ts = nowMs();
    await run(`
      insert into barcode_mappings(barcode, employee_id, weight_id, created_at, updated_at, synced)
      values(?,?,?,?,?,0)
      on conflict(barcode) do update set
        employee_id=excluded.employee_id,
        weight_id=excluded.weight_id,
        updated_at=excluded.updated_at,
        synced=0
    `, [b, eid, wid, ts, ts]);

    return { ok: true };
  }

  async function barcodeMappingsDelete({ barcode }) {
    await run(`delete from barcode_mappings where barcode=?`, [barcode]);
    // NOTE: For true sync, delete should technically mark as synced=0 and deleted=1, 
    // but the backend barcode_mappings doesn't have soft delete. We will leave it as hard delete.
    return { ok: true };
  }

  async function contextGet({ stationId = 'ST01', role = 'EMBALADOR' } = {}) {
    const st = normStation(stationId);
    const rl = normRole(role);

    const row = await get(`
      select station_id, role, parcel_id, fruit_id, variety_id, weight_id
      from station_context
      where station_id=? and role=?
    `, [st, rl]);

    return row || {
      station_id: st,
      role: rl,
      parcel_id: null,
      fruit_id: null,
      variety_id: null,
      weight_id: null
    };
  }

  async function contextSet({ stationId = 'ST01', role = 'EMBALADOR', parcelId = null, fruitId = null, varietyId = null, weightId = null } = {}) {
    const st = normStation(stationId);
    const rl = normRole(role);

    await run(`
      insert into station_context(station_id, role, parcel_id, fruit_id, variety_id, weight_id, updated_at)
      values(?,?,?,?,?,?,?)
      on conflict(station_id, role) do update set
        parcel_id=excluded.parcel_id,
        fruit_id=excluded.fruit_id,
        variety_id=excluded.variety_id,
        weight_id=excluded.weight_id,
        updated_at=excluded.updated_at
    `, [
      st,
      rl,
      parcelId ? Number(parcelId) : null,
      fruitId ? Number(fruitId) : null,
      varietyId ? Number(varietyId) : null,
      weightId ? Number(weightId) : null,
      nowMs()
    ]);

    return { ok: true };
  }

  async function scanSubmit({ stationId = 'ST01', scannerId = 'SC01', role = 'EMBALADOR', rawBarcode, caliber = null, cvBoxModel = null, cvWeight = null }) {
    const ts = nowMs();
    const st = normStation(stationId);
    const sc = String(scannerId || 'SC01');
    const rl = normRole(role);
    const raw = String(rawBarcode || '').trim();

    if (!raw) return { ok: false, error: 'EMPTY_BARCODE' };

    // 0. Anti-duplicate Check (2 seconds)
    const lastScan = await get(`
      select ts, raw_barcode
      from scan_events
      where station_id=? and scanner_id=?
      order by ts desc
      limit 1
    `, [st, sc]);

    if (lastScan && lastScan.raw_barcode === raw && (ts - lastScan.ts) < 2000) {
      return { ok: true, ignored: true, reason: 'DUPLICATE_SCAN' };
    }

    // Common context retrieval
    const ctx = await contextGet({ stationId: st, role: rl });

    // 1. Try mapping (Combined Barcode logic)
    const mapping = await get(`
      select m.employee_id, m.weight_id, e.name, e.photo_path
      from barcode_mappings m
      join employees e on e.id = m.employee_id
      where m.barcode=? and e.role=? and e.active=1
    `, [raw, rl]);

    console.log(`[ScanSubmit] Raw: ${raw} | Mapping Found for Role ${rl}: ${mapping ? 'YES' : 'NO'}`);

    let emp = null;
    let weightId = null;

    if (mapping) {
      weightId = mapping.weight_id;
      emp = {
        id: mapping.employee_id,
        name: mapping.name,
        photo_path: mapping.photo_path
      };
    } else {
      // 2. Legacy logic (Badge only)
      emp = await get(`
        select id, name, photo_path
        from employees
        where barcode=? and role=? and active=1
      `, [raw, rl]);

      weightId = rl === 'EMBALADOR' ? (ctx.weight_id || null) : null;
    }

    // Base weight override from camera
    let baseWeightName = null;
    if (cvBoxModel && cvBoxModel !== 'NÃO IDENTIF.') {
      baseWeightName = cvBoxModel;
      
      // Try to find the base weight ID by name first (as a fallback in case caliber mapping fails)
      try {
        const matchingBase = await get(`
          select id from box_weights 
          where (name = ? or name like ?) and active = 1
          limit 1
        `, [baseWeightName, `%${baseWeightName}%`]);
        if (matchingBase) {
          weightId = matchingBase.id;
        }
      } catch (err) {
        console.error('[ScanSubmit] Error finding base weight by cvBoxModel name:', err);
      }

      // If we also have a cvWeight (e.g., 13), try to find a weight record matching the weight number
      if (cvWeight) {
        try {
          const weightNum = Number(cvWeight);
          const possibleModelNames = [
            `${baseWeightName} ${weightNum}kg`,
            `${baseWeightName} ${weightNum} kg`,
            `${baseWeightName} - ${weightNum}kg`,
            `${baseWeightName} - ${weightNum} kg`,
            `${baseWeightName} ${weightNum}`,
            `Caixa ${baseWeightName} ${weightNum}kg`
          ];
          const placeholders = possibleModelNames.map(() => '?').join(',');
          const matchingModel = await get(`
            select id from box_weights 
            where name in (${placeholders}) and active = 1
            limit 1
          `, possibleModelNames);
          if (matchingModel) {
            weightId = matchingModel.id;
          }
        } catch (err) {
          console.error('[ScanSubmit] Error finding base weight by cvBoxModel & cvWeight:', err);
        }
      }
    } else if (weightId) {
      try {
        const baseWeight = await get(`select name from box_weights where id=?`, [weightId]);
        if (baseWeight) baseWeightName = baseWeight.name;
      } catch (err) {
        console.error('[ScanSubmit] Error getting base weight name:', err);
      }
    }

    // Caliber-specific weight lookup
    if (baseWeightName && caliber) {
      try {
        const match = String(caliber).match(/\d+/);
        const caliberNum = match ? match[0] : null;
        if (caliberNum) {
          const possibleNames = [
            `${baseWeightName} - Calibre ${caliberNum}`,
            `${baseWeightName} - Cal. ${caliberNum}`,
            `${baseWeightName} - ${caliberNum}`,
            `${baseWeightName} Calibre ${caliberNum}`,
            `${baseWeightName} Cal. ${caliberNum}`,
            `${baseWeightName} ${caliberNum}`
          ];
          const placeholders = possibleNames.map(() => '?').join(',');
          const specificWeight = await get(`
            select id from box_weights 
            where name in (${placeholders}) and active = 1
          `, possibleNames);
          
          if (specificWeight) {
            weightId = specificWeight.id;
            console.log(`[ScanSubmit] Dynamic Weight Match: Found caliber specific weight for ${baseWeightName} and Calibre ${caliberNum} -> id ${weightId}`);
          }
        }
      } catch (err) {
        console.error('[ScanSubmit] Error resolving caliber weight:', err);
      }
    }

    console.log(`[ScanSubmit] Step 2 | Emp: ${emp ? emp.name : 'NONE'} | WeightId: ${weightId}`);

    if (!emp) {
      return { ok: false, error: 'Código não pertence à função ativa ou colaborador não encontrado.' };
    }

    await run(`
      insert into scan_events(ts, station_id, scanner_id, role, employee_id, raw_barcode, weight_id, parcel_id, fruit_id, variety_id, caliber)
      values(?,?,?,?,?,?,?,?,?,?,?)
    `, [
      ts,
      st,
      sc,
      rl,
      emp.id,
      raw,
      weightId,
      ctx.parcel_id || null,
      ctx.fruit_id || null,
      ctx.variety_id || null,
      caliber
    ]);

    if (emp) {
      const hs = hourStartMs(ts);

      await run(`
        insert into hourly_stats(hour_start, station_id, role, employee_id, produced_count, quality_deducted)
        values(?,?,?,?,0,0)
        on conflict(hour_start, station_id, role, employee_id) do nothing
      `, [hs, st, rl, emp.id]);

      await run(`
        update hourly_stats
        set produced_count = produced_count + 1
        where hour_start=? and station_id=? and role=? and employee_id=?
      `, [hs, st, rl, emp.id]);
    }

    return {
      ok: true,
      counted: !!emp,
      employee: emp || null,
      context: ctx,
      usedWeightId: weightId
    };
  }

  async function stateGet({ stationId = 'ST01', role = 'EMBALADOR' } = {}) {
    const cfg = await configGetAll();
    const st = normStation(stationId);
    const rl = normRole(role);
    const ds = dayStartMs(nowMs());
    const de = ds + 86399999;
    const targetKey = rl === 'EMPILHADOR' ? 'target_per_hour_stacker' : 'target_per_hour_packer';
    const hourlyTarget = Number(cfg[targetKey] || '100');

    // Anti-Fraud Logic: Compare Stacker vs Packer totals
    let fraudPenaltyPerEmp = 0;
    /* Lógica Anti-Fraude desativada temporariamente a pedido do usuário
    if (rl === 'EMPILHADOR') {
      const totalPacked = (await get(`
        select count(*) as n from scan_events 
        where station_id=? and role='EMBALADOR' and employee_id is not null and ts between ? and ?
      `, [st, ds, de]))?.n || 0;

      const totalStacked = (await get(`
        select count(*) as n from scan_events 
        where station_id=? and role='EMPILHADOR' and employee_id is not null and ts between ? and ?
      `, [st, ds, de]))?.n || 0;

      if (totalStacked > totalPacked + 10) {
        const totalExcess = totalStacked - (totalPacked + 10);
        // Count how many stackers are active today to divide the penalty
        const activeStackers = (await get(`
          select count(distinct employee_id) as n from hourly_stats 
          where station_id=? and role='EMPILHADOR' and hour_start >= ?
        `, [st, ds]))?.n || 1;
        
        fraudPenaltyPerEmp = Math.ceil(totalExcess / activeStackers);
        console.log(`[AntiFraud] Excess: ${totalExcess} | Active Stackers: ${activeStackers} | Penalty: ${fraudPenaltyPerEmp} per emp`);
      }
    }
    */

    const rows = await all(`
      select e.id, e.name, e.photo_path, 
             sum(hs.produced_count) as produced_count, 
             sum(hs.quality_deducted) + coalesce((
               select sum(penalty_boxes) from quality_audits 
               where employee_id = e.id 
               and ts between ? and ?
             ), 0) as quality_deducted,

             count(hs.hour_start) as hours_active
      from hourly_stats hs
      join employees e on e.id = hs.employee_id
      where hs.hour_start>=? and hs.station_id=? and hs.role=?
      group by e.id, e.name, e.photo_path
      order by (sum(hs.produced_count) - (sum(hs.quality_deducted) + coalesce((
               select sum(penalty_boxes) from quality_audits 
               where employee_id = e.id 
               and ts between ? and ?
             ), 0))) desc, e.name asc

    `, [ds, de, ds, st, rl, ds, de]);



    const top10 = rows.slice(0, 10).map(r => {
      const produced = Number(r.produced_count || 0);
      const deducted = Number(r.quality_deducted || 0);
      const hoursActive = Number(r.hours_active || 1);
      const targetForEmployee = hourlyTarget * hoursActive;

      // NET PRODUCTION (Produced - Quality Penalties)
      const netProduced = Math.max(0, produced - deducted);
      
      const qualityPct = produced > 0 ? Math.max(0, (netProduced / produced) * 100) : 100;
      
      // Productivity now based on NET production
      const productivityPct = targetForEmployee > 0 ? (netProduced / targetForEmployee) * 100 : 0;

      return {
        id: r.id,
        name: r.name,
        photoPath: r.photo_path || '',
        produced: Math.max(0, netProduced - fraudPenaltyPerEmp),
        qualityPct: Math.round(qualityPct * 10) / 10,
        productivityPct: Math.round(productivityPct * 10) / 10,
        fraudPenalty: fraudPenaltyPerEmp
      };

    });


    return {
      role: rl,
      leader: top10[0] || null,
      top10,
      targetPerHour: hourlyTarget
    };
  }

  async function totalsNow({ stationId = 'ST01', role = 'EMBALADOR' } = {}) {
    const st = normStation(stationId);
    const rl = normRole(role);
    const ts = nowMs();
    const ds = dayStartMs(ts);
    const hs = hourStartMs(ts);

    const cfg = await configGetAll();
    const isMelonMode = cfg.culture_type === 'MELAO_MELANCIA';

    const dayRow = await get(`
      select count(*) as n, sum(coalesce(bw.weight_kg, 0)) as kg
      from scan_events se
      left join box_weights bw on bw.id = se.weight_id
    where se.station_id=? and se.role=? and se.employee_id is not null and se.ts>=?
    `, [st, rl, ds]);

    const hourRow = await get(`
      select count(*) as n
      from scan_events
      where station_id=? and role=? and employee_id is not null and ts>=?
    `, [st, rl, hs]);

    // Get Quality Penalties (Deductions from AppSheet/Sync) - Strict Daily Bound
    const penalties = await get(`
      select sum(penalty_boxes) as n
      from quality_audits
      where ts>=?
    `, [ds]);
    const penaltyCount = Number(penalties?.n || 0);


    console.log(`[TotalsNow] Station: ${st} | Role: ${rl} | DayStart: ${ds} | Penalties: ${penaltyCount}`);


    let byWeight = [];
    let byParcel = [];

    // Always get byWeight for the bottom list
    byWeight = await all(`
      select coalesce(bw.name, 'SEM PESO') as label, count(*) as boxes, sum(coalesce(bw.weight_kg, 0)) as kg
      from scan_events se
      left join box_weights bw on bw.id = se.weight_id
      where se.station_id=? and se.role=? and se.employee_id is not null and se.ts>=?
      group by coalesce(bw.name, 'SEM PESO')
      order by boxes desc
    `, [st, rl, ds]);

    if (isMelonMode) {
      byParcel = await all(`
        select 
          (coalesce(p.code, 'S/P') || ' - ' || coalesce(f.name, 'S/F') || ' (' || coalesce(v.name, 'S/V') || ')') as label,
          count(*) as boxes,
          sum(coalesce(bw.weight_kg, 0)) as kg
        from scan_events se
        left join box_weights bw on bw.id = se.weight_id
        left join parcels p on p.id = se.parcel_id
        left join fruits f on f.id = se.fruit_id
        left join varieties v on v.id = se.variety_id
        where se.station_id=? and se.role=? and se.employee_id is not null and se.ts>=?
        group by se.parcel_id, se.fruit_id, se.variety_id
        order by boxes desc
      `, [st, rl, ds]);
      console.log(`[Service] totalsNow: isMelonMode=true, byParcel count=${byParcel.length}`);
    } else {
      console.log(`[Service] totalsNow: isMelonMode=false (culture_type=${cfg.culture_type})`);
    }

    return {
      stationId: st,
      role: rl,
      dayTotal: Math.max(0, Number(dayRow?.n || 0) - penaltyCount),
      dayKg: Math.round((dayRow?.kg || 0) * 10) / 10,
      hourTotal: Number(hourRow?.n || 0),
      byWeight,
      byParcel
    };
  }

  async function dashboardGetStats({ stationId = 'ST01', startMs, endMs, employeeId = null }) {
    const st = normStation(stationId);
    const s = Number(startMs);
    const e = Number(endMs);

    // Build conditional where clauses for queries
    const empWhere = employeeId ? `AND se.employee_id = ?` : ``;
    const empParam = employeeId ? [employeeId] : [];

    const collaboratorStats = await all(`
      select 
        e.id, e.name, e.photo_path as photoPath, e.role,
        max(0, count(se.id) - coalesce((
          select sum(penalty_boxes) from quality_audits 
          where employee_id = e.id and ts between ? and ?
        ), 0)) as boxes,
        sum(coalesce(bw.weight_kg, 0)) as kg,
        coalesce((
          select sum(penalty_boxes) from quality_audits 
          where employee_id = e.id and ts between ? and ?
        ), 0) as penalty_boxes
      from employees e
      join scan_events se on se.employee_id = e.id
      left join box_weights bw on bw.id = se.weight_id
      where se.station_id = ? and se.ts between ? and ? ${empWhere}
      group by e.id, e.name, e.photo_path, e.role
      order by (count(se.id) - coalesce((
          select sum(penalty_boxes) from quality_audits 
          where employee_id = e.id and ts between ? and ?
        ), 0)) desc
      limit 10
    `, [s, e, s, e, st, s, e, ...empParam, s, e]);


    const boxTypeStats = await all(`
      select 
        coalesce(bw.name, 'SEM PESO') as label,
        count(se.id) as boxes,
        sum(coalesce(bw.weight_kg, 0)) as kg
      from scan_events se
      left join box_weights bw on bw.id = se.weight_id
      where se.station_id = ? and se.employee_id is not null and se.ts between ? and ? ${empWhere}
      group by coalesce(bw.name, 'SEM PESO')
      order by boxes desc
    `, [st, s, e, ...empParam]);

    const parcelStats = await all(`
      select 
        (coalesce(p.code, 'S/P') || ' - ' || coalesce(f.name, 'S/F') || ' (' || coalesce(v.name, 'S/V') || ')') as label,
        count(se.id) as boxes,
        sum(coalesce(bw.weight_kg, 0)) as kg
      from scan_events se
      left join box_weights bw on bw.id = se.weight_id
      left join parcels p on p.id = se.parcel_id
      left join fruits f on f.id = se.fruit_id
      left join varieties v on v.id = se.variety_id
      where se.station_id = ? and se.employee_id is not null and se.ts between ? and ? ${empWhere}
      group by se.parcel_id, se.fruit_id, se.variety_id
      order by boxes desc
    `, [st, s, e, ...empParam]);

    const isMelonMode = (await configGetAll()).culture_type === 'MELAO_MELANCIA';
    console.log(`[Service] dashboardGetStats: isMelonMode=${isMelonMode}, parcelStats count=${parcelStats.length}`);

    // Comparison with previous period (same duration)
    const duration = e - s;
    const prevStart = s - duration;
    const prevEnd = s;

    const currentTotal = await get(`select count(*) as n from scan_events se where se.station_id=? and se.employee_id is not null and se.ts between ? and ? ${empWhere}`, [st, s, e, ...empParam]);
    const prevTotal = await get(`select count(*) as n from scan_events se where se.station_id=? and se.employee_id is not null and se.ts between ? and ? ${empWhere}`, [st, prevStart, prevEnd, ...empParam]);

    const hourlyCollab = await all(`
      select 
        e.name, 
        strftime('%H', se.ts / 1000, 'unixepoch', 'localtime') as hr,
        count(se.id) as boxes
      from scan_events se
      join employees e on se.employee_id = e.id
      where se.station_id = ? and se.ts between ? and ? ${empWhere}
      group by e.name, hr
      order by hr asc, boxes desc
    `, [st, s, e, ...empParam]);

    const totalStats = await get(`
      select 
        count(se.id) as totalBoxes,
        sum(coalesce(bw.weight_kg, 0)) as totalKg
      from scan_events se
      left join box_weights bw on bw.id = se.weight_id
      where se.station_id = ? and se.ts between ? and ? ${empWhere}
    `, [st, s, e, ...empParam]);

    const penalties = await get(`
      select sum(penalty_boxes) as n
      from quality_audits
      where ts between ? and ? ${empWhere}
    `, [s, e, ...empParam]);
    const penaltyCount = Number(penalties?.n || 0);

    const netBoxes = Math.max(0, (totalStats?.totalBoxes || 0) - penaltyCount);
    const hoursActive = Math.max(1, Math.round((e - s) / 3600000));
    const avgPerHour = Math.round(netBoxes / hoursActive);


    const cfg = await configGetAll();
    const tPacker = Number(cfg.target_per_hour_packer || 100);
    const tStacker = Number(cfg.target_per_hour_stacker || 100);

    // Calculate Average Scan Gap Time (Cadência) if filtered by employee
    let avgScanGapMs = 0;
    if (employeeId) {
      const scans = await all(`
        select ts from scan_events 
        where station_id = ? and employee_id = ? and ts between ? and ? 
        order by ts asc
      `, [st, employeeId, s, e]);
      
      if (scans && scans.length > 1) {
        let sumGaps = 0;
        let validGaps = 0;
        for (let i = 1; i < scans.length; i++) {
          const gap = scans[i].ts - scans[i-1].ts;
          // Ignore gaps larger than 10 minutes (600000 ms), assuming they are breaks
          if (gap < 600000) {
            sumGaps += gap;
            validGaps++;
          }
        }
        if (validGaps > 0) {
          avgScanGapMs = Math.round(sumGaps / validGaps);
        }
      }
    }

    return {
      collaboratorStats: collaboratorStats.map(c => {
        const target = c.role === 'EMPILHADOR' ? tStacker : tPacker;
        const totalRaw = Number(c.boxes || 0);
        const penalties = Number(c.penalty_boxes || 0);
        const netBoxes = Math.max(0, totalRaw - penalties);
        
        return {
          ...c,
          boxes: netBoxes, // Override with net boxes for charts
          rawBoxes: totalRaw,
          target,
          yieldPct: target > 0 ? Math.round((netBoxes / target) * 100) : 0
        };
      }),

      boxTypeStats,
      parcelStats,
      hourlyCollab,
      totalBoxes: netBoxes,
      totalKg: Math.round((totalStats?.totalKg || 0) * 10) / 10,
      penaltyCount,
      avgPerHour,
      qualityBreakdown: await all(`
        select coalesce(issue_type, 'Outros') as label, sum(penalty_boxes) as count
        from quality_audits
        where ts between ? and ? ${empWhere}
        group by coalesce(issue_type, 'Outros')
        order by count desc
      `, [s, e, ...empParam]),

      qualityWorstPerformers: await all(`
        select e.name, sum(q.penalty_boxes) as penalty_count
        from quality_audits q
        join employees e on e.id = q.employee_id
        where q.ts between ? and ? ${empWhere}
        group by e.name
        order by penalty_count desc
        limit 5
      `, [s, e, ...empParam]),



      avgScanGapSec: avgScanGapMs > 0 ? (avgScanGapMs / 1000).toFixed(1) : 0,
      targets: { packer: tPacker, stacker: tStacker },
      comparison: {
        current: currentTotal?.n || 0,
        previous: prevTotal?.n || 0
      },
      packerTotal: collaboratorStats
        .filter(c => c.role === 'EMBALADOR')
        .reduce((sum, c) => sum + Number(c.boxes || 0), 0),
      stackerTotal: collaboratorStats
        .filter(c => c.role === 'EMPILHADOR')
        .reduce((sum, c) => sum + Number(c.boxes || 0), 0)
    };
  }


  async function logsList({ startMs = null, endMs = null, stationId = 'ST01', role = null, limit = 500 } = {}) {
    const where = [`se.station_id = ?`];
    const args = [normStation(stationId)];

    if (startMs) {
      where.push(`se.ts >= ?`);
      args.push(Number(startMs));
    }

    if (endMs) {
      where.push(`se.ts <= ?`);
      args.push(Number(endMs));
    }

    if (role) {
      where.push(`se.role = ?`);
      args.push(normRole(role));
    }

    return all(`
      select
        se.id,
        se.ts,
        se.role,
        se.raw_barcode as rawBarcode,
        e.name as employeeName,
        e.barcode as employeeBarcode,
        e.photo_path as photoPath,
        bw.name as weightLabel,
        p.code as parcelCode,
        f.name as fruitName,
        v.name as varietyName
      from scan_events se
      left join employees e on e.id = se.employee_id
      left join box_weights bw on bw.id = se.weight_id
      left join parcels p on p.id = se.parcel_id
      left join fruits f on f.id = se.fruit_id
      left join varieties v on v.id = se.variety_id
      where ${where.join(' and ')}
      order by se.ts desc
      limit ${Math.min(1000, Math.max(50, Number(limit || 500)))}
    `, args);
  }

  async function financePreview({ startMs, endMs, role = 'EMBALADOR' }) {
    const rl = normRole(role);
    const cfg = await configGetAll();
    const target = sanitizeNum(cfg[rl === 'EMPILHADOR' ? 'target_per_hour_stacker' : 'target_per_hour_packer'], 100);
    const valuePerBox = sanitizeNum(cfg[rl === 'EMPILHADOR' ? 'value_per_box_stacker' : 'value_per_box_packer'], 0);
    const bonusPct = sanitizeNum(cfg.bonus_pct, 0);

    const items = await all(`
      select
        e.id as employeeId,
        e.name,
        e.photo_path as photoPath,
        count(se.id) as boxes
      from scan_events se
      join employees e on e.id = se.employee_id
      where se.ts between ? and ? and se.role=? and se.employee_id is not null
      group by e.id, e.name, e.photo_path
      order by boxes desc, e.name asc
    `, [Number(startMs), Number(endMs), rl]);

    return {
      ok: true,
      targetPerHour: target,
      valuePerBox,
      bonusPct,
      items: items.map(r => {
        const boxes = Number(r.boxes || 0);
        const grossValue = boxes * valuePerBox;
        const bonusValue = grossValue * (bonusPct / 100);
        return {
          employeeId: r.employeeId,
          name: r.name,
          photoPath: r.photoPath || '',
          boxes,
          avgProd: target ? Math.round((boxes / target) * 1000) / 10 : 0,
          avgQual: 100,
          grossValue: Math.round(grossValue * 100) / 100,
          bonusValue: Math.round(bonusValue * 100) / 100,
          totalValue: Math.round((grossValue + bonusValue) * 100) / 100
        };
      })
    };
  }

  async function dailyFinalize({ stationId = 'ST01', date = isoDateToday() }) {
    const st = normStation(stationId);
    const sMs = startOfDayMs(date);
    const eMs = endOfDayMs(date);

    const cfg = await configGetAll();
    const vPacker = sanitizeNum(cfg.value_per_box_packer, 0);
    const vStacker = sanitizeNum(cfg.value_per_box_stacker, 0);
    const bPct = sanitizeNum(cfg.bonus_pct, 0);

    const aggregates = await all(`
      select 
        e.id as employee_id,
        e.name as employee_name,
        se.role,
        count(se.id) as total_boxes,
        sum(coalesce(bw.weight_kg, 0)) as total_kg
      from scan_events se
      join employees e on se.employee_id = e.id
      left join box_weights bw on bw.id = se.weight_id
      where se.station_id = ? and se.ts between ? and ?
      group by e.id, e.name, se.role
    `, [st, sMs, eMs]);

    if (!aggregates.length) return { ok: false, message: 'Nenhuma produção encontrada para este dia.' };

    const createdAt = Date.now();
    for (const row of aggregates) {
      const vPerBox = Number(row.role === 'EMPILHADOR' ? vStacker : vPacker) || 0;
      const boxes = Number(row.total_boxes) || 0;
      const kg = Number(row.total_kg) || 0;
      const bRate = Number(bPct) || 0;
      
      const gross = boxes * vPerBox;
      const totalValue = Math.round((gross + (gross * bRate / 100)) * 100) / 100;

      await run(`
        insert into daily_production_summary (
          date, station_id, employee_id, employee_name, role, total_boxes, total_kg, total_value, created_at, synced
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        on conflict(date, station_id, employee_id, role) do update set
          total_boxes = excluded.total_boxes,
          total_kg = excluded.total_kg,
          total_value = excluded.total_value,
          created_at = excluded.created_at,
          synced = 0
      `, [date, st, row.employee_id, row.employee_name, row.role, boxes, kg, totalValue || 0, createdAt]);
    }

    // Tenta sincronizar os scans locais com a nuvem ANTES de pedir o relatório
    // Caso contrário, a nuvem não terá os dados para gerar o relatório!
    console.log('Finalize: Iniciando sync forçado antes do relatório...');
    try {
      if (typeof global.forceSync === 'function') {
        await global.forceSync();
      }
    } catch (syncErr) {
      console.error('Finalize: Erro no sync pré-relatório:', syncErr);
    }

    let waSent = 0;
    try {
      console.log('Finalize: Chamando edge function de relatório para:', date);
      const waRes = await fetch(`${cfg.supabase_url}/functions/v1/send-daily-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cfg.auth_token}`
        },
        body: JSON.stringify({ tenant_id: cfg.tenant_id, date: date })
      });
      const waJson = await waRes.json();
      waSent = waJson.sent || 0;
      console.log('Finalize: Resposta do WhatsApp:', waJson);
    } catch(err) {
      console.error('Erro ao chamar edge function send-daily-report:', err);
    }

    return { ok: true, count: aggregates.length, waSent: waSent };
  }

  async function qualityAddAudit({ ts, stationId, employeeId, parcelId, penaltyBoxes, reason, issueType }) {
    const st = normStation(stationId);
    await run(`
      insert into quality_audits (ts, station_id, employee_id, parcel_id, penalty_boxes, reason, issue_type)
      values (?, ?, ?, ?, ?, ?, ?)
    `, [ts || nowMs(), st, employeeId, parcelId, penaltyBoxes, reason, issueType]);
    return { ok: true };
  }


  return {
    configGetAll,

    configSet,
    dbReset,
    authLogin,
    authCheck,
    employeesList,
    employeesAdd,
    employeesUpdate,
    employeesDelete,
    fruitsList,
    fruitsAdd,
    fruitsUpdate,
    fruitsDelete,
    varietiesList,
    varietiesAdd,
    varietiesUpdate,
    varietiesDelete,
    parcelsList,
    parcelsAdd,
    parcelsUpdate,
    parcelsDelete,
    parcelPairsList,
    parcelPairAdd,
    parcelPairRemove,
    parcelFruitsList,
    parcelVarietiesList,
    contextGet,
    contextSet,
    scanSubmit,
    stateGet,
    totalsNow,
    logsList,
    financePreview,
    boxWeightsList,
    boxWeightsAdd,
    boxWeightsUpdate,
    boxWeightsDelete,
    barcodeMappingsList,
    barcodeMappingsAdd,
    barcodeMappingsDelete,
    dashboardGetStats,
    dailyFinalize,
    qualityAddAudit
  };
}

module.exports = { createAppService };
