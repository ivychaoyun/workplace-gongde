// 寺廟建築與香煙：牆、柱子、匾額、佛像、佛桌、蒲團、燈籠。
// 主要負責：安淇（foraianother8-ann）
import * as THREE from 'three';
import { GOLD, GOLD_SOFT, SERIF, canvasTex, cyl, faceTex, lathe, limb, mat, mesh, plaqueTex, rbox, rnd, scene, sphere } from './core.js';

/* ---------- 場景 ---------- */
const W = 16, BACK = -8, FRONT = 5.6, H = 8;
const anim = { lanterns: [], flames: [], people: [], smoke: [] };

function buildShell() {
  // 石板地
  const floorTex = canvasTex(512, 512, (g, w) => {
    g.fillStyle = '#b9a690'; g.fillRect(0, 0, w, w);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = `hsl(${30 + rnd() * 6}, ${16 + rnd() * 8}%, ${76 + rnd() * 6}%)`;
      g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(4, 4);
  const floor = mesh(new THREE.PlaneGeometry(W, 16), mat('#ffffff', { map: floorTex, roughness: 0.9 }), scene, 0, 0, 0);
  floor.rotation.x = -Math.PI / 2; floor.castShadow = false;

  // 紅地毯
  const carpetLen = FRONT + 0.6 + 4.6;
  const carpetTex = canvasTex(256, 256, (g, w) => {
    g.fillStyle = '#a8342c'; g.fillRect(0, 0, w, w);
    g.fillStyle = '#e0a84a'; g.fillRect(10, 0, 8, w); g.fillRect(w - 18, 0, 8, w);
    g.fillStyle = '#8f2723'; g.fillRect(24, 0, 4, w); g.fillRect(w - 28, 0, 4, w);
    g.fillStyle = 'rgba(230,170,80,.55)';
    for (const [x, y] of [[w / 2, w / 4], [w / 2, w * 3 / 4]]) {
      g.beginPath(); g.moveTo(x, y - 26); g.lineTo(x + 26, y); g.lineTo(x, y + 26); g.lineTo(x - 26, y); g.closePath(); g.fill();
    }
  });
  carpetTex.wrapT = THREE.RepeatWrapping; carpetTex.repeat.set(1, carpetLen / 3.6);
  const carpet = mesh(new THREE.PlaneGeometry(3.6, carpetLen), mat('#ffffff', { map: carpetTex, roughness: 0.95 }), scene, 0, 0.012, -4.6 + carpetLen / 2);
  carpet.rotation.x = -Math.PI / 2; carpet.castShadow = false;

  // 牆
  const wallRed = mat('#a8302a'), cream = mat('#eedfc8'), deepRed = mat('#7a1d1a');
  mesh(new THREE.BoxGeometry(W + 0.6, H, 0.3), wallRed, scene, 0, H / 2, BACK - 0.15);
  const sideLen = FRONT - BACK;
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.3, H, sideLen), cream, scene, s * (W / 2 + 0.15), H / 2, (FRONT + BACK) / 2);
    mesh(new THREE.BoxGeometry(0.12, 0.9, sideLen), wallRed, scene, s * (W / 2 - 0.05), 0.45, (FRONT + BACK) / 2);
    for (const z of [-6.8, -1.0, 0.9, 4.8]) mesh(new THREE.BoxGeometry(0.16, 5.6, 0.32), wallRed, scene, s * (W / 2 - 0.06), 3.7, z);
  }

  // 彩繪樑
  const beamTex = canvasTex(1024, 128, (g, w, h) => {
    g.fillStyle = '#3e7d70'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#2c5d55'; g.fillRect(0, h * 0.35, w, h * 0.3);
    g.fillStyle = '#e3b04f'; g.fillRect(0, 0, w, 10); g.fillRect(0, h - 10, w, 10);
    for (let x = 64; x < w; x += 128) {
      g.fillStyle = '#e3b04f'; g.beginPath(); g.ellipse(x, h / 2, 34, 22, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#b8352d'; g.beginPath(); g.ellipse(x, h / 2, 20, 12, 0, 0, Math.PI * 2); g.fill();
    }
  });
  beamTex.wrapS = THREE.RepeatWrapping;
  const backBeamTex = beamTex.clone(); backBeamTex.repeat.set(4, 1); backBeamTex.needsUpdate = true;
  const sideBeamTex = beamTex.clone(); sideBeamTex.repeat.set(3.4, 1); sideBeamTex.needsUpdate = true;
  mesh(new THREE.BoxGeometry(W, 0.8, 0.25), mat('#fff', { map: backBeamTex }), scene, 0, 6.5, BACK + 0.13);
  for (const s of [-1, 1]) {
    const b = mesh(new THREE.BoxGeometry(sideLen, 0.8, 0.25), mat('#fff', { map: sideBeamTex }), scene, s * (W / 2 - 0.13), 6.5, (FRONT + BACK) / 2);
    b.rotation.y = Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.3, 0.12, sideLen), GOLD_SOFT(), scene, s * (W / 2 - 0.12), 6.96, (FRONT + BACK) / 2);
  }
  mesh(new THREE.BoxGeometry(W, 0.12, 0.3), GOLD_SOFT(), scene, 0, 6.96, BACK + 0.12);
  // 上方木板牆
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.2, 1.0, sideLen), mat('#6d3a24'), scene, s * (W / 2 - 0.08), 7.5, (FRONT + BACK) / 2);
  mesh(new THREE.BoxGeometry(W, 1.0, 0.2), mat('#6d3a24'), scene, 0, 7.5, BACK + 0.08);

  // 天花板（只從下面看得到）與椽木
  const ceil = mesh(new THREE.PlaneGeometry(W + 0.6, sideLen + 0.4), mat('#5c2f1d'), scene, 0, H, (FRONT + BACK) / 2);
  ceil.rotation.x = Math.PI / 2;
  for (let z = BACK + 0.6; z < FRONT; z += 1.1) mesh(new THREE.BoxGeometry(W, 0.18, 0.22), mat('#7a3f25'), scene, 0, H - 0.12, z);
  for (const x of [-4.4, 4.4]) mesh(new THREE.BoxGeometry(0.3, 0.32, sideLen), mat('#8a2a22'), scene, x, H - 0.3, (FRONT + BACK) / 2);

  // 佛龕背板
  mesh(new THREE.BoxGeometry(8, 6, 0.1), deepRed, scene, 0, 3.4, BACK + 0.05);
  for (const [w, h, x, y] of [[8.2, 0.14, 0, 6.4], [8.2, 0.14, 0, 0.4], [0.14, 6, -4.05, 3.4], [0.14, 6, 4.05, 3.4]])
    mesh(new THREE.BoxGeometry(w, h, 0.16), GOLD_SOFT(), scene, x, y, BACK + 0.1);
}

