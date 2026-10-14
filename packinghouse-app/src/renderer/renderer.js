// ── Utilitários Globais ────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function fmtClock(d = new Date()) {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function isoDateToday() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfDayMs(iso) {
  if (!iso) iso = isoDateToday();
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}

function endOfDayMs(iso) {
  if (!iso) iso = isoDateToday();
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
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

window.pad = pad;
window.esc = esc;
window.fmtClock = fmtClock;
window.isoDateToday = isoDateToday;
window.startOfDayMs = startOfDayMs;
window.endOfDayMs = endOfDayMs;
window.colorByPct = colorByPct;
window.photoUrl = photoUrl;
window.photoStyle = photoStyle;

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
  window.stationId = stationId;
  const scannerId = 'sc01';

  const hasApi = (name) => typeof window.api?.[name] === 'function';

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
    const formatted = fmtClock(now);
    if (clockEl) clockEl.textContent = formatted;
    document.querySelectorAll('#clock, .clock-el').forEach(el => {
      el.textContent = formatted;
    });
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

    const emailInp = $('loginEmail');
    const passInp = $('loginPass');
    const btn = $('btnLoginAction');
    const status = $('loginStatus');

    const doLogin = async () => {
      console.log("[Login] Tentando entrar com:", emailInp.value);
      const email = emailInp.value.trim();
      const password = passInp.value.trim();
      if (!email || !password) {
        status.textContent = 'Por favor, preencha o e-mail e a senha.';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Autenticando...';
      status.textContent = '';

      try {
        const loginRes = await window.api.authLogin({ email, password });
        if (loginRes.ok) {
          overlay.style.display = 'none';
          await initShell();
          route();
          // Sincronização em segundo plano sem bloquear a entrada do usuário
          window.api.syncNow().catch(console.error);
        } else {
          status.textContent = loginRes.error || 'E-mail ou senha incorretos.';
          console.error("[Login] Falha:", loginRes.error);
        }
      } catch (err) {
        status.textContent = 'Erro ao conectar ao servidor: ' + (err.message || err);
        console.error("[Login] Exceção:", err);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Entrar e Sincronizar';
      }
    };

    btn.onclick = doLogin;
    passInp.onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
    emailInp.onkeydown = (e) => { if (e.key === 'Enter') passInp.focus(); };

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

    const res = await window.api.authCheck();
    if (res.ok) {
      overlay.style.display = 'none';
      return true;
    } else {
      overlay.style.display = 'flex';
      return false;
    }
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

    if (typeof window.api?.onSyncStatus === 'function' && !window._syncStatusHooked) {
      window._syncStatusHooked = true;
      window.api.onSyncStatus(({ state, error, lastSync, nextRetry }) => {
        const badge = document.getElementById('syncBadge');
        const text = document.getElementById('syncText');
        if (!badge || !text) return;

        badge.classList.remove('syncing', 'offline', 'error');
        if (state === 'syncing') {
          badge.classList.add('syncing');
          text.textContent = 'Sincronizando...';
        } else if (state === 'synced') {
          text.textContent = 'Sincronizado';
        } else if (state === 'offline') {
          badge.classList.add('offline');
          text.textContent = 'Offline (local)';
        } else if (state === 'error') {
          badge.classList.add('error');
          text.textContent = 'Erro de sincronização';
        }
      });
    }
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
      const cfg = (await window.api.configGetAll()) || {};
      const isMelonMode = cfg.culture_type === 'MELAO_MELANCIA';
      const t = (await window.api.totalsNow({ stationId, role: roleSelect.value })) || {};

      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px; margin-bottom: 10px;">
          <div style="font-size: 13px; color: var(--muted); text-transform: uppercase; letter-spacing: 1px;">Produção Hoje</div>
          <div style="text-align: right;">
            <div style="font-size: 18px; font-weight: 800; color: #fff;">${t.dayTotal || 0} <span style="font-size: 11px; font-weight: 400; color: var(--muted);">cx</span></div>
            <div style="font-size: 12px; color: var(--green);">${isMelonMode ? ((t.dayKg || 0) / 1000).toFixed(3) + ' t' : (t.dayKg || 0) + ' kg'}</div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
          <div style="font-size: 11px; color: var(--muted);">TOTAL HORA</div>
          <div style="font-size: 14px; font-weight: 700;">${t.hourTotal || 0} cx</div>
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
      const st = (await window.api.stateGet({ stationId, role: roleSelect.value })) || {};

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
        let cvRes = null; // precisa existir fora do try abaixo (antes era const interno -> sempre undefined)
        const cfg = await window.api.configGetAll();
        // config é salvo como texto: 'false'/'0' NÃO podem ser tratados como ligado
        const cvOn = cfg.cv_enabled === true || cfg.cv_enabled === 'true' || cfg.cv_enabled === '1' || cfg.cv_enabled === 1;
        
        if (cvOn && roleSelect.value !== 'EMPILHADOR') {
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
            // Chama a análise imediatamente ao bipe (o buffer na memória já tem o melhor frame recente)
            cvRes = await window.api.cvAnalyze(activeFruitName);
            const statusEl = document.getElementById('cvStatus');
            const caliberEl = document.getElementById('cvCaliber');
            const confidenceEl = document.getElementById('cvConfidence');
            const countEl = document.getElementById('cvCount');
            const boxModelEl = document.getElementById('cvBoxModel');
            const weightEl = document.getElementById('cvWeight');

            if (cvRes.ok) {
              // Validação cruzada calibre x tabela da caixa (OK / VERIFICAR / SEM_TABELA / SEM_CONTAGEM)
              const v = cvRes.validation;
              const ms = cvRes.analyze_ms != null ? ` · ${cvRes.analyze_ms}ms` : '';
              statusEl.textContent = v && v !== 'SEM_TABELA' ? `(${v}${ms})` : `(Sucesso${ms})`;
              statusEl.style.color = v === 'VERIFICAR' ? '#f59e0b' : (v === 'OK' ? '#22c55e' : '');
              statusEl.title = (cvRes.warnings || []).join('\n') +
                (cvRes.expected_min_kg ? `\nMín. esperado: ${cvRes.expected_min_kg} kg (${cvRes.min_fruit_kg} kg/fruta)` : '');
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
        if (cvOn && roleSelect.value !== 'EMPILHADOR' && cvRes && cvRes.ok) {
          cvBoxModel = cvRes.box_model;
          cvWeight = cvRes.detected_weight;
        }
        // Câmera ligada mas sem resultado (offline, timeout, sem contagem): a caixa
        // continua sendo contada, porém vai para o estoque como NÃO IDENTIFICADA (N/I)
        const cvUnidentified = cvOn && roleSelect.value !== 'EMPILHADOR' && !caliberDetected;

        const res = await window.api.scanSubmit({
          stationId,
          scannerId,
          role: roleSelect.value,
          rawBarcode,
          caliber: caliberDetected,
          cvBoxModel,
          cvWeight,
          cvUnidentified
        });

        if (res.ignored) {
          status.textContent = `Ignorado: leitura repetida da caixa (${rawBarcode})`;
        } else if (res.counted || res.ok) {
          // Note: if the backend only returned { ok: true } we still show counted.
          const niTag = res.unidentified ? ' · caixa N/I (mapear no web)' : '';
          status.textContent = `Contado: ${rawBarcode}${res.employee?.name ? ` - ${res.employee.name}` : ''}${niTag}`;
          
          // Se o carrossel estiver ativo na tela, atualiza status e dados em segundo plano
          const scLive = document.getElementById('showcaseLiveStatus');
          if (scLive) {
            const empTxt = res.employee?.name ? ` (${res.employee.name})` : '';
            scLive.innerHTML = `<strong>Última leitura:</strong> ${rawBarcode}${empTxt} • <span style="color:var(--green)">Registrado com sucesso (+1 cx)</span>`;
          }
          const scOverlay = document.getElementById('collabShowcaseOverlay');
          if (scOverlay && scOverlay.classList.contains('active')) {
            renderShowcaseSlide().catch(() => {});
          }
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
      if (traceContext) traceContext.style.display = 'flex';

      const ctx = (await window.api.contextGet({ stationId, role: roleSelect.value })) || {};
      const parcels = (await window.api.parcelsList()) || [];

      ctxParcel.innerHTML = '<option value="">Selecione o Talhão / Parcela...</option>';
      (parcels || []).filter(p => p && p.active).forEach(p => {
        const o = new Option(p.code, p.id);
        if (p.id == ctx.parcel_id) o.selected = true;
        ctxParcel.add(o);
      });

      async function updateFruits(preserveSaved = false) {
        const pid = ctxParcel.value;
        ctxFruit.innerHTML = '<option value="">Fruta...</option>';
        ctxVariety.innerHTML = '<option value="">Variedade...</option>';

        if (!pid) {
          ctxFruit.disabled = true;
          ctxVariety.disabled = true;
          return;
        }

        const fruits = await window.api.parcelFruitsList({ parcelId: pid });
        if (!fruits || fruits.length === 0) {
          ctxFruit.innerHTML = '<option value="">Sem fruta vinculada a este talhão</option>';
          ctxFruit.disabled = true;
          ctxVariety.disabled = true;
          return;
        }

        ctxFruit.disabled = false;
        fruits.forEach(f => {
          const o = new Option(f.name, f.id);
          if (preserveSaved && f.id == ctx.fruit_id) o.selected = true;
          ctxFruit.add(o);
        });

        if (fruits.length === 1) {
          ctxFruit.value = fruits[0].id;
        } else if (!preserveSaved && !fruits.some(f => f.id == ctxFruit.value)) {
          ctxFruit.value = '';
        }

        await updateVarieties(preserveSaved);
      }

      async function updateVarieties(preserveSaved = false) {
        const pid = ctxParcel.value;
        const fid = ctxFruit.value;
        ctxVariety.innerHTML = '<option value="">Variedade...</option>';

        if (!pid || !fid) {
          ctxVariety.disabled = true;
          return;
        }

        const varieties = await window.api.parcelVarietiesList({ parcelId: pid, fruitId: fid });
        if (!varieties || varieties.length === 0) {
          ctxVariety.innerHTML = '<option value="">Sem variedade vinculada</option>';
          ctxVariety.disabled = true;
          return;
        }

        ctxVariety.disabled = false;
        varieties.forEach(v => {
          const o = new Option(v.name, v.id);
          if (preserveSaved && v.id == ctx.variety_id) o.selected = true;
          ctxVariety.add(o);
        });

        if (varieties.length === 1) {
          ctxVariety.value = varieties[0].id;
        } else if (!preserveSaved && !varieties.some(v => v.id == ctxVariety.value)) {
          ctxVariety.value = '';
        }
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

      ctxParcel.onchange = async () => {
        await updateFruits(false);
        await saveContext();
        setTimeout(() => scanInput && scanInput.focus(), 50);
      };

      ctxFruit.onchange = async () => {
        await updateVarieties(false);
        await saveContext();
        setTimeout(() => scanInput && scanInput.focus(), 50);
      };

      ctxVariety.onchange = async () => {
        await saveContext();
        setTimeout(() => scanInput && scanInput.focus(), 50);
      };

      // Carrega inicial preservando contexto salvo no banco
      await updateFruits(true);
      await saveContext();
    }

    await setupTraceSelectors();
    await refreshState();
    setTimeout(() => scanInput && scanInput.focus(), 100);

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
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg2);margin-bottom:4px;border-radius:6px;border:1px solid var(--border);">
          <span>${esc(l.fruitName)} &rarr; <strong>${esc(l.varietyName)}</strong></span>
          <button type="button" class="linkDel secondary" data-f="${l.fruitId}" data-v="${l.varietyId}">Excluir</button>
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
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div>
            <code style="background:var(--bg3);padding:2px 6px;border-radius:4px;border:1px solid var(--border);">${esc(m.barcode)}</code> &rarr; 
            <strong>${esc(m.employeeName)}</strong> (${esc(m.weightName)})
          </div>
          <button type="button" class="mapDelete secondary" data-barcode="${esc(m.barcode)}">Excluir</button>
        </div>
      `).join('') || '<div class="muted">Nenhum mapeamento.</div>';

      mapList.querySelectorAll('.mapDelete').forEach(btn => {
        btn.onclick = async () => {
          if (confirm('Excluir este mapeamento?')) {
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
    const kpiTotalDia = document.getElementById('kpiTotalDia');
    const kpiTotalKg = document.getElementById('kpiTotalKg');
    const kpiMediaHora = document.getElementById('kpiMediaHora');
    const kpiEficiencia = document.getElementById('kpiEficiencia');
    const liveFeed = document.getElementById('liveFeed');
    const logStart = document.getElementById('logStart');
    const logEnd = document.getElementById('logEnd');
    const logLoad = document.getElementById('logLoad');
    const logOut = document.getElementById('logOut');
    const dashStart = document.getElementById('dashStart');
    const dashEnd = document.getElementById('dashEnd');
    const dashRefresh = document.getElementById('dashRefresh');

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
      const elTotalDia = document.getElementById('kpiTotalDia');
      if (elTotalDia) elTotalDia.textContent = dsStats.totalBoxes || 0;

      const elBruto = document.getElementById('kpiTotalBruto');
      if (elBruto) elBruto.textContent = dsStats.rawTotalBoxes || dsStats.totalBoxes || 0;

      const elTotalKg = document.getElementById('kpiTotalKg');
      if (elTotalKg) elTotalKg.textContent = dsStats.totalKg || 0;

      const elTon = document.getElementById('kpiTotalToneladas');
      if (elTon) elTon.textContent = dsStats.totalKg ? (dsStats.totalKg / 1000).toFixed(3) : '0.000';

      const elQual = document.getElementById('kpiQualidadeGlobal');
      if (elQual) {
        const qVal = dsStats.qualityPct != null ? dsStats.qualityPct : 100;
        elQual.textContent = `${qVal}%`;
        elQual.style.color = qVal >= 95 ? 'var(--green)' : (qVal >= 85 ? 'var(--yellow)' : 'var(--red)');
      }

      const elErros = document.getElementById('kpiTotalErros');
      if (elErros) elErros.textContent = dsStats.penaltyCount || 0;

      const elTaxaErro = document.getElementById('kpiTaxaErro');
      if (elTaxaErro) elTaxaErro.textContent = `${dsStats.errorPct || 0}%`;

      const elMediaHora = document.getElementById('kpiMediaHora');
      if (elMediaHora) elMediaHora.textContent = dsStats.avgPerHour || 0;

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

      const elEfic = document.getElementById('kpiEficiencia');
      if (elEfic) {
        const avgYield = dsStats.collaboratorStats && dsStats.collaboratorStats.length > 0
          ? Math.round(dsStats.collaboratorStats.reduce((sum, c) => sum + (c.yieldPct || 0), 0) / dsStats.collaboratorStats.length)
          : 100;
        elEfic.textContent = `${avgYield}%`;
        elEfic.style.color = colorByPct(avgYield);
      }

      const elAtivos = document.getElementById('kpiColabAtivos');
      if (elAtivos) elAtivos.textContent = dsStats.collaboratorStats ? dsStats.collaboratorStats.length : 0;

      // Banner do Colaborador Selecionado
      const bannerEl = document.getElementById('collabSelectedBanner');
      if (bannerEl) {
        if (empId) {
          bannerEl.style.display = 'block';
          const selectedCollab = (dsStats.collaboratorStats && dsStats.collaboratorStats.length > 0)
            ? (dsStats.collaboratorStats.find(c => String(c.id) === String(empId)) || dsStats.collaboratorStats[0])
            : null;
          const photoEl = document.getElementById('collabBannerPhoto');
          const nameEl = document.getElementById('collabBannerName');
          const roleEl = document.getElementById('collabBannerRole');
          const boxesEl = document.getElementById('collabBannerBoxes');
          const qualEl = document.getElementById('collabBannerQuality');
          const paceEl = document.getElementById('collabBannerPace');
          const cadEl = document.getElementById('collabBannerCadence');

          if (selectedCollab) {
            if (photoEl) photoEl.style.backgroundImage = selectedCollab.photoPath ? `url('${selectedCollab.photoPath}')` : 'none';
            if (nameEl) nameEl.textContent = selectedCollab.name;
            if (roleEl) {
              roleEl.textContent = selectedCollab.role || 'EMBALADOR';
              roleEl.className = `badge ${(selectedCollab.role || '').toLowerCase()}`;
            }
            if (boxesEl) boxesEl.textContent = `${selectedCollab.boxes} cx`;
            if (qualEl) {
              qualEl.textContent = `${selectedCollab.qualityPct}%`;
              qualEl.style.color = colorByPct(selectedCollab.qualityPct);
            }
            if (paceEl) paceEl.textContent = `${selectedCollab.avgPerHour || 0} cx/h`;
            if (cadEl) {
              cadEl.textContent = dsStats.avgScanGapSec > 0 ? `${dsStats.avgScanGapSec}s` : '--';
              cadEl.style.color = dsStats.avgScanGapSec < 20 ? 'var(--green)' : 'var(--yellow)';
            }
          }
          const clearBtn = document.getElementById('collabBannerClearBtn');
          if (clearBtn && !clearBtn._hasClick) {
            clearBtn._hasClick = true;
            clearBtn.onclick = async () => {
              if (dashEmployee) {
                dashEmployee.value = '';
                dashEmployee.dispatchEvent(new Event('change'));
              }
            };
          }
        } else {
          bannerEl.style.display = 'none';
        }
      }

      // Tabela Analítica de Desempenho por Colaborador
      const tableBody = document.getElementById('collabAnalyticsTableBody');
      if (tableBody) {
        if (dsStats.collaboratorStats && dsStats.collaboratorStats.length > 0) {
          const sorted = [...dsStats.collaboratorStats].sort((a, b) => b.boxes - a.boxes);
          tableBody.innerHTML = sorted.map((c, idx) => {
            const errBadgeColor = (c.penaltyBoxes && c.penaltyBoxes > 0) ? 'var(--red)' : 'var(--muted)';
            const qualColor = colorByPct(c.qualityPct);
            const prodColor = colorByPct(c.yieldPct);
            return `
              <tr onclick="window.openCollaboratorModal('${c.id}')" style="border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(59,130,246,0.08)'" onmouseout="this.style.background='transparent'" title="Clique para abrir Raio-X detalhado de ${esc(c.name)}">
                <td style="padding:10px 12px; font-weight:600; display:flex; align-items:center; gap:8px;">
                  <span style="color:var(--muted); font-size:10px; width:16px;">#${idx+1}</span>
                  <div style="${photoStyle(c.photoPath, 28)}"></div>
                  <span style="color:var(--text);">${esc(c.name)}</span>
                </td>
                <td style="padding:10px 12px; text-align:center;">
                  <span class="badge ${(c.role || '').toLowerCase()}" style="font-size:10px; padding:2px 6px;">${esc(c.role || '—')}</span>
                </td>
                <td style="padding:10px 12px; text-align:right; font-weight:700; color:var(--text); font-size:13px;">
                  ${c.boxes} <span class="muted" style="font-size:10px; font-weight:400;">cx</span>
                </td>
                <td style="padding:10px 12px; text-align:right; font-weight:700; color:${errBadgeColor};">
                  ${c.penaltyBoxes || 0} <span style="font-size:10px; font-weight:400; opacity:0.8;">(${c.errorPct || 0}%)</span>
                </td>
                <td style="padding:10px 12px; text-align:right; font-weight:700; color:${prodColor};">
                  ${c.yieldPct}%
                </td>
                <td style="padding:10px 12px; text-align:right; font-weight:700; color:${qualColor};">
                  ${c.qualityPct}%
                </td>
                <td style="padding:10px 12px; text-align:right; font-weight:700; color:var(--blue);">
                  ${c.avgPerHour || 0} <span class="muted" style="font-size:10px; font-weight:400;">cx/h</span>
                </td>
              </tr>
            `;
          }).join('');
        } else {
          tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--muted);">Nenhum colaborador registrado no período.</td></tr>';
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
          <div onclick="window.openCollaboratorModal('${c.id}')" style="cursor:pointer; display:flex; gap:12px; align-items:center; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 12px; border: 1px solid rgba(59, 130, 246, 0.2); transition: all 0.2s;" onmouseover="this.style.borderColor='var(--blue)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(59, 130, 246, 0.2)'; this.style.transform='none'" title="Clique para abrir Raio-X detalhado de ${esc(c.name)}">
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

  // ── Modal / Raio-X Individual do Colaborador (Local Python) ─────────────────
  window.openCollaboratorModal = async function(empId) {
    if (!empId) return;
    let modal = document.getElementById('collabDetailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'collabDetailModal';
      modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); z-index:99999; display:flex; align-items:center; justify-content:center; padding:20px;';
      modal.innerHTML = `
        <div id="collabModalCard" style="background:#0f172a; border:1px solid rgba(59,130,246,0.3); border-radius:20px; width:740px; max-width:95vw; max-height:90vh; overflow-y:auto; box-shadow:0 25px 60px rgba(0,0,0,0.8); display:flex; flex-direction:column;">
          <div style="padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9)); border-radius:20px 20px 0 0;">
            <div style="display:flex; align-items:center; gap:16px;">
              <div id="modalCollabPhoto" style="width:58px; height:58px; border-radius:50%; background:#1e293b; background-size:cover; background-position:center; border:2px solid var(--blue); box-shadow:0 4px 15px rgba(0,0,0,0.5);"></div>
              <div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <h2 id="modalCollabName" style="margin:0; font-size:18px; font-weight:800; color:#fff;">Nome do Colaborador</h2>
                  <span id="modalCollabRole" class="badge" style="font-size:11px; padding:2px 8px;">EMBALADOR</span>
                </div>
                <div id="modalCollabMeta" class="muted" style="font-size:12px; margin-top:4px;">Código de Barras: — • Meta: —</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
              <button id="modalCollabFilterBtn" type="button" style="background:var(--blue); color:#fff; border:none; padding:8px 14px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:6px;">
                Filtrar no Painel
              </button>
              <button type="button" onclick="document.getElementById('collabDetailModal').style.display='none'" style="background:rgba(255,255,255,0.1); border:none; color:#94a3b8; font-size:20px; width:34px; height:34px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;">&times;</button>
            </div>
          </div>

          <div id="modalCollabBody" style="padding:24px; display:flex; flex-direction:column; gap:20px;">
            <div style="text-align:center; padding:40px; color:var(--muted);">Carregando métricas individuais...</div>
          </div>
        </div>
      `;
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
      document.body.appendChild(modal);
    }

    modal.style.display = 'flex';
    const bodyEl = document.getElementById('modalCollabBody');
    bodyEl.innerHTML = '<div style="text-align:center; padding:40px; color:var(--muted);">Carregando métricas individuais...</div>';

    try {
      const sInput = document.getElementById('dashStart');
      const eInput = document.getElementById('dashEnd');
      const sMs = sInput ? startOfDayMs(sInput.value) : startOfDayMs(isoDateToday());
      const eMs = eInput ? endOfDayMs(eInput.value) : endOfDayMs(isoDateToday());
      const stationId = document.getElementById('stationIdInput')?.value || 'ST01';

      const [empList, empStats, recentLogs] = await Promise.all([
        window.api.employeesList(),
        window.api.dashboardsGetStats({ stationId, startMs: sMs, endMs: eMs, employeeId: empId }),
        window.api.logsList({ stationId, startMs: sMs, endMs: eMs, limit: 100 })
      ]);

      const emp = (empList || []).find(e => String(e.id) === String(empId) || e.barcode === empId);
      const photoEl = document.getElementById('modalCollabPhoto');
      const nameEl = document.getElementById('modalCollabName');
      const roleEl = document.getElementById('modalCollabRole');
      const metaEl = document.getElementById('modalCollabMeta');
      const filterBtn = document.getElementById('modalCollabFilterBtn');

      if (emp) {
        if (photoEl) photoEl.style.backgroundImage = emp.photo_path ? `url('${emp.photo_path}')` : 'none';
        if (nameEl) nameEl.textContent = emp.name;
        if (roleEl) {
          roleEl.textContent = emp.role || 'EMBALADOR';
          roleEl.className = `badge ${(emp.role || '').toLowerCase()}`;
        }
        if (metaEl) {
          metaEl.textContent = `Código: ${emp.barcode || '—'} • Meta: ${empStats.targets ? empStats.targets[(emp.role || '').toLowerCase() === 'empilhador' ? 'stacker' : 'packer'] : 100} cx/h`;
        }
      }

      if (filterBtn) {
        filterBtn.onclick = async () => {
          const dEmp = document.getElementById('dashEmployee');
          if (dEmp) {
            dEmp.value = empId;
            dEmp.dispatchEvent(new Event('change'));
          }
          modal.style.display = 'none';
          window.scrollTo({ top: 0, behavior: 'smooth' });
        };
      }

      const collabData = (empStats.collaboratorStats && empStats.collaboratorStats.length > 0)
        ? empStats.collaboratorStats[0]
        : null;

      const netBoxes = collabData ? collabData.boxes : (empStats.totalBoxes || 0);
      const rawBoxes = collabData ? collabData.rawBoxes : (empStats.rawTotalBoxes || 0);
      const qualPct = collabData ? collabData.qualityPct : (empStats.qualityPct || 100);
      const errBoxes = collabData ? collabData.penaltyBoxes : (empStats.penaltyCount || 0);
      const yieldPct = collabData ? collabData.yieldPct : 0;
      const avgHour = collabData ? collabData.avgPerHour : (empStats.avgPerHour || 0);
      const cadSec = empStats.avgScanGapSec || 0;
      const totKg = empStats.totalKg || 0;

      const myLogs = (recentLogs || []).filter(l => String(l.employeeId) === String(empId) || (emp && l.employeeName === emp.name)).slice(0, 10);

      bodyEl.innerHTML = `
        <!-- Grid de KPIs -->
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:12px;">
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Caixas Líquidas</div>
            <div style="font-size:22px; font-weight:800; color:#fff; margin-top:4px;">${netBoxes}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">Bruto: ${rawBoxes}</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Peso Total</div>
            <div style="font-size:22px; font-weight:800; color:var(--green-neon); margin-top:4px;">${totKg} <span style="font-size:11px; font-weight:400;">kg</span></div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">${(totKg/1000).toFixed(3)} t</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Qualidade</div>
            <div style="font-size:22px; font-weight:800; color:${colorByPct(qualPct)}; margin-top:4px;">${qualPct}%</div>
            <div style="font-size:10px; color:${errBoxes > 0 ? 'var(--red)' : 'var(--muted)'}; margin-top:2px;">${errBoxes} erros</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Produtividade</div>
            <div style="font-size:22px; font-weight:800; color:${colorByPct(yieldPct)}; margin-top:4px;">${yieldPct}%</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">Meta diária</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Ritmo Médio</div>
            <div style="font-size:22px; font-weight:800; color:var(--blue); margin-top:4px;">${avgHour} <span style="font-size:11px; font-weight:400;">cx/h</span></div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">Por hora ativa</div>
          </div>
          <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:12px; text-align:center;">
            <div style="font-size:10px; color:var(--muted); text-transform:uppercase;">Cadência (Gap)</div>
            <div style="font-size:22px; font-weight:800; color:${cadSec > 0 && cadSec < 20 ? 'var(--green)' : 'var(--yellow)'}; margin-top:4px;">${cadSec > 0 ? cadSec + 's' : '--'}</div>
            <div style="font-size:10px; color:var(--muted); margin-top:2px;">Intervalo médio</div>
          </div>
        </div>

        <!-- Breakdown: Modelos de Caixas e Parcelas -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px;">
            <div style="font-size:12px; font-weight:700; color:var(--blue); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">📦 Modelos / Pesos Produzidos</div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
              ${(empStats.boxTypeStats && empStats.boxTypeStats.length > 0) ? empStats.boxTypeStats.map(b => `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 8px; background:rgba(0,0,0,0.2); border-radius:6px;">
                  <span>${esc(b.label)}</span>
                  <span style="font-weight:700; color:#fff;">${b.boxes} cx <span class="muted" style="font-weight:400;">(${(b.kg/1000).toFixed(2)} t)</span></span>
                </div>
              `).join('') : '<div class="muted" style="font-size:12px; padding:10px;">Nenhum modelo registrado.</div>'}
            </div>
          </div>

          <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px;">
            <div style="font-size:12px; font-weight:700; color:var(--green); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">🌱 Parcelas / Variedades</div>
            <div style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;">
              ${(empStats.parcelStats && empStats.parcelStats.length > 0) ? empStats.parcelStats.map(p => `
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; padding:6px 8px; background:rgba(0,0,0,0.2); border-radius:6px;">
                  <span>${esc(p.label)}</span>
                  <span style="font-weight:700; color:#fff;">${p.boxes} cx</span>
                </div>
              `).join('') : '<div class="muted" style="font-size:12px; padding:10px;">Nenhuma parcela registrada.</div>'}
            </div>
          </div>
        </div>

        <!-- Auditorias / Defeitos se houver -->
        ${(empStats.qualityBreakdown && empStats.qualityBreakdown.length > 0) ? `
          <div style="background:rgba(239,68,68,0.05); border:1px solid rgba(239,68,68,0.2); border-radius:12px; padding:14px;">
            <div style="font-size:12px; font-weight:700; color:var(--red); margin-bottom:8px; text-transform:uppercase;">⚠️ Ocorrências de Auditoria / Defeitos</div>
            <div style="display:flex; flex-wrap:wrap; gap:8px;">
              ${empStats.qualityBreakdown.map(q => `
                <span style="background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.3); color:#fca5a5; font-size:11px; padding:4px 10px; border-radius:8px;">
                  <strong>${esc(q.label)}:</strong> ${q.count} penalidades
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Últimas Leituras do Colaborador -->
        <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:14px;">
          <div style="font-size:12px; font-weight:700; color:var(--text); margin-bottom:10px; text-transform:uppercase; letter-spacing:0.5px;">🕒 Histórico Recente de Bipes</div>
          <div style="display:flex; flex-direction:column; gap:6px; max-height:150px; overflow-y:auto;">
            ${myLogs.length > 0 ? myLogs.map(l => `
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:6px 10px; background:rgba(0,0,0,0.25); border-radius:6px;">
                <span style="color:var(--muted);">${new Date(l.ts).toLocaleTimeString()}</span>
                <span style="font-weight:600; color:#fff;">${esc(l.weightLabel || 'SEM PESO')}</span>
                <span style="color:var(--muted);">${esc(l.parcelCode || '')} ${esc(l.varietyName || '')}</span>
              </div>
            `).join('') : '<div class="muted" style="font-size:11px; padding:6px;">Nenhum bipe recente.</div>'}
          </div>
        </div>
      `;
    } catch (err) {
      console.error('Erro ao abrir modal de colaborador:', err);
      bodyEl.innerHTML = `<div style="text-align:center; padding:30px; color:var(--red);">Erro ao carregar dados do colaborador: ${esc(err.message || String(err))}</div>`;
    }
  };

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
      cfgCvEnabled.checked = cfg.cv_enabled === true || cfg.cv_enabled === 'true' || cfg.cv_enabled === '1';
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
          <button id="cvRoiReset" style="background:#26302b; color:#93a29a; border:none; border-radius:6px; padding:5px 12px; font-size:11px; cursor:pointer; font-weight:500;">Resetar</button>
          <button id="cvRoiSave" style="background:var(--btn-bg); color:#fff; border:none; border-radius:6px; padding:5px 14px; font-size:11px; cursor:pointer; font-weight:500;">Salvar Zonas</button>
        </div>
      </div>
      <div style="padding: 8px 10px; background: #111714; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid var(--border);">
        <span style="color: var(--muted); font-size: 11px; font-weight: 500; display: flex; align-items: center; gap: 4px;"><i data-lucide="video" style="width:14px;height:14px;"></i> Canal:</span>
        <select id="cvCameraSelect" onchange="changeCvCamera(this.value)" style="background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; outline: none; flex:1;">
          <option value="0">Câmera Principal (0)</option>
          <option value="1">Câmera Auxiliar (1)</option>
          <option value="2">Câmera Auxiliar (2)</option>
          <option value="3">Câmera Auxiliar (3)</option>
        </select>
        <button id="cvRoiToggleBtn" onclick="toggleCvRoiEditor()" title="Configurar Zonas de Leitura" style="background:var(--btn-sec-bg); border:1px solid var(--border); color:var(--text); border-radius:6px; padding:4px 9px; font-size:11px; cursor:pointer; font-weight:500; display:flex; align-items:center; gap:4px; white-space:nowrap;">
          <i data-lucide="crop" style="width:12px;height:12px;"></i> Zonas
        </button>
      </div>
      <!-- Câmeras laterais (etiqueta/OCR). Topo = contagem de frutas -->
      <div style="padding: 6px 10px 8px; background: #111714; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 11px; color: var(--muted);">
        <span>Lateral:</span>
        <select id="cvSideSelect" onchange="changeCvSideCameras()" style="background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 3px 6px; font-size: 11px;">
          <option value="">Nenhuma</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
        </select>
        <span>Lateral 2:</span>
        <select id="cvSide2Select" onchange="changeCvSideCameras()" style="background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 3px 6px; font-size: 11px;">
          <option value="">Nenhuma</option><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option>
        </select>
        <span style="margin-left:auto;">Ver:</span>
        <select id="cvFeedSourceSelect" onchange="switchCvFeed(this.value)" style="background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px; padding: 3px 6px; font-size: 11px;">
          <option value="top">Topo (frutas)</option><option value="side">Lateral</option><option value="side2">Lateral 2</option>
        </select>
        <span id="cvCamMsg" style="width:100%; font-size:10px; color:#f59e0b;"></span>
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
        window.loadCvSideCameras();
        const feedSel = document.getElementById('cvFeedSourceSelect');
        if (feedSel) feedSel.value = 'top';
        img.src = 'http://127.0.0.1:5000/video_feed?cam=top&t=' + Date.now();
        img.onload = () => {
          loading.style.display = 'none';
          img.style.display = 'block';
        };
        img.onerror = () => {
          loading.innerHTML = '<span style="color:#e5675f; font-weight:bold; display:flex; align-items:center; gap:4px; justify-content:center;"><i data-lucide="x-circle" style="width:18px;height:18px;"></i> Erro de Conexão</span><br><br><span style="font-size:11px;">O serviço de visão (Python) não está respondendo.</span><br><br><button onclick="window.api.cvInstallDependencies().then(r=>alert(r.message))" style="background:var(--btn-bg); color:#fff; border:none; padding:8px 14px; border-radius:6px; font-weight:500; font-size:11px; cursor:pointer;">Instalar / Configurar Python e Módulos (Automático)</button>';
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
    const res = await fetch('http://127.0.0.1:5000/set_camera', {
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

// ── Câmeras laterais (etiqueta/OCR) ──
window.loadCvSideCameras = async function() {
  try {
    const res = await fetch('http://127.0.0.1:5000/cameras');
    const d = await res.json();
    const s1 = document.getElementById('cvSideSelect');
    const s2 = document.getElementById('cvSide2Select');
    if (s1) s1.value = d.side?.index ?? '';
    if (s2) s2.value = d.side2?.index ?? '';
    const msg = document.getElementById('cvCamMsg');
    if (msg) {
      const off = ['side', 'side2'].filter(k => d[k]?.index != null && !d[k]?.open);
      msg.textContent = off.length ? `Câmera(s) sem sinal: ${off.join(', ')}` : (d.dual_mode ? '' : 'Modo 1 câmera (zonas de leitura ativas)');
    }
  } catch (err) {
    console.error('[CV Visor] Falha ao ler câmeras:', err.message);
  }
};

window.changeCvSideCameras = async function() {
  const side = document.getElementById('cvSideSelect')?.value ?? '';
  const side2 = document.getElementById('cvSide2Select')?.value ?? '';
  const msg = document.getElementById('cvCamMsg');
  try {
    const res = await fetch('http://127.0.0.1:5000/set_cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ side: side === '' ? null : parseInt(side), side2: side2 === '' ? null : parseInt(side2) })
    });
    const d = await res.json();
    if (!res.ok || d.ok === false) {
      if (msg) msg.textContent = d.message || 'Falha ao configurar câmeras';
    } else {
      if (msg) msg.textContent = 'Abrindo câmeras...';
      setTimeout(window.loadCvSideCameras, 2500);
    }
  } catch (err) {
    if (msg) msg.textContent = 'Serviço de visão não respondeu';
  }
};

window.switchCvFeed = function(cam) {
  const img = document.getElementById('cvFeedImg');
  if (img) img.src = `http://127.0.0.1:5000/video_feed?cam=${encodeURIComponent(cam)}&t=${Date.now()}`;
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
      const res = await fetch('http://127.0.0.1:5000/get_roi');
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
          const res = await fetch('http://127.0.0.1:5000/set_roi', {
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
            saveBtn.textContent = 'Salvo!';
            saveBtn.style.background = 'var(--btn-bg)';
            setTimeout(() => { saveBtn.textContent = 'Salvar Zonas'; saveBtn.style.background = 'var(--btn-bg)'; }, 1800);
          }
        } catch (err) {
          saveBtn.textContent = 'Erro de conexão';
          saveBtn.style.background = 'var(--red)';
          setTimeout(() => { saveBtn.textContent = 'Salvar Zonas'; saveBtn.style.background = 'var(--btn-bg)'; }, 2000);
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

// Atalho global F7 para o Visor de Câmeras
document.addEventListener('keydown', (e) => {
  if (e.key === 'F7') {
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
      banner.innerHTML = `<span><strong>Nova versão ${data.version} disponível!</strong> Baixando em segundo plano...</span>`;
      banner.style.display = 'flex';
    } else if (data.status === 'downloaded') {
      banner.innerHTML = `
        <span><strong>Atualização v${data.version} pronta!</strong></span>
        <button id="btnRestartUpdate" style="background:var(--btn-bg); color:#fff; border:none; padding:6px 14px; border-radius:6px; font-weight:600; cursor:pointer;">Reiniciar e Aplicar</button>
      `;
      banner.style.display = 'flex';
      const btn = banner.querySelector('#btnRestartUpdate');
      if (btn) btn.onclick = () => window.api.updateRestartAndInstall();
    }
  });
}

// Atualização em Tempo Real de Leituras do Mapeiro (Mobile / Nuvem → Local)
if (window.api && window.api.onScanNew) {
  window.api.onScanNew((payload) => {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      console.log('[Mapeiro Sync] Novos scans sincronizados:', data);

      // Atualiza os totais e ranking localmente
      if (typeof refreshTotals === 'function') refreshTotals();
      if (typeof refreshState === 'function') refreshState();

      // Se a aba Dashboard estiver visível, atualiza as estatísticas
      const dashTab = document.getElementById('tabDashboard');
      if (dashTab && dashTab.classList.contains('active')) {
        const refreshBtn = document.getElementById('dashRefreshBtn');
        if (refreshBtn) refreshBtn.click();
      }

      // Se o carrossel estiver aberto na visão de empilhadores, atualiza os dados em background
      if (typeof showcaseCollabs !== 'undefined' && showcaseCollabs && showcaseCollabs.length > 0) {
        if (typeof renderShowcaseSlide === 'function') renderShowcaseSlide();
      }
    } catch (e) {
      console.warn('[Mapeiro Sync] Erro no listener onScanNew:', e);
    }
  });
}

// ── Controle Permanente de Foco no Campo de Bipe ─────────────────────────────
function ensureScanInputFocus() {
  const scanInput = document.getElementById('scanInput');
  if (!scanInput) return;
  const active = document.activeElement;
  if (!active || active === document.body || active.tagName === 'DIV' || active.tagName === 'BODY' || active.tagName === 'BUTTON') {
    scanInput.focus();
  }
}

document.addEventListener('click', (e) => {
  if (e.target && !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) {
    ensureScanInputFocus();
  }
});

document.addEventListener('keydown', (e) => {
  const scanInput = document.getElementById('scanInput');
  if (!scanInput) return;
  const active = document.activeElement;
  if (active && active !== scanInput && !['INPUT', 'TEXTAREA'].includes(active.tagName)) {
    scanInput.focus();
  }
});

// ── Módulo de Apresentação de Desempenho dos Colaboradores (Showcase/Rotativo a cada 2 min) ─
let showcaseTimer = null;
let showcaseProgressTimer = null;
let showcaseCollabs = [];
let showcaseIndex = 0;
let showcaseIsPaused = false;
const SLIDE_DURATION_MS = 8000;
let slideStartedAt = Date.now();

async function triggerCollabShowcase(force = false) {
  const overlay = document.getElementById('collabShowcaseOverlay');
  if (!overlay) return;

  // Se não for acionamento manual (F8 ou botão), só roda no painel com leitor desocupado
  if (!force) {
    const scanInput = document.getElementById('scanInput');
    if (!scanInput) return;
    if (scanInput.value && scanInput.value.trim().length > 0) return;
  }

  const stationId = window.stationId || 'st01';
  const roleSelect = document.getElementById('roleSelect');
  const role = roleSelect ? roleSelect.value : 'EMBALADOR';

  try {
    const todaySMs = startOfDayMs(isoDateToday());
    const todayEMs = endOfDayMs(isoDateToday());

    // Busca estatísticas analíticas consolidadas de hoje
    const dsStats = await window.api.dashboardsGetStats({
      stationId,
      startMs: todaySMs,
      endMs: todayEMs
    });

    let collabs = (dsStats && dsStats.collaboratorStats && dsStats.collaboratorStats.length > 0)
      ? [...dsStats.collaboratorStats]
      : [];

    if (collabs.length === 0) {
      // Fallback: se ainda não houver caixas registradas hoje, apresenta lista de colaboradores cadastrados
      const emps = await window.api.employeesList();
      if (emps && emps.length > 0) {
        const isMatchRole = (r) => {
          if (!role || role === 'TODOS' || role === 'AMBOS') return true;
          const rNorm = String(r || '').toUpperCase();
          const roleNorm = String(role).toUpperCase();
          if (rNorm === roleNorm) return true;
          if ((rNorm === 'EMBALADOR' || rNorm === 'PACKER') && (roleNorm === 'EMBALADOR' || roleNorm === 'PACKER')) return true;
          if ((rNorm === 'EMPILHADOR' || rNorm === 'STACKER') && (roleNorm === 'EMPILHADOR' || roleNorm === 'STACKER')) return true;
          return false;
        };

        let matched = emps.filter(e => Number(e.active) === 1 && isMatchRole(e.role));
        if (matched.length === 0) matched = emps.filter(e => Number(e.active) === 1);

        const pTarget = dsStats?.targets?.packer || 100;
        const sTarget = dsStats?.targets?.stacker || 100;

        collabs = matched.map(e => ({
          id: e.id,
          name: e.name,
          role: e.role || 'EMBALADOR',
          photoPath: e.photo_path || '',
          boxes: 0,
          rawBoxes: 0,
          penaltyBoxes: 0,
          errorPct: 0,
          qualityPct: 100,
          yieldPct: 0,
          avgPerHour: 0,
          target: String(e.role || '').toUpperCase().includes('EMP') || String(e.role || '').toUpperCase().includes('STACK') ? sTarget : pTarget
        }));
      }
    }

    if (!collabs || collabs.length === 0) {
      console.warn('Carrossel: Nenhum colaborador encontrado para exibir.');
      return;
    }

    showcaseCollabs = collabs;
    showcaseIndex = 0;
    showcaseIsPaused = false;

    overlay.classList.add('active');
    if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    setupShowcaseControls();
    await renderShowcaseSlide();
    startSlideTimer();
  } catch (err) {
    console.error('Erro ao iniciar showcase:', err);
  }
}
window.triggerCollabShowcase = triggerCollabShowcase;

function startSlideTimer() {
  if (showcaseTimer) clearTimeout(showcaseTimer);
  if (showcaseProgressTimer) clearInterval(showcaseProgressTimer);

  slideStartedAt = Date.now();
  const pBar = document.getElementById('showcaseProgressBar');
  if (pBar) {
    pBar.style.transition = 'none';
    pBar.style.width = '0%';
    void pBar.offsetWidth; // Trigger reflow for transition reset
    if (!showcaseIsPaused) {
      pBar.style.transition = `width ${SLIDE_DURATION_MS}ms linear`;
      pBar.style.width = '100%';
    }
  }

  showcaseTimer = setTimeout(() => {
    if (!showcaseIsPaused) {
      nextShowcaseSlide();
    }
  }, SLIDE_DURATION_MS);
}

async function renderShowcaseSlide() {
  const c = showcaseCollabs[showcaseIndex];
  if (!c) return;

  const total = showcaseCollabs.length;
  const rank = showcaseIndex + 1;

  // 1. Ranking Badge
  const rankBadge = document.getElementById('showcaseRankBadge');
  if (rankBadge) {
    if (rank === 1) {
      rankBadge.textContent = '1º LUGAR NO RANKING';
      rankBadge.style.background = 'rgba(234, 179, 8, 0.18)';
      rankBadge.style.borderColor = '#ca8a04';
      rankBadge.style.color = '#fef08a';
    } else if (rank === 2) {
      rankBadge.textContent = '2º LUGAR NO RANKING';
      rankBadge.style.background = 'rgba(148, 163, 184, 0.15)';
      rankBadge.style.borderColor = '#64748b';
      rankBadge.style.color = '#e2e8f0';
    } else if (rank === 3) {
      rankBadge.textContent = '3º LUGAR NO RANKING';
      rankBadge.style.background = 'rgba(217, 119, 6, 0.18)';
      rankBadge.style.borderColor = '#b45309';
      rankBadge.style.color = '#fdba74';
    } else {
      rankBadge.textContent = `POSIÇÃO #${rank} NO RANKING`;
      rankBadge.style.background = 'rgba(59, 130, 246, 0.15)';
      rankBadge.style.borderColor = 'var(--blue)';
      rankBadge.style.color = '#93c5fd';
    }
  }

  // 2. Contador
  const counter = document.getElementById('showcaseSlideCounter');
  if (counter) counter.textContent = `Colaborador ${rank} de ${total}`;

  // 3. Perfil
  const photo = document.getElementById('showcasePhoto');
  const name = document.getElementById('showcaseName');
  const roleBadge = document.getElementById('showcaseRoleBadge');
  const empIdEl = document.getElementById('showcaseEmpId');
  const targetVal = document.getElementById('showcaseTargetVal');
  const yieldVal = document.getElementById('showcaseYieldVal');

  if (photo) {
    if (c.photoPath) {
      photo.style.backgroundImage = `url("${c.photoPath}")`;
    } else {
      photo.style.backgroundImage = `radial-gradient(circle, #3b82f6 0%, #1e293b 100%)`;
    }
    const qPct = c.qualityPct != null ? c.qualityPct : 100;
    const ringColor = (qPct >= 95) ? 'var(--green)' : ((qPct >= 85) ? 'var(--yellow)' : 'var(--red)');
    photo.style.borderColor = ringColor;
  }
  if (name) name.textContent = c.name || `Colaborador #${c.id}`;
  if (roleBadge) {
    roleBadge.textContent = c.role || 'EMBALADOR';
    roleBadge.className = `badge ${(c.role || '').toLowerCase()}`;
  }
  if (empIdEl) empIdEl.textContent = `#${c.id}`;
  if (targetVal) targetVal.textContent = `${c.target || 100} cx/h`;
  if (yieldVal) {
    yieldVal.textContent = `${c.yieldPct || 0}%`;
    yieldVal.style.color = colorByPct(c.yieldPct);
  }

  // 4. Métricas Principais
  const boxesNet = document.getElementById('showcaseBoxesNet');
  const boxesRaw = document.getElementById('showcaseBoxesRaw');
  const boxesErr = document.getElementById('showcaseBoxesError');
  const errRate = document.getElementById('showcaseErrorRate');
  const qualVal = document.getElementById('showcaseQualityVal');
  const paceVal = document.getElementById('showcasePaceVal');
  const cadVal = document.getElementById('showcaseCadenceVal');
  const totKg = document.getElementById('showcaseTotalKg');
  const totTon = document.getElementById('showcaseTotalTon');

  if (boxesNet) boxesNet.innerHTML = `${c.boxes || 0} <span style="font-size: 12px; font-weight: 400; color: var(--muted);">cx</span>`;
  if (boxesRaw) boxesRaw.textContent = `Bruto: ${c.rawBoxes || c.boxes || 0} cx`;

  const pen = c.penaltyBoxes || 0;
  if (boxesErr) {
    boxesErr.textContent = pen;
    boxesErr.style.color = pen > 0 ? 'var(--red)' : 'var(--muted)';
  }
  if (errRate) errRate.textContent = `Taxa: ${c.errorPct || 0}%`;

  if (qualVal) {
    qualVal.textContent = `${c.qualityPct || 100}%`;
    qualVal.style.color = colorByPct(c.qualityPct);
  }
  if (paceVal) paceVal.innerHTML = `${c.avgPerHour || 0} <span style="font-size: 12px; font-weight: 400; color: var(--muted);">cx/h</span>`;

  // 5. Busca detalhamento rápido de modelos e cadência do colaborador no SQLite
  const stationId = window.stationId || 'st01';
  const todaySMs = startOfDayMs(isoDateToday());
  const todayEMs = endOfDayMs(isoDateToday());

  try {
    const singleStats = await window.api.dashboardsGetStats({
      stationId,
      startMs: todaySMs,
      endMs: todayEMs,
      employeeId: c.id
    });

    const cad = singleStats.avgScanGapSec || 0;
    if (cadVal) {
      cadVal.textContent = cad > 0 ? `${cad}s` : '--';
      cadVal.style.color = cad > 0 && cad < 20 ? 'var(--green)' : 'var(--yellow)';
    }

    const kg = singleStats.totalKg || 0;
    if (totKg) totKg.innerHTML = `${kg.toLocaleString('pt-BR')} <span style="font-size: 12px; font-weight: 400; color: var(--muted);">kg</span>`;
    if (totTon) totTon.textContent = `${(kg / 1000).toFixed(3)} t`;

    const modelsList = document.getElementById('showcaseModelsList');
    if (modelsList) {
      if (singleStats.boxTypeStats && singleStats.boxTypeStats.length > 0) {
        modelsList.innerHTML = singleStats.boxTypeStats.map(b => `
          <span style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.3); color: #93c5fd; font-size: 11px; padding: 4px 10px; border-radius: 8px; font-weight: 600;">
            ${esc(b.label)}: <strong style="color: #fff;">${b.boxes} cx</strong>
          </span>
        `).join('');
      } else {
        modelsList.innerHTML = '<span class="muted" style="font-size: 11px;">Nenhum modelo específico registrado hoje.</span>';
      }
    }
  } catch (err) {
    console.warn('Erro ao carregar detalhe de modelos do colaborador:', err);
  }
}

function nextShowcaseSlide() {
  showcaseIndex++;
  if (showcaseIndex >= showcaseCollabs.length) {
    showcaseIndex = 0; // Loop contínuo: volta para o 1º colocado sem fechar
  }
  renderShowcaseSlide();
  startSlideTimer();
}

function prevShowcaseSlide() {
  showcaseIndex--;
  if (showcaseIndex < 0) showcaseIndex = Math.max(0, showcaseCollabs.length - 1);
  renderShowcaseSlide();
  startSlideTimer();
}

function setupShowcaseControls() {
  const prevBtn = document.getElementById('showcasePrevBtn');
  const nextBtn = document.getElementById('showcaseNextBtn');
  const pauseBtn = document.getElementById('showcasePauseBtn');
  const closeBtn = document.getElementById('showcaseCloseBtn');

  if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); prevShowcaseSlide(); };
  if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); nextShowcaseSlide(); };
  if (closeBtn) closeBtn.onclick = (e) => { e.stopPropagation(); stopCollabShowcase(); };
  if (pauseBtn) {
    pauseBtn.onclick = (e) => {
      e.stopPropagation();
      showcaseIsPaused = !showcaseIsPaused;
      pauseBtn.innerHTML = showcaseIsPaused
        ? '<i data-lucide="play" style="width:14px; height:14px;"></i>'
        : '<i data-lucide="pause" style="width:14px; height:14px;"></i>';
      pauseBtn.title = showcaseIsPaused ? 'Retomar' : 'Pausar';
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    };
  }
  if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
}

