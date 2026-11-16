(function(){
'use strict';
const THREE = window.THREE;

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
};
/* splash screen */
const splash = $('#splash');
function closeSplash() {
  if (!splash || splash.classList.contains('hide')) return;
  splash.classList.add('hide'); store.set('ap-splash', '1');
  setTimeout(() => splash.remove(), 800);
}
if (splash) {
  let seen = false; try { seen = sessionStorage.getItem('ap-splash-seen') === '1'; } catch (e) {}
  if (seen) splash.remove();
  else {
    try { sessionStorage.setItem('ap-splash-seen', '1'); } catch (e) {}
    const go = $('#splashGo');
    setTimeout(() => { go.disabled = false; go.textContent = 'Start the lesson'; go.focus({ preventScroll: true }); }, reduce ? 200 : 1900);
    go.addEventListener('click', closeSplash);
    $('#splashSkip').addEventListener('click', closeSplash);
    addEventListener('keydown', e => { if (e.key === 'Escape' || (e.key === 'Enter' && !go.disabled)) closeSplash(); });
  }
}
const css = n => getComputedStyle(root).getPropertyValue(n).trim() || '#888';

/* =========================================================
   1. Layout: sidebar tabs, collapse, mobile drawer
   ========================================================= */
const app = $('#app'), sidebar = $('#sidebar'), collapseBtn = $('#collapseBtn');
const narrow = matchMedia('(max-width:900px)');
const wide = matchMedia('(min-width:1101px)');

function setCollapsed(on, save = true) {
  app.classList.toggle('collapsed', on && !narrow.matches);
  collapseBtn.setAttribute('aria-expanded', String(!on));
  collapseBtn.setAttribute('aria-label', on ? 'Expand sidebar' : 'Collapse sidebar');
  if (save) store.set('ap-collapsed', on ? '1' : '0');
}
function syncLayout() {
  const saved = store.get('ap-collapsed');
  setCollapsed(saved === null ? !wide.matches : saved === '1', false);
  if (!narrow.matches) closeMenu();
}
collapseBtn.addEventListener('click', () => setCollapsed(!app.classList.contains('collapsed')));
narrow.addEventListener('change', syncLayout);
wide.addEventListener('change', () => { if (store.get('ap-collapsed') === null) syncLayout(); });

const menuBtn = $('#menuBtn'), scrim = $('#scrim');
function openMenu() { document.body.classList.add('menu-open'); menuBtn.setAttribute('aria-expanded', 'true'); }
function closeMenu() { document.body.classList.remove('menu-open'); menuBtn.setAttribute('aria-expanded', 'false'); }
menuBtn.addEventListener('click', () => document.body.classList.contains('menu-open') ? closeMenu() : openMenu());
scrim.addEventListener('click', closeMenu);
addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

const tabs = $$('.tabbtn');
function selectTab(name, focus) {
  tabs.forEach(t => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    $('#panel-' + t.dataset.tab).hidden = !on;
    if (on && focus) t.focus();
  });
  store.set('ap-tab', name);
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => {
    if (app.classList.contains('collapsed') && t.dataset.tab !== 'lesson') setCollapsed(false);
    selectTab(t.dataset.tab);
  });
  t.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (k) { e.preventDefault(); selectTab(tabs[(i + k + tabs.length) % tabs.length].dataset.tab, true); }
  });
});
selectTab(store.get('ap-tab') || 'lesson');

$$('.nav a').forEach(a => {
  a.dataset.tip = $('.lbl', a).childNodes[0].textContent;
  a.addEventListener('click', closeMenu);
});

/* toolkit calculator */
function calc() {
  const a = parseFloat($('#calcA').value), d = parseFloat($('#calcD').value), n = parseInt($('#calcN').value, 10);
  const out = $('#calcOut'), terms = $('#calcTerms');
  if ([a, d, n].some(Number.isNaN) || n < 1) { out.textContent = 'Enter a, d and n (n ≥ 1)'; terms.textContent = ''; return; }
  const f = x => +x.toFixed(6);
  out.innerHTML = `T<sub>${n}</sub> = ${f(a + (n - 1) * d)}`;
  terms.textContent = Array.from({ length: 6 }, (_, i) => f(a + i * d)).join(', ') + ', …';
}
$$('#calc input').forEach(i => i.addEventListener('input', calc));
calc();

