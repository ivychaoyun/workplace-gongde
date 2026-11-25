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
  goTo, holdInHand, sitDown, soulGlow, soulOpacity, soulPose, standUp, woosh,
} from './office.js';

const $ = (id) => document.getElementById(id);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ease = (k) => 1 - (1 - k) ** 3;
const lerp = THREE.MathUtils.lerp;

const END = { phase: null, t0: 0, from: V(0, 0, 0), i: -1, step: null, waiting: false, pressedAt: null, holding: false, wind: 0, sky: 0 };
window.__ending = { END, OFF, ocam };   // 除錯用：在瀏覽器主控台看結局的狀態

/* ---------- 位置 ---------- */
const COFFEE = { x: -1.0, z: -5.35, face: Math.PI };   // 站在咖啡機前，面向後牆（頭很大，要留距離，杯子舉到嘴邊才不會撞到機器）
const WIN = { x: 0, z: -5.4, face: Math.PI };         // 站在中間那扇窗前（退半步，窗扇推開才不會碰到）
const CUP_TRAY = V(-1.0, 0.966, OBACK + 0.02 + 0.5);    // 咖啡機出水口下面（滴水盤上），在機身前面
const CUP_DESK = V(0.42, 0.81, 3.72);                  // 自己桌上、鍵盤右邊

/* ---------- 鏡頭：shot(鏡頭位置, 看的位置) ---------- */
const shot = (p, t, fov = 55) => ({ pos: V(...p), tgt: V(...t), fov });   // fov：特寫用窄一點（42），其他用 55
const SHOTS = {
  wideAisle: shot([3.4, 5.0, 3.0], [-0.6, 0.6, -3.2]),     // 遠景：辦公室側上方看走道
  coffeeMed: shot([-0.15, 1.55, -6.15], [-1.0, 1.05, -5.0]), // 中景：咖啡機旁看主角走過來
  cupClose: shot([-0.15, 1.5, -5.6], [-0.95, 1.05, -6.15], 42),   // 特寫：手和杯子
  pourClose: shot([-0.4, 1.25, -5.72], [-1.0, 1.06, -6.12], 42), // 特寫：咖啡流進杯子
  sipSide: shot([0.75, 1.5, -5.75], [-1.0, 1.35, -5.55]),   // 中景：從右側看主角用右手喝咖啡
  winBack: shot([0.3, 1.85, -3.4], [0, 1.9, -6.4]),         // 背影：看得到整扇窗
  winSide: shot([2.0, 1.9, -5.0], [0, 1.75, -6.0]),         // 中景：側面看主角推開窗
  face: shot([0.1, 1.5, -6.35], [0, 1.45, -5.4], 50),      // 特寫：從兩片窗扇中間看主角的臉
  over1: shot([0.55, 1.95, -4.4], [0, 2.1, -6.5]),          // 過肩看窗外
  over2: shot([0.45, 2.0, -4.6], [0, 2.1, -6.5]),           // 慢慢推近窗外
  outWin: shot([0.3, 2.05, -7.8], [0.8, -14, -40], 60),     // 剛飛出窗外：往下看公園、河和城市
  outFar: shot([1.2, 4.5, -13], [4, -4, -90], 60),          // 再往外飄一點：天際線、遠山、整片天空
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
  mesh(rbox(0.36, 0.05, 0.22, 0.02), body, officeScene, -1.0, 1.31, zWall + 0.46);   // 上面的出水頭，往前伸出機身
  mesh(cyl(0.02, 0.016, 0.05, 10), mat('#8d9290', { metalness: 0.6 }), officeScene, -1.0, 1.26, zWall + 0.5);
  mesh(rbox(0.22, 0.02, 0.2, 0.01), mat('#8d9290', { metalness: 0.5 }), officeScene, -1.0, 0.955, zWall + 0.48);  // 滴水盤，往前伸出機身
  P.light = mesh(sphere(0.018, 10, 8), new THREE.MeshStandardMaterial({ color: '#552', emissive: '#ffb347', emissiveIntensity: 0 }), officeScene, -0.88, 1.24, zWall + 0.375);
  const sg = new THREE.CylinderGeometry(0.008, 0.008, 1, 8); sg.translate(0, -0.5, 0);   // 從上端往下長
  P.stream = mesh(sg, mat('#5a3420', { roughness: 0.3 }), officeScene, -1.0, 1.235, zWall + 0.5);
  P.stream.visible = false;
  // 架上的杯子
  for (const x of [-1.3, -1.2]) mesh(cyl(0.04, 0.034, 0.09, 12), mat('#f4f2ec'), officeScene, x, 0.99, zWall + 0.2);

  // 我的馬克杯（裡面有咖啡，會慢慢變滿）
  P.cup = glassCup(); P.cup.visible = false; officeScene.add(P.cup);

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

// 玻璃杯：高 0.12、杯口半徑 0.05；杯底原點在 0。P.fill 是裡面的咖啡（scale.y 就是咖啡高度）
const CUP_H = 0.12, CUP_R = 0.05;
function glassCup() {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: '#eef6fb', transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const wall = mesh(new THREE.CylinderGeometry(CUP_R, CUP_R * 0.86, CUP_H, 24, 1, true), glass, g, 0, CUP_H / 2, 0);
  wall.renderOrder = 2; wall.castShadow = false;
  const base = mesh(new THREE.CylinderGeometry(CUP_R * 0.86, CUP_R * 0.86, 0.012, 24), glass, g, 0, 0.006, 0);
  base.renderOrder = 2;
  // 杯口一圈，看得出是杯子
  const rim = mesh(new THREE.TorusGeometry(CUP_R, 0.003, 6, 32), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.6 }), g, 0, CUP_H, 0);
  rim.rotation.x = Math.PI / 2;
  const fg = new THREE.CylinderGeometry(CUP_R * 0.92, CUP_R * 0.8, 1, 24); fg.translate(0, 0.5, 0);
  P.fill = mesh(fg, new THREE.MeshStandardMaterial({ color: '#5a3420', roughness: 0.25 }), g, 0, 0.012, 0);
  P.fill.renderOrder = 1; P.fill.visible = false;
  return g;
}
const setFill = (h) => { P.fill.visible = h > 0.002; P.fill.scale.y = Math.max(h, 0.001); };   // h：咖啡高度（0 ~ 0.1）
const fillTop = () => P.cup.position.y + 0.012 + P.fill.scale.y;   // 咖啡液面的世界高度（杯子放在滴水盤上時）

