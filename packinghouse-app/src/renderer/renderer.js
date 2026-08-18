window.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const must = (id) => {
    const el = $(id);
    if (!el) throw new Error(`Missing element #${id}`);
    return el;
  };

  const appMount = must('app');
  const roleSelect = must('roleSelect');
  roleSelect.value = localStorage.getItem('lastRole') || 'EMBALADOR';
  roleSelect.onchange = () => {
    localStorage.setItem('lastRole', roleSelect.value);
    route();
  };
  const clockEl = must('clock');
  const tenantName = must('tenantName');
  const tenantSub = must('tenantSub');

  const stationId = 'st01';
  const scannerId = 'sc01';

  const hasApi = (name) => typeof window.api?.[name] === 'function';

  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const pad = (n) => String(n).padStart(2, '0');

  function fmtClock(d = new Date()) {
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function isoDateToday() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function startOfDayMs(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  }
  function endOfDayMs(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
  }

  function currentRoute() {
    const h = (location.hash || '').replace('#', '');
    if (!h || h === '/') return '/inicio';
    return h.startsWith('/') ? h : `/${h}`;
  }

  function setActiveMenu(route) {
    document.querySelectorAll('.menuItem').forEach((a) => {
      a.classList.toggle('active', a.dataset.route === route.replace('/', ''));
    });
  }

  function renderTemplate(tplId) {
    const tpl = must(tplId);
    appMount.innerHTML = '';
    appMount.appendChild(tpl.content.cloneNode(true));
    if (window.lucide) window.lucide.createIcons();
  }

  function tickClock() {
    const now = new Date();
    clockEl.textContent = fmtClock(now);
    const pClock = document.getElementById('clock');
    if (pClock) pClock.textContent = fmtClock(now);
  }

  function colorByPct(p) {
    if (Number(p) >= 75) return '#16a34a';
    if (Number(p) >= 50) return '#eab308';
    return '#ef4444';
  }

  function photoUrl(photoPath) {
    if (!photoPath) return '';
    if (
      photoPath.startsWith('file:') ||
      photoPath.startsWith('data:') ||
      photoPath.startsWith('http:') ||
      photoPath.startsWith('https:')
    ) return photoPath;
    return `file://${photoPath}`;
  }

  function photoStyle(photoPath, size = 44) {
    const url = photoUrl(photoPath);
    const styles = [
      `width:${size}px`,
      `height:${size}px`,
      'border-radius:999px',
      'background:#1f2937',
      'background-size:cover',
      'background-position:center',
      'flex:0 0 auto',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'font-size: 18px'
    ];
    if (url) {
      styles.push(`background-image:url('${url}')`);
      styles.push('color:transparent');
    } else {
      styles.push('color:rgba(255,255,255,0.2)');
    }
    return styles.join(';');
  }

  function statusPill(active) {
    return active
      ? '<span style="font-size:12px;padding:2px 8px;border-radius:999px;background:#052e16;color:#86efac;">ATIVO</span>'
      : '<span style="font-size:12px;padding:2px 8px;border-radius:999px;background:#3f1d1d;color:#fca5a5;">INATIVO</span>';
  }

  function moneyBRL(v) {
    const n = Number(String(v || 0).replace(',', '.'));
    return (isNaN(n) ? 0 : n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  function routeTo(hash) {
    location.hash = hash.replace('/', '');
  }

  function setPhoto(el, photoPath) {
    el.style.backgroundImage = '';
    const url = photoUrl(photoPath);
    if (url) el.style.backgroundImage = `url("${url}")`;
  }

  function renderBars(container, items, options = {}) {
    const {
      label = (x) => x.label,
      value = (x) => x.value,
      extra = () => '',
      color = () => '#22c55e'
    } = options;

    if (!items.length) {
      container.innerHTML = '<div class="muted">Sem dados.</div>';
      return;
    }

    const max = Math.max(...items.map((x) => Number(value(x) || 0)), 1);

    container.innerHTML = items
      .map((item) => {
        const val = Number(value(item) || 0);
        const width = Math.max(4, Math.round((val / max) * 100));
        return `
          <div style="display:grid;grid-template-columns:220px 1fr;gap:10px;align-items:center;margin:10px 0;">
            <div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(label(item))}</div>
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="position:relative;flex:1;height:18px;background:#111827;border-radius:999px;overflow:hidden;border:1px solid rgba(255,255,255,.06);">
                <div style="height:100%;width:${width}%;background:${color(item)};"></div>
              </div>
              <div style="min-width:74px;text-align:right;">${esc(extra(item) || String(val))}</div>
            </div>
          </div>
        `;
      })
      .join('');
  }

  /**
   * Auto-scrolls a list if its content exceeds the container height.
   */
  function applyScrollRoll(element) {
    if (!element) return;
    const container = element.parentElement;
    if (!container || !container.classList.contains('scroll-roll-container')) return;

    // Reset animation
    element.style.animation = 'none';
    element.offsetHeight; // trigger reflow
    element.style.setProperty('--scroll-dist', '0px');

    const contentHeight = element.scrollHeight;
    const containerHeight = container.offsetHeight;

    if (contentHeight > containerHeight + 5) {
      const dist = containerHeight - contentHeight;
      const duration = Math.max(10, Math.floor(contentHeight / 40)); // ~40px per second

      element.style.setProperty('--scroll-dist', `${dist}px`);
      element.style.setProperty('--scroll-duration', `${duration}s`);
      element.style.animation = 'scroll-roll var(--scroll-duration) linear infinite';
    }
  }

  let isAdminUnlocked = sessionStorage.getItem('isAdminUnlocked') === 'true';

  async function applyTerminalMode() {
    const cfg = await window.api.configGetAll();
    const mode = cfg.terminal_mode || 'full';
    const btnUnlock = $('btnUnlock');

    const isKiosk = mode === 'kiosk' && !isAdminUnlocked;

    document.querySelectorAll('.menuItem').forEach((item) => {
      const route = item.dataset.route;
      const isProtected = ['admin', 'financeiro', 'dashboards', 'config'].includes(route);
      if (isKiosk && isProtected) {
        item.style.display = 'none';
      } else {
        item.style.display = 'block';
      }
    });

    if (btnUnlock) {
      console.log('applyTerminalMode: isKiosk=', isKiosk, 'mode=', mode, 'isAdminUnlocked=', isAdminUnlocked);
      btnUnlock.style.display = isKiosk ? 'inline-block' : 'none';
      btnUnlock.onclick = async () => {
        const pass = prompt('Digite a senha administrativa (deixe vazio se não houver):');
        const correctPass = cfg.admin_password || '';
        console.log('Unlock attempt: pass entered=', pass, 'correct=', correctPass);

        if (pass === correctPass || (!correctPass && pass === '')) {
          console.log('Unlock SUCCESS');
          isAdminUnlocked = true;
          sessionStorage.setItem('isAdminUnlocked', 'true');
          await applyTerminalMode();
        } else if (pass !== null) {
          console.log('Unlock FAILED');
          alert('Senha incorreta.');
        }
      };
    }

    const route = currentRoute().replace('/', '');
    if (isKiosk && ['admin', 'financeiro', 'dashboards', 'config'].includes(route)) {
      routeTo('/painel');
    }
  }

  async function initAuth() {
    const overlay = $('loginOverlay');
    if (!overlay) return;

    const res = await window.api.authCheck();
    if (res.ok) {
      overlay.style.display = 'none';
      return true;
    }

    overlay.style.display = 'flex';
    const emailInp = $('loginEmail');
    const passInp = $('loginPass');
    const btn = $('btnLoginAction');
    const status = $('loginStatus');

    btn.onclick = async () => {
      console.log("[Login] Tentando entrar com:", emailInp.value);
      const email = emailInp.value.trim();
      const password = passInp.value.trim();
      if (!email || !password) return;

      btn.disabled = true;
      btn.textContent = 'Autenticando...';
      status.textContent = '';

      try {
        const loginRes = await window.api.authLogin({ email, password });
        if (loginRes.ok) {
          status.textContent = 'Sincronizando dados...';
          await window.api.syncNow().catch(console.error);
          overlay.style.display = 'none';
          await initShell();
          route();
        } else {
          status.textContent = loginRes.error || 'Erro ao entrar.';
          console.error("[Login] Falha:", loginRes.error);
        }
      } catch (err) {
        status.textContent = 'Erro de conexão.';
        console.error("[Login] Exceção:", err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar e Sincronizar';
      }
    };

    // Botão de Emergência para Reset
    let resetBtn = $('btnLoginReset');
    if (!resetBtn) {
       resetBtn = document.createElement('button');
       resetBtn.id = 'btnLoginReset';
       resetBtn.type = 'button';
       resetBtn.style.cssText = 'width:100%; height:35px; background:transparent; border:1px solid rgba(255,255,255,0.1); color:rgba(255,255,255,0.4); font-size:11px; margin-top:15px; border-radius:8px; cursor:pointer;';
       resetBtn.textContent = 'Limpar Conexão e Reiniciar';
       btn.parentNode.appendChild(resetBtn);
    }
    resetBtn.onclick = async () => {
       if (confirm("Isso vai limpar o token antigo e reiniciar o login. Confirmar?")) {
          await window.api.configSet({ auth_token: null, auth_refresh_token: null });
          window.location.reload();
       }
    };

    return false;
  }

  async function initShell() {
    const isAuth = await initAuth();
    if (!isAuth) return;

    // Listener global para Logout no Header (Mais robusto)
    const btnHeaderLogout = document.getElementById('btnHeaderLogout');
    if (btnHeaderLogout) {
      btnHeaderLogout.onclick = async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        if (!confirm('Deseja realmente sair da conta?')) return;
        console.log('Auth: Logging out from header...');
        await window.api.configSet({ auth_token: null, auth_refresh_token: null });
        window.location.reload();
      };
    }

    await applyTerminalMode();
    const cfg = await window.api.configGetAll();
    tenantName.textContent = cfg.tenant_name || 'Core Agro';
    tenantSub.textContent = cfg.tenant_logo_path ? 'Logo configurada' : 'Inteligência no Campo';
    document.body.dataset.theme = cfg.theme || 'dark';
    document.body.dataset.culture = cfg.culture_type || 'MAMAO';
  }

  async function initPainel() {
    const scanInput = must('scanInput');
    const status = must('status');
    const totalsEl = must('totals');
    const leaderPhoto = must('leaderPhoto');
    const leaderName = must('leaderName');
    const leaderBoxes = must('leaderBoxes');
    const leaderProd = must('leaderProd');
    const leaderQual = must('leaderQual');
    const rankList = must('rankList');

    async function refreshTotals() {
      const cfg = await window.api.configGetAll();
      const isMelonMode = cfg.culture_type === 'MELAO_MELANCIA';
      const t = await window.api.totalsNow({ stationId, role: roleSelect.value });

      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 10px;">
          <div style="font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">Produção Hoje</div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 800; color: #fff;">${t.dayTotal} <span style="font-size: 11px; font-weight: 400; color: var(--muted);">cx</span></div>
            <div style="font-size: 12px; color: var(--green);">${isMelonMode ? (t.dayKg / 1000).toFixed(3) + ' t' : t.dayKg + ' kg'}</div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div style="font-size: 11px; color: var(--muted);">TOTAL HORA</div>
          <div style="font-size: 14px; font-weight: 700;">${t.hourTotal} cx</div>
        </div>
      `;

      if (isMelonMode) {
        html += `
          <div style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
            <div style="font-size: 10px; color: var(--green); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Balanço de Massa (Parcelas)</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
        `;

        if (t.byParcel && t.byParcel.length > 0) {
          html += t.byParcel.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; background: rgba(255,255,255,0.03); padding: 6px 10px; border-radius: 6px;">
              <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--muted); max-width: 180px;">${esc(p.label)}</div>
              <div style="font-weight: 700; color: #fff; margin-left: 10px;">${(p.kg / 1000).toFixed(3)} t</div>
            </div>
          `).join('');
        } else {
          html += `<div class="muted" style="font-size: 11px; padding: 5px;">Aguardando produção por parcela...</div>`;
        }

        html += `</div></div>`;
      }

      totalsEl.innerHTML = html;

      const boxStatsList = document.getElementById('boxStatsList');
      if (boxStatsList) {
        if (roleSelect.value === 'EMPILHADOR' || !t.byWeight || !t.byWeight.length) {
          boxStatsList.innerHTML = `<div class="muted" style="padding: 10px;">Aguardando leituras...</div>`;
        } else {
          boxStatsList.innerHTML = t.byWeight.map((x, i) => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.3); padding: 10px 15px; border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.2); animation: fade-in 0.3s ease both; animation-delay: ${i * 0.1}s;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="display:flex;align-items:center"><i data-lucide="box" style="width:20px;height:20px;color:var(--blue)"></i></div>
                <div style="font-weight: 600;">${esc(x.label)}</div>
              </div>
              <div style="font-size: 16px; font-weight: 800; color: var(--green);">${x.boxes} <span style="font-size: 12px; font-weight: 400; color: var(--muted);">un.</span></div>
            </div>
          `).join('');
        }
        applyScrollRoll(boxStatsList);
      }
      if (window.lucide) window.lucide.createIcons();
    }

    let lastRanks = {};

    async function refreshState() {
      const st = await window.api.stateGet({ stationId, role: roleSelect.value });

      if (st.leader) {
        leaderName.textContent = st.leader.name;
        leaderBoxes.textContent = `${st.leader.produced} caixas`;
        leaderProd.textContent = `Produtividade: ${st.leader.productivityPct}%`;
        leaderQual.textContent = `Qualidade: ${st.leader.qualityPct}%`;
        leaderProd.style.color = colorByPct(st.leader.productivityPct);
        leaderQual.style.color = colorByPct(st.leader.qualityPct);
        setPhoto(leaderPhoto, st.leader.photoPath || '');
      } else {
        leaderName.textContent = '-';
        leaderBoxes.textContent = '-';
        leaderProd.textContent = '-';
        leaderQual.textContent = '-';
        leaderProd.style.color = '';
        leaderQual.style.color = '';
        setPhoto(leaderPhoto, '');
      }

      const currentRanks = {};
      rankList.innerHTML = (st.top10 || [])
        .map((r, idx) => {
          const pos = idx + 1;
          currentRanks[r.id] = pos;
          const prevPos = lastRanks[r.id];
          const isRankUp = prevPos !== undefined && pos < prevPos;
          const animClass = isRankUp ? 'rank-up-anim' : '';

          return `
            <div class="${animClass}" style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06); transition: all 0.5s ease;">
              <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                <div style="${photoStyle(r.photoPath, 42)}">${!photoUrl(r.photoPath) ? '<i data-lucide="user" style="width:20px;height:20px;"></i>' : ''}</div>
                <div style="min-width:0;">
                  <div style="font-weight:600;">#${pos} ${esc(r.name)}</div>
                  <div style="display: flex; gap: 10px; font-size: 11px; margin-top: 4px;">
                    <span style="color: ${colorByPct(r.productivityPct)}; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">Prod: ${r.productivityPct}%</span>
                    <span style="color: ${colorByPct(r.qualityPct)}; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">Qual: ${r.qualityPct}%</span>
                  </div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size: 16px;"><strong>${r.produced}</strong> <span class="muted" style="font-size:12px;">cx</span></div>
                ${isRankUp ? '<div style="font-size:10px; color:#22c55e; font-weight:bold; margin-top: 4px; display:flex; align-items:center; gap:2px;"><i data-lucide="arrow-up" style="width:12px;height:12px;"></i> SUBIU</div>' : ''}
              </div>
            </div>
          `;
        })
        .join('') || '<div class="muted">Sem registros nesta hora.</div>';

      applyScrollRoll(rankList);
      lastRanks = currentRanks;
      await refreshTotals();
      if (window.lucide) window.lucide.createIcons();
    }

    roleSelect.addEventListener('change', async () => {
      try {
        const role = roleSelect.value;
        // Oculta o painel de IA/Visor para Empilhadores
        const cvResults = document.getElementById('cvResults');
        if (cvResults) {
          cvResults.style.display = (role === 'EMPILHADOR') ? 'none' : 'block';
        }
        
        await refreshState();
        setTimeout(() => scanInput.focus(), 50);
      } catch (err) {
        status.textContent = `Erro ao trocar função: ${err.message}`;
      }
    });

    scanInput.addEventListener('keydown', async (ev) => {
      if (ev.key !== 'Enter') return;

      const rawBarcode = scanInput.value.trim();
      scanInput.value = '';
      if (!rawBarcode) return;

      try {
        let caliberDetected = null;
        const cfg = await window.api.configGetAll();
        
        if (cfg.cv_enabled && roleSelect.value !== 'EMPILHADOR') {
          const cvPanel = document.getElementById('cvResults');
          if (cvPanel) {
            cvPanel.style.display = 'block';
            document.getElementById('cvStatus').textContent = '(Analisando...)';
            document.getElementById('cvCaliber').style.opacity = '0.5';
            if (window.lucide) window.lucide.createIcons();
          }

          try {
            let activeFruitName = '';
            const ctxFruit = document.getElementById('ctxFruit');
            if (ctxFruit && ctxFruit.selectedIndex >= 0) {
              const txt = ctxFruit.options[ctxFruit.selectedIndex].text;
              if (txt && txt !== 'Fruta...') {
                activeFruitName = txt;
              }
            }
            // Aguarda 800ms para dar tempo da câmera focar e do OCR em background processar a caixa
            await new Promise(r => setTimeout(r, 800));
            const cvRes = await window.api.cvAnalyze(activeFruitName);
            const statusEl = document.getElementById('cvStatus');
            const caliberEl = document.getElementById('cvCaliber');
            const confidenceEl = document.getElementById('cvConfidence');
            const countEl = document.getElementById('cvCount');
            const boxModelEl = document.getElementById('cvBoxModel');
            const weightEl = document.getElementById('cvWeight');

            if (cvRes.ok) {
              statusEl.textContent = '(Sucesso)';
              caliberEl.textContent = cvRes.caliber;
              confidenceEl.textContent = Math.round(cvRes.confidence * 100) + '%';
              countEl.textContent = cvRes.count;
              caliberEl.style.opacity = '1';
              
              if (boxModelEl) boxModelEl.textContent = cvRes.box_model || '--';
              if (weightEl) weightEl.textContent = cvRes.detected_weight ? (cvRes.detected_weight + ' kg') : '--';
              
              if (cvRes.count > 0) {
                caliberDetected = cvRes.caliber;
              }
            } else {
              statusEl.textContent = '(Falha na IA)';
              caliberEl.textContent = '--';
              confidenceEl.textContent = '0%';
              countEl.textContent = '--';
              caliberEl.style.opacity = '0.3';
              if (boxModelEl) boxModelEl.textContent = '--';
              if (weightEl) weightEl.textContent = '--';
            }
          } catch (err) {
            console.error('[CV] Fatal error:', err);
            document.getElementById('cvStatus').textContent = '(Erro de conexão)';
            const boxModelEl = document.getElementById('cvBoxModel');
            const weightEl = document.getElementById('cvWeight');
            if (boxModelEl) boxModelEl.textContent = '--';
            if (weightEl) weightEl.textContent = '--';
          }
        }

        let cvBoxModel = null;
        let cvWeight = null;
        if (cfg.cv_enabled && roleSelect.value !== 'EMPILHADOR' && typeof cvRes !== 'undefined' && cvRes && cvRes.ok) {
          cvBoxModel = cvRes.box_model;
          cvWeight = cvRes.detected_weight;
        }

        const res = await window.api.scanSubmit({
          stationId,
          scannerId,
          role: roleSelect.value,
          rawBarcode,
          caliber: caliberDetected,
          cvBoxModel,
          cvWeight
        });

        if (res.ignored) {
          status.textContent = `Ignorado: leitura repetida da caixa (${rawBarcode})`;
        } else if (res.counted || res.ok) {
          // Note: if the backend only returned { ok: true } we still show counted.
          status.textContent = `Contado: ${rawBarcode}${res.employee?.name ? ` - ${res.employee.name}` : ''}`;
        } else {
          status.textContent = `Código não cadastrado: ${rawBarcode}`;
        }


        await refreshState();
      } catch (err) {
        status.textContent = `Erro na leitura: ${err.message}`;
      } finally {
        setTimeout(() => scanInput.focus(), 50);
      }
    });

    const btnFinalizeDay = must('btnFinalizeDay');
    btnFinalizeDay.onclick = async () => {
      const today = isoDateToday();
      if (!confirm(`Deseja FINALIZAR a produção do dia ${today}? Isso salvará um resumo permanente.`)) return;

      try {
        btnFinalizeDay.disabled = true;
        btnFinalizeDay.textContent = 'Salvando...';
        const res = await window.api.dailyFinalize({ stationId, date: today });
        if (res.ok) {
          alert(`Sucesso! ${res.count} registros resumidos para o dia ${today}.`);
        } else {
          alert(`Aviso: ${res.message}`);
        }
      } catch (err) {
        alert(`Erro ao finalizar dia: ${err.message}`);
      } finally {
        btnFinalizeDay.disabled = false;
        btnFinalizeDay.textContent = 'Finalizar Produção do Dia';
      }
    };

    const traceContext = $('traceContext');
    const ctxParcel = $('ctxParcel');
    const ctxFruit = $('ctxFruit');
    const ctxVariety = $('ctxVariety');

    async function setupTraceSelectors() {
      const cfg = await window.api.configGetAll();
      if (cfg.culture_type !== 'MELAO_MELANCIA') {
        return;
      }
      if (traceContext) traceContext.style.display = 'grid';

      const ctx = await window.api.contextGet({ stationId, role: roleSelect.value });
      const parcels = await window.api.parcelsList();

      ctxParcel.innerHTML = '<option value="">Parcela...</option>';
      parcels.filter(p => p.active).forEach(p => {
        const o = new Option(p.code, p.id);
        if (p.id == ctx.parcel_id) o.selected = true;
        ctxParcel.add(o);
      });

      async function updateFruits() {
        const pid = ctxParcel.value;
        ctxFruit.innerHTML = '<option value="">Fruta...</option>';
        ctxVariety.innerHTML = '<option value="">Variedade...</option>';
        if (!pid) return;
        const fruits = await window.api.parcelFruitsList({ parcelId: pid });
        fruits.forEach(f => {
          const o = new Option(f.name, f.id);
          if (f.id == ctx.fruit_id) o.selected = true;
          ctxFruit.add(o);
        });
        if (ctxFruit.value) await updateVarieties();
      }

      async function updateVarieties() {
        const pid = ctxParcel.value;
        const fid = ctxFruit.value;
        ctxVariety.innerHTML = '<option value="">Variedade...</option>';
        if (!pid || !fid) return;
        const varieties = await window.api.parcelVarietiesList({ parcelId: pid, fruitId: fid });
        varieties.forEach(v => {
          const o = new Option(v.name, v.id);
          if (v.id == ctx.variety_id) o.selected = true;
          ctxVariety.add(o);
        });
      }

      async function saveContext() {
        await window.api.contextSet({
          stationId,
          role: roleSelect.value,
          parcelId: ctxParcel.value || null,
          fruitId: ctxFruit.value || null,
          varietyId: ctxVariety.value || null
        });
        await refreshTotals();
      }

      ctxParcel.onchange = async () => { await updateFruits(); await saveContext(); };
      ctxFruit.onchange = async () => { await updateVarieties(); await saveContext(); };
      ctxVariety.onchange = async () => { await saveContext(); };

      await updateFruits();
    }

    await setupTraceSelectors();
    await refreshState();
    setTimeout(() => scanInput.focus(), 100);
  }

  async function initAdmin() {
    const cfg = await window.api.configGetAll();
    const isMelonMode = cfg.culture_type === 'MELAO_MELANCIA';

    const traceAdmin = $('traceAdmin');
    if (traceAdmin) traceAdmin.style.display = isMelonMode ? 'block' : 'none';

    const empBarcode = must('empBarcode');
    const empName = must('empName');
    const empRole = must('empRole');
    const empPhoto = must('empPhoto');
    const empAdd = must('empAdd');
    const empList = must('empList');

    const weightName = must('weightName');
    const weightKg = must('weightKg');
    const weightAdd = must('weightAdd');
    const weightList = must('weightList');

    const fruitName = must('fruitName');
    const fruitAdd = must('fruitAdd');
    const fruitList = must('fruitList');

    const varName = must('varName');
    const varAdd = must('varAdd');
    const varList = must('varList');

    const parcelCode = must('parcelCode');
    const parcelAdd = must('parcelAdd');
    const parcelList = must('parcelList');

    const linkParcel = must('linkParcel');
    const linkFruit = must('linkFruit');
    const linkVariety = must('linkVariety');
    const linkAdd = must('linkAdd');
    const linkList = must('linkList');

    const mapBarcode = must('mapBarcode');
    const mapEmployee = must('mapEmployee');
    const mapWeight = must('mapWeight');
    const mapAdd = must('mapAdd');
    const mapList = must('mapList');

    let employees = [];
    let weights = [];
    let fruits = [];
    let varieties = [];
    let parcels = [];

    let editingEmployeeId = null;
    let editingWeightId = null;

    function opt(sel, value, label) {
      const o = document.createElement('option');
      o.value = value;
      o.textContent = label;
      sel.appendChild(o);
    }

    function resetEmployeeForm() {
      editingEmployeeId = null;
      empBarcode.value = '';
      empName.value = '';
      empRole.value = 'EMBALADOR';
      empPhoto.value = '';
      empAdd.textContent = 'Adicionar';
    }

    function resetWeightForm() {
      editingWeightId = null;
      weightName.value = '';
      weightKg.value = '';
      weightAdd.textContent = 'Adicionar';
    }

    function ensurePhotoPicker() {
      if ($('empPickPhoto')) return;
      const btn = document.createElement('button');
      btn.id = 'empPickPhoto';
      btn.type = 'button';
      btn.textContent = 'Buscar foto';
      empPhoto.parentElement.appendChild(btn);
      btn.addEventListener('click', async () => {
        const res = await window.api.pickImage();
        if (res?.ok && res.path) empPhoto.value = res.path;
      });
    }

    async function refresh() {
      [employees, weights, fruits, varieties, parcels] = await Promise.all([
        window.api.employeesList(),
        window.api.boxWeightsList(),
        window.api.fruitsList(),
        window.api.varietiesList(),
        window.api.parcelsList()
      ]);

      empList.innerHTML = employees
        .filter(e => e.role === 'EMBALADOR' || e.role === 'EMPILHADOR')
        .map(e => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <div style="display:flex;align-items:center;gap:10px;min-width:0;">
            <div style="${photoStyle(e.photo_path, 40)}"></div>
            <div style="min-width:0;">
              <div><strong>${esc(e.name)}</strong> ${statusPill(Number(e.active) === 1)}</div>
              <div class="muted">${esc(e.role)} • ${esc(e.barcode)}</div>
            </div>
          </div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="empEdit" data-id="${e.id}">Editar</button>
            <button type="button" class="empToggle" data-id="${e.id}">${Number(e.active) === 1 ? 'Desativar' : 'Ativar'}</button>
          </div>
        </div>
      `).join('') || '<div class="muted">Nenhum funcionário (Embalador/Empilhador).</div>';

      weightList.innerHTML = weights.map(w => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <div><strong>${esc(w.name)}</strong> (${w.weight_kg}kg) ${statusPill(Number(w.active) === 1)}</div>
          <div style="display:flex;gap:6px;">
            <button type="button" class="weightEdit" data-id="${w.id}">Editar</button>
            <button type="button" class="weightToggle" data-id="${w.id}">${Number(w.active) === 1 ? 'Desativar' : 'Ativar'}</button>
          </div>
        </div>
      `).join('') || '<div class="muted">Nenhum peso.</div>';

      fruitList.innerHTML = fruits.map(f => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <span>${esc(f.name)} ${statusPill(f.active)}</span>
          <button type="button" class="fruitDel" data-id="${f.id}" style="padding:2px 6px">×</button>
        </div>
      `).join('');

      varList.innerHTML = varieties.map(v => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <span>${esc(v.name)} ${statusPill(v.active)}</span>
          <button type="button" class="varDel" data-id="${v.id}" style="padding:2px 6px">×</button>
        </div>
      `).join('');

      parcelList.innerHTML = parcels.map(p => `
        <div style="display:flex;justify-content:space-between;padding:4px 0;">
          <span><strong>${esc(p.code)}</strong> ${statusPill(p.active)}</span>
          <button type="button" class="parcelDel" data-id="${p.id}" style="padding:2px 6px">×</button>
        </div>
      `).join('');

      // Link dropdowns
      linkParcel.innerHTML = '<option value="">Selecione Parcela</option>';
      parcels.filter(p => p.active).forEach(p => opt(linkParcel, p.id, p.code));
      linkFruit.innerHTML = '<option value="">Selecione Fruta</option>';
      fruits.filter(f => f.active).forEach(f => opt(linkFruit, f.id, f.name));
      linkVariety.innerHTML = '<option value="">Selecione Variedade</option>';
      varieties.filter(v => v.active).forEach(v => opt(linkVariety, v.id, v.name));

      mapEmployee.innerHTML = '';
      employees.filter(e => e.active == 1 && (e.role === 'EMBALADOR' || e.role === 'EMPILHADOR')).forEach(e => opt(mapEmployee, e.id, `${e.name} (${e.role})`));
      mapWeight.innerHTML = '';
      weights.filter(w => w.active == 1).forEach(w => opt(mapWeight, w.id, w.name));

      await refreshMappings();
      await refreshLinks();
      attachRowEvents();
    }

    async function refreshLinks() {
      if (!isMelonMode) return;
      const pid = linkParcel.value;
      if (!pid) {
        linkList.innerHTML = '<div class="muted">Selecione uma parcela para ver os vínculos.</div>';
        return;
      }
      const links = await window.api.parcelPairsList({ parcelId: pid });
      linkList.innerHTML = links.map(l => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:rgba(255,255,255,0.03);margin-bottom:4px;border-radius:6px;">
          <span>${esc(l.fruitName)} &rarr; <strong>${esc(l.varietyName)}</strong></span>
          <button type="button" class="linkDel" data-f="${l.fruitId}" data-v="${l.varietyId}">Remover</button>
        </div>
      `).join('') || '<div class="muted">Nenhum vínculo para esta parcela.</div>';

      linkList.querySelectorAll('.linkDel').forEach(btn => {
        btn.onclick = async () => {
          await window.api.parcelPairsRemove({ parcelId: pid, fruitId: btn.dataset.f, varietyId: btn.dataset.v });
          await refreshLinks();
        };
      });
    }

    linkParcel.onchange = refreshLinks;

    async function refreshMappings() {
      const mappings = await window.api.barcodeMappingsList();
      mapList.innerHTML = mappings.map(m => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);">
          <div>
            <code style="background:rgba(255,255,255,.1);padding:2px 6px;border-radius:4px;">${esc(m.barcode)}</code> &rarr; 
            <strong>${esc(m.employeeName)}</strong> (${esc(m.weightName)})
          </div>
          <button type="button" class="mapDelete" data-barcode="${esc(m.barcode)}">Remover</button>
        </div>
      `).join('') || '<div class="muted">Nenhum mapeamento.</div>';

      mapList.querySelectorAll('.mapDelete').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('Remover este mapeamento?')) {
            await window.api.barcodeMappingsDelete({ barcode: btn.dataset.barcode });
            await refreshMappings();
          }
        };
      });
    }

    function attachRowEvents() {
      empList.querySelectorAll('.empEdit').forEach(btn => {
        btn.onclick = () => {
          const e = employees.find(x => x.id == btn.dataset.id);
          if (!e) return;
          editingEmployeeId = e.id;
          empBarcode.value = e.barcode;
          empName.value = e.name;
          empRole.value = e.role;
          empPhoto.value = e.photo_path || '';
          empAdd.textContent = 'Salvar';
        };
      });

      empList.querySelectorAll('.empToggle').forEach(btn => {
        btn.onclick = async () => {
          const e = employees.find(x => x.id == btn.dataset.id);
          if (!e) return;
          if (e.active == 1) await window.api.employeesDelete({ id: e.id });
          else await window.api.employeesUpdate({ ...e, active: 1 });
          await refresh();
        };
      });

      weightList.querySelectorAll('.weightEdit').forEach(btn => {
        btn.onclick = () => {
          const w = weights.find(x => x.id == btn.dataset.id);
          if (!w) return;
          editingWeightId = w.id;
          weightName.value = w.name;
          weightKg.value = w.weight_kg;
          weightAdd.textContent = 'Salvar';
        };
      });

      weightList.querySelectorAll('.weightToggle').forEach(btn => {
        btn.onclick = async () => {
          const w = weights.find(x => x.id == btn.dataset.id);
          if (!w) return;
          if (w.active == 1) await window.api.boxWeightsDelete({ id: w.id });
          else await window.api.boxWeightsUpdate({ ...w, active: 1 });
          await refresh();
        };
      });

      fruitList.querySelectorAll('.fruitDel').forEach(btn => {
        btn.onclick = async () => { if (confirm('Excluir fruta?')) { await window.api.fruitsDelete({ id: btn.dataset.id }); refresh(); } };
      });
      varList.querySelectorAll('.varDel').forEach(btn => {
        btn.onclick = async () => { if (confirm('Excluir variedade?')) { await window.api.varietiesDelete({ id: btn.dataset.id }); refresh(); } };
      });
      parcelList.querySelectorAll('.parcelDel').forEach(btn => {
        btn.onclick = async () => { if (confirm('Excluir parcela?')) { await window.api.parcelsDelete({ id: btn.dataset.id }); refresh(); } };
      });
    }

    fruitAdd.onclick = async () => {
      const name = fruitName.value.trim();
      if (!name) return;
      await window.api.fruitsAdd({ name });
      fruitName.value = '';
      await refresh();
    };

    varAdd.onclick = async () => {
      const name = varName.value.trim();
      if (!name) return;
      await window.api.varietiesAdd({ name });
      varName.value = '';
      await refresh();
    };

    parcelAdd.onclick = async () => {
      const code = parcelCode.value.trim();
      if (!code) return;
      await window.api.parcelsAdd({ code });
      parcelCode.value = '';
      await refresh();
    };

    linkAdd.onclick = async () => {
      const p = linkParcel.value;
      const f = linkFruit.value;
      const v = linkVariety.value;
      if (!p || !f || !v) return alert('Selecione os 3 campos para vincular.');
      await window.api.parcelPairsAdd({ parcelId: p, fruitId: f, varietyId: v });
      await refreshLinks();
    };

    const metaPacker = must('metaPacker');
    const metaStacker = must('metaStacker');
    const valPacker = must('valPacker');
    const valStacker = must('valStacker');
    const metaSave = must('metaSave');

    metaPacker.value = cfg.target_per_hour_packer || '50';
    metaStacker.value = cfg.target_per_hour_stacker || '200';
    valPacker.value = cfg.value_per_box_packer || '0.50';
    valStacker.value = cfg.value_per_box_stacker || '0.15';

    metaSave.onclick = async () => {
      try {
        await window.api.configSet({
          target_per_hour_packer: metaPacker.value,
          target_per_hour_stacker: metaStacker.value,
          value_per_box_packer: valPacker.value,
          value_per_box_stacker: valStacker.value
        });
        alert('Metas salvas com sucesso!');

      } catch (err) {
        alert('Erro ao salvar metas: ' + err.message);
      }
    };

    empAdd.onclick = async () => {
      const payload = {
        barcode: empBarcode.value.trim(),
        name: empName.value.trim(),
        role: empRole.value,
        photo_path: empPhoto.value.trim() || null
      };
      if (!payload.barcode || !payload.name) return alert('Nome e Barcode são obrigatórios.');
      if (editingEmployeeId) await window.api.employeesUpdate({ id: editingEmployeeId, ...payload, active: 1 });
      else await window.api.employeesAdd(payload);
      resetEmployeeForm();
      await refresh();
    };

    weightAdd.onclick = async () => {
      const payload = {
        name: weightName.value.trim(),
        weight_kg: Number(weightKg.value || 0)
      };
      if (!payload.name) return alert('Nome do peso é obrigatório.');
      if (editingWeightId) await window.api.boxWeightsUpdate({ id: editingWeightId, ...payload, active: 1 });
      else await window.api.boxWeightsAdd(payload);
      resetWeightForm();
      await refresh();
    };

    mapAdd.onclick = async () => {
      const payload = {
        barcode: mapBarcode.value.trim(),
        employeeId: mapEmployee.value,
        weightId: mapWeight.value
      };
      if (!payload.barcode || !payload.employeeId || !payload.weightId) return alert('Preencha os campos de mapeamento.');
      await window.api.barcodeMappingsAdd(payload);
      mapBarcode.value = '';
      await refreshMappings();
    };

    const syncNow = must('syncNow');
    syncNow.onclick = async () => {
      syncNow.disabled = true;
      syncNow.textContent = 'Sincronizando...';
      try {
        const res = await window.api.syncNow();
        if (res.ok) alert('Sincronização concluída com sucesso!');
        else alert('Falha na sincronização.');
      } catch (err) {
        alert('Erro: ' + err.message);
      } finally {
        syncNow.disabled = false;
        syncNow.textContent = 'Sincronizar Nuvem (Manual)';
      }
    };

    ensurePhotoPicker();
    await refresh();
  }

  async function initFinanceiro() {
    const finRole = must('finRole');
    const finStart = must('finStart');
    const finEnd = must('finEnd');
    const finCalc = must('finCalc');
    const finOut = must('finOut');

    const finKpiTotal = must('finKpiTotal');
    const finKpiBoxes = must('finKpiBoxes');
    const finKpiHourly = must('finKpiHourly');
    const finKpiAvgBox = must('finKpiAvgBox');

    let finHourlyChart = null;
    let finCollabChart = null;

    finStart.value = isoDateToday();
    finEnd.value = isoDateToday();

    async function refresh() {
      const startMs = startOfDayMs(finStart.value);
      const endMs = endOfDayMs(finEnd.value);
      const role = finRole.value;

      const [out, cfg, allLogs] = await Promise.all([
        window.api.financePreview({ startMs, endMs, role }),
        window.api.configGetAll(),
        window.api.logsList({ startMs, endMs, role, limit: 1000 })
      ]);

      const valuePerBox = Number(cfg[role === 'EMPILHADOR' ? 'value_per_box_stacker' : 'value_per_box_packer'] || 0);

      if (!out.items?.length) {
        finOut.innerHTML = '<div class="muted">Sem dados no período.</div>';
        finKpiTotal.textContent = 'R$ 0,00';
        finKpiBoxes.textContent = '0';
        finKpiHourly.textContent = 'R$ 0,00';
        finKpiAvgBox.textContent = 'R$ 0,00';
        return;
      }

      const totalBoxes = out.items.reduce((s, x) => s + Number(x.boxes || 0), 0);
      const totalValue = out.items.reduce((s, x) => s + Number(x.totalValue || 0), 0);
      const hoursActive = Math.max(1, Math.round((endMs - startMs) / 3600000));

      finKpiTotal.textContent = moneyBRL(totalValue);
      finKpiBoxes.textContent = totalBoxes;
      finKpiHourly.textContent = moneyBRL(totalValue / 24); // Simpler hourly cost visualization
      finKpiAvgBox.textContent = moneyBRL(totalBoxes > 0 ? totalValue / totalBoxes : 0);

      // Hourly Cost Breakdown
      const hourlyCosts = {};
      allLogs.forEach(l => {
        const h = new Date(l.ts).getHours();
        hourlyCosts[h] = (hourlyCosts[h] || 0) + valuePerBox;
      });
      const hLabels = Object.keys(hourlyCosts).sort((a, b) => a - b).map(h => `${h}h`);
      const hData = Object.keys(hourlyCosts).sort((a, b) => a - b).map(h => hourlyCosts[h]);

      // Charts
      if (typeof Chart !== 'undefined') {
        const canvasH = document.getElementById('chartFinanceHourly');
        if (canvasH) {
          if (finHourlyChart) finHourlyChart.destroy();
          finHourlyChart = new Chart(canvasH.getContext('2d'), {
            type: 'line',
            data: {
              labels: hLabels,
              datasets: [{
                label: 'Custo R$',
                data: hData,
                borderColor: '#00FFB8',
                backgroundColor: 'rgba(0, 255, 184, 0.1)',
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              scales: { y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, x: { grid: { display: false } } },
              plugins: { legend: { display: false } }
            }
          });
        }

        const canvasC = document.getElementById('chartFinanceCollab');
        if (canvasC) {
          if (finCollabChart) finCollabChart.destroy();
          finCollabChart = new Chart(canvasC.getContext('2d'), {
            type: 'bar',
            data: {
              labels: out.items.map(i => i.name),
              datasets: [{
                label: 'Total R$',
                data: out.items.map(i => i.totalValue),
                backgroundColor: '#2ECC71',
                borderRadius: 6
              }]
            },
            options: {
              responsive: true, maintainAspectRatio: false,
              indexAxis: 'y',
              scales: { x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } }, y: { grid: { display: false } } },
              plugins: { legend: { display: false } }
            }
          });
        }
      }

      finOut.innerHTML = out.items.map(i => `
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;border-bottom:1px solid rgba(46,204,113,0.1); background: rgba(5, 13, 26, 0.4); border-radius: 12px; margin-bottom: 8px;">
          <div style="display:flex;gap:12px;align-items:center;min-width:0;">
            <div style="${photoStyle(i.photoPath, 44)}"></div>
            <div>
              <div style="font-weight:700; color:var(--text);">${esc(i.name)}</div>
              <div class="muted" style="font-size:11px;">${i.boxes} caixas • Meta: ${i.avgProd}%</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px; font-weight:800; color:var(--green-neon);">${moneyBRL(i.totalValue)}</div>
            <div class="muted" style="font-size:10px;">Bruto: ${moneyBRL(i.grossValue)} | Bônus: ${moneyBRL(i.bonusValue)}</div>
          </div>
        </div>
      `).join('');
    }

    finCalc.onclick = refresh;
    await refresh();
  }

  async function initDashboards() {
    const kpiTotalDia = must('kpiTotalDia');
    const kpiTotalKg = must('kpiTotalKg');
    const kpiMediaHora = must('kpiMediaHora');
    const kpiEficiencia = must('kpiEficiencia');
    const liveFeed = must('liveFeed');
    const logStart = must('logStart');
    const logEnd = must('logEnd');
    const logLoad = must('logLoad');
    const logOut = must('logOut');
    const dashStart = must('dashStart');
    const dashEnd = must('dashEnd');
    const dashRefresh = must('dashRefresh');

    let prodChart = null;
    let weightChart = null;
    let collabChart = null;
    let compChart = null;
    let qualityChart = null;


    dashStart.value = isoDateToday();
    dashEnd.value = isoDateToday();
    logStart.value = isoDateToday();
    logEnd.value = isoDateToday();

    const dashEmployee = document.getElementById('dashEmployee');
    if (dashEmployee) {
      try {
        const employees = await window.api.employeesList();
        employees.forEach(e => {
        if (Number(e.active) !== 1) return;
        if (e.role !== 'EMBALADOR' && e.role !== 'EMPILHADOR') return;
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.name} (${e.role})`;
        dashEmployee.appendChild(opt);
      });
      } catch (err) {
        console.error('Erro ao listar funcionários', err);
      }

      dashEmployee.addEventListener('change', async () => {
        await refresh();
      });
    }

    async function refresh() {
      const sMs = startOfDayMs(dashStart.value);
      const eMs = endOfDayMs(dashEnd.value);
      const todaySMs = startOfDayMs(isoDateToday());
      const todayEMs = endOfDayMs(isoDateToday());

      const dashEmployee = document.getElementById('dashEmployee');
      const empId = dashEmployee ? dashEmployee.value : '';

      const [logs, stats, dsStats, cfg] = await Promise.all([
        window.api.logsList({ stationId, startMs: todaySMs, endMs: todayEMs, limit: 10000 }),
        window.api.totalsNow({ stationId, role: roleSelect.value }),
        window.api.dashboardsGetStats({ stationId, startMs: sMs, endMs: eMs, employeeId: empId || null }),
        window.api.contextGet({ stationId, role: roleSelect.value }),
        window.api.configGetAll()
      ]);

      const isMelonMode = cfg.culture_type === 'MELAO_MELANCIA';
      const parcelCard = document.getElementById('parcelStatsCard');

      if (isMelonMode && parcelCard) {
        parcelCard.style.display = 'block';
        const pList = document.getElementById('parcelStatsList');
        if (pList) {
          if (dsStats.parcelStats && dsStats.parcelStats.length > 0) {
            pList.innerHTML = dsStats.parcelStats.map(p => `
              <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 12px; border: 1px solid rgba(46, 204, 113, 0.1);">
                <div style="font-size: 11px; text-transform: uppercase; color: var(--green); margin-bottom: 8px;">${esc(p.label)}</div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                  <div>
                    <div style="font-size: 24px; font-weight: 800;">${p.boxes} <span style="font-size: 12px; font-weight: 400; color: var(--muted);">caixas</span></div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 18px; font-weight: 700; color: var(--green-neon);">${(p.kg / 1000).toFixed(3)} <span style="font-size: 10px; font-weight: 400; color: var(--muted);">t</span></div>
                  </div>
                </div>
              </div>
            `).join('');
          } else {
            pList.innerHTML = '<div class="muted" style="grid-column: 1 / -1; padding: 20px;">Nenhuma produção por parcela registrada no período selecionado.</div>';
          }
        }
      } else if (parcelCard) {
        parcelCard.style.display = 'none';
      }

      // 1. KPIs
      must('kpiTotalDia').textContent = dsStats.totalBoxes || 0;
      must('kpiTotalKg').textContent = dsStats.totalKg || 0;
      must('kpiMediaHora').textContent = dsStats.avgPerHour || 0;

      const kpiCadencia = document.getElementById('kpiCadencia');
      if (kpiCadencia) {
        if (empId && dsStats.avgScanGapSec > 0) {
          kpiCadencia.textContent = `${dsStats.avgScanGapSec}s`;
          kpiCadencia.style.color = dsStats.avgScanGapSec < 20 ? 'var(--green)' : 'var(--yellow)';
        } else {
          kpiCadencia.textContent = '--';
          kpiCadencia.style.color = 'var(--muted)';
        }
      }

      // Consistência Packer vs Stacker
      const kpiCons = document.getElementById('kpiConsistencia');
      const kpiConsDif = document.getElementById('kpiConsistenciaDif');
      const cardCons = document.getElementById('cardConsistencia');
      if (kpiCons && kpiConsDif) {
        const p = dsStats.packerTotal || 0;
        const s = dsStats.stackerTotal || 0;
        const diff = Math.abs(p - s);
        const ratio = p > 0 ? Math.round((s / p) * 100) : 100;

        kpiCons.textContent = `${ratio}%`;
        kpiConsDif.textContent = diff;

        if (diff > 10) {
          kpiCons.style.color = 'var(--red)';
          if (cardCons) cardCons.style.borderColor = 'var(--red)';
        } else {
          kpiCons.style.color = 'var(--green)';
          if (cardCons) cardCons.style.borderColor = 'rgba(46, 204, 113, 0.1)';
        }
      }


      // 2. Feed
      liveFeed.innerHTML = logs.slice(0, 5).map(l => `
        <div class="feedItem">
          <div style="${photoStyle(l.photoPath, 34)}"></div>
          <div style="flex:1">
            <div style="font-weight:600; font-size:13px;">${esc(l.employeeName)}</div>
            <div class="muted" style="font-size:11px;">${new Date(l.ts).toLocaleTimeString()} • ${esc(l.weightLabel || 'SEM PESO')}</div>
          </div>
          <div style="font-size:11px; opacity:0.5;">#${l.id}</div>
        </div>
      `).join('') || '<div class="muted">Nenhuma atividade hoje.</div>';

      // 3. Charts
      updateCharts(logs, stats, dsStats);
    }

    function updateCharts(logs, stats, dsStats) {
      if (typeof Chart === 'undefined') return;

      // Hourly Production
      const hours = {};
      const currentHour = new Date().getHours();
      for (let i = 7; i >= 0; i--) {
        const h = (currentHour - i + 24) % 24;
        hours[h] = 0;
      }
      logs.forEach(l => {
        const h = new Date(l.ts).getHours();
        if (hours[h] !== undefined) hours[h]++;
      });

      const labels = Object.keys(hours).map(h => `${h}h`);
      const data = Object.values(hours);

      if (!prodChart) {
        const canvas = document.getElementById('chartProdHora');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 250);
        grad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        grad.addColorStop(1, 'rgba(59, 130, 246, 0)');

        prodChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              label: 'Caixas',
              data,
              borderColor: '#3b82f6',
              backgroundColor: grad,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: '#3b82f6',
              borderWidth: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 10 } }
              },
              x: {
                grid: { display: false },
                ticks: { color: '#64748b', font: { size: 10 } }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f8fafc',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 10,
                displayColors: false
              }
            }
          }
        });
      } else {
        prodChart.data.labels = labels;
        prodChart.data.datasets[0].data = data;
        prodChart.update();
      }

      // Detailed Lists Rendering
      const boxList = document.getElementById('boxWeightDetailList');
      if (boxList) {
        boxList.innerHTML = dsStats.boxTypeStats.map(w => `
          <div style="display:flex; justify-content:space-between; align-items:center; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
            <div style="display:flex; align-items:center; gap:8px;"><i data-lucide="box" style="width:20px;height:20px;color:var(--blue)"></i> <strong style="font-size:14px;">${esc(w.label)}</strong></div>
            <div style="text-align:right;"><strong style="color:var(--green); font-size:16px;">${w.boxes}</strong> <span class="muted" style="font-size:12px;">cx</span> <div class="muted" style="font-size:10px;">${w.kg ? w.kg.toFixed(1) : 0} kg</div></div>
          </div>
        `).join('') || '<div class="muted">Sem dados de caixas.</div>';
      }

      const collabList = document.getElementById('collabDetailList');
      if (collabList) {
        const sortedCollabs = [...dsStats.collaboratorStats].sort((a, b) => b.boxes - a.boxes);
        collabList.innerHTML = sortedCollabs.map((c, i) => `
          <div style="display:flex; gap:12px; align-items:center; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2);">
            <div style="font-size: 16px; font-weight:800; color: rgba(255,255,255,0.2); width: 20px;">#${i + 1}</div>
            <div style="${photoStyle(c.photoPath, 42)}"></div>
            <div style="flex:1; min-width:0;">
              <div style="font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(c.name)}</div>
              <div style="margin-top:2px;"><span class="badge ${c.role.toLowerCase()}" style="font-size:10px; padding:2px 4px;">${c.role}</span></div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:16px; font-weight:800; color:var(--green)">${c.boxes} <span class="muted" style="font-size:11px; font-weight:400;">cx</span></div>
              <div style="font-size:10px; font-weight:600; color:${colorByPct(c.yieldPct)}; margin-top:2px;">Meta: ${c.yieldPct}%</div>
            </div>
          </div>
        `).join('') || '<div class="muted">Nenhum colaborador registrado no período.</div>';
      }

      // Weight Distribution
      const wLabels = dsStats.boxTypeStats.map(w => w.label);
      const wData = dsStats.boxTypeStats.map(w => w.boxes);
      if (!weightChart) {
        const canvas = document.getElementById('chartWeightDist');
        if (!canvas) return;
        weightChart = new Chart(canvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: wLabels,
            datasets: [{
              data: wData,
              backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
              borderWidth: 2,
              borderColor: '#0f172a',
              hoverOffset: 15
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: '#94a3b8', font: { size: 11 }, padding: 20, usePointStyle: true, pointStyle: 'circle' }
              },
              tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                cornerRadius: 8
              }
            },
            cutout: '75%'
          }
        });
      } else {
        weightChart.data.labels = wLabels;
        weightChart.data.datasets[0].data = wData;
        weightChart.update();
      }

      // Collaborator Performance
      const cLabels = dsStats.collaboratorStats.map(c => `${c.name} (${c.yieldPct}%)`);
      const cData = dsStats.collaboratorStats.map(c => c.boxes);
      if (!collabChart) {
        const canvas = document.getElementById('chartCollab');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 400, 0);
        grad.addColorStop(0, '#3b82f6');
        grad.addColorStop(1, '#6366f1');

        collabChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: cLabels,
            datasets: [{
              label: 'Caixas',
              data: cData,
              backgroundColor: grad,
              borderRadius: 8,
              borderSkipped: false,
              barThickness: 20
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
              x: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 10 } }
              },
              y: {
                grid: { display: false },
                ticks: { color: '#f8fafc', font: { size: 11, weight: '500' } }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1e293b',
                padding: 10
              }
            }
          }
        });
      } else {
        collabChart.data.labels = cLabels;
        collabChart.data.datasets[0].data = cData;
        collabChart.update();
      }


      // Quality Distribution
      if (dsStats.qualityBreakdown) {
        updateQualityChart(dsStats);
      }


      // Comparison
      if (!compChart) {
        const canvas = document.getElementById('chartComparison');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        compChart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: ['Anterior', 'Atual'],
            datasets: [{
              data: [dsStats.comparison.previous, dsStats.comparison.current],
              backgroundColor: ['rgba(255,255,255,0.05)', '#3b82f6'],
              borderRadius: 10,
              barThickness: 40
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.05)', drawBorder: false },
                ticks: { color: '#64748b' }
              },
              x: { grid: { display: false }, ticks: { color: '#f8fafc', font: { weight: '600' } } }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: '#1e293b',
                padding: 12
              }
            }
          }
        });
      } else {
        compChart.data.datasets[0].data = [dsStats.comparison.previous, dsStats.comparison.current];
        compChart.update();
      }

      // Hourly Employee Comparison (Stacked Bar)
      if (!window.collabHourChart) {
        const canvas = document.getElementById('chartCollabHour');
        if (!canvas) return;
        window.collabHourChart = new Chart(canvas.getContext('2d'), {
          type: 'bar',
          data: { labels: [], datasets: [] },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { stacked: true, grid: { display: false }, ticks: { color: '#64748b' } },
              y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } }
            },
            plugins: {
              legend: { position: 'top', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true } },
              tooltip: { backgroundColor: '#1e293b', padding: 12 }
            }
          }
        });
      }

      const hData = dsStats.hourlyCollab;
      const allHours = [...new Set(hData.map(d => d.hr))].sort();
      const employees = [...new Set(hData.map(d => d.name))];
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f472b6', '#a855f7'];

      window.collabHourChart.data.labels = allHours.map(h => `${h}h`);
      window.collabHourChart.data.datasets = employees.map((name, idx) => ({
        label: name,
        data: allHours.map(h => {
          const found = hData.find(d => d.name === name && d.hr === h);
          return found ? found.boxes : 0;
        }),
        backgroundColor: colors[idx % colors.length],
        borderRadius: 4
      }));
      window.collabHourChart.update();
    }

    let qualityChartVar = null; // Local reference if top-level is tricky

    function updateQualityChart(dsStats) {
      const qLabels = dsStats.qualityBreakdown.map(q => q.label);
      const qData = dsStats.qualityBreakdown.map(q => q.count);

      const qListEl = document.getElementById('qualityIssueList');
      if (qListEl) {
        qListEl.innerHTML = dsStats.qualityBreakdown.map(q => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 8px; background: rgba(255,255,255,0.03); border-radius: 4px;">
            <span>${esc(q.label)}</span>
            <span style="font-weight:700; color:var(--red)">${q.count}</span>
          </div>
        `).join('') || '<div class="muted">Nenhuma falha registrada.</div>';
      }

      const qLeadersEl = document.getElementById('qualityPenaltyLeaders');
      if (qLeadersEl) {
        qLeadersEl.innerHTML = dsStats.qualityWorstPerformers.map(q => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding: 4px 8px; background: rgba(255,100,100,0.05); border-radius: 4px;">
            <span>${esc(q.name)}</span>
            <span style="font-weight:700; color:var(--red)">-${q.penalty_count} cx</span>
          </div>
        `).join('') || '<div class="muted">Sem penalidades registradas.</div>';
      }

      const canvas = document.getElementById('chartQualityDist');
      if (!canvas) return;

      if (!qualityChart) {
        qualityChart = new Chart(canvas.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: qLabels,
            datasets: [{
              data: qData,
              backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'],
              borderWidth: 0,
              hoverOffset: 10
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, pointStyle: 'circle' }
              }
            },
            cutout: '70%'
          }
        });
      } else {
        qualityChart.data.labels = qLabels;
        qualityChart.data.datasets[0].data = qData;
        qualityChart.update();
      }

    }

    logLoad.onclick = async () => {
      const sMs = startOfDayMs(logStart.value);
      const eMs = endOfDayMs(logEnd.value);
      const entries = await window.api.logsList({ stationId, startMs: sMs, endMs: eMs, limit: 5000 });
      logOut.innerHTML = entries.map(l => `
        <div style="display:flex; gap:15px; padding:8px; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
          <span class="muted" style="width:70px">${new Date(l.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span style="flex:1; font-weight:600">${esc(l.employeeName)}</span>
          <span style="width:100px">${esc(l.weightLabel || '-')}</span>
          <span class="muted" style="width:100px; text-align:right">${esc(l.rawBarcode)}</span>
        </div>
      `).join('') || '<div class="muted">Nenhum registro.</div>';
    };

    dashRefresh.onclick = async () => {
      await refresh();
    };

    const dashFinalize = must('dashFinalize');
    dashFinalize.onclick = async () => {
      if (!confirm(`Deseja FINALIZAR a produção do dia ${dashStart.value}? Isso salvará um resumo permanente.`)) return;

      try {
        dashFinalize.disabled = true;
        dashFinalize.textContent = 'Salvando e Enviando...';

        const res = await window.api.dailyFinalize({ stationId, date: dashStart.value });

        if (res.ok) {
          alert(`Sucesso! ${res.count} registros salvos.\nWhatsApp: ${res.waSent || 0} mensagens enviadas.`);
        } else {
          alert(`Aviso: ${res.message}`);
        }
      } catch (err) {
        alert(`Erro ao finalizar dia: ${err.message}`);
      } finally {
        dashFinalize.disabled = false;
        dashFinalize.textContent = 'Finalizar Dia';
      }
    };

    await refresh();

    const interval = setInterval(async () => {
      const el = document.getElementById('kpiTotalDia');
      if (!el) {
        clearInterval(interval);
        return;
      }
      await refresh();
    }, 15000);
  }

  async function initConfig() {
    const cfgTenant = must('cfgTenant');
    const cfgLogo = must('cfgLogo');
    const cfgTheme = must('cfgTheme');
    const cfgSupaUrl = must('cfgSupaUrl');
    const cfgSupaKey = must('cfgSupaKey');
    const cfgTenantId = must('cfgTenantId');
    const cfgSyncNow = must('cfgSyncNow');
    const cfgSave = must('cfgSave');
    const cfgStatus = must('cfgStatus');
    const cfgTerminalMode = must('cfgTerminalMode');
    const cfgAdminPass = must('cfgAdminPass');
    const cfgCultureType = must('cfgCultureType');
    const cfgCvEnabled = must('cfgCvEnabled');


    // Targets moved to Admin Tab

    if (!$('cfgLogoPick')) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'cfgLogoPick';
      btn.textContent = 'Buscar logo';
      cfgLogo.parentElement.appendChild(btn);

      btn.addEventListener('click', async () => {
        if (!hasApi('pickImage')) {
          alert('O seletor de logo ainda não foi exposto no preload/main. Informe o caminho manualmente.');
          return;
        }
        const res = await window.api.pickImage();
        if (res?.ok && res.path) cfgLogo.value = res.path;
      });
    }

    // Extra references moved to Admin Tab

    async function load() {
      const cfg = await window.api.configGetAll();

      cfgTenant.value = cfg.tenant_name || '';
      cfgLogo.value = cfg.tenant_logo_path || '';
      cfgTheme.value = cfg.theme || 'dark';
      cfgSupaUrl.value = cfg.supabase_url || '';
      cfgSupaKey.value = cfg.supabase_key || '';
      cfgTenantId.value = cfg.tenant_id || '';
      cfgTerminalMode.value = cfg.terminal_mode || 'full';
      cfgAdminPass.value = cfg.admin_password || '';
      cfgCultureType.value = cfg.culture_type || 'MAMAO';
      cfgCvEnabled.checked = !!cfg.cv_enabled;
    }


    cfgSave.onclick = async () => {
      await window.api.configSet({
        tenant_name: cfgTenant.value.trim(),
        tenant_logo_path: cfgLogo.value.trim(),
        theme: cfgTheme.value,
        supabase_url: cfgSupaUrl.value.trim(),
        supabase_key: cfgSupaKey.value.trim(),
        tenant_id: cfgTenantId.value.trim(),
        terminal_mode: cfgTerminalMode.value,
        admin_password: cfgAdminPass.value.trim(),
        culture_type: cfgCultureType.value,
        cv_enabled: cfgCvEnabled.checked
      });


      cfgStatus.textContent = 'Configurações salvas.';
      await load();
      await initShell();
      location.reload(); // Reload for terminal mode to take full effect reliably
    };

    cfgSyncNow.onclick = async () => {
      try {
        cfgStatus.textContent = 'Sincronizando...';
        const res = await window.api.syncNow();
        if (res.ok) cfgStatus.textContent = 'Sincronização concluída.';
        else cfgStatus.textContent = 'Erro na sincronização.';
      } catch (err) {
        cfgStatus.textContent = `Erro: ${err.message}`;
      }
    };

    const btnResetLocalDb = document.getElementById('btnResetLocalDb');
    if (btnResetLocalDb) {
      btnResetLocalDb.onclick = async () => {
        if (!confirm('ATENÇÃO: Isso apagará TODOS os dados locais (funcionários, parcelas, produção). Continuar?')) return;

        try {
          cfgStatus.textContent = 'Limpando banco local...';
          const res = await window.api.dbReset();
          if (res.ok) {
            alert('Banco local zerado com sucesso! O aplicativo será reiniciado para baixar os dados da nuvem.');
            location.reload();
          } else {
            cfgStatus.textContent = `Erro ao limpar: ${res.error}`;
          }
        } catch (err) {
          cfgStatus.textContent = `Erro: ${err.message}`;
        }
      };
    }

    const btnConfigLogout = document.getElementById('btnConfigLogout');
    if (btnConfigLogout) {
      btnConfigLogout.onclick = async (ev) => {
        ev.preventDefault();
        if (!confirm('Deseja realmente sair da conta?')) return;
        console.log('Auth: Logging out from config tab...');
        await window.api.configSet({ auth_token: null, auth_refresh_token: null });
        window.location.reload();
      };
    }

    await load();
  }

  async function route() {
    const r = currentRoute().replace('/', '');
    const cfg = await window.api.configGetAll();
    const isProtected = ['admin', 'financeiro', 'dashboards', 'config'].includes(r);

    if (cfg.terminal_mode === 'kiosk' && !isAdminUnlocked && isProtected) {
      routeTo('/painel');
      return;
    }

    setActiveMenu(currentRoute());

    if (r === 'inicio') {
      renderTemplate('tpl-inicio');
      return;
    }

    if (r === 'painel') {
      renderTemplate('tpl-painel');
      await initPainel();
      return;
    }

    if (r === 'admin') {
      renderTemplate('tpl-admin');
      await initAdmin();
      return;
    }

    if (r === 'financeiro') {
      renderTemplate('tpl-financeiro');
      await initFinanceiro();
      return;
    }

    if (r === 'dashboards') {
      renderTemplate('tpl-dashboards');
      await initDashboards();
      return;
    }

    if (r === 'config') {
      renderTemplate('tpl-config');
      await initConfig();
      return;
    }

    renderTemplate('tpl-inicio');
  }

  document.querySelectorAll('.menuItem').forEach((a) => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      routeTo(a.dataset.route || 'inicio');
    });
  });

  window.addEventListener('hashchange', () => {
    route().catch((err) => {
      appMount.innerHTML = `<section class="card"><div class="title">Erro</div><div class="status">${esc(err.message)}</div></section>`;
    });
  });

  setInterval(tickClock, 1000);
  tickClock();

  window.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey && ev.shiftKey && ev.key === 'U') {
      isAdminUnlocked = !isAdminUnlocked;
      sessionStorage.setItem('isAdminUnlocked', isAdminUnlocked);
      applyTerminalMode().then(() => {
        alert(isAdminUnlocked ? 'Admin Desbloqueado' : 'Admin Bloqueado');
      });
    }
  });

  (async () => {
    await initShell();
    if (!location.hash) location.hash = 'inicio';
    await route();
  })().catch((err) => {
    appMount.innerHTML = `<section class="card"><div class="title">Erro inicial</div><div class="status">${esc(err.message)}</div></section>`;
  });
});