/* =========================================================
   2. Settings: theme, 3D quality, fullscreen
   ========================================================= */
const themed = [];
function applyTheme(t) {
  root.setAttribute('data-theme', t);
  store.set('ap-theme', t);
  requestAnimationFrame(() => themed.forEach(f => f()));
}
$('#themeBtn').addEventListener('click', () => {
  const cur = root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  applyTheme(cur === 'dark' ? 'light' : 'dark');
});

let quality = store.get('ap-quality') || 'high';
const stages = [];
function applyQuality() {
  $('#qualityLabel').textContent = '3D: ' + (quality === 'high' ? 'High' : 'Lite');
  stages.forEach(s => s.resize(true));
}
$('#qualityBtn').addEventListener('click', () => { quality = quality === 'high' ? 'low' : 'high'; store.set('ap-quality', quality); applyQuality(); });
$('#fsBtn').addEventListener('click', () => {
  if (!document.fullscreenEnabled) return;
  document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen().catch(() => {});
});
if (!document.fullscreenEnabled) $('#fsBtn').hidden = true;

/* =========================================================
   3. Scroll: progress fallback, reveal fallback, active nav
   ========================================================= */
const hasSDA = CSS.supports('animation-timeline: view()');
if (!hasSDA && !reduce) root.classList.add('no-sda');
const fill = $('#progressFill');
function onScroll() {
  if (!hasSDA) fill.style.transform = `scaleX(${clamp(scrollY / (root.scrollHeight - innerHeight))})`;
}
addEventListener('scroll', onScroll, { passive: true });
if (!hasSDA) {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .12 });
  $$('.reveal').forEach(el => io.observe(el));
}
const navLinks = $$('.nav a');
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  navLinks.forEach(a => a.classList.toggle('active', a.dataset.step === e.target.dataset.step));
}), { rootMargin: '-45% 0px -50% 0px' });
$$('[data-step]').forEach(el => { if (el.tagName === 'SECTION') spy.observe(el); });

/* =========================================================
   4. Three.js helpers
   ========================================================= */
const PALETTE = [0x0b6e4f, 0xf0b429, 0x2563b8, 0xc7372f, 0x8e44ad, 0x16a085, 0xe67e22, 0xd81b60];

function makeStage(canvas) {
  let renderer;
  try {
    if (!THREE) throw new Error('no three');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    canvas.hidden = true;
    const fb = canvas.parentElement.querySelector('.gl-fallback');
    if (fb) fb.hidden = false;
    return null;
  }
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(38, 1, .1, 300);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a9a90, 1.15));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(5, 9, 7);
  scene.add(sun);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  const S = { renderer, scene, cam, visible: false, tick: null };
  S.resize = force => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 2 : 1));
    renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix();
  };
  new ResizeObserver(() => S.resize()).observe(canvas);
  new IntersectionObserver(([e]) => { S.visible = e.isIntersecting; }, { rootMargin: '100px' }).observe(canvas);
  (function loop() {
    if (S.visible) { S.tick && S.tick(); renderer.render(scene, cam); }
    requestAnimationFrame(loop);
  })();
  stages.push(S);
  S.resize();
  return S;
}

/* drag to rotate, two-finger pinch to zoom */
function addOrbit(canvas, st) {
  const pts = new Map();
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 1) {
      st.yaw += (e.clientX - p[0]) * .008;
      if (e.pointerType !== 'touch') st.pitch = clamp(st.pitch + (e.clientY - p[1]) * .006, -.9, .9);
    } else if (pts.size === 2) {
      const o = [...pts].find(([id]) => id !== e.pointerId)[1];
      const d0 = Math.hypot(p[0] - o[0], p[1] - o[1]) || 1, d1 = Math.hypot(e.clientX - o[0], e.clientY - o[1]) || 1;
      st.zoom = clamp(st.zoom * d0 / d1, .4, 2.5);
    }
    pts.set(e.pointerId, [e.clientX, e.clientY]);
  });
  ['pointerup', 'pointercancel'].forEach(t => canvas.addEventListener(t, e => pts.delete(e.pointerId)));
}

