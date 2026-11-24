// 結局：功德單之後按「回到公司」→ 靈魂飄回趴在桌上的身體 → 醒來、顏色恢復
// → 在辦公室自由走：茶水間、窗邊、回座位三個發光的地方 → 結尾字卡、再寄放一次。
// 對應劇本 docs/劇本.md 的「結局｜回到公司：重新開始」。
// 主要負責：趙芸（chaoyun）
import * as THREE from 'three';
import { show } from './ui.js';
import { canvasTex, renderer } from './core.js';
import {
  OFF, office, officeScene, SEAT_STAND, SOUL_HOVER,
  cupMesh, holdInHand, sitDown, soulGlow, soulOpacity, soulPose, standUp, woosh,
} from './office.js';

const $ = (id) => document.getElementById(id);
const caption = $('endCaption'), card = $('ending'), walkHint = $('walkHint');
const END = { phase: null, t0: 0, from: new THREE.Vector3(), act: null, done: new Set(), leftSeat: false };
window.__ending = { END, OFF };   // 除錯用：在瀏覽器主控台看結局的狀態

// 三個發光的地方：face 是走到那裡後要面向的方向
const SPOTS = [
  { id: 'tea', label: '☕ 茶水間', x: -1.15, z: -5.25, face: -Math.PI / 2, caption: '先照顧自己，再照顧工作。' },
  { id: 'window', label: '🪟 窗邊', x: 0, z: -5.7, face: Math.PI, caption: '天還很大，事情沒有那麼大。' },
  { id: 'seat', label: '💻 回座位', x: SEAT_STAND.x, z: SEAT_STAND.z, caption: '用自己的步調，一件一件來。' },
];
const REACH = 0.6;   // 走到圈圈裡多近算到了
const ROAM_HINT = '走到發光的地方：☕ 茶水間、🪟 窗邊，或 💻 回座位（WASD／方向鍵，或點地板）';

/* ---------- 地上的光圈與名牌 ---------- */
function labelSprite(text, done) {
  const tex = canvasTex(320, 96, (g, w, h) => {
    g.fillStyle = done ? 'rgba(120,120,120,.85)' : 'rgba(255,250,240,.95)';
    g.beginPath(); g.roundRect(6, 10, w - 12, h - 20, 36); g.fill();
    g.fillStyle = done ? '#fff' : '#8a4a22';
    g.font = '700 40px "Noto Sans TC", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(done ? `✓ ${text.replace(/^\S+ /, '')}` : text, w / 2, h / 2 + 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(1.25, 0.375, 1); s.renderOrder = 997;
  return s;
}
function buildMarkers() {
  for (const p of SPOTS) {
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.visible = false; officeScene.add(g);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffcf5a', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.56, 48), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    const discMat = new THREE.MeshBasicMaterial({ color: '#fff1c2', transparent: true, opacity: 0.25, depthWrite: false });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), discMat); disc.rotation.x = -Math.PI / 2; disc.position.y = 0.015; g.add(disc);
    const label = labelSprite(p.label, false); label.position.y = 2.1; g.add(label);
    p.marker = { g, ringMat, discMat, label };
  }
}
function markDone(p) {
  END.done.add(p.id);
  const m = p.marker;
  m.g.remove(m.label); m.label = labelSprite(p.label, true); m.label.position.y = 2.1; m.g.add(m.label);
  m.ringMat.color.set('#bdbdbd');
}

/* ---------- 茶水間的熱氣、窗外變亮 ---------- */
const steam = [];
function buildSteam() {
  const m = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), m.clone()); s.visible = false; officeScene.add(s); steam.push({ s, ph: i / 6 }); }
}
let glass = null, winLight = null;
function findWindow() {
  // 窗戶玻璃是有 emissiveMap 的材質；窗邊的補光是淡藍色的點光源（都在 office.js 的 buildOfficeRoom）
  glass = []; officeScene.traverse(o => {
    if (o.isMesh && o.material && o.material.emissiveMap) glass.push(o.material);
    if (o.isPointLight && o.color.getHexString() === 'dff0ff') winLight = o;
  });
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
    OFF.state = 'soul'; OFF.frozen = false;
    if (!SPOTS[0].marker) { buildMarkers(); buildSteam(); findWindow(); }
    END.phase = 'descend'; END.t0 = show.clock;
    END.from.copy(SOUL_HOVER).add(new THREE.Vector3(0, 1.6, 0));
    office.flash.classList.remove('on');
  }, 550);
}

const _head = new THREE.Vector3(), _p = new THREE.Vector3(), _cup = new THREE.Vector3();
const ease = (k) => 1 - (1 - k) ** 3;

