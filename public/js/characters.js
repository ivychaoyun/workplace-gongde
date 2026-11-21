// Q 版人物：chibi() 共用人偶、小和尚、殿裡的信眾。辦公室的同事也用 chibi()。
// 主要負責：安淇（foraianother8-ann）；辦公室角色與欣亞協調
import * as THREE from 'three';
import { canvasTex, cyl, faceTex, lathe, mat, mesh, rbox, scene, sphere } from './core.js';
import { anim } from './temple-scene.js';

/* ---------- Q 版人物 ---------- */
function chibi(o) {
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.42; root.add(hips);
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(0.11 * s, 0.04, 0); hips.add(leg);
    mesh(new THREE.CapsuleGeometry(0.085, 0.24, 4, 10), mat(o.pants), leg, 0, -0.18, 0);
    mesh(rbox(0.17, 0.09, 0.25, 0.04), mat(o.shoes || '#5a4034'), leg, 0, -0.38, 0.03);
    legs.push(leg);
  }
  const torso = new THREE.Group(); hips.add(torso);
  mesh(lathe(o.body || [[0, 0], [0.26, 0], [0.3, 0.08], [0.29, 0.3], [0.24, 0.48], [0.12, 0.56], [0, 0.57]]), mat(o.top), torso);
  const head = new THREE.Group(); head.position.y = 0.88; torso.add(head);
  const R = 0.4;
  mesh(sphere(R, 40, 24), new THREE.MeshStandardMaterial({ map: faceTex({ skin: o.skin, eyes: o.eyes }), roughness: 0.6 }), head);
  for (const s of [-1, 1]) mesh(sphere(0.085, 12, 10), mat(o.skin, { roughness: 0.6 }), head, s * R * 0.97, -0.02, 0);
  mesh(sphere(0.045, 12, 10), mat(o.nose || '#efb391', { roughness: 0.5 }), head, 0, -0.03, R * 0.98);
  if (o.hair) {
    const hm = mat(o.hair, { roughness: 0.7 });
    const cap = mesh(new THREE.SphereGeometry(R * 1.05, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), hm, head); cap.rotation.x = -0.5;
    if (o.bun) mesh(sphere(0.16), hm, head, 0, 0.3, -0.32);
  }
  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(0.25 * s, 0.44, 0); torso.add(arm);
    mesh(new THREE.CapsuleGeometry(0.07, 0.2, 4, 10), mat(o.sleeve || o.top), arm, 0, -0.15, 0);
    mesh(sphere(0.08, 12, 10), mat(o.skin, { roughness: 0.6 }), arm, 0, -0.32, 0);
    arm.userData.s = s;
    arms.push(arm);
  }
  return { root, hips, torso, head, legs, arms };
}
function pray(c, lift = 0) {
  for (const a of c.arms) { a.rotation.set(-1.25 - lift, 0, -0.62 * a.userData.s); }
}
function kneel(c) {
  // 小腿平放：腿的底部（臀部高度 + 0.04 − 腿粗 0.085）剛好貼在蒲團上
  c.hips.position.y = 0.05;
  for (const l of c.legs) { l.rotation.x = 1.5; l.children[1].rotation.x = -1.5; l.children[1].position.set(0, -0.36, -0.06); }
}