function buildPillars() {
  const red = mat('#b8312a', { roughness: 0.55 });
  const couplets = { '-1': '上班摸魚功德無量', '1': '準點下班福報綿長' };
  for (const [x, z, couplet] of [[-4.6, -6.2, true], [4.6, -6.2, true], [-7.4, FRONT - 0.3, false], [7.4, FRONT - 0.3, false]]) {
    mesh(cyl(0.3, 0.3, H), red, scene, x, H / 2, z);
    mesh(cyl(0.45, 0.48, 0.32), mat('#9c948a'), scene, x, 0.16, z);
    mesh(cyl(0.34, 0.34, 0.2), GOLD(), scene, x, 6.0, z);
    if (couplet) {
      const s = Math.sign(x);
      mesh(rbox(0.5, 3.9, 0.06, 0.02), GOLD_SOFT(), scene, x, 3.5, z + 0.33);
      const p = mesh(new THREE.PlaneGeometry(0.44, 3.8), mat('#fff', { map: plaqueTex(couplets[s], true), roughness: 0.6 }), scene, x, 3.5, z + 0.37);
      p.castShadow = false;
    }
  }
}

function buildPlaques() {
  const add = (text, w, h, pos, rot) => {
    const g = new THREE.Group(); g.position.set(...pos); g.rotation.set(...rot); scene.add(g);
    mesh(rbox(w + 0.24, h + 0.24, 0.14, 0.05), GOLD_SOFT(), g);
    const p = mesh(new THREE.PlaneGeometry(w, h), mat('#fff', { map: plaqueTex(text), roughness: 0.55 }), g, 0, 0, 0.075);
    p.castShadow = false;
  };
  add('職場功德所', 4.2, 1.15, [0, 7.05, BACK + 0.45], [0.12, 0, 0]);
  add('準時下班', 2.6, 0.72, [-W / 2 + 0.35, 5.45, -3.6], [0, Math.PI / 2, 0]);
  add('薪想事成', 2.6, 0.72, [W / 2 - 0.35, 5.45, -3.6], [0, -Math.PI / 2, 0]);
}

