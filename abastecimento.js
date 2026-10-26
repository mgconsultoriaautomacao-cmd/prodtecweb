/**
 * PRODTEC - Módulo de Frotas & Abastecimentos
 * Integração Supabase + Offline-First com Cache Local
 */

let fuelData = [];
let fuelMachines = [];
let fuelDrivers = [];

async function loadAbastecimentos() {
  try {
    // 1. Carrega máquinas/tratores e condutores
    await loadFuelAuxiliaryData();

    // 2. Tenta carregar do Supabase
    let loadedFromRemote = false;
    if (window.sb && window.tenantId) {
      try {
        const { data, error } = await window.sb
          .from('frota_abastecimentos')
          .select('*')
          .eq('tenant_id', window.tenantId)
          .order('data_hora', { ascending: false });

        if (!error && Array.isArray(data)) {
          fuelData = data;
          loadedFromRemote = true;
          try {
            localStorage.setItem('prodtech_fuel_' + window.tenantId, JSON.stringify(fuelData));
          } catch(e){}
        }
      } catch(e) {
        console.warn('Supabase frota_abastecimentos não disponível, utilizando fallback local:', e);
      }
    }

    // 3. Fallback para LocalStorage se offline
    if (!loadedFromRemote) {
      const cached = localStorage.getItem('prodtech_fuel_' + (window.tenantId || 'default'));
      if (cached) {
        try { fuelData = JSON.parse(cached); } catch(e){ fuelData = []; }
      } else {
        fuelData = generateInitialFuelData();
        try {
          localStorage.setItem('prodtech_fuel_' + (window.tenantId || 'default'), JSON.stringify(fuelData));
        } catch(e){}
      }
    }

    // 4. Popula selects de filtros
    populateFuelVeiculoFilter();

    // 5. Configura filtros de data com os últimos 30 dias se vazios
    const hoje = today();
    if ($('fuelFilterDateEnd') && !$('fuelFilterDateEnd').value) $('fuelFilterDateEnd').value = hoje;
    if ($('fuelFilterDateStart') && !$('fuelFilterDateStart').value) {
      const dt30 = new Date();
      dt30.setDate(dt30.getDate() - 30);
      $('fuelFilterDateStart').value = dt30.toISOString().split('T')[0];
    }

    // 6. Atualiza KPIs e renderiza tabela
    renderFuelDashboard();
  } catch(err) {
    console.error('Erro ao carregar dados de abastecimento:', err);
  }
}

async function loadFuelAuxiliaryData() {
  fuelMachines = [];
  fuelDrivers = [];

  // Puxa condutores (funcionários da empresa)
  if (window.emps && Array.isArray(window.emps) && window.emps.length > 0) {
    fuelDrivers = window.emps.map(e => e.name);
  } else if (window.sb && window.tenantId) {
    try {
      const { data } = await window.sb.from('employees').select('name').eq('tenant_id', window.tenantId);
      if (data) fuelDrivers = data.map(d => d.name);
    } catch(e){}
  }

  // Se não houver condutores cadastrados ainda, provê nomes de referência
  if (fuelDrivers.length === 0) {
    fuelDrivers = ['FRANCISCO DE ASSIS DA SILVA', 'JOSE CARLOS PEREIRA', 'ANTONIO MARCOS LIMA', 'RAIMUNDO NONATO'];
  }

  // Puxa máquinas/tratores cadastrados no sistema
  fuelMachines = [
    'TRATOR VALTRA A950 (TR-01)',
    'TRATOR JOHN DEERE 5078E (TR-02)',
    'TRATOR MASSEY FERGUSON 4292 (TR-03)',
    'PULVERIZADOR TURBO JACTO (PV-01)',
    'CAMINHÃO MERCEDES ATEGO (CAM-01)',
    'CAMINHONETE HILUX CAMPO (CAR-01)'
  ];
}

