// 辦公室：場景、走路、同事、鏡頭、靈魂出竅、唱完飛進小和尚。
// 主要負責：欣亞（cynthia）
import * as THREE from 'three';
import { askForm, bubble, q, sendBtn, show } from './ui.js';
import { camera, canvasTex, controls, cyl, lathe, limb, mat, mesh, rbox, renderer, rnd, scene, sphere, sun, t0 } from './core.js';
import { H } from './temple-scene.js';
import { chibi } from './characters.js';
import { easeOut, kneelDown, monk, typing } from './temple.js';
import { SPB, audio, beatPos, ensureAudio, noise, sing, stopBeat, tone, voice } from './audio.js';

/* ---------- 辦公室場景（3D，前段） ---------- */
const officeScene = new THREE.Scene();
officeScene.background = new THREE.Color('#dfe7dc');
officeScene.environment = scene.environment;
officeScene.environmentIntensity = 0.35;
const ocam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 80);
const OFF = { people: [], me: null, screen: null, state: 'seated', look: new THREE.Vector3(), keys: new Set(), path: [], talk: null };
const OW = 8.4, OBACK = -6.5, OFRONT = 13.6, OH = 6.0;  // 房間：寬 8.4、後牆 z=-6.5、前牆在鏡頭後面
const WALK_FRONT = 9.7;                                  // 矮櫃隔斷，走路走到這裡為止
const ME_POS = new THREE.Vector3(0, 0, 4.2);            // 你的座位
function layoutOffice() {
  const a = innerWidth / innerHeight, portrait = a < 0.8;
  ocam.aspect = a; ocam.updateProjectionMatrix();
  OFF.portrait = portrait;
}
layoutOffice();
addEventListener('resize', layoutOffice);

function tintIn(root) {
  root.traverse(o => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      if (!m || !m.isMeshStandardMaterial || m.userData.tinted) continue;
      m.userData.tinted = true;
      m.onBeforeCompile = sh => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          {
            vec3 base = max(diffuseColor.rgb, vec3(0.002));
            float lum = dot(base, vec3(0.299, 0.587, 0.114));
            vec3 hue = clamp(base / max(lum, 0.002), 0.0, 2.6);
            reflectedLight.indirectDiffuse *= mix(vec3(1.0), hue, 0.28);
          }`);
      };
      m.customProgramCacheKey = () => 'tintShadows';
      m.needsUpdate = true;
    }
  });
}

// 一般電腦螢幕：試算表＋程式碼，跟參考圖一樣
function workScreenTex(hue = 130) {
  return canvasTex(512, 320, (g, w, h) => {
    g.fillStyle = `hsl(${hue}, 40%, 90%)`; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f9fbf9'; g.fillRect(14, 30, w - 28, h - 44);
    g.fillStyle = `hsl(${hue}, 30%, 80%)`; g.fillRect(14, 30, w - 28, 22);
    ['#e86f5c', '#f2b84b', '#7cc47f', '#5aa0e0', '#b07ad8'].forEach((c, i) => { g.fillStyle = c; g.fillRect(28 + i * 26, 36, 16, 10); });
    g.strokeStyle = '#c9d6cf'; g.lineWidth = 2;
    for (let y = 80; y < 290; y += 24) { g.beginPath(); g.moveTo(30, y); g.lineTo(250, y); g.stroke(); }
    for (let x = 30; x <= 250; x += 55) { g.beginPath(); g.moveTo(x, 80); g.lineTo(x, 296); g.stroke(); }
    g.fillStyle = '#2e3a46'; g.fillRect(270, 90, 220, 190);
    const cs = ['#f2b84b', '#7cc47f', '#5aa0e0', '#e86f5c', '#d6dde3'];
    for (let i = 0; i < 9; i++) { g.fillStyle = cs[i % cs.length]; g.fillRect(284 + (i % 3) * 10, 104 + i * 19, 50 + ((i * 37) % 110), 7); }
  });
}
// 你的螢幕：貓咪梗圖當桌布，三張輪播；開始打字之後，下面的字幕換成你打的字
const DESK_CATS = [
  { src: 'assets/office/cats/cat1.jpg', cap: '誰欺負你了 跟我說說', crop: 0.22 },
  { src: 'assets/office/cats/cat2.webp', cap: '太累了吧 ～～～', crop: 0.19 },
  { src: 'assets/office/cats/cat3.jpg', cap: '今天是怎樣啊 眼神死', crop: 0.19 },
];
let deskIdx = Math.floor(Math.random() * DESK_CATS.length), deskText = '';
for (const c of DESK_CATS) { const im = new Image(); im.onload = () => { c.img = im; drawPlayerScreen(deskText); }; im.src = c.src; }
// 沒在打字的時候，桌布每 6 秒換一張
setInterval(() => {
  if (!office.active || deskText || show.mode !== 'idle') return;
  deskIdx = (deskIdx + 1) % DESK_CATS.length; drawPlayerScreen('');
}, 6000);
// 梗圖字幕：白字黑框，從底部往上排
function deskCaption(g, w, h, msg) {
  if (!msg) return;
  g.font = '900 34px "Noto Sans TC", sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.miterLimit = 2;
  const lines = []; let cur = '';
  for (const ch of msg) {
    if (ch === '\n') { lines.push(cur); cur = ''; continue; }
    if (g.measureText(cur + ch).width > w - 48) { lines.push(cur); cur = ch; } else cur += ch;
  }
  lines.push(cur);
  const use = lines.slice(-3), base = h - 20 - (use.length - 1) * 40;
  use.forEach((l, i) => {
    const y = base + i * 40;
    g.strokeStyle = '#121212'; g.lineWidth = 9; g.strokeText(l, w / 2, y);
    g.fillStyle = '#fff'; g.fillText(l, w / 2, y);
  });
  g.textAlign = 'left';
}
function drawPlayerScreen(text) {
  const s = OFF.screen; if (!s) return;
  deskText = text || '';
  const g = s.g, w = 512, h = 320, c = DESK_CATS[deskIdx];
  g.fillStyle = '#1b1f24'; g.fillRect(0, 0, w, h);
  if (c.img) {
    const sw = c.img.width, sh = Math.round(c.img.height * (1 - c.crop));
    const k = Math.max(w / sw, h / sh), dw = sw * k, dh = sh * k;
    g.drawImage(c.img, 0, 0, sw, sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }
  const grd = g.createLinearGradient(0, h * 0.5, 0, h);
  grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(1, 'rgba(0,0,0,.5)');
  g.fillStyle = grd; g.fillRect(0, h * 0.5, w, h * 0.5);
  deskCaption(g, w, h, deskText || c.cap);
  s.tex.needsUpdate = true;
}

// 一個座位：人坐在原點、面向 +z，桌子在前面
function workstation({ mine = false, hue = 130, chairColor = '#4e6fa6' } = {}) {
  const g = new THREE.Group();
  const wood = mat('#d8b98d', { roughness: 0.6 }), panel = mat('#c9ccca'), dark = mat('#2a2c31', { roughness: 0.45 });
  mesh(rbox(1.5, 0.06, 0.8, 0.02), wood, g, 0, 0.75, 0.62);
  for (const s of [-1, 1]) mesh(rbox(0.05, 0.72, 0.74, 0.02), panel, g, s * 0.72, 0.36, 0.62);
  mesh(rbox(1.4, 0.42, 0.04, 0.02), panel, g, 0, 0.48, 0.99);
  mesh(rbox(0.4, 0.6, 0.62, 0.03), mat('#b9bdbb'), g, 0.48, 0.31, 0.66);
  for (const y of [0.18, 0.4]) mesh(rbox(0.36, 0.01, 0.02, 0.004), mat('#8d9290'), g, 0.48, y, 0.35);
  // 螢幕
  mesh(rbox(0.32, 0.03, 0.2, 0.01), dark, g, 0, 0.795, 0.82);
  mesh(rbox(0.06, 0.24, 0.04, 0.01), dark, g, 0, 0.92, 0.84);
  mesh(rbox(0.88, 0.58, 0.05, 0.03), dark, g, 0, 1.28, 0.84);
  let tex;
  if (mine) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 320;
    tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    OFF.screen = { g: c.getContext('2d'), tex };
  } else tex = workScreenTex(hue);
  const scr = mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshStandardMaterial({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.55, roughness: 0.4 }), g, 0, 1.28, 0.81);
  scr.rotation.y = Math.PI; scr.castShadow = false;
  if (mine) OFF.screenMesh = scr;
  // 鍵盤、滑鼠
  mesh(rbox(0.56, 0.03, 0.18, 0.012), dark, g, 0, 0.795, 0.4);
  mesh(rbox(0.07, 0.03, 0.11, 0.03), dark, g, 0.4, 0.795, 0.42);
  // 椅子（藍色）
  const blue = mat(chairColor, { roughness: 0.7 }), metal = mat('#3a3d44', { roughness: 0.4, metalness: 0.3 });
  const seat = mesh(rbox(0.54, 0.09, 0.5, 0.04), blue, g, 0, 0.44, -0.04);
  const back = mesh(rbox(0.5, 0.56, 0.08, 0.04), blue, g, 0, 0.82, -0.3); back.rotation.x = -0.1;
  if (mine) OFF.mySeat = [seat, back];
  mesh(cyl(0.035, 0.035, 0.34, 12), metal, g, 0, 0.24, -0.04);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, leg = mesh(rbox(0.05, 0.04, 0.3, 0.015), metal, g, Math.sin(a) * 0.15, 0.06, -0.04 + Math.cos(a) * 0.15);
    leg.rotation.y = a;
    mesh(sphere(0.035, 10, 8), metal, g, Math.sin(a) * 0.29, 0.035, -0.04 + Math.cos(a) * 0.29);
  }
  // 桌上小物
  if (!mine) {
    mesh(cyl(0.05, 0.045, 0.11, 16), mat(['#e7d6b8', '#9cc3df', '#f0a28f'][hue % 3]), g, -0.5, 0.835, 0.5);
    mesh(rbox(0.3, 0.05, 0.22, 0.01), mat('#f4f2ec'), g, -0.45, 0.805, 0.8);
  }
  return g;
}

function buildFpvArms() {
  const z = ME_POS.z, sleeve = mat('#6f8fc9', { roughness: 0.75 }), skin = mat('#f6d3ba', { roughness: 0.6 });
  const arms = [];
  for (const s of [-1, 1]) {
    const from = new THREE.Vector3(s * 0.36, 0.86, z + 0.38);   // 在鏡頭下方、畫面外
    const to = new THREE.Vector3(s * 0.15, 0.87, z - 0.36);     // 鍵盤上
    const g = new THREE.Group(); g.position.copy(from);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), to.clone().sub(from).normalize());
    const L = from.distanceTo(to);
    mesh(new THREE.CapsuleGeometry(0.075, L - 0.1, 6, 14), sleeve, g, 0, -(L - 0.1) / 2, 0);
    mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.05, 16), mat('#f2f1ec'), g, 0, -(L - 0.07), 0);   // 袖口
    const hand = mesh(sphere(0.085, 16, 12), skin, g, 0, -L, 0); hand.scale.set(1.05, 0.85, 1.15);
    g.visible = false; officeScene.add(g);
    arms.push({ g, s, base: g.quaternion.clone() });
  }
  return arms;
}
function sit(c) {
  c.hips.position.y = 0.53;
  for (const l of c.legs) { l.rotation.x = -1.45; l.children[1].rotation.x = 1.45; l.children[1].position.set(0, -0.37, -0.05); }
}
function addTie(c, color) { mesh(rbox(0.08, 0.28, 0.035, 0.015), mat(color), c.torso, 0, 0.3, 0.285); }
function holdInHand(c, idx, obj) { obj.position.set(0, -0.37, 0.07); c.arms[idx].add(obj); return obj; }
function cupMesh(color, h = 0.13, r = 0.055) {
  const grp = new THREE.Group();
  mesh(cyl(r, r * 0.85, h, 16), mat(color), grp, 0, h / 2, 0);
  return grp;
}

function partition(x, z, len, alongX, ht = 1.2) {
  const fabric = mat('#959da0', { roughness: 0.95 }), trim = mat('#c4c8c5', { roughness: 0.5 });
  const w = alongX ? len : 0.07, d = alongX ? 0.07 : len;
  mesh(rbox(w, ht, d, 0.02), fabric, officeScene, x, ht / 2, z);
  mesh(rbox(alongX ? len + 0.02 : 0.1, 0.05, alongX ? 0.1 : len + 0.02, 0.02), trim, officeScene, x, ht + 0.01, z);
}

function buildOfficeRoom() {
  const hemi = new THREE.HemisphereLight('#fbf6ea', '#6f8f74', 1.05);
  officeScene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe9cc', 2.3);
  sun.position.set(5, 11, 12.5); sun.target.position.set(0, 0, 2.0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 12, bottom: -12, near: 1, far: 50 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
  officeScene.add(sun, sun.target);
  const winLight = new THREE.PointLight('#dff0ff', 12, 14, 2); winLight.position.set(0, 2.6, -5.2); officeScene.add(winLight);
  OFF.lights = { hemi, sun, winLight, base: { hemi: 1.05, sun: 2.3, win: 12 } };

  // 綠地毯
  const carpet = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#3c7a50'; g.fillRect(0, 0, w, w);
    for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '20,60,30'},${0.04 + rnd() * 0.05})`; g.fillRect(rnd() * w, rnd() * w, 2, 2); }
  });
  carpet.wrapS = carpet.wrapT = THREE.RepeatWrapping; carpet.repeat.set(6, 6);
  const floor = mesh(new THREE.PlaneGeometry(OW, OFRONT - OBACK), mat('#ffffff', { map: carpet, roughness: 1 }), officeScene, 0, 0, (OFRONT + OBACK) / 2);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;

  // 牆
  const wall = mat('#e9dfcc'), base = mat('#a07f5e');
  mesh(new THREE.BoxGeometry(OW + 0.4, OH, 0.2), wall, officeScene, 0, OH / 2, OBACK - 0.1);
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.2, OH, OFRONT - OBACK), wall, officeScene, s * (OW / 2 + 0.1), OH / 2, (OFRONT + OBACK) / 2);
    mesh(new THREE.BoxGeometry(0.06, 0.14, OFRONT - OBACK), base, officeScene, s * (OW / 2 - 0.03), 0.07, (OFRONT + OBACK) / 2);
  }
  mesh(new THREE.BoxGeometry(OW, 0.14, 0.06), base, officeScene, 0, 0.07, OBACK + 0.03);
  mesh(new THREE.BoxGeometry(OW + 0.4, OH, 0.2), wall, officeScene, 0, OH / 2, OFRONT + 0.1);
  // 天花板：從下面看得到，嵌燈是發光的方塊
  const ceil = mesh(new THREE.PlaneGeometry(OW + 0.4, OFRONT - OBACK), mat('#f3efe6'), officeScene, 0, OH, (OFRONT + OBACK) / 2);
  ceil.rotation.x = Math.PI / 2; ceil.castShadow = false;
  const lamp = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fffaf0', emissiveIntensity: 1.2 });
  for (const x of [-2.2, 2.2]) for (let z = -5; z < 13; z += 2.6) { const l = mesh(new THREE.PlaneGeometry(1.2, 0.6), lamp, officeScene, x, OH - 0.01, z); l.rotation.x = Math.PI / 2; l.castShadow = false; }
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.06, 0.22, OFRONT - OBACK), mat('#d9cfbd'), officeScene, s * (OW / 2 - 0.03), OH - 0.11, (OFRONT + OBACK) / 2);
  mesh(new THREE.BoxGeometry(OW, 0.22, 0.06), mat('#d9cfbd'), officeScene, 0, OH - 0.11, OBACK + 0.03);

  // 後牆的窗戶
  const sky = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#9fd0f2'); gr.addColorStop(1, '#e6f4fb');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.85)';
    for (const [x, y, r] of [[60, 70, 26], [90, 64, 32], [120, 72, 22], [190, 120, 20], [214, 114, 26]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#9cc79a'; g.fillRect(0, h * 0.82, w, h * 0.18);
  });
  for (const x of [-2.7, 0, 2.7]) {
    const glass = mesh(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshStandardMaterial({ map: sky, emissive: '#ffffff', emissiveMap: sky, emissiveIntensity: 0.8 }), officeScene, x, 2.05, OBACK + 0.02);
    glass.castShadow = false;
    const fr = mat('#f7f5ef');
    for (const [w, ht, dx, dy] of [[2.16, 0.08, 0, 0.74], [2.16, 0.1, 0, -0.75], [0.08, 1.5, -1.04, 0], [0.08, 1.5, 1.04, 0], [0.05, 1.4, 0, 0]])
      mesh(new THREE.BoxGeometry(w, ht, 0.08), fr, officeScene, x + dx, 2.05 + dy, OBACK + 0.05);
  }
  // 牆上：月曆、地圖海報、時鐘
  const cal = canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#7fb2d9'; g.fillRect(0, 0, w, 120);
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(128, 64, 60, 28, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#c9cdd2'; g.lineWidth = 2;
    for (let i = 0; i <= 7; i++) { g.beginPath(); g.moveTo(16 + i * 32, 140); g.lineTo(16 + i * 32, 300); g.stroke(); }
    for (let j = 0; j <= 5; j++) { g.beginPath(); g.moveTo(16, 140 + j * 32); g.lineTo(240, 140 + j * 32); g.stroke(); }
    g.fillStyle = '#e86f5c'; g.fillRect(180, 238, 26, 26);
  });
  const calM = mesh(new THREE.PlaneGeometry(0.7, 0.88), mat('#fff', { map: cal }), officeScene, OW / 2 - 0.01, 2.0, -1.4); calM.rotation.y = -Math.PI / 2;
  const map = canvasTex(320, 220, (g, w, h) => {
    g.fillStyle = '#e8f1f4'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9fd0c0';
    for (const [x, y, rx, ry] of [[90, 90, 60, 40], [200, 120, 70, 45], [150, 170, 40, 22], [260, 60, 30, 20]]) { g.beginPath(); g.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#5c8fb0'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
  });
  const mapM = mesh(new THREE.PlaneGeometry(1.3, 0.9), mat('#fff', { map }), officeScene, -OW / 2 + 0.01, 2.0, -4.2); mapM.rotation.y = Math.PI / 2;
  const clock = canvasTex(128, 128, (g, w) => {
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a3d44'; g.lineWidth = 7; g.stroke();
    g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64, 26); g.stroke();
    g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(96, 76); g.stroke();
  });
  mesh(new THREE.CircleGeometry(0.3, 32), mat('#fff', { map: clock }), officeScene, 0, 3.3, OBACK + 0.02);

  // 後方：飲水機、檔案櫃、書櫃、盆栽
  const cooler = new THREE.Group(); cooler.position.set(-1.9, 0, -6.05); officeScene.add(cooler);
  mesh(rbox(0.46, 1.0, 0.42, 0.05), mat('#f4f4f1'), cooler, 0, 0.5, 0);
  mesh(rbox(0.3, 0.12, 0.05, 0.02), mat('#5aa0e0'), cooler, 0, 0.82, 0.21);
  mesh(cyl(0.17, 0.17, 0.42, 24), mat('#8fc8ef', { transparent: true, opacity: 0.7, roughness: 0.2 }), cooler, 0, 1.24, 0);
  for (let i = 0; i < 3; i++) {
    const cab = new THREE.Group(); cab.position.set(1.9 + i * 0.75, 0, -6.15); officeScene.add(cab);
    mesh(rbox(0.7, 1.15, 0.6, 0.03), mat('#a9b0b4'), cab, 0, 0.575, 0);
    for (const y of [0.3, 0.65, 0.98]) mesh(rbox(0.28, 0.04, 0.03, 0.01), mat('#6e767b'), cab, 0, y, 0.31);
  }
  const shelf = new THREE.Group(); shelf.position.set(-3.25, 0, -6.15); officeScene.add(shelf);
  mesh(rbox(1.7, 1.6, 0.42, 0.03), mat('#c8a57c'), shelf, 0, 0.8, 0);
  const bcols = ['#5d7fc0', '#e86f5c', '#f2b84b', '#7cc47f', '#3d5a8c', '#b07ad8', '#e8a07a'];
  for (const y of [0.15, 0.68, 1.2]) {
    mesh(rbox(1.6, 0.04, 0.38, 0.01), mat('#a8865f'), shelf, 0, y, 0.03);
    let x = -0.7;
    while (x < 0.65) { const bw = 0.1 + rnd() * 0.06, bh = 0.32 + rnd() * 0.12; mesh(rbox(bw, bh, 0.3, 0.01), mat(bcols[Math.floor(rnd() * bcols.length)]), shelf, x + bw / 2, y + 0.02 + bh / 2, 0.05); x += bw + 0.01; }
  }
  for (const [x, z, s] of [[-3.75, -4.9, 1.0], [3.75, -4.9, 1.0], [-3.6, 5.2, 0.9], [3.6, 5.3, 0.9]]) {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(s); officeScene.add(p);
    mesh(cyl(0.24, 0.19, 0.42, 20), mat('#e7dccb'), p, 0, 0.21, 0);
    const leaf = mat('#5e9f5b', { roughness: 0.7 });
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; mesh(sphere(0.24, 14, 10), leaf, p, Math.sin(a) * 0.18, 0.75 + (i % 3) * 0.2, Math.cos(a) * 0.18); }
    mesh(sphere(0.26, 14, 10), leaf, p, 0, 1.25, 0);
  }
}

