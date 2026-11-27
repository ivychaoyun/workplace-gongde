// 第三幕的修行區：蒲團（靜坐）、經架（心經）、木魚、籤筒（抽籤）集中在小和尚出生點前方，旁邊是山門出口。
// 每個互動點：地上的金色光圈（慢慢明暗）＋上方常駐名稱牌；走近時畫面下方出現「按 E 開始」。
// 山門：穩定的冷白光圈、「山門・出口」牌子、從出生點延伸過去的石板路；山門在畫面外時顯示「山門 →」。
// 右上角的「今日修行」只在真的完成時打勾（markDone）；下方另有「隨時可以離開」的提示。
// 互動內容由 temple.js 用 setSpotHandler 接上（靜坐、心經、抽籤在 temple-practice.js）。
// 主要負責：安淇（foraianother8-ann）
import * as THREE from 'three';
import { show } from './ui.js';
import { GOLD, SERIF, camera, canvasTex, cyl, lathe, mat, mesh, plaqueTex, rbox, scene, sphere } from './core.js';

// 樣式放在自己的檔案，由這裡載入，不用改 index.html
const css = document.createElement('link');
css.rel = 'stylesheet'; css.href = 'css/temple.css';
document.head.append(css);

/* ---------- 位置 ---------- */
// pos：站上去會出現提示的地方（地上的光圈）；r：多近會出現提示；tagY：名稱牌的高度
// obj：物件本身的位置（高的物件放在光圈後面，才不會擋住小和尚）
const FISH_KNEEL = [1.5, 2.95];                               // 敲木魚時小和尚跪的位置
const SPOTS = [
  { id: 'sit', label: '靜坐', pos: [-1.9, 3.2], r: 1.1, obj: [-1.9, 3.2], tagY: 0.95 },
  { id: 'sutra', label: '心經', pos: [-1.8, 1.85], r: 1.05, obj: [-1.8, 1.0], tagY: 1.55 },
  { id: 'fish', label: '木魚', pos: [1.42, 3.4], r: 1.1, obj: [FISH_KNEEL[0] - 0.14, FISH_KNEEL[1] + 0.71], tagY: 1.0 },
  { id: 'lot', label: '抽籤', pos: [1.6, 1.85], r: 1.05, obj: [1.6, 1.0], tagY: 1.7 },
  { id: 'gate', label: '山門・出口', pos: [-2.6, 0.86], r: 1.0, obj: [-2.9, -0.1], tagY: 2.0, exit: true },
];
const GATE_YAW = 0.3;                                         // 山門在修行區左後方，轉向鏡頭（右上角是今日修行清單，不放這邊）
const PRACTICE = SPOTS.filter(s => !s.exit);
const spotById = id => SPOTS.find(s => s.id === id);
// 走路時要繞開的東西（x, z, 半徑），temple-walk.js 會用
const gatePost = s => { const [x, z] = spotById('gate').obj; return [x + Math.cos(GATE_YAW) * 0.95 * s, z - Math.sin(GATE_YAW) * 0.95 * s, 0.25]; };
const SPOT_BLOCKS = [[-1.8, 1.0, 0.5], [1.6, 1.0, 0.55], [...spotById('fish').obj, 0.32], gatePost(-1), gatePost(1)];

const done = new Set();
const handlers = {};
const rings = [];
let fishMarker = null, near = null;

function setSpotHandler(id, fn) { handlers[id] = fn; }

/* ---------- 場景裡的物件 ---------- */
function ring(x, z, r, color) {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
  const g = new THREE.Group(); g.position.set(x, 0.03, z); scene.add(g);
  const outer = new THREE.Mesh(new THREE.RingGeometry(r * 0.84, r, 56), m);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(r * 0.84, 56), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, depthWrite: false, toneMapped: false }));
  for (const o of [outer, fill]) { o.rotation.x = -Math.PI / 2; o.renderOrder = 2; g.add(o); }
  return { g, outer, fill };
}

function buildSitCushion([x, z]) {
  // 比一般蒲團大，金色滾邊，看得出是可以坐的那一個
  mesh(lathe([[0, 0], [0.5, 0], [0.57, 0.06], [0.58, 0.12], [0.54, 0.19], [0.44, 0.24], [0, 0.25]], 32), mat('#d4553f', { roughness: 0.8 }), scene, x, 0, z);
  mesh(new THREE.TorusGeometry(0.56, 0.025, 8, 40), GOLD(), scene, x, 0.1, z).rotation.x = Math.PI / 2;
}