function generateInitialFuelData() {
  const list = [];
  const hoje = new Date();

  const veiculosExemplo = [
    { prefixo: 'TRATOR VALTRA A950 (TR-01)', condutor: 'FRANCISCO DE ASSIS DA SILVA', litros: 120, horimetro: 3450.5, valorLitro: 5.89 },
    { prefixo: 'TRATOR JOHN DEERE 5078E (TR-02)', condutor: 'JOSE CARLOS PEREIRA', litros: 95, horimetro: 2810.0, valorLitro: 5.89 },
    { prefixo: 'CAMINHÃO MERCEDES ATEGO (CAM-01)', condutor: 'ANTONIO MARCOS LIMA', litros: 210, horimetro: 85200, valorLitro: 5.92 },
    { prefixo: 'TRATOR VALTRA A950 (TR-01)', condutor: 'FRANCISCO DE ASSIS DA SILVA', litros: 115, horimetro: 3485.2, valorLitro: 5.89 }
  ];

  veiculosExemplo.forEach((ex, idx) => {
    const dt = new Date(hoje.getTime() - idx * 3 * 86400000);
    const total = parseFloat((ex.litros * ex.valorLitro).toFixed(2));

    list.push({
      id: 'FUEL_' + (Date.now() - idx * 1000).toString(36).toUpperCase(),
      tenant_id: window.tenantId || 'demo',
      data_hora: dt.toISOString().replace('T', ' ').substring(0, 16),
      veiculo: ex.prefixo,
      condutor: ex.condutor,
      combustivel: 'DIESEL S10',
      litros: ex.litros,
      horimetro_km: ex.horimetro,
      valor_litro: ex.valorLitro,
      valor_total: total,
      local_tanque: 'TANQUE CENTRAL FAZENDA (5.000L)',
      observacoes: 'Abastecimento rotina de operação'
    });
  });

  return list;
}

function renderFuelDashboard() {
  const dtIni = $('fuelFilterDateStart') ? $('fuelFilterDateStart').value : '';
  const dtFim = $('fuelFilterDateEnd') ? $('fuelFilterDateEnd').value : '';
  const filterVeiculo = $('fuelFilterVeiculo') ? $('fuelFilterVeiculo').value : 'ALL';
  const filterTipo = $('fuelFilterTipo') ? $('fuelFilterTipo').value : 'ALL';

  let totalLitros = 0;
  let totalCusto = 0;
  let countAbastecimentos = 0;
  const veiculoConsumo = {};

  const filtered = fuelData.filter(item => {
    const dtStr = (item.data_hora || '').split(' ')[0];
    if (dtIni && dtStr < dtIni) return false;
    if (dtFim && dtStr > dtFim) return false;
    if (filterVeiculo !== 'ALL' && item.veiculo !== filterVeiculo) return false;
    if (filterTipo !== 'ALL' && item.combustivel !== filterTipo) return false;

    // Acumula métricas
    const l = parseFloat(item.litros || 0);
    const c = parseFloat(item.valor_total || (l * (item.valor_litro || 0)));
    totalLitros += l;
    totalCusto += c;
    countAbastecimentos++;

    const vNome = item.veiculo || 'Outros';
    veiculoConsumo[vNome] = (veiculoConsumo[vNome] || 0) + l;

    return true;
  });

  // Identifica maior consumidor
  let topVeiculo = '—';
  let topLitros = 0;
  for (const v in veiculoConsumo) {
    if (veiculoConsumo[v] > topLitros) {
      topLitros = veiculoConsumo[v];
      topVeiculo = v;
    }
  }

  // Atualiza KPIs
  if ($('kpiFuelLitros')) $('kpiFuelLitros').textContent = totalLitros.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1}) + ' L';
  if ($('kpiFuelCusto')) $('kpiFuelCusto').textContent = 'R$ ' + totalCusto.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  if ($('kpiFuelCount')) $('kpiFuelCount').textContent = countAbastecimentos;
  if ($('kpiFuelTopVeiculo')) $('kpiFuelTopVeiculo').textContent = topVeiculo;
  if ($('kpiFuelTopLitros')) $('kpiFuelTopLitros').textContent = topLitros > 0 ? `${topLitros.toLocaleString('pt-BR')} L consumidos` : '0 L no período';

  renderFuelRows(filtered);
}

function filterFuelTable() {
  renderFuelDashboard();
}

function resetFuelFilters() {
  if ($('fuelFilterVeiculo')) $('fuelFilterVeiculo').value = 'ALL';
  if ($('fuelFilterTipo')) $('fuelFilterTipo').value = 'ALL';
  if ($('fuelFilterDateEnd')) $('fuelFilterDateEnd').value = today();
  const dt30 = new Date();
  dt30.setDate(dt30.getDate() - 30);
  if ($('fuelFilterDateStart')) $('fuelFilterDateStart').value = dt30.toISOString().split('T')[0];
  renderFuelDashboard();
}