// ═══════════════════════════════════════════
// VISOR CV (COMPUTER VISION)
// ═══════════════════════════════════════════
window.toggleCvViewer = function() {
  const role = document.getElementById('roleSelect')?.value;
  if (role === 'EMPILHADOR') return; // Bloqueia visor para empilhadores
  console.log("[CV Visor] Chamando toggleCvViewer...");
  let modal = document.getElementById('cvViewerModal');
  
  if (!modal) {
    console.log("[CV Visor] Criando modal dinamicamente...");
    modal = document.createElement('div');
    modal.id = 'cvViewerModal';
    modal.style.cssText = 'display:none; position:fixed; bottom:20px; right:20px; width:420px; background:#0f172a; border:2px solid var(--blue); border-radius:16px; z-index:999999; box-shadow:0 20px 50px rgba(0,0,0,0.8); overflow:hidden; font-family: sans-serif;';
    modal.innerHTML = `
      <div style="background:var(--blue); color:#fff; font-size:13px; font-weight:800; padding:10px 15px; display:flex; justify-content:space-between; align-items:center; cursor:move;">
        <span style="display:flex; align-items:center; gap:8px;"><i data-lucide="camera" style="width:16px;height:16px;"></i> VISOR DE CÂMERAS (F8)</span>
        <button onclick="toggleCvViewer()" style="background:rgba(255,255,255,0.2); border:none; color:#fff; font-size:16px; cursor:pointer; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center;">&times;</button>
      </div>
      <div style="width:100%; height:260px; background:#000; display:flex; justify-content:center; align-items:center; position:relative;" id="cvVideoWrapper">
        <img id="cvFeedImg" style="width:100%; height:100%; object-fit:contain; display:none;" />
        <canvas id="cvRoiCanvas" style="position:absolute;top:0;left:0;width:100%;height:100%;display:none;cursor:crosshair;z-index:10;"></canvas>
        <div id="cvFeedLoading" style="color:#64748b; font-size:13px; text-align:center; padding:20px;">
          <div style="display:flex;justify-content:center;margin-bottom:10px;"><i data-lucide="loader-2" style="width:24px;height:24px;animation:spin 2s linear infinite"></i></div>
          Iniciando transmissão...<br><span style="font-size:10px; opacity:0.6;">(Certifique-se que o cv_service.py está rodando)</span>
          <br><br>
          <a href="http://localhost:5000/video_feed" target="_blank" style="color:var(--blue); text-decoration:underline; font-size:11px;">Abrir no Chrome (Caso falhe aqui)</a>
        </div>
      </div>
      <!-- ROI Editor Panel (hidden by default) -->
      <div id="cvRoiPanel" style="display:none; padding:10px 12px; background:#111827; border-top:1px solid rgba(255,200,0,0.3);">
        <div style="font-size:11px; font-weight:700; color:#ffc107; margin-bottom:8px; display:flex; align-items:center; gap:6px;">
          <i data-lucide="crop" style="width:13px;height:13px;"></i> EDITOR DE ZONAS DE LEITURA
        </div>
        <div style="font-size:10px; color:#64748b; margin-bottom:8px; line-height:1.5;">
          Arraste os retângulos no visor para ajustar as zonas.<br>
          <span style="color:#ffc107;">■</span> Zona de frutas &nbsp; <span style="color:#f97316;">■</span> Zona da etiqueta/OCR
        </div>
        <div style="display:flex; gap:8px; justify-content:flex-end;">
          <button id="cvRoiReset" style="background:#374151; color:#94a3b8; border:none; border-radius:6px; padding:5px 12px; font-size:11px; cursor:pointer; font-weight:600;">Resetar</button>
          <button id="cvRoiSave" style="background:#ffc107; color:#000; border:none; border-radius:6px; padding:5px 14px; font-size:11px; cursor:pointer; font-weight:800;">✓ Salvar Zonas</button>
        </div>
      </div>
      <div style="padding: 8px 10px; background: #1e293b; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #94a3b8; font-size: 11px; font-weight: 600; display: flex; align-items: center; gap: 4px;"><i data-lucide="video" style="width:14px;height:14px;"></i> CANAL:</span>
        <select id="cvCameraSelect" onchange="changeCvCamera(this.value)" style="background: #0f172a; color: #fff; border: 1px solid var(--blue); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; outline: none; flex:1;">
          <option value="0">Câmera Principal (0)</option>
          <option value="1">Câmera Auxiliar (1)</option>
          <option value="2">Câmera Auxiliar (2)</option>
          <option value="3">Câmera Auxiliar (3)</option>
        </select>
        <button id="cvRoiToggleBtn" onclick="toggleCvRoiEditor()" title="Configurar Zonas de Leitura" style="background:#1e3a5f; border:1px solid #ffc107; color:#ffc107; border-radius:6px; padding:4px 9px; font-size:11px; cursor:pointer; font-weight:700; display:flex; align-items:center; gap:4px; white-space:nowrap;">
          <i data-lucide="crop" style="width:12px;height:12px;"></i> Zonas
        </button>
      </div>
    `;
    document.body.appendChild(modal);
    if (window.lucide) window.lucide.createIcons();
  }

  const img = modal.querySelector('#cvFeedImg');
  const loading = modal.querySelector('#cvFeedLoading');
  const select = modal.querySelector('#cvCameraSelect');
  
  if (modal.style.display === 'none') {
    modal.style.display = 'block';
    loading.style.display = 'block';
    img.style.display = 'none';
    
    const savedIndex = localStorage.getItem('cv_camera_index') || '0';
    if (select) select.value = savedIndex;
    
    setTimeout(() => {
      // Sincroniza a câmera antes de abrir o stream
      window.changeCvCamera(savedIndex).then(() => {
        img.src = 'http://localhost:5000/video_feed?t=' + Date.now();
        img.onload = () => {
          loading.style.display = 'none';
          img.style.display = 'block';
        };
        img.onerror = () => {
          loading.innerHTML = '<span style="color:#ef4444; font-weight:bold; display:flex; align-items:center; gap:4px; justify-content:center;"><i data-lucide="x-circle" style="width:18px;height:18px;"></i> ERRO DE CONEXÃO</span><br><br><span style="font-size:11px;">O serviço de visão (Python) não está respondendo.</span><br><br><button onclick="window.api.cvInstallDependencies().then(r=>alert(r.message))" style="background:#3b82f6; color:#fff; border:none; padding:8px 14px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer;">⚙️ Instalar / Configurar Python e Módulos (Automático)</button>';
          loading.style.display = 'block';
          img.style.display = 'none';
          if (window.lucide) window.lucide.createIcons();
        };
      });
    }, 100);
  } else {
    modal.style.display = 'none';
    img.src = ''; 
  }
};