// main.js 的主迴圈在 officeTick 之後呼叫，所以這裡設定的姿勢會蓋過 office.js
function endingTick(t) {
  if (!END.phase) return;
  const me = OFF.me, since = t - END.t0;

  // 1. 靈魂從上面飄下來，鑽回頭頂
  if (END.phase === 'descend') {
    const k = Math.min(since / 2.2, 1), e = ease(k), s = OFF.soulModel, G = OFF.headGlow;
    me.head.getWorldPosition(_head); _head.y += 0.3;
    _p.copy(END.from).lerp(_head, e); _p.y += Math.sin(t * 1.7) * 0.05 * (1 - e);
    s.visible = true; s.position.copy(_p);
    s.scale.setScalar(THREE.MathUtils.lerp(1, 0.12, e));
    s.rotation.y = 0;
    soulPose(s, t, 0, -1);
    soulOpacity(s, 1 - e * 0.7);
    soulGlow(s, e * 2.2);
    G.visible = true; G.position.copy(_head); G.scale.setScalar(0.4 + e * 0.8); G.material.opacity = e;
    OFF.soulLight.position.copy(_p); OFF.soulLight.intensity = 6;
    if (k >= 1) {
      s.visible = false; OFF.soulLight.intensity = 0;
      woosh(0.5, 1800, 500);                 // 咻
      END.phase = 'wake'; END.t0 = t;
    }
    return;
  }

  // 2. 醒來：身體慢慢坐直，頭頂的光散開
  if (END.phase === 'wake') {
    const k = Math.min(since / 0.9, 1), e = ease(k), G = OFF.headGlow;
    G.scale.setScalar(1.2 + e * 2.5); G.material.opacity = 1 - e;
    me.torso.rotation.x = THREE.MathUtils.lerp(0.72, 0.08, e);
    me.head.rotation.set(THREE.MathUtils.lerp(0.45, 0.1, e), 0, THREE.MathUtils.lerp(0.25, 0, e));
    if (k >= 1) {
      G.visible = false;
      sitDown();                             // 回到第一人稱，看著自己的螢幕
      // 顏色從中間暈開恢復
      renderer.domElement.style.transition = 'filter 1.8s ease';
      requestAnimationFrame(() => { renderer.domElement.style.filter = 'grayscale(0)'; });
      $('endRipple').classList.remove('go'); void $('endRipple').offsetWidth; $('endRipple').classList.add('go');
      END.phase = 'look'; END.t0 = t;
    }
    return;
  }

  // 3. 看一下螢幕，然後站起來
  if (END.phase === 'look') {
    if (since > 2.0) {
      renderer.domElement.style.filter = '';
      standUp(true);
      END.leftSeat = false;
      for (const p of SPOTS) p.marker.g.visible = true;
      walkHint.textContent = ROAM_HINT;
      END.phase = 'roam'; END.t0 = t;
    }
    return;
  }

  // 光圈閃爍
  for (const p of SPOTS) {
    const m = p.marker; if (!m || !m.g.visible) continue;
    const on = !END.done.has(p.id);
    m.ringMat.opacity = on ? 0.55 + Math.sin(t * 3 + p.x) * 0.3 : 0.4;
    m.discMat.opacity = on ? 0.18 + Math.sin(t * 3 + p.x) * 0.1 : 0.08;
    m.label.position.y = 2.1 + Math.sin(t * 1.6 + p.z) * 0.06;
  }

  // 4. 自由走：走到哪個光圈就做那件事
  if (END.phase === 'roam') {
    if (OFF.state === 'seated') { startAct(SPOTS[2], t); return; }   // 點自己的電腦走回去坐下，也算
    if (OFF.state !== 'walk') return;
    const pos = me.root.position;
    if (Math.hypot(pos.x - SEAT_STAND.x, pos.z - SEAT_STAND.z) > 1.2) END.leftSeat = true;
    for (const p of SPOTS) {
      if (END.done.has(p.id)) continue;                 // 做過的（打勾的）不會再觸發
      if (p.id === 'seat' && !END.leftSeat) continue;   // 剛站起來就在座位旁，要先走開才算
      if (Math.hypot(pos.x - p.x, pos.z - p.z) < REACH) { startAct(p, t); return; }
    }
    return;
  }

  // 5. 做那件事（約 3 秒），期間不能走
  if (END.phase === 'act') {
    const p = END.act, k = Math.min(since / 3.2, 1);
    if (p.id === 'tea') teaPose(t, since);
    if (p.id === 'window') windowPose(t, since);
    if (since > 1.0 && !caption.classList.contains('show')) { caption.textContent = p.caption; caption.classList.add('show'); }
    if (k >= 1) finishAct(p);
  }
}

