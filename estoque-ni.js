/* ═══════════════════════════════════════════════════════════════════════
 * ESTOQUE — CAIXAS NÃO IDENTIFICADAS (N/I)
 * ───────────────────────────────────────────────────────────────────────
 * Quando o app do packinghouse conta uma caixa sem câmera / com a IA offline,
 * a caixa entra no estoque como calibre "N/I" e tipo "NÃO IDENTIFICADA".
 * Este painel (lateral da tela Estoque 3D) permite:
 *   • MAPEAR  → informar tipo de caixa, peso, calibre e quantidade. As caixas
 *               saem do pallet N/I e entram no pallet correto; os registros em
 *               production_scans são corrigidos (relatórios de kg ficam certos).
 *   • EXCLUIR → retirar do ESTOQUE as caixas que não condizem com a realidade.
 *               O bipe continua valendo na produção/pagamento do embalador
 *               (production_scans.caliber = 'EXCLUIDO').
 *
 * Depende de globais do index.html: sb, tenantId, e3d, e3dRegisterBox,
 * e3dLoadGridState, e3dLoading, E3D_NI_CAL, E3D_EXCLUDED_CAL, E3D_NO_VARIETY,
 * e3dScanStockInfo, toast.
 * ═══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const NI = {
    boxWeights: null,      // cache de box_weights
    current: null,         // { grid, idx } do pallet aberto no modal
    busy: false
  };

  const h = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const say = (msg, type) => (typeof toast === 'function' ? toast(msg, type) : alert(msg));

  // ── Estilos ───────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ni-styles')) return;
    const css = `
      #ni-panel{background:linear-gradient(160deg,rgba(245,158,11,.10),rgba(15,23,42,.92) 55%);border:1px solid rgba(245,158,11,.28);border-radius:14px;padding:16px;position:relative;overflow:hidden}
      #ni-panel::before{content:'';position:absolute;inset:0 0 auto 0;height:2px;background:linear-gradient(90deg,transparent,#f59e0b,transparent);animation:niScan 3s linear infinite}
      @keyframes niScan{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
      #ni-panel .ni-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
      #ni-panel .ni-title{font-size:11px;font-weight:800;color:#fbbf24;text-transform:uppercase;letter-spacing:1px;display:flex;align-items:center;gap:6px}
      #ni-panel .ni-total{font-size:22px;font-weight:900;color:#fff;line-height:1}
      #ni-panel .ni-total small{font-size:10px;color:#94a3b8;font-weight:700;margin-left:4px}
      #ni-panel .ni-hint{font-size:10.5px;color:#94a3b8;margin-bottom:10px;line-height:1.45}
      .ni-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:10px;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.05);margin-bottom:6px;transition:border-color .2s,transform .2s}
      .ni-item:hover{border-color:rgba(245,158,11,.45);transform:translateX(2px)}
      .ni-item .ni-num{font-weight:900;font-size:12px;color:#fbbf24;min-width:34px}
      .ni-item .ni-info{flex:1;min-width:0}
      .ni-item .ni-l1{font-size:12px;font-weight:700;color:#e2e8f0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ni-item .ni-l2{font-size:10px;color:#64748b}
      .ni-item .ni-qty{font-size:14px;font-weight:900;color:#fff;margin-right:4px}
      .ni-btn{border:none;border-radius:7px;padding:6px 9px;font-size:10.5px;font-weight:800;cursor:pointer;transition:filter .15s,transform .15s;display:inline-flex;align-items:center;gap:4px}
      .ni-btn:hover{filter:brightness(1.15);transform:translateY(-1px)}
      .ni-btn:disabled{opacity:.5;cursor:wait;transform:none}
      .ni-btn.map{background:linear-gradient(135deg,#f59e0b,#d97706);color:#111}
      .ni-btn.del{background:rgba(239,68,68,.14);color:#f87171;border:1px solid rgba(239,68,68,.35)}
      .ni-btn.ghost{background:rgba(255,255,255,.06);color:#cbd5e1;border:1px solid rgba(255,255,255,.1)}
      .ni-empty{font-size:11.5px;color:#4ade80;display:flex;align-items:center;gap:6px;padding:6px 2px}
      #ni-modal{position:fixed;inset:0;background:rgba(2,6,23,.72);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;z-index:10050;animation:niFade .18s ease}
      #ni-modal.open{display:flex}
      @keyframes niFade{from{opacity:0}to{opacity:1}}
      #ni-dialog{width:520px;max-width:94vw;background:linear-gradient(180deg,#0f172a,#0b1222);border:1px solid rgba(245,158,11,.3);border-radius:16px;padding:22px;box-shadow:0 30px 80px rgba(0,0,0,.55);animation:niPop .22s cubic-bezier(.2,.9,.3,1.2)}
      @keyframes niPop{from{transform:scale(.94);opacity:0}to{transform:scale(1);opacity:1}}
      #ni-dialog h3{margin:0 0 4px;font-size:16px;color:#fbbf24;display:flex;align-items:center;gap:8px}
      #ni-dialog .ni-sub{font-size:11.5px;color:#94a3b8;margin-bottom:16px}
      #ni-dialog .ni-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      #ni-dialog .ni-full{grid-column:1/-1}
      #ni-dialog label{display:block;font-size:10px;color:#64748b;text-transform:uppercase;font-weight:800;letter-spacing:.5px;margin-bottom:4px}
      #ni-dialog input,#ni-dialog select{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;background:rgba(2,6,23,.8);border:1px solid rgba(255,255,255,.1);color:#fff;font-size:13px;outline:none;transition:border-color .15s}
      #ni-dialog input:focus,#ni-dialog select:focus{border-color:#f59e0b}
      #ni-dialog .ni-qtyrow{display:flex;gap:6px}
      #ni-dialog .ni-qtyrow input{flex:1}
      #ni-dialog .ni-summary{margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,.07);border:1px dashed rgba(245,158,11,.3);font-size:12px;color:#e2e8f0}
      #ni-dialog .ni-actions{display:flex;justify-content:space-between;gap:8px;margin-top:18px}
      #ni-dialog .ni-actions .r{display:flex;gap:8px}
      #ni-dialog .ni-btn{padding:9px 14px;font-size:12px}
    `;
    const st = document.createElement('style');
    st.id = 'ni-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── Helpers de estado ─────────────────────────────────────────────────
  function niSlots() {
    if (typeof e3d === 'undefined') return [];
    const out = [];
    [['packing', e3d.grid], ['cold', e3d.coldGrid]].forEach(([grid, arr]) => {
      (arr || []).forEach((s, idx) => {
        if (s && s.status !== 'empty' && s.caliber === E3D_NI_CAL && s.boxes > 0) out.push({ grid, idx, slot: s });
      });
    });
    return out;
  }

  function getSlot(ref) {
    if (!ref) return null;
    const arr = ref.grid === 'cold' ? e3d.coldGrid : e3d.grid;
    return arr ? arr[ref.idx] : null;
  }

  async function waitIdle(maxMs = 15000) {
    const t0 = Date.now();
    while (typeof e3dLoading !== 'undefined' && e3dLoading && Date.now() - t0 < maxMs) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  async function loadBoxWeights(force) {
    if (NI.boxWeights && !force) return NI.boxWeights;
    try {
      const { data, error } = await sb.from('box_weights')
        .select('id,name,weight_kg,active').eq('tenant_id', tenantId).order('name');
      if (error) throw error;
      NI.boxWeights = (data || []).filter(b => b.active !== false);
    } catch (e) {
      console.error('[NI] box_weights:', e);
      NI.boxWeights = [];
    }
    return NI.boxWeights;
  }

  // ── Painel lateral ────────────────────────────────────────────────────
  function ensurePanel() {
    let panel = document.getElementById('ni-panel');
    if (panel) return panel;
    const host = document.getElementById('e3d-right-panel');
    if (!host) return null;
    panel = document.createElement('div');
    panel.id = 'ni-panel';
    host.insertBefore(panel, host.firstChild);
    return panel;
  }

  function renderPanel() {
    injectStyles();
    const panel = ensurePanel();
    if (!panel) return;
    const items = niSlots();
    const total = items.reduce((a, it) => a + (it.slot.boxes || 0), 0);

    const head = `
      <div class="ni-head">
        <div class="ni-title"><i data-lucide="scan-search" style="width:14px;height:14px"></i> Caixas Não Identificadas</div>
        <div class="ni-total">${total}<small>cx</small></div>
      </div>`;

    if (!items.length) {
      panel.innerHTML = head + `<div class="ni-empty"><i data-lucide="check-circle-2" style="width:14px;height:14px"></i> Tudo identificado — nenhuma caixa pendente de mapeamento.</div>`;
    } else {
      panel.innerHTML = head + `
        <div class="ni-hint">Caixas contadas sem câmera/IA. Confira com o físico: <b>mapeie</b> o tipo, peso e calibre, ou <b>exclua</b> do estoque o que não existe (a produção do embalador é mantida).</div>
        ${items.map(it => {
          const s = it.slot;
          const where = it.grid === 'cold' ? 'Câmara Fria' : 'Packing';
          return `<div class="ni-item">
            <div class="ni-num">P${String(s.palletNum).padStart(2, '0')}</div>
            <div class="ni-info">
              <div class="ni-l1">${h(s.boxType || E3D_NO_VARIETY)}</div>
              <div class="ni-l2">Parcela ${h(s.parcel || '—')} · ${where}</div>
            </div>
            <div class="ni-qty">${s.boxes}</div>
            <button class="ni-btn map" id="ni-map-${it.grid}-${it.idx}" onclick="niOpenModal('${it.grid}',${it.idx})"><i data-lucide="wand-2" style="width:12px;height:12px"></i>Mapear</button>
          </div>`;
        }).join('')}`;
    }
    if (window.lucide) window.lucide.createIcons();
  }

  // ── Modal ─────────────────────────────────────────────────────────────
  function ensureModal() {
    let m = document.getElementById('ni-modal');
    if (m) return m;
    m = document.createElement('div');
    m.id = 'ni-modal';
    m.innerHTML = `
      <div id="ni-dialog" role="dialog" aria-modal="true" aria-labelledby="ni-title">
        <h3 id="ni-title"><i data-lucide="wand-2" style="width:18px;height:18px"></i> Mapear caixas não identificadas</h3>
        <div class="ni-sub" id="ni-sub">—</div>
        <div class="ni-grid">
          <div class="ni-full">
            <label for="ni-qty">Quantidade de caixas</label>
            <div class="ni-qtyrow">
              <input type="number" id="ni-qty" min="1" step="1">
              <button class="ni-btn ghost" id="ni-qty-all" type="button">Todas</button>
            </div>
          </div>
          <div class="ni-full">
            <label for="ni-box">Tipo de caixa</label>
            <select id="ni-box"></select>
          </div>
          <div class="ni-full" id="ni-box-custom-wrap" style="display:none">
            <label for="ni-box-custom">Nome do tipo de caixa</label>
            <input id="ni-box-custom" placeholder="Ex: Caixa Verde 13kg">
          </div>
          <div>
            <label for="ni-kg">Peso da caixa (kg)</label>
            <input type="number" id="ni-kg" min="0" step="0.01" placeholder="Ex: 13">
          </div>
          <div>
            <label for="ni-cal">Calibre</label>
            <input id="ni-cal" list="ni-cal-list" placeholder="Ex: 9">
            <datalist id="ni-cal-list"></datalist>
          </div>
          <div>
            <label for="ni-var">Variedade</label>
            <input id="ni-var" list="ni-var-list">
            <datalist id="ni-var-list"></datalist>
          </div>
          <div>
            <label for="ni-parcel">Parcela</label>
            <input id="ni-parcel">
          </div>
        </div>
        <div class="ni-summary" id="ni-summary">—</div>
        <div class="ni-actions">
          <button class="ni-btn del" id="ni-btn-exclude" type="button"><i data-lucide="trash-2" style="width:13px;height:13px"></i>Excluir do estoque</button>
          <div class="r">
            <button class="ni-btn ghost" id="ni-btn-cancel" type="button">Cancelar</button>
            <button class="ni-btn map" id="ni-btn-apply" type="button"><i data-lucide="check" style="width:13px;height:13px"></i>Mapear</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(m);

    m.addEventListener('click', (e) => { if (e.target === m) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && m.classList.contains('open')) closeModal(); });
    m.querySelector('#ni-btn-cancel').onclick = closeModal;
    m.querySelector('#ni-btn-apply').onclick = applyMapping;
    m.querySelector('#ni-btn-exclude').onclick = applyExclusion;
    m.querySelector('#ni-qty-all').onclick = () => {
      const s = getSlot(NI.current);
      if (s) { m.querySelector('#ni-qty').value = s.boxes; updateSummary(); }
    };
    m.querySelector('#ni-box').onchange = () => {
      const sel = m.querySelector('#ni-box');
      const opt = sel.options[sel.selectedIndex];
      const custom = sel.value === '__custom__';
      m.querySelector('#ni-box-custom-wrap').style.display = custom ? 'block' : 'none';
      if (!custom && opt && opt.dataset.kg) m.querySelector('#ni-kg').value = opt.dataset.kg;
      updateSummary();
    };
    ['#ni-qty', '#ni-kg', '#ni-cal', '#ni-var', '#ni-parcel', '#ni-box-custom'].forEach(sel => {
      m.querySelector(sel).addEventListener('input', updateSummary);
    });
    return m;
  }

  function readForm() {
    const m = document.getElementById('ni-modal');
    const sel = m.querySelector('#ni-box');
    const boxName = sel.value === '__custom__' ? m.querySelector('#ni-box-custom').value.trim() : sel.value;
    return {
      qty: parseInt(m.querySelector('#ni-qty').value, 10) || 0,
      boxName,
      kg: parseFloat(String(m.querySelector('#ni-kg').value).replace(',', '.')),
      caliber: m.querySelector('#ni-cal').value.trim(),
      variety: m.querySelector('#ni-var').value.trim() || E3D_NO_VARIETY,
      parcel: m.querySelector('#ni-parcel').value.trim() || '—'
    };
  }

  function updateSummary() {
    const el = document.getElementById('ni-summary');
    const s = getSlot(NI.current);
    if (!el || !s) return;
    const f = readForm();
    const kgTxt = isFinite(f.kg) && f.kg > 0 ? `${(f.kg * (f.qty || 0)).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg` : '— kg';
    el.innerHTML = `<b>${f.qty || 0}</b> de ${s.boxes} cx → <b>${h(f.boxName || '?')}</b> · Cal. <b>${h(f.caliber || '?')}</b> · ${h(f.variety)} (${h(f.parcel)}) · Total <b>${kgTxt}</b>`;
  }

  window.niOpenModal = async function (grid, idx) {
    const ref = { grid, idx: Number(idx) };
    const s = getSlot(ref);
    if (!s) { say('Pallet não encontrado. Atualize a tela.', 'warning'); return; }
    NI.current = ref;
    const m = ensureModal();

    m.querySelector('#ni-sub').innerHTML =
      `Pallet <b>P${String(s.palletNum).padStart(2, '0')}</b> · ${h(s.boxType || E3D_NO_VARIETY)} · Parcela ${h(s.parcel || '—')} · <b>${s.boxes}</b> caixas não identificadas`;
    const qty = m.querySelector('#ni-qty');
    qty.max = s.boxes;
    qty.value = s.boxes;
    m.querySelector('#ni-var').value = s.boxType && s.boxType !== E3D_NO_VARIETY ? s.boxType : '';
    m.querySelector('#ni-parcel').value = s.parcel && s.parcel !== '—' ? s.parcel : '';
    m.querySelector('#ni-cal').value = '';
    m.querySelector('#ni-kg').value = '';
    m.querySelector('#ni-box-custom').value = '';
    m.querySelector('#ni-box-custom-wrap').style.display = 'none';

    // Calibres sugeridos: os já usados no estoque + padrões
    const cals = new Set(['5', '6', '7', '8', '9', '10', '12', '14', '15']);
    [...(e3d.grid || []), ...(e3d.coldGrid || [])].forEach(x => {
      if (x && x.caliber && x.caliber !== E3D_NI_CAL) cals.add(String(x.caliber));
    });
    m.querySelector('#ni-cal-list').innerHTML = [...cals].map(c => `<option value="${h(c)}">`).join('');

    // Variedades sugeridas
    const vars = new Set();
    [...(e3d.grid || []), ...(e3d.coldGrid || [])].forEach(x => { if (x && x.boxType && x.boxType !== E3D_NO_VARIETY) vars.add(x.boxType); });
    try { (typeof _infoParcelas !== 'undefined' ? _infoParcelas : []).forEach(p => { if (p.variedade) vars.add(p.variedade); }); } catch (_) {}
    m.querySelector('#ni-var-list').innerHTML = [...vars].map(v => `<option value="${h(v)}">`).join('');

    const sel = m.querySelector('#ni-box');
    sel.innerHTML = '<option value="">Carregando tipos de caixa...</option>';
    m.classList.add('open');
    if (window.lucide) window.lucide.createIcons();

    const boxes = await loadBoxWeights();
    sel.innerHTML = '<option value="">— Selecione o tipo de caixa —</option>' +
      boxes.map(b => `<option value="${h(b.name)}" data-kg="${b.weight_kg != null ? h(b.weight_kg) : ''}">${h(b.name)}${b.weight_kg ? ` · ${h(b.weight_kg)} kg` : ''}</option>`).join('') +
      '<option value="__custom__">+ Outro tipo (digitar)</option>';
    updateSummary();
    setTimeout(() => qty.focus(), 50);
  };

  function closeModal() {
    const m = document.getElementById('ni-modal');
    if (m) m.classList.remove('open');
    NI.current = null;
  }

  function setBusy(b) {
    NI.busy = b;
    ['#ni-btn-apply', '#ni-btn-exclude', '#ni-btn-cancel'].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.disabled = b;
    });
  }

  // ── Operações no banco ────────────────────────────────────────────────
  // Busca os IDs dos bipes N/I (production_scans) que deram origem ao pallet.
  async function fetchNiScanIds(slot, qty) {
    let q = sb.from('production_scans').select('id, role, caliber').eq('tenant_id', tenantId);
    const v = slot.boxType;
    q = (!v || v === E3D_NO_VARIETY) ? q.is('variety_name', null) : q.eq('variety_name', v);
    const p = slot.parcel;
    q = (!p || p === '—') ? q.is('parcel_code', null) : q.eq('parcel_code', p);
    if (slot.createdAt) q = q.gte('ts', String(slot.createdAt).slice(0, 10) + 'T00:00:00Z');
    const { data, error } = await q.order('ts', { ascending: true }).limit(5000);
    if (error) throw error;
    return (data || [])
      .filter(s => { const i = e3dScanStockInfo(s); return i && i.unidentified; })
      .slice(0, qty)
      .map(s => s.id);
  }

  async function updateScans(ids, patch) {
    for (let i = 0; i < ids.length; i += 200) {
      const chunk = ids.slice(i, i + 200);
      const { error } = await sb.from('production_scans').update(patch).in('id', chunk);
      if (error) throw error;
    }
  }

  async function decrementSlot(slot, qty) {
    slot.boxes = Math.max(0, (slot.boxes || 0) - qty);
    if (!slot.id) return;
    if (slot.boxes <= 0) {
      const { error } = await sb.from('pallets').delete().eq('id', slot.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('pallets').update({ box_count: slot.boxes }).eq('id', slot.id);
      if (error) throw error;
    }
  }

  function permissionHint(err) {
    const msg = (err && (err.message || err.details)) || String(err);
    if (/permission|policy|rls|denied|42501/i.test(msg)) {
      return 'Sem permissão para alterar production_scans no Supabase (RLS). Libere UPDATE para usuários autenticados do tenant.';
    }
    return msg;
  }

  // Executa com trava: evita que a reconciliação automática rode no meio da operação
  async function withLock(fn) {
    await waitIdle();
    e3dLoading = true;
    try {
      return await fn();
    } finally {
      e3dLoading = false;
      try { await e3dLoadGridState(); } catch (e) { console.error(e); }
      renderPanel();
    }
  }

  async function applyMapping() {
    if (NI.busy) return;
    const s = getSlot(NI.current);
    if (!s) return;
    const f = readForm();
    if (f.qty < 1 || f.qty > s.boxes) { say(`Quantidade deve ser entre 1 e ${s.boxes}.`, 'warning'); return; }
    if (!f.boxName) { say('Informe o tipo de caixa.', 'warning'); return; }
    if (!f.caliber || f.caliber === E3D_NI_CAL) { say('Informe o calibre.', 'warning'); return; }
    if (!isFinite(f.kg) || f.kg < 0) { say('Informe o peso da caixa (kg).', 'warning'); return; }

    setBusy(true);
    try {
      await withLock(async () => {
        const ids = await fetchNiScanIds(s, f.qty);
        if (ids.length) {
          await updateScans(ids, {
            caliber: f.caliber,
            weight_name: f.boxName,
            weight_kg: f.kg,
            variety_name: f.variety === E3D_NO_VARIETY ? null : f.variety,
            parcel_code: f.parcel === '—' ? null : f.parcel
          });
        }
        await decrementSlot(s, f.qty);
        await e3dRegisterBox(f.caliber, f.variety, f.boxName, f.parcel, f.qty);
      });
      say(`${f.qty} cx mapeadas → ${f.boxName} · Cal. ${f.caliber}`, 'success');
      closeModal();
    } catch (e) {
      console.error('[NI] mapear:', e);
      say('Erro ao mapear: ' + permissionHint(e), 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function applyExclusion() {
    if (NI.busy) return;
    const s = getSlot(NI.current);
    if (!s) return;
    const qty = parseInt(document.getElementById('ni-qty').value, 10) || 0;
    if (qty < 1 || qty > s.boxes) { say(`Quantidade deve ser entre 1 e ${s.boxes}.`, 'warning'); return; }
    if (!confirm(`Excluir ${qty} caixa(s) não identificada(s) do ESTOQUE?\n\nA contagem do embalador (produção/pagamento) NÃO é alterada.`)) return;

    setBusy(true);
    try {
      await withLock(async () => {
        const ids = await fetchNiScanIds(s, qty);
        if (ids.length) await updateScans(ids, { caliber: E3D_EXCLUDED_CAL });
        await decrementSlot(s, qty);
      });
      say(`${qty} cx excluídas do estoque.`, 'success');
      closeModal();
    } catch (e) {
      console.error('[NI] excluir:', e);
      say('Erro ao excluir: ' + permissionHint(e), 'danger');
    } finally {
      setBusy(false);
    }
  }

  // ── Integração: re-renderiza o painel sempre que a fila de pallets muda ──
  function hook() {
    if (typeof window.e3dRenderQueue !== 'function' || window.e3dRenderQueue.__niHooked) return;
    const orig = window.e3dRenderQueue;
    const wrapped = function () {
      const r = orig.apply(this, arguments);
      try { renderPanel(); } catch (e) { console.error('[NI] render:', e); }
      return r;
    };
    wrapped.__niHooked = true;
    window.e3dRenderQueue = wrapped;
  }

  window.niRenderPanel = renderPanel;
  hook();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook);
})();