/* =========================================================
   5. Straw squares: term n has 3n + 1 straws, each new term adds 3
   ========================================================= */
function Straws(canvas, { max = 50, interactive = false } = {}) {
  const S = makeStage(canvas); if (!S) return null;
  const st = { yaw: -.35, pitch: .28, zoom: 1, t: 1, cur: 1, cd: 6, cy: -.35, cp: .28 };
  const g = new THREE.Group(), chain = new THREE.Group();
  g.add(chain); S.scene.add(g);
  const boardMat = new THREE.MeshStandardMaterial({ roughness: .85 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1, 1, .2), boardMat);
  chain.add(board);
  const retheme = () => boardMat.color.set(css('--bg2'));
  themed.push(retheme); retheme();
  const geo = new THREE.CylinderGeometry(.075, .075, .94, 14);
  const mats = PALETTE.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: .3, metalness: .05 }));
  const straws = [];
  const add = (term, x, y, vert) => {
    const m = new THREE.Mesh(geo, mats[(term - 1) % mats.length]);
    m.position.set(x, y, .12); if (!vert) m.rotation.z = Math.PI / 2;
    chain.add(m); straws.push({ m, term, x, y });
  };
  for (let k = 1; k <= max; k++) {
    add(k, k - .5, 1, 0); add(k, k - .5, 0, 0); add(k, k, .5, 1);
    if (k === 1) add(1, 0, .5, 1);
  }
  S.tick = () => {
    const L = .12;
    st.cur += (st.t - st.cur) * L; st.cy += (st.yaw - st.cy) * .15; st.cp += (st.pitch - st.cp) * .15;
    const w = Math.max(1, st.cur);
    chain.position.set(-w / 2, -.5, 0);
    board.scale.set(w + .9, 1.9, 1); board.position.set(w / 2, .5, -.05);
    straws.forEach(s => {
      const k = s.term - st.cur + 1, v = clamp(k);
      const e = 1 - Math.pow(1 - v, 3);
      s.m.visible = v > .01; s.m.scale.setScalar(Math.max(e, .001));
      s.m.position.z = .12 + (1 - e) * 1.6;
    });
    const need = Math.max((w + 1.6) / (2 * .344 * S.cam.aspect), 3.6) * 1.05 * st.zoom;
    st.cd += (need - st.cd) * .1;
    g.rotation.set(st.cp, st.cy, 0);
    S.cam.position.set(0, 0, st.cd); S.cam.lookAt(0, 0, 0);
  };
  S.tick();
  if (interactive) addOrbit(canvas, st);
  return {
    set: n => { st.t = n; },
    reset: () => { st.yaw = -.35; st.pitch = .28; st.zoom = 1; },
    zoom: f => { st.zoom = clamp(st.zoom * f, .4, 2.5); }
  };
}

/* =========================================================
   6. Assembly hall: row r has 3r + 1 chairs
   ========================================================= */
