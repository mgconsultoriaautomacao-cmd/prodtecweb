/**
 * PRODTEC - Módulo de Recursos Humanos & ASO (Saúde Ocupacional)
 * Integração Supabase + Offline-First com Cache Local
 */

let rhAsoData = [];
let rhEmployees = [];

async function loadRhAso() {
  try {
    // 1. Carrega lista de funcionários para cruzar com dados de ASO
    await loadRhEmployeeList();

    // 2. Tenta carregar registros de ASO do Supabase
    let loadedFromRemote = false;
    if (window.sb && window.tenantId) {
      try {
        const { data, error } = await window.sb
          .from('rh_asos')
          .select('*')
          .eq('tenant_id', window.tenantId)
          .order('data_vencimento', { ascending: true });

        if (!error && Array.isArray(data)) {
          rhAsoData = data;
          loadedFromRemote = true;
          try {
            localStorage.setItem('prodtech_rh_asos_' + window.tenantId, JSON.stringify(rhAsoData));
          } catch(e){}
        }
      } catch(e) {
        console.warn('Supabase rh_asos não disponível, utilizando fallback local:', e);
      }
    }

    // 3. Fallback para LocalStorage se offline ou se a tabela remota ainda não foi criada
    if (!loadedFromRemote) {
      const cached = localStorage.getItem('prodtech_rh_asos_' + (window.tenantId || 'default'));
      if (cached) {
        try { rhAsoData = JSON.parse(cached); } catch(e){ rhAsoData = []; }
      } else {
        // Se ainda não existirem dados, gera exemplos práticos vinculados aos funcionários da empresa
        rhAsoData = generateInitialAsoData();
        try {
          localStorage.setItem('prodtech_rh_asos_' + (window.tenantId || 'default'), JSON.stringify(rhAsoData));
        } catch(e){}
      }
    }

    // 4. Popula selects de filtros
    populateAsoSetorFilter();

    // 5. Atualiza KPIs e renderiza a tabela
    renderAsoDashboard();
  } catch(err) {
    console.error('Erro ao carregar dados de RH/ASO:', err);
  }
}

async function loadRhEmployeeList() {
  rhEmployees = [];
  // Tenta puxar do array emps global se já estiver carregado
  if (window.emps && Array.isArray(window.emps) && window.emps.length > 0) {
    rhEmployees = window.emps;
    return;
  }
  // Tenta carregar do Supabase
  if (window.sb && window.tenantId) {
    try {
      const { data } = await window.sb
        .from('employees')
        .select('*')
        .eq('tenant_id', window.tenantId)
        .order('name');
      if (data && data.length > 0) {
        rhEmployees = data;
        return;
      }
    } catch(e){}
  }
}

function generateInitialAsoData() {
  const list = [];
  const hoje = new Date();

  // Se houver funcionários cadastrados no sistema, vincula a eles
  const baseEmps = (rhEmployees && rhEmployees.length > 0) ? rhEmployees : [
    { name: 'FRANCISCO DE ASSIS DA SILVA', cpf: '054.821.934-22', role: 'TRATORISTA', sector: 'MANUTENCAO' },
    { name: 'MARIA APARECIDA SANTOS', cpf: '342.119.884-15', role: 'EMBALADOR', sector: 'PACKING' },
    { name: 'JOSE CARLOS PEREIRA', cpf: '871.203.494-09', role: 'COLHEDOR', sector: 'COLHEITA' },
    { name: 'ANTONIO MARCOS LIMA', cpf: '129.405.674-88', role: 'EMPILHADOR', sector: 'PACKING' }
  ];

  baseEmps.slice(0, 8).forEach((emp, idx) => {
    // Variações de vencimento: em dia, a vencer e vencido para demonstração
    let vencOffset = 180; // em dia (+6 meses)
    if (idx === 1) vencOffset = 15; // a vencer em 15 dias
    if (idx === 2) vencOffset = -25; // vencido há 25 dias

    const dtExame = new Date(hoje.getTime() - (365 - vencOffset) * 86400000);
    const dtVenc = new Date(hoje.getTime() + vencOffset * 86400000);

    list.push({
      id: 'ASO_' + (Date.now() - idx * 1000).toString(36).toUpperCase(),
      tenant_id: window.tenantId || 'demo',
      employee_name: emp.name || 'COLABORADOR ' + (idx + 1),
      cpf: emp.cpf || '—',
      role: emp.role || 'OPERADOR',
      sector: emp.sector || 'GERAL',
      tipo_exame: idx === 0 ? 'ADMISSIONAL' : 'PERIODICO',
      data_exame: dtExame.toISOString().split('T')[0],
      data_vencimento: dtVenc.toISOString().split('T')[0],
      clinica: 'CLÍNICA SAÚDE OCUPACIONAL RIO GRANDE',
      medico: 'DR. MARCELO VARELA (CRM 4589/RN)',
      apto: true,
      observacoes: 'Apto para atividades com esforço físico moderado'
    });
  });

  return list;
}