/* ---------- 窗外：後牆外面的城市、公園、遠山、天空 ----------
   辦公室後牆在 z = OBACK（-6.5），外面往 -z 延伸。地面在比辦公室低很多的地方，看起來像在高樓上往外看。 */
const OUT = { clouds: [], birds: [] };
function buildOutside() {
  if (OUT.built) return; OUT.built = true;
  ocam.far = 450; ocam.updateProjectionMatrix();   // 辦公室鏡頭原本只看到 80 公尺，看不到天空和遠山
  const G = -32;                                   // 地面高度：很低，像在高樓往外看
  const rnd = (a, b) => a + Math.random() * (b - a);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, ...o });
  // 天空：包住整個場景的大球，上深藍、地平線淡藍
  const skyTex = canvasTex(64, 512, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#2a6fc9'); gr.addColorStop(0.42, '#62aee9'); gr.addColorStop(0.5, '#cfeafa'); gr.addColorStop(0.56, '#e9f5ee'); gr.addColorStop(1, '#cfe6d6');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(140, 32, 16), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, toneMapped: false, depthWrite: false }));
  sky.position.set(0, 0, -40); sky.renderOrder = -10; officeScene.add(sky);
  // 太陽與光暈
  const sun = mesh(new THREE.SphereGeometry(4, 24, 16), new THREE.MeshBasicMaterial({ color: '#fff6d8', toneMapped: false }), officeScene, 34, 30, -110);
  sun.castShadow = false;
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,248,220,.9)'); gr.addColorStop(0.3, 'rgba(255,236,180,.35)'); gr.addColorStop(1, 'rgba(255,236,180,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  }), transparent: true, depthWrite: false, toneMapped: false }));
  halo.position.copy(sun.position); halo.scale.set(46, 46, 1); officeScene.add(halo);
  // 地面、河、公園
  const ground = mesh(new THREE.PlaneGeometry(320, 220), std('#7cc168'), officeScene, 0, G, -100); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
  const river = mesh(new THREE.PlaneGeometry(320, 7), std('#4aa8e8', { roughness: 0.15, metalness: 0.2 }), officeScene, 0, G + 0.05, -34); river.rotation.x = -Math.PI / 2;
  const path = mesh(new THREE.PlaneGeometry(320, 1.4), std('#efe2c4'), officeScene, 0, G + 0.06, -28); path.rotation.x = -Math.PI / 2;
  // 遠山（越遠越淡）
  for (const [x, z, sx, sy, c] of [[-60, -170, 70, 26, '#9cc6b6'], [10, -185, 90, 34, '#a8cfc4'], [80, -170, 70, 24, '#9cc6b6'], [-20, -150, 50, 16, '#8dbca6'], [50, -150, 46, 14, '#8dbca6']]) {
    const h = mesh(new THREE.SphereGeometry(1, 32, 16), std(c), officeScene, x, G, z); h.scale.set(sx, sy, 30); h.castShadow = false;
  }
  // 窗戶貼圖（大樓共用）
  const winTex = canvasTex(64, 128, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(70,120,170,.55)';
    for (let y = 8; y < h - 6; y += 16) for (let x = 6; x < w - 6; x += 14) g.fillRect(x, y, 8, 10);
  });
  winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
  // 城市：河對岸一排高樓，近一點的低一些；中間留一條視線看到遠山
  const pal = ['#f3d9b8', '#d6e6f5', '#b8d4ee', '#f7e8d6', '#a8c8e6', '#e8c9a8', '#cfe3d4'];
  for (let i = 0; i < 70; i++) {
    const x = rnd(-90, 90), z = rnd(-48, -120);
    if (Math.abs(x - 3) < 9 && z > -80) continue;    // 正前方留空，看得到遠方
    const w = rnd(5, 10), d = rnd(5, 10), h = rnd(8, 30) * (z < -80 ? 1.3 : 1);   // 大多比視線低，看得到屋頂和天際線
    const haze = Math.min(1, (-z - 48) / 90);
    const col = new THREE.Color(pal[i % pal.length]).lerp(new THREE.Color('#d4e8f4'), haze * 0.55);
    const t = winTex.clone(); t.needsUpdate = true; t.repeat.set(Math.round(w / 2.5), Math.round(h / 3));
    const b = mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: col, map: t, roughness: 0.7 }), officeScene, x, G + h / 2, z);
    b.castShadow = false;
    if (i % 4 === 0) mesh(new THREE.BoxGeometry(w * 0.6, 1.2, d * 0.6), std('#9fb1bf'), officeScene, x, G + h + 0.6, z).castShadow = false;
  }
  // 公園的樹（河的這一側）
  const leaf = [std('#4f9a4a'), std('#62ad55'), std('#77bf62')], trunk = std('#8a6a4a');
  for (let i = 0; i < 90; i++) {
    const x = rnd(-70, 70), z = rnd(-12, -31), sc = rnd(2.2, 3.6);
    const g = new THREE.Group(); g.position.set(x, G, z); g.scale.setScalar(sc); officeScene.add(g);
    mesh(cyl(0.18, 0.24, 1.6, 8), trunk, g, 0, 0.8, 0);
    for (let j = 0; j < 3; j++) mesh(new THREE.SphereGeometry(rnd(0.9, 1.3), 12, 10), leaf[(i + j) % 3], g, rnd(-0.5, 0.5), 2.1 + j * 0.5, rnd(-0.5, 0.5));
  }
  // 雲：一團一團的白球，慢慢往右飄
  const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.55, roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const g = new THREE.Group(); g.position.set(rnd(-90, 90), rnd(14, 34), rnd(-60, -130)); officeScene.add(g);
    for (let j = 0; j < 6; j++) { const c = mesh(new THREE.SphereGeometry(rnd(2.5, 4.5), 16, 12), cloudMat, g, j * 3 - 7, rnd(-0.8, 1.4), rnd(-1.5, 1.5)); c.scale.y = 0.7; c.castShadow = false; }
    OUT.clouds.push({ g, speed: rnd(0.4, 0.9) });
  }
  // 鳥：小小的 V 字，拍著翅膀飛過
  const birdMat = new THREE.MeshBasicMaterial({ color: '#3a4150' });
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Group(); officeScene.add(g);
    const L = new THREE.Group(), R = new THREE.Group(); g.add(L, R);
    mesh(new THREE.BoxGeometry(0.5, 0.04, 0.12), birdMat, L, -0.25, 0, 0); mesh(new THREE.BoxGeometry(0.5, 0.04, 0.12), birdMat, R, 0.25, 0, 0);
    OUT.birds.push({ g, L, R, x0: -30 - i * 3, y: 4 + i * 0.8 + Math.random(), z: -18 - i * 1.5, ph: i * 0.7 });
  }
}
function outsideTick(t, dt) {
  if (!OUT.built) return;
  for (const c of OUT.clouds) { c.g.position.x += c.speed * dt; if (c.g.position.x > 110) c.g.position.x = -110; }
  for (const b of OUT.birds) {
    b.g.position.set(b.x0 + ((t * 3.2) % 70), b.y + Math.sin(t * 1.3 + b.ph) * 0.6, b.z);
    const f = Math.sin(t * 9 + b.ph) * 0.6; b.L.rotation.z = f; b.R.rotation.z = -f;
  }
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
  { kind: 'act', label: '看看外面', shot: SHOTS.over1, dur: 8.0, run: lookOut, start: () => { SFX.wind(8, 0.07); SFX.birds(); setTimeout(SFX.birds, 4000); } },
  { kind: 'wait', dur: 5.0 },   // 在窗外多待一下，看著字句
  // 回座位
  { kind: 'walk', to: { x: SEAT_STAND.x, z: SEAT_STAND.z, face: Math.PI }, shots: [[0, SHOTS.frontWide, 60]], near: [1.6, SHOTS.seatMed] },
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
    setShot(s.shots[0][1], s.shots[0][2]);   // 第三個數字是鏡頭速度，很大就是直接切過去
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
  if (END.holding) { me.arms[0].rotation.set(-1.35, 0, 0.35); P.cup.position.set(0, -0.37, 0.07); keepUpright(0); }   // 右手拿著咖啡，杯口朝上
}
// 喝的時候把杯子移到嘴巴前面：角色的頭很大、手很短，光靠舉手會把杯子塞進頭裡
const _mouth = new THREE.Vector3(), _hand = new THREE.Vector3();
function cupToMouth(u, tilt) {
  const me = OFF.me, arm = P.cup.parent; if (!arm || arm === officeScene) return;
  me.root.updateMatrixWorld(true);
  me.root.localToWorld(_mouth.set(0.05, 1.03, 0.55));   // 角色前方（+z 是臉朝的方向）、下巴高度
  arm.localToWorld(_hand.set(0, -0.37, 0.07));
  _hand.lerp(_mouth, u);
  P.cup.position.copy(arm.worldToLocal(_hand));
  keepUpright(tilt);
}
// 杯子黏在手上會跟著手臂轉；每一格把它轉回來，讓杯口朝上。tilt：喝的時候往嘴巴方向傾斜（弧度）
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _xAxis = new THREE.Vector3(1, 0, 0);
function keepUpright(tilt) {
  const arm = P.cup.parent; if (!arm || arm === officeScene) return;
  OFF.me.root.updateMatrixWorld(true);
  arm.getWorldQuaternion(_qa); OFF.me.root.getWorldQuaternion(_qb);
  _qt.setFromAxisAngle(_xAxis, -tilt);
  P.cup.quaternion.copy(_qa.invert()).multiply(_qb).multiply(_qt);
}