function buildNiches() {
  // 光明燈牆：一格格的小金佛
  const geo = new THREE.CapsuleGeometry(0.07, 0.09, 3, 10);
  const m = mat('#f2c25a', { metalness: 0.4, roughness: 0.35, emissive: '#e8a33a', emissiveIntensity: 0.55 });
  const cols = 12, rows = 8;
  for (const s of [-1, 1]) {
    mesh(new THREE.BoxGeometry(0.14, 3.6, 5.2), mat('#5e1714'), scene, s * (W / 2 - 0.08), 3.0, -3.9);
    mesh(new THREE.BoxGeometry(0.18, 3.8, 5.4), GOLD_SOFT(), scene, s * (W / 2 - 0.02), 3.0, -3.9);
    const inst = new THREE.InstancedMesh(geo, m, cols * rows);
    const d = new THREE.Object3D(); let i = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      d.position.set(s * (W / 2 - 0.22), 1.55 + r * 0.41, -6.2 + c * 0.42);
      d.updateMatrix(); inst.setMatrixAt(i++, d.matrix);
    }
    scene.add(inst);
    for (let r = 0; r <= rows; r++) mesh(new THREE.BoxGeometry(0.16, 0.04, 5.0), mat('#3e0f0d'), scene, s * (W / 2 - 0.2), 1.38 + r * 0.41, -3.9);
  }
}

function buildWindows() {
  const gardenTex = canvasTex(256, 256, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#f6f8ea'); sky.addColorStop(0.55, '#e4f0cf'); sky.addColorStop(1, '#a9cf8c');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.filter = 'blur(10px)';
    for (let i = 0; i < 16; i++) {
      g.fillStyle = `hsla(${95 + rnd() * 30}, 40%, ${48 + rnd() * 18}%, .8)`;
      g.beginPath(); g.arc(rnd() * w, h * 0.55 + rnd() * h * 0.5, 22 + rnd() * 30, 0, Math.PI * 2); g.fill();
    }
  });
  const wood = mat('#7d2a20');
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.02), zc = 2.85, wz = 3.2, hy = 3.0, yc = 2.9;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(wz, hy), new THREE.MeshBasicMaterial({ map: gardenTex, toneMapped: false }));
    glow.position.set(s * (W / 2 - 0.03), yc, zc); glow.rotation.y = -s * Math.PI / 2; scene.add(glow);
    // 外框
    for (const [dy, dz, ly, lz] of [[hy / 2, 0, 0.16, wz + 0.3], [-hy / 2, 0, 0.16, wz + 0.3], [0, wz / 2, hy, 0.16], [0, -wz / 2, hy, 0.16]])
      mesh(new THREE.BoxGeometry(0.2, ly, lz), wood, scene, x - s * 0.05, yc + dy, zc + dz);
    // 格窗
    for (let i = 1; i < 7; i++) mesh(new THREE.BoxGeometry(0.06, hy, 0.05), wood, scene, x - s * 0.08, yc, zc - wz / 2 + i * wz / 7);
    for (let j = 1; j < 7; j++) mesh(new THREE.BoxGeometry(0.06, 0.05, wz), wood, scene, x - s * 0.08, yc - hy / 2 + j * hy / 7, zc);
    mesh(new THREE.BoxGeometry(0.4, 0.12, wz + 0.4), wood, scene, x - s * 0.15, yc - hy / 2 - 0.1, zc);
  }
}