function calculateAsoStatus(vencimentoStr) {
  if (!vencimentoStr) return { status: 'SEM_ASO', label: 'SEM REGISTRO', color: 'var(--muted)', bg: 'rgba(255,255,255,0.06)' };
  
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const dtVenc = new Date(vencimentoStr + 'T00:00:00');
  const diffDias = Math.round((dtVenc - hoje) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return { status: 'VENCIDO', label: `VENCIDO (${Math.abs(diffDias)}d)`, color: '#ef4444', bg: 'rgba(239,68,68,0.15)' };
  } else if (diffDias <= 30) {
    return { status: 'A_VENCER', label: `VENCE EM ${diffDias}d`, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' };
  } else {
    return { status: 'EM_DIA', label: 'EM DIA', color: '#10b981', bg: 'rgba(16,185,129,0.15)' };
  }
}

function renderAsoDashboard() {
  let countTotal = rhAsoData.length;
  let countEmDia = 0;
  let countAVencer = 0;
  let countVencidos = 0;

  rhAsoData.forEach(item => {
    const st = calculateAsoStatus(item.data_vencimento);
    if (st.status === 'EM_DIA') countEmDia++;
    else if (st.status === 'A_VENCER') countAVencer++;
    else if (st.status === 'VENCIDO') countVencidos++;
  });

  // Atualiza KPIs
  if ($('kpiAsoTotal')) $('kpiAsoTotal').textContent = countTotal;
  if ($('kpiAsoEmDia')) $('kpiAsoEmDia').textContent = countEmDia;
  if ($('kpiAsoAVencer')) $('kpiAsoAVencer').textContent = countAVencer;
  if ($('kpiAsoVencidos')) $('kpiAsoVencidos').textContent = countVencidos;

  filterAsoTable();
}

function populateAsoSetorFilter() {
  const sel = $('asoFilterSetor');
  if (!sel) return;
  const setores = new Set();
  rhAsoData.forEach(a => { if (a.sector) setores.add(a.sector); });
  (rhEmployees || []).forEach(e => { if (e.sector) setores.add(e.sector); });

  const current = sel.value;
  sel.innerHTML = '<option value="ALL">Todos os Setores</option>' +
    Array.from(setores).sort().map(s => `<option value="${s}" ${s === current ? 'selected' : ''}>${s}</option>`).join('');
}

function filterAsoTable() {
  const query = ($('asoSearch') ? $('asoSearch').value.toLowerCase().trim() : '');
  const filterStatus = ($('asoFilterStatus') ? $('asoFilterStatus').value : 'ALL');
  const filterSetor = ($('asoFilterSetor') ? $('asoFilterSetor').value : 'ALL');
  const filterTipo = ($('asoFilterTipo') ? $('asoFilterTipo').value : 'ALL');

  const filtered = rhAsoData.filter(item => {
    // Busca textual
    if (query) {
      const matchName = (item.employee_name || '').toLowerCase().includes(query);
      const matchCpf = (item.cpf || '').toLowerCase().includes(query);
      const matchRole = (item.role || '').toLowerCase().includes(query);
      if (!matchName && !matchCpf && !matchRole) return false;
    }

    // Status
    const st = calculateAsoStatus(item.data_vencimento);
    if (filterStatus !== 'ALL' && st.status !== filterStatus) return false;

    // Setor
    if (filterSetor !== 'ALL' && item.sector !== filterSetor) return false;

    // Tipo
    if (filterTipo !== 'ALL' && item.tipo_exame !== filterTipo) return false;

    return true;
  });

  renderAsoRows(filtered);
}

function resetAsoFilters() {
  if ($('asoSearch')) $('asoSearch').value = '';
  if ($('asoFilterStatus')) $('asoFilterStatus').value = 'ALL';
  if ($('asoFilterSetor')) $('asoFilterSetor').value = 'ALL';
  if ($('asoFilterTipo')) $('asoFilterTipo').value = 'ALL';
  filterAsoTable();
}

function renderAsoRows(rows) {
  const tbody = $('asoTableBody');
  if (!tbody) return;

  if ($('asoTableCount')) {
    $('asoTableCount').textContent = `${rows.length} de ${rhAsoData.length} colaborador(es)`;
  }

  if (rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:32px; color:var(--muted)">Nenhum registro de ASO encontrado com os filtros selecionados.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const st = calculateAsoStatus(r.data_vencimento);
    const dtExameFmt = r.data_exame ? r.data_exame.split('-').reverse().join('/') : '—';
    const dtVencFmt = r.data_vencimento ? r.data_vencimento.split('-').reverse().join('/') : '—';

    return `
      <tr style="border-bottom:1px solid rgba(255,255,255,0.04)">
        <td style="font-weight:700; color:var(--text); white-space:nowrap">
          <div style="display:flex; align-items:center; gap:8px">
            <span style="width:28px; height:28px; border-radius:50%; background:rgba(46,204,113,0.12); color:var(--green); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800">
              ${(r.employee_name || 'F').charAt(0).toUpperCase()}
            </span>
            ${escapeHtml(r.employee_name || '—')}
          </div>
        </td>
        <td style="color:var(--muted); font-size:12px">${escapeHtml(r.cpf || '—')}</td>
        <td style="font-weight:600; font-size:12px">${escapeHtml(r.role || '—')}</td>
        <td><span class="badge" style="background:rgba(255,255,255,0.06); color:var(--muted); font-size:11px; padding:3px 8px; border-radius:6px">${escapeHtml(r.sector || 'GERAL')}</span></td>
        <td style="font-size:12px; font-weight:600">${escapeHtml(r.tipo_exame || 'PERIODICO')}</td>
        <td style="font-size:12px">${dtExameFmt}</td>
        <td style="font-weight:700; font-size:12px">${dtVencFmt}</td>
        <td>
          <span style="display:inline-block; padding:4px 8px; border-radius:6px; font-size:10px; font-weight:800; background:${st.bg}; color:${st.color}; border:1px solid ${st.color}40">
            ${st.label}
          </span>
        </td>
        <td style="font-size:11px; color:var(--muted); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap" title="${escapeHtml(r.clinica || '')}">
          ${escapeHtml(r.clinica || '—')}
        </td>
        <td style="text-align:center; white-space:nowrap">
          <button onclick="openModalEditAso('${r.id}')" style="background:none; border:none; color:var(--blue); cursor:pointer; padding:4px 6px" title="Editar"><i data-lucide="edit-2" style="width:14px;height:14px"></i></button>
          <button onclick="deleteAsoRecord('${r.id}')" style="background:none; border:none; color:var(--red); cursor:pointer; padding:4px 6px" title="Excluir"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
        </td>
      </tr>
    `;
  }).join('');

  if (window.lucide) lucide.createIcons();
}