function buildMonk() {
  const skin = '#f4c7a0';
  const c = chibi({
    skin, top: '#6b3a26', pants: '#6b3a26', sleeve: '#f2e3cc', eyes: 'open',
    // 咖啡色內袍：從腳踝一路到脖子
    body: [[0, -0.4], [0.3, -0.4], [0.31, -0.36], [0.28, -0.1], [0.26, 0.15], [0.25, 0.35], [0.2, 0.48], [0.1, 0.55], [0, 0.56]],
  });
  // 頭：動森感的圓臉、腮紅、細細的笑
  const face = c.head.children[0];
  face.scale.set(1.06, 0.97, 1);
  face.material = new THREE.MeshStandardMaterial({ roughness: 0.55, map: canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    const cx = 128, cy = 134;
    g.fillStyle = 'rgba(240,140,140,.55)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 40, cy + 14, 16, 10, 0, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#2a1812'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, cy + 6, 13, 0.22 * Math.PI, 0.78 * Math.PI); g.stroke();
  }) });
  c.head.children[3].visible = false; // 換成動森的尖鼻子
  const nose = mesh(new THREE.ConeGeometry(0.045, 0.13, 20), mat('#e9a174', { roughness: 0.5 }), c.head, 0, -0.03, 0.43);
  nose.rotation.x = Math.PI / 2;
  for (const i of [1, 2]) c.head.children[i].scale.set(0.75, 1.1, 0.9);

  // 飛行員墨鏡：水滴形鏡片、黑框、雙槓鼻樑，鏡片順著臉的弧度彎
  const glasses = new THREE.Group(); glasses.position.set(0, 0.04, 0.398); c.head.add(glasses);
  const lensMat = new THREE.MeshStandardMaterial({ color: '#0d0e11', metalness: 0.55, roughness: 0.06, envMapIntensity: 1.6 });
  const rimMat = mat('#16120f', { metalness: 0.7, roughness: 0.3 });
  const bend = (g) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setZ(i, p.getZ(i) - x * x * 1.5); } g.computeVertexNormals(); return g; };
  const lensPts = (s) => {
    // s = 1 畫面右邊那片，-1 左邊；上緣平、外下角垂下來
    const pts = [[0.03, 0.055], [0.12, 0.06], [0.2, 0.045], [0.215, 0.0], [0.195, -0.06], [0.15, -0.095], [0.09, -0.09], [0.045, -0.055], [0.028, 0.0]];
    return pts.map(([x, y]) => new THREE.Vector2(x * s, y));
  };
  for (const s of [-1, 1]) {
    const shape = new THREE.Shape(s > 0 ? lensPts(s) : lensPts(s).reverse());
    const lg = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 16 });
    mesh(bend(lg), lensMat, glasses);
    const rim = lensPts(s).map(v => new THREE.Vector3(v.x, v.y, 0.012 - v.x * v.x * 1.5));
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim, true), 48, 0.007, 6, true), rimMat, glasses);
    // 鏡腳：從外上角往後到耳朵
    const temple = new THREE.CatmullRomCurve3([new THREE.Vector3(0.21 * s, 0.045, -0.04), new THREE.Vector3(0.33 * s, 0.05, -0.2), new THREE.Vector3(0.39 * s, 0.03, -0.42)]);
    mesh(new THREE.TubeGeometry(temple, 12, 0.008, 6), rimMat, glasses);
  }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.04, 0.07, 0.008), new THREE.Vector3(0.04, 0.07, 0.008)]), 4, 0.007, 6), rimMat, glasses);
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.035, 0.035, 0.01), new THREE.Vector3(0, 0.05, 0.02), new THREE.Vector3(0.035, 0.035, 0.01)]), 8, 0.006, 6), rimMat, glasses);

  // 橘色袈裟：從右腰斜披到左肩，下襬也是斜的（左右都指小師父自己的左右）
  const orange = '#ec8410', orangeDeep = '#cf6a0c';
  const robeGeo = lathe([[0.335, -0.32], [0.33, -0.2], [0.315, -0.05], [0.295, 0.1], [0.28, 0.22], [0.27, 0.32], [0.25, 0.42], [0.2, 0.5]], 56);
  const top = (a) => 0.4 + 0.12 * Math.sin(a), bottom = (a) => -0.2 - 0.1 * Math.sin(a);
  { const p = robeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getX(i), p.getZ(i)), y = p.getY(i); p.setY(i, Math.min(Math.max(y, bottom(a)), top(a))); }
    robeGeo.computeVertexNormals(); }
  mesh(robeGeo, mat(orange, { roughness: 0.7, side: THREE.DoubleSide }), c.torso);
  // 袈裟邊緣捲起的厚邊
  const radiusAt = (y) => y > 0.42 ? 0.25 - (y - 0.42) * 0.6 : y > 0.1 ? 0.295 - (y - 0.1) * 0.14 : 0.32 - (y + 0.05) * 0.1;
  for (const [fn, r] of [[top, 0.016], [bottom, 0.016]]) {
    const pts = [];
    for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, y = fn(a), rr = radiusAt(y) + 0.012; pts.push(new THREE.Vector3(Math.sin(a) * rr, y, Math.cos(a) * rr)); }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 96, r, 8, true), mat(orangeDeep, { roughness: 0.65 }), c.torso);
  }
  // 左肩上的袈裟與幾道布褶
  const shoulder = mesh(sphere(1, 20, 14), mat(orange, { roughness: 0.7 }), c.torso, 0.2, 0.47, -0.01); shoulder.scale.set(0.12, 0.08, 0.14);

  // 粗金鍊
  const linkGeo = new THREE.TorusGeometry(0.018, 0.0065, 6, 12), gold = mat('#f0bd45', { metalness: 0.9, roughness: 0.22 });
  const chain = new THREE.CatmullRomCurve3(Array.from({ length: 24 }, (_, i) => {
    const a = i / 24 * Math.PI * 2, f = Math.max(0, Math.cos(a));
    return new THREE.Vector3(Math.sin(a) * 0.2, 0.52 - 0.07 * f * f, Math.cos(a) * (0.15 + 0.1 * f));
  }), true);
  const links = 64, tan = new THREE.Vector3(), up = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < links; i++) {
    const l = mesh(linkGeo, gold, c.torso); l.position.copy(chain.getPointAt(i / links));
    chain.getTangentAt(i / links, tan); l.quaternion.setFromUnitVectors(up, tan);
    l.rotateY(Math.PI / 2); if (i % 2) l.rotateX(Math.PI / 2);
  }
  // 長串佛珠，垂到肚子
  const bead = sphere(0.028, 12, 10), bm = mat('#5b2c18', { roughness: 0.3 });
  // 從脖子兩側貼著身體往下，經過手臂後面，再從合十的手底下露出來
  const mala = new THREE.CatmullRomCurve3([[0, 0.53, -0.16], [0.17, 0.52, 0.0], [0.15, 0.46, 0.17], [0.13, 0.35, 0.245], [0.11, 0.22, 0.29], [0, 0.13, 0.315], [-0.11, 0.22, 0.29], [-0.13, 0.35, 0.245], [-0.15, 0.46, 0.17], [-0.17, 0.52, 0.0]].map(v => new THREE.Vector3(...v)), true);
  for (let i = 0; i < 46; i++) mesh(bead, bm, c.torso).position.copy(mala.getPointAt(i / 46));

  // 涼鞋：鞋底、帶子、露出來的腳趾
  for (const l of c.legs) {
    l.children[0].visible = false;
    const sole = l.children[1]; sole.geometry = rbox(0.17, 0.035, 0.28, 0.015); sole.material = mat('#8a5634', { roughness: 0.6 }); sole.scale.set(1, 1, 1);
    sole.position.set(0, -0.405, 0.17);
    const foot = mesh(sphere(1, 16, 12), mat('#e9b48c', { roughness: 0.6 }), l, 0, -0.375, 0.22); foot.scale.set(0.065, 0.04, 0.1);
    const strap = mesh(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI), mat('#5c3420'), l, 0, -0.385, 0.2); strap.scale.set(1.05, 0.6, 1);
  }

  pray(c, 0.05);
  // 雙手合十：兩片手掌，手指朝上，看得到大拇指
  c.palms = new THREE.Group(); c.palms.position.set(0, 0.42, 0.33); c.palms.rotation.x = -0.25; c.torso.add(c.palms);
  // 兩片半圓的手掌貼在一起，像連指手套，中間留一道淺縫
  for (const s of [-1, 1]) {
    const half = new THREE.SphereGeometry(1, 24, 18, s > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI);
    const hand = mesh(half, mat(skin, { roughness: 0.6 }), c.palms, s * 0.0015, 0.02, 0);
    hand.scale.set(0.072, 0.13, 0.09);
  }
  // 兩掌之間的薄片，從縫裡只看得到一條細線
  const seam = mesh(new THREE.CircleGeometry(1, 32), mat('#d99f7a', { roughness: 0.7, side: THREE.DoubleSide }), c.palms, 0, 0.02, 0);
  seam.rotation.y = Math.PI / 2; seam.scale.set(0.088, 0.128, 1);
  // 手臂往前一點，讓前臂蓋在佛珠前面
  for (const a of c.arms) a.position.z = 0.05;
  // 木魚槌：握在畫面左邊那隻手，平常藏起來
  const mallet = new THREE.Group(); mallet.position.y = -0.32; c.arms[0].add(mallet);
  // 棒子沿著 +z：握把尾端從拳頭後面露出一點，槌頭在前端；每一幀用 lookAt 對準木魚頂部
  // 棒身做成長度 1、從握把尾端（z = 0）往 +z 延伸，每一幀依距離伸縮，槌頭永遠停在木魚表面上、不會陷進去
  const stickGeo = cyl(0.02, 0.024, 1, 10); stickGeo.rotateX(Math.PI / 2); stickGeo.translate(0, 0, 0.5);
  const stick = mesh(stickGeo, mat('#9a6a3c', { roughness: 0.5 }), mallet, 0, 0, -0.06);
  mesh(sphere(0.026, 10, 8), mat('#9a6a3c', { roughness: 0.5 }), mallet, 0, 0, -0.06);
  const head = mesh(sphere(0.07, 24, 18), mat('#6a3c22', { roughness: 0.35 }), mallet, 0, 0, 0.33);
  c.malletParts = { stick, head };
  mallet.visible = false; c.mallet = mallet;
  // 木魚：跪下時出現在小師父面前
  const fish = new THREE.Group(); fish.position.set(-0.12, 0.26, 0.62); c.root.add(fish);
  mesh(new THREE.TorusGeometry(0.2, 0.05, 10, 28), mat('#b23a2c'), fish, 0, 0.03, 0).rotation.x = Math.PI / 2;
  const fb = new THREE.Group(); fb.position.y = 0.2; fish.add(fb);
  const body = mesh(sphere(1, 32, 20), mat('#a8471e', { roughness: 0.32 }), fb); body.scale.set(0.27, 0.21, 0.25);
  mesh(new THREE.BoxGeometry(0.34, 0.025, 0.12), mat('#3a1a0c'), fb, 0, 0.0, 0.2).rotation.x = -0.15;
  for (const s of [-1, 1]) { const sc = mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), mat('#e2a63b', { metalness: 0.5, roughness: 0.35 }), fb, s * 0.14, 0.08, 0.17); sc.rotation.y = s * 0.6; }
  fish.visible = false; fish.scale.setScalar(0.001); c.fish = fish; c.fishBody = fb;
  // 跪墊
  const cushion = mesh(lathe([[0, 0], [0.48, 0], [0.54, 0.05], [0.55, 0.1], [0.52, 0.16], [0.42, 0.2], [0, 0.21]], 28), mat('#c94a3c', { roughness: 0.85 }), scene);
  cushion.visible = false; c.cushion = cushion;
  c.root.position.set(-0.25, 0, 4.6);
  cushion.position.set(-0.25, 0, 4.55);
  c.root.scale.setScalar(1.15);
  c.root.rotation.y = 0.06;
  scene.add(c.root);
  return c;
}