window.changeCvCamera = async function(index) {
  console.log(`[CV Visor] Solicitando mudança de câmera para o índice ${index}`);
  localStorage.setItem('cv_camera_index', index);
  try {
    const res = await fetch('http://localhost:5000/set_camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index: parseInt(index) })
    });
    if (res.ok) {
      console.log(`[CV Visor] Sucesso ao mudar para a câmera ${index}`);
    } else {
      console.error(`[CV Visor] Falha ao mudar para a câmera ${index}`);
    }
  } catch (err) {
    console.error(`[CV Visor] Erro de rede ao mudar de câmera:`, err.message);
  }
};

// ═══════════════════════════════════════════
// EDITOR VISUAL DE ROI (ZONAS DE LEITURA)
// ═══════════════════════════════════════════

// Estado das ROIs em coordenadas normalizadas (0..1)
let cvRois = {
  fruits: { x: 0.05, y: 0.02, w: 0.90, h: 0.60 },
  label:  { x: 0.05, y: 0.62, w: 0.90, h: 0.35 }
};
let cvRoiEditorActive = false;
let cvRoiDrag = null; // { roi: 'fruits'|'label', handle: 'move'|'se', startMX, startMY, startRoi }

function cvRoiToCanvas(roi, cw, ch) {
  return {
    x: roi.x * cw,
    y: roi.y * ch,
    w: roi.w * cw,
    h: roi.h * ch
  };
}

