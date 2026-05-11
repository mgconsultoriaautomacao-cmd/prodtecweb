// ═══════════════════════════════════════════
// APONTAMENTO DE CAMPO (FIELD OP)
// ═══════════════════════════════════════════
const fState = { workers: new Map() };
const fOperations = {
  ESTUFA: ['Cobrir Bandejas', 'Corrigir Bandejas', 'Semear', 'Encher Bandejas', 'Lavar Bandejas'],
  CAPINA: ['Capina de Enxada', 'Capina Manual', 'Remover Arcos', 'Soltar Manta'],
  PLANTIO: ['Distribuição de Mudas', 'Transplante', 'Irrigação Inicial'],
  SERVICOS_GERAIS: ['Limpeza da Área', 'Remoção de Mulching', 'Recolher Mangueiras'],
  LIMPEZA: ['Limpeza de Carreador', 'Recolher Lixo'],
  MANUTENCAO: ['Revisão de Gotejo', 'Conserto de Bomba', 'Manutenção de Trator']
};

function showFTab(tab) {
  $('fTabNew').className    = 'tab-pane' + (tab==='new' ?' on':'');
  $('fTabHist').className   = 'tab-pane' + (tab==='hist'?' on':'');
  $('fTabNewBtn').className = 'tab-btn'  + (tab==='new' ?' on':'');
  $('fTabHistBtn').className= 'tab-btn'  + (tab==='hist'?' on':'');
  if (tab === 'hist') loadFieldOpHistory();
}

function fUpdateOperations() {
  const sector = $('fSector').value;
  const opSelect = $('fOperation');
  opSelect.innerHTML = '<option value="">— Selecionar Operação —</option>';
  if (sector && fOperations[sector]) {
    fOperations[sector].forEach(op => {
      opSelect.insertAdjacentHTML('beforeend', `<option value="${op}">${op}</option>`);
    });
  } else if (sector) {
    opSelect.insertAdjacentHTML('beforeend', `<option value="Outros">Outros</option>`);
  }
}

