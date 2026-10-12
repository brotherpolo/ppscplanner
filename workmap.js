/* Cadence — Workmap: a large pan-and-zoom canvas of shapes joined by lines.
   Maps are cached in this browser. When you're signed in with Firebase they also
   sync to users/{uid}/maps/{mapId}, which only you can read (see firestore.rules).

   Map  = { id, name, bg, nodes, edges, createdAt, updatedAt }
   Node = { id, x, y, w, h, shape, color, style, label, url, fs, bold }   (x, y = center)
   Edge = { id, from, to, style, color, arrow, label }                                  */
(function () {
  const C = window.Cadence;
  const { esc, icon } = C;
  const LS = 'cadence.workmap.v1';
  const LS_VIEW = 'cadence.workmap.views';
  const MAX_NODES = 1500, MAX_EDGES = 3000;

  const COLORS = ['#5B7FEA', '#6CC36A', '#E0574F', '#D9558F', '#EE8A3A', '#8B5CF6', '#6366F1', '#1BA7A0', '#E9B730', '#6B7488', '#A0703C', '#E5E7EB'];
  const SHAPES = [['circle', 'Circle'], ['rounded', 'Rounded'], ['rect', 'Box'], ['pill', 'Pill'], ['diamond', 'Diamond'], ['hexagon', 'Hexagon']];
  const STYLES = [['solid', 'Solid'], ['outline', 'Outline'], ['soft', 'Soft']];
  const EDGE_STYLES = [['solid', 'Solid'], ['dashed', 'Dashed'], ['flow', 'Dotted flow']];
  const ARROWS = [['none', 'None'], ['end', 'End'], ['both', 'Both']];
  const BGS = [['auto', 'Theme'], ['dark', 'Dark'], ['light', 'Light']];
  const SIZE_F = { S: 0.72, M: 1, L: 1.35, XL: 1.8 };

  /* ================= data ================= */
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } };
  const data = Object.assign({ owner: null, maps: {}, current: null }, load(LS, {}));
  if (!data.maps || typeof data.maps !== 'object') data.maps = {};
  const views = load(LS_VIEW, {});
  const saveLocal = C.debounce(() => keep(LS, data), 150);
  const saveViews = C.debounce(() => keep(LS_VIEW, views), 400);

  const cur = () => data.maps[data.current] || null;
  const node = (id) => { const m = cur(); return m ? m.nodes.find((n) => n.id === id) || null : null; };
  const edge = (id) => { const m = cur(); return m ? m.edges.find((e) => e.id === id) || null : null; };
  const okColor = (c) => (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r2 = (v) => Math.round(v * 100) / 100;

  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u) return null;
    if (/^(https?:\/\/|mailto:|tel:)/i.test(u)) return u;
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?([/?#]\S*)?$/.test(u)) return 'https://' + u;
    return null;
  }

  function sizeFor(shape, k) {
    const f = SIZE_F[k] || 1;
    const base = { circle: [130, 130], diamond: [170, 170], hexagon: [190, 110], pill: [200, 60] }[shape] || [190, 68];
    return [Math.round(base[0] * f), Math.round(base[1] * f)];
  }
  const autoFs = (n) => Math.round(clamp(Math.min(n.w, n.h * 1.6) * 0.11, 12, 22));
  const fsOf = (n) => n.fs || autoFs(n);

  function sanitizeMap(m) {
    if (!m || typeof m !== 'object' || !m.id) return null;
    const nodes = (Array.isArray(m.nodes) ? m.nodes : []).filter((n) => n && n.id).map((n) => ({
      id: String(n.id), x: +n.x || 0, y: +n.y || 0, w: clamp(+n.w || 160, 30, 2000), h: clamp(+n.h || 64, 24, 2000),
      shape: SHAPES.some((s) => s[0] === n.shape) ? n.shape : 'rounded', color: okColor(n.color) || COLORS[0],
      style: STYLES.some((s) => s[0] === n.style) ? n.style : 'solid', label: String(n.label || ''), url: String(n.url || ''),
      fs: n.fs ? clamp(+n.fs, 8, 72) : null, bold: !!n.bold
    }));
    const ids = new Set(nodes.map((n) => n.id));
    const edges = (Array.isArray(m.edges) ? m.edges : []).filter((e) => e && e.id && ids.has(e.from) && ids.has(e.to)).map((e) => ({
      id: String(e.id), from: String(e.from), to: String(e.to),
      style: EDGE_STYLES.some((s) => s[0] === e.style) ? e.style : 'solid', color: okColor(e.color),
      arrow: ARROWS.some((a) => a[0] === e.arrow) ? e.arrow : 'none', label: String(e.label || '')
    }));
    return { id: String(m.id), name: String(m.name || 'Untitled map').slice(0, 200), bg: BGS.some((b) => b[0] === m.bg) ? m.bg : 'auto', nodes, edges, createdAt: +m.createdAt || Date.now(), updatedAt: +m.updatedAt || Date.now() };
  }
  Object.keys(data.maps).forEach((id) => { const m = sanitizeMap(data.maps[id]); if (m) data.maps[id] = m; else delete data.maps[id]; });

  function newNode(o) {
    const shape = o.shape || 'circle';
    const [w, h] = sizeFor(shape, o.size || 'M');
    return Object.assign({ id: C.uid('n'), x: 0, y: 0, w, h, shape, color: COLORS[0], style: 'solid', label: '', url: '', fs: null, bold: false }, o, { size: undefined });
  }
  const newEdge = (from, to, o) => Object.assign({ id: C.uid('e'), from, to, style: 'solid', color: null, arrow: 'none', label: '' }, o || {});

  function starterMap() {
    const n1 = newNode({ shape: 'diamond', size: 'L', x: 0, y: 0, color: '#5B7FEA', style: 'soft', bold: true, label: 'My workmap' });
    const n2 = newNode({ shape: 'circle', x: -360, y: -170, color: '#6CC36A', bold: true, label: 'Double-click to rename' });
    const n3 = newNode({ shape: 'rounded', size: 'L', x: 380, y: -170, color: '#EE8A3A', style: 'outline', label: 'Select a shape, then drag its blue dot to connect' });
    const n4 = newNode({ shape: 'rounded', size: 'L', x: 380, y: 200, color: '#D9558F', style: 'outline', label: 'Use the panel to change shape, color and add a link' });
    const n5 = newNode({ shape: 'circle', x: -360, y: 200, color: '#8B5CF6', bold: true, label: 'Press Tab to add a connected shape' });
    const now = Date.now();
    return {
      id: C.uid('m'), name: 'My workmap', bg: 'auto', createdAt: now, updatedAt: now,
      nodes: [n1, n2, n3, n4, n5],
      edges: [newEdge(n1.id, n2.id), newEdge(n1.id, n3.id, { style: 'flow' }), newEdge(n1.id, n4.id), newEdge(n1.id, n5.id, { style: 'dashed' })]
    };
  }
  function blankMap(name) { const now = Date.now(); return { id: C.uid('m'), name: name || 'Untitled map', bg: 'auto', nodes: [], edges: [], createdAt: now, updatedAt: now }; }

  function ensureMap() {
    const ids = Object.keys(data.maps);
    if (!ids.length) { const m = starterMap(); data.maps[m.id] = m; data.current = m.id; touch(m, true); }
    else if (!data.maps[data.current]) data.current = ids.sort((a, b) => data.maps[b].updatedAt - data.maps[a].updatedAt)[0];
    saveLocal();
  }

  /** Mark a map changed: cache it and queue a cloud write */
  function touch(m, keepTime) {
    m = m || cur(); if (!m) return;
    if (!keepTime) m.updatedAt = Date.now();
    saveLocal();
    queueRemote(m.id);
  }

  /* ================= cloud sync (Firebase) ================= */
  const sync = { status: 'local', lastAt: null, error: null };
  let col = null, started = false, remoteReady = false, deferred = false;
  const known = new Set();   // ids the server has confirmed
  const deleted = new Set(); // deleted here, delete not yet confirmed
  const q = {};
  const busy = (id) => q[id] && (q[id].busy || q[id].dirty);

  function setSync(status, err) {
    sync.status = status;
    if (status === 'synced') { sync.lastAt = Date.now(); sync.error = null; }
    if (err) sync.error = err;
    renderSync();
  }
  function refreshSync() {
    if (!col) return;
    if (sync.status === 'error' && sync.error && Object.values(q).some((s) => s.failed)) return;
    if (!navigator.onLine) return setSync('offline');
    if (Object.keys(q).some(busy)) return setSync('saving');
    setSync('synced');
  }
  function queueRemote(id) {
    if (!col) return;
    const s = q[id] || (q[id] = { t: 0, busy: false, dirty: false, failed: false });
    s.dirty = true;
    clearTimeout(s.t);
    s.t = setTimeout(() => pump(id, s), 700);
    if (sync.status !== 'error') setSync(navigator.onLine ? 'saving' : 'offline');
  }
  async function pump(id, s) {
    if (s.busy) return;
    s.busy = true;
    while (s.dirty && col) {
      s.dirty = false;
      const m = data.maps[id];
      try {
        if (m && !deleted.has(id)) { await col.doc(id).set(JSON.parse(JSON.stringify(m))); known.add(id); }
        else { await col.doc(id).delete(); deleted.delete(id); known.delete(id); }
        s.failed = false;
      } catch (e) {
        console.warn('Workmap sync failed for', id, e);
        s.failed = true; s.busy = false;
        return setSync('error', e);
      }
    }
    s.busy = false;
    refreshSync();
  }
  function retrySync() {
    sync.error = null;
    Object.keys(q).forEach((id) => { q[id].failed = false; });
    sync.status = 'saving';
    Object.keys(data.maps).forEach(queueRemote);
    deleted.forEach(queueRemote);
    refreshSync();
  }
  window.addEventListener('online', () => { if (col) retrySync(); });
  window.addEventListener('offline', () => { if (col) refreshSync(); });

  function startSync() {
    if (started) return;
    started = true;
    const FB = C.firebaseSync;
    if (!FB || !FB.enabled) { remoteReady = true; ensureMap(); return; }
    setSync('connecting');
    FB.collection().then(() => {
      if (!FB.db || !FB.uid) throw new Error('Not signed in');
      // never upload one person's cached maps into another account
      if (data.owner && data.owner !== FB.uid) { data.maps = {}; data.current = null; }
      data.owner = FB.uid;
      saveLocal();
      col = FB.db.collection('users').doc(FB.uid).collection('maps');
      let first = true;
      const timer = setTimeout(() => { if (first) { first = false; remoteReady = true; ensureMap(); setSync('error', { code: 'timeout', message: 'No answer from the database.' }); rerender(); } }, 12000);
      col.onSnapshot({ includeMetadataChanges: true }, (snap) => {
        if (first && snap.metadata.fromCache && navigator.onLine) return; // wait for server truth
        const wasFirst = first;
        first = false;
        clearTimeout(timer);
        let changedCurrent = false;
        const remoteIds = new Set();
        snap.docs.forEach((d) => {
          remoteIds.add(d.id);
          if (deleted.has(d.id)) return;
          if (!d.metadata.hasPendingWrites) known.add(d.id);
          if (d.metadata.hasPendingWrites || busy(d.id)) return;
          const remote = sanitizeMap(Object.assign({}, d.data(), { id: d.id }));
          const local = data.maps[d.id];
          if (!remote) return;
          if (!local || remote.updatedAt > local.updatedAt) {
            data.maps[d.id] = remote;
            if (d.id === data.current) changedCurrent = true;
          }
        });
        Object.keys(data.maps).forEach((id) => {
          if (remoteIds.has(id) || busy(id)) return;
          if (known.has(id) && !wasFirst) { // deleted on another device
            delete data.maps[id]; known.delete(id);
            if (id === data.current) { data.current = null; changedCurrent = true; }
          } else queueRemote(id); // only here so far: upload it
        });
        remoteReady = true;
        ensureMap();
        saveLocal();
        refreshSync();
        if (wasFirst || changedCurrent) { if (wasFirst) resetHistory(); rerender(); }
        else if (el) renderBar();
      }, (err) => { console.warn('Workmap sync stopped:', err); clearTimeout(timer); remoteReady = true; ensureMap(); setSync('error', err); rerender(); });
    }).catch((e) => { remoteReady = true; ensureMap(); setSync('error', e); rerender(); });
  }

  /* ================= geometry ================= */
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const f = r2;
    return 'M' + f(x + r) + ' ' + f(y) + 'H' + f(x + w - r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + w) + ' ' + f(y + r) +
      'V' + f(y + h - r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + w - r) + ' ' + f(y + h) +
      'H' + f(x + r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x) + ' ' + f(y + h - r) +
      'V' + f(y + r) + 'A' + f(r) + ' ' + f(r) + ' 0 0 1 ' + f(x + r) + ' ' + f(y) + 'Z';
  }
  /** SVG path for a shape filling a w×h box, inset by i (works for <path d> and Path2D) */
  function shapePath(shape, w, h, i) {
    const f = r2, W = w - i, H = h - i, iw = w - 2 * i, ih = h - 2 * i;
    switch (shape) {
      case 'circle': { const rx = iw / 2, ry = ih / 2, cx = w / 2, cy = h / 2; return 'M' + f(cx - rx) + ' ' + f(cy) + 'A' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(cx + rx) + ' ' + f(cy) + 'A' + f(rx) + ' ' + f(ry) + ' 0 1 0 ' + f(cx - rx) + ' ' + f(cy) + 'Z'; }
      case 'diamond': return 'M' + f(w / 2) + ' ' + f(i) + 'L' + f(W) + ' ' + f(h / 2) + 'L' + f(w / 2) + ' ' + f(H) + 'L' + f(i) + ' ' + f(h / 2) + 'Z';
      case 'hexagon': { const k = Math.min(iw * 0.25, ih * 0.5); return 'M' + f(i + k) + ' ' + f(i) + 'L' + f(W - k) + ' ' + f(i) + 'L' + f(W) + ' ' + f(h / 2) + 'L' + f(W - k) + ' ' + f(H) + 'L' + f(i + k) + ' ' + f(H) + 'L' + f(i) + ' ' + f(h / 2) + 'Z'; }
      case 'rect': return rr(i, i, iw, ih, 3);
      case 'pill': return rr(i, i, iw, ih, Math.min(iw, ih) / 2);
      default: return rr(i, i, iw, ih, Math.min(16, ih / 3, iw / 3));
    }
  }
  /** Where the line from n's center toward (px, py) leaves n's outline */
  function edgePoint(n, px, py) {
    const dx = px - n.x, dy = py - n.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (!ax && !ay) return { x: n.x, y: n.y };
    const a = n.w / 2, b = n.h / 2;
    let t;
    if (n.shape === 'circle') t = 1 / Math.sqrt((dx * dx) / (a * a) + (dy * dy) / (b * b));
    else if (n.shape === 'diamond') t = 1 / (ax / a + ay / b);
    else if (n.shape === 'hexagon') { const k = Math.min(n.w * 0.25, n.h * 0.5); t = Math.min(ay ? b / ay : Infinity, a / (ax + (k * ay) / b)); }
    else t = 1 / Math.max(ax / a, ay / b);
    return { x: n.x + dx * t, y: n.y + dy * t };
  }
  function edgeGeom(e, byId) {
    const a = byId.get(e.from), b = byId.get(e.to);
    if (!a || !b) return null;
    const p1 = edgePoint(a, b.x, b.y), p2 = edgePoint(b, a.x, a.y);
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, len, ang: Math.atan2(p2.y - p1.y, p2.x - p1.x) };
  }
  function arrowPts(x, y, ang, s) {
    const a1 = ang + Math.PI - 0.42, a2 = ang + Math.PI + 0.42;
    return [[x, y], [x + Math.cos(a1) * s, y + Math.sin(a1) * s], [x + Math.cos(a2) * s, y + Math.sin(a2) * s]];
  }
  function bounds(nodes) {
    if (!nodes.length) return null;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    nodes.forEach((n) => { x1 = Math.min(x1, n.x - n.w / 2); y1 = Math.min(y1, n.y - n.h / 2); x2 = Math.max(x2, n.x + n.w / 2); y2 = Math.max(y2, n.y + n.h / 2); });
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  function lum(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0.3;
    const v = parseInt(m[1], 16);
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f((v >> 16) & 255) + 0.7152 * f((v >> 8) & 255) + 0.0722 * f(v & 255);
  }
  const darkInk = (hex) => { const L = lum(hex); return (L + 0.05) / 0.05 > 1.05 / (L + 0.05); };

  /* ================= history ================= */
  let past = [], future = [];
  const snapshot = () => { const m = cur(); return m ? JSON.stringify({ nodes: m.nodes, edges: m.edges }) : null; };
  function pushHistory() {
    const s = snapshot(); if (!s) return;
    if (past[past.length - 1] === s) return false;
    past.push(s); if (past.length > 150) past.shift();
    future = [];
    return true;
  }
  function resetHistory() { past = []; future = []; }
  function restore(s) {
    const m = cur(); if (!m || !s) return;
    const d = JSON.parse(s);
    m.nodes = d.nodes; m.edges = d.edges;
    const ids = new Set(m.nodes.map((n) => n.id));
    ui.sel = new Set([...ui.sel].filter((id) => ids.has(id)));
    if (ui.edge && !m.edges.some((e) => e.id === ui.edge)) ui.edge = null;
    touch(m); render();
  }
  function undo() { if (!past.length) return; future.push(snapshot()); restore(past.pop()); }
  function redo() { if (!future.length) return; past.push(snapshot()); restore(future.pop()); }

  /* ================= ui state ================= */
  const narrow = () => matchMedia('(max-width: 899px)').matches;
  const ui = {
    mode: 'pan',        // 'pan' | 'select' | 'connect' | 'flow'
    sel: new Set(), edge: null, from: null, editing: null,
    panel: !narrow(), menu: false, hints: load('cadence.workmap.hints', true), clip: null
  };
  let view = { x: 0, y: 0, z: 1 };
  let el = null, stage = null, world = null, edgesEl = null, labelsEl = null, nodesEl = null, overlay = null, panelEl = null, floatEl = null, marqueeEl = null;
  let g = null, pinch = null, spaceDown = false, lastTap = null, lastNudge = 0, typingHistory = false;
  const pointers = new Map();
  const off = [];
  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); off.push(() => t.removeEventListener(ev, fn, o)); };

  const selNodes = () => { const m = cur(); return m ? m.nodes.filter((n) => ui.sel.has(n.id)) : []; };
  const selEdge = () => (ui.edge ? edge(ui.edge) : null);
  function select(ids, edgeId) { ui.sel = new Set(ids || []); ui.edge = edgeId || null; }

  /* ================= view ================= */
  const C_view = C.views.workmap = {
    title: 'Workmap',
    mount(root) {
      el = root;
      startSync();
      root.innerHTML = '<section class="wm" aria-label="Workmap">' +
        '<div class="wm-stage" tabindex="0" aria-label="Map canvas. Double-click to add a shape.">' +
        '<div class="wm-world"><svg class="wm-edges" aria-hidden="true"></svg><div class="wm-elabels"></div><div class="wm-nodes"></div><svg class="wm-overlay" aria-hidden="true"></svg></div>' +
        '<div class="wm-marquee" hidden></div><div class="wm-float" hidden></div><div class="wm-mode-tip" hidden></div>' +
        '<div class="wm-empty" hidden></div></div>' +
        '<div class="wm-bar" role="toolbar" aria-label="Workmap tools"></div><div class="wm-menuhost"></div>' +
        '<aside class="wm-panel" hidden aria-label="Selection properties"></aside>' +
        '<div class="wm-hints"></div>' +
        '<div class="wm-zoom"><button type="button" class="icon-btn sm" data-zoom="-1" aria-label="Zoom out" title="Zoom out">' + icon('minus') + '</button>' +
        '<button type="button" class="wm-zpct mono" data-zoom="1:1" title="Reset to 100%">100%</button>' +
        '<button type="button" class="icon-btn sm" data-zoom="1" aria-label="Zoom in" title="Zoom in">' + icon('plus') + '</button><span class="wm-zsep"></span>' +
        '<button type="button" class="icon-btn sm" data-zoom="fit" aria-label="Fit map to screen" title="Fit to screen (Shift+1)">' + icon('fit') + '</button></div>' +
        '<input type="file" accept="application/json,.json" class="wm-file" hidden>' +
        '</section>';
      const q1 = (s) => root.querySelector(s);
      stage = q1('.wm-stage'); world = q1('.wm-world'); edgesEl = q1('.wm-edges'); labelsEl = q1('.wm-elabels'); nodesEl = q1('.wm-nodes');
      overlay = q1('.wm-overlay'); panelEl = q1('.wm-panel'); floatEl = q1('.wm-float'); marqueeEl = q1('.wm-marquee');
      on(stage, 'pointerdown', onDown);
      on(stage, 'pointermove', onMove);
      on(stage, 'pointerup', onUp);
      on(stage, 'pointercancel', onUp);
      on(stage, 'wheel', onWheel, { passive: false });
      on(stage, 'contextmenu', (e) => { if (!e.target.closest('textarea,a')) e.preventDefault(); });
      on(document, 'keydown', onKey);
      on(document, 'keyup', (e) => { if (e.key === ' ') { spaceDown = false; stage && stage.classList.remove('space'); } });
      on(root, 'click', onClick);
      on(panelEl, 'input', onPanelInput);
      on(panelEl, 'change', onPanelChange);
      on(panelEl, 'focusin', (e) => { if (e.target.matches('[data-f]')) typingHistory = false; });
      on(panelEl, 'focusout', () => { setTimeout(() => { if (deferred && el && !panelEl.contains(document.activeElement)) rerender(); }, 0); });
      on(q1('.wm-file'), 'change', onImportFile);
      on(window, 'resize', () => { placeFloat(); });
      on(document, 'pointerdown', (e) => { if (ui.menu && !e.target.closest('.wm-menu,[data-menu]')) { ui.menu = false; renderBar(); } }, true);
      if (remoteReady) ensureMap();
      resetHistory();
      requestAnimationFrame(() => { openView(); render(); });
    },
    update() { /* tasks changed: nothing on this page depends on them */ },
    unmount() {
      commitEdit();
      off.splice(0).forEach((f) => f());
      el = stage = world = null; g = null; pinch = null; pointers.clear();
    }
  };

  function openView() {
    const m = cur();
    if (!m) return;
    const v = views[m.id];
    if (v && isFinite(v.x) && isFinite(v.z)) { view = { x: v.x, y: v.y, z: v.z }; applyView(); }
    else fit();
  }
  function storeView() { const m = cur(); if (m) { views[m.id] = { x: Math.round(view.x), y: Math.round(view.y), z: r2(view.z * 100) / 100 }; saveViews(); } }

  function applyView() {
    if (!world) return;
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')';
    world.style.setProperty('--z', view.z);
    let step = 24 * view.z;
    while (step < 12) step *= 4;
    stage.style.backgroundSize = step + 'px ' + step + 'px';
    stage.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
    const zp = el.querySelector('.wm-zpct'); if (zp) zp.textContent = Math.round(view.z * 100) + '%';
    placeFloat();
    storeView();
  }
  const rect = () => stage.getBoundingClientRect();
  function toWorld(cx, cy) { const r = rect(); return { x: (cx - r.left - view.x) / view.z, y: (cy - r.top - view.y) / view.z }; }
  function zoomAt(cx, cy, z) {
    const r = rect(), w = toWorld(cx, cy);
    view.z = clamp(z, 0.08, 3);
    view.x = cx - r.left - w.x * view.z;
    view.y = cy - r.top - w.y * view.z;
    applyView();
  }
  function zoomBy(k) { const r = rect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, view.z * k); }
  function fit(nodes) {
    const m = cur(); if (!m || !stage) return;
    const r = rect();
    const b = bounds(nodes || m.nodes);
    if (!b) { view = { x: r.width / 2, y: r.height / 2, z: 1 }; return applyView(); }
    const padTop = 84, pad = 48, panelW = (ui.panel && !narrow() && (ui.sel.size || ui.edge)) ? 320 : 0;
    const W = Math.max(100, r.width - pad * 2 - panelW), H = Math.max(100, r.height - padTop - pad);
    const z = clamp(Math.min(W / b.w, H / b.h), 0.08, 1.25);
    view = { z, x: pad + (W - b.w * z) / 2 - b.x * z, y: padTop + (H - b.h * z) / 2 - b.y * z };
    applyView();
  }
  function centerWorld() { const r = rect(); return toWorld(r.left + r.width / 2 - ((ui.panel && !narrow() && (ui.sel.size || ui.edge)) ? 150 : 0), r.top + r.height / 2 + 30); }

  /* ================= render ================= */
  function rerender() {
    if (!el) return;
    if (g || ui.editing || (panelEl && panelEl.contains(document.activeElement))) { deferred = true; return; }
    const m = cur();
    if (m && ui.sel.size) { const ids = new Set(m.nodes.map((n) => n.id)); ui.sel = new Set([...ui.sel].filter((id) => ids.has(id))); }
    if (m && ui.edge && !m.edges.some((e) => e.id === ui.edge)) ui.edge = null;
    openView(); render();
  }
  function render() {
    if (!el) return;
    deferred = false;
    const m = cur();
    const sec = el.querySelector('.wm');
    if (sec) sec.dataset.bg = m ? m.bg : 'auto';
    if (sec) sec.dataset.mode = ui.mode;
    renderBar(); renderEdges(); renderNodes(); renderPanel(); renderHints(); renderModeTip(); renderEmpty(); applyView();
  }
  function renderEmpty() {
    const box = el.querySelector('.wm-empty'); if (!box) return;
    const m = cur();
    if (!m) { box.hidden = false; box.innerHTML = '<p class="muted">Loading your maps…</p>'; return; }
    if (m.nodes.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<div class="wm-empty-card">' + icon('workmap') + '<h2>An empty map</h2><p class="muted">Double-click anywhere to add a shape, or use the button.</p><button type="button" class="btn primary sm" data-act="add">' + icon('plus') + '<span>Add a shape</span></button></div>';
  }

  function nodeHtml(n, single) {
    const sel = ui.sel.has(n.id);
    const href = safeUrl(n.url);
    const editing = ui.editing === n.id;
    const label = editing ? '<textarea class="wm-edit" rows="1" aria-label="Shape label" spellcheck="true">' + esc(n.label) + '</textarea>'
      : n.label ? (href ? '<span class="wm-link">' + esc(n.label) + '</span>' : esc(n.label)) : '<span class="wm-ph">Untitled</span>';
    return '<div class="wm-node s-' + n.style + ' sh-' + n.shape + (sel ? ' sel' : '') + (n.style === 'solid' ? (darkInk(n.color) ? ' ink-dark' : ' ink-light') : '') +
      (ui.from === n.id ? ' from' : '') + (editing ? ' editing' : '') + '" data-node="' + n.id + '" style="left:' + r2(n.x - n.w / 2) + 'px;top:' + r2(n.y - n.h / 2) + 'px;width:' + n.w + 'px;height:' + n.h + 'px;--c:' + (okColor(n.color) || COLORS[0]) + ';--fs:' + fsOf(n) + 'px">' +
      '<svg class="wm-shape" width="' + n.w + '" height="' + n.h + '" viewBox="0 0 ' + n.w + ' ' + n.h + '" aria-hidden="true"><path d="' + shapePath(n.shape, n.w, n.h, 1.5) + '"/></svg>' +
      '<div class="wm-label' + (n.bold ? ' b' : '') + '">' + label +
      (href && !editing ? '<a class="wm-open" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" title="Open ' + esc(href) + '" aria-label="Open link: ' + esc(href) + '">' + icon('external') + '</a>' : '') + '</div>' +
      (sel && single && !editing && ui.mode !== 'connect' && ui.mode !== 'flow' ? '<span class="wm-hdl-link" title="Drag to connect, or drop on empty space for a new shape"></span><span class="wm-hdl-size" title="Drag to resize (Shift keeps proportions)"></span>' : '') +
      '</div>';
  }
  function renderNodes() {
    const m = cur(); if (!m || !nodesEl) { if (nodesEl) nodesEl.innerHTML = ''; return; }
    const single = ui.sel.size === 1;
    nodesEl.innerHTML = m.nodes.map((n) => nodeHtml(n, single)).join('');
    if (ui.editing) {
      const ta = nodesEl.querySelector('.wm-edit');
      if (ta) { autoSize(ta); ta.addEventListener('input', () => autoSize(ta)); ta.addEventListener('keydown', onEditKey); ta.addEventListener('blur', () => commitEdit()); }
    }
    placeFloat();
  }
  function positionNode(n) {
    const d = nodesEl.querySelector('[data-node="' + n.id + '"]');
    if (d) { d.style.left = r2(n.x - n.w / 2) + 'px'; d.style.top = r2(n.y - n.h / 2) + 'px'; }
  }
  function renderEdges() {
    const m = cur(); if (!m || !edgesEl) return;
    const byId = new Map(m.nodes.map((n) => [n.id, n]));
    let svg = '', labels = '';
    m.edges.forEach((e) => {
      const p = edgeGeom(e, byId); if (!p || p.len < 1) return;
      const d = 'M' + r2(p.x1) + ' ' + r2(p.y1) + 'L' + r2(p.x2) + ' ' + r2(p.y2);
      const col = okColor(e.color);
      const pts = (a) => a.map((q2) => r2(q2[0]) + ',' + r2(q2[1])).join(' ');
      let arrows = '';
      if (e.arrow === 'end' || e.arrow === 'both') arrows += '<polygon class="wm-arrow" points="' + pts(arrowPts(p.x2, p.y2, p.ang, 11)) + '"/>';
      if (e.arrow === 'both') arrows += '<polygon class="wm-arrow" points="' + pts(arrowPts(p.x1, p.y1, p.ang + Math.PI, 11)) + '"/>';
      svg += '<g class="wm-edge st-' + e.style + (ui.edge === e.id ? ' sel' : '') + '" data-edge="' + e.id + '"' + (col ? ' style="--ec:' + col + '"' : '') + '>' +
        '<path class="wm-ehit" d="' + d + '"/><path class="wm-eline" d="' + d + '"/>' + arrows + '</g>';
      if (e.label) labels += '<div class="wm-elabel' + (ui.edge === e.id ? ' sel' : '') + '" data-edge="' + e.id + '" style="left:' + r2((p.x1 + p.x2) / 2) + 'px;top:' + r2((p.y1 + p.y2) / 2) + 'px' + (col ? ';--ec:' + col : '') + '">' + esc(e.label) + '</div>';
    });
    edgesEl.innerHTML = svg;
    labelsEl.innerHTML = labels;
  }

  /* ---------- toolbar ---------- */
  const SYNC_TXT = {
    local: ['On this device', 'Maps are saved in this browser only.'],
    connecting: ['Connecting…', 'Connecting to your account…'],
    saving: ['Saving…', 'Sending changes to your account…'],
    synced: ['Synced', 'All changes are saved to your account.'],
    offline: ['Offline', 'Changes are kept here and sent when you reconnect.'],
    error: ['Sync error', '']
  };
  function syncTitle() {
    if (sync.status === 'error') {
      const e = sync.error || {};
      if (e.code === 'permission-denied') return 'The database refused to save your map. Deploy the updated firestore.rules (firebase deploy --only firestore:rules), then tap to retry.';
      return (e.message || 'Sync stopped.') + ' Tap to retry. Your maps are safe in this browser.';
    }
    return SYNC_TXT[sync.status][1] + (sync.status === 'synced' && sync.lastAt ? ' Last saved ' + C.ago(sync.lastAt) + '.' : '');
  }
  function syncHtml() {
    const label = sync.status === 'synced' && sync.lastAt ? 'Synced ' + C.F.time.format(new Date(sync.lastAt)) : SYNC_TXT[sync.status][0];
    return '<button type="button" class="wm-sync s-' + sync.status + '" data-act="sync" title="' + esc(syncTitle()) + '"><span class="sync-dot" aria-hidden="true"></span><span>' + esc(label) + '</span></button>';
  }
  function renderSync() { if (!el) return; const b = el.querySelector('.wm-sync'); if (b) b.outerHTML = syncHtml(); }

  function tool(act, ic, label, opts) {
    opts = opts || {};
    return '<button type="button" class="wm-tool' + (opts.on ? ' on' : '') + (opts.cls ? ' ' + opts.cls : '') + '" data-act="' + act + '"' + (opts.disabled ? ' disabled' : '') +
      ' title="' + esc(opts.title || label) + '"' + (opts.pressed != null ? ' aria-pressed="' + !!opts.pressed + '"' : '') + '>' + icon(ic) + '<span class="wm-tl">' + esc(label) + '</span></button>';
  }
  function renderBar() {
    if (!el) return;
    const bar = el.querySelector('.wm-bar'); if (!bar) return;
    const m = cur();
    const maps = Object.values(data.maps).sort((a, b) => a.name.localeCompare(b.name));
    const has = ui.sel.size || ui.edge;
    const bg = m ? m.bg : 'auto';
    // keep focus in the name field while typing
    const nameFocused = document.activeElement && document.activeElement.classList.contains('wm-name');
    if (nameFocused) { const sy = bar.querySelector('.wm-sync'); if (sy) sy.outerHTML = syncHtml(); return; }
    bar.innerHTML =
      '<div class="wm-title"><span class="wm-logo" aria-hidden="true">' + icon('workmap') + '</span>' +
      '<input class="wm-name" value="' + esc(m ? m.name : '') + '" aria-label="Map name" maxlength="200" spellcheck="false"' + (m ? '' : ' disabled') + '>' +
      '<button type="button" class="icon-btn sm" data-menu aria-label="Maps menu" aria-expanded="' + ui.menu + '" title="Your maps">' + icon('chevD') + '</button>' +
'</div><span class="wm-sep"></span>' +
      '<div class="wm-group">' +
      tool('mode-select', 'cursor', 'Select', { on: ui.mode === 'select', pressed: ui.mode === 'select', title: 'Select: drag on empty space to box-select (V)' }) +
      tool('mode-pan', 'hand', 'Pan', { on: ui.mode === 'pan', pressed: ui.mode === 'pan', title: 'Pan: drag empty space to move around (H)' }) +
      tool('mode-connect', 'connect', 'Connect', { on: ui.mode === 'connect', pressed: ui.mode === 'connect', title: 'Connect: tap two shapes to join them with a line (C)' }) +
      tool('mode-flow', 'flow', 'Dotted flow', { on: ui.mode === 'flow', pressed: ui.mode === 'flow', title: 'Dotted flow: tap two shapes to join them with a dotted line (F)' }) +
      '</div><span class="wm-sep"></span>' +
      '<div class="wm-group">' +
      tool('undo', 'undo', 'Undo', { disabled: !past.length, title: 'Undo (Ctrl+Z)', cls: 'ic-only' }) +
      tool('redo', 'redo', 'Redo', { disabled: !future.length, title: 'Redo (Ctrl+Y)', cls: 'ic-only' }) +
      '</div><span class="wm-sep"></span>' +
      '<div class="wm-group">' +
      tool('select-all', 'selectall', 'Select all', { title: 'Select all (Ctrl+A)' }) +
      tool('add', 'plus', 'Add', { cls: 'accent', title: 'Add a shape (Shift++), or double-click the canvas' }) +
      tool('delete', 'trash', 'Delete', { disabled: !has, title: 'Delete selection (Delete)' }) +
      '</div><span class="wm-sep"></span>' +
      '<div class="wm-group">' +
      tool('png', 'image', 'PNG', { title: 'Download the map as a PNG image' }) +
      tool('fit', 'fit', 'Fit', { title: 'Fit the map to the screen (Shift+1)', cls: 'ic-only' }) +
      tool('bg', 'contrast', (BGS.find((b) => b[0] === bg) || BGS[0])[1], { title: 'Canvas background: ' + (BGS.find((b) => b[0] === bg) || BGS[0])[1] + '. Click to change.' }) +
      '</div><span class="wm-grow"></span>' + syncHtml();
    const host = el.querySelector('.wm-menuhost');
    host.innerHTML = ui.menu ? '<div class="wm-menu" role="menu"><p class="eyebrow">Your maps</p>' +
        maps.map((x) => '<button type="button" role="menuitem" class="wm-mi' + (m && x.id === m.id ? ' on' : '') + '" data-open="' + x.id + '">' + icon(m && x.id === m.id ? 'check' : 'workmap') + '<span>' + esc(x.name) + '</span><span class="muted mono">' + x.nodes.length + '</span></button>').join('') +
        '<hr><button type="button" role="menuitem" class="wm-mi" data-act="new-map">' + icon('plus') + '<span>New blank map</span></button>' +
        '<button type="button" role="menuitem" class="wm-mi" data-act="dup-map">' + icon('copy') + '<span>Duplicate this map</span></button>' +
        '<button type="button" role="menuitem" class="wm-mi" data-act="export-json">' + icon('download') + '<span>Export as JSON</span></button>' +
        '<button type="button" role="menuitem" class="wm-mi" data-act="import-json">' + icon('upload') + '<span>Import JSON as a new map</span></button>' +
        '<button type="button" role="menuitem" class="wm-mi danger" data-act="del-map">' + icon('trash') + '<span>Delete this map</span></button></div>' : '';
    if (ui.menu) {
      const mm = host.firstChild, btn = bar.querySelector('[data-menu]'), sec = el.querySelector('.wm');
      const br = btn.getBoundingClientRect(), pr = sec.getBoundingClientRect();
      mm.style.left = clamp(br.left - pr.left - 40, 8, pr.width - mm.offsetWidth - 8) + 'px';
      mm.style.top = (br.bottom - pr.top + 8) + 'px';
    }
  }

  function renderHints() {
    const h = el && el.querySelector('.wm-hints'); if (!h) return;
    if (!ui.hints) { h.innerHTML = '<button type="button" class="wm-hint-toggle" data-act="hints" title="Show shortcuts">?</button>'; return; }
    h.innerHTML = '<span><kbd>Double-click</kbd> add or rename</span><span><kbd>Tab</kbd> add connected</span><span><kbd>C</kbd> <kbd>F</kbd> connect modes</span>' +
      '<span><kbd>Ctrl Z</kbd> <kbd>Ctrl Y</kbd> undo/redo</span><span><kbd>Shift</kbd> click to multi-select</span>' +
      '<button type="button" class="icon-btn sm" data-act="hints" aria-label="Hide shortcuts" title="Hide">' + icon('x') + '</button>';
  }
  function renderModeTip() {
    const t = el && el.querySelector('.wm-mode-tip'); if (!t) return;
    if (ui.mode !== 'connect' && ui.mode !== 'flow') { t.hidden = true; return; }
    t.hidden = false;
    const kind = ui.mode === 'flow' ? 'dotted line' : 'line';
    t.innerHTML = '<span>' + (ui.from ? 'Now tap the shape to connect to' : 'Tap a shape to start a ' + kind + ', or drag from one shape to another') + '</span><button type="button" class="btn sm" data-act="mode-pan">Done</button>';
  }

  /* ---------- floating mini toolbar ---------- */
  function placeFloat() {
    if (!floatEl || !stage) return;
    const m = cur();
    const nodes = selNodes();
    const e = selEdge();
    if (g && g.moved || ui.editing || (!e && nodes.length !== 1) || !m) { floatEl.hidden = true; return; }
    let x, y, html;
    if (e) {
      const p = edgeGeom(e, new Map(m.nodes.map((n) => [n.id, n]))); if (!p) { floatEl.hidden = true; return; }
      x = ((p.x1 + p.x2) / 2) * view.z + view.x; y = ((p.y1 + p.y2) / 2) * view.z + view.y - 26;
      html = fbtn('panel', 'settings', 'Line style') + fbtn('reverse', 'swap', 'Reverse direction') + fbtn('delete', 'trash', 'Delete line', 'danger');
    } else {
      const n = nodes[0];
      const href = safeUrl(n.url);
      x = n.x * view.z + view.x; y = (n.y - n.h / 2) * view.z + view.y - 12;
      html = fbtn('rename', 'pencil', 'Rename') + fbtn('panel', 'settings', 'Shape, color and link') + fbtn('child', 'plus', 'Add connected shape (Tab)') +
        fbtn('connect-from', 'connect', 'Connect to another shape') +
        (href ? '<a class="icon-btn sm" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer" title="Open link" aria-label="Open link">' + icon('external') + '</a>' : '') +
        fbtn('delete', 'x', 'Delete shape', 'danger');
    }
    floatEl.innerHTML = html;
    floatEl.hidden = false;
    const r = rect();
    const fw = floatEl.offsetWidth, fh = floatEl.offsetHeight;
    let top = y - fh;
    if (top < 70) { // no room above: go below
      if (e) top = y + 40; else { const n = nodes[0]; top = (n.y + n.h / 2) * view.z + view.y + 12; }
    }
    floatEl.style.left = clamp(x - fw / 2, 8, r.width - fw - 8) + 'px';
    floatEl.style.top = clamp(top, 8, r.height - fh - 8) + 'px';
  }
  const fbtn = (act, ic, label, cls) => '<button type="button" class="icon-btn sm' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' + icon(ic) + '</button>';

  /* ---------- inspector panel ---------- */
  const shapeIcon = (s) => '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="' + shapePath(s, 22, s === 'circle' || s === 'diamond' ? 18 : 15, 1.2) + '" transform="translate(1 ' + (s === 'circle' || s === 'diamond' ? 3 : 4.5) + ')" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>';
  function seg(name, opts, curVal, attr) {
    return '<div class="seg wm-seg">' + opts.map(([id, label, inner]) => '<button type="button" class="seg-btn' + (curVal === id ? ' on' : '') + '" data-' + attr + '="' + id + '" aria-pressed="' + (curVal === id) + '" title="' + esc(label) + '">' + (inner || esc(label)) + '</button>').join('') + '</div>';
  }
  function swatches(attr, curVal, withAuto) {
    return '<div class="wm-swatches">' + (withAuto ? '<button type="button" class="wm-sw auto' + (!curVal ? ' on' : '') + '" data-' + attr + '="" title="Automatic" aria-label="Automatic color"></button>' : '') +
      COLORS.map((c) => '<button type="button" class="wm-sw' + (curVal && curVal.toLowerCase() === c.toLowerCase() ? ' on' : '') + '" data-' + attr + '="' + c + '" style="--c:' + c + '" aria-label="Color ' + c + '" title="' + c + '"></button>').join('') +
      '<label class="wm-sw custom" title="Custom color"><input type="color" data-f="' + attr + '-custom" value="' + (curVal || '#5B7FEA') + '" aria-label="Custom color">' + icon('paint') + '</label></div>';
  }
  function renderPanel() {
    if (!panelEl) return;
    const nodes = selNodes(), e = selEdge();
    const show = ui.panel && (nodes.length || e) && !ui.editing;
    panelEl.hidden = !show;
    if (!show) { panelEl.innerHTML = ''; return; }
    let h = '';
    if (e) {
      h = '<header class="wm-ph-head"><h2>Line</h2><button type="button" class="icon-btn sm" data-act="close-panel" aria-label="Close panel">' + icon('x') + '</button></header>' +
        '<div class="wm-field"><span class="field-label">Style</span>' + seg('style', EDGE_STYLES, e.style, 'estyle') + '</div>' +
        '<div class="wm-field"><span class="field-label">Arrow</span>' + seg('arrow', ARROWS, e.arrow, 'arrow') + '</div>' +
        '<div class="wm-field"><span class="field-label">Color</span>' + swatches('ecolor', okColor(e.color), true) + '</div>' +
        '<div class="wm-field"><label class="field-label" for="wm-elabel">Label</label><label class="input-wrap"><input id="wm-elabel" data-f="elabel" value="' + esc(e.label) + '" placeholder="e.g. reports to" maxlength="120"></label></div>' +
        '<div class="wm-actions"><button type="button" class="btn sm" data-act="reverse">' + icon('swap') + '<span>Reverse</span></button>' +
        '<button type="button" class="btn sm danger" data-act="delete">' + icon('trash') + '<span>Delete line</span></button></div>';
    } else {
      const n = nodes[0], one = nodes.length === 1;
      const same = (k) => nodes.every((x) => x[k] === n[k]) ? n[k] : null;
      const href = one ? safeUrl(n.url) : null;
      h = '<header class="wm-ph-head"><h2>' + (one ? 'Shape' : nodes.length + ' shapes') + '</h2><button type="button" class="icon-btn sm" data-act="close-panel" aria-label="Close panel">' + icon('x') + '</button></header>' +
        (one ? '<div class="wm-field"><label class="field-label" for="wm-label">Label</label><textarea id="wm-label" data-f="label" rows="2" maxlength="500" placeholder="Name this shape">' + esc(n.label) + '</textarea></div>' +
          '<div class="wm-field"><label class="field-label" for="wm-url">Link</label><div class="wm-row"><label class="input-wrap">' + icon('external') + '<input id="wm-url" data-f="url" type="url" inputmode="url" value="' + esc(n.url) + '" placeholder="https://…" maxlength="2000" autocomplete="off"></label>' +
          (href ? '<a class="btn sm" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">Open</a>' : '') + '</div>' +
          (n.url && !href ? '<p class="wm-warn">That doesn’t look like a web address. Start it with https://</p>' : '') + '</div>' : '') +
        '<div class="wm-field"><span class="field-label">Shape</span>' + seg('shape', SHAPES.map(([id, l]) => [id, l, shapeIcon(id)]), same('shape'), 'shape') + '</div>' +
        '<div class="wm-field"><span class="field-label">Fill</span>' + seg('style', STYLES, same('style'), 'nstyle') + '</div>' +
        '<div class="wm-field"><span class="field-label">Color</span>' + swatches('ncolor', same('color'), false) + '</div>' +
        '<div class="wm-field"><span class="field-label">Size</span><div class="wm-row">' + seg('size', Object.keys(SIZE_F).map((k) => [k, k]), null, 'size') +
        (one ? '<span class="muted mono wm-dim">' + Math.round(n.w) + '×' + Math.round(n.h) + '</span>' : '') + '</div></div>' +
        '<div class="wm-field"><span class="field-label">Text</span><div class="wm-row"><div class="seg wm-seg"><button type="button" class="seg-btn" data-fs="-1" aria-label="Smaller text" title="Smaller text">A−</button>' +
        '<span class="seg-btn mono wm-fsv">' + (one ? fsOf(n) : '–') + '</span><button type="button" class="seg-btn" data-fs="1" aria-label="Larger text" title="Larger text">A+</button></div>' +
        '<button type="button" class="toggle' + (same('bold') ? ' on' : '') + '" data-act="bold" aria-pressed="' + !!same('bold') + '"><b>B</b><span>Bold</span></button></div></div>' +
        '<div class="wm-actions">' + (one ? '<button type="button" class="btn sm" data-act="child">' + icon('plus') + '<span>Add connected</span></button>' : '') +
        '<button type="button" class="btn sm" data-act="dup">' + icon('copy') + '<span>Duplicate</span></button>' +
        '<button type="button" class="btn sm" data-act="front">' + icon('layers') + '<span>To front</span></button>' +
        '<button type="button" class="btn sm danger" data-act="delete">' + icon('trash') + '<span>Delete</span></button></div>';
    }
    panelEl.innerHTML = h;
  }

  /* ================= edits ================= */
  function addNode(o, opts) {
    const m = cur(); if (!m) return null;
    if (m.nodes.length >= MAX_NODES) { C.toast('A map can hold up to ' + MAX_NODES + ' shapes. Start a new map for more.'); return null; }
    if (!opts || !opts.noHistory) pushHistory();
    const n = newNode(o);
    m.nodes.push(n);
    touch(m);
    return n;
  }
  function addEdge(from, to, o) {
    const m = cur(); if (!m || from === to) return null;
    if (m.edges.some((e) => (e.from === from && e.to === to) || (e.from === to && e.to === from))) { C.toast('Those shapes are already connected'); return null; }
    if (m.edges.length >= MAX_EDGES) { C.toast('A map can hold up to ' + MAX_EDGES + ' lines.'); return null; }
    const e = newEdge(from, to, o);
    m.edges.push(e);
    touch(m);
    return e;
  }
  /** Find an open spot near (x, y) for a w×h shape */
  function freeSpot(x, y, w, h, avoid) {
    const m = cur();
    const hit = (cx, cy) => m.nodes.some((n) => n.id !== avoid && Math.abs(n.x - cx) < (n.w + w) / 2 + 16 && Math.abs(n.y - cy) < (n.h + h) / 2 + 16);
    if (!hit(x, y)) return { x, y };
    for (let i = 1; i < 40; i++) {
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const cx = x + dx * i * (w * 0.6), cy = y + dy * i * (h * 0.9);
        if (!hit(cx, cy)) return { x: cx, y: cy };
      }
    }
    return { x: x + 30, y: y + 30 };
  }
  function addChild(parentId, at) {
    const p = node(parentId); if (!p) return;
    pushHistory();
    const shape = 'rounded';
    const [w, h] = sizeFor(shape, 'M');
    let pos = at;
    if (!pos) {
      const m = cur();
      // keep growing away from whatever this shape is already attached to
      const links = m.edges.filter((e) => e.from === p.id || e.to === p.id).map((e) => node(e.from === p.id ? e.to : e.from)).filter(Boolean);
      let ang = 0;
      if (links.length) { const ax = links.reduce((s, n) => s + n.x - p.x, 0), ay = links.reduce((s, n) => s + n.y - p.y, 0); if (Math.hypot(ax, ay) > 1) ang = Math.atan2(-ay, -ax); }
      const dist = Math.max(p.w, p.h) / 2 + Math.max(w, h) / 2 + 70;
      pos = freeSpot(p.x + Math.cos(ang) * dist, p.y + Math.sin(ang) * dist, w, h);
    }
    const n = addNode({ shape, x: pos.x, y: pos.y, color: p.color, style: 'outline', label: '' }, { noHistory: true });
    if (!n) return;
    addEdge(p.id, n.id, { style: ui.mode === 'flow' ? 'flow' : 'solid' });
    select([n.id]);
    render();
    ensureVisible(n);
    startEdit(n.id);
  }
  function addAtCenter() {
    const c = centerWorld();
    const last = selNodes()[0];
    const pos = freeSpot(c.x, c.y, 130, 130);
    const n = addNode({ shape: 'circle', x: pos.x, y: pos.y, color: last ? last.color : COLORS[0], bold: true });
    if (!n) return;
    select([n.id]); render(); startEdit(n.id);
  }
  function deleteSelection() {
    const m = cur(); if (!m) return;
    if (ui.edge) { pushHistory(); m.edges = m.edges.filter((e) => e.id !== ui.edge); ui.edge = null; touch(m); render(); return; }
    if (!ui.sel.size) return;
    pushHistory();
    const n = ui.sel.size;
    m.nodes = m.nodes.filter((x) => !ui.sel.has(x.id));
    m.edges = m.edges.filter((e) => !ui.sel.has(e.from) && !ui.sel.has(e.to));
    ui.sel = new Set();
    touch(m); render();
    C.toast('Deleted ' + (n === 1 ? 'a shape' : n + ' shapes'), { action: 'Undo', onAction: undo });
  }
  function patchNodes(fn, noHistory) {
    const nodes = selNodes(); if (!nodes.length) return;
    if (!noHistory) pushHistory();
    nodes.forEach(fn);
    touch(); renderNodes(); renderEdges(); renderPanel(); renderBar();
  }
  function patchEdge(fn, noHistory) {
    const e = selEdge(); if (!e) return;
    if (!noHistory) pushHistory();
    fn(e);
    touch(); renderEdges(); renderPanel(); renderBar(); placeFloat();
  }
  function copySel() {
    const m = cur(); const nodes = selNodes(); if (!nodes.length) return false;
    const ids = new Set(nodes.map((n) => n.id));
    ui.clip = JSON.stringify({ nodes, edges: m.edges.filter((e) => ids.has(e.from) && ids.has(e.to)) });
    return true;
  }
  function paste(offset) {
    const m = cur(); if (!m || !ui.clip) return;
    const d = JSON.parse(ui.clip);
    if (m.nodes.length + d.nodes.length > MAX_NODES) return C.toast('That would go past ' + MAX_NODES + ' shapes.');
    pushHistory();
    const map = {};
    const off2 = offset == null ? 40 : offset;
    d.nodes.forEach((n) => { const id = C.uid('n'); map[n.id] = id; m.nodes.push(Object.assign({}, n, { id, x: n.x + off2, y: n.y + off2 })); });
    d.edges.forEach((e) => m.edges.push(Object.assign({}, e, { id: C.uid('e'), from: map[e.from], to: map[e.to] })));
    ui.clip = JSON.stringify({ nodes: d.nodes.map((n) => Object.assign({}, n, { x: n.x + off2, y: n.y + off2 })), edges: d.edges }); // next paste steps further
    select(Object.values(map));
    touch(m); render();
  }
  function duplicate() { if (copySel()) paste(40); }
  function toFront() {
    const m = cur(); const nodes = selNodes(); if (!nodes.length) return;
    pushHistory();
    m.nodes = m.nodes.filter((n) => !ui.sel.has(n.id)).concat(nodes);
    touch(m); renderNodes();
  }
  function ensureVisible(n) {
    const r = rect();
    const sx = n.x * view.z + view.x, sy = n.y * view.z + view.y;
    const panelW = ui.panel && !narrow() ? 320 : 0;
    if (sx < 60 || sx > r.width - 60 - panelW || sy < 100 || sy > r.height - 60) {
      view.x += (r.width - panelW) / 2 - sx; view.y += r.height / 2 - sy; applyView();
    }
  }

  /* ---------- inline label editing ---------- */
  let editBefore = null;
  function startEdit(id) {
    const n = node(id); if (!n) return;
    commitEdit();
    ui.editing = id;
    editBefore = snapshot();
    renderNodes(); renderPanel();
    const ta = nodesEl.querySelector('.wm-edit');
    if (ta) { ta.focus({ preventScroll: true }); ta.select(); }
  }
  function autoSize(ta) { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
  function commitEdit(cancel) {
    if (!ui.editing) return;
    const id = ui.editing;
    const ta = nodesEl && nodesEl.querySelector('.wm-edit');
    const n = node(id);
    ui.editing = null;
    if (n && ta && !cancel) {
      const v = ta.value.replace(/\s+$/, '').slice(0, 500);
      if (v !== n.label) { if (editBefore) { past.push(editBefore); future = []; } n.label = v; touch(); }
    }
    editBefore = null;
    if (el) { if (deferred) { openView(); } render(); stage && stage.focus({ preventScroll: true }); }
  }
  function onEditKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
    else if (e.key === 'Escape') { e.preventDefault(); commitEdit(true); }
    else if (e.key === 'Tab') { e.preventDefault(); const id = ui.editing; commitEdit(); addChild(id); }
    e.stopPropagation();
  }

  /* ================= pointer ================= */
  function onDown(e) {
    if (e.target.closest('.wm-edit, .wm-open, .wm-float, .wm-mode-tip')) return;
    commitEdit();
    if (ui.menu) { ui.menu = false; renderBar(); }
    if (document.activeElement !== stage) stage.focus({ preventScroll: true });
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* synthetic */ }
    if (pointers.size === 2) return startPinch();
    if (pointers.size > 2) return;
    const base = { sx: e.clientX, sy: e.clientY, moved: false, touch: e.pointerType === 'touch' };
    const w = toWorld(e.clientX, e.clientY);
    if (e.button === 1 || (e.button === 0 && spaceDown)) { g = Object.assign(base, { kind: 'pan', vx: view.x, vy: view.y }); stage.classList.add('panning'); return; }
    if (e.button !== 0) return;
    const t = e.target;
    const nEl = t.closest('[data-node]'), eEl = t.closest('[data-edge]');
    const connecting = ui.mode === 'connect' || ui.mode === 'flow';
    if (t.closest('.wm-hdl-link')) {
      g = Object.assign(base, { kind: 'link', id: nEl.dataset.node, style: 'solid' });
    } else if (t.closest('.wm-hdl-size')) {
      const n = node(nEl.dataset.node);
      g = Object.assign(base, { kind: 'resize', id: n.id, w0: n.w, h0: n.h, l0: n.x - n.w / 2, t0: n.y - n.h / 2 });
    } else if (nEl) {
      const id = nEl.dataset.node;
      if (connecting) { g = Object.assign(base, { kind: 'link', id, style: ui.mode === 'flow' ? 'flow' : 'solid', tapConnect: true }); return; }
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        if (e.metaKey || e.ctrlKey) { const n = node(id), href = n && safeUrl(n.url); if (href && !e.shiftKey) { window.open(href, '_blank', 'noopener'); g = null; return; } }
        const s = new Set(ui.sel); if (s.has(id)) s.delete(id); else s.add(id);
        select([...s]); renderNodes(); renderEdges(); renderPanel(); renderBar();
        if (!ui.sel.has(id)) { g = Object.assign(base, { kind: 'none' }); return; }
      } else if (!ui.sel.has(id)) { select([id]); renderNodes(); renderEdges(); renderPanel(); renderBar(); }
      const start = {};
      selNodes().forEach((n) => { start[n.id] = { x: n.x, y: n.y }; });
      g = Object.assign(base, { kind: 'move', id, start });
    } else if (eEl) {
      select([], eEl.dataset.edge); if (connecting) { ui.from = null; renderModeTip(); }
      renderNodes(); renderEdges(); renderPanel(); renderBar();
      g = Object.assign(base, { kind: 'tap', target: 'edge:' + eEl.dataset.edge });
    } else {
      const marquee = (ui.mode === 'select' && !base.touch) || (e.shiftKey && !base.touch);
      g = marquee ? Object.assign(base, { kind: 'marquee', wx: w.x, wy: w.y, add: e.shiftKey ? new Set(ui.sel) : new Set() })
        : Object.assign(base, { kind: 'pan', vx: view.x, vy: view.y });
    }
  }

  function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch) return movePinch();
    if (!g) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < (g.touch ? 7 : 3)) return;
      g.moved = true;
      if (g.kind === 'move' || g.kind === 'resize') { pushHistory(); floatEl.hidden = true; }
      if (g.kind === 'pan') stage.classList.add('panning');
    }
    const m = cur(); if (!m) return;
    if (g.kind === 'pan') { view.x = g.vx + dx; view.y = g.vy + dy; applyView(); }
    else if (g.kind === 'move') {
      Object.keys(g.start).forEach((id) => { const n = node(id); if (n) { n.x = r2(g.start[id].x + dx / view.z); n.y = r2(g.start[id].y + dy / view.z); positionNode(n); } });
      renderEdges();
    } else if (g.kind === 'resize') {
      const n = node(g.id); if (!n) return;
      let w = Math.max(40, g.w0 + dx / view.z), h = Math.max(28, g.h0 + dy / view.z);
      if (e.shiftKey) { const k = Math.max(w / g.w0, h / g.h0); w = Math.max(40, g.w0 * k); h = Math.max(28, g.h0 * k); }
      n.w = Math.round(w); n.h = Math.round(h); n.x = r2(g.l0 + n.w / 2); n.y = r2(g.t0 + n.h / 2);
      renderNodes(); renderEdges();
    } else if (g.kind === 'link') {
      const a = node(g.id), w2 = toWorld(e.clientX, e.clientY);
      const over = targetNode(e.clientX, e.clientY);
      nodesEl.querySelectorAll('.wm-node.drop').forEach((d) => d.classList.remove('drop'));
      if (over && over !== g.id) { const d = nodesEl.querySelector('[data-node="' + over + '"]'); if (d) d.classList.add('drop'); }
      const p = edgePoint(a, w2.x, w2.y);
      overlay.innerHTML = '<line x1="' + r2(p.x) + '" y1="' + r2(p.y) + '" x2="' + r2(w2.x) + '" y2="' + r2(w2.y) + '" class="wm-band' + (g.style === 'flow' ? ' flow' : '') + '"/><circle cx="' + r2(w2.x) + '" cy="' + r2(w2.y) + '" r="5" class="wm-band-dot"/>';
    } else if (g.kind === 'marquee') {
      const r = rect();
      const x1 = Math.min(g.sx, e.clientX) - r.left, y1 = Math.min(g.sy, e.clientY) - r.top;
      marqueeEl.hidden = false;
      Object.assign(marqueeEl.style, { left: x1 + 'px', top: y1 + 'px', width: Math.abs(dx) + 'px', height: Math.abs(dy) + 'px' });
      const w2 = toWorld(e.clientX, e.clientY);
      const bx1 = Math.min(g.wx, w2.x), bx2 = Math.max(g.wx, w2.x), by1 = Math.min(g.wy, w2.y), by2 = Math.max(g.wy, w2.y);
      const s = new Set(g.add);
      m.nodes.forEach((n) => { if (n.x + n.w / 2 > bx1 && n.x - n.w / 2 < bx2 && n.y + n.h / 2 > by1 && n.y - n.h / 2 < by2) s.add(n.id); });
      ui.sel = s; ui.edge = null;
      nodesEl.querySelectorAll('.wm-node').forEach((d) => d.classList.toggle('sel', s.has(d.dataset.node)));
    }
  }
  function targetNode(cx, cy) {
    const hit = document.elementFromPoint(cx, cy);
    const d = hit && hit.closest && hit.closest('[data-node]');
    return d ? d.dataset.node : null;
  }

  function onUp(e) {
    const had = pointers.has(e.pointerId);
    pointers.delete(e.pointerId);
    if (pinch) { if (pointers.size < 2) { pinch = null; g = null; storeView(); } return; }
    if (!had || !g) return;
    const gg = g; g = null;
    stage.classList.remove('panning');
    overlay.innerHTML = '';
    nodesEl.querySelectorAll('.wm-node.drop').forEach((d) => d.classList.remove('drop'));
    if (e.type === 'pointercancel') { if (gg.kind === 'move' || gg.kind === 'resize') { touch(); render(); } return; }
    if (!gg.moved) tap(gg, e);
    else if (gg.kind === 'move' || gg.kind === 'resize') { touch(); render(); }
    else if (gg.kind === 'link') finishLink(gg, e);
    else if (gg.kind === 'marquee') { marqueeEl.hidden = true; render(); }
    if (deferred && !ui.editing) rerender();
  }

  function tap(gg, e) {
    const now = Date.now();
    const key = gg.kind === 'move' || gg.kind === 'link' ? 'n:' + gg.id : gg.kind === 'tap' ? gg.target : 'bg';
    const dbl = lastTap && lastTap.key === key && now - lastTap.t < 380 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 14;
    lastTap = dbl ? null : { key, t: now, x: e.clientX, y: e.clientY };
    if (gg.kind === 'link' && gg.tapConnect) {
      if (!ui.from) { ui.from = gg.id; select([gg.id]); }
      else if (ui.from === gg.id) ui.from = null;
      else { const pushed = pushHistory(); const ed = addEdge(ui.from, gg.id, { style: gg.style }); ui.from = null; if (ed) select([], ed.id); else if (pushed) past.pop(); }
      render();
      return;
    }
    if (gg.kind === 'move') {
      if (dbl) return startEdit(gg.id);
      if (!e.shiftKey && ui.sel.size > 1) { select([gg.id]); }
      render();
      return;
    }
    if (gg.kind === 'tap') {
      if (dbl) { ui.panel = true; render(); const i = panelEl.querySelector('#wm-elabel'); if (i) i.focus(); }
      return;
    }
    if (gg.kind === 'pan' || gg.kind === 'marquee') {
      marqueeEl.hidden = true;
      if (ui.from) { ui.from = null; }
      if (dbl) {
        const w = toWorld(e.clientX, e.clientY);
        const prev = selNodes()[0];
        const n = addNode({ shape: 'circle', x: r2(w.x), y: r2(w.y), color: prev ? prev.color : COLORS[0], bold: true });
        if (n) { select([n.id]); render(); startEdit(n.id); }
        return;
      }
      if (!e.shiftKey) select([]);
      render();
    }
  }

  function finishLink(gg, e) {
    const over = targetNode(e.clientX, e.clientY);
    if (over && over !== gg.id) {
      const pushed = pushHistory();
      const ed = addEdge(gg.id, over, { style: gg.style });
      if (!ed && pushed) past.pop();
      ui.from = null;
      if (ed && !gg.tapConnect) select([over]);
      render();
    } else if (!over) {
      const w = toWorld(e.clientX, e.clientY);
      addChild(gg.id, { x: r2(w.x), y: r2(w.y) });
    }
  }

  function startPinch() {
    const [a, b] = [...pointers.values()];
    if (g && g.moved && (g.kind === 'move' || g.kind === 'resize')) { touch(); }
    g = null;
    overlay.innerHTML = ''; marqueeEl.hidden = true;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: view.z, w: toWorld(mx, my) };
  }
  function movePinch() {
    const [a, b] = [...pointers.values()];
    if (!a || !b) return;
    const r = rect();
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    view.z = clamp(pinch.z0 * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0), 0.08, 3);
    view.x = mx - r.left - pinch.w.x * view.z;
    view.y = my - r.top - pinch.w.y * view.z;
    applyView();
  }

  function onWheel(e) {
    if (e.target.closest('.wm-edit')) return;
    e.preventDefault();
    const lineMode = e.deltaMode === 1;
    const mouseWheel = !e.ctrlKey && e.deltaX === 0 && (lineMode || (Math.abs(e.deltaY) >= 50 && Number.isInteger(e.deltaY)));
    if (e.ctrlKey || e.metaKey || mouseWheel) {
      const k = Math.exp(-e.deltaY * (lineMode ? 0.05 : e.ctrlKey ? 0.01 : 0.0015));
      zoomAt(e.clientX, e.clientY, view.z * k);
    } else {
      view.x -= e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      view.y -= e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      applyView();
    }
  }

  /* ================= clicks (toolbar, panel, float, zoom) ================= */
  function setMode(mo) {
    ui.mode = mo; ui.from = null;
    if (mo === 'connect' || mo === 'flow') {
      const n = selNodes(); if (n.length === 1) ui.from = n[0].id;
    }
    render();
  }
  function onClick(e) {
    const t = e.target;
    const open = t.closest('[data-open]');
    if (open) { switchMap(open.dataset.open); return; }
    if (t.closest('[data-menu]')) { ui.menu = !ui.menu; renderBar(); return; }
    const z = t.closest('[data-zoom]');
    if (z) {
      const v = z.dataset.zoom;
      if (v === 'fit') fit(); else if (v === '1:1') { const r = rect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1); } else zoomBy(v === '1' ? 1.25 : 0.8);
      return;
    }
    const sh = t.closest('[data-shape]'); if (sh) return patchNodes((n) => {
      const round = (s) => s === 'circle' || s === 'diamond';
      if (round(sh.dataset.shape) !== round(n.shape) || (sh.dataset.shape === 'hexagon') !== (n.shape === 'hexagon')) {
        // keep roughly the same visual size when switching between round and wide shapes
        const area = Math.sqrt(n.w * n.h); const [bw, bh] = sizeFor(sh.dataset.shape, 'M'); const k = area / Math.sqrt(bw * bh);
        n.w = Math.round(bw * k); n.h = Math.round(bh * k);
      }
      n.shape = sh.dataset.shape;
    });
    const ns = t.closest('[data-nstyle]'); if (ns) return patchNodes((n) => { n.style = ns.dataset.nstyle; });
    const nc = t.closest('[data-ncolor]'); if (nc) return patchNodes((n) => { n.color = nc.dataset.ncolor; });
    const sz = t.closest('[data-size]'); if (sz) return patchNodes((n) => { const [w, h] = sizeFor(n.shape, sz.dataset.size); n.w = w; n.h = h; });
    const fsb = t.closest('[data-fs]'); if (fsb) return patchNodes((n) => { n.fs = clamp(fsOf(n) + Number(fsb.dataset.fs) * (fsOf(n) >= 24 ? 4 : 1), 8, 72); });
    const es = t.closest('[data-estyle]'); if (es) return patchEdge((x) => { x.style = es.dataset.estyle; });
    const ar = t.closest('[data-arrow]'); if (ar) return patchEdge((x) => { x.arrow = ar.dataset.arrow; });
    const ec = t.closest('[data-ecolor]'); if (ec) return patchEdge((x) => { x.color = ec.dataset.ecolor || null; });
    const a = t.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    switch (act) {
      case 'mode-select': return setMode('select');
      case 'mode-pan': return setMode('pan');
      case 'mode-connect': return setMode(ui.mode === 'connect' ? 'pan' : 'connect');
      case 'mode-flow': return setMode(ui.mode === 'flow' ? 'pan' : 'flow');
      case 'undo': return undo();
      case 'redo': return redo();
      case 'select-all': { const m = cur(); if (m) { select(m.nodes.map((n) => n.id)); render(); } return; }
      case 'add': return addAtCenter();
      case 'delete': return deleteSelection();
      case 'png': return exportPng();
      case 'fit': return fit();
      case 'bg': { const m = cur(); if (!m) return; const i = BGS.findIndex((b) => b[0] === m.bg); m.bg = BGS[(i + 1) % BGS.length][0]; touch(m); return render(); }
      case 'sync': if (sync.status === 'error') retrySync(); return;
      case 'hints': ui.hints = !ui.hints; keep('cadence.workmap.hints', ui.hints); return renderHints();
      case 'close-panel': ui.panel = false; return render();
      case 'panel': ui.panel = true; return render();
      case 'rename': { const n = selNodes()[0]; if (n) startEdit(n.id); return; }
      case 'child': { const n = selNodes()[0]; if (n) addChild(n.id); return; }
      case 'connect-from': { const n = selNodes()[0]; ui.mode = 'connect'; ui.from = n ? n.id : null; return render(); }
      case 'dup': return duplicate();
      case 'front': return toFront();
      case 'bold': { const all = selNodes().every((n) => n.bold); return patchNodes((n) => { n.bold = !all; }); }
      case 'reverse': return patchEdge((x) => { const f = x.from; x.from = x.to; x.to = f; });
      case 'new-map': return createMap(blankMap('Untitled map'));
      case 'dup-map': { const m = cur(); if (!m) return; const c2 = C.clone(m); c2.id = C.uid('m'); c2.name = m.name + ' (copy)'; c2.createdAt = c2.updatedAt = Date.now(); views[c2.id] = views[m.id]; return createMap(c2); }
      case 'del-map': return deleteMap();
      case 'export-json': return exportJson();
      case 'import-json': ui.menu = false; renderBar(); return el.querySelector('.wm-file').click();
    }
  }
  function onPanelInput(e) {
    const f = e.target.dataset.f; if (!f) return;
    if (f === 'label' || f === 'url') {
      const n = selNodes()[0]; if (!n) return;
      if (!typingHistory) { pushHistory(); typingHistory = true; }
      n[f] = e.target.value.slice(0, f === 'url' ? 2000 : 500);
      touch(); renderNodes(); placeFloat();
      if (f === 'label') renderBar();
    } else if (f === 'elabel') {
      const x = selEdge(); if (!x) return;
      if (!typingHistory) { pushHistory(); typingHistory = true; }
      x.label = e.target.value.slice(0, 120);
      touch(); renderEdges();
    } else if (f === 'ncolor-custom') {
      patchNodes((n) => { n.color = e.target.value; }, typingHistory); typingHistory = true;
    } else if (f === 'ecolor-custom') {
      patchEdge((x) => { x.color = e.target.value; }, typingHistory); typingHistory = true;
    }
  }
  function onPanelChange(e) {
    const f = e.target.dataset.f;
    if (f === 'url') {
      const n = selNodes()[0]; if (!n) return;
      const v = n.url.trim(); const s = safeUrl(v);
      n.url = s && !/^(https?:|mailto:|tel:)/i.test(v) ? s : v;
      touch(); renderNodes(); renderPanel(); placeFloat();
    }
    typingHistory = false;
  }
  // map name lives in the toolbar
  document.addEventListener('input', (e) => {
    if (!el || !e.target.classList || !e.target.classList.contains('wm-name')) return;
    const m = cur(); if (!m) return;
    m.name = e.target.value.slice(0, 200) || 'Untitled map';
    touch(m);
  });
  document.addEventListener('keydown', (e) => {
    if (el && e.target.classList && e.target.classList.contains('wm-name') && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); e.target.blur(); renderBar(); }
  });

  /* ================= maps ================= */
  function switchMap(id) {
    if (!data.maps[id]) return;
    commitEdit();
    storeView();
    data.current = id; ui.menu = false; ui.from = null;
    select([]); resetHistory(); saveLocal();
    openView(); render();
  }
  function createMap(m) {
    data.maps[m.id] = m;
    touch(m, true);
    switchMap(m.id);
    if (!m.nodes.length) C.toast('New map ready. Double-click anywhere to add a shape.');
  }
  function deleteMap() {
    const m = cur(); if (!m) return;
    const copy = C.clone(m);
    delete data.maps[m.id];
    deleted.add(m.id);
    queueRemote(m.id);
    data.current = null;
    ensureMap(); // makes a starter map if that was the last one
    switchMap(data.current);
    C.toast('Deleted “' + copy.name + '”', { action: 'Undo', duration: 8000, onAction: () => { deleted.delete(copy.id); data.maps[copy.id] = copy; touch(copy); switchMap(copy.id); } });
  }
  function slug(s) { return (String(s || 'workmap').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'workmap').slice(0, 60); }
  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  function exportJson() {
    const m = cur(); if (!m) return;
    ui.menu = false; renderBar();
    download(new Blob([JSON.stringify({ app: 'cadence-workmap', version: 1, map: m }, null, 2)], { type: 'application/json' }), slug(m.name) + '.json');
  }
  function onImportFile(e) {
    const file = e.target.files && e.target.files[0]; e.target.value = '';
    if (!file) return;
    file.text().then((txt) => {
      const d = JSON.parse(txt);
      const src = d && d.map ? d.map : d;
      if (!src || !Array.isArray(src.nodes)) throw new Error('no nodes');
      const m = sanitizeMap(Object.assign({}, src, { id: C.uid('m') }));
      if (m.nodes.length > MAX_NODES) throw new Error('too many shapes');
      m.createdAt = m.updatedAt = Date.now();
      createMap(m);
      fit();
      C.toast('Imported “' + m.name + '”');
    }).catch(() => C.toast('That file isn’t a Workmap export. Choose a .json file saved from Export as JSON.'));
  }

  /* ================= PNG export (drawn straight to a canvas) ================= */
  async function exportPng() {
    const m = cur(); if (!m) return;
    if (!m.nodes.length) return C.toast('Add a shape first. There’s nothing to export yet.');
    try { await document.fonts.ready; } catch (e) { /* fine */ }
    const b = bounds(m.nodes), pad = 60;
    const W = b.w + pad * 2, H = b.h + pad * 2;
    const scale = Math.max(0.25, Math.min(2, 8000 / W, 8000 / H, Math.sqrt(48e6 / (W * H))));
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(W * scale); cv.height = Math.ceil(H * scale);
    const ctx = cv.getContext('2d');
    const sec = el.querySelector('.wm');
    const probe = document.createElement('i'); probe.style.display = 'none'; sec.appendChild(probe);
    const pc = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const col2 = (expr) => { probe.style.color = ''; probe.style.color = expr; const c = getComputedStyle(probe).color; pc.clearRect(0, 0, 1, 1); pc.fillStyle = '#000'; pc.fillStyle = c; pc.fillRect(0, 0, 1, 1); const d = pc.getImageData(0, 0, 1, 1).data; return 'rgba(' + d[0] + ',' + d[1] + ',' + d[2] + ',' + (d[3] / 255) + ')'; };
    const font = getComputedStyle(sec).getPropertyValue('--font-body') || 'sans-serif';
    ctx.scale(scale, scale);
    ctx.translate(pad - b.x, pad - b.y);
    ctx.fillStyle = col2('var(--wm-bg)'); ctx.fillRect(b.x - pad, b.y - pad, W, H);
    const lineC = col2('var(--wm-line)'), flowC = col2('var(--wm-flow)'), inkC = col2('var(--wm-ink)'), nodeBg = col2('var(--wm-node)'), bgC = col2('var(--wm-bg)');
    const byId = new Map(m.nodes.map((n) => [n.id, n]));
    // lines
    m.edges.forEach((e) => {
      const p = edgeGeom(e, byId); if (!p || p.len < 1) return;
      const c = e.color ? col2(e.color) : e.style === 'flow' ? flowC : lineC;
      ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = e.style === 'flow' ? 1.8 : 1.6; ctx.lineCap = 'round';
      ctx.setLineDash(e.style === 'dashed' ? [7, 6] : e.style === 'flow' ? [3, 5] : []);
      ctx.beginPath(); ctx.moveTo(p.x1, p.y1); ctx.lineTo(p.x2, p.y2); ctx.stroke();
      ctx.setLineDash([]);
      const head = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); ctx.lineTo(pts[1][0], pts[1][1]); ctx.lineTo(pts[2][0], pts[2][1]); ctx.closePath(); ctx.fill(); };
      if (e.arrow === 'end' || e.arrow === 'both') head(arrowPts(p.x2, p.y2, p.ang, 11));
      if (e.arrow === 'both') head(arrowPts(p.x1, p.y1, p.ang + Math.PI, 11));
      ctx.restore();
    });
    // line labels
    m.edges.forEach((e) => {
      if (!e.label) return;
      const p = edgeGeom(e, byId); if (!p) return;
      const mx = (p.x1 + p.x2) / 2, my = (p.y1 + p.y2) / 2;
      ctx.font = '500 12px ' + font;
      const tw = ctx.measureText(e.label).width + 16;
      ctx.fillStyle = bgC; ctx.strokeStyle = e.color ? col2(e.color) : lineC; ctx.lineWidth = 1;
      const path = new Path2D(rr(mx - tw / 2, my - 11, tw, 22, 11)); ctx.fill(path); ctx.stroke(path);
      ctx.fillStyle = inkC; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.label, mx, my + 0.5);
    });
    // shapes
    m.nodes.forEach((n) => {
      const color = okColor(n.color) || COLORS[0];
      ctx.save(); ctx.translate(n.x - n.w / 2, n.y - n.h / 2);
      const path = new Path2D(shapePath(n.shape, n.w, n.h, 1.5));
      let fill, stroke, lw, ink;
      if (n.style === 'solid') { fill = color; stroke = col2('color-mix(in oklab, ' + color + ' 80%, #000)'); lw = 1.5; ink = darkInk(color) ? '#0D1220' : '#FFFFFF'; }
      else if (n.style === 'soft') { fill = col2('color-mix(in oklab, ' + color + ' 24%, var(--wm-node))'); stroke = col2('color-mix(in oklab, ' + color + ' 70%, var(--wm-node))'); lw = 1.5; ink = inkC; }
      else { fill = nodeBg; stroke = color; lw = 2; ink = inkC; }
      ctx.fillStyle = fill; ctx.fill(path);
      ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(path);
      // label
      const fs = fsOf(n), lh = fs * 1.2;
      const padX = n.shape === 'circle' ? n.w * 0.15 : n.shape === 'diamond' ? n.w * 0.22 : n.shape === 'hexagon' ? n.w * 0.16 : 12;
      const maxW = Math.max(10, n.w - padX * 2), maxH = n.h - (n.shape === 'diamond' ? n.h * 0.3 : 8);
      ctx.font = (n.bold ? '650 ' : '500 ') + fs + 'px ' + font;
      const lines = wrap(ctx, n.label || '', maxW);
      const maxLines = Math.max(1, Math.floor(maxH / lh));
      if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S?$/, '') + '…'; }
      ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const y0 = n.h / 2 - ((lines.length - 1) * lh) / 2;
      const href = safeUrl(n.url);
      lines.forEach((ln, i) => {
        ctx.fillText(ln, n.w / 2, y0 + i * lh);
        if (href) { const tw = ctx.measureText(ln).width; ctx.fillRect(n.w / 2 - tw / 2, y0 + i * lh + fs * 0.55, tw, Math.max(1, fs / 14)); }
      });
      ctx.restore();
    });
    probe.remove();
    cv.toBlob((blob) => { if (blob) { download(blob, slug(m.name) + '.png'); C.toast('Saved ' + slug(m.name) + '.png'); } else C.toast('Couldn’t make the image. Try a smaller map.'); }, 'image/png');
  }
  function wrap(ctx, text, maxW) {
    const out = [];
    String(text).split('\n').forEach((para) => {
      const words = para.split(/\s+/).filter(Boolean);
      if (!words.length) { out.push(''); return; }
      let line = '';
      words.forEach((w) => {
        const tryL = line ? line + ' ' + w : w;
        if (ctx.measureText(tryL).width <= maxW || !line) {
          if (!line && ctx.measureText(w).width > maxW) { // break a long word
            let part = '';
            for (const ch of w) { if (ctx.measureText(part + ch).width > maxW && part) { out.push(part); part = ch; } else part += ch; }
            line = part;
          } else line = tryL;
        } else { out.push(line); line = w; }
      });
      if (line) out.push(line);
    });
    return out;
  }

  /* ================= keyboard ================= */
  function onKey(e) {
    if (!el) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
    if (document.querySelector('.sheet-wrap,.pal-wrap')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key;
    const onCanvas = e.target === stage || e.target === document.body || e.target === document.documentElement || !!(stage && stage.contains(e.target) && !e.target.closest('button,a'));
    if (!onCanvas && (k === ' ' || k === 'Enter' || k === 'Tab' || k.startsWith('Arrow'))) return;
    if (k === ' ' && !mod) { spaceDown = true; stage.classList.add('space'); e.preventDefault(); return; }
    if (mod && (k === 'z' || k === 'Z')) { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (mod && (k === 'y' || k === 'Y')) { e.preventDefault(); return redo(); }
    if (mod && (k === 'a' || k === 'A')) { e.preventDefault(); const m = cur(); if (m) { select(m.nodes.map((n) => n.id)); render(); } return; }
    if (mod && (k === 'c' || k === 'C')) { if (copySel()) e.preventDefault(); return; }
    if (mod && (k === 'x' || k === 'X')) { if (copySel()) { e.preventDefault(); deleteSelection(); } return; }
    if (mod && (k === 'v' || k === 'V')) { if (ui.clip) { e.preventDefault(); paste(); } return; }
    if (mod && (k === 'd' || k === 'D')) { e.preventDefault(); return duplicate(); }
    if (mod && (k === '=' || k === '+')) { e.preventDefault(); return zoomBy(1.25); }
    if (mod && k === '-') { e.preventDefault(); return zoomBy(0.8); }
    if (mod && k === '0') { e.preventDefault(); const r = rect(); return zoomAt(r.left + r.width / 2, r.top + r.height / 2, 1); }
    if (mod || e.altKey) return;
    if (k === 'Delete' || k === 'Backspace') { e.preventDefault(); return deleteSelection(); }
    if (k === 'Escape') {
      if (ui.menu) { ui.menu = false; return renderBar(); }
      if (ui.from) { ui.from = null; return render(); }
      if (ui.mode === 'connect' || ui.mode === 'flow') return setMode('pan');
      select([]); return render();
    }
    if (k === 'Enter' || k === 'F2') { const n = selNodes(); if (n.length === 1) { e.preventDefault(); startEdit(n[0].id); } return; }
    if (k === 'Tab') { const n = selNodes(); if (n.length === 1) { e.preventDefault(); addChild(n[0].id); } return; }
    if (k === '+' || (k === '=' && e.shiftKey)) { e.preventDefault(); return addAtCenter(); }
    if (k === '!' || (e.code === 'Digit1' && e.shiftKey)) { e.preventDefault(); return fit(); }
    if (k === 'v' || k === 'V') return setMode('select');
    if (k === 'h' || k === 'H') return setMode('pan');
    if (k === 'c' || k === 'C') return setMode(ui.mode === 'connect' ? 'pan' : 'connect');
    if (k === 'f' || k === 'F') return setMode(ui.mode === 'flow' ? 'pan' : 'flow');
    if (k.startsWith('Arrow')) {
      const nodes = selNodes(); if (!nodes.length) return;
      e.preventDefault();
      if (Date.now() - lastNudge > 700) pushHistory();
      lastNudge = Date.now();
      const step = e.shiftKey ? 20 : 2;
      const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0, dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0;
      nodes.forEach((n) => { n.x += dx; n.y += dy; positionNode(n); });
      renderEdges(); placeFloat(); touch(); renderBar();
    }
  }

  C.workmap = { sync, data, retry: retrySync };
})();