function drawRoiCanvas() {
  const canvas = document.getElementById('cvRoiCanvas');
  if (!canvas) return;
  const cw = canvas.width  = canvas.offsetWidth;
  const ch = canvas.height = canvas.offsetHeight;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, cw, ch);

  const defs = [
    { key: 'fruits', color: '#ffc107', label: 'FRUTAS' },
    { key: 'label',  color: '#f97316', label: 'ETIQUETA / OCR' }
  ];

  for (const { key, color, label } of defs) {
    const r = cvRoiToCanvas(cvRois[key], cw, ch);
    // Fundo semitransparente
    ctx.fillStyle = color + '22';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    // Borda
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.setLineDash([]);
    // Label
    ctx.fillStyle = color;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(label, r.x + 6, r.y + 16);
    // Handle de resize (canto inferior direito)
    const hx = r.x + r.w - 10, hy = r.y + r.h - 10;
    ctx.fillStyle = color;
    ctx.fillRect(hx, hy, 12, 12);
    ctx.fillStyle = '#000';
    ctx.fillText('⤡', hx + 1, hy + 10);
  }
}

function getHitTarget(mx, my, cw, ch) {
  const defs = ['label', 'fruits']; // label testa primeiro (fica embaixo)
  for (const key of defs) {
    const r = cvRoiToCanvas(cvRois[key], cw, ch);
    // Handle resize (SE)
    if (mx >= r.x + r.w - 14 && mx <= r.x + r.w + 4 &&
        my >= r.y + r.h - 14 && my <= r.y + r.h + 4) {
      return { roi: key, handle: 'se' };
    }
    // Move (dentro do retângulo)
    if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
      return { roi: key, handle: 'move' };
    }
  }
  return null;
}