function buildDesks() {
  const P = OFF.people;
  // 左右兩排隔間，同事面向牆坐
  const rows = [
    { x: -2.3, rot: -Math.PI / 2, side: -1 },
    { x: 2.3, rot: Math.PI / 2, side: 1 },
  ];
  const looks = [
    { skin: '#f6d3ba', top: '#5d6066', sleeve: '#f2f1ec', pants: '#3a3f4a', hair: '#6b4430', bun: true, eyes: 'open' },   // 綁馬尾的女生，參考圖左邊
    { skin: '#f3cfb4', top: '#f1efe9', pants: '#6b4a34', hair: '#7a4a2c', eyes: 'open' },                                // 棕髮白襯衫，參考圖右邊
    { skin: '#f2cdb0', top: '#e8a07a', pants: '#3d4658', hair: '#2a201c', eyes: 'open' },
    { skin: '#f5d1b6', top: '#9fc4a8', pants: '#4a4a52', hair: '#3a2a24', bun: true, eyes: 'open' },
  ];
  let k = 0;
  for (const r of rows) for (const zc of [0.2, -3.0]) {
    const ws = workstation({ hue: 110 + k * 25 });
    ws.position.set(r.x, 0, zc); ws.rotation.y = r.rot; officeScene.add(ws);
    const c = chibi(looks[k]); sit(c); ws.add(c.root);
    P.push({ c, kind: 'type', ph: k * 1.7, stretchEvery: 9 + k * 2.3, lines: LINES.desk[k] });
    // 隔板：牆邊一片、兩側各一片
    partition(r.side * 3.55, zc, 3.0, false);
    partition(r.side * 2.65, zc + 1.5, 1.8, true);
    partition(r.side * 2.65, zc - 1.5, 1.8, true);
    k++;
  }
  // 你的座位：走道盡頭，面向後牆
  const mine = workstation({ mine: true });
  mine.position.copy(ME_POS); mine.rotation.y = Math.PI; officeScene.add(mine); OFF.mine = mine;
  partition(0, ME_POS.z - 1.08, 2.6, true);
  for (const s of [-1, 1]) partition(s * 1.3, ME_POS.z - 0.25, 1.65, false);
  // 你桌上的東西：綠馬克杯、多肉、電風扇、面紙、便利貼、藍色資料夾、筆記本、文件
  const D = new THREE.Group(); mine.add(D);
  const mug = cupMesh('#5e9f5b', 0.14, 0.06); mug.position.set(-0.5, 0.78, 0.38); D.add(mug);
  const handle = mesh(new THREE.TorusGeometry(0.035, 0.012, 8, 16), mat('#5e9f5b'), mug, 0.07, 0.07, 0); handle.rotation.y = Math.PI / 2;
  const pot = new THREE.Group(); pot.position.set(-0.6, 0.78, 0.7); D.add(pot);
  mesh(cyl(0.08, 0.065, 0.1, 16), mat('#c9744f'), pot, 0, 0.05, 0);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, l = mesh(new THREE.ConeGeometry(0.035, 0.12, 8), mat('#78b06a'), pot, Math.sin(a) * 0.04, 0.14, Math.cos(a) * 0.04); l.rotation.set(Math.cos(a) * 0.6, 0, -Math.sin(a) * 0.6); }
  const fan = new THREE.Group(); fan.position.set(0.58, 0.78, 0.72); fan.rotation.y = Math.PI * 0.85; D.add(fan);
  mesh(cyl(0.1, 0.11, 0.03, 20), mat('#efe6d2'), fan, 0, 0.015, 0);
  mesh(cyl(0.018, 0.018, 0.2, 10), mat('#efe6d2'), fan, 0, 0.12, 0);
  mesh(new THREE.TorusGeometry(0.13, 0.012, 8, 28), mat('#efe6d2'), fan, 0, 0.28, 0);
  OFF.fanBlades = new THREE.Group(); OFF.fanBlades.position.set(0, 0.28, 0); fan.add(OFF.fanBlades);
  for (let i = 0; i < 3; i++) { const b = mesh(rbox(0.05, 0.11, 0.01, 0.005), mat('#f6efe0'), OFF.fanBlades, Math.sin(i * 2.09) * 0.06, Math.cos(i * 2.09) * 0.06, 0); b.rotation.z = -i * 2.09; }
  mesh(rbox(0.22, 0.1, 0.13, 0.02), mat('#9fd3df'), D, 0.62, 0.83, 0.32);
  mesh(rbox(0.06, 0.05, 0.05, 0.02), mat('#ffffff'), D, 0.62, 0.9, 0.32);
  mesh(rbox(0.3, 0.03, 0.22, 0.01), mat('#f4efe2'), D, 0.42, 0.795, 0.15);
  mesh(rbox(0.32, 0.05, 0.24, 0.01), mat('#fbfaf6'), D, 0.55, 0.81, 0.55);
  mesh(rbox(0.08, 0.34, 0.3, 0.015), mat('#3d5fa6'), D, -0.68, 0.95, 0.75);
  mesh(rbox(0.08, 0.34, 0.3, 0.015), mat('#5d7fc0'), D, -0.59, 0.95, 0.75);
  const notes = ['#f2e15b', '#f29ac0', '#7cc47f', '#8fc8ef', '#b07ad8'];
  notes.forEach((c, i) => { const n = mesh(new THREE.PlaneGeometry(0.13, 0.13), mat(c), officeScene, -1.05 + i * 0.26 + (i > 2 ? 1.4 : 0), 1.0 + (i % 2) * 0.17, ME_POS.z - 1.04); n.rotation.z = (i % 2 ? 0.08 : -0.06); n.castShadow = false; });

  // 你自己：藍色袖子
  const me = chibi({ skin: '#f6d3ba', top: '#6f8fc9', pants: '#3d4658', hair: '#3a2a24', eyes: 'open' });
  sit(me); mine.add(me.root);
  OFF.me = me;
  OFF.fpv = buildFpvArms();
  P.push({ c: me, kind: 'type', ph: 0.6, stretchEvery: 0, me: true });
}