function populateFuelVeiculoFilter() {
  const sel = $('fuelFilterVeiculo');
  if (!sel) return;
  const veiculos = new Set();
  fuelData.forEach(f => { if (f.veiculo) veiculos.add(f.veiculo); });
  fuelMachines.forEach(m => veiculos.add(m));

  const current = sel.value;
  sel.innerHTML = '<option value="ALL">Todos os Veículos / Máquinas</option>' +
    Array.from(veiculos).sort().map(v => `<option value="${escapeHtml(v)}" ${v === current ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
}

function renderFuelRows(rows) {
  const tbody = $('fuelTableBody');
  if (!tbody) return;

  if ($('fuelTableCount')) {
    $('fuelTableCount').textContent = `${rows.length} abastecimento(s)`;
  }

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:32px; color:var(--muted)">Nenhum abastecimento encontrado no período selecionado.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const dtFmt = r.data_hora ? r.data_hora.replace('T', ' ') : '—';
    const litrosFmt = parseFloat(r.litros || 0).toLocaleString('pt-BR', {minimumFractionDigits: 1});
    const precoFmt = parseFloat(r.valor_litro || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2});
    const totalFmt = parseFloat(r.valor_total || (r.litros * r.valor_litro)).toLocaleString('pt-BR', {minimumFractionDigits: 2});

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
        <td style="font-size:12px; white-space:nowrap; color:var(--muted)">${dtFmt}</td>
        <td style="font-weight:700; color:var(--text)">${escapeHtml(r.veiculo || '—')}</td>
        <td style="font-size:12px">${escapeHtml(r.condutor || '—')}</td>
        <td><span class="badge" style="background:rgba(245,158,11,0.12); color:var(--amber); font-size:11px; padding:3px 8px; border-radius:6px; font-weight:700">${escapeHtml(r.combustivel || 'DIESEL S10')}</span></td>
        <td style="text-align:right; font-weight:700; color:var(--green)">${litrosFmt} L</td>
        <td style="text-align:right; font-size:12px">${r.horimetro_km || '—'}</td>
        <td style="text-align:right; font-size:12px">R$ ${precoFmt}</td>
        <td style="text-align:right; font-weight:800; color:var(--text)">R$ ${totalFmt}</td>
        <td style="font-size:11px; color:var(--muted)">${escapeHtml(r.local_tanque || 'Central')}</td>
        <td style="text-align:center; white-space:nowrap">
          <button onclick="openModalEditFuel('${r.id}')" style="background:none; border:none; color:var(--blue); cursor:pointer; padding:4px 6px" title="Editar"><i data-lucide="edit-2" style="width:14px;height:14px"></i></button>
          <button onclick="deleteFuelRecord('${r.id}')" style="background:none; border:none; color:var(--red); cursor:pointer; padding:4px 6px" title="Excluir"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function openModalNovoAbastecimento() {
  populateModalFuelSelects();
  if ($('modalFuelTitle')) $('modalFuelTitle').textContent = 'Novo Registro de Abastecimento';
  if ($('fuelEditId')) $('fuelEditId').value = '';
  
  const agora = new Date();
  const agoraStr = agora.toISOString().substring(0, 16);
  if ($('modalFuelDataHora')) $('modalFuelDataHora').value = agoraStr;
  
  if ($('modalFuelLitros')) $('modalFuelLitros').value = '';
  if ($('modalFuelHorimetro')) $('modalFuelHorimetro').value = '';
  if ($('modalFuelPrecoLitro')) $('modalFuelPrecoLitro').value = '5.89';
  if ($('modalFuelTotal')) $('modalFuelTotal').value = '0.00';
  if ($('modalFuelTanque')) $('modalFuelTanque').value = 'TANQUE CENTRAL FAZENDA (5.000L)';
  if ($('modalFuelObs')) $('modalFuelObs').value = '';

  if ($('modalFuelOverlay')) $('modalFuelOverlay').style.display = 'flex';
}

function openModalEditFuel(id) {
  const item = fuelData.find(f => f.id === id);
  if (!item) return;

  populateModalFuelSelects();
  if ($('modalFuelTitle')) $('modalFuelTitle').textContent = 'Editar Registro de Abastecimento';
  if ($('fuelEditId')) $('fuelEditId').value = item.id;
  if ($('modalFuelDataHora')) $('modalFuelDataHora').value = (item.data_hora || '').replace(' ', 'T').substring(0, 16);
  if ($('modalFuelVeiculo')) $('modalFuelVeiculo').value = item.veiculo || '';
  if ($('modalFuelCondutor')) $('modalFuelCondutor').value = item.condutor || '';
  if ($('modalFuelTipo')) $('modalFuelTipo').value = item.combustivel || 'DIESEL S10';
  if ($('modalFuelLitros')) $('modalFuelLitros').value = item.litros || '';
  if ($('modalFuelHorimetro')) $('modalFuelHorimetro').value = item.horimetro_km || '';
  if ($('modalFuelPrecoLitro')) $('modalFuelPrecoLitro').value = item.valor_litro || '';
  if ($('modalFuelTotal')) $('modalFuelTotal').value = item.valor_total || '';
  if ($('modalFuelTanque')) $('modalFuelTanque').value = item.local_tanque || '';
  if ($('modalFuelObs')) $('modalFuelObs').value = item.observacoes || '';

  if ($('modalFuelOverlay')) $('modalFuelOverlay').style.display = 'flex';
}

function closeModalFuel() {
  if ($('modalFuelOverlay')) $('modalFuelOverlay').style.display = 'none';
}

function populateModalFuelSelects() {
  const selV = $('modalFuelVeiculo');
  if (selV) {
    const todosVeiculos = Array.from(new Set([...fuelMachines, ...fuelData.map(d => d.veiculo)])).filter(Boolean);
    selV.innerHTML = '<option value="">— Selecione a máquina ou veículo —</option>' +
      todosVeiculos.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
  }

  const selC = $('modalFuelCondutor');
  if (selC) {
    const todosCondutores = Array.from(new Set([...fuelDrivers, ...fuelData.map(d => d.condutor)])).filter(Boolean);
    selC.innerHTML = '<option value="">— Selecione o condutor / tratorista —</option>' +
      todosCondutores.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  }
}

function calcModalFuelTotal() {
  const l = parseFloat($('modalFuelLitros') ? $('modalFuelLitros').value : 0) || 0;
  const p = parseFloat($('modalFuelPrecoLitro') ? $('modalFuelPrecoLitro').value : 0) || 0;
  const total = (l * p).toFixed(2);
  if ($('modalFuelTotal')) $('modalFuelTotal').value = total;
}

async function saveFuelRecord() {
  const editId = $('fuelEditId') ? $('fuelEditId').value : '';
  const dtHora = $('modalFuelDataHora') ? $('modalFuelDataHora').value.replace('T', ' ') : '';
  const veiculo = $('modalFuelVeiculo') ? $('modalFuelVeiculo').value.trim() : '';
  const condutor = $('modalFuelCondutor') ? $('modalFuelCondutor').value.trim() : '';
  const litros = parseFloat($('modalFuelLitros') ? $('modalFuelLitros').value : 0);

  if (!veiculo) {
    alert('Por favor selecione ou informe o veículo/máquina.');
    return;
  }
  if (!litros || litros <= 0) {
    alert('Informe uma quantidade válida de litros abastecidos.');
    return;
  }

  const precoLitro = parseFloat($('modalFuelPrecoLitro') ? $('modalFuelPrecoLitro').value : 0) || 0;
  const valorTotal = parseFloat($('modalFuelTotal') ? $('modalFuelTotal').value : (litros * precoLitro)) || 0;

  const record = {
    id: editId || ('FUEL_' + Date.now().toString(36).toUpperCase()),
    tenant_id: window.tenantId || 'demo',
    data_hora: dtHora || (today() + ' 08:00'),
    veiculo: veiculo,
    condutor: condutor || '—',
    combustivel: $('modalFuelTipo') ? $('modalFuelTipo').value : 'DIESEL S10',
    litros: litros,
    horimetro_km: $('modalFuelHorimetro') ? $('modalFuelHorimetro').value.trim() : '',
    valor_litro: precoLitro,
    valor_total: valorTotal,
    local_tanque: $('modalFuelTanque') ? $('modalFuelTanque').value.trim() : 'Central',
    observacoes: $('modalFuelObs') ? $('modalFuelObs').value.trim() : '',
    updated_at: new Date().toISOString()
  };

  if (editId) {
    const idx = fuelData.findIndex(f => f.id === editId);
    if (idx !== -1) fuelData[idx] = record;
  } else {
    fuelData.unshift(record);
  }

  // Tenta salvar no Supabase
  if (window.sb && window.tenantId) {
    try {
      await window.sb.from('frota_abastecimentos').upsert(record);
    } catch(e) {
      console.warn('Erro ao salvar no Supabase (salvando localmente):', e);
    }
  }

  // Salva no LocalStorage
  try {
    localStorage.setItem('prodtech_fuel_' + (window.tenantId || 'default'), JSON.stringify(fuelData));
  } catch(e){}

  closeModalFuel();
  populateFuelVeiculoFilter();
  renderFuelDashboard();
}

async function deleteFuelRecord(id) {
  if (!confirm('Deseja realmente remover este registro de abastecimento?')) return;

  fuelData = fuelData.filter(f => f.id !== id);

  if (window.sb && window.tenantId) {
    try {
      await window.sb.from('frota_abastecimentos').delete().eq('id', id).eq('tenant_id', window.tenantId);
    } catch(e){}
  }

  try {
    localStorage.setItem('prodtech_fuel_' + (window.tenantId || 'default'), JSON.stringify(fuelData));
  } catch(e){}

  renderFuelDashboard();
}

function printAbastecimentosRelatorio() {
  const win = window.open('', '_blank');
  const agora = new Date().toLocaleString('pt-BR');
  const tName = (window.tenantConfig && window.tenantConfig.name) ? window.tenantConfig.name : 'PRODTEC AGRO';

  let totalL = 0;
  let totalR = 0;

  let rowsHtml = fuelData.map((r, i) => {
    const l = parseFloat(r.litros || 0);
    const c = parseFloat(r.valor_total || 0);
    totalL += l;
    totalR += c;

    return `
      <tr style="border-bottom:1px solid #ddd; ${i%2===0?'background:#f9fafb':''}">
        <td style="padding:6px 8px">${escapeHtml(r.data_hora || '—')}</td>
        <td style="padding:6px 8px; font-weight:bold">${escapeHtml(r.veiculo || '—')}</td>
        <td style="padding:6px 8px">${escapeHtml(r.condutor || '—')}</td>
        <td style="padding:6px 8px">${escapeHtml(r.combustivel || '—')}</td>
        <td style="padding:6px 8px; text-align:right; font-weight:bold">${l.toLocaleString('pt-BR', {minimumFractionDigits:1})} L</td>
        <td style="padding:6px 8px; text-align:right">${escapeHtml(r.horimetro_km || '—')}</td>
        <td style="padding:6px 8px; text-align:right">R$ ${parseFloat(r.valor_litro||0).toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
        <td style="padding:6px 8px; text-align:right; font-weight:bold">R$ ${c.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
      </tr>
    `;
  }).join('');

  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8"/>
      <title>Relatório de Abastecimentos - ${tName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; margin: 20px; color: #111; }
        .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #14a832; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 18px; font-weight: bold; margin: 0; color: #166534; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #f3f4f6; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; }
        .totais { margin-top: 16px; display: flex; gap: 24px; font-size: 13px; font-weight: bold; }
        @media print {
          body { margin: 10mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="hdr">
        <div>
          <div class="title">RELATÓRIO DE CONSUMO DE COMBUSTÍVEL & FROTAS</div>
          <div style="font-size:12px; color:#555; margin-top:4px"><b>Empresa:</b> ${escapeHtml(tName)} | <b>Gerado em:</b> ${agora}</div>
        </div>
        <button class="no-print" onclick="window.print()" style="padding:8px 16px; font-size:12px; font-weight:bold; background:#14a832; color:#fff; border:none; border-radius:6px; cursor:pointer">Imprimir / Salvar PDF</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Data / Hora</th>
            <th>Máquina / Veículo</th>
            <th>Condutor</th>
            <th>Combustível</th>
            <th style="text-align:right">Litros</th>
            <th style="text-align:right">Horímetro / Km</th>
            <th style="text-align:right">R$ / L</th>
            <th style="text-align:right">Total (R$)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="totais">
        <div>Total de Abastecimentos: ${fuelData.length}</div>
        <div>Volume Total: ${totalL.toLocaleString('pt-BR', {minimumFractionDigits:1})} L</div>
        <div>Custo Total: R$ ${totalR.toLocaleString('pt-BR', {minimumFractionDigits:2})}</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
}