function attachRoiCanvasListeners(canvas) {
  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const hit = getHitTarget(mx, my, canvas.offsetWidth, canvas.offsetHeight);
    if (hit) {
      cvRoiDrag = {
        ...hit,
        startMX: mx, startMY: my,
        startRoi: { ...cvRois[hit.roi] }
      };
      canvas.style.cursor = hit.handle === 'se' ? 'nwse-resize' : 'grabbing';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!cvRoiDrag) {
      const rect = canvas.getBoundingClientRect();
      const hit = getHitTarget(e.clientX - rect.left, e.clientY - rect.top, canvas.offsetWidth, canvas.offsetHeight);
      canvas.style.cursor = hit ? (hit.handle === 'se' ? 'nwse-resize' : 'grab') : 'default';
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = (mx - cvRoiDrag.startMX) / canvas.offsetWidth;
    const dy = (my - cvRoiDrag.startMY) / canvas.offsetHeight;
    const sr = cvRoiDrag.startRoi;

    if (cvRoiDrag.handle === 'move') {
      cvRois[cvRoiDrag.roi] = {
        x: Math.max(0, Math.min(1 - sr.w, sr.x + dx)),
        y: Math.max(0, Math.min(1 - sr.h, sr.y + dy)),
        w: sr.w, h: sr.h
      };
    } else { // 'se' = resize
      cvRois[cvRoiDrag.roi] = {
        x: sr.x, y: sr.y,
        w: Math.max(0.05, Math.min(1 - sr.x, sr.w + dx)),
        h: Math.max(0.05, Math.min(1 - sr.y, sr.h + dy))
      };
    }
    drawRoiCanvas();
  });

  const stopDrag = () => { cvRoiDrag = null; canvas.style.cursor = 'crosshair'; };
  canvas.addEventListener('mouseup', stopDrag);
  canvas.addEventListener('mouseleave', stopDrag);
}