function buildSutraRack([x, z]) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  const wood = mat('#6e3a22', { roughness: 0.6 });
  for (const s of [-1, 1]) mesh(rbox(0.07, 1.05, 0.07, 0.02), wood, g, s * 0.36, 0.52, 0);
  mesh(rbox(0.86, 0.06, 0.42, 0.02), wood, g, 0, 0.12, 0);
  // 斜放的經書板與攤開的經文，朝向鏡頭
  const board = new THREE.Group(); board.position.set(0, 1.06, 0.02); board.rotation.x = 0.7; g.add(board);
  mesh(rbox(0.96, 0.04, 0.62, 0.02), wood, board);
  const tex = canvasTex(512, 320, (c, w) => {
    c.fillStyle = '#f3e6c4'; c.fillRect(0, 0, w, 320);
    c.fillStyle = '#5a2a18'; c.font = `900 30px ${SERIF}`; c.textAlign = 'center';
    const lines = ['觀自在菩薩', '行深般若波羅', '蜜多時照見五', '蘊皆空度一切'];
    // 直書：由右往左
    lines.forEach((ln, i) => [...ln].forEach((ch, j) => c.fillText(ch, w - 70 - i * 90, 50 + j * 38)));
  });
  const page = mesh(new THREE.PlaneGeometry(0.86, 0.54), mat('#fff', { map: tex, roughness: 0.8 }), board, 0, 0.025, 0);
  page.rotation.x = -Math.PI / 2; page.castShadow = false;
}

function buildLotTable([x, z]) {
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  mesh(rbox(0.9, 0.72, 0.6, 0.04), mat('#8a2a22', { roughness: 0.55 }), g, 0, 0.36, 0);
  mesh(rbox(0.98, 0.06, 0.68, 0.02), mat('#5e1a14'), g, 0, 0.74, 0);
  // 竹籤筒與一把籤：做大一點，遠遠就看得到
  mesh(cyl(0.17, 0.15, 0.5, 24), mat('#c79a52', { roughness: 0.5 }), g, 0, 1.02, 0);
  for (const y of [0.86, 1.18]) mesh(new THREE.TorusGeometry(0.165, 0.014, 6, 28), mat('#7a3a1a'), g, 0, y, 0).rotation.x = Math.PI / 2;
  const stick = mat('#e2c27e', { roughness: 0.6 });
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2, r = 0.03 + (i % 3) * 0.035;
    const s = mesh(rbox(0.022, 0.5, 0.008, 0.004), stick, g, Math.cos(a) * r, 1.3 + (i % 4) * 0.025, Math.sin(a) * r);
    s.rotation.set(Math.sin(a) * 0.14, 0, -Math.cos(a) * 0.14);
  }
  for (const s of [-1, 1]) { const b = mesh(sphere(0.06, 12, 8), mat('#b8322a'), g, s * 0.32, 0.79, 0.14); b.scale.set(1, 0.35, 0.6); }
}

function buildGate([x, z]) {
  // 牌樓式山門：兩根紅柱、門楣、屋頂、「山門」匾；門洞裡是外面的亮光
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = GATE_YAW; scene.add(g);
  const red = mat('#b8312a', { roughness: 0.55 }), roof = mat('#2f5a4c', { roughness: 0.6 });
  for (const s of [-1, 1]) {
    mesh(cyl(0.13, 0.13, 3.0, 16), red, g, s * 0.95, 1.5, 0);
    mesh(cyl(0.22, 0.25, 0.22, 16), mat('#9c948a'), g, s * 0.95, 0.11, 0);
  }
  mesh(rbox(2.3, 0.26, 0.3, 0.04), red, g, 0, 2.95, 0);
  mesh(rbox(2.45, 0.08, 0.36, 0.02), GOLD(), g, 0, 3.12, 0);
  const r1 = mesh(rbox(2.9, 0.16, 0.8, 0.06), roof, g, 0, 3.28, 0); r1.rotation.x = 0;
  mesh(rbox(2.3, 0.18, 0.55, 0.06), roof, g, 0, 3.44, 0);
  for (const s of [-1, 1]) { const e = mesh(new THREE.ConeGeometry(0.09, 0.3, 8), GOLD(), g, s * 1.42, 3.38, 0); e.rotation.z = -s * 1.0; }
  const p = mesh(new THREE.PlaneGeometry(1.1, 0.36), mat('#fff', { map: plaqueTex('山門'), roughness: 0.55 }), g, 0, 2.6, 0.17);
  p.castShadow = false;
  // 門外：天空、遠山、一段往外的石階，用貼圖畫在門洞裡
  const outside = canvasTex(256, 384, (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#cfe9ff'); sky.addColorStop(0.55, '#fff6df'); sky.addColorStop(1, '#ffe2a8');
    c.fillStyle = sky; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(120,170,150,.55)';
    c.beginPath(); c.moveTo(0, h * 0.62); c.quadraticCurveTo(w * 0.3, h * 0.45, w * 0.55, h * 0.6); c.quadraticCurveTo(w * 0.8, h * 0.5, w, h * 0.58); c.lineTo(w, h * 0.7); c.lineTo(0, h * 0.7); c.fill();
    c.fillStyle = 'rgba(214,190,150,.9)';
    for (let i = 0; i < 5; i++) { const y = h * 0.7 + i * 22, half = 40 + i * 18; c.fillRect(w / 2 - half, y, half * 2, 14); }
  });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 2.8), new THREE.MeshBasicMaterial({ map: outside, toneMapped: false }));
  door.position.set(0, 1.4, -0.02); g.add(door);
  const back = door.clone(); back.rotation.y = Math.PI; back.position.z = -0.04; g.add(back);
  // 門前的柔光
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (c, w) => {
    const gr = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,248,225,.8)'); gr.addColorStop(1, 'rgba(255,248,225,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, w);
  }), transparent: true, depthWrite: false, toneMapped: false }));
  glow.rotation.x = -Math.PI / 2; glow.position.set(0, 0.025, 0.7); glow.renderOrder = 1; g.add(glow);
}

