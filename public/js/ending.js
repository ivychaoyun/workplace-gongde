// 結局：功德單之後按「回到公司」→ 靈魂飄回趴在桌上的身體 → 醒來、顏色恢復
// → 自動走到茶水間泡咖啡 → 走到窗邊開窗看外面 → 走回座位坐下休息 → 結尾字句、再寄放一次。
// 每個地點有 3 個按鈕（也可以按空白鍵）；字句直接浮在畫面上，不放在卡片裡。
// 對應劇本 docs/劇本.md 的「結局｜回到公司：重新開始」。
// 主要負責：趙芸（chaoyun）
import * as THREE from 'three';
import { show } from './ui.js';
import { canvasTex, cyl, mat, mesh, rbox, renderer, sphere } from './core.js';
import { ensureAudio, audio, noise, tone } from './audio.js';
import {
  OFF, OBACK, ocam, office, officeScene, SEAT_STAND, SOUL_HOVER,
  cupMesh, goTo, holdInHand, sitDown, soulGlow, soulOpacity, soulPose, standUp, woosh,
} from './office.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (k) => 1 - (1 - k) ** 3;
const lerp = THREE.MathUtils.lerp;

const END = { phase: null, t0: 0, from: V(0, 0, 0), i: -1, step: null, waiting: false, pressedAt: null, holding: false, wind: 0, sky: 0 };
window.__ending = { END, OFF, ocam };   // 除錯用：在瀏覽器主控台看結局的狀態

/* ---------- 位置 ---------- */
const COFFEE = { x: -1.0, z: -5.55, face: Math.PI };   // 站在咖啡機前，面向後牆
const WIN = { x: 0, z: -5.4, face: Math.PI };         // 站在中間那扇窗前（退半步，窗扇推開才不會碰到）
const CUP_TRAY = V(-1.0, 0.99, -6.1);                  // 咖啡機出水口下面
const CUP_DESK = V(0.42, 0.81, 3.72);                  // 自己桌上、鍵盤右邊

/* ---------- 鏡頭：shot(鏡頭位置, 看的位置) ---------- */
const shot = (p, t, fov = 55) => ({ pos: V(...p), tgt: V(...t), fov });   // fov：特寫用窄一點（42），其他用 55
const SHOTS = {
  wideAisle: shot([3.4, 5.0, 3.0], [-0.6, 0.6, -3.2]),     // 遠景：辦公室側上方看走道
  coffeeMed: shot([-0.15, 1.55, -6.15], [-1.0, 1.05, -5.0]), // 中景：咖啡機旁看主角走過來
  cupClose: shot([-0.15, 1.5, -5.6], [-0.95, 1.05, -6.15], 42),   // 特寫：手和杯子
  pourClose: shot([-0.4, 1.25, -5.72], [-1.0, 1.06, -6.12], 42), // 特寫：咖啡流進杯子
  sipSide: shot([0.85, 2.15, -6.25], [-1.0, 1.3, -5.35]),   // 中景：從窗前斜看主角喝咖啡
  winBack: shot([0.3, 1.85, -3.4], [0, 1.9, -6.4]),         // 背影：看得到整扇窗
  winSide: shot([2.0, 1.9, -5.0], [0, 1.75, -6.0]),         // 中景：側面看主角推開窗
  face: shot([0.1, 1.5, -6.35], [0, 1.45, -5.4], 50),      // 特寫：從兩片窗扇中間看主角的臉
  over1: shot([0.55, 1.95, -4.4], [0, 2.1, -6.5]),          // 過肩看窗外
  over2: shot([0.45, 2.0, -4.6], [0, 2.1, -6.5]),           // 慢慢推近窗外
  frontWide: shot([0, 4.6, 11.8], [0, 0.8, 1.2]),           // 遠景：從前方看主角走回來
  seatMed: shot([1.5, 1.6, 6.0], [0, 0.9, 4.5]),            // 中景：座位旁
  note: shot([0.3, 1.45, 4.45], [0.12, 1.25, 3.36], 42),       // 特寫：螢幕上的便利貼
  lookUp: shot([0, 1.84, 4.75], [0, 4.6, 3.4]),             // 第一人稱往上看天花板
  shoulder: shot([0.75, 2.05, 5.5], [0, 1.0, 3.4]),         // 越過肩膀
  top: shot([0, 5.5, 12.5], [0, 0.5, 2.8]),                 // 整間辦公室的俯視遠景
};
function setShot(s, speed = 2.4) {
  OFF.camShot = s; OFF.camSpeed = s ? speed : 3.2;
  OFF.camFov = s ? s.fov + (OFF.portrait ? 15 : 0) : undefined;
}