function loadFieldOpSelects() {
  $('fDate').value = today();
  
  const pSel = $('fParcela');
  const vSel = $('fVariety');
  if(pSel && pSel.options.length <= 1) {
    pSel.innerHTML = '<option value="">(Opcional) Parcela</option>';
    parcelas.forEach(p => pSel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.code}</option>`));
  }
  if(vSel && vSel.options.length <= 1) {
    vSel.innerHTML = '<option value="">(Opcional) Variedade</option>';
    varieties.forEach(v => vSel.insertAdjacentHTML('beforeend', `<option value="${v.id}">${v.name}</option>`));
  }
  
  if (fState.workers.size === 0) {
    renderFEmpList(employees);
  }
}

function filterFEmp() {
  const q = $('fEmpSearch').value.toLowerCase();
  renderFEmpList(employees.filter(e => e.name.toLowerCase().includes(q) || (e.role && e.role.toLowerCase().includes(q))));
}

function renderFEmpList(list) {
  const ctn = $('fEmpList');
  if(!list.length) return ctn.innerHTML = '<div class="empty">Nenhum funcionário encontrado</div>';
  
  let html = '';
  list.forEach(e => {
    const isSel = fState.workers.has(e.id);
    html += `
      <div class="emp-item ${isSel ? 'on' : ''}" onclick="toggleFEmp(${e.id}, '${e.name}')" data-id="${e.id}">
        <div class="emp-avatar">${e.name.substring(0,2).toUpperCase()}</div>
        <div class="emp-name">${e.name} <div style="font-size:10px;color:var(--muted)">${e.role || 'Geral'}</div></div>
        <div class="emp-check">${isSel ? '✓' : ''}</div>
      </div>
    `;
  });
  ctn.innerHTML = html;
}

function toggleFEmp(id, name) {
  if (fState.workers.has(id)) fState.workers.delete(id);
  else fState.workers.set(id, name);
  filterFEmp();
  fUpdateCalc();
}

function toggleAllFEmp() {
  const items = Array.from(document.querySelectorAll('#fEmpList .emp-item'));
  const allSelected = items.every(el => fState.workers.has(parseInt(el.getAttribute('data-id'))));
  
  items.forEach(el => {
    const id = parseInt(el.getAttribute('data-id'));
    const name = el.querySelector('.emp-name').childNodes[0].nodeValue.trim();
    if (allSelected) fState.workers.delete(id);
    else fState.workers.set(id, name);
  });
  
  filterFEmp();
  fUpdateCalc();
}

function fUpdateCalc() {
  const empCount = fState.workers.size;
  $('fEmpCount').textContent = `${empCount} selecionados`;
  $('fCalcEmpCount').textContent = empCount > 0 ? `${empCount} funcionário(s)` : '0 selecionados';

  const tStart = $('fTimeStart').value;
  const tEnd = $('fTimeEnd').value;
  let hours = 0;
  let timeStr = '00:00 h';

  if (tStart && tEnd) {
    const [h1, m1] = tStart.split(':').map(Number);
    const [h2, m2] = tEnd.split(':').map(Number);
    let diffMins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diffMins < 0) diffMins += 24 * 60; // crossed midnight
    hours = diffMins / 60;
    timeStr = `${Math.floor(hours)}h ${diffMins % 60}m`;
  }
  $('fCalcTime').textContent = timeStr;

  const calcType = $('fCalcType').value;
  const baseVal = parseFloat($('fBaseValue').value) || 0;
  const qty = parseFloat($('fQty').value) || 0;

  let totalCost = 0;
  let perEmp = 0;

  if (calcType === 'TOTAL') {
    totalCost = baseVal;
    perEmp = empCount > 0 ? totalCost / empCount : 0;
  } else if (calcType === 'POR_HORA') {
    perEmp = baseVal * hours;
    totalCost = perEmp * empCount;
  } else if (calcType === 'POR_PESSOA') {
    perEmp = baseVal;
    totalCost = perEmp * empCount;
  } else if (calcType === 'POR_UNIDADE') {
    totalCost = baseVal * qty;
    perEmp = empCount > 0 ? totalCost / empCount : 0;
  }

  $('fCalcTotal').textContent = BRL(totalCost);
  $('fCalcPerEmp').textContent = empCount > 0 ? BRL(perEmp) + ' / pessoa' : '— selecione funcionários';

  return { totalCost, perEmp, hours };
}

async function submitFieldOp() {
  const date = $('fDate').value;
  const tStart = $('fTimeStart').value;
  const tEnd = $('fTimeEnd').value;
  const sector = $('fSector').value;
  const operation = $('fOperation').value;
  const regBy = $('fRegisteredBy').value.trim();

  if (!date || !tStart || !tEnd) { toast('Preencha data e horários', 'err'); return; }
  if (!sector || !operation) { toast('Selecione Setor e Operação', 'err'); return; }
  if (fState.workers.size === 0) { toast('Selecione ao menos 1 funcionário', 'err'); return; }
  if (!regBy) { toast('Informe quem está registrando', 'err'); return; }

  const { totalCost, perEmp, hours } = fUpdateCalc();

  const session = {
    tenant_id: tenantId,
    date: date,
    start_time: tStart,
    end_time: tEnd,
    sector: sector,
    operation: operation,
    parcel_id: $('fParcela').value || null,
    variety_id: $('fVariety').value || null,
    quantity: parseFloat($('fQty').value) || 0,
    unit: $('fUnit').value,
    total_value: parseFloat(totalCost.toFixed(2)),
    value_per_employee: parseFloat(perEmp.toFixed(2)),
    employee_count: fState.workers.size,
    registered_by: regBy,
    synced: true
  };

  const workersArr = Array.from(fState.workers.entries()).map(([id, name]) => ({
    employee_id: id, 
    employee_name: name, 
    value_received: parseFloat(perEmp.toFixed(2))
  }));

  const btn = $('fSubmitBtn');
  btn.disabled = true; btn.textContent = '⏳ Salvando...';

  try {
    if (!isOnline) {
      await idbAdd({ type: 'field_service', data: { session: { ...session, synced: false }, workers: workersArr } });
      await updateSyncBadge();
      toast('📥 Salvo offline — sincronizará quando online', 'ok');
      resetFForm();
    } else {
      const { data: sessList, error: e1 } = await sb.from('field_services').insert([session]).select('*');
      if (e1) throw e1;
      
      const sessId = sessList[0].id;
      const empRows = workersArr.map(w => ({ ...w, service_id: sessId }));
      
      const { error: e2 } = await sb.from('field_service_employees').insert(empRows);
      if (e2) throw e2;

      toast('✓ Apontamento registrado!', 'ok');
      resetFForm();
    }
  } catch(e) {
    toast('Erro: ' + e.message, 'err');
  } finally {
    btn.disabled = false; btn.textContent = '📝 Salvar Apontamento';
  }
}

function resetFForm() {
  $('fTimeStart').value = '';
  $('fTimeEnd').value = '';
  $('fQty').value = '';
  $('fBaseValue').value = '0.00';
  $('fCalcType').value = 'TOTAL';
  fState.workers.clear();
  filterFEmp();
  fUpdateCalc();
}

async function loadFieldOpHistory() {
  const el = $('fHistList');
  if (!isOnline) {
    el.innerHTML = '<div class="empty">Disponível apenas online</div>';
    return;
  }
  el.innerHTML = '<div class="loading"><div class="spinner"></div>Carregando...</div>';
  
  const { data, error } = await sb.from('field_services')
    .select('*, parcels(code), varieties(name)')
    .eq('tenant_id', tenantId)
    .order('date', {ascending:false})
    .order('start_time', {ascending:false})
    .limit(20);
    
  if (error || !data?.length) {
    el.innerHTML = '<div class="empty">Nenhum apontamento recente</div>';
    return;
  }

  el.innerHTML = data.map(r => {
    return `
      <div class="hist-item">
        <div class="hist-top">
          <span class="hist-name">${r.sector} - ${r.operation}</span>
          <span class="hist-time">${fmtTime(r.created_at)}</span>
        </div>
        <div class="hist-meta">
          <span class="pill pill-blue">${r.start_time.substring(0,5)} as ${r.end_time.substring(0,5)}</span>
          <span class="pill pill-green">${r.employee_count} pessoas</span>
          <span class="pill pill-gray">${BRL(r.total_value)}</span>
        </div>
        <div style="font-size:10px;color:var(--muted);margin-top:6px">Apontado por: ${r.registered_by || '—'}</div>
      </div>
    `;
  }).join('');
}