function buildPath() {
  // 從出生點到山門的石板路
  const stone = mat('#e6dccb', { roughness: 0.9 });
  const from = new THREE.Vector2(-0.2, 3.3), to = new THREE.Vector2(...spotById('gate').pos);
  for (let i = 0; i <= 4; i++) {
    const k = i / 4, p = from.clone().lerp(to, k);
    const s = mesh(rbox(0.52, 0.04, 0.36, 0.06), stone, scene, p.x, 0.02, p.y);
    s.rotation.y = Math.atan2(to.x - from.x, to.y - from.y); s.castShadow = false;
  }
}

function buildFishMarker([x, z]) {
  // 平常放在地上的木魚，位置跟小和尚跪下時拿出來的木魚一樣；跪下敲的時候先藏起來
  const g = new THREE.Group(); g.position.set(x, 0, z); scene.add(g);
  mesh(lathe([[0, 0], [0.3, 0], [0.33, 0.06], [0.3, 0.12], [0, 0.13]], 24), mat('#c94a3c', { roughness: 0.85 }), g);
  const body = mesh(sphere(1, 28, 18), mat('#a8471e', { roughness: 0.32 }), g, 0, 0.36, 0); body.scale.set(0.3, 0.24, 0.28);
  mesh(new THREE.BoxGeometry(0.38, 0.028, 0.13), mat('#3a1a0c'), g, 0, 0.36, 0.22).rotation.x = -0.15;
  return g;
}

function buildSpots() {
  buildSitCushion(spotById('sit').obj);
  buildSutraRack(spotById('sutra').obj);
  buildLotTable(spotById('lot').obj);
  buildGate(spotById('gate').obj);
  buildPath();
  fishMarker = buildFishMarker(spotById('fish').obj);
  for (const s of SPOTS) rings.push({ spot: s, ...ring(s.pos[0], s.pos[1], s.r, s.exit ? '#cfeeff' : '#ffd77a') });
  renderPractice();
}
function setFishMarker(v) { if (fishMarker) fishMarker.visible = v; }

/* ---------- 畫面上的提示、名稱牌、清單 ---------- */
function el(tag, id, cls, text) { const n = document.createElement(tag); if (id) n.id = id; if (cls) n.className = cls; if (text) n.textContent = text; document.body.append(n); return n; }
const promptEl = el('button', 'spotPrompt'); promptEl.type = 'button';
const captionEl = el('div', 'templeCaption');
const sideEl = el('div', 'templeSide');
const practiceEl = document.createElement('div'); practiceEl.id = 'practice';
const leaveEl = document.createElement('div'); leaveEl.id = 'leaveTip';
leaveEl.innerHTML = '<b>自由體驗，隨時可以離開</b><span>走向山門，領取今日功德單</span>';
sideEl.append(practiceEl, leaveEl);
const gateArrow = el('div', 'gateArrow');
const tags = SPOTS.map(s => { const t = el('div', null, 'spot-tag' + (s.exit ? ' exit' : ''), s.exit ? '⛩ 山門・出口' : s.label); return { s, t }; });

promptEl.addEventListener('click', () => { if (near && show.mode === 'roam') openSpot(near); });

let captionTimer = null;
function showCaption(text, ms = 2600) {
  clearTimeout(captionTimer);
  captionEl.textContent = text;
  captionEl.classList.add('show');
  if (ms) captionTimer = setTimeout(hideCaption, ms);
}
function hideCaption() { clearTimeout(captionTimer); captionEl.classList.remove('show'); }