function Hall(canvas) {
  const S = makeStage(canvas); if (!S) return null;
  const rows = [], N = 10;
  for (let r = 1; r <= N; r++) for (let i = 0; i < 3 * r + 1; i++) rows.push({ r, i, c: 3 * r + 1, x: (i - (3 * r) / 2) * .44, z: r * 1.05 });
  const floorMat = new THREE.MeshStandardMaterial({ roughness: .9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
  floor.rotation.x = -Math.PI / 2; S.scene.add(floor);
  const stage = new THREE.Mesh(new THREE.BoxGeometry(17, .5, 3.4), new THREE.MeshStandardMaterial({ color: 0x0b6e4f, roughness: .5 }));
  stage.position.set(0, .25, -2.2); S.scene.add(stage);
  const banner = new THREE.Mesh(new THREE.BoxGeometry(9, 2.4, .1), new THREE.MeshStandardMaterial({ color: 0xf0b429, roughness: .4 }));
  banner.position.set(0, 1.9, -3.8); S.scene.add(banner);
  const retheme = () => floorMat.color.set(css('--bg2'));
  themed.push(retheme); retheme();
  const mk = (gx, gy, gz) => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(gx, gy, gz), new THREE.MeshStandardMaterial({ roughness: .45 }), rows.length);
    m.frustumCulled = false; S.scene.add(m); return m;
  };
  const seat = mk(.34, .07, .34), back = mk(.34, .34, .05), leg = mk(.07, .3, .07);
  const col = new THREE.Color(), o = new THREE.Object3D();
  rows.forEach((c, k) => { col.set(PALETTE[(c.r - 1) % PALETTE.length]); [seat, back, leg].forEach(m => m.setColorAt(k, col)); });
  const place = (m, k, c, s, dx, dy, dz) => {
    o.position.set(c.x + dx * s, dy * s + (1 - s) * 1.2, c.z + dz * s);
    o.scale.setScalar(Math.max(s, .0001)); o.updateMatrix(); m.setMatrixAt(k, o.matrix);
  };
  let R = 0;
  const update = () => {
    rows.forEach((c, k) => {
      const f = clamp(R - (c.r - 1));
      const s = clamp(f * (c.c + 3) - c.i, 0, 1); const e = 1 - Math.pow(1 - s, 3);
      place(seat, k, c, e, 0, .32, 0); place(back, k, c, e, 0, .52, .15); place(leg, k, c, e, 0, .15, 0);
    });
    [seat, back, leg].forEach(m => { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; });
  };
  let cp = 0, tp = 0;
  S.tick = () => {
    cp += (tp - cp) * .12;
    const k = clamp(R / N);
    S.cam.position.set(Math.sin(cp * 2.2) * 3, 4 + k * 8.5, 7.5 + k * 11);
    S.cam.lookAt(0, .4, 1.5 + k * 3.5);
  };
  S.tick();
  return { set(p) { tp = p; R = p < .18 ? 0 : p < .38 ? (p - .18) / .2 : p < .58 ? 1 + (p - .38) / .2 : p < .76 ? 2 + (p - .58) / .18 : 3 + (p - .76) / .24 * 7; update(); } };
}

/* =========================================================
   7. Scroll-linked scenes
   ========================================================= */