/* 辦公室前半段：會議桌、影印機、矮櫃隔斷，讓鏡頭待在房間裡 */
function officeChair(x, z, rotY, color = '#4e6fa6') {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotY; officeScene.add(g);
  const blue = mat(color, { roughness: 0.7 }), metal = mat('#3a3d44', { roughness: 0.4, metalness: 0.3 });
  mesh(rbox(0.52, 0.09, 0.48, 0.04), blue, g, 0, 0.44, 0);
  const back = mesh(rbox(0.48, 0.5, 0.08, 0.04), blue, g, 0, 0.78, -0.25); back.rotation.x = -0.1;
  mesh(cyl(0.035, 0.035, 0.34, 12), metal, g, 0, 0.24, 0);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, leg = mesh(rbox(0.05, 0.04, 0.28, 0.015), metal, g, Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.14); leg.rotation.y = a; }
  return g;
}
function buildFrontZone() {
  const P = OFF.people, wood = mat('#d8b98d', { roughness: 0.6 });
  // 會議桌（畫面左前方）
  const T = new THREE.Group(); T.position.set(-2.55, 0, 7.6); officeScene.add(T);
  mesh(rbox(2.0, 0.07, 1.1, 0.05), wood, T, 0, 0.74, 0);
  for (const [x, z] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) mesh(cyl(0.04, 0.04, 0.72, 10), mat('#8d9290'), T, x, 0.36, z);
  mesh(rbox(0.32, 0.03, 0.24, 0.01), mat('#f4efe2'), T, 0.4, 0.79, 0.1);
  mesh(rbox(0.36, 0.02, 0.26, 0.01), mat('#2a2c31'), T, -0.45, 0.785, -0.05);
  const pot = cupMesh('#f4f2ec', 0.1, 0.045); pot.position.set(0.05, 0.775, -0.2); T.add(pot);
  for (const [x, z, r] of [[-3.05, 8.45, Math.PI], [-2.05, 8.45, Math.PI], [-2.05, 6.75, 0]]) officeChair(x, z, r);
  // 坐在會議桌講電話的同事（面向鏡頭）
  const ch = officeChair(-3.05, 6.75, 0, '#4e6fa6');
  const ph = chibi({ skin: '#f2cdb0', top: '#7aa6c9', pants: '#3d4658', hair: '#5a3a2a', eyes: 'open' });
  sit(ph); ph.root.position.set(-3.05, 0, 6.85); officeScene.add(ph.root);
  holdInHand(ph, 1, (() => { const f = new THREE.Group(); mesh(rbox(0.06, 0.13, 0.02, 0.01), mat('#2a2c31'), f, 0, 0.02, 0); return f; })());
  P.push({ c: ph, kind: 'phone', ph: 0.3, lines: ['好，好，我再改一版', '這個要問一下主管喔', '對對對，明天一定給'] });
  // 左牆白板
  const wb = canvasTex(360, 200, (g, w, h) => {
    g.fillStyle = '#fbfcfc'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3f86c9'; g.lineWidth = 4; g.beginPath(); g.moveTo(30, 150); g.lineTo(90, 110); g.lineTo(150, 125); g.lineTo(220, 60); g.lineTo(300, 40); g.stroke();
    g.fillStyle = '#e86f5c'; g.font = '700 26px "Noto Sans TC", sans-serif'; g.fillText('Q4 目標!!', 30, 50);
    g.fillStyle = '#7cc47f'; g.fillRect(230, 120, 90, 50);
  });
  const wbM = mesh(new THREE.PlaneGeometry(1.9, 1.05), mat('#fff', { map: wb, roughness: 0.4 }), officeScene, -OW / 2 + 0.02, 1.75, 7.6); wbM.rotation.y = Math.PI / 2; wbM.castShadow = false;
  mesh(new THREE.BoxGeometry(0.04, 1.15, 2.0), mat('#c9ccca'), officeScene, -OW / 2 + 0.01, 1.75, 7.6);

  // 影印機（畫面右前方）＋等影印的同事
  const C = new THREE.Group(); C.position.set(3.55, 0, 7.0); C.rotation.y = -Math.PI / 2; officeScene.add(C);
  mesh(rbox(0.95, 0.95, 0.72, 0.05), mat('#dcdfe0'), C, 0, 0.475, 0);
  mesh(rbox(0.95, 0.08, 0.72, 0.03), mat('#9aa1a5'), C, 0, 0.99, 0);
  mesh(rbox(0.3, 0.06, 0.14, 0.02), mat('#2a2c31'), C, 0.25, 1.06, 0.26);
  mesh(rbox(0.16, 0.04, 0.08, 0.01), mat('#5aa0e0', { emissive: '#5aa0e0', emissiveIntensity: 0.6 }), C, 0.25, 1.1, 0.27);
  mesh(rbox(0.55, 0.04, 0.3, 0.01), mat('#f4f2ec'), C, -0.1, 0.62, 0.44);
  for (const y of [0.18, 0.4]) mesh(rbox(0.8, 0.02, 0.02, 0.005), mat('#8d9290'), C, 0, y, 0.37);
  const wt = chibi({ skin: '#f6d6be', top: '#f2b84b', pants: '#4a4a52', hair: '#2e2420', eyes: 'open' });
  wt.root.position.set(2.55, 0, 7.0); wt.root.rotation.y = Math.PI / 2; officeScene.add(wt.root);
  P.push({ c: wt, kind: 'wait', ph: 1.2, lines: ['影印機又卡紙了', '誰用完不補紙！', '再等我一下就好'] });

  // 矮櫃隔斷＋盆栽（走路的盡頭）
  const cab = mat('#efe9dd'), top = mat('#c8a57c');
  mesh(rbox(OW - 0.6, 0.9, 0.45, 0.04), cab, officeScene, 0, 0.45, WALK_FRONT + 0.4);
  mesh(rbox(OW - 0.5, 0.05, 0.5, 0.02), top, officeScene, 0, 0.92, WALK_FRONT + 0.4);
  for (let x = -3.4; x <= 3.4; x += 0.85) mesh(rbox(0.02, 0.7, 0.01, 0.005), mat('#d3ccbd'), officeScene, x, 0.45, WALK_FRONT + 0.17);
  for (const x of [-3.1, -1.3, 1.3, 3.1]) {
    const g = new THREE.Group(); g.position.set(x, 0.95, WALK_FRONT + 0.4); officeScene.add(g);
    mesh(cyl(0.13, 0.1, 0.2, 16), mat('#e7dccb'), g, 0, 0.1, 0);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; mesh(sphere(0.13, 12, 8), mat('#5e9f5b', { roughness: 0.7 }), g, Math.sin(a) * 0.08, 0.3 + (i % 2) * 0.08, Math.cos(a) * 0.08); }
  }
  // 前牆那頭：門與出口燈（平常背對鏡頭，轉身時看得到）
  mesh(rbox(1.2, 2.3, 0.08, 0.02), mat('#a07f5e'), officeScene, 0, 1.15, OFRONT - 0.02);
  mesh(rbox(0.5, 0.18, 0.05, 0.02), mat('#3fae6a', { emissive: '#3fae6a', emissiveIntensity: 0.8 }), officeScene, 0, 2.6, OFRONT - 0.03);
}

function buildMovers() {
  const P = OFF.people;
  // 在走道來回走的同事
  const w = chibi({ skin: '#f5d1b6', top: '#e0895b', pants: '#2f3b55', hair: '#2a201c', eyes: 'open' });
  officeScene.add(w.root);
  holdInHand(w, 1, (() => { const f = new THREE.Group(); mesh(rbox(0.2, 0.26, 0.03, 0.01), mat('#f4efe2'), f, 0, -0.05, 0.02); return f; })());
  P.push({ c: w, lines: LINES.walker, kind: 'walk', path: [[0.45, 0.9], [0.45, -4.4], [-0.45, -4.4], [-0.45, 0.9]], speed: 0.9, d: 0 });
  // 拿咖啡踱步的主管
  const boss = chibi({ skin: '#f1cdb2', top: '#3c4660', pants: '#2e3446', hair: '#2a2420', eyes: 'open' });
  addTie(boss, '#c0392b'); officeScene.add(boss.root);
  holdInHand(boss, 1, cupMesh('#f4f2ec', 0.12, 0.05));
  P.push({ c: boss, lines: LINES.boss, kind: 'walk', path: [[-0.9, -4.95], [3.0, -4.95]], speed: 0.55, d: 2, pause: 1.6, holding: 1 });
  // 飲水機旁喝水的同事
  const dr = chibi({ skin: '#f6d6be', top: '#c9b5d9', pants: '#5a4d6a', hair: '#3a2a24', bun: true, eyes: 'open' });
  dr.root.position.set(-1.9, 0, -5.4); dr.root.rotation.y = 0.35; officeScene.add(dr.root);
  holdInHand(dr, 1, cupMesh('#ffffff', 0.1, 0.04));
  P.push({ c: dr, kind: 'drink', ph: 0, lines: LINES.drink });
}

function buildOffice() {
  buildOfficeRoom(); buildDesks(); buildMovers(); buildFrontZone(); buildMemes(); buildCat();
  drawPlayerScreen('');
  buildNav();
  OFF.emis = [];
  officeScene.traverse(o => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) if (m && m.isMeshStandardMaterial && m.emissiveIntensity > 0 && m.emissive && m.emissive.getHex() > 0x111111)
      OFF.emis.push({ m, base: m.emissiveIntensity });
  });
  OFF.soulModel = buildSoul3D(); OFF.soulModel.visible = false; officeScene.add(OFF.soulModel);
  OFF.tail = makeSoulTail(); officeScene.add(OFF.tail.mesh);
  OFF.headGlow = glowSprite(); OFF.headGlow.visible = false; officeScene.add(OFF.headGlow);
  OFF.soulLight = new THREE.PointLight('#8fd6ff', 0, 12, 2); officeScene.add(OFF.soulLight);
  // 出竅時從天花板打下來的一道光
  const spot = new THREE.SpotLight('#e8f7ff', 0, 20, 0.46, 0.9, 0.9);
  spot.position.set(0, 8.2, ME_POS.z + 0.5);
  spot.target.position.set(0, 0.4, ME_POS.z + 0.2);
  officeScene.add(spot, spot.target);
  OFF.spot = spot;
  tintIn(officeScene);
}

// 沿路徑走：path 是 [x, z] 點，走到底就折返（或繞一圈）
function pathPoint(p, dist) {
  const pts = p.path.length === 2 ? [p.path[0], p.path[1], p.path[0]] : [...p.path, p.path[0]];
  let total = 0; const segs = [];
  for (let i = 0; i < pts.length - 1; i++) { const L = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(L); total += L; }
  let d = ((dist % total) + total) % total;
  for (let i = 0; i < segs.length; i++) {
    if (d <= segs[i]) { const a = pts[i], b = pts[i + 1], k = d / segs[i]; return { x: a[0] + (b[0] - a[0]) * k, z: a[1] + (b[1] - a[1]) * k, dx: b[0] - a[0], dz: b[1] - a[1], segEnd: segs[i] - d }; }
    d -= segs[i];
  }
  return { x: pts[0][0], z: pts[0][1], dx: 0, dz: 1, segEnd: 0 };
}
let lastOT = 0;
function officeTick(t) {
  const dt = Math.min(t - lastOT, 0.05); lastOT = t;
  if (OFF.fanBlades) OFF.fanBlades.rotation.z = t * 14;
  const b = beatPos(), groove = (show.mode === 'rap' || show.mode === 'waiting') && b >= 0;
  const bounce = groove ? (1 - (b % 1)) ** 3 : 0;
  for (const p of OFF.people) {
    const c = p.c;
    if (p.me && OFF.state !== 'seated') continue;
    if (p.kind === 'type') {
      const cyc = p.stretchEvery ? (t + p.ph) % p.stretchEvery : 99;
      const st = cyc < 1.6 ? Math.sin(cyc / 1.6 * Math.PI) : 0;   // 偶爾伸懶腰
      for (const a of c.arms) {
        const s = a.userData.s;
        const amp = p.me ? (t - (OFF.lastKey ?? -9) < 0.35 ? 0.16 : 0.015) : 0.07;
        a.rotation.x = THREE.MathUtils.lerp(-1.05 + Math.sin(t * (p.me ? 22 : 15) + p.ph + (s > 0 ? Math.PI : 0)) * amp, -2.9, st);
        a.rotation.z = THREE.MathUtils.lerp(-0.18 * s, 0.25 * s, st);
      }
      c.torso.rotation.x = 0.08 - st * 0.22 + Math.sin(t * 0.6 + p.ph) * 0.02;
      c.head.rotation.set(0.12 - st * 0.3 + bounce * 0.15, Math.sin(t * 0.35 + p.ph) * 0.12, 0);
    } else if (p.kind === 'walk') {
      let moving = true;
      if (p.pause) {
        const here = pathPoint(p, p.d);
        if (here.segEnd < 0.02 && !p.waitUntil) p.waitUntil = t + p.pause;
        if (p.waitUntil) { if (t < p.waitUntil) moving = false; else { p.waitUntil = 0; p.d += 0.05; } }
      }
      if (moving) p.d += p.speed * dt;
      const q = pathPoint(p, p.d);
      c.root.position.set(q.x, moving ? Math.abs(Math.sin(t * 7)) * 0.04 : 0, q.z);
      const want = Math.atan2(q.dx, q.dz);
      let diff = want - c.root.rotation.y; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      c.root.rotation.y += diff * Math.min(1, dt * 8);
      const sw = moving ? Math.sin(t * 7) : 0;
      c.legs[0].rotation.x = sw * 0.5; c.legs[1].rotation.x = -sw * 0.5;
      c.arms[0].rotation.set(-sw * 0.45, 0, 0.12);
      c.arms[1].rotation.set(p.holding ? -1.25 : sw * 0.45, 0, -0.12);
      c.head.rotation.set(bounce * 0.15, moving ? 0 : Math.sin(t * 0.8) * 0.5, 0);
    } else if (p.kind === 'phone') {
      c.arms[1].rotation.set(-2.55, 0, -0.95);
      c.arms[0].rotation.set(-0.9 + Math.sin(t * 2.2 + p.ph) * 0.25, 0, 0.2);
      c.head.rotation.set(Math.max(0, Math.sin(t * 3.1 + p.ph)) * 0.14 + bounce * 0.15, 0, -0.18);
      c.torso.rotation.set(0.04, 0, Math.sin(t * 0.7) * 0.04);
    } else if (p.kind === 'wait') {
      const tap = Math.max(0, Math.sin(t * 6 + p.ph));
      c.legs[0].rotation.x = -tap * 0.25;
      c.arms[0].rotation.set(-0.6, 0, 0.9); c.arms[1].rotation.set(-0.6, 0, -0.9);
      c.head.rotation.set(bounce * 0.15, Math.sin(t * 0.5 + p.ph) * 0.6, 0);
    } else if (p.kind === 'cat') {
      const mv = catWander(p, t, dt);
      // 換動作：坐著、趴著、舔毛、伸懶腰、睡覺
      const petting = p.petT != null && t - p.petT < 2.2;
      if (mv) { p.act = 'walk'; p.actUntil = t + 0.5; }
      else if (petting) { p.act = 'sit'; p.actUntil = t + 1.5; }
      else if (t > (p.actUntil || 0)) {
        const pool = ['sit', 'sit', 'lie', 'groom', 'stretch', 'sleep', 'lie'];
        p.act = pool[Math.floor(Math.random() * pool.length)];
        p.actUntil = t + (p.act === 'sleep' ? 9 + Math.random() * 8 : 3.5 + Math.random() * 4);
      }
      const ease = Math.min(1, dt * 3.5);
      const want = { flat: (p.act === 'lie' || p.act === 'sleep') ? 1 : 0, groom: p.act === 'groom' ? 1 : 0, str: p.act === 'stretch' ? 1 : 0 };
      p.wf = (p.wf ?? 0) + (want.flat - (p.wf ?? 0)) * ease;
      p.wg = (p.wg ?? 0) + (want.groom - (p.wg ?? 0)) * ease;
      p.ws = (p.ws ?? 0) + (want.str - (p.ws ?? 0)) * ease;
      const sleeping = p.act === 'sleep' && p.wf > 0.6;
      if (c.faceMat) {
        const faceWant = sleeping ? c.faceShut : c.faceOpen;
        if (c.faceMat.map !== faceWant) { c.faceMat.map = faceWant; c.faceMat.needsUpdate = true; }
      }
      const br = Math.sin(t * (sleeping ? 0.9 : 1.7) + p.ph) * (sleeping ? 0.022 : 0.014);
      p.sc = (p.sc ?? 1) + ((p.hover ? 1.08 : 1) - (p.sc ?? 1)) * Math.min(1, dt * 9);
      const S = p.base * p.sc;
      c.root.scale.set(S * (1 + br + p.ws * 0.04), S * (1 + br * -0.6) * (1 - p.wf * 0.4 - p.ws * 0.12), S * (1 + br) * (1 + p.wf * 0.34 + p.ws * 0.3));
      c.root.position.y = mv ? Math.abs(Math.sin(t * 7.5)) * 0.035 : 0;
      c.root.rotation.z = mv ? Math.sin(t * 7.5) * 0.05 : 0;
      c.root.rotation.x = -p.ws * 0.12;
      p.tail.rotation.z = Math.sin(t * (mv ? 3.2 : sleeping ? 0.7 : 1.4) + p.ph) * (mv ? 0.28 : sleeping ? 0.12 : 0.45);
      p.tail.rotation.x = mv ? -0.3 : Math.sin(t * 1.05) * 0.18 - p.wf * 0.5;
      const pet = p.petT != null ? Math.max(0, 1 - (t - p.petT) / 1.3) : 0;
      const hy = p.c.head.userData.y ?? (p.c.head.userData.y = c.head.position.y);
      const hz = p.c.head.userData.z ?? (p.c.head.userData.z = c.head.position.z);
      c.head.rotation.x = Math.sin(t * 0.6 + p.ph) * 0.07 - pet * 0.25 + (mv ? 0.1 : 0)
        + p.wg * (0.62 + Math.sin(t * 9) * 0.16) + p.wf * 0.18 - p.ws * 0.3;
      c.head.position.y = hy - p.wf * 0.13 - p.wg * 0.08
        + (pet ? Math.abs(Math.sin((t - p.petT) * 13)) * 0.025 * pet : 0);
      c.head.position.z = hz + p.wg * 0.05 + p.ws * 0.06;
    } else if (p.kind === 'drink') {
      const cyc = (t + p.ph) % 5, up = cyc > 3 && cyc < 4.6 ? Math.sin((cyc - 3) / 1.6 * Math.PI) : 0;
      c.arms[1].rotation.set(-1.0 - up * 1.3, 0, -0.35 * (1 - up) - up * 0.55);
      c.arms[0].rotation.set(0.05, 0, 0.12);
      c.head.rotation.set(-up * 0.35 + bounce * 0.15, 0, 0);
    }
    if (!p.me) peerLook(p, dt);
  }
  peerGreet(t);
  playerTick(t, dt, bounce, b);
  soul3dTick(t, bounce, b);
  cameraTick(dt);
  talkTick(t);
}


