/* ══════════════════════════════════════════════════════════════════
   PRODTECH NOC FITOSSANITÁRIO — UI CONTROLLER (noc-ui.js)
   Padrão Sala de Controle / Mission Control Internacional (em Português)
   Sem alteração de lógica ou cálculos de negócio. Apenas apresentação.
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // 1. Constante de formatação internacional (PT-BR + ISO / SI + Fuso Brasil)
  window.NOC_FORMAT = {
    locale: 'pt-BR',
    timeZone: 'America/Fortaleza', // UTC-03:00 Fuso Oficial do Brasil

    /**
     * Formata número com ponto decimal e espaço fino como separador de milhar.
     * Exemplo: 12345.67 -> "12 345.7"
     */
    formatNumber: function (val, decimals) {
      try {
        if (val === null || val === undefined || isNaN(val)) return '—';
        const num = parseFloat(val);
        const dec = decimals !== undefined ? decimals : 1;
        const parts = num.toFixed(dec).split('.');
        // Adiciona espaço fino (U+202F) como separador de milhar
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
        return parts.join('.');
      } catch (e) {
        return String(val);
      }
    },

    /**
     * Formata coordenadas em graus decimais (WGS 84) com 5 casas decimais
     */
    formatCoord: function (val) {
      try {
        if (val === null || val === undefined || isNaN(val)) return '—';
        const num = parseFloat(val);
        const sign = num >= 0 ? '+' : '';
        return sign + num.toFixed(5);
      } catch (e) {
        return '—';
      }
    },

    /**
     * Formata data/hora em 24h rigorosamente no fuso oficial America/Fortaleza
     * Retorno: "AAAA-MM-DD HH:mm:ss"
     */
    formatDateTime: function (dateInput) {
      try {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
        const dtf = new Intl.DateTimeFormat('en-CA', {
          timeZone: this.timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const parts = dtf.formatToParts(d).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
        return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
      } catch (e) {
        return String(dateInput);
      }
    },

    /**
     * Retorna apenas a hora no fuso America/Fortaleza: "HH:mm:ss"
     */
    formatTime: function (dateInput) {
      try {
        const d = dateInput instanceof Date ? dateInput : new Date(dateInput || Date.now());
        const dtf = new Intl.DateTimeFormat('pt-BR', {
          timeZone: this.timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        return dtf.format(d);
      } catch (e) {
        return '--:--:--';
      }
    },

    /**
     * Formata tempo relativo em segundos: "há 42 s", "há 3 min"
     */
    formatRelativeTime: function (seconds) {
      if (seconds < 5) return 'agora';
      if (seconds < 60) return `há ${seconds} s`;
      const mins = Math.floor(seconds / 60);
      if (mins < 60) return `há ${mins} min`;
      const hours = Math.floor(mins / 60);
      return `há ${hours} h`;
    },

    /**
     * Formata percentual com ponto decimal e sem espaço antes de %
     */
    formatPercent: function (val, decimals) {
      if (val === null || val === undefined || isNaN(val)) return '— %';
      return `${this.formatNumber(val, decimals !== undefined ? decimals : 1)}%`;
    }
  };

  // Estado do controlador UI
  let lastSyncTimestamp = Date.now();
  let uiTimerId = null;

  function updateStatusClock() {
    try {
      const clockEl = document.getElementById('nocStatusClock');
      if (clockEl) {
        const now = new Date();
        const timeStr = window.NOC_FORMAT.formatTime(now);
        clockEl.textContent = `${timeStr} (UTC-03:00)`;
      }

      // Atualizar tempo relativo de sincronização
      const syncEl = document.getElementById('nocStatusSync');
      const indEl = document.getElementById('nocStatusIndicator');
      if (syncEl) {
        const diffSec = Math.max(0, Math.floor((Date.now() - lastSyncTimestamp) / 1000));
        syncEl.textContent = `Última sincronização: ${window.NOC_FORMAT.formatRelativeTime(diffSec)}`;

        // Se passar de 5 minutos (300s), marca como desatualizado
        if (indEl) {
          if (diffSec > 300) {
            indEl.className = 'noc-live-indicator stale';
            indEl.innerHTML = '<span class="noc-live-dot"></span> DESATUALIZADO';
          } else {
            indEl.className = 'noc-live-indicator';
            indEl.innerHTML = '<span class="noc-live-dot"></span> AO VIVO';
          }
        }
      }

      // Atualizar resumo do filtro na status bar
      updateFilterSummary();

      // Monitorar criticidade para alerta pulsante no card
      updateCriticalAlertGlow();

    } catch (err) {
      console.warn('[NOC-UI] Erro ao atualizar status bar:', err);
    }
  }

  function updateFilterSummary() {
    try {
      const summaryEl = document.getElementById('nocFilterSummary');
      if (!summaryEl) return;

      const pSel = document.getElementById('nocFilterPeriodo');
      const pragaSel = document.getElementById('nocFilterPraga');

      const periodText = pSel && pSel.selectedIndex >= 0 ? pSel.options[pSel.selectedIndex].text : '15 dias';
      const pragaText = pragaSel && pragaSel.selectedIndex >= 0 ? pragaSel.options[pragaSel.selectedIndex].text : 'Geral';

      summaryEl.innerHTML = `Janela: <b>${escapeHtml(periodText)}</b> · Alvo: <b>${escapeHtml(pragaText.split('(')[0].trim())}</b>`;
    } catch (e) {}
  }

  function updateCriticalAlertGlow() {
    try {
      const critEl = document.getElementById('nocKpiAlertasCriticos');
      const cardEl = document.getElementById('nocKpiAlertasCriticosCard');
      if (!critEl || !cardEl) return;

      const val = parseInt(critEl.textContent || '0', 10);
      if (!isNaN(val) && val > 0) {
        cardEl.classList.add('has-critical');
      } else {
        cardEl.classList.remove('has-critical');
      }
    } catch (e) {}
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Alternador do Modo TV
  window.toggleNocTvMode = function () {
    try {
      const isTv = document.body.classList.toggle('noc-tv-mode');
      const btn = document.getElementById('nocTvModeBtn');
      if (btn) {
        btn.innerHTML = isTv 
          ? '<i data-lucide="minimize-2" style="width:13px;height:13px"></i> Sair do Modo TV'
          : '<i data-lucide="tv" style="width:13px;height:13px"></i> Modo TV';
      }

      if (window.nocMap) {
        setTimeout(function () {
          window.nocMap.invalidateSize();
        }, 300);
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error('[NOC-UI] Erro ao alternar Modo TV:', e);
    }
  };

  // Sincronizar estilo dos chips de toggle (pill buttons)
  window.syncNocToggleChips = function () {
    try {
      const toggles = [
        { id: 'nocTogglePoints', chipId: 'nocChipPoints' },
        { id: 'nocToggleHeatmap', chipId: 'nocChipHeatmap' },
        { id: 'nocToggleParcels', chipId: 'nocChipParcels' },
        { id: 'nocToggleElevation', chipId: 'nocChipElevation' },
        { id: 'nocToggleRisk', chipId: 'nocChipRisk' }
      ];

      toggles.forEach(t => {
        const inp = document.getElementById(t.id);
        const chip = document.getElementById(t.chipId);
        if (inp && chip) {
          if (inp.checked) {
            chip.classList.add('active');
          } else {
            chip.classList.remove('active');
          }
        }
      });
    } catch (e) {}
  };

  // Ajustar filtro escuro do OSM quando selecionado
  function handleTileLayerFilter(layerType) {
    try {
      const mapContainer = document.getElementById('nocMapCardContainer');
      if (!mapContainer) return;

      if (layerType === 'osm') {
        mapContainer.classList.add('noc-osm-active');
        const tilePane = mapContainer.querySelector('.leaflet-tile-pane');
        if (tilePane) tilePane.classList.add('noc-osm-dark-tiles');
      } else {
        mapContainer.classList.remove('noc-osm-active');
        const tilePane = mapContainer.querySelector('.leaflet-tile-pane');
        if (tilePane) tilePane.classList.remove('noc-osm-dark-tiles');
      }
    } catch (e) {}
  }

  // Interceptar mudança de camada base para aplicar filtro dark em OSM
  const origSwitchNocBaseTileLayer = window.switchNocBaseTileLayer;
  window.switchNocBaseTileLayer = function (type) {
    try {
      handleTileLayerFilter(type);
      if (typeof origSwitchNocBaseTileLayer === 'function') {
        origSwitchNocBaseTileLayer(type);
      }
    } catch (e) {
      console.error('[NOC-UI] Erro em switchNocBaseTileLayer:', e);
    }
  };

  // Interceptar loadNocData para resetar tempo de sincronização
  function hookLoadNocData() {
    try {
      if (window.loadNocData && !window.loadNocData._nocUiHooked) {
        const origLoad = window.loadNocData;
        window.loadNocData = async function () {
          try {
            await origLoad.apply(this, arguments);
            lastSyncTimestamp = Date.now();
            updateStatusClock();
            window.syncNocToggleChips();
          } catch (err) {
            console.error('[NOC-UI] Erro capturado no hook de loadNocData:', err);
          }
        };
        window.loadNocData._nocUiHooked = true;
      }
    } catch (e) {}
  }

  // Inicialização do módulo de UI
  function initNocUi() {
    try {
      // Iniciar relógio da status bar
      updateStatusClock();
      if (!uiTimerId) {
        uiTimerId = setInterval(updateStatusClock, 1000);
      }

      // Adicionar listeners para os inputs de toggle sincronizarem os chips
      ['nocTogglePoints', 'nocToggleHeatmap', 'nocToggleParcels', 'nocToggleElevation', 'nocToggleRisk'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', window.syncNocToggleChips);
        }
      });
      window.syncNocToggleChips();

      // Interceptar loadNocData
      hookLoadNocData();

      // Adicionar listener ao select de camada base
      const tileSel = document.getElementById('nocTileLayerSelect');
      if (tileSel) {
        tileSel.addEventListener('change', function () {
          handleTileLayerFilter(this.value);
        });
      }

      // Adicionar listener ao select de praga e período para atualizar resumo
      const pSel = document.getElementById('nocFilterPeriodo');
      const pragaSel = document.getElementById('nocFilterPraga');
      if (pSel) pSel.addEventListener('change', updateFilterSummary);
      if (pragaSel) pragaSel.addEventListener('change', updateFilterSummary);

      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.error('[NOC-UI] Falha na inicialização:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNocUi);
  } else {
    initNocUi();
  }
})();