function scrolly(el, fn) {
  let q = false;
  const run = () => { q = false; const r = el.getBoundingClientRect(); fn(clamp(-r.top / Math.max(1, r.height - innerHeight))); };
  addEventListener('scroll', () => { if (!q) { q = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener('resize', run); run();
}
const setCap = (caps, i) => caps.forEach((c, k) => c.classList.toggle('on', k === i));

const hall = Hall($('#hallCanvas'));
if (hall) {
  const caps = $$('#hallCaps .cap'), chips = $$('[data-hall-chip]'), B = [.18, .38, .58, .76];
  scrolly($('#hallScrolly'), p => {
    hall.set(p);
    const ph = B.filter(b => p >= b).length;
    setCap(caps, ph);
    chips.forEach(c => c.classList.toggle('on', ph >= +c.dataset.hallChip && +c.dataset.hallChip < 4));
  });
} else scrolly($('#hallScrolly'), p => setCap($$('#hallCaps .cap'), Math.min(4, Math.floor(p * 5))));

const guide = Straws($('#cvGuide'), { max: 5 });
{
  const caps = $$('#gCaps .cap');
  scrolly($('#strawScrolly'), p => {
    const t = 1 + clamp((p - .08) / .8) * 4, n = Math.round(t);
    if (guide) guide.set(t);
    $('#gN').textContent = n; $('#gCnt').textContent = 3 * n + 1;
    setCap(caps, n - 1);
  });
}

/* free play + verify */
const fp = Straws($('#cv1'), { max: 50, interactive: true });
let n1 = 1;
function setN1(n) {
  n1 = clamp(Math.round(n), 1, 50);
  $('#n1').textContent = n1; $('#cnt1').textContent = 3 * n1 + 1; $('#rg1').value = n1;
  fp && fp.set(n1);
}
$('#p1').onclick = () => setN1(n1 + 1);
$('#m1').onclick = () => setN1(n1 - 1);
$('#rg1').oninput = e => setN1(+e.target.value);
$('#zi1').onclick = () => fp && fp.zoom(.8);
$('#zo1').onclick = () => fp && fp.zoom(1.25);
$('#rs1').onclick = () => fp && fp.reset();
$('#sh1').onchange = e => { $('#cntPill1').style.visibility = e.target.checked ? 'visible' : 'hidden'; };
setN1(1);

const vf = Straws($('#cv2'), { max: 50, interactive: true });
function setN2(n) {
  n = clamp(Math.round(n), 1, 50);
  $('#n2').textContent = n; $('#cnt2').textContent = 3 * n + 1; $('#rg2').value = n;
  vf && vf.set(n);
  const m = $('#verifyMsg');
  m.className = 'fb' + (n === 10 ? ' ok' : '');
  m.textContent = n === 10 ? 'n = 10 shows 31 straws, the same as the formula gave.' : '';
}
$('#rg2').oninput = e => setN2(+e.target.value);
$('#g10').onclick = () => setN2(10);
$('#rs2').onclick = () => vf && vf.reset();
setN2(3);

/* =========================================================
   8. Quiz logic
   ========================================================= */
const REQUIRED = { 1: ['r1', 'c1'], 2: ['r2'], 3: ['r3', 'apitems'], 4: ['r4'], 5: ['r5'], 6: ['r6a', 'r6b', 'r6c'], 7: ['r7'] };
const done = new Set();
let celebrated = false;
const UNLOCK = { c1: 's1done', r2: 's2done', r3: 's3def', r5: 'formulaBox' };
function mark(id) {
  done.add(id);
  const u = UNLOCK[id] && $('#' + UNLOCK[id]);
  if (u && u.hidden) { u.hidden = false; u.classList.add('pop'); }
  let steps = 0;
  Object.entries(REQUIRED).forEach(([s, ids]) => {
    const ok = ids.every(i => done.has(i));
    if (ok) steps++;
    const a = $(`.nav a[data-step="${s}"]`);
    a.classList.toggle('done', ok);
    $('.num', a).textContent = ok ? '✓' : s;
  });
  $('#doneCount').textContent = `${steps} / 7`;
  $('#mobileProgress').textContent = `${steps} / 7`;
  $('#doneMeter').style.width = (steps / 7 * 100) + '%';
  if (steps === 7 && !celebrated) { celebrated = true; setTimeout(celebrate, 700); }
}
const norm = s => s.trim().toLowerCase().replace(/[\u2212\u2013]/g, '-').replace(/\s+/g, '');
const same = (v, a) => {
  v = norm(v); if (!v) return false;
  if (a === 'n-1') return ['n-1', '-1+n', '(n-1)'].includes(v);
  return !isNaN(v) && +v === +a;
};
function feedback(fb, ok) {
  if (!fb) return;
  fb.innerHTML = ok ? (fb.dataset.ok || 'Correct!') : (fb.dataset.no || 'Not yet, try again.');
  fb.className = 'fb ' + (ok ? 'ok' : 'bad');
}
$$('.check-root').forEach(r => {
  const btn = $('.check', r); if (!btn) return;
  btn.addEventListener('click', () => {
    const ins = $$('.ans', r);
    let all = true;
    ins.forEach(i => {
      const ok = same(i.value, i.dataset.ans);
      i.classList.remove('ok', 'bad'); void i.offsetWidth;
      i.classList.add(ok ? 'ok' : 'bad'); if (!ok) all = false;
    });
    feedback($('.fb', r), all);
    if (all) mark(r.id);
  });
  r.addEventListener('input', e => e.target.classList.remove('ok', 'bad'));
});

/* multiple choice */
const c1 = $('#c1');
$$('.choice', c1).forEach(b => b.addEventListener('click', () => {
  const ok = b.textContent === c1.dataset.correct;
  $$('.choice', c1).forEach(x => x.classList.remove('bad'));
  b.classList.add(ok ? 'ok' : 'bad');
  const fb = c1.nextElementSibling;
  fb.className = 'fb ' + (ok ? 'ok' : 'bad');
  fb.textContent = ok ? 'Yes, a sequence.' : 'Think about an ordered list that follows a rule.';
  if (ok) mark('c1');
}));

/* write them out */
$('#countOutBtn').onclick = () => {
  const box = $('#countOut'); box.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const c = document.createElement('span');
    c.className = 'chip'; c.textContent = 4 + 3 * i; c.style.animation = `pop .4s ${i * 90}ms backwards`;
    box.appendChild(c);
  }
};

/* AP or not */
const APS = [[[3, 7, 11, 15], 4], [[2, 4, 8, 16], null], [[20, 17, 14, 11], -3], [[1, 4, 9, 16], null]];
const apBox = $('#apitems');
APS.forEach(([seq, d], i) => {
  const row = document.createElement('div');
  row.className = 'apitem';
  row.innerHTML = `<span class="seq">${seq.join(', ')}, …</span>
    <span class="seg" role="group" aria-label="Is sequence ${i + 1} an AP?"><button type="button" data-v="yes" aria-pressed="false">AP</button><button type="button" data-v="no" aria-pressed="false">Not an AP</button></span>
    <label>d = <input class="ans sm" inputmode="numeric" aria-label="Common difference ${i + 1}"></label>`;
  $$('.seg button', row).forEach(b => b.onclick = () => $$('.seg button', row).forEach(x => x.setAttribute('aria-pressed', x === b)));
  apBox.appendChild(row);
});
$('#apCheck').onclick = () => {
  let all = true;
  $$('.apitem', apBox).forEach((row, i) => {
    const d = APS[i][1], pick = $('.seg [aria-pressed="true"]', row)?.dataset.v, val = $('.ans', row).value;
    const ok = d === null ? pick === 'no' : pick === 'yes' && same(val, d);
    row.classList.remove('ok', 'bad'); row.classList.add(ok ? 'ok' : 'bad');
    if (!ok) all = false;
  });
  const fb = $('#apFb');
  fb.className = 'fb ' + (all ? 'ok' : 'bad');
  fb.textContent = all ? 'All correct. An AP needs the same difference every time.' : 'Check the highlighted rows: subtract each term from the next one.';
  if (all) mark('apitems');
};

/* =========================================================
   8b. Practice tab: random AP questions
   ========================================================= */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const sg = () => (Math.random() < .25 ? -1 : 1);
const P = n => (n < 0 ? `(${n})` : n);
const GEN = [
  () => { const a = rnd(-5, 20), d = rnd(2, 9) * sg(), n = rnd(8, 30), ans = a + (n - 1) * d;
    return { q: `AP: ${[0, 1, 2, 3].map(i => a + i * d).join(', ')}, &hellip; Find T<sub>${n}</sub>.`, ans,
      how: `a = ${a}, d = ${d}<br>T<sub>${n}</sub> = ${a} + (${n} &minus; 1) &times; ${P(d)}<br>= ${a} + ${(n - 1) * d} = <b>${ans}</b>` }; },
  () => { const a = rnd(-6, 25), d = rnd(2, 9) * sg();
    return { q: `AP: ${[0, 1, 2, 3].map(i => a + i * d).join(', ')}, &hellip; Find the common difference d.`, ans: d,
      how: `d = second term &minus; first term<br>d = ${a + d} &minus; ${P(a)} = <b>${d}</b>` }; },
  () => { const a = rnd(1, 15), d = rnd(2, 8), n = rnd(10, 40), t = a + (n - 1) * d;
    return { q: `AP: ${[0, 1, 2, 3].map(i => a + i * d).join(', ')}, &hellip; Which term equals ${t}? (find n)`, ans: n,
      how: `a = ${a}, d = ${d}<br>${a} + (n &minus; 1) &times; ${d} = ${t}<br>(n &minus; 1) &times; ${d} = ${t - a}<br>n &minus; 1 = ${n - 1}, so n = <b>${n}</b>` }; },
  () => { const d = rnd(2, 7), m = rnd(5, 15), a = rnd(-4, 20), t = a + (m - 1) * d;
    return { q: `In an AP, T<sub>${m}</sub> = ${t} and d = ${d}. Find the first term a.`, ans: a,
      how: `T<sub>${m}</sub> = a + (${m} &minus; 1)d<br>${t} = a + ${(m - 1) * d}<br>a = ${t} &minus; ${(m - 1) * d} = <b>${a}</b>` }; },
  () => { const a = rnd(-3, 15), d = rnd(2, 8) * sg(), p = rnd(2, 5), q = p + rnd(3, 6), tp = a + (p - 1) * d, tq = a + (q - 1) * d;
    return { q: `In an AP, T<sub>${p}</sub> = ${tp} and T<sub>${q}</sub> = ${tq}. Find the common difference d.`, ans: d,
      how: `T<sub>${q}</sub> &minus; T<sub>${p}</sub> = (${q} &minus; ${p})d<br>${tq} &minus; ${P(tp)} = ${q - p}d<br>${tq - tp} = ${q - p}d, so d = <b>${d}</b>` }; }
];
let cur = null, streak = 0, best = +(store.get('ap-best') || 0), solved = +(store.get('ap-solved') || 0), lastGen = -1;
function showStats() { $('#prStreak').textContent = streak; $('#prBest').textContent = best; $('#prSolved').textContent = solved; }
function nextQ() {
  let i; do { i = rnd(0, GEN.length - 1); } while (i === lastGen); lastGen = i;
  cur = GEN[i]();
  $('#prQ').innerHTML = cur.q; $('#prSteps').innerHTML = cur.how;
  const a = $('#prAns'); a.value = ''; a.classList.remove('ok', 'bad');
  $('#prFb').textContent = ''; $('#prFb').className = 'fb'; $('#prHow').open = false;
}
function checkQ() {
  const a = $('#prAns'), fb = $('#prFb'), ok = same(a.value, cur.ans);
  a.classList.remove('ok', 'bad'); void a.offsetWidth; a.classList.add(ok ? 'ok' : 'bad');
  if (ok) {
    streak++; solved++; best = Math.max(best, streak);
    store.set('ap-best', best); store.set('ap-solved', solved);
    fb.className = 'fb ok'; fb.textContent = streak > 2 ? `Correct! ${streak} in a row.` : 'Correct!';
    $('.pr-card').classList.remove('streak-pop'); void $('.pr-card').offsetWidth; $('.pr-card').classList.add('streak-pop');
    $('#prNext').focus({ preventScroll: true });
  } else if (a.value.trim()) {
    streak = 0; fb.className = 'fb bad'; fb.textContent = 'Not yet. Try again or tap Show me how.';
  }
  showStats();
}
$('#prCheck').onclick = checkQ;
$('#prNext').onclick = () => { nextQ(); $('#prAns').focus({ preventScroll: true }); };
$('#prAns').addEventListener('keydown', e => { if (e.key === 'Enter') checkQ(); });
nextQ(); showStats();

/* =========================================================
   8c. Celebration, certificate, install, offline
   ========================================================= */
function confetti() {
  if (reduce) return;
  const c = $('#confetti'), x = c.getContext('2d'); c.hidden = false;
  c.width = innerWidth; c.height = innerHeight;
  const cols = ['#0b6e4f', '#f0b429', '#2563b8', '#c7372f', '#8e44ad', '#2fb384'];
  const ps = Array.from({ length: 150 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, vx: (Math.random() - .5) * 4, vy: 2 + Math.random() * 4, s: 6 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: cols[rnd(0, cols.length - 1)] }));
  const t0 = performance.now();
  (function f(t) {
    x.clearRect(0, 0, c.width, c.height);
    ps.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); x.restore(); });
    if (t - t0 < 3800) requestAnimationFrame(f); else c.hidden = true;
  })(t0);
}
const dlg = $('#complete');
function openCert() {
  $('#certLine').textContent = `Completed Arithmetic Progression, 7 of 7 steps` + (solved ? `, ${solved} practice question${solved === 1 ? '' : 's'} solved` : '') + ` on ${new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.`;
  $('#certName').value = store.get('ap-name') || '';
  dlg.hidden = false; $('#certBtn').hidden = false; $('#certName').focus({ preventScroll: true });
}
function celebrate() { confetti(); openCert(); }
$('#certClose').onclick = () => { dlg.hidden = true; };
$('#certBtn').onclick = openCert;
$('#certName').addEventListener('input', e => store.set('ap-name', e.target.value));
$('#certPrint').onclick = () => {
  document.body.classList.add('print-cert');
  setTimeout(() => { window.print(); document.body.classList.remove('print-cert'); }, 50);
};
addEventListener('keydown', e => { if (e.key === 'Escape' && !dlg.hidden) dlg.hidden = true; });

let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; $('#installBtn').hidden = false; });
$('#installBtn').onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('#installBtn').hidden = true; };
addEventListener('appinstalled', () => { $('#installBtn').hidden = true; });
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* =========================================================
   9. Start
   ========================================================= */
syncLayout();
onScroll();

})();