/* ---------- 辦公室：台詞 ---------- */
const LINES = {
  desk: [
    ['又要開會了⋯⋯', '我的咖啡呢', '這個 bug 不是我寫的'],
    ['客戶又改需求了', '今天能準時下班嗎', '誰把印表機卡紙了'],
    ['好想放假', '週報寫完了沒？', '午餐吃什麼'],
    ['這封信已讀不回第三天', '剛剛那個會可以寫成 email 吧', '再五分鐘就專心'],
  ],
  boss: ['這個明天早上要', '我只是有個小想法', '大家辛苦了，再加個班', '這週末應該有空吧？'],
  walker: ['借過借過，要交報告', '老闆在找你喔', '影印機又壞了'],
  drink: ['喝水是唯一的休息', '再一杯就回座位', '你也來摸魚？'],
};

/* ---------- 辦公室：走路地圖（格子＋A*） ---------- */
const NAV = { s: 0.2, x0: -OW / 2, z0: OBACK, nx: 0, nz: 0, block: null };
const SEAT_STAND = new THREE.Vector3(0, 0, ME_POS.z + 0.6);   // 座位後面，站起來的地方
function buildNav() {
  NAV.nx = Math.ceil(OW / NAV.s); NAV.nz = Math.ceil((OFRONT - OBACK) / NAV.s);
  NAV.block = new Uint8Array(NAV.nx * NAV.nz);
  const R = 0.22, boxes = [], MZ = ME_POS.z;
  for (const s of [-1, 1]) {
    boxes.push(s < 0 ? [-3.7, -1.7, -4.65, 1.8] : [1.7, 3.7, -4.65, 1.8]);   // 同事的隔間
    boxes.push(s < 0 ? [-1.36, -1.24, MZ - 1.2, MZ + 0.85] : [1.24, 1.36, MZ - 1.2, MZ + 0.85]); // 你的隔間側板
  }
  boxes.push([-1.36, 1.36, MZ - 1.15, MZ - 1.0], [-0.8, 0.8, MZ - 1.05, MZ - 0.15]);   // 你的隔板、桌子
  boxes.push([-2.2, -1.6, -6.6, -5.1]);                                      // 飲水機＋喝水的人
  boxes.push([-4.3, -2.35, -6.6, -5.85], [1.5, 4.3, -6.6, -5.8]);            // 書櫃、檔案櫃
  boxes.push([-3.95, -1.15, 6.25, 8.95], [2.15, 4.2, 6.45, 7.6]);           // 會議桌（含椅子）、影印機＋等影印的人
  for (const [x, z] of [[-3.75, -4.9], [3.75, -4.9], [-3.6, 5.2], [3.6, 5.3]]) boxes.push([x - 0.32, x + 0.32, z - 0.32, z + 0.32]);
  const minX = -OW / 2 + 0.35, maxX = OW / 2 - 0.35, minZ = OBACK + 0.35, maxZ = WALK_FRONT - 0.3;
  for (let i = 0; i < NAV.nx; i++) for (let j = 0; j < NAV.nz; j++) {
    const x = NAV.x0 + (i + 0.5) * NAV.s, z = NAV.z0 + (j + 0.5) * NAV.s;
    let b = x < minX || x > maxX || z < minZ || z > maxZ;
    for (const [a0, a1, b0, b1] of boxes) if (x > a0 - R && x < a1 + R && z > b0 - R && z < b1 + R) { b = true; break; }
    NAV.block[i + j * NAV.nx] = b ? 1 : 0;
  }
}
const cellOf = (x, z) => [Math.floor((x - NAV.x0) / NAV.s), Math.floor((z - NAV.z0) / NAV.s)];
function walkable(x, z) {
  const [i, j] = cellOf(x, z);
  return i >= 0 && j >= 0 && i < NAV.nx && j < NAV.nz && !NAV.block[i + j * NAV.nx];
}
function nearestOpen(i, j) {
  for (let r = 0; r < 30; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
    const a = i + di, b = j + dj;
    if (a >= 0 && b >= 0 && a < NAV.nx && b < NAV.nz && !NAV.block[a + b * NAV.nx]) return [a, b];
  }
  return null;
}
function clearLine(ax, az, bx, bz) {
  const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 0.08);
  for (let k = 1; k <= n; k++) if (!walkable(ax + (bx - ax) * k / n, az + (bz - az) * k / n)) return false;
  return true;
}
function findPath(fx, fz, tx, tz) {
  let [si, sj] = cellOf(fx, fz), [ti, tj] = cellOf(tx, tz);
  const s0 = nearestOpen(si, sj), t0 = nearestOpen(ti, tj); if (!s0 || !t0) return [];
  [si, sj] = s0; [ti, tj] = t0;
  const N = NAV.nx * NAV.nz, g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), done = new Uint8Array(N);
  const start = si + sj * NAV.nx, goal = ti + tj * NAV.nx;
  const open = [start]; g[start] = 0;
  const hfn = id => Math.hypot(id % NAV.nx - ti, Math.floor(id / NAV.nx) - tj);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (g[open[k]] + hfn(open[k]) < g[open[bi]] + hfn(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0]; if (cur === goal) break; done[cur] = 1;
    const ci = cur % NAV.nx, cj = Math.floor(cur / NAV.nx);
    for (const [di, dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
      const a = ci + di, b = cj + dj; if (a < 0 || b < 0 || a >= NAV.nx || b >= NAV.nz) continue;
      const id = a + b * NAV.nx; if (NAV.block[id] || done[id]) continue;
      if (di && dj && (NAV.block[ci + di + cj * NAV.nx] || NAV.block[ci + (cj + dj) * NAV.nx])) continue;
      const ng = g[cur] + (di && dj ? 1.414 : 1);
      if (ng < g[id]) { g[id] = ng; came[id] = cur; if (!open.includes(id)) open.push(id); }
    }
  }
  if (came[goal] < 0 && goal !== start) return [];
  const raw = []; for (let id = goal; id >= 0; id = came[id]) { raw.push([NAV.x0 + (id % NAV.nx + 0.5) * NAV.s, NAV.z0 + (Math.floor(id / NAV.nx) + 0.5) * NAV.s]); if (id === start) break; }
  raw.reverse();
  if (walkable(tx, tz)) raw.push([tx, tz]);
  // 拉直：看得到就直接走過去
  const out = []; let ax = fx, az = fz, k = 0;
  while (k < raw.length) {
    let far = k; for (let m = raw.length - 1; m > k; m--) if (clearLine(ax, az, raw[m][0], raw[m][1])) { far = m; break; }
    out.push(raw[far]); [ax, az] = raw[far]; k = far + 1;
  }
  return out;
}

/* 出竅時把辦公室壓暗，只留頭頂那道光（k：0 正常，1 全暗） */
let _dimNow = 0;
const _bgLit = new THREE.Color('#dfe7dc'), _bgDark = new THREE.Color('#10151c');
function setOfficeDim(k, dt) {
  const L = OFF.lights; if (!L) return;
  _dimNow += (k - _dimNow) * Math.min(1, (dt || 0.016) * 3.2);
  const d = _dimNow;
  if (d < 0.002 && k === 0) return;
  L.hemi.intensity = L.base.hemi * (1 - 0.92 * d);
  L.sun.intensity = L.base.sun * (1 - 0.95 * d);
  L.winLight.intensity = L.base.win * (1 - 0.95 * d);
  officeScene.environmentIntensity = 0.35 * (1 - 0.92 * d);
  officeScene.background.copy(_bgLit).lerp(_bgDark, d);
  if (OFF.emis) for (const e of OFF.emis) e.m.emissiveIntensity = e.base * (1 - 0.82 * d);
  if (OFF.spot) OFF.spot.intensity = 850 * d;
}


/* ---------- 牆上的梗圖海報（Cynthia 自己挑的圖） ---------- */
const MEMES = [
  { f: 'meme1.webp', spot: [OW / 2 - 0.02, 1.95, 1.3, -Math.PI / 2] },
  { f: 'meme2.png', spot: [-OW / 2 + 0.02, 1.95, -0.3, Math.PI / 2] },
  { f: 'meme3.webp', spot: [OW / 2 - 0.02, 2.0, 3.6, -Math.PI / 2] },
  { f: 'meme4.webp', spot: [-OW / 2 + 0.02, 2.0, 2.4, Math.PI / 2] },
  { f: 'meme5.webp', spot: [OW / 2 - 0.02, 1.95, -3.4, -Math.PI / 2] },
];
function buildMemes() {
  const loader = new THREE.TextureLoader();
  OFF.memes = [];
  for (const { f, spot } of MEMES) {
    const [x, y, z, ry] = spot;
    const holder = new THREE.Group();
    holder.position.set(x, y, z); holder.rotation.y = ry;
    officeScene.add(holder);
    const tex = loader.load(`assets/office/memes/${f}`, t => {
      t.colorSpace = THREE.SRGBColorSpace;
      const ar = t.image.width / t.image.height;
      const H = ar > 1.2 ? 0.8 : 1.02, W = H * ar;
      paper.scale.set(W, H, 1);
      // 上面兩角貼膠帶
      for (const sx of [-1, 1]) {
        const tape = mesh(new THREE.PlaneGeometry(0.11, 0.055),
          new THREE.MeshStandardMaterial({ color: '#f2e6bc', transparent: true, opacity: 0.8, roughness: 0.9 }),
          holder, sx * W * 0.42, H * 0.48, 0.004);
        tape.rotation.z = sx * 0.5; tape.castShadow = false;
      }
    });
    const paper = mesh(new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75 }), holder, 0, 0, 0.002);
    paper.castShadow = false;
    OFF.memes.push({ paper, holder, src: `assets/office/memes/${f}` });
  }
}