function curtainGeo(w, h, folds, amp) {
  const g = new THREE.PlaneGeometry(w, h, folds * 10, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const gather = 0.75 + 0.25 * ((y + h / 2) / h);
    p.setZ(i, amp * Math.sin((x / w + 0.5) * folds * Math.PI * 2) * gather);
  }
  g.computeVertexNormals();
  return g;
}
function buildAltarBack() {
  const red = mat('#c3322a', { roughness: 0.85, side: THREE.DoubleSide });
  for (const s of [-1, 1]) {
    const c = mesh(curtainGeo(1.5, 5.4, 5, 0.07), red, scene, s * 3.2, 3.3, BACK + 0.35);
    mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), GOLD(), scene, s * 3.2, 2.4, BACK + 0.45).rotation.x = Math.PI / 2;
  }
  mesh(curtainGeo(7.8, 0.8, 9, 0.06), red, scene, 0, 5.95, BACK + 0.5);
  mesh(new THREE.BoxGeometry(8.0, 0.12, 0.2), GOLD(), scene, 0, 6.38, BACK + 0.5);
  const tasselGeo = cyl(0.03, 0.05, 0.22, 8);
  for (let x = -3.8; x <= 3.8; x += 0.38) mesh(tasselGeo, GOLD_SOFT(), scene, x, 5.45, BACK + 0.52);
}

function buildBuddha() {
  const g = new THREE.Group(); g.position.set(0, 0, BACK + 1.15); scene.add(g);
  const gold = mat('#e8ad45', { metalness: 0.55, roughness: 0.32, emissive: '#7a4a10', emissiveIntensity: 0.25 });
  // 底座
  mesh(rbox(3.4, 1.0, 2.0, 0.08), mat('#8e241f'), g, 0, 0.5, 0);
  mesh(rbox(3.55, 0.12, 2.12, 0.04), GOLD_SOFT(), g, 0, 1.02, 0);
  // 蓮花座
  mesh(lathe([[0, 0], [1.05, 0], [1.2, 0.15], [1.25, 0.32], [1.05, 0.42], [0, 0.42]]), gold, g, 0, 1.08, 0);
  const petalGeo = sphere(1, 16, 10), petalMat = mat('#f0b95c', { metalness: 0.4, roughness: 0.35 });
  for (const [n, r, y, tilt, sc] of [[14, 1.12, 1.18, -0.55, 1], [12, 0.9, 1.38, -0.75, 0.85]]) {
    for (let i = 0; i < n; i++) {
      const piv = new THREE.Group(); piv.rotation.y = (i / n) * Math.PI * 2 + (y > 1.2 ? 0.2 : 0); piv.position.y = y; g.add(piv);
      const p = mesh(petalGeo, petalMat, piv, 0, 0, r); p.scale.set(0.3 * sc, 0.13 * sc, 0.42 * sc); p.rotation.x = tilt;
    }
  }
  // 身體
  const by = 1.5;
  const legs = mesh(sphere(1), gold, g, 0, by + 0.12, 0.2); legs.scale.set(1.08, 0.36, 0.72);
  mesh(lathe([[0, 0], [0.72, 0], [0.78, 0.3], [0.72, 0.85], [0.62, 1.15], [0.3, 1.36], [0, 1.4]]), gold, g, 0, by, 0);
  const headY = by + 1.4 + 0.42;
  const faceGold = faceTex({ skin: '#e2a245', eyes: 'closed', blush: false });
  const head = mesh(sphere(0.52, 40, 24), new THREE.MeshStandardMaterial({ map: faceGold, metalness: 0.5, roughness: 0.32, emissive: '#7a4a10', emissiveIntensity: 0.25 }), g, 0, headY, 0);
  const hairMat = mat('#2f3a58', { roughness: 0.6 });
  const cap = mesh(new THREE.SphereGeometry(0.545, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hairMat, g, 0, headY, 0); cap.rotation.x = -0.28;
  mesh(sphere(0.26), hairMat, g, 0, headY + 0.5, -0.05);
  mesh(sphere(0.06), mat('#e9c06a', { emissive: '#ffcc66', emissiveIntensity: 0.6 }), g, 0, headY + 0.16, 0.5);
  for (const s of [-1, 1]) { const e = mesh(sphere(1), gold, g, s * 0.52, headY - 0.1, 0); e.scale.set(0.08, 0.3, 0.12); }
  // 手：畫面左邊的手舉起，右邊放在腿上
  limb([-0.62, by + 1.2, 0], [-0.86, by + 0.6, 0.25], 0.15, gold, g);
  limb([-0.86, by + 0.6, 0.25], [-0.8, by + 1.25, 0.42], 0.12, gold, g);
  // 舉起的手：圓圓的手掌，像連指手套
  const palm = mesh(sphere(1, 28, 20), gold, g, -0.8, by + 1.38, 0.46); palm.scale.set(0.14, 0.19, 0.085);
  limb([0.62, by + 1.2, 0], [0.82, by + 0.55, 0.25], 0.15, gold, g);
  limb([0.82, by + 0.55, 0.25], [0.3, by + 0.32, 0.62], 0.12, gold, g);
  const lapHand = mesh(sphere(1, 28, 20), gold, g, 0.26, by + 0.36, 0.64); lapHand.scale.set(0.17, 0.11, 0.15);
  // 背光
  const haloTex = canvasTex(512, 512, (c, w) => {
    const cx = w / 2;
    const grd = c.createRadialGradient(cx, cx, 20, cx, cx, cx);
    grd.addColorStop(0, 'rgba(255,226,140,.95)'); grd.addColorStop(0.62, 'rgba(240,180,70,.9)'); grd.addColorStop(0.7, 'rgba(255,215,120,1)');
    grd.addColorStop(0.74, 'rgba(200,130,40,.95)'); grd.addColorStop(0.98, 'rgba(235,170,60,.9)'); grd.addColorStop(1, 'rgba(235,170,60,0)');
    c.fillStyle = grd; c.beginPath(); c.arc(cx, cx, cx, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(160,95,25,.55)'; c.lineWidth = 3;
    for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a) * cx * 0.76, cx + Math.sin(a) * cx * 0.76); c.lineTo(cx + Math.cos(a) * cx * 0.95, cx + Math.sin(a) * cx * 0.95); c.stroke(); }
  });
  const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, depthWrite: false });
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.9), haloMat); halo.position.set(0, headY + 0.05, -0.45); g.add(halo);
  const aura = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 4.4), haloMat); aura.position.set(0, by + 1.15, -0.75); g.add(aura);
}

