// 小和尚在寺廟裡用鍵盤走動。
// 落地字卡結束後進入自由探索（show.mode 是 'roam'）：方向鍵／WASD 走動，按住 Shift 跑步。
// 打開互動點（'spot'）、跪下敲木魚（'knock'）時不能走；walkTo() 讓小和尚自己走到指定位置，例如木魚前。
// 走動時鏡頭會左右跟著小和尚，手機直式畫面比較窄也不會走出畫面。
// 主要負責：安淇（foraianother8-ann）
import * as THREE from 'three';
import { show, q } from './ui.js';
import { camera, controls } from './core.js';
import { SPOT_BLOCKS, spotsTick } from './temple-spots.js';

const HOME = new THREE.Vector3(0.2, 0, 3.6);                 // 小和尚的出生點（characters.js 的 buildMonk）
const AREA = { x0: -6.6, x1: 7.2, z0: -1.2, z1: 4.8 };        // 大殿前半部：不會走進佛桌和跪拜的人，也不會貼到鏡頭前
// 站著拜拜的香客（characters.js 的 buildPeople）與互動點的桌子、門柱：走路時繞開
const BLOCKS = [[-5.0, -0.2, 0.45], [3.7, -0.2, 0.45], [-5.0, -2.0, 0.45], [5.0, -2.0, 0.45], ...SPOT_BLOCKS];
const BODY_R = 0.3;
const KEY_DIR = {
  ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};
const keysDown = new Set();
const walk = { last: 0, phase: 0, yaw: 0.06, target: null, onArrive: null };
const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3();

// 提示：自由探索時才出現
const hint = document.createElement('div');
hint.id = 'walkKeys';
hint.textContent = '方向鍵／WASD 走動・Shift 跑步・走進光圈按 E';
hint.hidden = true;
document.body.append(hint);

addEventListener('keydown', e => {
  if (document.activeElement === q) return;
  if (KEY_DIR[e.code]) {
    if (show.mode === 'roam') e.preventDefault();
    keysDown.add(e.code);
  } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    keysDown.add(e.code);
  }
});
addEventListener('keyup', e => keysDown.delete(e.code));
addEventListener('blur', () => keysDown.clear());

// 自己走到 (x, z)，到了呼叫 done；預設走回原位
function walkTo(done, x = HOME.x, z = HOME.z) {
  walk.target = new THREE.Vector3(x, 0, z);
  walk.onArrive = done || null;
}

function turnToward(want, dt, speed) {
  let d = want - walk.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  walk.yaw += d * Math.min(1, dt * speed);
}

function pushOut(pos) {
  pos.x = Math.min(AREA.x1, Math.max(AREA.x0, pos.x));
  pos.z = Math.min(AREA.z1, Math.max(AREA.z0, pos.z));
  for (const [bx, bz, r] of BLOCKS) {
    const dx = pos.x - bx, dz = pos.z - bz, d = Math.hypot(dx, dz), min = r + BODY_R;
    if (d < min && d > 1e-4) { pos.x = bx + dx / d * min; pos.z = bz + dz / d * min; }
  }
}

// 鏡頭左右跟著小和尚（鏡頭飛行中不跟）
function follow(pos, dt) {
  // 修行區＋山門的中心在 x = -0.6（temple.js 的 ROAM_T）；走遠時鏡頭只跟一部分，修行區還留在畫面裡
  const want = -0.6 + THREE.MathUtils.clamp((pos.x + 0.6) * 0.6, -2.4, 2.4);
  const dx = (want - controls.target.x) * Math.min(1, dt * 2.2);
  controls.target.x += dx; camera.position.x += dx;
}

// temple.js 的 stageTick 每一格呼叫（只在寺廟裡）；c 是小和尚，canFollow 是鏡頭可不可以跟
function walkTick(t, c, canFollow = true) {
  const dt = Math.min(0.05, t - (walk.last || t)); walk.last = t;
  const roaming = show.mode === 'roam';
  hint.hidden = !roaming;
  const pos = c.root.position;
  let moving = false;
  const running = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');

  if (walk.target) {
    // 自己走過去
    const dx = walk.target.x - pos.x, dz = walk.target.z - pos.z, dist = Math.hypot(dx, dz);
    if (dist > 0.04) {
      const step = Math.min(dist, 1.8 * dt);
      pos.x += dx / dist * step; pos.z += dz / dist * step;
      turnToward(Math.atan2(dx, dz), dt, 10);
      moving = true;
    } else {
      pos.x = walk.target.x; pos.z = walk.target.z;
      const done = walk.onArrive;
      walk.target = null; walk.onArrive = null;
      done && done();
    }
  } else if (roaming) {
    // 鍵盤：方向跟著鏡頭，「上」就是往畫面裡面走
    let kx = 0, kz = 0;
    for (const k of keysDown) if (KEY_DIR[k]) { kx += KEY_DIR[k][0]; kz += KEY_DIR[k][1]; }
    if (kx || kz) {
      camera.getWorldDirection(camFwd); camFwd.y = 0; camFwd.normalize();
      camRight.set(-camFwd.z, 0, camFwd.x);
      const mx = camFwd.x * kz + camRight.x * kx, mz = camFwd.z * kz + camRight.z * kx;
      const len = Math.hypot(mx, mz), step = (running ? 2.6 : 1.3) * dt;
      pos.x += mx / len * step; pos.z += mz / len * step;
      pushOut(pos);
      turnToward(Math.atan2(mx, mz), dt, 12);
      moving = true;
    }
  }
  // 蒲團跟著小和尚，跪下時剛好在膝蓋下
  c.cushion.position.set(pos.x, 0, pos.z - 0.05);
  if (canFollow && (roaming || walk.target)) follow(pos, dt);
  spotsTick(t, pos);

  if (moving) {
    walk.phase += dt * (running && !walk.target ? 11 : 8);
    const sw = Math.sin(walk.phase);
    c.root.rotation.y = walk.yaw;
    c.root.position.y = Math.abs(sw) * 0.04;
    for (const l of c.legs) l.visible = true;
    c.legs[0].rotation.x = sw * 0.5; c.legs[1].rotation.x = -sw * 0.5;
    c.palms.visible = false;
    for (const a of c.arms) { a.children[1].visible = true; a.scale.y = 1; }
    c.arms[0].rotation.set(-sw * 0.45, 0, 0.12);
    c.arms[1].rotation.set(sw * 0.45, 0, -0.12);
    c.torso.rotation.set(0.04, 0, 0);
    c.head.rotation.set(0, Math.sin(t * 0.6) * 0.25, 0);
  } else {
    for (const l of c.legs) l.rotation.x = 0;
    if (roaming || show.mode === 'spot') {
      // 停下來時慢慢轉回面向鏡頭
      turnToward(0.06, dt, 4);
      c.root.rotation.y = walk.yaw;
    } else {
      walk.yaw = c.root.rotation.y;
    }
  }
}

export { HOME, walkTick, walkTo };