function openModalNovoAso() {
  populateModalAsoSelects();
  if ($('modalAsoTitle')) $('modalAsoTitle').textContent = 'Novo Registro de ASO';
  if ($('asoEditId')) $('asoEditId').value = '';
  if ($('modalAsoDataExame')) $('modalAsoDataExame').value = today();
  
  // Define vencimento padrão para 1 ano depois
  const dt1Ano = new Date();
  dt1Ano.setFullYear(dt1Ano.getFullYear() + 1);
  if ($('modalAsoDataVenc')) $('modalAsoDataVenc').value = dt1Ano.toISOString().split('T')[0];
  
  if ($('modalAsoClinica')) $('modalAsoClinica').value = 'CLÍNICA DE MEDICINA DO TRABALHO';
  if ($('modalAsoMedico')) $('modalAsoMedico').value = '';
  if ($('modalAsoObs')) $('modalAsoObs').value = 'Colaborador considerado APTO para as funções especificadas.';
  
  if ($('modalAsoOverlay')) $('modalAsoOverlay').style.display = 'flex';
}

function openModalEditAso(id) {
  const item = rhAsoData.find(a => a.id === id);
  if (!item) return;

  populateModalAsoSelects();
  if ($('modalAsoTitle')) $('modalAsoTitle').textContent = 'Editar Registro de ASO';
  if ($('asoEditId')) $('asoEditId').value = item.id;
  if ($('modalAsoFuncionario')) $('modalAsoFuncionario').value = item.employee_name;
  if ($('modalAsoCpf')) $('modalAsoCpf').value = item.cpf || '';
  if ($('modalAsoCargo')) $('modalAsoCargo').value = item.role || '';
  if ($('modalAsoSetor')) $('modalAsoSetor').value = item.sector || '';
  if ($('modalAsoTipo')) $('modalAsoTipo').value = item.tipo_exame || 'PERIODICO';
  if ($('modalAsoDataExame')) $('modalAsoDataExame').value = item.data_exame || today();
  if ($('modalAsoDataVenc')) $('modalAsoDataVenc').value = item.data_vencimento || '';
  if ($('modalAsoClinica')) $('modalAsoClinica').value = item.clinica || '';
  if ($('modalAsoMedico')) $('modalAsoMedico').value = item.medico || '';
  if ($('modalAsoObs')) $('modalAsoObs').value = item.observacoes || '';

  if ($('modalAsoOverlay')) $('modalAsoOverlay').style.display = 'flex';
}