function buildAltar() {
  const z = -4.7;
  const frontTex = canvasTex(1024, 220, (g, w, h) => {
    g.fillStyle = '#b02f27'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e8b456'; g.lineWidth = 8; g.strokeRect(14, 14, w - 28, h - 28);
    g.lineWidth = 3; g.strokeRect(36, 34, w - 72, h - 68);
    g.strokeStyle = 'rgba(232,180,86,.85)'; g.lineWidth = 5;
    for (const cx of [190, w - 190]) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + (k - 1) * 46, h / 2 + (k % 2 ? 10 : -6), 26, Math.PI * 0.1, Math.PI * 1.7); g.stroke(); }
    g.fillStyle = '#ffd47a'; g.font = `900 120px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('福', w / 2, h / 2 + 6);
  });
  mesh(rbox(4.6, 0.95, 1.2, 0.04), mat('#9a2722'), scene, 0, 0.475, z);
  const fp = mesh(new THREE.PlaneGeometry(4.4, 0.86), mat('#fff', { map: frontTex, roughness: 0.6 }), scene, 0, 0.47, z + 0.605); fp.castShadow = false;
  mesh(rbox(4.95, 0.1, 1.4, 0.03), mat('#6a1f17'), scene, 0, 1.0, z);
  const top = 1.05;

  // 香爐
  const burner = new THREE.Group(); burner.position.set(0, top, z); scene.add(burner);
  mesh(lathe([[0, 0.06], [0.24, 0.06], [0.34, 0.14], [0.4, 0.3], [0.37, 0.42], [0.42, 0.46], [0.32, 0.47], [0, 0.44]]), GOLD(), burner);
  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; mesh(cyl(0.04, 0.03, 0.1, 8), GOLD(), burner, Math.cos(a) * 0.2, 0.05, Math.sin(a) * 0.2); }
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.08, 0.025, 8, 16), GOLD(), burner, s * 0.42, 0.42, 0).rotation.y = Math.PI / 2;
  for (const [dx, tilt] of [[-0.06, -0.08], [0, 0], [0.06, 0.08]]) {
    const st = mesh(cyl(0.012, 0.012, 0.55, 6), mat('#b3412c'), burner, dx, 0.68, 0); st.rotation.z = tilt;
    const tip = new THREE.Mesh(sphere(0.022, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff7a2a', toneMapped: false }));
    tip.position.set(dx - Math.sin(tilt) * 0.28, 0.96, 0); burner.add(tip);
  }
  anim.smokeBase = new THREE.Vector3(0, top + 1.0, z);

  // 蠟燭
  const flameMat = new THREE.MeshBasicMaterial({ color: '#ffc061', toneMapped: false });
  for (const x of [-0.85, 0.85]) {
    mesh(lathe([[0, 0], [0.13, 0], [0.05, 0.08], [0.04, 0.22], [0.1, 0.26], [0, 0.26]], 16), GOLD(), scene, x, top, z);
    mesh(cyl(0.065, 0.065, 0.36, 16), mat('#d23a2c', { emissive: '#7a1008', emissiveIntensity: 0.4 }), scene, x, top + 0.44, z);
    const f = new THREE.Mesh(sphere(0.05, 12, 8), flameMat); f.scale.set(1, 1.9, 1); f.position.set(x, top + 0.7, z); scene.add(f);
    anim.flames.push(f);
  }
  // 水果
  const plate = cyl(0.32, 0.22, 0.05, 24);
  const fruits = (x, color) => {
    mesh(plate, GOLD_SOFT(), scene, x, top + 0.03, z + 0.15);
    const fm = mat(color, { roughness: 0.45 });
    const pts = [[0, 0, 0], [0.17, 0, 0], [-0.17, 0, 0], [0.08, 0, 0.15], [-0.08, 0, 0.15], [0.08, 0, -0.15], [-0.08, 0, -0.15], [0, 0.17, 0.05], [0, 0.17, -0.07]];
    for (const [dx, dy, dz] of pts) mesh(sphere(0.1, 16, 12), fm, scene, x + dx, top + 0.14 + dy, z + 0.15 + dz);
  };
  fruits(-1.45, '#d8322a'); fruits(1.45, '#f39a26');
  // 花瓶
  for (const x of [-2.05, 2.05]) {
    mesh(lathe([[0, 0], [0.12, 0], [0.18, 0.12], [0.16, 0.3], [0.08, 0.42], [0.11, 0.5], [0, 0.5]], 20), mat('#c9302a', { roughness: 0.3 }), scene, x, top, z);
    const pink = mat('#f39ab4', { roughness: 0.6 }), leaf = mat('#5c9a4a');
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2, r = 0.12 + (i % 3) * 0.06;
      mesh(sphere(0.07, 10, 8), i % 4 === 0 ? mat('#fbe4ec') : pink, scene, x + Math.cos(a) * r, top + 0.68 + (i % 3) * 0.08, z + Math.sin(a) * r * 0.7);
      const l = mesh(sphere(0.09, 10, 6), leaf, scene, x + Math.cos(a + 0.4) * 0.2, top + 0.6, z + Math.sin(a + 0.4) * 0.16); l.scale.set(1, 0.35, 0.6); l.rotation.y = a;
    }
  }
  // 金色燈座
  const glass = new THREE.MeshBasicMaterial({ color: '#ffb84d', toneMapped: false });
  for (const x of [-2.95, 2.95]) {
    mesh(lathe([[0, 0], [0.26, 0], [0.12, 0.12], [0.05, 0.3], [0.05, 1.45], [0.14, 1.5], [0, 1.5]], 16), GOLD(), scene, x, 0, z - 0.2);
    const lamp = new THREE.Group(); lamp.position.set(x, 1.5, z - 0.2); scene.add(lamp);
    mesh(new THREE.BoxGeometry(0.3, 0.42, 0.3), glass, lamp, 0, 0.24, 0).castShadow = false;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(cyl(0.02, 0.02, 0.46, 6), GOLD(), lamp, dx * 0.15, 0.24, dz * 0.15);
    mesh(new THREE.ConeGeometry(0.28, 0.2, 4), GOLD(), lamp, 0, 0.56, 0).rotation.y = Math.PI / 4;
    mesh(rbox(0.36, 0.05, 0.36, 0.02), GOLD(), lamp, 0, 0.02, 0);
  }
}

function buildCushions() {
  const square = mat('#c23f33', { roughness: 0.85 });
  for (const x of [-1.6, 0, 1.6]) mesh(rbox(0.95, 0.24, 0.78, 0.1), square, scene, x, 0.12, -3.5);
  const round = lathe([[0, 0], [0.4, 0], [0.46, 0.05], [0.47, 0.1], [0.44, 0.16], [0.36, 0.2], [0, 0.21]], 28);
  const rm = mat('#c94a3c', { roughness: 0.85 });
  const spots = [];
  for (const z of [-2.0, -0.2, 1.6]) for (const x of [-5.0, -3.7, -2.4, 2.4, 3.7, 5.0]) spots.push([x, z]);
  spots.push([-2.4, 3.3], [2.4, 3.3], [3.7, 3.3]);
  for (const [x, z] of spots) mesh(round, rm, scene, x, 0, z);
}

function buildLanterns() {
  const body = sphere(0.52, 28, 18);
  const red = mat('#d0281f', { roughness: 0.5, emissive: '#c4241b', emissiveIntensity: 0.55 });
  anim.lanternMat = red;
  for (const [x, y, z, ph] of [[-3.3, 5.7, -5.4, 0], [3.3, 5.7, -5.4, 1.3], [-6.0, 5.4, -1.4, 2.1], [6.0, 5.4, -1.4, 0.7], [-6.0, 5.4, 2.6, 1.7], [6.0, 5.4, 2.6, 2.8]]) {
    const piv = new THREE.Group(); piv.position.set(x, H - 0.3, z); scene.add(piv);
    const drop = H - 0.3 - y;
    mesh(cyl(0.015, 0.015, drop - 0.45, 6), mat('#3a1a10'), piv, 0, -(drop - 0.45) / 2, 0);
    const l = new THREE.Group(); l.position.y = -drop; piv.add(l);
    mesh(body, red, l).scale.set(1, 0.84, 1);
    for (let i = 0; i < 6; i++) { const r = mesh(new THREE.TorusGeometry(0.52, 0.012, 6, 32, Math.PI), mat('#a01d16'), l); r.rotation.set(0, i / 6 * Math.PI, Math.PI / 2); r.scale.y = 0.84; }
    mesh(cyl(0.22, 0.26, 0.12), GOLD(), l, 0, 0.47, 0);
    mesh(cyl(0.26, 0.22, 0.12), GOLD(), l, 0, -0.47, 0);
    mesh(sphere(0.06, 10, 8), GOLD(), l, 0, -0.58, 0);
    mesh(cyl(0.05, 0.08, 0.5, 10), mat('#c0261d'), l, 0, -0.86, 0);
    anim.lanterns.push({ piv, ph });
  }
}

/* ---------- 香煙 ---------- */
function buildSmoke() {
  const tex = canvasTex(64, 64, (g, w) => {
    const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    grd.addColorStop(0, 'rgba(255,255,255,.9)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, w, w);
  });
  for (let i = 0; i < 34; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#efe6dc', transparent: true, depthWrite: false, opacity: 0 }));
    s.userData = { life: i / 34, seed: rnd() * 10 };
    scene.add(s); anim.smoke.push(s);
  }
}

/* 讓陰影帶有物體本身的顏色，不會灰灰髒髒 */
function tintShadows() {
  const patched = new Set();
  scene.traverse(o => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of ms) {
      if (!m || !m.isMeshStandardMaterial || patched.has(m)) continue;
      patched.add(m);
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

export { H, W, anim, buildAltar, buildAltarBack, buildBuddha, buildCushions, buildLanterns, buildNiches, buildPillars, buildPlaques, buildShell, buildSmoke, buildWindows, tintShadows };