window.toggleCvRoiEditor = async function() {
  const modal = document.getElementById('cvViewerModal');
  if (!modal) return;
  const panel  = modal.querySelector('#cvRoiPanel');
  const canvas = modal.querySelector('#cvRoiCanvas');
  const btn    = modal.querySelector('#cvRoiToggleBtn');
  if (!panel || !canvas) return;

  cvRoiEditorActive = !cvRoiEditorActive;

  if (cvRoiEditorActive) {
    // Carrega ROIs salvas do servidor antes de abrir
    try {
      const res = await fetch('http://localhost:5000/get_roi');
      if (res.ok) {
        const data = await res.json();
        if (data.roi_fruits) cvRois.fruits = data.roi_fruits;
        if (data.roi_label)  cvRois.label  = data.roi_label;
      }
    } catch (_) {}

    panel.style.display  = 'block';
    canvas.style.display = 'block';
    if (btn) { btn.style.background = '#ffc107'; btn.style.color = '#000'; }
    drawRoiCanvas();
    attachRoiCanvasListeners(canvas);

    // Botão Salvar
    const saveBtn = modal.querySelector('#cvRoiSave');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        try {
          const res = await fetch('http://localhost:5000/set_roi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              roi_enabled: true,
              roi_fruits: cvRois.fruits,
              roi_label:  cvRois.label
            })
          });
          if (res.ok) {
            localStorage.setItem('cv_rois', JSON.stringify(cvRois));
            saveBtn.textContent = '✓ Salvo!';
            saveBtn.style.background = '#22c55e';
            setTimeout(() => { saveBtn.textContent = '✓ Salvar Zonas'; saveBtn.style.background = '#ffc107'; }, 1800);
          }
        } catch (err) {
          saveBtn.textContent = '✗ Erro de conexão';
          saveBtn.style.background = '#ef4444';
          setTimeout(() => { saveBtn.textContent = '✓ Salvar Zonas'; saveBtn.style.background = '#ffc107'; }, 2000);
        }
      };
    }

    // Botão Resetar
    const resetBtn = modal.querySelector('#cvRoiReset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        cvRois = {
          fruits: { x: 0.05, y: 0.02, w: 0.90, h: 0.60 },
          label:  { x: 0.05, y: 0.62, w: 0.90, h: 0.35 }
        };
        drawRoiCanvas();
      };
    }
  } else {
    panel.style.display  = 'none';
    canvas.style.display = 'none';
    if (btn) { btn.style.background = '#1e3a5f'; btn.style.color = '#ffc107'; }
  }
};