function renderPractice() {
  practiceEl.replaceChildren();
  const h = document.createElement('b'); h.textContent = '今日修行'; practiceEl.append(h);
  const ul = document.createElement('ul');
  for (const s of PRACTICE) {
    const li = document.createElement('li');
    li.textContent = s.label;
    if (done.has(s.id)) li.className = 'done';
    ul.append(li);
  }
  practiceEl.append(ul);
}
function showPractice(v) { sideEl.classList.toggle('show', v); }
function markDone(id) { done.add(id); renderPractice(); }
function practiceDone() { return PRACTICE.filter(s => done.has(s.id)).map(s => s.label); }
function isDone(id) { return done.has(id); }

function openSpot(s) {
  promptEl.classList.remove('show');
  hideCaption();
  if (handlers[s.id]) handlers[s.id](s);
}

addEventListener('keydown', e => {
  if (e.target instanceof HTMLTextAreaElement || e.repeat) return;
  if (e.code === 'KeyE' && show.mode === 'roam' && near) { e.preventDefault(); openSpot(near); }
});

/* ---------- 每一格：最近的互動點、光圈、名稱牌、山門方向 ---------- */
const v3 = new THREE.Vector3();
function project(x, y, z) {
  v3.set(x, y, z).project(camera);
  return { x: (v3.x * 0.5 + 0.5) * innerWidth, y: (-v3.y * 0.5 + 0.5) * innerHeight, behind: v3.z > 1 };
}
const overlaps = (r, x, y, pad = 8) => x > r.left - pad && x < r.right + pad && y > r.top - pad && y < r.bottom + pad;

function spotsTick(t, pos) {
  const roaming = show.mode === 'roam';
  // 做修行、敲木魚時先收起右上角，不擋到小和尚
  sideEl.classList.toggle('busy', !roaming && show.mode !== 'land');
  const inTemple = ['land', 'roam', 'spot', 'toSit', 'sit', 'toFish', 'knock', 'knockDone'].includes(show.mode);
  let best = null, bestD = Infinity;
  if (roaming) for (const s of SPOTS) {
    const d = Math.hypot(pos.x - s.pos[0], pos.z - s.pos[1]);
    if (d < s.r && d < bestD) { best = s; bestD = d; }
  }
  if (best !== near) {
    near = best;
    if (near) promptEl.innerHTML = `<span>${near.exit ? '山門' : near.label}</span><kbd>E</kbd><em>${near.exit ? '按 E 領取功德單' : '按 E 開始'}</em>`;
  }
  promptEl.classList.toggle('show', !!near);

  // 光圈：修行點慢慢明暗，山門是穩定的柔光
  for (const { spot, g, outer, fill } of rings) {
    g.visible = inTemple && !(spot.id === 'fish' && show.mode === 'knock') && !(spot.id === 'sit' && show.mode === 'sit');
    if (spot.exit) { outer.material.opacity = spot === near ? 0.95 : 0.7; fill.material.opacity = spot === near ? 0.3 : 0.2; continue; }
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.6 + spot.pos[0]);
    const base = done.has(spot.id) ? 0.3 : 0.45;
    outer.material.opacity = spot === near ? 1 : base + pulse * 0.35;
    fill.material.opacity = spot === near ? 0.3 : 0.06 + pulse * 0.1;
  }

  // 名稱牌：跟著物件，不蓋到右上角的清單
  const showTags = roaming || show.mode === 'land';
  const side = sideEl.getBoundingClientRect();
  for (const { s, t: tag } of tags) {
    const p = project(s.obj[0], s.tagY, s.obj[1]);
    const hide = !showTags || p.behind || p.x < 0 || p.x > innerWidth || p.y < 0 || p.y > innerHeight || (sideEl.classList.contains('show') && overlaps(side, p.x, p.y - 14));
    tag.classList.toggle('show', !hide);
    tag.classList.toggle('done', done.has(s.id));
    tag.classList.toggle('near', s === near);
    if (!hide) tag.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -100%)`;
  }

  // 山門在畫面外：在邊緣放一個「山門 →」
  const gate = spotById('gate');
  const gp = project(gate.obj[0], 1.6, gate.obj[1]);
  const off = gp.behind || gp.x < 24 || gp.x > innerWidth - 24;
  gateArrow.classList.toggle('show', roaming && off);
  if (roaming && off) {
    const right = gp.behind ? gp.x < innerWidth / 2 : gp.x > innerWidth / 2;
    gateArrow.textContent = right ? '山門 →' : '← 山門';
    gateArrow.classList.toggle('right', right);
    gateArrow.style.top = Math.round(Math.min(Math.max(gp.behind ? innerHeight / 2 : gp.y, innerHeight * 0.3), innerHeight * 0.7)) + 'px';
  }
}

export { FISH_KNEEL, SPOTS, SPOT_BLOCKS, buildSpots, hideCaption, isDone, markDone, practiceDone, setFishMarker, setSpotHandler, showCaption, showPractice, spotsTick };
