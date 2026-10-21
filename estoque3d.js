/* PRODTECH — estoque3d.js (v2.0 — Digital Twin Industrial 3D)
   Visão 3D Avançada do Estoque (Packing House + Câmara Fria).
   Totalmente manipulável: OrbitControls com amortecimento fluido, Pan com botão direito / dois dedos,
   Zoom suave, presets de câmera (3D, Top-down/Planta Baixa, Focar Packing, Focar Câmara),
   tooltips em tempo real ao passar o mouse (raycasting), busca rápida de pallets, filtros por status,
   modo tela cheia e estética industrial premium (iluminação PBR, paletes detalhados, caixas empilhadas,
   marcações de piso epóxi e paredes translúcidas de câmara fria). */

(function () {
  'use strict';

  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';

  // Dimensões físicas dos slots e paletes
  var SX = 2.2, SZ = 2.0;         // Espaçamento do slot X e Z
  var PW = 1.35, PD = 1.10;       // Dimensões da base do palete
  var H0 = 0.14, BH = 0.24;       // Altura da madeira e altura de cada camada de caixas

  // Cores de status industriais
  var STATUS_COLORS = {
    forming: { hex: 0x38bdf8, css: '#38bdf8', label: 'Em Formação', bg: 'rgba(56,189,248,0.18)' },
    closed: { hex: 0x22c55e, css: '#22c55e', label: 'Fechado', bg: 'rgba(34,197,94,0.18)' },
    labeled: { hex: 0xf59e0b, css: '#f59e0b', label: 'Etiquetado', bg: 'rgba(245,158,11,0.18)' },
    dispatching: { hex: 0xa855f7, css: '#a855f7', label: 'Expedição', bg: 'rgba(168,85,247,0.18)' }
  };

  // Estado global do subsistema 3D
  var S = {
    visible: false,
    first: true,
    filter: 'all',
    searchQuery: '',
    geo: {},
    mat: null,
    palletsList: [],
    hoveredPallet: null,
    animatingCam: false,
    isFullscreen: false,
    zoneBounds: { cx: 0, cz: 0, maxD: 0, xEnd: 0, packingCenter: null, coldCenter: null }
  };

  function el(tag, css, html) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function loadScripts() {
    return new Promise(function (resolve, reject) {
      function loadOrbit() {
        if (window.THREE && window.THREE.OrbitControls) return resolve();
        var s2 = document.createElement('script');
        s2.src = ORBIT_URL;
        s2.onload = function () { resolve(); };
        s2.onerror = function () {
          console.warn('[estoque3d] OrbitControls CDN falhou, usando controles nativos.');
          resolve();
        };
        document.head.appendChild(s2);
      }
      if (window.THREE) {
        loadOrbit();
      } else {
        var s1 = document.createElement('script');
        s1.src = THREE_URL;
        s1.onload = loadOrbit;
        s1.onerror = reject;
        document.head.appendChild(s1);
      }
    });
  }

  function G(w, h, d) {
    var k = w + '|' + h + '|' + d;
    return S.geo[k] || (S.geo[k] = new THREE.BoxGeometry(w, h, d));
  }

  function addMesh(grp, geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    grp.add(m);
    return m;
  }

  // Placa flutuante de alta definição no topo de cada palete
  function createPalletBadge(pNum, days, boxes, caliber, statusKey) {
    var c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    var ctx = c.getContext('2d');

    var st = STATUS_COLORS[statusKey] || STATUS_COLORS.forming;
    var dark = document.documentElement.getAttribute('data-theme') !== 'light';

    // Fundo glassmorphism escuro com cantos arredondados
    ctx.fillStyle = dark ? 'rgba(11, 15, 13, 0.94)' : 'rgba(255, 255, 255, 0.96)';
    roundRect(ctx, 4, 4, 504, 152, 16, true, false);

    // Borda sutil
    ctx.lineWidth = 4;
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
    roundRect(ctx, 4, 4, 504, 152, 16, false, true);

    // Faixa vertical indicadora do status
    ctx.fillStyle = st.css;
    roundRect(ctx, 4, 4, 18, 152, { tl: 16, bl: 16, tr: 0, br: 0 }, true, false);

    // Linha 1: Número do Pallet + Tempo em dias
    ctx.fillStyle = dark ? '#ffffff' : '#0f172a';
    ctx.font = '900 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('P' + String(pNum).padStart(2, '0'), 36, 48);

    // Badge de dias
    ctx.fillStyle = st.css;
    ctx.font = '700 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    var daysText = days + (days === 1 ? ' DIA' : ' DIAS');
    var tw = ctx.measureText(daysText).width;
    ctx.fillStyle = st.bg;
    roundRect(ctx, 490 - tw - 24, 26, tw + 20, 42, 8, true, false);
    ctx.fillStyle = st.css;
    ctx.fillText(daysText, 490 - tw - 14, 48);

    // Linha divisória fina
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(36, 86, 450, 2);

    // Linha 2: Quantidade de caixas e Calibre
    ctx.fillStyle = dark ? '#94a3b8' : '#475569';
    ctx.font = '600 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    var subText = (boxes || 0) + ' cx' + (caliber ? ' · Cal. ' + caliber : '');
    ctx.fillText(subText, 36, 120);

    // Status pill text
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = st.css;
    var stName = st.label.toUpperCase();
    var stW = ctx.measureText(stName).width;
    ctx.fillText(stName, 490 - stW - 10, 120);

    var tex = new THREE.CanvasTexture(c);
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    var mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false });
    var s = new THREE.Sprite(mat);
    s.scale.set(1.5, 0.47, 1);
    s.renderOrder = 20;
    return s;
  }

  function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof radius === 'undefined') radius = 5;
    if (typeof radius === 'number') {
      radius = { tl: radius, tr: radius, br: radius, bl: radius };
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function initMaterials() {
    if (S.mat) return S.mat;
    var m = {
      woodLight: new THREE.MeshStandardMaterial({ color: 0xb58b54, roughness: 0.85, metalness: 0.05 }),
      woodDark: new THREE.MeshStandardMaterial({ color: 0x8a6234, roughness: 0.9, metalness: 0.05 }),
      boxKraft1: new THREE.MeshStandardMaterial({ color: 0xc89d67, roughness: 0.8, metalness: 0.02 }),
      boxKraft2: new THREE.MeshStandardMaterial({ color: 0xbe925b, roughness: 0.82, metalness: 0.02 }),
      boxTopTape: new THREE.MeshStandardMaterial({ color: 0xe5d8b8, roughness: 0.5, metalness: 0.1 }),
      wrap: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, roughness: 0.15, depthWrite: false }),
      coldWall: new THREE.MeshStandardMaterial({ color: 0x67b5d1, transparent: true, opacity: 0.20, side: THREE.DoubleSide, roughness: 0.1, depthWrite: false }),
      coldFrame: new THREE.MeshStandardMaterial({ color: 0x334e68, roughness: 0.4, metalness: 0.6 }),
      st: {}
    };
    Object.keys(STATUS_COLORS).forEach(function (k) {
      m.st[k] = new THREE.MeshStandardMaterial({ color: STATUS_COLORS[k].hex, roughness: 0.4, metalness: 0.1 });
    });
    return (S.mat = m);
  }

  function clearGroup(grp) {
    if (!grp) return;
    for (var i = grp.children.length - 1; i >= 0; i--) {
      var o = grp.children[i];
      grp.remove(o);
      o.traverse(function (n) {
        if (n.isSprite && n.material && n.material.map) {
          n.material.map.dispose();
          n.material.dispose();
        }
      });
    }
  }

  // Constrói um palete 3D com caixas empilhadas e rótulo
  function createPalletMesh(slot, idx, gridName, x, z) {
    var M = initMaterials();
    var g = new THREE.Group();
    g.position.set(x, 0, z);
    g.userData.ref = { idx: idx, grid: gridName, slot: slot };

    // 1. Base de madeira do palete PBR
    // 3 vigas de suporte inferiores
    [-0.48, 0, 0.48].forEach(function (dz) {
      addMesh(g, G(PW, 0.09, 0.11), M.woodDark, 0, 0.045, dz);
    });
    // 5 tábuas do assoalho superior
    for (var i = 0; i < 5; i++) {
      addMesh(g, G(PW, 0.028, 0.16), M.woodLight, 0, 0.105, -0.44 + i * 0.22);
    }

    // 2. Caixas empilhadas proporcionalmente à quantidade
    var lim = (typeof e3dGetPalletLimit === 'function' && e3dGetPalletLimit(slot.boxType, slot.caliber, slot.boxModel)) || 80;
    var boxes = slot.boxes || 0;
    var fillRatio = Math.min(1.0, Math.max(0.12, boxes / lim));
    var layers = Math.max(1, Math.ceil(fillRatio * 6));

    for (var l = 0; l < layers; l++) {
      var y = H0 + BH / 2 + l * BH;
      // Amarração intertravada para realismo (camadas pares vs ímpares)
      if (l % 2 === 0) {
        for (var a = 0; a < 2; a++) {
          for (var b = 0; b < 2; b++) {
            var px = a ? 0.33 : -0.33;
            var pz = b ? 0.27 : -0.27;
            addMesh(g, G(0.64, BH - 0.012, 0.51), (l + a + b) % 2 ? M.boxKraft1 : M.boxKraft2, px, y, pz);
            if (l === layers - 1) {
              addMesh(g, G(0.12, 0.005, 0.51), M.boxTopTape, px, H0 + (l + 1) * BH - 0.003, pz);
            }
          }
        }
      } else {
        for (var c = 0; c < 2; c++) {
          for (var d = 0; d < 2; d++) {
            var px2 = c ? 0.27 : -0.27;
            var pz2 = d ? 0.33 : -0.33;
            addMesh(g, G(0.51, BH - 0.012, 0.64), (l + c + d) % 2 ? M.boxKraft2 : M.boxKraft1, px2, y, pz2);
            if (l === layers - 1) {
              addMesh(g, G(0.51, 0.005, 0.12), M.boxTopTape, px2, H0 + (l + 1) * BH - 0.003, pz2);
            }
          }
        }
      }
    }

    var totalHeight = layers * BH;
    var stKey = slot.status || 'forming';

    // 3. Faixa de identificação colorida
    addMesh(g, G(PW * 0.95, 0.04, 0.015), M.st[stKey] || M.st.forming, 0, H0 + totalHeight * 0.6, 0.555).castShadow = false;

    // 4. Filme plástico envolvente (stretch film) se fechado ou etiquetado
    if (stKey !== 'forming') {
      var wrapMesh = addMesh(g, G(PW + 0.04, totalHeight + 0.02, PD + 0.04), M.wrap, 0, H0 + totalHeight / 2, 0);
      wrapMesh.castShadow = false;
      wrapMesh.receiveShadow = false;
    }

    // 5. Placa suspensa inteligente (Badge)
    var days = typeof e3dGetPalletAge === 'function' ? e3dGetPalletAge(slot.createdAt) : 0;
    var badge = createPalletBadge(slot.palletNum || (idx + 1), days, slot.boxes, slot.caliber, stKey);
    badge.position.set(0, H0 + totalHeight + 0.42, 0);
    g.add(badge);
    g.userData.badge = badge;

    // Aplicar transparência se estiver filtrado
    applyFilterOpacity(g, stKey);

    return g;
  }

  function applyFilterOpacity(palletGroup, stKey) {
    var match = (S.filter === 'all' || S.filter === stKey);
    if (S.searchQuery) {
      var slot = palletGroup.userData.ref ? palletGroup.userData.ref.slot : null;
      if (slot) {
        var q = S.searchQuery.toLowerCase();
        var pNum = 'p' + String(slot.palletNum || '').toLowerCase();
        var boxT = String(slot.boxType || '').toLowerCase();
        var cal = String(slot.caliber || '').toLowerCase();
        var par = String(slot.parcel || '').toLowerCase();
        if (!pNum.includes(q) && !boxT.includes(q) && !cal.includes(q) && !par.includes(q)) {
          match = false;
        }
      }
    }
    palletGroup.traverse(function (child) {
      if (child.isMesh) {
        if (!match) {
          child.material.transparent = true;
          child.material.opacity = 0.18;
        } else {
          child.material.opacity = child.userData._origOpacity || 1.0;
        }
      } else if (child.isSprite) {
        child.material.opacity = match ? 1.0 : 0.2;
      }
    });
  }

  // Constrói toda a cena 3D com dados ativos do estoque
  function buildScene() {
    if (!S.r || typeof e3d === 'undefined') return;
    clearGroup(S.world);
    S.pal = new THREE.Group();
    S.world.add(S.pal);
    S.palletsList = [];

    var dark = document.documentElement.getAttribute('data-theme') !== 'light';
    var M = initMaterials();

    // Cor de fundo elegante do galpão
    S.sc.background = new THREE.Color(dark ? 0x0c110f : 0xf1f5f3);

    // Chão base amplo
    var floorMat = new THREE.MeshStandardMaterial({
      color: dark ? 0x141a17 : 0xe2e8e4,
      roughness: 0.95,
      metalness: 0.05
    });
    var baseFloor = addMesh(S.world, G(160, 0.02, 160), floorMat, 0, -0.015, 0);
    baseFloor.castShadow = false;

    // Zonas: Packing House e Câmara Fria
    var zones = [
      {
        g: e3d.grid,
        cols: e3d.cols,
        name: 'packing',
        title: 'PACKING HOUSE',
        subtitle: 'RECEBIMENTO & MONTAGEM',
        floor: dark ? 0x222c27 : 0xc7d3cc,
        accent: 0xf59e0b,
        off: 0
      },
      {
        g: e3d.coldGrid,
        cols: e3d.coldCols,
        name: 'cold',
        title: 'CÂMARA FRIA',
        subtitle: 'ARMAZENAMENTO REFRIGERADO',
        floor: dark ? 0x1b2c35 : 0xb5cad4,
        accent: 0x06b6d4,
        cold: true
      }
    ];

    var maxD = 0, xEnd = 0;
    var packingCenter = new THREE.Vector3();
    var coldCenter = new THREE.Vector3();

    zones.forEach(function (z, n) {
      z.cols = Math.max(1, z.cols || 4);
      z.g = z.g || [];
      if (n) z.off = (zones[0].cols * SX) + 3.2; // Corredor central de empilhadeira

      var rows = Math.max(1, Math.ceil(z.g.length / z.cols));
      var W = z.cols * SX;
      var D = rows * SZ;
      var x0 = z.off - SX / 2;
      var z0 = -SZ / 2;

      maxD = Math.max(maxD, D);
      xEnd = x0 + W;

      // Centro de cada zona
      var zCenterX = x0 + W / 2;
      var zCenterZ = z0 + D / 2;
      if (!n) packingCenter.set(zCenterX, 0.8, zCenterZ);
      else coldCenter.set(zCenterX, 0.8, zCenterZ);

      // Piso da baia com bordas de resina industrial
      var zoneFloor = addMesh(S.world, G(W, 0.025, D), new THREE.MeshStandardMaterial({
        color: z.floor,
        roughness: 0.85,
        metalness: 0.1
      }), zCenterX, 0.008, zCenterZ);
      zoneFloor.castShadow = false;

      // Faixas de segurança amarelas na borda do piso
      var borderMat = new THREE.MeshStandardMaterial({ color: dark ? 0xd97706 : 0xf59e0b, roughness: 0.6 });
      addMesh(S.world, G(W, 0.03, 0.08), borderMat, zCenterX, 0.012, z0);
      addMesh(S.world, G(W, 0.03, 0.08), borderMat, zCenterX, 0.012, z0 + D);
      addMesh(S.world, G(0.08, 0.03, D), borderMat, x0, 0.012, zCenterZ);
      addMesh(S.world, G(0.08, 0.03, D), borderMat, x0 + W, 0.012, zCenterZ);

      // Totem / Letreiro 3D da Zona
      var totemBadge = createZoneHeaderBadge(z.title, z.subtitle, z.accent);
      totemBadge.position.set(zCenterX, 3.8, z0 - 0.2);
      S.world.add(totemBadge);

      // Estrutura física da Câmara Fria (paredes isotérmicas envidraçadas)
      if (z.cold) {
        var wallH = 2.8;
        var wallY = wallH / 2;
        // Parede frontal com abertura/portal de entrada
        var doorW = 2.4;
        var sideWallW = (W - doorW) / 2;
        if (sideWallW > 0) {
          addMesh(S.world, G(sideWallW, wallH, 0.06), M.coldWall, x0 + sideWallW / 2, wallY, z0).castShadow = false;
          addMesh(S.world, G(sideWallW, wallH, 0.06), M.coldWall, x0 + W - sideWallW / 2, wallY, z0).castShadow = false;
          // Portal metálico
          addMesh(S.world, G(doorW + 0.1, 0.12, 0.1), M.coldFrame, zCenterX, wallH - 0.06, z0);
        } else {
          addMesh(S.world, G(W, wallH, 0.06), M.coldWall, zCenterX, wallY, z0).castShadow = false;
        }
        // Parede traseira e laterais
        addMesh(S.world, G(W, wallH, 0.06), M.coldWall, zCenterX, wallY, z0 + D).castShadow = false;
        addMesh(S.world, G(0.06, wallH, D), M.coldWall, x0, wallY, zCenterZ).castShadow = false;
        addMesh(S.world, G(0.06, wallH, D), M.coldWall, x0 + W, wallY, zCenterZ).castShadow = false;

        // Colunas de suporte metálicas nos 4 cantos
        [[x0, z0], [x0 + W, z0], [x0, z0 + D], [x0 + W, z0 + D]].forEach(function (pt) {
          addMesh(S.world, G(0.12, wallH + 0.2, 0.12), M.coldFrame, pt[0], (wallH + 0.2) / 2, pt[1]);
        });
      }

      // Slots e Paletes
      z.g.forEach(function (slot, i) {
        var x = z.off + (i % z.cols) * SX;
        var zz = Math.floor(i / z.cols) * SZ;
        var rowNum = Math.floor(i / z.cols) + 1;
        var colNum = (i % z.cols) + 1;

        if (!slot || slot.status === 'empty') {
          // Marcador de vaga vazia moderna
          var slotMarker = createEmptySlotMarker(rowNum, colNum, x, zz, dark);
          S.world.add(slotMarker);
        } else {
          var pMesh = createPalletMesh(slot, i, z.name, x, zz);
          S.pal.add(pMesh);
          S.palletsList.push(pMesh);
        }
      });
    });

    var cx = (-SX / 2 + xEnd) / 2;
    var cz = maxD / 2 - SZ / 2;
    S.zoneBounds = {
      cx: cx,
      cz: cz,
      maxD: maxD,
      xEnd: xEnd,
      packingCenter: packingCenter,
      coldCenter: coldCenter
    };

    // Ajusta foco inicial de câmera
    if (S.controls) {
      if (S.first) {
        var dist = Math.min(65, Math.max(22, Math.max(xEnd * 0.9, maxD * 1.1) + 8));
        S.controls.target.set(cx, 0.6, cz);
        S.cam.position.set(cx + dist * 0.65, dist * 0.85, cz + dist * 0.85);
        S.controls.update();
        S.first = false;
      }
    }

    updateMetricsHUD();
    render();
  }

  function createZoneHeaderBadge(title, subtitle, colorHex) {
    var c = document.createElement('canvas');
    c.width = 512;
    c.height = 120;
    var ctx = c.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    roundRect(ctx, 4, 4, 504, 112, 14, true, false);

    ctx.fillStyle = '#' + ('000000' + colorHex.toString(16)).slice(-6);
    roundRect(ctx, 4, 4, 14, 112, { tl: 14, bl: 14, tr: 0, br: 0 }, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 42px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 34, 44);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(subtitle, 34, 88);

    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: tex, depthTest: false });
    var s = new THREE.Sprite(mat);
    s.scale.set(2.4, 0.56, 1);
    s.renderOrder = 15;
    return s;
  }

  function createEmptySlotMarker(row, col, x, z, dark) {
    var g = new THREE.Group();
    g.position.set(x, 0.015, z);

    var lineMat = new THREE.MeshBasicMaterial({
      color: dark ? 0x2a3831 : 0xb8c5be
    });

    // Contorno retangular fino da vaga
    var w = PW + 0.08, d = PD + 0.08, t = 0.025;
    addMesh(g, G(w, 0.005, t), lineMat, 0, 0, -d / 2);
    addMesh(g, G(w, 0.005, t), lineMat, 0, 0, d / 2);
    addMesh(g, G(t, 0.005, d), lineMat, -w / 2, 0, 0);
    addMesh(g, G(t, 0.005, d), lineMat, w / 2, 0, 0);

    // Texto da vaga (Fila / Coluna)
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 64;
    var ctx = c.getContext('2d');
    ctx.fillStyle = dark ? 'rgba(148, 163, 184, 0.5)' : 'rgba(71, 85, 105, 0.6)';
    ctx.font = '700 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('F' + row + '·C' + col, 64, 32);

    var tex = new THREE.CanvasTexture(c);
    var tagPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.7, 0.35),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.8, depthWrite: false })
    );
    tagPlane.rotation.x = -Math.PI / 2;
    tagPlane.position.y = 0.003;
    g.add(tagPlane);

    return g;
  }

  function render() {
    if (!S.r || !S.sc || !S.cam) return;
    S.r.render(S.sc, S.cam);
  }

  // Loop de animação suave (60 FPS com Damping)
  function startRenderLoop() {
    function animate() {
      if (!S.visible) return;
      requestAnimationFrame(animate);

      if (S.controls && S.controls.update) {
        S.controls.update();
      }

      if (S.animatingCam) {
        updateCameraTween();
      }

      render();
    }
    requestAnimationFrame(animate);
  }

  // Transição suave de câmera (Tween / Easing)
  var tween = null;
  function flyCameraTo(targetCamPos, targetLookAt, duration) {
    if (!S.controls) return;
    duration = duration || 750;
    tween = {
      startTime: performance.now(),
      duration: duration,
      fromCam: S.cam.position.clone(),
      toCam: targetCamPos.clone(),
      fromLook: S.controls.target.clone(),
      toLook: targetLookAt.clone()
    };
    S.animatingCam = true;
  }

  function updateCameraTween() {
    if (!tween) return;
    var now = performance.now();
    var p = Math.min(1.0, (now - tween.startTime) / tween.duration);
    // Easing suave (Cubic In-Out)
    var ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    S.cam.position.lerpVectors(tween.fromCam, tween.toCam, ease);
    S.controls.target.lerpVectors(tween.fromLook, tween.toLook, ease);
    S.controls.update();

    if (p >= 1.0) {
      tween = null;
      S.animatingCam = false;
    }
  }

  // Interação do mouse / toque: Hover Tooltip e Click Raycast
  function setupRaycasting(cv, dom) {
    var rc = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var pointerDownPos = { x: 0, y: 0 };
    var tooltip = document.getElementById('e3d-3d-tooltip');

    dom.addEventListener('pointerdown', function (e) {
      pointerDownPos.x = e.clientX;
      pointerDownPos.y = e.clientY;
    });

    dom.addEventListener('pointermove', function (e) {
      var rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      rc.setFromCamera(mouse, S.cam);
      var intersects = rc.intersectObjects(S.pal.children, true);

      if (intersects.length > 0) {
        var obj = intersects[0].object;
        while (obj && !obj.userData.ref) obj = obj.parent;

        if (obj && obj.userData.ref) {
          dom.style.cursor = 'pointer';
          if (S.hoveredPallet !== obj) {
            unhighlightPallet(S.hoveredPallet);
            S.hoveredPallet = obj;
            highlightPallet(obj);
          }
          showTooltip(tooltip, obj.userData.ref, e.clientX, e.clientY);
          return;
        }
      }

      dom.style.cursor = 'grab';
      if (S.hoveredPallet) {
        unhighlightPallet(S.hoveredPallet);
        S.hoveredPallet = null;
      }
      hideTooltip(tooltip);
    });

    dom.addEventListener('pointerleave', function () {
      if (S.hoveredPallet) {
        unhighlightPallet(S.hoveredPallet);
        S.hoveredPallet = null;
      }
      hideTooltip(tooltip);
    });

    dom.addEventListener('pointerup', function (e) {
      var dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist < 6) {
        // Foi um clique (não um arrasto de rotação)
        var rect = dom.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        rc.setFromCamera(mouse, S.cam);
        var intersects = rc.intersectObjects(S.pal.children, true);
        if (intersects.length > 0) {
          var obj = intersects[0].object;
          while (obj && !obj.userData.ref) obj = obj.parent;
          if (obj && obj.userData.ref && typeof e3dOpenPalletModal === 'function') {
            e3dOpenPalletModal(obj.userData.ref.idx, obj.userData.ref.grid);
          }
        }
      }
    });
  }

  function highlightPallet(g) {
    if (!g) return;
    g.traverse(function (child) {
      if (child.isMesh && child.material) {
        if (!child.userData._origColor) {
          child.userData._origColor = child.material.color.clone();
        }
        child.material.color.offsetHSL(0, 0, 0.12);
      }
    });
  }

  function unhighlightPallet(g) {
    if (!g) return;
    g.traverse(function (child) {
      if (child.isMesh && child.material && child.userData._origColor) {
        child.material.color.copy(child.userData._origColor);
      }
    });
  }

  function showTooltip(tt, ref, clientX, clientY) {
    if (!tt || !ref) return;
    var slot = ref.slot || {};
    var st = STATUS_COLORS[slot.status] || STATUS_COLORS.forming;
    var pNum = 'P' + String(slot.palletNum || (ref.idx + 1)).padStart(2, '0');
    var isPacking = (ref.grid === 'packing');
    var locName = isPacking ? 'Packing House' : 'Câmara Fria';
    var lim = (typeof e3dGetPalletLimit === 'function' && e3dGetPalletLimit(slot.boxType, slot.caliber, slot.boxModel)) || 80;
    var boxes = slot.boxes || 0;
    var fillPct = Math.round(Math.min(100, (boxes / lim) * 100));
    var days = typeof e3dGetPalletAge === 'function' ? e3dGetPalletAge(slot.createdAt) : 0;

    tt.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.12); padding-bottom:8px; margin-bottom:8px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <b style="font-size:15px; color:#fff; letter-spacing:0.5px;">Pallet ${pNum}</b>
          <span style="font-size:10px; font-weight:800; padding:2px 7px; border-radius:10px; background:${st.bg}; color:${st.css}; border:1px solid ${st.css};">${st.label}</span>
        </div>
        <span style="font-size:11px; color:#94a3b8; font-weight:600;">${locName}</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px 12px; font-size:11.5px; color:#cbd5e1;">
        <div><span style="color:#64748b;">Fruta:</span> <b style="color:#fff;">${slot.boxType || 'Melão'}</b></div>
        <div><span style="color:#64748b;">Calibre:</span> <b style="color:#fff;">${slot.caliber ? 'Cal. ' + slot.caliber : '—'}</b></div>
        <div><span style="color:#64748b;">Caixas:</span> <b style="color:#38bdf8;">${boxes} / ${lim} cx</b></div>
        <div><span style="color:#64748b;">Tempo:</span> <b style="color:#f59e0b;">${days} ${days === 1 ? 'dia' : 'dias'}</b></div>
        ${slot.parcel ? `<div><span style="color:#64748b;">Talhão:</span> <b style="color:#fff;">${slot.parcel}</b></div>` : ''}
        ${slot.label ? `<div><span style="color:#64748b;">Etiqueta:</span> <b style="color:#fff;">${slot.label}</b></div>` : ''}
      </div>
      <div style="margin-top:8px; background:rgba(255,255,255,0.08); border-radius:4px; height:5px; overflow:hidden;">
        <div style="width:${fillPct}%; height:100%; background:linear-gradient(90deg, #38bdf8, #22c55e);"></div>
      </div>
      <div style="display:flex; justify-content:space-between; font-size:9.5px; color:#64748b; margin-top:6px;">
        <span>Ocupação do Palete: ${fillPct}%</span>
        <span style="color:#38bdf8; font-weight:700;">👆 Clique para abrir detalhes</span>
      </div>
    `;

    // Posicionamento inteligente próximo ao cursor sem estourar a tela
    var w = 290, h = 160;
    var left = clientX + 16;
    var top = clientY + 16;
    if (left + w > window.innerWidth - 10) left = clientX - w - 16;
    if (top + h > window.innerHeight - 10) top = clientY - h - 16;

    tt.style.left = left + 'px';
    tt.style.top = top + 'px';
    tt.style.display = 'block';
    tt.style.opacity = '1';
  }

  function hideTooltip(tt) {
    if (!tt) return;
    tt.style.display = 'none';
    tt.style.opacity = '0';
  }

  // Inicializa a cena Three.js e controles
  function setupRenderer(cv) {
    var w = cv.clientWidth || 900;
    var h = cv.clientHeight || 640;

    S.r = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    S.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    S.r.setSize(w, h);
    S.r.shadowMap.enabled = true;
    S.r.shadowMap.type = THREE.PCFSoftShadowMap;
    cv.appendChild(S.r.domElement);

    S.sc = new THREE.Scene();
    S.cam = new THREE.PerspectiveCamera(38, w / h, 0.2, 400);

    // Iluminação PBR balanceada
    var hemi = new THREE.HemisphereLight(0xffffff, 0x475569, 0.75);
    S.sc.add(hemi);

    S.dir = new THREE.DirectionalLight(0xffffff, 0.85);
    S.dir.position.set(30, 42, 35);
    S.dir.castShadow = true;
    S.dir.shadow.mapSize.set(2048, 2048);
    S.dir.shadow.camera.left = -45;
    S.dir.shadow.camera.right = 45;
    S.dir.shadow.camera.top = 45;
    S.dir.shadow.camera.bottom = -45;
    S.dir.shadow.camera.near = 0.5;
    S.dir.shadow.camera.far = 130;
    S.dir.shadow.bias = -0.0003;
    S.sc.add(S.dir);

    // Luz fria de realce sobre a Câmara
    var coldLight = new THREE.PointLight(0x06b6d4, 0.45, 45);
    coldLight.position.set(25, 6, 10);
    S.sc.add(coldLight);

    S.world = new THREE.Group();
    S.sc.add(S.world);

    // Configuração dos controles de câmera
    var dom = S.r.domElement;
    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';

    if (window.THREE && window.THREE.OrbitControls) {
      S.controls = new THREE.OrbitControls(S.cam, dom);
      S.controls.enableDamping = true;
      S.controls.dampingFactor = 0.05;
      S.controls.screenSpacePanning = true;
      S.controls.minDistance = 3.0;
      S.controls.maxDistance = 85.0;
      S.controls.maxPolarAngle = Math.PI / 2.05; // Não atravessa o chão
      S.controls.minPolarAngle = 0.05;
      S.controls.zoomSpeed = 1.1;
      S.controls.rotateSpeed = 0.85;
      S.controls.panSpeed = 0.9;
    } else {
      // Fallback nativo
      setupNativeOrbit(dom);
    }

    setupRaycasting(cv, dom);
    startRenderLoop();

    // Redimensionamento responsivo automático
    new ResizeObserver(function () {
      var W = cv.clientWidth, H = cv.clientHeight;
      if (!W || !H) return;
      S.r.setSize(W, H);
      S.cam.aspect = W / H;
      S.cam.updateProjectionMatrix();
      render();
    }).observe(cv);
  }

  // Fallback nativo simples se OrbitControls CDN estiver offline
  function setupNativeOrbit(dom) {
    var dn = null;
    S.camState = { th: 0.4, ph: 0.95, rad: 28, target: new THREE.Vector3() };
    dom.addEventListener('pointerdown', function (e) {
      dn = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    });
    dom.addEventListener('pointermove', function (e) {
      if (!dn) return;
      var dx = e.clientX - dn.x, dy = e.clientY - dn.y;
      dn.x = e.clientX; dn.y = e.clientY;
      S.camState.th -= dx * 0.005;
      S.camState.ph = Math.min(1.48, Math.max(0.15, S.camState.ph - dy * 0.005));
      updateNativeCam();
    });
    dom.addEventListener('pointerup', function () { dn = null; });
    dom.addEventListener('wheel', function (e) {
      e.preventDefault();
      S.camState.rad = Math.min(80, Math.max(4, S.camState.rad * (1 + Math.sign(e.deltaY) * 0.08)));
      updateNativeCam();
    }, { passive: false });
    updateNativeCam();
  }

  function updateNativeCam() {
    if (!S.camState) return;
    var c = S.camState;
    S.cam.position.set(
      c.target.x + c.rad * Math.sin(c.ph) * Math.sin(c.th),
      c.target.y + c.rad * Math.cos(c.ph),
      c.target.z + c.rad * Math.sin(c.ph) * Math.cos(c.th)
    );
    S.cam.lookAt(c.target);
  }

  // Atualiza os indicadores de ocupação no HUD
  function updateMetricsHUD() {
    var packingEl = document.getElementById('e3d-kpi-packing');
    var coldEl = document.getElementById('e3d-kpi-cold');
    var totalEl = document.getElementById('e3d-kpi-total');

    if (!packingEl || typeof e3d === 'undefined') return;

    var pSlots = (e3d.grid || []).filter(function (s) { return s && s.status !== 'empty'; });
    var cSlots = (e3d.coldGrid || []).filter(function (s) { return s && s.status !== 'empty'; });
    var pTotalBoxes = pSlots.reduce(function (acc, s) { return acc + (s.boxes || 0); }, 0);
    var cTotalBoxes = cSlots.reduce(function (acc, s) { return acc + (s.boxes || 0); }, 0);

    var pMax = (e3d.grid || []).length || 1;
    var cMax = (e3d.coldGrid || []).length || 1;

    packingEl.textContent = pSlots.length + '/' + pMax + ' (' + pTotalBoxes + ' cx)';
    coldEl.textContent = cSlots.length + '/' + cMax + ' (' + cTotalBoxes + ' cx)';
    totalEl.textContent = (pSlots.length + cSlots.length) + ' pallets (' + (pTotalBoxes + cTotalBoxes) + ' cx)';
  }

  // Construção do Container e HUD Flutuante Glassmorphism
  function init3DModule() {
    var zones = document.getElementById('e3d-zones-wrap');
    if (!zones) return false;
    if (document.getElementById('e3d-left')) return true;

    var left = el('div', 'min-width:0; position:relative;');
    left.id = 'e3d-left';
    zones.parentNode.insertBefore(left, zones);

    // Barra de alternância: Grade vs 3D Digital Twin
    var navBar = el('div', 'display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:8px; flex-wrap:wrap;');
    var btnGroup = el('div', 'display:inline-flex; background:rgba(255,255,255,0.06); padding:3px; border-radius:8px; border:1px solid var(--border);');
    var bGrade = el('button', 'font-size:12px; font-weight:700; padding:6px 14px; border-radius:6px; cursor:pointer;', '📋 Grade 2D');
    var b3D = el('button', 'font-size:12px; font-weight:700; padding:6px 14px; border-radius:6px; cursor:pointer;', '🌐 Visão 3D Avançada');
    btnGroup.append(bGrade, b3D);

    // Mini status de conexão/ocupação na barra
    var topInfo = el('div', 'display:flex; align-items:center; gap:12px; font-size:12px; color:var(--muted);');
    topInfo.innerHTML = `
      <span style="display:flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block;"></span> 3D Digital Twin Ativo</span>
    `;
    navBar.append(btnGroup, topInfo);

    // Wrap do Visualizador 3D
    var wrap = el('div', 'display:none; position:relative; min-height:640px; height:74vh; max-height:860px; border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--bg); box-shadow:0 12px 30px rgba(0,0,0,0.25);');
    wrap.id = 'e3d-3d-wrap';

    var cv = el('div', 'position:absolute; inset:0;');
    cv.id = 'e3d-3d-canvas';

    // HUD Flutuante Superior: Controles de Câmera e Busca
    var topHUD = el('div', 'position:absolute; top:12px; left:12px; right:12px; display:flex; justify-content:space-between; align-items:center; gap:10px; z-index:10; pointer-events:none; flex-wrap:wrap;');

    // Bloco Esquerdo: Presets de Câmera Rápidos
    var camHUD = el('div', 'display:inline-flex; gap:4px; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); padding:4px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); pointer-events:auto; box-shadow:0 4px 16px rgba(0,0,0,0.3);');
    camHUD.innerHTML = `
      <button id="e3d-cam-iso" title="Vista Isométrica 3D" style="background:rgba(255,255,255,0.1); color:#fff; border:none; padding:6px 10px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px;"><i data-lucide="box" style="width:13px;height:13px"></i> 3D Geral</button>
      <button id="e3d-cam-top" title="Vista Superior (Planta Baixa)" style="background:transparent; color:#94a3b8; border:none; padding:6px 10px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px;"><i data-lucide="layout-grid" style="width:13px;height:13px"></i> Planta Baixa</button>
      <button id="e3d-cam-packing" title="Focar no Packing House" style="background:transparent; color:#f59e0b; border:none; padding:6px 10px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px;"><i data-lucide="warehouse" style="width:13px;height:13px"></i> Packing</button>
      <button id="e3d-cam-cold" title="Focar na Câmara Fria" style="background:transparent; color:#06b6d4; border:none; padding:6px 10px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px;"><i data-lucide="snowflake" style="width:13px;height:13px"></i> Câmara Fria</button>
      <button id="e3d-cam-reset" title="Centralizar e Enquadrar Tudo" style="background:transparent; color:#94a3b8; border:none; padding:6px 8px; border-radius:6px; font-size:11.5px; cursor:pointer;"><i data-lucide="refresh-cw" style="width:13px;height:13px"></i></button>
    `;

    // Bloco Direito: Busca & Tela Cheia
    var rightHUD = el('div', 'display:inline-flex; gap:8px; align-items:center; pointer-events:auto;');
    rightHUD.innerHTML = `
      <div style="position:relative; display:flex; align-items:center;">
        <input type="text" id="e3d-3d-search" placeholder="🔍 Localizar pallet (ex: P01)..." 
               style="background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.14); color:#fff; font-size:11.5px; padding:6px 12px; border-radius:8px; width:210px; outline:none; transition:width 0.2s; box-shadow:0 4px 12px rgba(0,0,0,0.25);"
               onfocus="this.style.width='260px'; this.style.borderColor='#38bdf8';" 
               onblur="this.style.width='210px'; this.style.borderColor='rgba(255,255,255,0.14)';"/>
      </div>
      <button id="e3d-btn-fullscreen" title="Expandir Tela Cheia" style="background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,0.14); color:#fff; padding:6px 10px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,0.25);">
        <i data-lucide="maximize" style="width:14px;height:14px"></i>
      </button>
    `;
    topHUD.append(camHUD, rightHUD);

    // HUD Flutuante Inferior: Filtros de Status & Indicador de Navegação
    var botHUD = el('div', 'position:absolute; bottom:12px; left:12px; right:12px; display:flex; justify-content:space-between; align-items:flex-end; gap:10px; z-index:10; pointer-events:none; flex-wrap:wrap;');

    // Filtros de Status em Pílulas
    var filterHUD = el('div', 'display:inline-flex; gap:6px; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); padding:4px 8px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); pointer-events:auto; box-shadow:0 4px 16px rgba(0,0,0,0.3); font-size:11.5px;');
    filterHUD.innerHTML = `
      <span style="color:#64748b; font-weight:700; align-self:center; margin-right:4px;">Filtro:</span>
      <button class="e3d-flt-btn" data-st="all" style="background:#38bdf8; color:#0f172a; border:none; padding:4px 10px; border-radius:6px; font-weight:800; cursor:pointer;">Todos</button>
      <button class="e3d-flt-btn" data-st="forming" style="background:transparent; color:#38bdf8; border:none; padding:4px 8px; border-radius:6px; font-weight:700; cursor:pointer;">🔵 Em formação</button>
      <button class="e3d-flt-btn" data-st="closed" style="background:transparent; color:#22c55e; border:none; padding:4px 8px; border-radius:6px; font-weight:700; cursor:pointer;">🟢 Fechado</button>
      <button class="e3d-flt-btn" data-st="labeled" style="background:transparent; color:#f59e0b; border:none; padding:4px 8px; border-radius:6px; font-weight:700; cursor:pointer;">🟡 Etiquetado</button>
    `;

    // Painel KPI de Ocupação no Canto Direito
    var kpiHUD = el('div', 'display:flex; gap:12px; background:rgba(15,23,42,0.85); backdrop-filter:blur(8px); padding:6px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.12); pointer-events:auto; box-shadow:0 4px 16px rgba(0,0,0,0.3); font-size:11.5px; color:#94a3b8;');
    kpiHUD.innerHTML = `
      <div><span style="color:#f59e0b;font-weight:700;">Packing:</span> <b id="e3d-kpi-packing" style="color:#fff;">—</b></div>
      <div style="border-left:1px solid rgba(255,255,255,0.1); padding-left:10px;"><span style="color:#06b6d4;font-weight:700;">Câmara:</span> <b id="e3d-kpi-cold" style="color:#fff;">—</b></div>
      <div style="border-left:1px solid rgba(255,255,255,0.1); padding-left:10px;"><span style="color:#22c55e;font-weight:700;">Total:</span> <b id="e3d-kpi-total" style="color:#fff;">—</b></div>
    `;
    botHUD.append(filterHUD, kpiHUD);

    // Dica de mouse discreta
    var helpHint = el('div', 'position:absolute; bottom:52px; left:16px; font-size:11px; color:rgba(148,163,184,0.7); pointer-events:none; text-shadow:0 1px 3px rgba(0,0,0,0.8);',
      '🖱️ Botão esquerdo: Girar 3D · Botão direito ou 2 dedos: Mover / Pan · Roda: Zoom · Clique no pallet para gerenciar');

    // Tooltip Card Flutuante (Glassmorphism PBR)
    var tooltip = el('div', 'position:fixed; display:none; opacity:0; z-index:99999; width:290px; pointer-events:none; transition:opacity 0.15s ease-out; background:rgba(15, 23, 42, 0.94); backdrop-filter:blur(12px); border:1px solid rgba(255, 255, 255, 0.16); border-radius:12px; padding:12px 14px; box-shadow:0 14px 35px rgba(0,0,0,0.45); color:#fff;');
    tooltip.id = 'e3d-3d-tooltip';

    wrap.append(cv, topHUD, botHUD, helpHint, tooltip);
    left.append(navBar, wrap, zones);

    if (window.lucide) lucide.createIcons();

    // Eventos de Câmera e HUD
    bindHudEvents(wrap);

    // Alternância de modo (Grade vs 3D)
    function switchMode(is3D) {
      S.visible = is3D;
      zones.style.display = is3D ? 'none' : '';
      wrap.style.display = is3D ? 'block' : 'none';

      bGrade.className = is3D ? 'sec' : '';
      b3D.className = is3D ? '' : 'sec';
      (is3D ? b3D : bGrade).removeAttribute('class');
      (is3D ? bGrade : b3D).className = 'sec';

      if (!is3D) {
        if (tooltip) tooltip.style.display = 'none';
        return;
      }

      loadScripts().then(function () {
        if (!S.r) setupRenderer(cv);
        buildScene();
      }).catch(function (err) {
        console.error('[estoque3d] Erro ao carregar motor 3D:', err);
        cv.innerHTML = '<div style="padding:28px; color:var(--muted); text-align:center;">Não foi possível inicializar o motor 3D. A Grade 2D continua funcionando perfeitamente.</div>';
      });
    }

    bGrade.onclick = function () { switchMode(false); };
    b3D.onclick = function () { switchMode(true); };
    switchMode(false);

    // Atualização em tempo real: observa mudanças na grade 2D e no tema
    var debounceTimer;
    function requestUpdate() {
      if (!S.visible || !S.r) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(buildScene, 120);
    }

    var mo = new MutationObserver(requestUpdate);
    ['e3d-grid-packing', 'e3d-grid-cold'].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) mo.observe(node, { childList: true, subtree: true });
    });
    new MutationObserver(requestUpdate).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return true;
  }

  // Conecta todos os botões do HUD flutuante aos comandos da câmera
  function bindHudEvents(wrap) {
    // 1. Presets de Câmera
    var btnIso = document.getElementById('e3d-cam-iso');
    var btnTop = document.getElementById('e3d-cam-top');
    var btnPacking = document.getElementById('e3d-cam-packing');
    var btnCold = document.getElementById('e3d-cam-cold');
    var btnReset = document.getElementById('e3d-cam-reset');
    var btnFull = document.getElementById('e3d-btn-fullscreen');

    function setActiveCamBtn(activeBtn) {
      [btnIso, btnTop, btnPacking, btnCold].forEach(function (b) {
        if (b) {
          b.style.background = 'transparent';
          b.style.color = '#94a3b8';
        }
      });
      if (activeBtn) {
        activeBtn.style.background = 'rgba(255,255,255,0.12)';
        activeBtn.style.color = '#fff';
      }
    }

    if (btnIso) {
      btnIso.onclick = function () {
        setActiveCamBtn(btnIso);
        var b = S.zoneBounds;
        var dist = Math.min(65, Math.max(22, Math.max(b.xEnd * 0.9, b.maxD * 1.1) + 8));
        flyCameraTo(new THREE.Vector3(b.cx + dist * 0.65, dist * 0.85, b.cz + dist * 0.85), new THREE.Vector3(b.cx, 0.6, b.cz));
      };
    }

    if (btnTop) {
      btnTop.onclick = function () {
        setActiveCamBtn(btnTop);
        var b = S.zoneBounds;
        var topDist = Math.max(b.xEnd, b.maxD) * 1.35;
        flyCameraTo(new THREE.Vector3(b.cx, topDist, b.cz + 0.05), new THREE.Vector3(b.cx, 0, b.cz));
      };
    }

    if (btnPacking) {
      btnPacking.onclick = function () {
        setActiveCamBtn(btnPacking);
        var pc = S.zoneBounds.packingCenter || new THREE.Vector3(6, 0.8, 4);
        flyCameraTo(new THREE.Vector3(pc.x + 8, 14, pc.z + 12), pc);
      };
    }

    if (btnCold) {
      btnCold.onclick = function () {
        setActiveCamBtn(btnCold);
        var cc = S.zoneBounds.coldCenter || new THREE.Vector3(18, 0.8, 4);
        flyCameraTo(new THREE.Vector3(cc.x + 8, 14, cc.z + 12), cc);
      };
    }

    if (btnReset) {
      btnReset.onclick = function () {
        if (btnIso) btnIso.click();
      };
    }

    // 2. Tela Cheia (Fullscreen)
    if (btnFull) {
      btnFull.onclick = function () {
        S.isFullscreen = !S.isFullscreen;
        if (S.isFullscreen) {
          wrap.style.position = 'fixed';
          wrap.style.inset = '0';
          wrap.style.zIndex = '99998';
          wrap.style.height = '100vh';
          wrap.style.maxHeight = 'none';
          wrap.style.borderRadius = '0';
          btnFull.innerHTML = '<i data-lucide="minimize" style="width:14px;height:14px"></i>';
        } else {
          wrap.style.position = 'relative';
          wrap.style.inset = '';
          wrap.style.zIndex = '';
          wrap.style.height = '74vh';
          wrap.style.maxHeight = '860px';
          wrap.style.borderRadius = '12px';
          btnFull.innerHTML = '<i data-lucide="maximize" style="width:14px;height:14px"></i>';
        }
        if (window.lucide) lucide.createIcons();
      };
    }

    // 3. Filtros por Status
    var fltBtns = document.querySelectorAll('.e3d-flt-btn');
    fltBtns.forEach(function (btn) {
      btn.onclick = function () {
        var st = btn.getAttribute('data-st');
        S.filter = st;
        fltBtns.forEach(function (b) {
          b.style.background = 'transparent';
          var k = b.getAttribute('data-st');
          b.style.color = k === 'all' ? '#94a3b8' : (STATUS_COLORS[k] ? STATUS_COLORS[k].css : '#94a3b8');
        });
        btn.style.background = st === 'all' ? '#38bdf8' : (STATUS_COLORS[st] ? STATUS_COLORS[st].css : '#38bdf8');
        btn.style.color = '#0f172a';

        // Atualiza transparências na cena
        S.palletsList.forEach(function (pGroup) {
          var ref = pGroup.userData.ref;
          var sKey = ref && ref.slot ? ref.slot.status : 'forming';
          applyFilterOpacity(pGroup, sKey);
        });
        render();
      };
    });

    // 4. Busca Dinâmica de Pallet com Voo de Câmera
    var searchInput = document.getElementById('e3d-3d-search');
    if (searchInput) {
      function doSearch() {
        var q = searchInput.value.trim().toLowerCase();
        S.searchQuery = q;

        // Atualiza opacidade dos pallets
        var foundGroup = null;
        S.palletsList.forEach(function (pGroup) {
          var ref = pGroup.userData.ref;
          var sKey = ref && ref.slot ? ref.slot.status : 'forming';
          applyFilterOpacity(pGroup, sKey);

          if (q && !foundGroup && ref && ref.slot) {
            var pNum = 'p' + String(ref.slot.palletNum || '').toLowerCase();
            if (pNum === q || pNum === ('p' + q) || String(ref.slot.palletNum) === q) {
              foundGroup = pGroup;
            }
          }
        });

        // Se localizou exatamente um palete, voa a câmera suavemente até ele!
        if (foundGroup) {
          var pos = foundGroup.position;
          flyCameraTo(new THREE.Vector3(pos.x + 4, 6, pos.z + 6), new THREE.Vector3(pos.x, 1.2, pos.z), 900);
          highlightPallet(foundGroup);
        }
        render();
      }

      searchInput.addEventListener('input', doSearch);
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doSearch();
      });
    }
  }

  function start() {
    try {
      if (!init3DModule()) {
        window.addEventListener('load', init3DModule);
      }
    } catch (e) {
      console.warn('[estoque3d]:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