/* ---------- 辦公室的貓：會呼吸、搖尾巴，走過去或點牠都會理你 ---------- */
function catFaceTex(o = {}) {
  const fur = o.fur || '#e2a263', muzzle = o.muzzle || '#fbf2e4', eye = o.eye, stripe = o.stripe || '#b9814d';
  const ink = o.ink || '#2b2119', whisk = o.whisk || ink, nose = o.nose || '#e08a86';
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = fur; g.fillRect(0, 0, w, h);
    const cx = 128, cy = 126;
    g.fillStyle = muzzle; g.beginPath(); g.ellipse(cx, cy + 26, 52, 40, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = ink;
    if (o.shut) {
      g.strokeStyle = ink; g.lineWidth = 5; g.lineCap = 'round';
      for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 31, cy - 14, 13, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    }
    for (const s of [-1, 1]) {
      if (o.shut) break;
      if (eye) {
        g.fillStyle = eye; g.beginPath(); g.ellipse(cx + s * 31, cy - 8, 15, 15, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = ink; g.beginPath(); g.ellipse(cx + s * 31, cy - 8, 5.5, 13, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * 31 + 5, cy - 14, 3.4, 0, Math.PI * 2); g.fill();
        g.fillStyle = ink;
        continue;
      }
      g.beginPath(); g.ellipse(cx + s * 30, cy - 6, 9, 12, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * 30 + 3, cy - 10, 3.2, 0, Math.PI * 2); g.fill(); g.fillStyle = ink;
    }
    g.fillStyle = nose; g.beginPath(); g.moveTo(cx - 7, cy + 16); g.lineTo(cx + 7, cy + 16); g.lineTo(cx, cy + 25); g.closePath(); g.fill();
    g.strokeStyle = ink; g.lineWidth = 2.5; g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, cy + 25); g.lineTo(cx, cy + 31); g.stroke();
    for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 9, cy + 31, 9, Math.PI * 0.1, Math.PI * 0.9); g.stroke(); }
    g.strokeStyle = whisk; g.lineWidth = 2.4;
    for (const s of [-1, 1]) for (const dy of [-7, 0, 7]) { g.beginPath(); g.moveTo(cx + s * 26, cy + 22 + dy * 0.4); g.lineTo(cx + s * 76, cy + 16 + dy); g.stroke(); }
    // 額頭的虎斑
    if (!o.plain) {
      g.strokeStyle = stripe; g.lineWidth = 7;
      for (const dx of [-16, 0, 16]) { g.beginPath(); g.moveTo(cx + dx, cy - 56); g.lineTo(cx + dx * 0.7, cy - 34); g.stroke(); }
    }
  });
}
function tabbyTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#97825f'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(58,44,30,.42)'; g.lineWidth = 5.5; g.lineCap = 'round';
    for (let i = 0; i < 24; i++) {
      const y = 5 + i * 11;
      g.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const yy = y + Math.sin(x / w * Math.PI * 5 + i * 0.9) * 3.5;
        x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
      }
      g.stroke();
    }
    g.fillStyle = 'rgba(244,234,214,.4)';
    g.beginPath(); g.ellipse(w * 0.25, h * 0.88, 50, 20, 0, 0, Math.PI * 2); g.fill();
  });
}
function makeCat(o = {}) {
  const C = { furC: '#e2a263', creamC: '#fbf2e4', earC: '#f0bfae', fluffy: false, scarf: null, ...o };
  const root = new THREE.Group();
  const fur = mat(C.furC, { roughness: 0.92 }), cream = mat(C.creamC, { roughness: 0.92 });
  // 身體：長毛的話整體更圓更蓬
  const body = C.fluffy
    ? [[0, 0], [0.22, 0], [0.245, 0.08], [0.23, 0.22], [0.15, 0.33], [0, 0.36]]
    : [[0, 0], [0.18, 0], [0.2, 0.07], [0.185, 0.2], [0.12, 0.31], [0, 0.34]];
  mesh(lathe(body), C.bodyTex ? mat('#ffffff', { map: C.bodyTex(), roughness: 0.92 }) : fur, root);
  mesh(sphere(C.fluffy ? 0.12 : 0.1, 20, 14), cream, root, 0, 0.17, C.fluffy ? 0.15 : 0.13);
  const fx = C.fluffy ? 0.095 : 0.08, fz = C.fluffy ? 0.18 : 0.16;
  for (const s of [-1, 1]) {
    mesh(new THREE.CapsuleGeometry(0.038, 0.09, 4, 10), fur, root, s * fx, 0.07, fz);
    mesh(sphere(0.048, 14, 10), cream, root, s * fx, 0.028, fz + 0.04);
  }
  const head = new THREE.Group(); head.position.set(0, C.fluffy ? 0.46 : 0.43, 0.03); root.add(head);
  const faceOpen = catFaceTex(C.face || {}), faceShut = catFaceTex({ ...(C.face || {}), shut: true });
  const faceMat = new THREE.MeshStandardMaterial({ color: '#fff', map: faceOpen, roughness: 0.92 });
  const hs = mesh(sphere(0.155, 32, 20), faceMat, head);
  if (C.fluffy) hs.scale.set(1.1, 0.98, 1);   // 扁扁的圓臉
  for (const s of [-1, 1]) {
    const ear = mesh(new THREE.ConeGeometry(0.058, 0.11, 3), fur, head, s * (C.fluffy ? 0.1 : 0.09), 0.125, -0.005);
    ear.rotation.set(0, Math.PI / 6, -s * 0.22);
    mesh(new THREE.ConeGeometry(0.03, 0.06, 3), mat(C.earC, { roughness: 0.9 }), head, s * (C.fluffy ? 0.098 : 0.088), 0.12, 0.025).rotation.set(0.2, Math.PI / 6, -s * 0.22);
  }
  // 脖子上的領巾
  if (C.scarf) {
    const sm = mat(C.scarf, { roughness: 0.85 });
    const ring = mesh(new THREE.TorusGeometry(0.105, 0.025, 10, 24), sm, root, 0, 0.345, 0.04);
    ring.rotation.x = Math.PI / 2 - 0.25;
    const knot = new THREE.Group(); knot.position.set(0, 0.335, 0.14); root.add(knot);
    mesh(sphere(0.033, 12, 10), sm, knot);
    for (const s of [-1, 1]) {
      const f = mesh(new THREE.ConeGeometry(0.055, 0.14, 4), sm, knot, s * 0.075, -0.02, 0.01);
      f.rotation.set(0.3, 0, s * 2.2);
    }
  }
  const tail = new THREE.Group(); tail.position.set(0.03, 0.08, C.fluffy ? -0.2 : -0.17); root.add(tail);
  const tr = C.fluffy ? 0.055 : 0.036;
  limb([0, 0, 0], [0.03, 0.09, -0.14], tr, fur, tail);
  limb([0.03, 0.09, -0.14], [0.04, 0.24, -0.08], tr * 0.86, fur, tail);
  limb([0.04, 0.24, -0.08], [0.04, 0.33, 0.02], tr * 0.75, C.fluffy ? fur : cream, tail);
  if (C.fluffy) mesh(sphere(0.085, 16, 12), fur, tail, 0.04, 0.35, 0.03);   // 蓬蓬的尾巴尖
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return { root, head, tail, faceMat, faceOpen, faceShut };
}
function buildCat() {
  OFF.cats = [];
  const defs = [
    { pos: [1.5, -3.3], ry: -0.7, base: 1.15, opt: {},
      lines: ['喵～', '呼嚕呼嚕⋯⋯', '（用頭蹭你的手）', '喵嗚！', '（翻肚子）'] },
    { pos: [-1.3, 1.4], ry: 0.7, base: 1.25, pitch: 0.82,
      opt: { furC: '#6d6d78', creamC: '#8d8d98', earC: '#c6a2a8', fluffy: true, scarf: '#f2c84b',
        face: { fur: '#6d6d78', muzzle: '#8d8d98', eye: '#e9b63c', plain: true } },
      lines: ['喵嗚～', '（瞇著眼看你）', '呼嚕呼嚕⋯⋯', '（蹭你的褲管）', '（尾巴掃過去）'] },
    // 黑貓：金黃眼睛、白鬍鬚
    { pos: [0.9, 3.2], ry: -2.4, base: 1.1, pitch: 1.12,
      opt: { furC: '#27272c', creamC: '#2f2f36', earC: '#7d5156',
        face: { fur: '#27272c', muzzle: '#2f2f36', eye: '#e8c33f', ink: '#121215', nose: '#5a4448', whisk: '#f2f2f4', plain: true } },
      lines: ['喵！', '（盯著你看）', '（慢慢眨眼）', '呼嚕⋯⋯', '（伸懶腰）'] },
    // 虎斑：綠眼睛、身上有斑紋
    { pos: [-1.5, -2.4], ry: 1.9, base: 1.18, pitch: 0.95,
      opt: { furC: '#8f7b59', creamC: '#e3d4b8', earC: '#efb6ae', bodyTex: tabbyTex,
        face: { fur: '#97825f', muzzle: '#e3d4b8', eye: '#93bd6b', stripe: '#5e4a32', whisk: '#ffffff' } },
      lines: ['喵嗚！', '（歪頭看你）', '（踩踩）', '呼嚕呼嚕⋯⋯', '（用力蹭）'] },
  ];
  // 第一隻有自己的墊子
  mesh(cyl(0.36, 0.38, 0.06, 24), mat('#cfa8c4', { roughness: 0.95 }), officeScene, 1.5, 0.03, -3.3).receiveShadow = true;
  defs.forEach((d, i) => {
    const cat = makeCat(d.opt);
    cat.root.position.set(d.pos[0], 0, d.pos[1]);
    cat.root.rotation.y = d.ry;
    officeScene.add(cat.root);
    const entry = { c: cat, kind: 'cat', ph: i * 1.3, tail: cat.tail, base: d.base, pitch: d.pitch || 1, lines: d.lines };
    OFF.people.push(entry); OFF.cats.push(entry);
  });
  OFF.cat = OFF.cats[0];
}
function meow(pitch = 1) {
  if (!voice.on) return;
  ensureAudio();
  const t = audio.ctx.currentTime;
  tone('sawtooth', 560 * pitch, 900 * pitch, t, 0.045, 0.2);
  tone('sine', 900 * pitch, 520 * pitch, t + 0.13, 0.06, 0.45);
}
/* 貓在辦公室裡晃來晃去：挑一個走得到的點，慢慢走過去，再發呆一下 */
const CAT_AREA = { x0: -1.75, x1: 1.75, z0: -5.0, z1: 5.2 };
function catWander(p, t, dt) {
  if (p.sitStill || (p.petT != null && t - p.petT < 3)) { p.goal = null; return false; }
  const pos = p.c.root.position;
  if (!p.goal) {
    p.wait = (p.wait ?? 1 + Math.random() * 3) - dt;
    if (p.wait > 0) return false;
    for (let i = 0; i < 14; i++) {
      const x = CAT_AREA.x0 + Math.random() * (CAT_AREA.x1 - CAT_AREA.x0);
      const z = CAT_AREA.z0 + Math.random() * (CAT_AREA.z1 - CAT_AREA.z0);
      if (walkable(x, z) && Math.hypot(x - pos.x, z - pos.z) > 0.8) { p.goal = { x, z }; break; }
    }
    p.wait = 2 + Math.random() * 4;
    return false;
  }
  const dx = p.goal.x - pos.x, dz = p.goal.z - pos.z, L = Math.hypot(dx, dz);
  if (L < 0.07) { p.goal = null; p.wait = 2.5 + Math.random() * 5; return false; }
  const step = Math.min(0.6 * dt, L);
  pos.x += dx / L * step; pos.z += dz / L * step;
  let diff = Math.atan2(dx, dz) - p.c.root.rotation.y;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  p.c.root.rotation.y += diff * Math.min(1, dt * 5);
  return true;
}

/* ---------- 辦公室：起身、走路、坐回去 ---------- */
const standBtn = document.getElementById('standBtn'), standTxt = document.getElementById('standTxt'), walkHint = document.getElementById('walkHint'), talkEl = document.getElementById('talk');
const HOVER = matchMedia('(hover: hover)').matches;
function setOfficeUI() {
  const st = OFF.state;
  standBtn.hidden = !(st === 'seated' || st === 'walk' || st === 'pet');
  standTxt.textContent = st === 'seated' ? '起身走走' : st === 'pet' ? '站起來' : '回座位';
  walkHint.textContent = st === 'pet' ? '點貓摸摸牠・點旁邊就站起來'
    : st === 'walk' ? (HOVER ? '點地板或用 WASD 走路・點同事聊天・點貓蹲下來摸・點你的電腦回座位' : '點地板走路・點同事聊天・點貓蹲下來摸・點你的電腦回座位') : '';
  if (st === 'seated' && show.mode === 'idle') askForm.classList.add('show'); else if (st !== 'soul') askForm.classList.remove('show');
}
function standUp(force = false) {
  // force：結局（ending.js）醒來後要直接站起來，不檢查流程狀態
  if (OFF.state !== 'seated' || (!force && show.mode !== 'idle')) return;
  const me = OFF.me;
  officeScene.attach(me.root);
  me.root.position.set(SEAT_STAND.x, 0, SEAT_STAND.z); me.root.rotation.set(0, 0, 0);
  me.hips.position.y = 0.42;
  for (const l of me.legs) { l.rotation.x = 0; l.children[1].rotation.x = 0; l.children[1].position.set(0, -0.38, 0.03); }
  me.torso.rotation.set(0, 0, 0); me.head.rotation.set(0, 0, 0);
  q.blur();
  OFF.state = 'walk'; OFF.path = []; OFF.leftSeat = false; OFF.nearPeer = null;
  resetOrbit();
  setOfficeUI();
}
OFF.orbit = { yaw: 0, pitch: 0, dist: 1 };
function resetOrbit() { OFF.orbit.yaw = 0; OFF.orbit.pitch = 0; OFF.orbit.dist = 1; }
const _pd = new THREE.Vector3();
function petMode(entry) {
  if (OFF.state !== 'walk') return;
  const c = entry.c.root.position, me = OFF.me.root.position;
  let dx = me.x - c.x, dz = me.z - c.z;
  const L = Math.hypot(dx, dz) || 1;
  OFF.petDir = { x: dx / L, z: dz / L };
  // 人蹲到貓旁邊
  me.x = c.x + OFF.petDir.x * 0.62; me.z = c.z + OFF.petDir.z * 0.62;
  OFF.me.root.rotation.y = Math.atan2(c.x - me.x, c.z - me.z);
  OFF.state = 'pet'; OFF.petCat = entry; OFF.path = []; OFF.keys.clear();
  resetOrbit();
  entry.sitStill = true; entry.goal = null;
  setOfficeUI();
}
function leavePet() {
  if (OFF.state !== 'pet') return;
  if (OFF.petCat) OFF.petCat.sitStill = false;
  OFF.petCat = null; OFF.state = 'walk'; OFF.leftSeat = true;
  resetOrbit();
  if (OFF.me) OFF.me.hips.position.y = 0.42;
  setOfficeUI();
}
function sitDown() {
  const me = OFF.me;
  OFF.mine.add(me.root);
  me.root.position.set(0, 0, 0); me.root.rotation.set(0, 0, 0);
  sit(me);
  me.torso.rotation.set(0, 0, 0);
  OFF.state = 'seated'; OFF.path = []; OFF.goSeat = false;
  resetOrbit();
  setOfficeUI();
}
function goTo(x, z, toSeat = false) {
  const me = OFF.me.root.position;
  OFF.path = findPath(me.x, me.z, x, z);
  OFF.goSeat = toSeat;
  if (!OFF.path.length && toSeat && Math.hypot(me.x - x, me.z - z) < 0.3) sitDown();
}
standBtn.addEventListener('click', () => {
  if (OFF.state === 'seated') standUp();
  else if (OFF.state === 'pet') leavePet();
  else if (OFF.state === 'walk') goTo(SEAT_STAND.x, SEAT_STAND.z, true);
});

