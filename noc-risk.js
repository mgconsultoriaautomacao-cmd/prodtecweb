/* ══════════════════════════════════════════════════════════════════
   PRODTECH NOC FITOSSANITÁRIO — CAMADA RISCO AGROCLIMÁTICO (noc-risk.js)
   Topografia e Meteorologia Pública (Open-Meteo & OpenTopoMap) sem drone
   Sem alteração de lógica, cálculos do Supabase nem dependências externas
   ══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // Configurações e endpoints públicos
  const NOC_TOPO_TILE_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
  const NOC_TOPO_ATTR = 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)';
  const NOC_ELEVATION_API = 'https://api.open-meteo.com/v1/elevation';
  const NOC_WEATHER_API = 'https://api.open-meteo.com/v1/forecast';

  /**
   * REGRAS FITOSSANITÁRIAS AGROCLIMÁTICAS
   * Parâmetros e limiares de referência agroclimática inicial — a calibrar
   * e validar com o responsável técnico agrônomo da fazenda.
   */
  const NOC_RISK_RULES = {
    mosca_branca: {
      name: 'Mosca Branca',
      tempOptimaMin: 25,
      tempOptimaMax: 34,
      umidadeMaxFavoravel: 65, // Clima seco e quente favorece proliferação
      chuvaInibidora: 10,       // Chuva intensa reduz população
      pesoTerreno: 0.15,        // Topos e áreas ventiladas
      desc: 'Temperaturas elevadas e baixa umidade aceleram o ciclo biológico de ninfas e adultos.'
    },
    minadora: {
      name: 'Larva Minadora',
      tempOptimaMin: 24,
      tempOptimaMax: 32,
      umidadeMaxFavoravel: 70,
      chuvaInibidora: 15,
      pesoTerreno: 0.10,
      desc: 'Clima seco e quente prolongado estimula postura foliar intensa.'
    },
    pulgao: {
      name: 'Pulgão',
      tempOptimaMin: 20,
      tempOptimaMax: 28,
      umidadeMaxFavoravel: 75,
      chuvaInibidora: 12,
      pesoTerreno: 0.15,
      desc: 'Temperaturas moderadas e ausência de chuvas fortes favorecem colônias.'
    },
    diafania: {
      name: 'Diafânia',
      tempOptimaMin: 24,
      tempOptimaMax: 30,
      umidadeMaxFavoravel: 80,
      chuvaInibidora: 25,
      pesoTerreno: 0.10,
      desc: 'Desenvolve-se em clima quente com noites úmidas.'
    },
    trips: {
      name: 'Trips',
      tempOptimaMin: 25,
      tempOptimaMax: 33,
      umidadeMaxFavoravel: 60,
      chuvaInibidora: 8,
      pesoTerreno: 0.20,
      desc: 'Períodos de estiagem e vento moderado aceleram a dispersão floral.'
    },
    oidio: {
      name: 'Oídio',
      tempOptimaMin: 20,
      tempOptimaMax: 28,
      umidadeMinFavoravel: 50,
      umidadeMaxFavoravel: 80,
      chuvaInibidora: 20, // Chuva pesada lava conídios, mas umidade relativa alta estimula
      pesoTerreno: 0.15,
      desc: 'Dias secos com noites de alta umidade relativa estimulam a esporulação.'
    },
    cancro: {
      name: 'Cancro Gomoso',
      tempOptimaMin: 23,
      tempOptimaMax: 30,
      umidadeMinFavoravel: 75, // Fungo favorecido por alta umidade e molhamento
      chuvaFavoravel: 5,
      pesoTerreno: 0.25,        // Baixadas úmidas aumentam severidade
      desc: 'Alta umidade e molhamento foliar prolongado nas baixadas favorecem infecção.'
    },
    mildio: {
      name: 'Míldio',
      tempOptimaMin: 18,
      tempOptimaMax: 25,
      umidadeMinFavoravel: 80,
      chuvaFavoravel: 5,
      pesoTerreno: 0.30,        // Baixadas com neblina/orvalho persistente
      desc: 'Exige filme de água livre na folha e noites amenas com alta umidade.'
    },
    viroses: {
      name: 'Viroses',
      tempOptimaMin: 25,
      tempOptimaMax: 34,
      umidadeMaxFavoravel: 65,
      pesoTerreno: 0.15,
      desc: 'Risco diretamente correlacionado à atividade dos insetos vetores.'
    },
    ALL: {
      name: 'Visão Geral Fitossanitária',
      tempOptimaMin: 22,
      tempOptimaMax: 32,
      umidadeMinFavoravel: 45,
      umidadeMaxFavoravel: 80,
      pesoTerreno: 0.15,
      desc: 'Média ponderada do ambiente agroclimático para o complexo de pragas da safra.'
    }
  };

  // Caches locais (em memória e persistidos)
  const elevationCache = new Map();
  const weatherCache = new Map();
  let nocTopoLayer = null;
  let nocRiskPolygonsLayer = null;

  /**
   * Recupera altitude (m) via cache ou Open-Meteo Elevation API
   */
  async function fetchElevation(lat, lng) {
    try {
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
      const key = `${parseFloat(lat).toFixed(4)}_${parseFloat(lng).toFixed(4)}`;

      if (elevationCache.has(key)) return elevationCache.get(key);

      const lsVal = localStorage.getItem(`noc_elev_${key}`);
      if (lsVal !== null) {
        const parsed = parseFloat(lsVal);
        elevationCache.set(key, parsed);
        return parsed;
      }

      const res = await fetch(`${NOC_ELEVATION_API}?latitude=${lat}&longitude=${lng}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.elevation && data.elevation.length > 0) {
        const alt = Math.round(data.elevation[0]);
        elevationCache.set(key, alt);
        try { localStorage.setItem(`noc_elev_${key}`, String(alt)); } catch(e){}
        return alt;
      }
    } catch (e) {
      console.warn('[NOC-RISK] Erro ao buscar elevação:', e.message);
    }
    return null;
  }

  /**
   * Recupera dados meteorológicos (passado recente + previsão 3 dias) na Open-Meteo
   */
  async function fetchWeatherData(lat, lng, daysBack) {
    try {
      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
      const dBack = Math.min(30, Math.max(7, parseInt(daysBack, 10) || 14));
      const todayStr = new Date().toISOString().split('T')[0];
      const key = `${parseFloat(lat).toFixed(3)}_${parseFloat(lng).toFixed(3)}_${todayStr}_${dBack}`;

      if (weatherCache.has(key)) return weatherCache.get(key);

      const lsVal = localStorage.getItem(`noc_weather_${key}`);
      if (lsVal) {
        try {
          const parsed = JSON.parse(lsVal);
          weatherCache.set(key, parsed);
          return parsed;
        } catch(e){}
      }

      const url = `${NOC_WEATHER_API}?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean,precipitation_sum,wind_speed_10m_max&past_days=${dBack}&forecast_days=3&timezone=America/Fortaleza`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();

      if (data && data.daily) {
        weatherCache.set(key, data.daily);
        try { localStorage.setItem(`noc_weather_${key}`, JSON.stringify(data.daily)); } catch(e){}
        return data.daily;
      }
    } catch (e) {
      console.warn('[NOC-RISK] Clima indisponível (Open-Meteo):', e.message);
    }
    return null;
  }

  /**
   * Função pura: calcula índice de risco agroclimático (0 a 100)
   */
  function calculateAgroclimaticRisk(weather, rule, elevation) {
    try {
      if (!weather || !weather.temperature_2m_max || weather.temperature_2m_max.length === 0) {
        return { index: 45, level: 'moderado', factors: [], forecastRiskIncrease: false };
      }

      const totalDays = weather.temperature_2m_max.length;
      const histDays = Math.max(1, totalDays - 3);

      // Médias dos dias passados
      const histTemps = weather.temperature_2m_max.slice(0, histDays);
      const histHumid = weather.relative_humidity_2m_mean.slice(0, histDays);
      const histRain = weather.precipitation_sum.slice(0, histDays);

      const avgTemp = histTemps.reduce((a, b) => a + (b || 0), 0) / histTemps.length;
      const avgHumid = histHumid.reduce((a, b) => a + (b || 0), 0) / histHumid.length;
      const totalRain = histRain.reduce((a, b) => a + (b || 0), 0);

      // Previsão próximos 3 dias
      const forecastTemps = weather.temperature_2m_max.slice(histDays);
      const forecastHumid = weather.relative_humidity_2m_mean.slice(histDays);
      const avgForecastTemp = forecastTemps.length > 0 ? (forecastTemps.reduce((a, b) => a + (b || 0), 0) / forecastTemps.length) : avgTemp;
      const avgForecastHumid = forecastHumid.length > 0 ? (forecastHumid.reduce((a, b) => a + (b || 0), 0) / forecastHumid.length) : avgHumid;

      let score = 25; // Base
      const factors = [];

      // 1. Fator Temperatura
      if (avgTemp >= rule.tempOptimaMin && avgTemp <= rule.tempOptimaMax) {
        score += 30;
        factors.push({ name: `Temperatura média favorável (${avgTemp.toFixed(1)} °C)`, points: '+30' });
      } else if (Math.abs(avgTemp - rule.tempOptimaMin) < 3 || Math.abs(avgTemp - rule.tempOptimaMax) < 3) {
        score += 15;
        factors.push({ name: `Temperatura próxima à faixa ideal (${avgTemp.toFixed(1)} °C)`, points: '+15' });
      }

      // 2. Fator Umidade / Molhamento
      if (rule.umidadeMaxFavoravel && avgHumid <= rule.umidadeMaxFavoravel) {
        score += 25;
        factors.push({ name: `Umidade propícia para pragas secas (${avgHumid.toFixed(0)}%)`, points: '+25' });
      } else if (rule.umidadeMinFavoravel && avgHumid >= rule.umidadeMinFavoravel) {
        score += 30;
        factors.push({ name: `Alta umidade / molhamento foliar (${avgHumid.toFixed(0)}%)`, points: '+30' });
      }

      // 3. Fator Chuva
      if (rule.chuvaInibidora && totalRain > rule.chuvaInibidora) {
        score -= 20;
        factors.push({ name: `Precipitação inibidora acumulada (${totalRain.toFixed(1)} mm)`, points: '-20' });
      } else if (rule.chuvaFavoravel && totalRain >= rule.chuvaFavoravel) {
        score += 15;
        factors.push({ name: `Chuvas recentes ativando infecção (${totalRain.toFixed(1)} mm)`, points: '+15' });
      }

      // 4. Fator Topográfico
      if (elevation !== null && elevation !== undefined) {
        if (elevation < 60) {
          // Baixada relativa (típica do RN / Ceará para cancro e míldio)
          if (rule.umidadeMinFavoravel) {
            score += 10;
            factors.push({ name: `Baixada topográfica (${elevation} m) acumula umidade`, points: '+10' });
          }
        } else {
          if (rule.umidadeMaxFavoravel) {
            score += 8;
            factors.push({ name: `Altitude/ventilação (${elevation} m) favorece dispersão`, points: '+8' });
          }
        }
      }

      score = Math.max(5, Math.min(95, score));

      // Avaliar tendência da previsão (próximos 3 dias)
      let forecastScore = score;
      if (avgForecastTemp >= rule.tempOptimaMin && avgForecastTemp <= rule.tempOptimaMax) {
        forecastScore += 10;
      }
      const forecastRiskIncrease = forecastScore > score;

      let level = 'baixo';
      if (score >= 70) level = 'alto';
      else if (score >= 40) level = 'moderado';

      return {
        index: Math.round(score),
        level: level,
        factors: factors,
        forecastRiskIncrease: forecastRiskIncrease,
        avgTemp: avgTemp,
        avgHumid: avgHumid,
        totalRain: totalRain
      };
    } catch (e) {
      return { index: 40, level: 'moderado', factors: [], forecastRiskIncrease: false };
    }
  }

  /**
   * Renderiza a camada de risco agroclimático sobre os polígonos no mapa
   */
  async function renderAgroclimaticRiskLayer(mips) {
    try {
      if (!window.nocMap) return;

      const riskToggle = document.getElementById('nocToggleRisk');
      const isEnabled = riskToggle && riskToggle.checked;

      if (!nocRiskPolygonsLayer) {
        nocRiskPolygonsLayer = L.layerGroup().addTo(window.nocMap);
      }
      nocRiskPolygonsLayer.clearLayers();

      if (!isEnabled) {
        updateRiskCard(null);
        return;
      }

      const selPraga = document.getElementById('nocFilterPraga')?.value || 'ALL';
      const selPeriodo = document.getElementById('nocFilterPeriodo')?.value || '15';
      const rule = NOC_RISK_RULES[selPraga] || NOC_RISK_RULES.ALL;

      const parcels = (window.webInfoParcelasData && window.webInfoParcelasData.length > 0)
        ? window.webInfoParcelasData
        : (window._infoParcelas || []);

      const anchor = window.NOC_DEFAULT_FARM_ANCHOR || { lat: -5.192, lng: -37.345 };
      const farmWeather = await fetchWeatherData(anchor.lat, anchor.lng, selPeriodo);

      const parcelsByNum = {};
      parcels.forEach(p => {
        const num = typeof window.nocParcelNum === 'function' ? window.nocParcelNum(p.parcela2 || p.parcela || p.code || p.id) : (p.parcela2 || p.parcela || '');
        if (!num) return;
        if (!parcelsByNum[num]) parcelsByNum[num] = [];
        parcelsByNum[num].push(p);
      });

      if (window.PARCELAS_COORDS) {
        Object.keys(window.PARCELAS_COORDS).forEach(num => {
          if (!parcelsByNum[num]) parcelsByNum[num] = [{ parcela: num, parcela2: num }];
        });
      }

      const pNums = Object.keys(parcelsByNum);
      for (let idx = 0; idx < pNums.length; idx++) {
        const pNum = pNums[idx];
        const items = parcelsByNum[pNum];
        let coords = null;
        for (let it of items) {
          if (typeof window.nocParcelCoords === 'function') {
            coords = window.nocParcelCoords(it);
            if (coords) break;
          }
        }
        if (!coords && window.PARCELAS_COORDS && window.PARCELAS_COORDS[pNum]) {
          coords = window.PARCELAS_COORDS[pNum];
        }
        if (!coords) continue; // Pula parcelas sem coordenada

        const pLat = coords.lat;
        const pLng = coords.lng;

        const elev = await fetchElevation(pLat, pLng);
        const risk = calculateAgroclimaticRisk(farmWeather, rule, elev);

        if (!highestRiskObj || risk.index > highestRiskObj.index) {
          highestRiskObj = risk;
          highestRiskParcel = { code: pNum, lat: pLat, lng: pLng, elev: elev, risk: risk };
        }

        const color = risk.level === 'alto' ? '#ef4444' : (risk.level === 'moderado' ? '#f59e0b' : '#10b981');
        const activeCycle = items.find(x => x.ativo !== false) || items[items.length - 1];
        const areaHa = parseFloat(activeCycle.area || activeCycle.area_ha || 0);

        let halfH = 0.0014;
        let halfW = 0.0016;
        if (areaHa > 0) {
          const sideM = Math.sqrt(areaHa * 10000);
          halfH = (sideM / 2) / 111320;
          const radLat = (pLat * Math.PI) / 180;
          const cosLat = Math.max(0.1, Math.cos(radLat));
          halfW = (sideM / 2) / (111320 * cosLat);
        }

        const bounds = [
          [pLat - halfH, pLng - halfW],
          [pLat + halfH, pLng + halfW]
        ];

        const rect = L.rectangle(bounds, {
          color: color,
          weight: 2,
          fillColor: color,
          fillOpacity: 0.25,
          dashArray: '4, 4'
        });

        rect.bindTooltip(`
          <div style="font-family:ui-monospace,monospace; font-size:11px">
            <b>Parcela ${pNum}</b> · Risco: <span style="color:${color}; font-weight:700">${risk.index}/100 (${risk.level.toUpperCase()})</span>
            ${elev ? `<br>Altitude: ${elev} m` : ''}
          </div>
        `, { direction: 'top' });

        rect.addTo(nocRiskPolygonsLayer);

        const parcelMips = (mips || window.nocMips || []).filter(m => {
          const mNum = typeof window.nocParcelNum === 'function' ? window.nocParcelNum(m.parcela) : m.parcela;
          return mNum === pNum;
        });
        if (parcelMips.length > 0) {
          const hasInfestation = parcelMips.some(m => (parseFloat(m.media) || 0) > 0);
          validationSamples.push({
            pCode: pNum,
            riskLevel: risk.level,
            hasInfestation: hasInfestation
          });
        }
      }

      // Atualizar o card de fatores de risco com a parcela de maior risco ou geral
      updateRiskCard(highestRiskParcel, farmWeather, rule);

      // Atualizar painel de validação
      updateValidationPanel(validationSamples);

    } catch (e) {
      console.error('[NOC-RISK] Erro ao renderizar camada de risco:', e);
    }
  }

  /**
   * Atualiza o Card lateral de "Fatores de Risco"
   */
  function updateRiskCard(parcelObj, weather, rule) {
    try {
      const cardEl = document.getElementById('nocRiskFactorsCard');
      if (!cardEl) return;

      if (!parcelObj || !parcelObj.risk) {
        cardEl.style.display = 'none';
        return;
      }

      cardEl.style.display = 'block';
      const risk = parcelObj.risk;
      const color = risk.level === 'alto' ? 'var(--noc-red)' : (risk.level === 'moderado' ? 'var(--noc-amber)' : 'var(--noc-green)');
      const badgeBg = risk.level === 'alto' ? 'var(--noc-red-bg)' : (risk.level === 'moderado' ? 'var(--noc-amber-bg)' : 'var(--noc-green-bg)');
      const badgeBorder = risk.level === 'alto' ? 'var(--noc-red-border)' : (risk.level === 'moderado' ? 'var(--noc-amber-border)' : 'var(--noc-green-border)');

      const factorsHtml = (risk.factors && risk.factors.length > 0)
        ? risk.factors.map(f => `
            <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; padding:3px 0; border-bottom:1px solid var(--noc-border-subtle)">
              <span style="color:var(--noc-muted)">${f.name}</span>
              <span style="font-family:var(--noc-mono); font-weight:700; color:var(--noc-text)">${f.points}</span>
            </div>
          `).join('')
        : `<div style="font-size:11px; color:var(--noc-muted)">Condições meteorológicas estáveis no período.</div>`;

      const forecastBadge = risk.forecastRiskIncrease
        ? `<div style="margin-top:8px; padding:6px 8px; border-radius:4px; background:var(--noc-amber-bg); border:1px solid var(--noc-amber-border); font-size:10.5px; color:var(--noc-amber); font-weight:600; display:flex; align-items:center; gap:6px">
             <i data-lucide="sun-medium" style="width:13px;height:13px"></i>
             Condições favoráveis à proliferação nos próximos 3 dias
           </div>`
        : '';

      cardEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px">
          <span style="font-size:11px; text-transform:uppercase; letter-spacing:0.06em; font-weight:700; color:var(--noc-muted)">
            Fatores de Risco Agroclimático
          </span>
          <span class="noc-risk-badge" style="background:${badgeBg}; border:1px solid ${badgeBorder}; color:${color}">
            Índice ${risk.index}/100 · ${risk.level.toUpperCase()}
          </span>
        </div>

        <div style="font-size:11px; margin-bottom:6px">
          <b>Parcela ${parcelObj.code}</b> · Alvo: <i>${(rule && rule.name) || 'Geral'}</i>
          ${parcelObj.elev ? ` · ALT ${parcelObj.elev} m` : ''}
        </div>

        <div class="noc-risk-bar">
          <div class="noc-risk-bar-fill" style="width:${risk.index}%; background:${color}"></div>
        </div>

        <div style="display:flex; flex-direction:column; gap:2px; margin-top:6px">
          ${factorsHtml}
        </div>

        ${forecastBadge}
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.warn('[NOC-RISK] Erro ao atualizar card de fatores:', e);
    }
  }

  /**
   * Atualiza painel de validação: Risco Previsto vs. Infestação Observada
   */
  function updateValidationPanel(samples) {
    try {
      const panelEl = document.getElementById('nocValidationPanel');
      if (!panelEl) return;

      if (!samples || samples.length < 10) {
        panelEl.innerHTML = `
          <div style="padding:10px; border-radius:4px; background:var(--noc-card-item); border:1px solid var(--noc-border-subtle); font-size:11px; color:var(--noc-muted); display:flex; align-items:center; gap:8px">
            <i data-lucide="info" style="width:14px;height:14px; color:var(--noc-accent)"></i>
            <span>Amostra insuficiente para validar correlação (< 10 vistorias no período).</span>
          </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      // Calcular acertos
      let hits = 0;
      samples.forEach(s => {
        if ((s.riskLevel === 'alto' && s.hasInfestation) || (s.riskLevel === 'baixo' && !s.hasInfestation)) {
          hits++;
        }
      });
      const accuracy = Math.round((hits / samples.length) * 100);

      panelEl.innerHTML = `
        <div style="padding:10px; border-radius:4px; background:var(--noc-card-item); border:1px solid var(--noc-border-subtle); font-size:11px">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
            <span style="font-weight:700; text-transform:uppercase; font-size:10.5px; color:var(--noc-muted)">
              Validação Risco Previsto × Infestação Real
            </span>
            <span style="font-family:var(--noc-mono); font-weight:700; color:var(--noc-accent)">${accuracy}% Correlação</span>
          </div>
          <div style="color:var(--noc-muted)">
            Base de amostragem: <b>${samples.length}</b> parcelas verificadas no período.
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();
    } catch (e) {
      console.warn('[NOC-RISK] Erro ao atualizar painel de validação:', e);
    }
  }

  /**
   * Integração com switchNocBaseTileLayer para suporte a Topográfico (OpenTopoMap)
   */
  function setupTopoTileSupport() {
    try {
      const origSwitch = window.switchNocBaseTileLayer;
      window.switchNocBaseTileLayer = function (type) {
        try {
          if (type === 'topo') {
            if (window.nocCurrentBaseLayer && window.nocMap) {
              window.nocMap.removeLayer(window.nocCurrentBaseLayer);
            }
            if (!nocTopoLayer) {
              nocTopoLayer = L.tileLayer(NOC_TOPO_TILE_URL, {
                maxZoom: 17,
                attribution: NOC_TOPO_ATTR
              });
            }
            window.nocCurrentBaseLayer = nocTopoLayer.addTo(window.nocMap);
            return;
          }
        } catch (e) {}

        if (typeof origSwitch === 'function') {
          origSwitch(type);
        }
      };
    } catch (e) {}
  }

  /**
   * Hook em renderNocMapAndLayers para atualizar a camada de risco agroclimático
   */
  function setupRenderHook() {
    try {
      if (window.renderNocMapAndLayers && !window.renderNocMapAndLayers._nocRiskHooked) {
        const origRender = window.renderNocMapAndLayers;
        window.renderNocMapAndLayers = function (mipsInput) {
          try {
            origRender.apply(this, arguments);
            renderAgroclimaticRiskLayer(mipsInput || window.nocMips);
          } catch (err) {
            console.error('[NOC-RISK] Erro no render hook:', err);
          }
        };
        window.renderNocMapAndLayers._nocRiskHooked = true;
      }
    } catch (e) {}
  }

  // Inicialização
  function initNocRisk() {
    try {
      setupTopoTileSupport();
      setupRenderHook();

      const riskToggle = document.getElementById('nocToggleRisk');
      if (riskToggle) {
        riskToggle.addEventListener('change', function () {
          renderAgroclimaticRiskLayer();
        });
      }

      // Adicionar altitude ao HUD ao mover mouse se disponível
      if (window.nocMap) {
        window.nocMap.on('mousemove', async function (e) {
          try {
            const hudAlt = document.getElementById('nocHudAlt');
            if (hudAlt && e.latlng) {
              const alt = await fetchElevation(e.latlng.lat, e.latlng.lng);
              if (alt !== null) {
                hudAlt.textContent = `ALT ${alt} m`;
                hudAlt.style.display = 'inline';
              } else {
                hudAlt.style.display = 'none';
              }
            }
          } catch (err) {}
        });
      }
    } catch (e) {
      console.error('[NOC-RISK] Erro de inicialização:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNocRisk);
  } else {
    initNocRisk();
  }
})();