function buildPeople() {
  const P = [];
  const toAltar = Math.PI;
  // 跪拜（畫面右邊，跟參考圖一樣）
  const k1 = chibi({ skin: '#f3d0b8', top: '#f4f0e8', pants: '#3e4b5e', eyes: 'closed' });
  kneel(k1); pray(k1); k1.root.position.set(1.6, 0.24, -3.45); k1.root.rotation.y = toAltar; scene.add(k1.root);
  P.push({ c: k1, kind: 'kneelBow', ph: 0 });
  const k2 = chibi({ skin: '#f6d6be', top: '#c9b5d9', pants: '#5a4d6a', eyes: 'closed', hair: '#3a2a24', bun: true });
  kneel(k2); pray(k2); k2.root.position.set(-1.6, 0.24, -3.45); k2.root.rotation.y = toAltar; scene.add(k2.root);
  P.push({ c: k2, kind: 'kneelBow', ph: 1.9 });
  // 站著拜拜（畫面左邊）
  const s1 = chibi({ skin: '#f4d4bc', top: '#8e959e', pants: '#4a5260', eyes: 'closed' });
  pray(s1); s1.root.position.set(-5.0, 0.2, -2.0); s1.root.rotation.y = toAltar + 0.15; scene.add(s1.root);
  P.push({ c: s1, kind: 'shake', ph: 0.4 });
  const s2 = chibi({ skin: '#f1cdb2', top: '#e9e3d7', pants: '#59616e', eyes: 'closed', hair: '#6f7176' });
  pray(s2); s2.root.position.set(-3.7, 0.2, -0.2); s2.root.rotation.y = toAltar + 0.1; scene.add(s2.root);
  P.push({ c: s2, kind: 'shake', ph: 2.2 });
  // 鞠躬的上班族（畫面右邊後方）
  const s3 = chibi({ skin: '#f6d3ba', top: '#6f8fb3', pants: '#33384a', eyes: 'closed', hair: '#2b2120', bun: true });
  pray(s3); s3.root.position.set(5.0, 0.2, -2.0); s3.root.rotation.y = toAltar - 0.15; scene.add(s3.root);
  P.push({ c: s3, kind: 'standBow', ph: 0.8 });
  const s4 = chibi({ skin: '#f3cfb4', top: '#d9c7a4', pants: '#4b4038', eyes: 'closed', hair: '#2e2420' });
  pray(s4); s4.root.position.set(3.7, 0.2, -0.2); s4.root.rotation.y = toAltar - 0.1; scene.add(s4.root);
  P.push({ c: s4, kind: 'shake', ph: 1.1 });
  // 在殿裡繞行的香客
  const w1 = chibi({ skin: '#f5d1b6', top: '#e0895b', pants: '#2f3b55', eyes: 'open', hair: '#2a201c' });
  scene.add(w1.root); P.push({ c: w1, kind: 'walk', ph: 0, rx: 6.85, rz: 3.0, cz: -0.25, speed: 0.16 });
  const w2 = chibi({ skin: '#f2cdb0', top: '#7fae8a', pants: '#4a4a52', eyes: 'open' });
  scene.add(w2.root); P.push({ c: w2, kind: 'walk', ph: Math.PI, rx: 6.85, rz: 3.0, cz: -0.25, speed: 0.16 });
  anim.people = P;
}

export { buildMonk, buildPeople, chibi };