function stopCollabShowcase() {
  const overlay = document.getElementById('collabShowcaseOverlay');
  if (overlay) overlay.classList.remove('active');
  if (showcaseTimer) {
    clearTimeout(showcaseTimer);
    showcaseTimer = null;
  }
  if (showcaseProgressTimer) {
    clearInterval(showcaseProgressTimer);
    showcaseProgressTimer = null;
  }
  const pBar = document.getElementById('showcaseProgressBar');
  if (pBar) {
    pBar.style.transition = 'none';
    pBar.style.width = '0%';
  }
  ensureScanInputFocus();
}

// Atalhos de teclado no modo carrossel
document.addEventListener('keydown', (e) => {
  const overlay = document.getElementById('collabShowcaseOverlay');
  const isActive = overlay && overlay.classList.contains('active');

  if (e.key === 'Escape') {
    stopCollabShowcase();
    return;
  }
  if (e.key === 'F8') {
    e.preventDefault();
    if (isActive) stopCollabShowcase();
    else triggerCollabShowcase(true);
    return;
  }
  if (isActive) {
    if (e.key === 'ArrowRight') {
      nextShowcaseSlide();
      return;
    }
    if (e.key === 'ArrowLeft') {
      prevShowcaseSlide();
      return;
    }
    if (e.key === ' ') {
      e.preventDefault();
      showcaseIsPaused = !showcaseIsPaused;
      const pauseBtn = document.getElementById('showcasePauseBtn');
      if (pauseBtn) {
        pauseBtn.innerHTML = showcaseIsPaused
          ? '<i data-lucide="play" style="width:14px; height:14px;"></i>'
          : '<i data-lucide="pause" style="width:14px; height:14px;"></i>';
        if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
      }
      return;
    }
    // IMPORTANTE: Se o leitor de código de barras ou operador digitou qualquer caractere ou Enter,
    // NÃO fecha o carrossel! Mantém o foco no input de leitura do painel para continuar contabilizando
    // caixas e atualizando dados em background.
    const scanInput = document.getElementById('scanInput');
    if (scanInput && document.activeElement !== scanInput) {
      scanInput.focus();
    }
  }
});

const showcaseOverlayEl = document.getElementById('collabShowcaseOverlay');
if (showcaseOverlayEl) {
  showcaseOverlayEl.onclick = (e) => {
    // Não fecha ao clicar fora por acidente — usuário fecha explicitamente no botão [X] ou tecla Esc
  };
}

// Inicia carrossel de desempenho a cada 2 minutos automaticamente no Painel
setInterval(() => {
  const scanInput = document.getElementById('scanInput');
  const overlay = document.getElementById('collabShowcaseOverlay');
  if (scanInput && overlay && !overlay.classList.contains('active')) {
    triggerCollabShowcase();
  }
}, 2 * 60 * 1000);



