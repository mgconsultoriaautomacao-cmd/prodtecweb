  const hourly = {};
  (scans||[]).forEach(x => { const h = x.ts.substring(0,13); hourly[h] = (hourly[h]||0)+1; });
  const hLabels = Object.keys(hourly).sort();
  mkChart('chartFinHourly', {
    type: 'line',
    data: { labels: hLabels.map(l=>l.split('T')[1]+'h'), datasets: [{ label: 'Produção/h', data: hLabels.map(l=>hourly[l]), fill: true }] }
  });

  const {data:campo} = await sb.from('field_carrao_sessions').select('*').eq('tenant_id',tenantId).gte('start_ts',toISO(s)).lte('start_ts',toISO(e,'23:59:59'));
  const cDays = {};
  (campo||[]).forEach(x => { const d = x.start_ts.split('T')[0]; cDays[d] = (cDays[d]||0)+1; });
  mkChart('chartFinCampo', {
    type: 'bar',
    data: { labels: labels.map(l=>l.split('-').reverse().slice(0,2).join('/')), datasets: [{ label: 'Carrocões', data: labels.map(l=>cDays[l]||0) }] }
  });
