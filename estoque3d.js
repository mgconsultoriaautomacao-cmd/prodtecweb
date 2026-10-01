/* PRODTECH — estoque3d.js
   Visão 3D do estoque (Packing House + Câmara Fria). Módulo ADICIONAL: não altera nenhuma função existente.
   Lê e3d.grid / e3d.coldGrid, atualiza sozinho quando o estoque muda e abre o modal atual ao clicar no pallet. */
(function () {
  'use strict';
  var THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  var SX = 2.0, SZ = 1.8, PW = 1.4, PD = 1.1, H0 = 0.13, BH = 0.26;
  var ST = { forming: 0x4f7cac, closed: 0x3aa872, labeled: 0xd9a441, dispatching: 0x8f86d9 };
  var S = { visible: false, first: true, geo: {}, mat: null };

  function el(tag, css, html) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (html) e.innerHTML = html; return e; }
  function loadThree() {
    return new Promise(function (ok, fail) {
      if (window.THREE) return ok();
      var s = document.createElement('script'); s.src = THREE_URL; s.onload = ok; s.onerror = fail; document.head.appendChild(s);
    });
  }
  function G(w, h, d) { var k = w + '|' + h + '|' + d; return S.geo[k] || (S.geo[k] = new THREE.BoxGeometry(w, h, d)); }
  function add(g, geo, mat, x, y, z) {
    var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; g.add(m); return m;
  }
  function tag(l1, l2, color, sc) {
    var c = document.createElement('canvas'); c.width = 320; c.height = 96; var x = c.getContext('2d');
    x.fillStyle = 'rgba(14,19,17,.88)'; x.fillRect(0, 0, 320, 96);
    x.fillStyle = '#' + ('000000' + color.toString(16)).slice(-6); x.fillRect(0, 0, 10, 96);
    x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.font = '600 34px sans-serif'; x.fillText(l1, 26, l2 ? 32 : 48, 280);
    if (l2) { x.fillStyle = '#b9c6bf'; x.font = '400 26px sans-serif'; x.fillText(l2, 26, 70, 280); }
    var s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    s.scale.set(1.6 * sc, 0.48 * sc, 1); s.renderOrder = 10; return s;
  }
  function materials() {
    if (S.mat) return S.mat;
    var m = {
      wood: new THREE.MeshStandardMaterial({ color: 0xa8793f, roughness: 0.9 }),
      k1: new THREE.MeshStandardMaterial({ color: 0xc49a62, roughness: 0.85 }),
      k2: new THREE.MeshStandardMaterial({ color: 0xb98f57, roughness: 0.85 }),
      tape: new THREE.MeshStandardMaterial({ color: 0xe2cfa5, roughness: 0.6 }),
      wrap: new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.2, depthWrite: false }),
      wall: new THREE.MeshStandardMaterial({ color: 0x9fd0e0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
      st: {}
    };
    Object.keys(ST).forEach(function (k) { m.st[k] = new THREE.MeshStandardMaterial({ color: ST[k], roughness: 0.6 }); });
    return (S.mat = m);
  }
  function clear(grp) {
    for (var i = grp.children.length - 1; i >= 0; i--) {
      var o = grp.children[i]; grp.remove(o);
      o.traverse(function (n) { if (n.isSprite) { n.material.map.dispose(); n.material.dispose(); } });
    }
  }

  function pallet(slot, idx, grid, x, z) {
    var M = materials(), g = new THREE.Group();
    g.position.set(x, 0, z); g.userData.ref = { idx: idx, grid: grid };
    [-0.45, 0, 0.45].forEach(function (dz) { add(g, G(PW, 0.1, 0.12), M.wood, 0, 0.05, dz); });
    for (var i = 0; i < 5; i++) add(g, G(PW, 0.03, 0.16), M.wood, 0, 0.115, -0.44 + i * 0.22);
    var lim = (typeof e3dGetPalletLimit === 'function' && e3dGetPalletLimit(slot.boxType, slot.caliber, slot.boxModel)) || 1;
    var L = Math.max(1, Math.ceil(Math.min(1, (slot.boxes || 0) / lim) * 6));
    for (var l = 0; l < L; l++) for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) {
      var px = a ? 0.35 : -0.35, pz = b ? 0.27 : -0.27, y = H0 + BH / 2 + l * BH;
      add(g, G(0.68, BH - 0.01, 0.52), (l + a + b) % 2 ? M.k1 : M.k2, px, y, pz);
      if (l === L - 1) add(g, G(0.1, 0.006, 0.52), M.tape, px, H0 + (l + 1) * BH - 0.002, pz);
    }
    var top = L * BH, st = slot.status;
    add(g, G(0.42, 0.18, 0.012), M.st[st] || M.st.forming, 0, H0 + BH * 0.85, 0.535).castShadow = false;
    if (st !== 'forming') { var w = add(g, G(PW + 0.03, top, PD + 0.03), M.wrap, 0, H0 + top / 2, 0); w.castShadow = false; w.receiveShadow = false; }
    var days = typeof e3dGetPalletAge === 'function' ? e3dGetPalletAge(slot.createdAt) : 0;
    var t = tag('P' + String(slot.palletNum || idx + 1).padStart(2, '0') + ' · ' + days + (days === 1 ? ' dia' : ' dias'),
      ((slot.boxType || '') + (slot.caliber ? ' Cal.' + slot.caliber : '') + ' · ' + (slot.boxes || 0) + ' cx').trim(), ST[st] || ST.forming, 0.8);
    t.position.set(0, H0 + top + 0.45, 0); g.add(t);
    return g;
  }

  function build() {
    if (!S.r || typeof e3d === 'undefined') return;
    clear(S.world); S.pal = new THREE.Group(); S.world.add(S.pal);
    var dark = document.documentElement.getAttribute('data-theme') !== 'light', M = materials();
    S.sc.background = new THREE.Color(dark ? 0x0e1311 : 0xf4f6f4);
    var base = add(S.world, G(140, 0.01, 140), new THREE.MeshStandardMaterial({ color: dark ? 0x171d1a : 0xe3e8e4, roughness: 1 }), 0, -0.01, 0); base.castShadow = false;
    var zs = [
      { g: e3d.grid, cols: e3d.cols, name: 'packing', title: 'PACKING HOUSE', floor: dark ? 0x28312c : 0xc9d1cc, off: 0 },
      { g: e3d.coldGrid, cols: e3d.coldCols, name: 'cold', title: 'CÂMARA FRIA', floor: dark ? 0x24363e : 0xbdd1da, cold: true }
    ];
    var maxD = 0, xEnd = 0;
    zs.forEach(function (z, n) {
      z.cols = Math.max(1, z.cols || 4); z.g = z.g || [];
      if (n) z.off = zs[0].cols * SX + 2.5;
      var rows = Math.max(1, Math.ceil(z.g.length / z.cols)), W = z.cols * SX, D = rows * SZ, x0 = z.off - SX / 2, z0 = -SZ / 2;
      maxD = Math.max(maxD, D); xEnd = x0 + W;
      var fl = add(S.world, G(W, 0.02, D), new THREE.MeshStandardMaterial({ color: z.floor, roughness: 1 }), x0 + W / 2, 0.005, z0 + D / 2); fl.castShadow = false;
      var ttl = tag(z.title, '', z.cold ? 0x6fb5cf : 0xd9a441, 1.3); ttl.position.set(x0 + W / 2, 3.3, z0); S.world.add(ttl);
      if (z.cold) [[W, 2.6, 0.06, x0 + W / 2, 1.3, z0], [0.06, 2.6, D, x0, 1.3, z0 + D / 2], [0.06, 2.6, D, x0 + W, 1.3, z0 + D / 2]].forEach(function (a) {
        var w = add(S.world, G(a[0], a[1], a[2]), M.wall, a[3], a[4], a[5]); w.castShadow = false;
      });
      z.g.forEach(function (slot, i) {
        var x = z.off + (i % z.cols) * SX, zz = Math.floor(i / z.cols) * SZ;
        if (!slot || slot.status === 'empty') {
          var mk = add(S.world, G(PW + 0.1, 0.01, PD + 0.1), new THREE.MeshStandardMaterial({ color: dark ? 0x313b35 : 0xb4bdb7, roughness: 1 }), x, 0.018, zz); mk.castShadow = false;
        } else S.pal.add(pallet(slot, i, z.name, x, zz));
      });
    });
    var cx = (-SX / 2 + xEnd) / 2, cz = maxD / 2 - SZ / 2;
    S.cur.t.set(cx, 0.6, cz);
    S.dir.position.set(cx + 14, 22, cz + 16); S.dir.target.position.set(cx, 0, cz);
    if (S.first) { S.cur.rad = Math.min(60, Math.max(16, Math.max(xEnd * 0.85, maxD * 1.2) + 8)); S.first = false; }
    place();
  }

  function place() {
    var c = S.cur;
    S.cam.position.set(c.t.x + c.rad * Math.sin(c.ph) * Math.sin(c.th), c.t.y + c.rad * Math.cos(c.ph), c.t.z + c.rad * Math.sin(c.ph) * Math.cos(c.th));
    S.cam.lookAt(c.t); S.r.render(S.sc, S.cam);
  }

  function pick(e) {
    var b = S.r.domElement.getBoundingClientRect(), rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2((e.clientX - b.left) / b.width * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1), S.cam);
    var hit = rc.intersectObjects(S.pal.children, true)[0]; if (!hit) return;
    var o = hit.object; while (o && !o.userData.ref) o = o.parent;
    if (o && typeof e3dOpenPalletModal === 'function') e3dOpenPalletModal(o.userData.ref.idx, o.userData.ref.grid);
  }

  function setup(cv) {
    var w = cv.clientWidth || 900, h = cv.clientHeight || 640;
    S.r = new THREE.WebGLRenderer({ antialias: true }); S.r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    S.r.setSize(w, h); S.r.shadowMap.enabled = true; S.r.shadowMap.type = THREE.PCFSoftShadowMap; cv.appendChild(S.r.domElement);
    S.sc = new THREE.Scene(); S.cam = new THREE.PerspectiveCamera(40, w / h, 0.1, 300);
    S.sc.add(new THREE.HemisphereLight(0xffffff, 0x556058, 0.8));
    S.dir = new THREE.DirectionalLight(0xffffff, 0.85); S.dir.castShadow = true; S.dir.shadow.mapSize.set(2048, 2048);
    var sh = S.dir.shadow.camera; sh.left = -32; sh.right = 32; sh.top = 32; sh.bottom = -32; sh.far = 90;
    S.sc.add(S.dir); S.sc.add(S.dir.target);
    S.world = new THREE.Group(); S.sc.add(S.world);
    S.cur = { th: 0.35, ph: 1.0, rad: 26, t: new THREE.Vector3() };
    var dom = S.r.domElement, dn = null; dom.style.cursor = 'grab'; dom.style.touchAction = 'none';
    dom.addEventListener('pointerdown', function (e) { dn = { x: e.clientX, y: e.clientY, mv: 0 }; dom.setPointerCapture(e.pointerId); });
    dom.addEventListener('pointermove', function (e) {
      if (!dn) return; var dx = e.clientX - dn.x, dy = e.clientY - dn.y; dn.mv += Math.abs(dx) + Math.abs(dy); dn.x = e.clientX; dn.y = e.clientY;
      S.cur.th -= dx * 0.006; S.cur.ph = Math.min(1.45, Math.max(0.25, S.cur.ph - dy * 0.006)); place();
    });
    dom.addEventListener('pointerup', function (e) { if (dn && dn.mv < 6) pick(e); dn = null; });
    dom.addEventListener('wheel', function (e) { e.preventDefault(); S.cur.rad = Math.min(70, Math.max(6, S.cur.rad * (1 + Math.sign(e.deltaY) * 0.1))); place(); }, { passive: false });
    new ResizeObserver(function () {
      var W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
      S.r.setSize(W, H); S.cam.aspect = W / H; S.cam.updateProjectionMatrix(); place();
    }).observe(cv);
  }

  function init() {
    var zones = document.getElementById('e3d-zones-wrap');
    if (!zones) return false;
    if (document.getElementById('e3d-left')) return true;
    var left = el('div', 'min-width:0'); left.id = 'e3d-left'; zones.parentNode.insertBefore(left, zones);
    var bar = el('div', 'display:flex;gap:8px;margin-bottom:12px'), bG = el('button', '', 'Grade'), b3 = el('button', '', 'Visão 3D');
    var wrap = el('div', 'display:none;position:relative;height:640px;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--bg)'); wrap.id = 'e3d-3d-wrap';
    var cv = el('div', 'position:absolute;inset:0'); cv.id = 'e3d-3d-canvas';
    var hint = el('div', 'position:absolute;left:12px;bottom:10px;font-size:12px;color:var(--muted);pointer-events:none', 'Arraste para girar · roda do mouse para aproximar · clique em um pallet para abrir');
    var leg = el('div', 'position:absolute;right:12px;top:10px;display:flex;gap:14px;font-size:12px;color:var(--muted);pointer-events:none',
      [['Em formação', '#4f7cac'], ['Fechado', '#3aa872'], ['Etiquetado', '#d9a441']].map(function (a) {
        return '<span><i style="display:inline-block;width:9px;height:9px;border-radius:2px;background:' + a[1] + ';margin-right:5px"></i>' + a[0] + '</span>';
      }).join(''));
    bar.append(bG, b3); wrap.append(cv, hint, leg); left.append(bar, wrap, zones);
    function mode(three) {
      S.visible = three; zones.style.display = three ? 'none' : ''; wrap.style.display = three ? 'block' : 'none';
      bG.className = three ? 'sec' : ''; b3.className = three ? '' : 'sec';
      (three ? b3 : bG).removeAttribute('class');
      (three ? bG : b3).className = 'sec';
      if (!three) return;
      loadThree().then(function () { if (!S.r) setup(cv); build(); })
        .catch(function () { cv.innerHTML = '<div style="padding:24px;color:var(--muted)">Não foi possível carregar o motor 3D (verifique a conexão com a internet). A Grade continua funcionando normalmente.</div>'; });
    }
    bG.onclick = function () { mode(false); }; b3.onclick = function () { mode(true); }; mode(false);
    var tm; function later() { if (!S.visible || !S.r) return; clearTimeout(tm); tm = setTimeout(build, 150); }
    var mo = new MutationObserver(later);
    ['e3d-grid-packing', 'e3d-grid-cold'].forEach(function (id) { var n = document.getElementById(id); if (n) mo.observe(n, { childList: true }); });
    new MutationObserver(later).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return true;
  }

  function start() { try { if (!init()) window.addEventListener('load', init); } catch (e) { console.warn('estoque3d:', e); } }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