// Atalho global F8 para o Visor
document.addEventListener('keydown', (e) => {
  if (e.key === 'F8') {
    toggleCvViewer();
  }
});

// Detecção de Erros de Sincronização (JWT Expirado) - Com trava para não inundar o log
let lastAuthErrorTime = 0;
window.api.onSyncAuthError(() => {
  const now = Date.now();
  if (now - lastAuthErrorTime < 60000) return; // Só avisa uma vez por minuto
  lastAuthErrorTime = now;

  console.warn("[Sync] Sessão expirada ou token inválido.");
  const loginOverlay = document.getElementById('loginOverlay');
  const status = document.getElementById('loginStatus');
  
  if (loginOverlay && loginOverlay.style.display === 'none') {
    loginOverlay.style.display = 'flex';
    if (status) status.textContent = 'Sessão expirada. Por favor, entre novamente.';
  }
});

// Notificação de Atualização Automática (Auto-Updater)
if (window.api && window.api.onUpdateStatus) {
  window.api.onUpdateStatus((data) => {
    if (!data) return;
    let banner = document.getElementById('autoUpdateBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'autoUpdateBanner';
      banner.style.cssText = 'position:fixed; top:12px; right:20px; background:#1e293b; color:#fff; border:1px solid #3b82f6; padding:12px 18px; border-radius:12px; z-index:999999; box-shadow:0 10px 30px rgba(0,0,0,0.5); font-size:13px; font-weight:600; display:flex; align-items:center; gap:12px;';
      document.body.appendChild(banner);
    }

    if (data.status === 'available') {
      banner.innerHTML = `<span>🚀 <strong>Nova versão ${data.version} disponível!</strong> Baixando em segundo plano...</span>`;
      banner.style.display = 'flex';
    } else if (data.status === 'downloaded') {
      banner.innerHTML = `
        <span>🎉 <strong>Atualização v${data.version} pronta!</strong></span>
        <button id="btnRestartUpdate" style="background:#3b82f6; color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:800; cursor:pointer;">Reiniciar e Aplicar</button>
      `;
      banner.style.display = 'flex';
      const btn = banner.querySelector('#btnRestartUpdate');
      if (btn) btn.onclick = () => window.api.updateRestartAndInstall();
    }
  });
}


