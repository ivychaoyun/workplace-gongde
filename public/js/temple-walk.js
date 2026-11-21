// 小和尚在寺廟裡用鍵盤走動。
// 敲完木魚（show.mode 是 'done'）後，按方向鍵／WASD 起身走動（'roam'），按住 Shift 跑步；
// 按空白鍵走回蒲團、跪下繼續敲；寫新的苦水時也會自己走回原位再開唱。
// 之後做第三幕的自由走動與互動點，可以從這裡接著做。
// 主要負責：安淇（foraianother8-ann）
import * as THREE from 'three';
import { show, q } from './ui.js';
import { camera } from './core.js';

const HOME = new THREE.Vector3(-0.25, 0, 4.6);                 // 小和尚原本站的位置（characters.js 的 buildMonk）
const AREA = { x0: -3.5, x1: 3.5, z0: 1.2, z1: 4.8 };         // 大殿前半部：不會走進佛桌和跪拜的人，也不會貼到鏡頭前
const KEY_DIR = {
  ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0],
};
const keysDown = new Set();
const walk = { last: 0, phase: 0, yaw: 0.06, returning: false };
const camFwd = new THREE.Vector3(), camRight = new THREE.Vector3();

// 提示：敲完木魚後才出現
const hint = document.createElement('div');
hint.id = 'walkKeys';
hint.textContent = '方向鍵／WASD 起來走走・Shift 跑步・空白鍵回蒲團';
hint.hidden = true;
document.body.append(hint);

addEventListener('keydown', e => {
  if (document.activeElement === q) return;
  if (KEY_DIR[e.code]) {
    if (show.mode === 'done') { show.mode = 'roam'; walk.returning = false; }
    if (show.mode === 'roam') { keysDown.add(e.code); e.preventDefault(); }
  } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
    keysDown.add(e.code);
  } else if (e.code === 'Space' && show.mode === 'roam') {
    e.preventDefault();
    walk.returning = true; // 走回蒲團，到了再跪下
  }
});
addEventListener('keyup', e => keysDown.delete(e.code));
addEventListener('blur', () => keysDown.clear());

function turnToward(want, dt, speed) {
  let d = want - walk.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  walk.yaw += d * Math.min(1, dt * speed);
}

// temple.js 的 stageTick 每一格呼叫（只在寺廟裡）；c 是小和尚
function walkTick(t, c) {
  const dt = Math.min(0.05, t - (walk.last || t)); walk.last = t;
  hint.hidden = !['done', 'roam'].includes(show.mode);
  const pos = c.root.position;
  const roaming = show.mode === 'roam';
  let moving = false;
  const running = keysDown.has('ShiftLeft') || keysDown.has('ShiftRight');

  // 鍵盤：方向跟著鏡頭，「上」就是往畫面裡面走
  let kx = 0, kz = 0;
  if (roaming && !walk.returning) for (const k of keysDown) if (KEY_DIR[k]) { kx += KEY_DIR[k][0]; kz += KEY_DIR[k][1]; }
  if (kx || kz) {
    camera.getWorldDirection(camFwd); camFwd.y = 0; camFwd.normalize();
    camRight.set(-camFwd.z, 0, camFwd.x);
    const mx = camFwd.x * kz + camRight.x * kx, mz = camFwd.z * kz + camRight.z * kx;
    const len = Math.hypot(mx, mz), step = (running ? 2.6 : 1.3) * dt;
    pos.x = Math.min(AREA.x1, Math.max(AREA.x0, pos.x + mx / len * step));
    pos.z = Math.min(AREA.z1, Math.max(AREA.z0, pos.z + mz / len * step));
    turnToward(Math.atan2(mx, mz), dt, 12);
    moving = true;
  } else if (!roaming || walk.returning) {
    // 不在走動模式（例如開唱）或按了空白鍵：自己走回原位
    const dx = HOME.x - pos.x, dz = HOME.z - pos.z, dist = Math.hypot(dx, dz);
    if (dist > 0.04) {
      const step = Math.min(dist, 1.8 * dt);
      pos.x += dx / dist * step; pos.z += dz / dist * step;
      turnToward(Math.atan2(dx, dz), dt, 10);
      moving = true;
    } else {
      pos.x = HOME.x; pos.z = HOME.z;
      if (walk.returning) { walk.returning = false; show.mode = 'done'; }
    }
  }
  // 蒲團跟著小和尚，跪下時剛好在膝蓋下
  c.cushion.position.set(pos.x, 0, pos.z - 0.05);

  if (moving) {
    walk.phase += dt * (running ? 11 : 8);
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
    if (roaming) {
      // 停下來時慢慢轉回面向施主
      turnToward(0.06, dt, 4);
      c.root.rotation.y = walk.yaw;
    } else {
      walk.yaw = c.root.rotation.y;
    }
  }
}

export { walkTick };