function startAct(p, t) {
  END.act = p; END.phase = 'act'; END.t0 = t;
  OFF.frozen = true; OFF.path = []; OFF.keys.clear();
  walkHint.textContent = '';
  const me = OFF.me;
  if (p.id === 'tea') {
    me.root.position.set(p.x, 0, p.z); me.root.rotation.y = p.face;
    if (!END.cup) END.cup = holdInHand(me, 1, cupMesh('#ffffff', 0.12, 0.05));
    END.cup.visible = true;
  } else if (p.id === 'window') {
    me.root.position.set(p.x, 0, p.z); me.root.rotation.y = p.face;
  } else if (p.id === 'seat') {
    if (OFF.state !== 'seated') sitDown();
    drawStickyNote();
  }
}

function teaPose(t, since) {
  const me = OFF.me, up = Math.min(since / 0.8, 1);
  me.root.position.y = 0;
  for (const l of me.legs) l.rotation.x = 0;
  me.arms[0].rotation.set(0.05, 0, 0.12);
  me.arms[1].rotation.set(THREE.MathUtils.lerp(-0.3, -2.0, up), 0, THREE.MathUtils.lerp(-0.12, -0.6, up));
  me.head.rotation.set(THREE.MathUtils.lerp(0, -0.15, up), 0, 0);
  // 熱氣從杯口往上飄
  END.cup.getWorldPosition(_cup);
  for (const st of steam) {
    const u = ((t * 0.5 + st.ph) % 1);
    st.s.visible = since > 0.6;
    st.s.position.set(_cup.x + Math.sin((u + st.ph) * 9) * 0.05, _cup.y + 0.12 + u * 0.55, _cup.z + Math.cos((u + st.ph) * 7) * 0.04);
    st.s.scale.setScalar(0.6 + u * 1.6);
    st.s.material.opacity = 0.55 * Math.sin(u * Math.PI);
  }
}

function windowPose(t, since) {
  const me = OFF.me, up = ease(Math.min(since / 1.0, 1));
  me.root.position.y = 0;
  for (const l of me.legs) l.rotation.x = 0;
  for (const a of me.arms) a.rotation.set(THREE.MathUtils.lerp(0, -2.95, up), 0, THREE.MathUtils.lerp(0.12, 0.28, up) * a.userData.s);
  me.torso.rotation.set(-0.12 * up, 0, Math.sin(t * 2) * 0.05 * up);
  me.head.rotation.set(-0.25 * up, 0, 0);
  // 窗外變亮
  const k = Math.min(since / 1.6, 1);
  for (const m of glass) m.emissiveIntensity = 0.8 + k * 1.1;
  if (winLight) winLight.intensity = 12 + k * 14;
}

function drawStickyNote() {
  const s = OFF.screen; if (!s) return;
  const g = s.g;
  g.save();
  g.translate(330, 110); g.rotate(-0.06);
  g.fillStyle = '#ffe36e'; g.fillRect(0, 0, 160, 150);
  g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, 160, 18);
  g.fillStyle = '#4a3b12'; g.font = '700 30px "Noto Sans TC", sans-serif'; g.textBaseline = 'top';
  g.fillText('先問清楚', 16, 40);
  g.font = '500 20px "Noto Sans TC", sans-serif';
  g.fillText('一件一件來', 18, 92);
  g.restore();
  s.tex.needsUpdate = true;
}

function finishAct(p) {
  markDone(p);
  if (p.id === 'tea') { END.cup.visible = false; for (const st of steam) st.s.visible = false; }
  caption.classList.remove('show');
  END.phase = 'card';
  card.classList.add('show');
}

// 結尾字卡的按鈕
$('endMore').addEventListener('click', () => {
  card.classList.remove('show');
  OFF.frozen = false;
  if (OFF.state === 'seated') standUp(true);
  END.leftSeat = false;
  walkHint.textContent = ROAM_HINT;
  END.phase = 'roam';
});
// 再寄放一次：重新載入，從第一幕的辦公室重新開始（功德數會保留在瀏覽器裡）
$('endAgain').addEventListener('click', () => location.reload());
$('toOffice').addEventListener('click', startEnding);

// 測試用捷徑：網址加 ?ending 會跳過前面，載入完直接進結局
if (new URLSearchParams(location.search).has('ending')) {
  const wait = setInterval(() => { if (window.__ready && OFF.me) { clearInterval(wait); setTimeout(startEnding, 800); } }, 200);
}

export { endingTick };