/* ---------- 每個動作 ---------- */
function grabCup(k) {
  const me = OFF.me;
  const reach = k < 0.5 ? ease(k * 2) : 1 - ease((k - 0.5) * 2);
  me.arms[0].rotation.set(lerp(0, -1.5, reach), 0, lerp(0.12, -0.25, reach));   // 右手伸去拿杯子
  if (k > 0.45 && !P.cup.visible) {
    P.cup.position.copy(CUP_TRAY); P.cup.visible = true; setFill(0); SFX.cup();
  }
}
function brew(k, sec, t) {
  P.light.material.emissiveIntensity = k < 1 ? 2.2 : 0;
  setFill(lerp(0, 0.095, Math.min(1, Math.max(0, (k - 0.12) / 0.74))));
  P.stream.visible = k > 0.08 && k < 0.88;
  P.stream.scale.set(1 + Math.sin(t * 30) * 0.15, 1.235 - fillTop(), 1 + Math.sin(t * 30) * 0.15);   // 接到液面
  steamAt(P.cup, t, k > 0.3 ? 1 : 0);
}
function sip(k, sec, t) {
  const me = OFF.me;
  if (!END.holding) {
    // 從咖啡機下面拿起來
    holdInHand(me, 0, P.cup); P.cup.position.set(0, -0.37, 0.07); END.holding = true;   // 右手
    P.light.material.emissiveIntensity = 0;
  }
  const up = k < 0.75 ? ease(Math.min(k / 0.4, 1)) : 1 - ease((k - 0.75) / 0.25) * 0.6;
  me.arms[0].rotation.set(lerp(-1.35, -1.85, up), 0, lerp(0.35, 0.2, up));
  cupToMouth(up, up * 0.75);   // 杯子移到嘴巴前面、往嘴巴傾斜
  me.head.rotation.set(lerp(0, -0.2, up), 0, 0);
  // 喝完肩膀放鬆一下
  me.torso.rotation.set(k > 0.7 ? -0.05 * Math.sin((k - 0.7) / 0.3 * Math.PI) : 0, 0, 0);
  steamAt(P.cup, t, 1);
}
function openWindow(k) {
  const me = OFF.me, push = k < 0.5 ? ease(k * 2) : 1 - ease((k - 0.5) * 2) * 0.7;
  me.arms[1].rotation.set(lerp(0, -1.55, push), 0, -0.12);   // 左手推開窗
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
  me.arms[1].rotation.set(0, 0, -0.12 - 0.2 * b);
  holdPose();
}
function lookOut(k) {
  const me = OFF.me;
  me.torso.scale.set(1, 1, 1); me.torso.rotation.set(0, 0, 0);
  me.head.rotation.set(-0.08, 0, 0);
  holdPose();
  // 越過肩膀推近窗戶 → 穿出窗外 → 在外面慢慢往遠處飄
  if (k > 0.03 && k < 0.22 && OFF.camShot !== SHOTS.over2) setShot(SHOTS.over2, 1.1);
  if (k >= 0.22 && k < 0.55 && OFF.camShot !== SHOTS.outWin) setShot(SHOTS.outWin, 0.9);
  if (k >= 0.55 && OFF.camShot !== SHOTS.outFar) {
    setShot(SHOTS.outFar, 0.28);
    line('與自己和解，把喧囂留在身後；\n天還很大，事情沒有那麼大。', 8.2);   // 飄出去時浮出字句
  }
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
    if (p.kind === 'drink') { p.c.root.visible = false; continue; }   // 咖啡機旁喝水的同事：結局時不在
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
    buildProps(); buildOutside(); parkMovers();
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
  outsideTick(t, Math.min(0.05, t - (END.lastT || t))); END.lastT = t;
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
  P.cup.visible = true; setFill(0.095);
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