function closeModalAso() {
  if ($('modalAsoOverlay')) $('modalAsoOverlay').style.display = 'none';
}

function populateModalAsoSelects() {
  const sel = $('modalAsoFuncionario');
  if (!sel) return;

  let options = '<option value="">— Selecione um colaborador —</option>';
  (rhEmployees || []).forEach(e => {
    options += `<option value="${escapeHtml(e.name)}" data-cpf="${e.cpf||''}" data-role="${e.role||''}" data-sector="${e.sector||''}">${escapeHtml(e.name)} (${e.role || '—'})</option>`;
  });
  sel.innerHTML = options;
}

function onModalAsoFuncSelect(el) {
  const opt = el.options[el.selectedIndex];
  if (!opt) return;
  if ($('modalAsoCpf') && opt.dataset.cpf) $('modalAsoCpf').value = opt.dataset.cpf;
  if ($('modalAsoCargo') && opt.dataset.role) $('modalAsoCargo').value = opt.dataset.role;
  if ($('modalAsoSetor') && opt.dataset.sector) $('modalAsoSetor').value = opt.dataset.sector;
}

async function saveAsoRecord() {
  const editId = $('asoEditId') ? $('asoEditId').value : '';
  const funcName = $('modalAsoFuncionario') ? $('modalAsoFuncionario').value.trim() : '';
  const dataExame = $('modalAsoDataExame') ? $('modalAsoDataExame').value : '';
  const dataVenc = $('modalAsoDataVenc') ? $('modalAsoDataVenc').value : '';

  if (!funcName) {
    alert('Por favor selecione ou informe o nome do colaborador.');
    return;
  }
  if (!dataExame || !dataVenc) {
    alert('Por favor preencha a data do exame e a data de vencimento.');
    return;
  }

  const record = {
    id: editId || ('ASO_' + Date.now().toString(36).toUpperCase()),
    tenant_id: window.tenantId || 'demo',
    employee_name: funcName,
    cpf: $('modalAsoCpf') ? $('modalAsoCpf').value.trim() : '',
    role: $('modalAsoCargo') ? $('modalAsoCargo').value.trim() : '',
    sector: $('modalAsoSetor') ? $('modalAsoSetor').value.trim() : '',
    tipo_exame: $('modalAsoTipo') ? $('modalAsoTipo').value : 'PERIODICO',
    data_exame: dataExame,
    data_vencimento: dataVenc,
    clinica: $('modalAsoClinica') ? $('modalAsoClinica').value.trim() : '',
    medico: $('modalAsoMedico') ? $('modalAsoMedico').value.trim() : '',
    observacoes: $('modalAsoObs') ? $('modalAsoObs').value.trim() : '',
    updated_at: new Date().toISOString()
  };

  // Se estiver editando
  if (editId) {
    const idx = rhAsoData.findIndex(a => a.id === editId);
    if (idx !== -1) rhAsoData[idx] = record;
  } else {
    rhAsoData.unshift(record);
  }

  // Tenta salvar no Supabase
  if (window.sb && window.tenantId) {
    try {
      await window.sb.from('rh_asos').upsert(record);
    } catch(e) {
      console.warn('Erro ao salvar no Supabase (salvando localmente):', e);
    }
  }

  // Salva no LocalStorage
  try {
    localStorage.setItem('prodtech_rh_asos_' + (window.tenantId || 'default'), JSON.stringify(rhAsoData));
  } catch(e){}

  closeModalAso();
  renderAsoDashboard();
}