const SPEED = 2.1;
function playerTick(t, dt, bounce, b) {
  const me = OFF.me; if (!me) return;
  if (OFF.state !== 'soul') setOfficeDim(0, dt);
  if (OFF.state === 'soul') {
    // 靈魂出竅：身體趴在桌上
    const k = Math.min((t - OFF.soulT0) / 0.8, 1);
    me.torso.rotation.x = THREE.MathUtils.lerp(0.08, 0.72, easeOut(k));
    me.head.rotation.set(THREE.MathUtils.lerp(0.1, 0.45, k), 0, THREE.MathUtils.lerp(0, 0.25, k));
    for (const a of me.arms) { a.rotation.x = THREE.MathUtils.lerp(-1.05, -1.55, k); a.rotation.z = -0.35 * a.userData.s; }
    return;
  }
  if (OFF.state === 'pet') { me.hips.position.y = 0.3; return; }
  if (OFF.state !== 'walk' || OFF.frozen) return;   // frozen：結局在泡茶、伸懶腰時先不能走
  const pos = me.root.position;
  let mx = 0, mz = 0;
  const K = OFF.keys;
  if (K.has('w') || K.has('arrowup')) mz -= 1;
  if (K.has('s') || K.has('arrowdown')) mz += 1;
  if (K.has('a') || K.has('arrowleft')) mx -= 1;
  if (K.has('d') || K.has('arrowright')) mx += 1;
  let moving = false;
  if (mx || mz) {
    OFF.path = []; OFF.goSeat = false;
    const L = Math.hypot(mx, mz), step = SPEED * dt;
    const nx = pos.x + mx / L * step, nz = pos.z + mz / L * step;
    if (walkable(nx, nz)) { pos.x = nx; pos.z = nz; } else if (walkable(nx, pos.z)) pos.x = nx; else if (walkable(pos.x, nz)) pos.z = nz;
    OFF.face = Math.atan2(mx, mz); moving = true;
  } else if (OFF.path.length) {
    const [tx, tz] = OFF.path[0], dx = tx - pos.x, dz = tz - pos.z, L = Math.hypot(dx, dz), step = SPEED * dt;
    if (L <= step) { pos.x = tx; pos.z = tz; OFF.path.shift(); if (!OFF.path.length && OFF.goSeat) { sitDown(); return; } }
    else { pos.x += dx / L * step; pos.z += dz / L * step; }
    OFF.face = Math.atan2(dx, dz); moving = true;
  }
  // 走回椅子旁邊就自己坐下（要先離開過座位，才不會一起身就被吸回去）
  const dSeat = Math.hypot(pos.x - SEAT_STAND.x, pos.z - SEAT_STAND.z);
  if (dSeat > 1.25) OFF.leftSeat = true;
  if (OFF.leftSeat && dSeat < 0.6) { sitDown(); return; }
  if (OFF.face != null) { let d = OFF.face - me.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); me.root.rotation.y += d * Math.min(1, dt * 10); }
  const sw = moving ? Math.sin(t * 9) : 0;
  pos.y = moving ? Math.abs(Math.sin(t * 9)) * 0.04 : 0;
  me.legs[0].rotation.x = sw * 0.55; me.legs[1].rotation.x = -sw * 0.55;
  me.arms[0].rotation.set(-sw * 0.5, 0, 0.12); me.arms[1].rotation.set(sw * 0.5, 0, -0.12);
  me.head.rotation.set(0, 0, 0);
}

/* 走近同事：他會轉頭看你，而且主動開口 */
const _pw = new THREE.Vector3(), _pq = new THREE.Quaternion(), _pe = new THREE.Euler();
const LOOK_R = 2.8, TALK_R = 1.75;
function peerLook(p, dt) {
  const c = p.c; if (!c || !c.head) return;
  let want = 0;
  if ((OFF.state === 'walk' || OFF.state === 'pet') && OFF.me) {
    const me = (OFF.state === 'pet' && p === OFF.petCat) ? ocam.position : OFF.me.root.position;
    c.root.getWorldPosition(_pw);
    const dist = Math.hypot(_pw.x - me.x, _pw.z - me.z);
    if (dist < LOOK_R) {
      c.root.getWorldQuaternion(_pq); _pe.setFromQuaternion(_pq, 'YXZ');
      let a = Math.atan2(me.x - _pw.x, me.z - _pw.z) - _pe.y;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      want = THREE.MathUtils.clamp(a, -1.2, 1.2) * (1 - Math.max(0, dist - LOOK_R * 0.7) / (LOOK_R * 0.3));
    }
  }
  c.head.rotation.y += (want - c.head.rotation.y) * Math.min(1, dt * 7);
}
function peerGreet(t) {
  if (OFF.state !== 'walk' || !OFF.me || show.mode !== 'idle') { OFF.nearPeer = null; return; }
  const me = OFF.me.root.position;
  let near = null, nd = 1e9;
  for (const p of OFF.people) {
    if (p.me || !p.lines || !p.c) continue;
    p.c.root.getWorldPosition(_pw);
    const d = Math.hypot(_pw.x - me.x, _pw.z - me.z);
    if (d < nd) { nd = d; near = p; }
  }
  if (!near || nd > TALK_R * 1.5) { OFF.nearPeer = null; return; }
  if (nd < TALK_R && OFF.nearPeer !== near && t - (OFF.greetT || -9) > 1.2) {
    OFF.nearPeer = near; OFF.greetT = t;
    say2(near);
  }
}

/* ---------- 辦公室：鏡頭（坐著看螢幕／走路跟著你／出竅看靈魂） ---------- */
const _camP = new THREE.Vector3(), _camT = new THREE.Vector3();
function camWant() {
  if (OFF.camShot) return OFF.camShot;   // 結局（ending.js）指定的鏡頭：{ pos, tgt }
  const P = OFF.portrait, st = OFF.state;
  if (st === 'walk') {
    const m = OFF.me ? OFF.me.root.position : SEAT_STAND;
    const off = P ? [1.4, 5.6, 7.6] : [1.2, 4.6, 6.6], tg = P ? [0, 0.5, -2.0] : [0, 0.6, -1.6];
    _camP.set(m.x * 0.6 + off[0], off[1], THREE.MathUtils.clamp(m.z + off[2], P ? 2.6 : 2.0, OFRONT - 0.6));
    _camT.set(m.x * 0.9 + tg[0], tg[1], Math.max(m.z + tg[2], OBACK + 1.2));
  } else if (st === 'pet' && OFF.petCat) {
    // 蹲在貓面前：鏡頭壓到貓的高度，像你蹲著跟牠對看
    const c = OFF.petCat.c.root.position, d = OFF.petDir;
    _camP.set(c.x + d.x * 1.55, 0.78, c.z + d.z * 1.55);
    _camT.set(c.x, 0.33, c.z);
  } else if (st === 'soul') {
    // 湊到靈魂面前，頭頂留位置放歌詞
    const H = SOUL_HOVER;
    // 從後面看：趴著的本人、頭頂的光、順著光浮上去的靈魂都在畫面裡
    if (P) { _camP.set(H.x + 0.8, H.y + 0.55, H.z + 5.9); _camT.set(H.x, H.y + 0.1, H.z); } else { _camP.set(H.x + 1.1, H.y + 0.6, H.z + 6.6); _camT.set(H.x, H.y + 0.3, H.z); }
  } else {
    // 第一人稱：眼睛的位置，往下看螢幕和鍵盤上的手
    const z = ME_POS.z;
    if (P) { _camP.set(0, 1.86, z + 0.62); _camT.set(0, 0.98, z - 1.02); } else { _camP.set(0, 1.84, z + 0.5); _camT.set(0, 0.93, z - 1.05); }
  }
  return { pos: _camP, tgt: _camT };
}
const _headW = new THREE.Vector3(), _ov = new THREE.Vector3();
// 你自己拖出來的視角：繞著鏡頭原本看的那個點轉
function applyOrbit(v) {
  const o = OFF.orbit;
  if (!o || (!o.yaw && !o.pitch && o.dist === 1)) return v;
  _ov.copy(v.pos).sub(v.tgt);
  const r0 = _ov.length() || 0.001, r = r0 * o.dist;
  const theta = Math.atan2(_ov.x, _ov.z) + o.yaw;
  let phi = Math.acos(THREE.MathUtils.clamp(_ov.y / r0, -1, 1)) - o.pitch;
  phi = THREE.MathUtils.clamp(phi, 0.62, 1.46);   // 不要飛到天花板上往下看整個房間
  v.pos.set(v.tgt.x + r * Math.sin(phi) * Math.sin(theta),
    v.tgt.y + r * Math.cos(phi),
    v.tgt.z + r * Math.sin(phi) * Math.cos(theta));
  return v;
}
function cameraTick(dt) {
  const v = applyOrbit(camWant()), k = OFF.camInit ? 1 - Math.exp(-dt * (OFF.camSpeed ?? 3.2)) : 1;
  OFF.camInit = true;
  ocam.position.lerp(v.pos, k); OFF.look.lerp(v.tgt, k); ocam.lookAt(OFF.look);
  // 坐著是第一人稱，視野放寬才看得到螢幕、鍵盤和手
  const fovWant = OFF.camFov ?? (OFF.state === 'seated' ? (OFF.portrait ? 80 : 70) : (OFF.portrait ? 56 : 40));
  if (Math.abs(ocam.fov - fovWant) > 0.05) { ocam.fov += (fovWant - ocam.fov) * k; ocam.updateProjectionMatrix(); }
  // 鏡頭貼近自己時把頭藏起來，只留伸向鍵盤的手
  if (OFF.me) {
    OFF.me.head.getWorldPosition(_headW);
    // 蹲下看貓時也是第一人稱，自己整個人要藏起來，不然會擋住鏡頭
    const far = OFF.state === 'pet' ? false : ocam.position.distanceTo(_headW) > 0.95;
    OFF.me.head.visible = far;
    OFF.me.torso.children[0].visible = far;   // 第一人稱時整個角色藏起來，換成專用手臂
    for (const l of OFF.me.legs) l.visible = far;
    for (const a of OFF.me.arms) a.visible = far;
    if (OFF.mySeat) for (const m of OFF.mySeat) m.visible = OFF.state === 'pet' ? true : far;
    if (OFF.fpv) {
      const typing = show.clock - (OFF.lastKey ?? -9) < 0.35;
      for (const a of OFF.fpv) {
        a.g.visible = !far && OFF.state === 'seated';
        const lift = typing ? Math.max(0, Math.sin(show.clock * 22 + (a.s > 0 ? Math.PI : 0))) * 0.05 : 0;
        a.g.quaternion.copy(a.base); a.g.rotateX(-lift);
      }
    }
  }
}

/* ---------- 辦公室：點地板走路、點同事聊天、點電腦回座位 ---------- */
const oray = new THREE.Raycaster(), ondc = new THREE.Vector2(), FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hitP = new THREE.Vector3();
let odown = null;
renderer.domElement.addEventListener('pointerdown', e => { if (office.active) odown = { x: e.clientX, y: e.clientY, t: performance.now() }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!office.active || !odown) return;
  const moved = Math.hypot(e.clientX - odown.x, e.clientY - odown.y), dtp = performance.now() - odown.t; odown = null;
  renderer.domElement.style.cursor = '';
  if (moved > 10 || dtp > 600 || OFF.state === 'soul' || show.mode !== 'idle') return;
  ondc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  oray.setFromCamera(ondc, ocam);
  // 蹲著的時候：點貓就是摸，點別的地方就站起來
  if (OFF.state === 'pet') {
    const c = catUnder(oray) || catNearPointer(e.clientX, e.clientY);
    if (c) say2(c); else leavePet();
    return;
  }
  // 牆上的梗圖：點了就放大來看
  const meme = memeUnder(oray);
  if (meme) { openMeme(meme.src); return; }
  // 同事
  let best = null;
  for (const p of OFF.people) {
    if (p.me || !p.lines) continue;
    const hit = oray.intersectObject(p.c.root, true)[0];
    if (hit && (!best || hit.distance < best.d)) best = { p, d: hit.distance };
  }
  const mineHit = oray.intersectObject(OFF.mine, true)[0];
  if (best && (!mineHit || best.d < mineHit.distance)) {
    // 走路時點貓：先蹲下來，再摸牠
    if (best.p.kind === 'cat' && OFF.state === 'walk') { petMode(best.p); say2(best.p); return; }
    say2(best.p); return;
  }
  if (mineHit) { if (OFF.state === 'walk') goTo(SEAT_STAND.x, SEAT_STAND.z, true); else q.focus(); return; }
  // 沒直接點到貓身上，但點在牠附近，也當作要摸牠
  const nearCat = OFF.state === 'walk' ? catNearPointer(e.clientX, e.clientY) : null;
  if (nearCat) { petMode(nearCat); say2(nearCat); return; }
  if (oray.ray.intersectPlane(FLOOR, hitP)) {
    if (OFF.state === 'seated') standUp();
    if (OFF.state === 'walk') goTo(hitP.x, hitP.z);
  }
});
/* 滑過貓或梗圖：游標變手、東西有反應、旁邊給一句提示 */
const hoverTip = document.getElementById('hoverTip');
const lightbox = document.getElementById('lightbox');
let hovering = null;
function memeUnder(ray) {
  if (!OFF.memes) return null;
  for (const m of OFF.memes) if (ray.intersectObject(m.paper, false).length) return m;
  return null;
}
// 貓小小一隻，點牠附近一點也算數
const _cp = new THREE.Vector3();
function catNearPointer(px, py) {
  let best = null, bd = 64;
  for (const c of OFF.cats || []) {
    c.c.head.getWorldPosition(_cp); _cp.project(ocam);
    if (_cp.z > 1) continue;
    const d = Math.hypot((_cp.x * 0.5 + 0.5) * innerWidth - px, (-_cp.y * 0.5 + 0.5) * innerHeight - py);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}
function catUnder(ray) {
  if (!OFF.cats) return null;
  for (const c of OFF.cats) if (ray.intersectObject(c.c.root, true).length) return c;
  return null;
}
function setHover(kind, obj, x, y) {
  if (OFF.cats) for (const c of OFF.cats) c.hover = kind === 'cat' && c === obj;
  if (OFF.memes) for (const m of OFF.memes) m.paper.material.emissive.setHex(kind === 'meme' && m === obj ? 0x2e2e2e : 0x000000);
  renderer.domElement.style.cursor = kind ? 'pointer' : '';
  if (!kind) { hoverTip.classList.remove('show'); hovering = null; return; }
  hoverTip.textContent = kind === 'cat' ? (OFF.state === 'pet' ? '摸摸牠' : '蹲下來摸摸') : '點一下看大圖';
  hoverTip.style.left = x + 'px'; hoverTip.style.top = y + 'px';
  hoverTip.classList.add('show');
  hovering = kind;
}
renderer.domElement.addEventListener('pointermove', e => {
  // 按著拖＝轉視角
  if (office.active && odown && OFF.state !== 'soul') {
    const dx = e.clientX - (odown.lx ?? odown.x), dy = e.clientY - (odown.ly ?? odown.y);
    odown.lx = e.clientX; odown.ly = e.clientY;
    if (Math.hypot(e.clientX - odown.x, e.clientY - odown.y) > 4) {
      OFF.orbit.yaw = THREE.MathUtils.clamp(OFF.orbit.yaw - dx * 0.0055, -0.85, 0.85);
      OFF.orbit.pitch = THREE.MathUtils.clamp(OFF.orbit.pitch + dy * 0.003, -0.26, 0.3);
      setHover(null);
      renderer.domElement.style.cursor = 'grabbing';
    }
    return;
  }
  if (!office.active || OFF.state === 'soul' || show.mode !== 'idle' || lightbox.classList.contains('show')) { setHover(null); return; }
  ondc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  oray.setFromCamera(ondc, ocam);
  const cat = catUnder(oray) || catNearPointer(e.clientX, e.clientY);
  if (cat) return setHover('cat', cat, e.clientX, e.clientY);
  const meme = memeUnder(oray);
  if (meme) return setHover('meme', meme, e.clientX, e.clientY);
  setHover(null);
});
renderer.domElement.addEventListener('pointerleave', () => setHover(null));
renderer.domElement.addEventListener('wheel', e => {
  if (!office.active || OFF.state === 'soul') return;
  e.preventDefault();
  OFF.orbit.dist = THREE.MathUtils.clamp(OFF.orbit.dist * (1 + Math.sign(e.deltaY) * 0.08), 0.68, 1.22);
}, { passive: false });
function openMeme(src) {
  lightbox.querySelector('img').src = src;
  lightbox.classList.add('show');
  setHover(null);
}
lightbox.addEventListener('click', () => lightbox.classList.remove('show'));
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (lightbox.classList.contains('show')) { lightbox.classList.remove('show'); return; }
  leavePet();
});