/* ---------- 道具：咖啡機、會開的窗、窗簾、時鐘秒針、熱氣 ---------- */
const P = {};
function buildProps() {
  if (P.built) return; P.built = true;
  // 茶水間的櫃檯與咖啡機（靠後牆，在飲水機右邊）
  const zWall = OBACK + 0.02;
  mesh(rbox(0.8, 0.9, 0.5, 0.03), mat('#efe9dd'), officeScene, -1.0, 0.45, zWall + 0.28);
  mesh(rbox(0.86, 0.05, 0.54, 0.02), mat('#c8a57c'), officeScene, -1.0, 0.92, zWall + 0.28);
  const body = mat('#2f3238', { roughness: 0.35, metalness: 0.3 });
  mesh(rbox(0.36, 0.42, 0.3, 0.04), body, officeScene, -1.0, 1.15, zWall + 0.22);
  mesh(rbox(0.36, 0.05, 0.12, 0.02), body, officeScene, -1.0, 1.31, zWall + 0.42);   // 上面的出水頭
  mesh(cyl(0.02, 0.016, 0.05, 10), mat('#8d9290', { metalness: 0.6 }), officeScene, -1.0, 1.26, zWall + 0.42);
  mesh(rbox(0.22, 0.02, 0.14, 0.01), mat('#8d9290', { metalness: 0.5 }), officeScene, -1.0, 0.955, zWall + 0.42);  // 滴水盤
  P.light = mesh(sphere(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: '#552', emissive: '#ffb347', emissiveIntensity: 0 }), officeScene, -0.88, 1.24, zWall + 0.375);
  P.stream = mesh(cyl(0.008, 0.008, 0.22, 8), mat('#5a3420', { roughness: 0.3 }), officeScene, -1.0, 1.13, zWall + 0.42);
  P.stream.visible = false;
  // 架上的杯子
  for (const x of [-1.3, -1.2]) mesh(cyl(0.04, 0.034, 0.09, 12), mat('#f4f2ec'), officeScene, x, 0.99, zWall + 0.2);

  // 我的馬克杯（裡面有咖啡，會慢慢變滿）
  P.cup = cupMesh('#ffffff', 0.12, 0.05); P.cup.visible = false; officeScene.add(P.cup);
  P.fill = mesh(new THREE.CircleGeometry(0.046, 20), mat('#5a3420', { roughness: 0.25 }), P.cup, 0, 0.02, 0);
  P.fill.rotation.x = -Math.PI / 2; P.fill.visible = false;

  // 中間那扇窗：兩片可以往內推開的窗扇（鉸鍊在兩側）
  const fr = mat('#f7f5ef'), pane = new THREE.MeshStandardMaterial({ color: '#dff0ff', transparent: true, opacity: 0.18, roughness: 0.1 });
  P.sash = [];
  for (const s of [-1, 1]) {
    const hinge = new THREE.Group(); hinge.position.set(s * 1.0, 2.05, OBACK + 0.08); officeScene.add(hinge);
    const g = new THREE.Group(); g.position.x = -s * 0.5; hinge.add(g);
    for (const [w, h, dx, dy] of [[1.0, 0.06, 0, 0.67], [1.0, 0.06, 0, -0.67], [0.06, 1.4, -0.47, 0], [0.06, 1.4, 0.47, 0]]) mesh(new THREE.BoxGeometry(w, h, 0.05), fr, g, dx, dy, 0);
    const gl = mesh(new THREE.PlaneGeometry(0.9, 1.3), pane, g, 0, 0, 0); gl.castShadow = false;
    P.sash.push({ hinge, s });
  }
  // 窗簾：上緣固定，下襬被風吹起
  const cloth = new THREE.MeshStandardMaterial({ color: '#f3ead8', roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  P.curtains = [];
  for (const s of [-1, 1]) {
    const top = new THREE.Group(); top.position.set(s * 1.3, 2.9, OBACK + 0.14); officeScene.add(top);
    const c = mesh(new THREE.PlaneGeometry(0.5, 1.75), cloth, top, 0, -0.87, 0); c.castShadow = false;
    P.curtains.push({ top, s });
  }
  mesh(cyl(0.02, 0.02, 3.0, 8), mat('#c8a57c'), officeScene, 0, 2.92, OBACK + 0.14).rotation.z = Math.PI / 2;

  // 牆上時鐘的秒針（時鐘在 office.js，這裡加一根會走的紅色秒針）
  P.second = new THREE.Group(); P.second.position.set(0, 3.3, OBACK + 0.035); officeScene.add(P.second);
  mesh(rbox(0.012, 0.24, 0.005, 0.002), mat('#c0392b'), P.second, 0, 0.09, 0);

  // 熱氣
  P.steam = [];
  for (let i = 0; i < 7; i++) {
    const s = mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false }), officeScene);
    s.castShadow = false; s.visible = false; P.steam.push({ s, ph: i / 7 });
  }

  // 窗外的天空可以慢慢捲動（雲在飄）
  // 後牆的三片窗玻璃：有 emissiveMap、貼在後牆上（螢幕也有 emissiveMap，但不在後牆）
  P.glass = [];
  officeScene.traverse(o => { if (o.isMesh && o.material && o.material.emissiveMap && Math.abs(o.position.z - (OBACK + 0.02)) < 0.01) P.glass.push(o.material); });
  if (P.glass[0]) { const t = P.glass[0].map; t.wrapS = THREE.RepeatWrapping; t.needsUpdate = true; }
  // 中間那扇窗打開後看到的風景：藍天、白雲、遠處的大樓和樹（比原本的窗景清楚、顏色飽和）
  officeScene.traverse(o => { if (o.isMesh && o.material && o.material.emissiveMap && Math.abs(o.position.z - (OBACK + 0.02)) < 0.01 && Math.abs(o.position.x) < 0.1) P.centerGlass = o; });
  P.outside = canvasTex(1024, 720, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.75); sky.addColorStop(0, '#3f93dd'); sky.addColorStop(1, '#a9d8f4');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.95)';
    for (const [x, y, r] of [[160, 150, 46], [215, 135, 60], [275, 155, 42], [640, 95, 38], [690, 80, 52], [745, 100, 36], [860, 230, 30], [900, 220, 40]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    // 遠處的大樓
    for (let i = 0; i < 14; i++) { const bw = 50 + (i * 37) % 40, bh = 120 + (i * 53) % 150, x = i * 76 - 10; g.fillStyle = ['#8fa9bd', '#9fb6c8', '#7f9bb0'][i % 3]; g.fillRect(x, h * 0.72 - bh, bw, bh + 10);
      g.fillStyle = 'rgba(255,255,255,.35)'; for (let y = h * 0.72 - bh + 12; y < h * 0.72; y += 22) for (let xx = x + 8; xx < x + bw - 8; xx += 16) g.fillRect(xx, y, 7, 10); }
    // 樹
    g.fillStyle = '#5e9f5b'; for (let x = 0; x < w; x += 46) { g.beginPath(); g.arc(x + 20, h * 0.78, 34 + (x % 3) * 6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#4f8a4d'; g.fillRect(0, h * 0.8, w, h * 0.2);
  });
  P.outside.wrapS = THREE.RepeatWrapping;
  officeScene.traverse(o => { if (o.isPointLight && o.color.getHexString() === 'dff0ff') P.winLight = o; });
}

/* ---------- 音效（Web Audio 合成） ---------- */
const now = () => (ensureAudio(), audio.ctx.currentTime);
const SFX = {
  cup() { const t = now(); tone('triangle', 900, 600, t, 0.22, 0.08); },
  coffee(dur) {
    const t = now();
    for (let i = 0; i < dur / 0.35; i++) noise(t + i * 0.35, 0.06, 0.55, 'lowpass', 260, 1);
    for (let i = 0; i < 10; i++) tone('sine', 1500 + Math.random() * 400, 900, t + 0.6 + i * 0.25 + Math.random() * 0.1, 0.05, 0.07);
  },
  sip() { const t = now(); noise(t, 0.1, 0.9, 'bandpass', 700, 0.7); },
  windowOpen() { const t = now(); noise(t, 0.18, 0.6, 'bandpass', 520, 1.5); tone('sine', 300, 200, t, 0.05, 0.4); },
  wind(dur, peak = 0.05) { const t = now(); for (let i = 0; i < dur / 0.3; i++) noise(t + i * 0.3, peak * (0.7 + Math.random() * 0.6), 0.7, 'lowpass', 500 + Math.random() * 200, 0.7); },
  birds() { const t = now(); for (let i = 0; i < 4; i++) { const s = t + 0.4 + i * 0.7 + Math.random() * 0.3; tone('sine', 3000, 4300, s, 0.04, 0.09); tone('sine', 3400, 4800, s + 0.13, 0.035, 0.08); } },
  sticky() { const t = now(); noise(t, 0.28, 0.06, 'highpass', 2200); },
  creak(long) { const t = now(); tone('sawtooth', 190, 120, t, 0.035, long ? 0.8 : 0.3); },
  tick() { const t = now(); tone('square', 1900, 0, t, 0.025, 0.025); },
};

/* ---------- 字句：浮在畫面上，淡入淡出 ---------- */
const caption = $('endCaption'); let captionTimer = 0;
function line(text, sec = 5) {
  clearTimeout(captionTimer);
  caption.textContent = text; caption.classList.add('show');
  captionTimer = setTimeout(() => caption.classList.remove('show'), sec * 1000);
}

/* ---------- 按鈕 ---------- */
const actBtn = $('endAct'), actLabel = $('endActLabel'), skipBtn = $('endSkip');
function askButton(label) { actLabel.textContent = label; actBtn.classList.add('show'); END.waiting = true; }
function press() {
  if (!END.waiting) return;
  END.waiting = false; actBtn.classList.remove('show');
  END.pressedAt = show.clock;
}
actBtn.addEventListener('click', press);
addEventListener('keydown', e => {
  if (END.phase && e.code === 'Space' && END.waiting) { e.preventDefault(); press(); }
});

/* ---------- 流程：一步一步 ---------- */
// kind：walk（自動走過去）、act（按按鈕後做動作）、wait（等幾秒）
const STEPS = [
  // 茶水間
  { kind: 'walk', to: COFFEE, shots: [[0, SHOTS.wideAisle], [2.4, null]], near: [2.4, SHOTS.coffeeMed] },
  { kind: 'act', label: '拿杯子', shot: SHOTS.cupClose, dur: 1.6, run: grabCup },
  { kind: 'act', label: '按下咖啡機', shot: SHOTS.pourClose, dur: 3.6, run: brew, start: () => SFX.coffee(3.4) },
  { kind: 'act', label: '喝一口', shot: SHOTS.sipSide, dur: 3.0, run: sip, start: () => { setTimeout(SFX.sip, 1100); } ,
    end: () => line('一天中給自己一段安靜的時光，\n先照顧自己，再照顧工作。', 6) },
  { kind: 'wait', dur: 4.0 },
  // 窗邊
  { kind: 'walk', to: WIN, shots: [[0, null]], near: [1.3, SHOTS.winBack] },
  { kind: 'act', label: '打開窗戶', shot: SHOTS.winSide, dur: 2.2, run: openWindow, start: () => { SFX.windowOpen(); SFX.wind(3); } },
  { kind: 'act', label: '深呼吸', shot: SHOTS.face, dur: 3.4, run: breathe, start: () => { SFX.wind(3.4, 0.04); SFX.birds(); } },
  { kind: 'act', label: '看看外面', shot: SHOTS.over1, dur: 4.5, run: lookOut, start: () => { SFX.wind(5, 0.07); SFX.birds(); },
    end: () => line('與自己和解，把喧囂留在身後；\n天還很大，事情沒有那麼大。', 6.5) },
  { kind: 'wait', dur: 4.5 },
  // 回座位
  { kind: 'walk', to: { x: SEAT_STAND.x, z: SEAT_STAND.z, face: Math.PI }, shots: [[0, SHOTS.frontWide]], near: [1.6, SHOTS.seatMed] },
  { kind: 'act', label: '坐下', shot: SHOTS.seatMed, dur: 1.6, run: () => {}, start: sitWithCup },
  { kind: 'act', label: '貼便利貼', shot: SHOTS.note, dur: 2.0, run: stickNote,
    end: () => line('用自己的步調，一件一件來。', 5) },
  { kind: 'act', label: '靠上椅背', shot: null, dur: 3.2, run: leanBack, start: () => SFX.creak(true) },
];

function nextStep(t) {
  END.i += 1; END.t0 = t; END.pressedAt = null; END.nearDone = false;
  const s = END.step = STEPS[END.i];
  if (!s) { startRest(t); return; }
  if (s.kind === 'walk') {
    OFF.frozen = false;
    if (OFF.state === 'seated') standUp(true);
    goTo(s.to.x, s.to.z);
    setShot(s.shots[0][1]);
  } else if (s.kind === 'act') {
    OFF.frozen = true;
    setShot(s.shot);
    askButton(s.label);
  }
}

function stepTick(t) {
  const s = END.step, since = t - END.t0;
  if (!s) return;
  if (s.kind === 'walk') {
    for (const [at, sh] of s.shots) if (at > 0 && since >= at && since - at < 0.05) setShot(sh);
    const pos = OFF.me.root.position, d = Math.hypot(pos.x - s.to.x, pos.z - s.to.z);
    if (s.near && !END.nearDone && d < s.near[0]) { END.nearDone = true; setShot(s.near[1]); }
    if (!OFF.path.length && d < 0.25) {
      pos.x = s.to.x; pos.z = s.to.z;
      // 轉向要面對的方向，轉好再往下
      let diff = s.to.face - OFF.me.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      OFF.me.root.rotation.y += diff * 0.15;
      OFF.frozen = true; standStill();
      if (Math.abs(diff) < 0.05) nextStep(t);
    }
  } else if (s.kind === 'act') {
    if (END.pressedAt == null) { standStill(); return; }
    const k = Math.min((t - END.pressedAt) / s.dur, 1);
    if (!s.started) { s.started = true; s.start && s.start(); }
    s.run(k, t - END.pressedAt, t);
    if (k >= 1) { s.end && s.end(); nextStep(t); }
  } else if (s.kind === 'wait') {
    standStill();
    if (since >= s.dur) nextStep(t);
  }
}

// 站著不動時的姿勢（拿著咖啡就把杯子拿在胸前）
function standStill() {
  const me = OFF.me; if (OFF.state !== 'walk') return;
  me.root.position.y = 0;
  for (const l of me.legs) l.rotation.x = 0;
  holdPose();
}
function holdPose() {
  const me = OFF.me;
  if (END.holding) me.arms[1].rotation.set(-1.35, 0, -0.35);
}

/* ---------- 每個動作 ---------- */
function grabCup(k) {
  const me = OFF.me;
  const reach = k < 0.5 ? ease(k * 2) : 1 - ease((k - 0.5) * 2);
  me.arms[1].rotation.set(lerp(0, -1.5, reach), 0, lerp(-0.12, 0.25, reach));
  if (k > 0.45 && !P.cup.visible) {
    P.cup.position.copy(CUP_TRAY); P.cup.visible = true; P.fill.visible = false; SFX.cup();
  }
}
function brew(k, sec, t) {
  P.light.material.emissiveIntensity = k < 1 ? 2.2 : 0;
  P.stream.visible = k > 0.08 && k < 0.88;
  P.stream.scale.x = P.stream.scale.z = 1 + Math.sin(t * 30) * 0.15;
  P.fill.visible = k > 0.15;
  P.fill.position.y = lerp(0.02, 0.105, Math.min(1, Math.max(0, (k - 0.15) / 0.7)));
  steamAt(P.cup, t, k > 0.3 ? 1 : 0);
}
function sip(k, sec, t) {
  const me = OFF.me;
  if (!END.holding) {
    // 從咖啡機下面拿起來
    holdInHand(me, 1, P.cup); P.cup.position.set(0, -0.37, 0.07); END.holding = true;
    P.light.material.emissiveIntensity = 0;
  }
  const up = k < 0.75 ? ease(Math.min(k / 0.4, 1)) : 1 - ease((k - 0.75) / 0.25) * 0.6;
  me.arms[1].rotation.set(lerp(-1.35, -2.25, up), 0, lerp(-0.35, -0.7, up));
  me.head.rotation.set(lerp(0, -0.2, up), 0, 0);
  // 喝完肩膀放鬆一下
  me.torso.rotation.set(k > 0.7 ? -0.05 * Math.sin((k - 0.7) / 0.3 * Math.PI) : 0, 0, 0);
  steamAt(P.cup, t, 1);
}
function openWindow(k) {
  const me = OFF.me, push = k < 0.5 ? ease(k * 2) : 1 - ease((k - 0.5) * 2) * 0.7;
  me.arms[0].rotation.set(lerp(0, -1.55, push), 0, 0.12);
  holdPose();
  const open = ease(Math.min(Math.max((k - 0.25) / 0.6, 0), 1));
  if (open > 0 && P.centerGlass && P.centerGlass.material.map !== P.outside) {
    P.centerGlass.material = P.centerGlass.material.clone();
    P.centerGlass.material.map = P.centerGlass.material.emissiveMap = P.outside;
    P.centerGlass.material.emissiveIntensity = 0.75; P.centerGlass.material.needsUpdate = true;
  }
  for (const { hinge, s } of P.sash) hinge.rotation.y = s * 0.6 * open;    // 兩片都往房間裡推開一半
  END.wind = Math.max(END.wind, open);
}
function breathe(k, sec, t) {
  const me = OFF.me, b = Math.sin(Math.min(k / 0.85, 1) * Math.PI);
  me.head.rotation.set(-0.28 * b, 0, 0);
  me.torso.scale.set(1 + 0.04 * b, 1 + 0.03 * b, 1 + 0.05 * b);
  me.torso.rotation.set(-0.08 * b, 0, 0);
  me.arms[0].rotation.set(0, 0, 0.12 + 0.2 * b);
  holdPose();
}
function lookOut(k) {
  const me = OFF.me;
  me.torso.scale.set(1, 1, 1); me.torso.rotation.set(0, 0, 0);
  me.head.rotation.set(-0.08, 0, 0);
  holdPose();
  // 越過肩膀，慢慢推向窗外
  if (k > 0.05 && OFF.camShot !== SHOTS.over2) setShot(SHOTS.over2, 0.55);
  END.sky = Math.max(END.sky, ease(k));
}
function sitWithCup() {
  sitDown(); OFF.frozen = true;
  // 把咖啡放到桌上
  officeScene.attach(P.cup); P.cup.position.copy(CUP_DESK); P.cup.rotation.set(0, 0, 0);
  END.holding = false;
  SFX.creak(false);
  setShot(null);
}
function stickNote(k) {
  if (k > 0.35 && !END.noted) { END.noted = true; drawStickyNote(); SFX.sticky(); }
}
function leanBack(k) {
  // 第一人稱慢慢往上看到天花板
  if (k > 0.1 && OFF.camShot !== SHOTS.lookUp) setShot(SHOTS.lookUp, 0.9);
}

function drawStickyNote() {
  const s = OFF.screen; if (!s) return;
  const g = s.g;
  g.save();
  g.translate(320, 100); g.rotate(-0.06);
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(6, 6, 166, 156);
  g.fillStyle = '#ffe36e'; g.fillRect(0, 0, 166, 156);
  g.fillStyle = 'rgba(0,0,0,.07)'; g.fillRect(0, 0, 166, 20);
  g.fillStyle = '#4a3b12'; g.font = '700 32px "Noto Sans TC", sans-serif'; g.textBaseline = 'top';
  g.fillText('先問清楚', 16, 42);
  g.font = '500 21px "Noto Sans TC", sans-serif';
  g.fillText('一件一件來', 20, 96);
  g.restore();
  s.tex.needsUpdate = true;
}

const _cup = V(0, 0, 0);
function steamAt(obj, t, on) {
  obj.getWorldPosition(_cup);
  for (const st of P.steam) {
    const u = (t * 0.45 + st.ph) % 1;
    st.s.visible = !!on;
    st.s.position.set(_cup.x + Math.sin((u + st.ph) * 9) * 0.04, _cup.y + 0.14 + u * 0.5, _cup.z + Math.cos((u + st.ph) * 7) * 0.03);
    st.s.scale.setScalar(0.6 + u * 1.5);
    st.s.material.opacity = 0.5 * Math.sin(u * Math.PI);
  }
}

/* ---------- 休息一下 → 結尾字句 ---------- */
function startRest(t) {
  END.phase = 'rest'; END.t0 = t; END.lastTick = 0;
  OFF.frozen = true;
  setShot(SHOTS.shoulder, 0.7);
  $('endWarm').classList.add('on');
  skipBtn.classList.remove('show');
}
function restTick(t) {
  const since = t - END.t0, me = OFF.me;
  // 靠在椅背上、雙手放在腦後
  me.torso.rotation.set(-0.22, 0, 0);
  me.head.rotation.set(-0.12, 0, 0);
  for (const a of me.arms) a.rotation.set(-2.7, 0, 0.75 * a.userData.s);
  steamAt(P.cup, t, 1);
  if (since > 2.6 && OFF.camShot !== SHOTS.top) setShot(SHOTS.top, 0.45);
  if (Math.floor(since) > END.lastTick) { END.lastTick = Math.floor(since); SFX.tick(); }
  if (since > 7.0 && !END.finalShown) { END.finalShown = true; $('endFinal').classList.add('show'); }
}

// 結局的鏡頭都在後方走道，走來走去的同事會擋到：先請他們停下來，站到旁邊
function parkMovers() {
  for (const p of OFF.people) {
    if (p.kind !== 'walk') continue;
    const boss = p.path.some(([, z]) => z < -4.8);
    p.c.root.position.set(boss ? 3.05 : 2.2, 0, boss ? -4.55 : 8.25);
    p.c.root.rotation.y = boss ? -Math.PI / 2 : Math.PI * 0.8;
    p.kind = 'wait'; p.ph = Math.random() * 3;
  }
}

/* ---------- 開始結局 ---------- */
function startEnding() {
  if (END.phase) return;
  $('complete').classList.remove('show', 'printing');
  show.mode = 'ending';
  document.body.classList.add('ending');
  office.flash.classList.add('on');
  woosh(0.9, 1400, 300);
  setTimeout(() => {
    // 切回辦公室：還停在靈魂出竅時的樣子（身體趴在桌上），先是黑白的
    office.active = true;
    office.el.classList.remove('gone', 'soul', 'exit');
    document.body.classList.add('office-on');
    renderer.domElement.style.transition = 'none';
    renderer.domElement.style.filter = 'grayscale(1)';
    officeScene.add(OFF.soulModel); officeScene.add(OFF.tail.mesh);
    OFF.tail.mesh.visible = false;
    OFF.soulT0 = null;                       // 讓 office.js 不再控制靈魂，這裡接手
    OFF.state = 'soul'; OFF.frozen = false; OFF.camShot = null;
    $('walkHint').textContent = '';
    buildProps(); parkMovers();
    END.phase = 'descend'; END.t0 = show.clock;
    END.from.copy(SOUL_HOVER).add(V(0, 1.6, 0));
    office.flash.classList.remove('on');
    skipBtn.classList.add('show');
  }, 550);
}

const _head = V(0, 0, 0), _p = V(0, 0, 0);

// main.js 的主迴圈在 officeTick 之後呼叫，所以這裡設定的姿勢會蓋過 office.js
function endingTick(t) {
  if (!END.phase) return;
  const me = OFF.me, since = t - END.t0;
  if (P.second) P.second.rotation.z = -Math.floor(t) * (Math.PI / 30);   // 秒針一格一格走
  windTick(t);

  if (END.phase === 'descend') {
    // 靈魂從上面飄下來，鑽回頭頂
    const k = Math.min(since / 2.2, 1), e = ease(k), s = OFF.soulModel, G = OFF.headGlow;
    me.head.getWorldPosition(_head); _head.y += 0.3;
    _p.copy(END.from).lerp(_head, e); _p.y += Math.sin(t * 1.7) * 0.05 * (1 - e);
    s.visible = true; s.position.copy(_p);
    s.scale.setScalar(lerp(1, 0.12, e)); s.rotation.y = 0;
    soulPose(s, t, 0, -1); soulOpacity(s, 1 - e * 0.7); soulGlow(s, e * 2.2);
    G.visible = true; G.position.copy(_head); G.scale.setScalar(0.4 + e * 0.8); G.material.opacity = e;
    OFF.soulLight.position.copy(_p); OFF.soulLight.intensity = 6;
    if (k >= 1) { s.visible = false; OFF.soulLight.intensity = 0; woosh(0.5, 1800, 500); END.phase = 'wake'; END.t0 = t; }
  } else if (END.phase === 'wake') {
    // 身體慢慢坐直，頭頂的光散開
    const k = Math.min(since / 0.9, 1), e = ease(k), G = OFF.headGlow;
    G.scale.setScalar(1.2 + e * 2.5); G.material.opacity = 1 - e;
    me.torso.rotation.x = lerp(0.72, 0.08, e);
    me.head.rotation.set(lerp(0.45, 0.1, e), 0, lerp(0.25, 0, e));
    if (k >= 1) {
      G.visible = false;
      sitDown();                              // 回到第一人稱，看著自己的螢幕
      renderer.domElement.style.transition = 'filter 1.8s ease';   // 顏色從中間暈開恢復
      requestAnimationFrame(() => { renderer.domElement.style.filter = 'grayscale(0)'; });
      const r = $('endRipple'); r.classList.remove('go'); void r.offsetWidth; r.classList.add('go');
      END.phase = 'look'; END.t0 = t;
    }
  } else if (END.phase === 'look') {
    if (since > 1.4 && !END.saidCoffee) { END.saidCoffee = true; line('先去倒杯咖啡吧。', 3.2); }
    if (since > 4.2) {
      renderer.domElement.style.filter = '';
      standUp(true);
      END.phase = 'seq'; END.i = -1; nextStep(t);
    }
  } else if (END.phase === 'seq') {
    stepTick(t);
    if (END.holding && OFF.state === 'walk' && !OFF.frozen) holdPose();
    if (P.cup.visible && P.fill.visible) steamAt(P.cup, t, 1);   // 熱氣跟著杯子走
  } else if (END.phase === 'rest') {
    restTick(t);
  }
}

// 窗戶開了以後：窗簾被風吹、窗外的雲飄、天空變亮
function windTick(t) {
  if (!P.built) return;
  const w = END.wind;
  for (const { top, s } of P.curtains) {
    top.rotation.x = -w * (0.18 + Math.sin(t * 1.7 + s) * 0.12);
    top.rotation.z = s * w * Math.sin(t * 1.3) * 0.05;
  }
  if (w > 0) {
    if (P.glass[0]) P.glass[0].map.offset.x = (P.glass[0].map.offset.x + 0.0003) % 1;
    P.outside.offset.x = (P.outside.offset.x + 0.00015 * (1 + END.sky * 2)) % 1;   // 雲慢慢飄
  }
  for (const m of P.glass) m.emissiveIntensity = 0.8 + END.sky * 0.15;   // 只亮一點，雲才看得到
  if (P.centerGlass && P.centerGlass.material.map === P.outside) P.centerGlass.material.emissiveIntensity = 0.75 + END.sky * 0.2;
  if (P.winLight) P.winLight.intensity = 12 + END.sky * 6;
}

// 略過：直接坐回座位、貼好便利貼，進到休息與結尾字句
skipBtn.addEventListener('click', () => {
  if (!END.phase || END.phase === 'rest' || END.phase === 'descend' || END.phase === 'wake') return;
  actBtn.classList.remove('show'); END.waiting = false;
  if (!P.built) buildProps();
  if (OFF.state === 'walk') { OFF.path = []; }
  if (OFF.state !== 'seated') sitDown();
  if (P.cup.parent !== officeScene) officeScene.attach(P.cup);
  P.cup.visible = true; P.fill.visible = true; P.fill.position.y = 0.105;
  P.cup.position.copy(CUP_DESK); P.cup.rotation.set(0, 0, 0); END.holding = false;
  if (!END.noted) { END.noted = true; drawStickyNote(); }
  renderer.domElement.style.filter = '';
  END.step = null;
  skipBtn.classList.remove('show');
  startRest(show.clock);
});

// 再寄放一次：重新載入，從第一幕的辦公室重新開始（功德數會保留在瀏覽器裡）
$('endAgain').addEventListener('click', () => location.reload());
$('toOffice').addEventListener('click', startEnding);

// 測試用捷徑：網址加 ?ending 會跳過前面，載入完直接進結局
if (new URLSearchParams(location.search).has('ending')) {
  const wait = setInterval(() => { if (window.__ready && OFF.me) { clearInterval(wait); setTimeout(startEnding, 800); } }, 200);
}

export { endingTick };