async function deleteAsoRecord(id) {
  if (!confirm('Deseja realmente remover este registro de ASO?')) return;

  rhAsoData = rhAsoData.filter(a => a.id !== id);

  if (window.sb && window.tenantId) {
    try {
      await window.sb.from('rh_asos').delete().eq('id', id).eq('tenant_id', window.tenantId);
    } catch(e){}
  }

  try {
    localStorage.setItem('prodtech_rh_asos_' + (window.tenantId || 'default'), JSON.stringify(rhAsoData));
  } catch(e){}

  renderAsoDashboard();
}

function printAsoRelatorio() {
  const win = window.open('', '_blank');
  const agora = new Date().toLocaleString('pt-BR');
  const tName = (window.tenantConfig && window.tenantConfig.name) ? window.tenantConfig.name : 'PRODTEC AGRO';

  let rowsHtml = rhAsoData.map((r, i) => {
    const st = calculateAsoStatus(r.data_vencimento);
    const dtEx = r.data_exame ? r.data_exame.split('-').reverse().join('/') : '—';
    const dtVc = r.data_vencimento ? r.data_vencimento.split('-').reverse().join('/') : '—';
    const corBadge = st.status === 'EM_DIA' ? '#166534' : (st.status === 'A_VENCER' ? '#854d0e' : '#991b1b');

    return `
      <tr style="border-bottom:1px solid #ddd; ${i%2===0?'background:#f9fafb':''}">
        <td style="padding:6px 8px; font-weight:bold">${escapeHtml(r.employee_name)}</td>
        <td style="padding:6px 8px">${escapeHtml(r.cpf || '—')}</td>
        <td style="padding:6px 8px">${escapeHtml(r.role || '—')}</td>
        <td style="padding:6px 8px">${escapeHtml(r.sector || '—')}</td>
        <td style="padding:6px 8px">${escapeHtml(r.tipo_exame || '—')}</td>
        <td style="padding:6px 8px">${dtEx}</td>
        <td style="padding:6px 8px; font-weight:bold">${dtVc}</td>
        <td style="padding:6px 8px; font-weight:bold; color:${corBadge}">${st.label}</td>
        <td style="padding:6px 8px; font-size:10px">${escapeHtml(r.clinica || '—')}</td>
      </tr>
    `;
  }).join('');

  win.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8"/>
      <title>Relatório de Conformidade ASO - ${tName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11px; margin: 20px; color: #111; }
        .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #22c55e; padding-bottom: 12px; margin-bottom: 16px; }
        .title { font-size: 18px; font-weight: bold; margin: 0; color: #166534; }
        table { width: 100%; border-collapse: collapse; font-size: 10px; }
        th { background: #f3f4f6; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ccc; }
        @media print {
          body { margin: 10mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="hdr">
        <div>
          <div class="title">RELATÓRIO DE CONFORMIDADE DE SAÚDE OCUPACIONAL & ASO</div>
          <div style="font-size:12px; color:#555; margin-top:4px"><b>Empresa:</b> ${escapeHtml(tName)} | <b>Gerado em:</b> ${agora}</div>
        </div>
        <button class="no-print" onclick="window.print()" style="padding:8px 16px; font-size:12px; font-weight:bold; background:#16a34a; color:#fff; border:none; border-radius:6px; cursor:pointer">Imprimir / Salvar PDF</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Colaborador</th>
            <th>CPF</th>
            <th>Função</th>
            <th>Setor</th>
            <th>Tipo Exame</th>
            <th>Data Exame</th>
            <th>Vencimento</th>
            <th>Status</th>
            <th>Clínica / Médico</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </body>
    </html>
  `);
  win.document.close();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[m];
  });
}