addEventListener('keydown', e => {
  if (!office.active || e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (!['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) return;
  // 游標在輸入框時照常打字；只有方向鍵、而且框是空的，才當成「起身走走」
  if (e.target === q && !(k.startsWith('arrow') && !q.value)) return;
  if (OFF.state === 'seated' && show.mode === 'idle') { e.preventDefault(); standUp(); OFF.keys.add(k); return; }
  if (OFF.state === 'walk' && show.mode !== 'ending') { OFF.keys.add(k); e.preventDefault(); }   // 結局是自動走路
});
addEventListener('keyup', e => OFF.keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => OFF.keys.clear());

function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function heartAt(obj3d) {
  const v = new THREE.Vector3(0, 0.3, 0); obj3d.localToWorld(v); v.project(ocam);
  const h = el('div', 'plus heart', ['♥', '♡', '♥'][Math.floor(Math.random() * 3)]);
  h.style.left = ((v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 36) + 'px';
  h.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + 'px';
  document.body.append(h); setTimeout(() => h.remove(), 1000);
}
function say2(p) {
  if (p.kind === 'cat') { p.petT = show.clock; meow(p.pitch || 1); heartAt(p.c.head); }
  const L = p.lines; p.lineIdx = ((p.lineIdx ?? -1) + 1) % L.length;
  talkEl.textContent = L[p.lineIdx];
  OFF.talk = { c: p.c, p, until: show.clock + (p.kind === 'cat' ? 2.8 : 4.2) };
  talkEl.classList.add('show');
  if (p.kind === 'cat') hideReplies(); else showReplies();
}
/* 同事在講話時，可以敷衍他幾句，或乾脆已讀不回 */
const myTalkEl = document.getElementById('mytalk'), repliesEl = document.getElementById('replies');
const REPLIES = ['喔', '嗯嗯', '是喔', '好啊', '收到', '再說', '我在忙', '然後呢', '嗯？', '乾我什麼事', '你很棒棒'];
const AFTER = ['⋯⋯', '（看著你）', '沒事了', '那我問別人', '⋯⋯好吧', '（默默走開）'];
function showReplies() {
  if (OFF.state === 'soul') return;
  const pool = REPLIES.slice();
  const pick = [];
  for (let i = 0; i < 3 && pool.length; i++) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  repliesEl.replaceChildren();
  for (const txt of pick) {
    const b = el('button', null, txt); b.type = 'button';
    b.addEventListener('click', () => reply(txt, false));
    repliesEl.append(b);
  }
  const ig = el('button', 'cold', '已讀不回'); ig.type = 'button';
  ig.addEventListener('click', () => reply('已讀', true));
  repliesEl.append(ig);
  repliesEl.classList.add('show');
}
function hideReplies() { repliesEl.classList.remove('show'); }
function reply(txt, cold) {
  const p = OFF.talk && OFF.talk.p;
  hideReplies();
  myTalkEl.textContent = txt;
  myTalkEl.classList.toggle('cold', cold);
  myTalkEl.classList.add('show');
  OFF.myTalk = { until: show.clock + 2.2 };
  // 對方愣一下，再回一句或自己走掉
  talkEl.classList.remove('show');
  if (p && p.c) {
    const t0 = show.clock;
    OFF.pending = { p, at: t0 + 0.9, line: cold ? AFTER[Math.floor(Math.random() * AFTER.length)] : (Math.random() < 0.5 ? AFTER[Math.floor(Math.random() * AFTER.length)] : null) };
  }
  OFF.talk = null;
}
const _hp = new THREE.Vector3(), _mp = new THREE.Vector3();
function myTalkTick(t) {
  // 對方的回馬槍
  const P = OFF.pending;
  if (P && t >= P.at) {
    OFF.pending = null;
    if (P.line && OFF.state !== 'soul') {
      talkEl.textContent = P.line;
      OFF.talk = { c: P.p.c, p: P.p, until: t + 2.4 };
      talkEl.classList.add('show');
    }
  }
  const M = OFF.myTalk; if (!M) return;
  if (t > M.until || OFF.state === 'soul' || !OFF.me) { myTalkEl.classList.remove('show'); OFF.myTalk = null; return; }
  OFF.me.head.getWorldPosition(_mp); _mp.y += 0.5; _mp.project(ocam);
  myTalkEl.style.left = Math.min(Math.max((_mp.x * 0.5 + 0.5) * innerWidth, 110), innerWidth - 110) + 'px';
  myTalkEl.style.top = Math.max((-_mp.y * 0.5 + 0.5) * innerHeight, 60) + 'px';
}
function talkTick(t) {
  myTalkTick(t);
  const T = OFF.talk; if (!T) { hideReplies(); return; }
  if (t > T.until || OFF.state === 'soul') { talkEl.classList.remove('show'); OFF.talk = null; hideReplies(); return; }
  T.c.head.getWorldPosition(_hp); _hp.y += 0.55; _hp.project(ocam);
  talkEl.style.left = Math.min(Math.max((_hp.x * 0.5 + 0.5) * innerWidth, 110), innerWidth - 110) + 'px';
  talkEl.style.top = Math.max((-_hp.y * 0.5 + 0.5) * innerHeight, 60) + 'px';
}


/* ---------- 3D 靈魂：照 C 款（刺刺頭、鬆領帶、拿麥克風、往前指、幽靈尾巴） ---------- */
function ghostMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#8fdcff', emissive: '#2a9cf5', emissiveIntensity: 0.62, roughness: 0.4,
    transparent: true, opacity: 0.96, depthWrite: false, ...o });
  // 邊緣發光：越斜的面越亮
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 2.2);
      totalEmissiveRadiance += vec3(0.45, 0.85, 1.0) * fres * 1.1;`);
  };
  m.customProgramCacheKey = () => 'ghost';
  m.userData.baseOpacity = m.opacity;
  m.userData.baseEmi = m.emissiveIntensity;
  m.userData.tinted = true;   // 不要被辦公室的陰影上色蓋掉發光
  return m;
}
function soulFaceTex() {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const cx = 128, cy = 132, ink = '#0b3557';
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      g.beginPath(); g.ellipse(cx + s * 21, cy - 2, 6.5, 9, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * 21 + 2, cy - 5, 2.4, 0, Math.PI * 2); g.fill(); g.fillStyle = ink;
    }
    // 開心張嘴
    g.beginPath(); g.moveTo(cx - 12, cy + 14); g.quadraticCurveTo(cx, cy + 16, cx + 12, cy + 14); g.quadraticCurveTo(cx + 9, cy + 32, cx, cy + 33); g.quadraticCurveTo(cx - 9, cy + 32, cx - 12, cy + 14); g.fill();
    g.fillStyle = '#f39aa8'; g.beginPath(); g.ellipse(cx, cy + 27, 6, 3.5, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,170,200,.5)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 37, cy + 16, 12, 7, 0, 0, Math.PI * 2); g.fill(); }
  });
}
function buildSoul3D() {
  const root = new THREE.Group(), mats = [];
  const M = (o) => { const m = ghostMat(o); mats.push(m); return m; };
  const body = M(), bright = M({ color: '#c6efff', emissiveIntensity: 0.8 }), deep = M({ color: '#3f9ce8', emissive: '#1a74cc', emissiveIntensity: 0.5 });
  const torso = new THREE.Group(); torso.position.y = 0.08; root.add(torso);
  mesh(lathe([[0, 0], [0.27, 0], [0.31, 0.08], [0.3, 0.3], [0.25, 0.48], [0.12, 0.56], [0, 0.57]]), body, torso);
  // 鬆掉的領帶、衣領
  const tie = mesh(rbox(0.08, 0.26, 0.035, 0.015), deep, torso, 0.03, 0.3, 0.29); tie.rotation.z = 0.25;
  for (const s of [-1, 1]) { const c = mesh(rbox(0.12, 0.05, 0.08, 0.02), bright, torso, s * 0.08, 0.52, 0.17); c.rotation.z = s * 0.4; }
  // 尾巴是另外一條連續的光（makeSoulTail），從這裡一路接到本人頭頂
  // 頭：臉、耳朵、圓圓的頭髮（跟本人一樣）
  const head = new THREE.Group(); head.position.y = 0.78; torso.add(head);
  // 臉整個要亮：底色近白、再用同一張貼圖當自發光（五官是深色，所以不會跟著發光，表情還是清楚）
  const faceTex = soulFaceTex();
  mesh(sphere(0.4, 40, 24), M({ map: faceTex, emissiveMap: faceTex, color: '#f2fbff', emissive: '#d8f1ff', emissiveIntensity: 1.15, opacity: 1 }), head);
  for (const s of [-1, 1]) mesh(sphere(0.085, 12, 10), body, head, s * 0.39, -0.02, 0);
  // 頭髮：形狀、顏色都照本人來（不套靈魂的邊緣藍光，不然會被洗成白的）
  // 頭髮也是靈魂的藍，但用不吃光的材質，聚光燈才不會把它洗成白的
  const hairM = new THREE.MeshBasicMaterial({ color: '#3fa2e6', transparent: true, opacity: 1, depthWrite: true });
  hairM.userData.baseOpacity = 1; hairM.userData.baseEmi = 0; hairM.userData.tinted = true;
  mats.push(hairM);
  mats.push(hairM);
  const cap = mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, head); cap.rotation.x = -0.5;
  // 手：畫面左邊拿麥克風靠近嘴巴，畫面右邊自然伸出去（空手）
  const micArm = new THREE.Group(); micArm.position.set(-0.25, 0.46, 0); torso.add(micArm);
  limb([0, 0, 0], [0.04, 0.22, 0.3], 0.07, body, micArm);
  mesh(sphere(0.08, 12, 10), body, micArm, 0.05, 0.25, 0.33);
  const mic = new THREE.Group(); mic.position.set(0.08, 0.3, 0.38); mic.rotation.set(-0.6, 0, -0.5); micArm.add(mic);
  mesh(cyl(0.025, 0.02, 0.2, 10), deep, mic, 0, -0.06, 0);
  mesh(sphere(0.055, 14, 10), M({ color: '#7fcfff', emissive: '#2f9cf0', emissiveIntensity: 0.8 }), mic, 0, 0.07, 0);
  const pointArm = new THREE.Group(); pointArm.position.set(0.25, 0.46, 0); torso.add(pointArm);
  limb([0, 0, 0], [0.16, -0.3, 0.14], 0.07, body, pointArm);
  mesh(sphere(0.085, 12, 10), body, pointArm, 0.17, -0.33, 0.16);
  root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 5; } });
  cap.renderOrder = 7;   // 頭髮要蓋在頭上面
  root.userData = { mats, torso, head, micArm, pointArm };
  return root;
}
function makeSoulTail() {
  const N = 48, R = 16, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * (R + 1) * 3), 3));
  const idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  geo.setIndex(idx);
  const mat = ghostMat({ color: '#7fd2ff', emissiveIntensity: 0.55, opacity: 0.8 });
  const m = new THREE.Mesh(geo, mat); m.frustumCulled = false; m.renderOrder = 4; m.visible = false;
  return { mesh: m, geo, N, R, mat };
}
const _tc = new THREE.Vector3();
function updateTail(T, pts, r0, r1) {
  if (pts[0].distanceTo(pts[pts.length - 1]) < 0.12) { T.mesh.visible = false; return; }
  T.mesh.visible = true;
  const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(T.N, false), a = T.geo.attributes.position.array;
  for (let i = 0; i <= T.N; i++) {
    const t = i / T.N; curve.getPointAt(t, _tc);
    const r = r0 + (r1 - r0) * Math.pow(t, 0.7), n = fr.normals[i], bn = fr.binormals[i];
    for (let j = 0; j <= T.R; j++) {
      const ang = j / T.R * Math.PI * 2, c = Math.cos(ang) * r, s = Math.sin(ang) * r, k = (i * (T.R + 1) + j) * 3;
      a[k] = _tc.x + c * n.x + s * bn.x; a[k + 1] = _tc.y + c * n.y + s * bn.y; a[k + 2] = _tc.z + c * n.z + s * bn.z;
    }
  }
  T.geo.attributes.position.needsUpdate = true; T.geo.computeVertexNormals();
}
function soulGlow(s, boost) { for (const m of s.userData.mats) if (m.isMeshStandardMaterial) m.emissiveIntensity = m.userData.baseEmi + boost; }
function soulOpacity(s, op) { for (const m of s.userData.mats) m.opacity = m.userData.baseOpacity * op; }
// 靈魂的小動作：跟節拍點頭、指的手打拍子、尾巴擺動
function soulPose(s, t, bounce, b) {
  const u = s.userData, on = b >= 0;
  u.torso.rotation.set(0.05 + bounce * 0.06, on ? Math.sin(b * Math.PI / 2) * 0.12 : Math.sin(t * 0.8) * 0.08, on ? Math.sin(b * Math.PI / 2) * 0.06 : 0);
  u.head.rotation.set(-0.05 + bounce * 0.16, 0, 0);
  u.pointArm.rotation.set(-bounce * 0.35, 0, bounce * 0.15);
  u.micArm.rotation.set(Math.sin(t * 2) * 0.04, 0, 0);
}

/* ---------- 辦公室：3D 靈魂出竅 ---------- */
const SOUL_HOVER = new THREE.Vector3(0, 2.42, 3.55), _sf = new THREE.Vector3(), _sp = new THREE.Vector3();
function soulOut() {
  OFF.state = 'soul'; OFF.soulT0 = show.clock; OFF.soulUpT0 = null;
  document.body.classList.add('soul-dim');
  OFF.me.head.getWorldPosition(_sf); OFF.soulFrom = _sf.clone().add(new THREE.Vector3(0, -0.2, 0));
  talkEl.classList.remove('show'); OFF.talk = null;
  setOfficeUI();
}
const _tp = [0, 1, 2, 3, 4].map(() => new THREE.Vector3()), _hd = new THREE.Vector3();
function soul3dTick(t, bounce, b) {
  if (OFF.soulT0 == null || !office.active) return;
  const s = OFF.soulModel, T = OFF.tail, G = OFF.headGlow, since = t - OFF.soulT0;
  OFF.me.head.getWorldPosition(_hd); _hd.y += 0.36;   // 本人頭頂
  // 先在頭頂亮起一團光
  const glowIn = Math.min(since / 0.5, 1);
  G.visible = true; G.position.copy(_hd);
  const k = Math.min((since - 0.35) / 2.0, 1);
  setOfficeDim(Math.min(since / 0.8, 1), 1 / 60);
  if (k < 0) { s.visible = false; T.mesh.visible = false; G.scale.setScalar((0.3 + glowIn * 0.9) * 2.2); G.material.opacity = glowIn; return; }
  s.visible = true;
  const e = easeOut(k);
  // 靈魂從光裡長出來、往上飄
  _sp.copy(_hd).lerp(SOUL_HOVER, e);
  _sp.y += Math.sin(t * 1.7) * 0.07 * e + bounce * 0.05;
  let op = Math.min(1, k * 3), up = 0;
  if (OFF.soulUpT0 != null) { up = Math.min((t - OFF.soulUpT0) / 0.9, 1); _sp.y += up * up * 6; op *= 1 - up * 0.5; }
  s.position.copy(_sp);
  const sc = THREE.MathUtils.lerp(0.12, 0.86, e), stretch = (1 - e) * 0.7;
  s.scale.set(sc * (1 - stretch * 0.4) * (1 + bounce * 0.03), sc * (1 + stretch) * (1 - bounce * 0.04), sc * (1 + bounce * 0.03));
  s.rotation.y = Math.atan2(ocam.position.x - _sp.x, ocam.position.z - _sp.z) * 0.6;
  soulPose(s, t, bounce, b);
  soulOpacity(s, op);
  soulGlow(s, (1 - e) * 2.2);   // 剛冒出來時整個亮白
  // 尾巴：從靈魂身體底部，彎彎地接回本人頭頂；往上飛走時才斷開
  const sway = Math.sin(t * 1.9) * 0.18;
  _tp[0].set(0, 0.12, 0); s.localToWorld(_tp[0]);
  const end = _tp[4].copy(_hd).lerp(_tc.copy(_tp[0]).add(new THREE.Vector3(0.25, -0.9 * sc, 0)), up);
  _tp[1].copy(_tp[0]).add(new THREE.Vector3(sway * 0.5, -0.45 * sc, 0.05));
  _tp[2].copy(_tp[0]).lerp(end, 0.55).add(new THREE.Vector3(-sway, 0.05, 0.12));
  _tp[3].copy(end).add(new THREE.Vector3(sway * 0.4, 0.28 * (1 - up), 0.04));
  updateTail(T, _tp, 0.27 * sc, THREE.MathUtils.lerp(0.06, 0.015, up));
  T.mat.opacity = T.mat.userData.baseOpacity * op;
  T.mat.emissiveIntensity = T.mat.userData.baseEmi + (1 - e) * 2.0;
  // 頭頂的光：冒出來時最亮，之後留一點連著尾巴，飛走時熄掉
  G.scale.setScalar(THREE.MathUtils.lerp(3.0, 1.9, e) * (1 + bounce * 0.15));
  G.material.opacity = THREE.MathUtils.lerp(1, 0.78, e) * (1 - up);
  OFF.soulLight.position.copy(_sp).add(new THREE.Vector3(0, 0.9, 0.4)); OFF.soulLight.intensity = 26 * op;
}

/* ---------- 前段：公司 → 靈魂出竅唱 rap → 靈魂飛進小和尚 ---------- */
const office = {
  active: true,
  el: document.getElementById('office'),
  soulImg: document.getElementById('soul'),
  flash: document.getElementById('flash'),
  who: bubble.querySelector('.who'),
  fly: null, burst: null, sprite: null,
};
// 網址加 ?soul=a / b / c 可以換靈魂造型
const SOUL_PICK = (new URLSearchParams(location.search).get('soul') || 'c').replace(/[^abc]/g, '') || 'c';
office.soulImg.src = `assets/office/soul_${SOUL_PICK}.jpg`;
function drawScreen() {
  const v = q.value.trim();
  drawPlayerScreen(v);
}
q.addEventListener('input', () => { if (office.active) { drawScreen(); OFF.lastKey = show.clock; } });

function officeIntro() {
  drawScreen();
  bubble.classList.add('office');
  office.who.textContent = '你的靈魂';
  q.placeholder = '今天公司又發生什麼事⋯⋯';
  sendBtn.textContent = '送出';
  controls.enabled = false;
  setTimeout(setOfficeUI, 600);
}

// 送出抱怨：畫面一震，靈魂從身體飄出來，接著照原本的流程開始 rap
askForm.addEventListener('submit', e => {
  if (!office.active || show.mode !== 'idle') return;
  if (OFF.state !== 'seated') { e.preventDefault(); e.stopImmediatePropagation(); return; }
  const text = q.value.trim(); if (!text) return;
  drawPlayerScreen(text);
  soulOut();
  woosh(0.6, 240, 900);
}, { capture: true });

function woosh(dur, f0, f1) {
  ensureAudio();
  const t = audio.ctx.currentTime;
  noise(t, 0.22, dur, 'bandpass', f0, 2);
  tone('sine', f0, f1, t, 0.12, dur + 0.3);
}

/* ---------- 靈魂唱歌時，頭上那台 KTV ---------- */
const KTV_CATS = [
  { src: 'assets/office/cats/cat1.jpg', crop: 0.22 },
  { src: 'assets/office/cats/cat2.webp', crop: 0.19 },
  { src: 'assets/office/cats/cat3.jpg', crop: 0.19 },
  { src: 'assets/office/cats/cat4.webp', crop: 0 },
];
const KTV_CREDIT = '作曲：AI 小師父\n作詞：施主的苦水\nPublisher：職場功德所';
const ktv = {
  el: document.getElementById('ktv'),
  bg: document.getElementById('ktvBg'),
  kt: document.querySelector('#ktvHead .kt'),
  kc: document.querySelector('#ktvHead .kc'),
  on: document.querySelector('#ktvSub .on'),
  off: document.querySelector('#ktvSub .off'),
  l2: document.querySelector('#ktvSub .l2'),
  drawn: '',
};
// 每次開唱隨機挑一張貓咪當背景
function ktvOpen() {
  const c = KTV_CATS[Math.floor(Math.random() * KTV_CATS.length)];
  ktv.bg.src = c.src;
  ktv.bg.style.height = (100 / (1 - c.crop)) + '%';   // 原圖下面的字切掉
  ktv.drawn = ''; ktv.el.classList.remove('sing');
  ktv.kt.textContent = ''; ktv.kc.textContent = '';
  ktv.on.textContent = ''; ktv.off.textContent = ''; ktv.l2.textContent = '';
  ktv.el.classList.add('show');
}
function ktvClose() { ktv.el.classList.remove('show', 'sing'); ktv.el.style.visibility = 'hidden'; }
function ktvTick(b) {
  if (show.mode === 'waiting') {
    if (ktv.drawn !== 'wait') {
      ktv.drawn = 'wait'; ktv.el.classList.remove('sing');
      ktv.kt.textContent = '施主的苦水，正在變成歌詞'; ktv.kc.textContent = '作詞中⋯⋯請稍候';
    }
    return;
  }
  if (show.mode !== 'rap') return;
  const { lines, title } = show.rap;
  const idx = Math.floor(b / 4) - show.startBar;
  // 開唱前：KARAOKE 標題＋詞曲人
  if (idx < 0) {
    if (ktv.drawn !== 'ready') {
      ktv.drawn = 'ready'; ktv.el.classList.remove('sing');
      ktv.kt.textContent = `〈${title}〉`; ktv.kc.textContent = KTV_CREDIT;
    }
    return;
  }
  if (idx >= lines.length) { soulExit(); return; }
  if (voice.sungIdx !== idx) { voice.sungIdx = idx; sing(lines[idx], SPB() * 3.6); }
  const line = [...lines[idx]], prog = ((b % 4) / 4) * 1.25;
  const lit = Math.min(line.length, Math.ceil(prog * line.length));
  const key = `${idx}:${lit}`;
  if (ktv.drawn === key) return;
  ktv.drawn = key;
  ktv.el.classList.add('sing');
  ktv.on.textContent = line.slice(0, lit).join('');
  ktv.off.textContent = line.slice(lit).join('');
  ktv.l2.textContent = lines[idx + 1] || '';
}
// KTV 螢幕跟著靈魂的頭：x、y 是頭頂在畫面上的位置
function placeKtv(x, y, vis) {
  if (!ktv.el.classList.contains('show')) return;
  const kw = ktv.el.offsetWidth, kh = ktv.el.offsetHeight;
  ktv.el.style.left = Math.min(Math.max(x - kw / 2, 8), innerWidth - kw - 8) + 'px';
  ktv.el.style.top = Math.max(y - kh - 16, 8) + 'px';
  ktv.el.style.visibility = vis;
}
function hideKtv() { ktv.el.style.visibility = 'hidden'; }

// rap 唱完：靈魂往上飛出畫面 → 閃白 → 寺廟裡一道光飛進小和尚
function soulExit() {
  if (show.mode !== 'rap') return;
  show.mode = 'soul'; show.drawn = '';
  stopBeat();
  ktvClose();
  bubble.classList.remove('show', 'rap');
  OFF.soulUpT0 = show.clock;
  woosh(0.9, 300, 1400);
  setTimeout(() => office.flash.classList.add('on'), 550);
  setTimeout(() => {
    office.active = false;
    setOfficeDim(0, 1);
    document.body.classList.remove('soul-dim');
    office.el.classList.add('gone');
    document.body.classList.remove('office-on');
    bubble.classList.remove('office');
    office.who.textContent = '小師父';
    sendBtn.textContent = '上香';
    q.placeholder = '還有苦水？再說一次⋯⋯';
    controls.enabled = false;
    office.flash.classList.remove('on');
    startSoulFlight();
  }, 1050);
}

function soulSprite() {
  const tex = new THREE.TextureLoader().load(office.soulImg.src);
  tex.colorSpace = THREE.SRGBColorSpace;
  // 黑底當透明：用同一張圖的亮度當透明度，亮的背景上也看得出藍色身體
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, alphaMap: tex, color: new THREE.Color(1.5, 1.75, 2), transparent: true, depthTest: false, depthWrite: false, toneMapped: false }));
  s.renderOrder = 999;
  s.center.set(0.5, 0.5);
  return s;
}
function glowSprite() {
  const tex = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(170,220,255,.8)'); gr.addColorStop(1, 'rgba(120,190,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthTest: false, depthWrite: false }));
  s.renderOrder = 998;
  return s;
}
const SOUL_ASPECT = 896 / 1200;
function startSoulFlight() {
  office.sprite = OFF.soulModel; scene.add(office.sprite);   // 從辦公室搬到寺廟
  scene.add(OFF.tail.mesh); soulGlow(office.sprite, 0);
  // 從畫面正上方外面進來，畫一道弧線落到小和尚胸口
  const from = new THREE.Vector3(0, 1.35, 0.6).unproject(camera);
  from.sub(camera.position).normalize().multiplyScalar(5).add(camera.position);
  const to = new THREE.Vector3(0, 0.95, 0); monk.root.localToWorld(to);
  const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0.9, 1.2, 0));
  office.fly = { t0: show.clock, dur: 2.0, from, mid, to };
  office.sprite.visible = true;
  woosh(1.6, 500, 1800);
}
const bez = new THREE.Vector3();
function soulTick(t) {
  // 公司裡：靈魂跟著節拍點頭、左右晃
  if (office.active && office.el.classList.contains('soul')) {
    const b = beatPos(), on = (show.mode === 'rap' || show.mode === 'waiting') && b >= 0;
    const bounce = on ? (1 - (b % 1)) ** 3 : 0;
    const sway = on ? Math.sin(b * Math.PI / 2) * 4 : 0;
    office.soulImg.style.transform = `translateY(${bounce * 8}px) scale(${1 + bounce * 0.04}, ${1 - bounce * 0.03}) rotate(${sway}deg)`;
  }
  // 寺廟裡：發光的靈魂沿弧線飛進小和尚
  const f = office.fly;
  if (f) {
    const k = Math.min((t - f.t0) / f.dur, 1), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
    const u = 1 - e;
    bez.copy(f.from).multiplyScalar(u * u).addScaledVector(f.mid, 2 * u * e).addScaledVector(f.to, e * e);
    const s = office.sprite;
    s.position.copy(bez);
    s.scale.setScalar(THREE.MathUtils.lerp(1.15, 0.22, e));
    s.rotation.y = Math.atan2(camera.position.x - bez.x, camera.position.z - bez.z);
    soulPose(s, t, 0, -1);
    const fop = k < 0.85 ? 1 : 1 - (k - 0.85) / 0.15;
    soulOpacity(s, fop);
    const sc = s.scale.x, sw = Math.sin(t * 3) * 0.12;
    _tp[0].set(0, 0.12, 0); s.localToWorld(_tp[0]);
    _tp[1].copy(_tp[0]).add(new THREE.Vector3(sw * sc, -0.35 * sc, 0));
    _tp[2].copy(_tp[0]).add(new THREE.Vector3((0.2 - sw) * sc, -0.66 * sc, 0));
    _tp[3].copy(_tp[0]).add(new THREE.Vector3(0.4 * sc, -0.78 * sc, 0));
    _tp[4].copy(_tp[0]).add(new THREE.Vector3(0.5 * sc, -0.64 * sc, 0));
    updateTail(OFF.tail, _tp, 0.27 * sc, 0.02 * sc);
    OFF.tail.mat.opacity = OFF.tail.mat.userData.baseOpacity * fop;
    if (k >= 1) {
      office.fly = null; office.sprite.visible = false; OFF.tail.mesh.visible = false;
      if (!office.burst) { office.burst = glowSprite(); scene.add(office.burst); }
      office.burst.position.copy(f.to); office.burst.visible = true; office.burstAt = t;
      setTimeout(() => { controls.enabled = true; show.mode = 'rap'; kneelDown(); }, 350);
    }
  }
  // 進到身體的那一下：一圈光散開
  if (office.burst && office.burst.visible) {
    const k = (t - office.burstAt) / 1.1;
    if (k >= 1) office.burst.visible = false;
    else { const s = 0.4 + easeOut(k) * 3.2; office.burst.scale.set(s, s, 1); office.burst.material.opacity = 1 - k; }
  }
}

export { OFF, buildOffice, hideKtv, ktvOpen, ktvTick, ocam, office, officeIntro, officeScene, officeTick, placeKtv, soulExit, soulTick };
// 結局（ending.js）用的
export { ME_POS, OBACK, SEAT_STAND, SOUL_HOVER, cupMesh, goTo, holdInHand, sitDown, soulGlow, soulOpacity, soulPose, standUp, woosh };
