import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const t0 = performance.now();
window.onerror = (m) => { window.__err = String(m); };

/* ---------- 基本設定 ---------- */
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#fbf5ec');
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.3, -1.8);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.rotateSpeed = 0.6;
controls.minDistance = 3;
controls.maxDistance = 14;
controls.minPolarAngle = 1.08;
controls.maxPolarAngle = 1.6;
controls.minAzimuthAngle = -0.55;
controls.maxAzimuthAngle = 0.55;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

function setView(azDeg, polarDeg, dist) {
  const s = new THREE.Spherical(dist, THREE.MathUtils.degToRad(polarDeg), THREE.MathUtils.degToRad(azDeg));
  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
  controls.update();
}
window.setView = setView;
window.__cam = { camera, controls };
function layoutCamera() {
  const a = innerWidth / innerHeight;
  camera.aspect = a;
  camera.fov = a < 0.8 ? 58 : 40;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
layoutCamera();
setView(4, innerWidth / innerHeight < 0.8 ? 84 : 86.5, a0Dist());
function a0Dist() { return innerWidth / innerHeight < 0.8 ? 11.6 : 13.2; }
addEventListener('resize', layoutCamera);

/* ---------- 小工具 ---------- */
const matCache = new Map();
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...o }));
  return matCache.get(k);
}
const GOLD = () => mat('#e2a63b', { metalness: 0.65, roughness: 0.3 });
const GOLD_SOFT = () => mat('#e9b452', { metalness: 0.45, roughness: 0.4 });
function mesh(g, m, parent, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = o.receiveShadow = true;
  if (parent) parent.add(o);
  return o;
}
function rbox(w, h, d, r = 0.05) { return new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2.05, h / 2.05, d / 2.05)); }
function lathe(pts, seg = 32) { return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg); }
function sphere(r, ws = 24, hs = 16) { return new THREE.SphereGeometry(r, ws, hs); }
function cyl(rt, rb, h, s = 24) { return new THREE.CylinderGeometry(rt, rb, h, s); }
function limb(a, b, r, m, parent) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const o = mesh(new THREE.CapsuleGeometry(r, A.distanceTo(B), 4, 12), m, parent);
  o.position.copy(A).add(B).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return o;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SERIF = '"Noto Serif TC", "Songti TC", serif';

/* ---------- 貼圖 ---------- */
function plaqueTex(text, vertical = false) {
  const w = vertical ? 160 : 1024, h = vertical ? 1100 : 280;
  return canvasTex(w, h, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#c2382e'); grd.addColorStop(1, '#9a2420');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#f1c062'; g.lineWidth = 10; g.strokeRect(14, 14, w - 28, h - 28);
    g.lineWidth = 3; g.strokeRect(30, 30, w - 60, h - 60);
    g.fillStyle = '#ffd57a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (vertical) {
      const n = text.length, step = (h - 110) / n;
      g.font = `900 ${Math.min(96, step * 0.9)}px ${SERIF}`;
      [...text].forEach((ch, i) => g.fillText(ch, w / 2, 55 + step * (i + 0.5)));
    } else {
      g.font = `900 150px ${SERIF}`;
      const n = text.length, step = (w - 140) / n;
      [...text].forEach((ch, i) => g.fillText(ch, 70 + step * (i + 0.5), h / 2 + 6));
    }
  });
}
function faceTex({ skin = '#f6cfb0', eyes = 'open', blush = true, brows = false }) {
  return canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    const cx = 128, cy = 134;
    if (blush) {
      g.fillStyle = 'rgba(238,118,104,.38)';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 36, cy + 18, 13, 8, 0, 0, Math.PI * 2); g.fill(); }
    }
    g.strokeStyle = '#4a2a20'; g.fillStyle = '#3a2219'; g.lineCap = 'round';
    for (const s of [-1, 1]) {
      if (eyes === 'open') {
        g.beginPath(); g.ellipse(cx + s * 21, cy, 6.5, 9, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * 21 + 2, cy - 3, 2.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3a2219';
      } else {
        g.lineWidth = 3.5; g.beginPath(); g.arc(cx + s * 21, cy - 3, 9, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
      }
      if (brows) { g.lineWidth = 3; g.beginPath(); g.moveTo(cx + s * 13, cy - 20); g.lineTo(cx + s * 30, cy - 22); g.stroke(); }
    }
    g.lineWidth = 3.5; g.strokeStyle = '#7a3a2c';
    g.beginPath(); g.arc(cx, cy + 12, 9, 0.18 * Math.PI, 0.82 * Math.PI); g.stroke();
  });
}

/* ---------- 光線 ---------- */
scene.add(new THREE.HemisphereLight('#fff3e2', '#b8735a', 1.5));
const sun = new THREE.DirectionalLight('#ffe0b5', 2.6);
sun.position.set(5, 12, 11);
sun.target.position.set(0, 0, -2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 5;
scene.add(sun, sun.target);
const altarLight = new THREE.PointLight('#ffab55', 22, 10, 2);
altarLight.position.set(0, 2.6, -4.6);
scene.add(altarLight);
const buddhaLight = new THREE.PointLight('#ffd690', 18, 9, 2);
buddhaLight.position.set(0, 4.5, -5.2);
scene.add(buddhaLight);

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

/* ---------- 動畫 ---------- */
const ease = x => x * x * (3 - 2 * x);
function tick(t) {
  for (const { piv, ph } of anim.lanterns) { piv.rotation.z = Math.sin(t * 0.9 + ph) * 0.035; piv.rotation.x = Math.sin(t * 0.7 + ph * 1.7) * 0.025; }
  for (const [i, f] of anim.flames.entries()) { const k = 1 + Math.sin(t * 13 + i * 2) * 0.08 + Math.sin(t * 23 + i) * 0.05; f.scale.set(k, 1.9 * k, k); }
  altarLight.intensity = 22 + Math.sin(t * 11) * 1.5 + Math.sin(t * 17) * 1.0;

  for (const p of anim.people) {
    const c = p.c, tt = t + p.ph;
    if (p.kind === 'kneelBow') {
      // 一拜：起身停一下 → 慢慢拜下去 → 停 → 起來
      const cyc = (tt % 4.4) / 4.4;
      const b = cyc < 0.3 ? 0 : cyc < 0.5 ? ease((cyc - 0.3) / 0.2) : cyc < 0.7 ? 1 : cyc < 0.9 ? 1 - ease((cyc - 0.7) / 0.2) : 0;
      c.torso.rotation.x = b * 0.95;
      c.head.rotation.x = b * 0.2;
    } else if (p.kind === 'standBow') {
      const b = Math.max(0, Math.sin(tt * 1.3)) ** 1.5;
      c.torso.rotation.x = b * 0.55;
    } else if (p.kind === 'shake') {
      // 拿香拜拜：手上下晃、頭輕點
      const s = Math.sin(tt * 4.2);
      for (const a of c.arms) a.rotation.x = -1.25 + s * 0.18;
      c.head.rotation.x = 0.08 + s * 0.06;
      c.torso.rotation.x = 0.05 + s * 0.04;
      c.torso.rotation.z = Math.sin(tt * 0.8) * 0.03;
    } else if (p.kind === 'walk') {
      const a = -tt * p.speed;
      const x = Math.cos(a) * p.rx, z = p.cz + Math.sin(a) * p.rz;
      const dx = Math.sin(a) * p.rx, dz = -Math.cos(a) * p.rz;
      c.root.position.set(x, Math.abs(Math.sin(t * 7)) * 0.04, z);
      c.root.rotation.y = Math.atan2(dx, dz);
      const sw = Math.sin(t * 7);
      c.legs[0].rotation.x = sw * 0.5; c.legs[1].rotation.x = -sw * 0.5;
      c.arms[0].rotation.x = -sw * 0.45; c.arms[1].rotation.x = sw * 0.45;
      c.arms[0].rotation.z = 0.12; c.arms[1].rotation.z = -0.12;
      c.head.rotation.y = Math.sin(t * 0.6 + p.ph) * 0.35;
    }
  }

  stageTick(t);
  if (anim.smokeBase) for (const s of anim.smoke) {
    const u = s.userData;
    u.life += 0.0045; if (u.life > 1) { u.life -= 1; u.seed = Math.random() * 10; }
    const l = u.life;
    s.position.set(anim.smokeBase.x + Math.sin(l * 5 + u.seed) * 0.18 * l, anim.smokeBase.y + l * 2.4, anim.smokeBase.z + Math.cos(l * 4 + u.seed) * 0.1 * l);
    const sc = 0.18 + l * 0.75; s.scale.set(sc, sc, sc);
    s.material.opacity = 0.42 * Math.sin(Math.PI * l);
  }
}

/* ---------- 對話 ---------- */
const bubble = document.getElementById('bubble'), sayEl = document.getElementById('say');
const askForm = document.getElementById('ask'), q = document.getElementById('q'), sendBtn = document.getElementById('send');
let monk;
let typing = null;
function say(text, done) {
  clearInterval(typing);
  sayEl.textContent = '';
  bubble.classList.add('show');
  let i = 0;
  typing = setInterval(() => {
    sayEl.textContent = text.slice(0, ++i);
    if (i >= text.length) { clearInterval(typing); done && done(); }
  }, 70);
}
const headTop = new THREE.Vector3();
function placeBubble() {
  let cam = camera;
  if (office.active) {
    const s = OFF.soulModel;
    if (!s || !s.visible) { bubble.style.visibility = 'hidden'; return; }
    headTop.set(0, 1.62, 0); s.localToWorld(headTop); cam = ocam;
  } else {
    if (!monk) return;
    headTop.set(0, 1.95, 0); monk.root.localToWorld(headTop);
  }
  headTop.project(cam);
  const x = (headTop.x * 0.5 + 0.5) * innerWidth, y = (-headTop.y * 0.5 + 0.5) * innerHeight;
  const bw = bubble.offsetWidth, margin = 16;
  const left = Math.min(Math.max(x, margin + bw / 2), innerWidth - margin - bw / 2);
  bubble.style.left = left + 'px';
  bubble.style.top = Math.max(y - 8, bubble.offsetHeight + (office.active ? 14 : 90)) + 'px';
  bubble.style.setProperty('--tail', `${Math.min(Math.max(50 + (x - left) / bw * 100, 14), 86)}%`);
  bubble.style.visibility = (headTop.z > 1 || x < -20 || x > innerWidth + 20) ? 'hidden' : 'visible';
}
q.addEventListener('input', () => {
  sendBtn.disabled = !q.value.trim();
  q.style.height = '44px'; q.style.height = Math.min(q.scrollHeight, 120) + 'px';
});
q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); askForm.requestSubmit(); } });
/* ---------- 節拍：全部用 Web Audio 即時合成 ---------- */
const audio = { ctx: null, out: null, noise: null, playing: false, start: 0, next: 0, step: 0, timer: 0, bpm: 88 };
const SPB = () => 60 / audio.bpm;
function ensureAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = audio.ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    audio.out = ctx.createGain(); audio.out.gain.value = 0.8;
    audio.out.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate;
    audio.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = audio.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (audio.ctx.state === 'suspended') audio.ctx.resume();
}
function env(g, t, peak, decay) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + decay); }
function tone(type, f0, f1, t, peak, decay) {
  const { ctx } = audio, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
  env(g, t, peak, decay); o.connect(g).connect(audio.out); o.start(t); o.stop(t + decay + 0.05);
}
function noise(t, peak, decay, ftype, freq, q = 1) {
  const { ctx } = audio, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = audio.noise; f.type = ftype; f.frequency.value = freq; f.Q.value = q;
  env(g, t, peak, decay); src.connect(f).connect(g).connect(audio.out); src.start(t, Math.random() * 0.5); src.stop(t + decay + 0.05);
}
const kick = t => tone('sine', 150, 42, t, 1.0, 0.42);
const snare = t => { noise(t, 0.5, 0.2, 'highpass', 1200); tone('triangle', 200, 140, t, 0.3, 0.12); };
const hat = (t, a) => noise(t, a, 0.045, 'highpass', 7500);
const bass = (t, f) => tone('sine', f, 0, t, 0.42, 0.38);
function woodfish(t = audio.ctx.currentTime, a = 0.7) { tone('triangle', 560, 430, t, a, 0.13); noise(t, a * 0.45, 0.035, 'bandpass', 1500, 5); }
function bowl(t) { tone('sine', 528, 0, t, 0.35, 3.2); tone('sine', 1327, 0, t, 0.12, 2.2); tone('sine', 2112, 0, t, 0.05, 1.4); }

const KICK = [1,0,0,0, 0,0,0,1, 0,0,1,0, 0,0,0,0], SNARE = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,1];
const ROOTS = [55, 55, 43.65, 49];
function playStep(step, t) {
  const s = step % 16, bar = Math.floor(step / 16);
  if (s === 0 && bar % 4 === 0) bowl(t);
  if (KICK[s]) { kick(t); bass(t, ROOTS[bar % 4]); }
  if (SNARE[s]) snare(t);
  if (s % 2 === 0) hat(t, s % 4 === 0 ? 0.16 : 0.09);
  if (s === 0 || s === 8 || (show.mode === 'waiting' && s % 4 === 0) || s === 14) woodfish(t, s === 14 ? 0.35 : 0.5);
}
function schedule() {
  while (audio.next < audio.ctx.currentTime + 0.12) { playStep(audio.step, audio.next); audio.next += SPB() / 4; audio.step++; }
}
function startBeat() {
  audio.start = audio.next = audio.ctx.currentTime + 0.12; audio.step = 0; audio.playing = true;
  clearInterval(audio.timer); audio.timer = setInterval(schedule, 25); schedule();
}
function stopBeat() { clearInterval(audio.timer); audio.playing = false; }
const beatPos = () => (audio.playing ? (audio.ctx.currentTime - audio.start) / SPB() : -1);

/* ---------- 表演流程：等歌詞 → rap → 跪下敲木魚 ---------- */
const show = { mode: 'idle', rap: null, complaint: '', count: 0, startBar: 0, kneelK: 0, strikeAt: -9, drawn: '', clock: 0 };
let merit = 0;
try { merit = Number(localStorage.getItem('merit-temple:merit')) || 0; } catch (e) {}
const meritEl = document.getElementById('meritN'), meritBox = document.getElementById('merit');
meritEl.textContent = merit;

/* ---------- 歌詞來源 ----------
   'library'：從歌詞庫（js/lyric-library.js）依抱怨挑一首，不花錢、不上傳，是目前的設定
   'ai'：交給 /api/rap 現編（worker.js），連不上時改用歌詞庫
   要不要打開 AI 由組員討論決定，不要自行切換 */
const LYRIC_SOURCE = 'library';

function localRap(complaint = '') {
  // 歌詞庫：沒有選情境，所以在整個歌詞庫裡依抱怨的關鍵字配對
  if (typeof buildLyrics === 'function') {
    const pick = buildLyrics({ id: 'other' }, complaint);
    if (pick.verse) return { title: pick.verse.title, lines: pick.lines, blessing: '善哉善哉，施主今天辛苦了。' };
  }
  return {
    title: '職場心經 Remix',
    lines: ['施主苦水我收到', '木魚一敲煩惱跑', '老闆畫餅別亂咬', '會議開完還要報', 'KPI 像業障在繞', '薪水入帳就飄飄', '放下手機睡個好覺', '明天的你依舊最好'],
    blessing: '善哉善哉，施主今天辛苦了。',
  };
}
async function fetchRap(complaint) {
  if (LYRIC_SOURCE !== 'ai') return localRap(complaint);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const r = await fetch('/api/rap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ complaint }), signal: ctl.signal });
    if (!r.ok) throw new Error(r.status);
    return await r.json();
  } catch (e) {
    console.info('改用歌詞庫：', e.message);
    return localRap(complaint);
  } finally { clearTimeout(timer); }
}

function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
function drawLyric(key, build) {
  if (show.drawn === key) return;
  show.drawn = key; clearInterval(typing);
  sayEl.replaceChildren(...build());
}
function lyricTick() {
  const b = beatPos();
  if (show.mode === 'waiting') {
    drawLyric('wait' + (Math.floor(b / 2) % 3), () => [el('span', 'line', ['Beat 下', '呦～', '貧僧押韻中'][Math.floor(Math.max(b, 0) / 2) % 3]), el('span', 'next', '施主的苦水，正在變成歌詞⋯⋯')]);
    return;
  }
  if (show.mode !== 'rap') return;
  const { lines, title } = show.rap;
  const idx = Math.floor(b / 4) - show.startBar;
  if (idx < 0) { drawLyric('ready', () => [el('span', 'title', `〈${title}〉`), el('span', 'line', '準備好了沒？'), el('span', 'next', lines[0])]); return; }
  if (idx >= lines.length) { office.active ? soulExit() : kneelDown(); return; }
  if (voice.sungIdx !== idx) { voice.sungIdx = idx; sing(lines[idx], SPB() * 3.6); }
  const line = [...lines[idx]], prog = ((b % 4) / 4) * 1.25;
  const lit = Math.min(line.length, Math.ceil(prog * line.length));
  drawLyric(`${idx}:${lit}`, () => [
    el('span', 'title', `〈${title}〉 ${idx + 1}/${lines.length}`),
    (() => { const s = el('span', 'line'); s.append(el('span', 'on', line.slice(0, lit).join('')), el('span', 'off', line.slice(lit).join(''))); return s; })(),
    el('span', 'next', lines[idx + 1] || '～ 收 ～'),
  ]);
}

async function perform(complaint) {
  ensureAudio();
  askForm.classList.remove('show');
  bubble.classList.add('rap');
  show.mode = 'waiting'; show.drawn = ''; show.complaint = complaint; voice.sungIdx = -1;
  if (synth && voice.on) { synth.cancel(); synth.speak(new SpeechSynthesisUtterance(' ')); }
  if (controls.target.distanceTo(HOME_T) > 0.5) flyHome();
  startBeat();
  const rap = await fetchRap(complaint);
  if (show.mode !== 'waiting') return;
  show.rap = rap;
  show.startBar = Math.floor(Math.max(beatPos(), 0) / 4) + 1;
  show.mode = 'rap';
}
/* ---------- 小師父開唱：瀏覽器內建語音，一小節唸一句 ---------- */
const voice = { on: true, pick: null, sungIdx: -1 };
try { voice.on = localStorage.getItem('merit-temple:voice') !== 'off'; } catch (e) {}
const synth = window.speechSynthesis;
function pickVoice() {
  if (!synth) return null;
  const vs = synth.getVoices();
  return vs.find(v => /zh[-_]TW/i.test(v.lang)) || vs.find(v => /zh/i.test(v.lang)) || null;
}
if (synth) synth.onvoiceschanged = () => { voice.pick = pickVoice(); };
function sing(text, seconds, pitch = 0.85) {
  if (!synth || !voice.on || !text) return;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  voice.pick = voice.pick || pickVoice();
  if (voice.pick) u.voice = voice.pick;
  u.lang = voice.pick?.lang || 'zh-TW';
  // 一般語速大約每秒 4.5 個字，照這小節的長度調快
  u.rate = seconds ? Math.min(Math.max([...text].length / (4.5 * seconds), 1), 2) : 1;
  u.pitch = pitch;
  synth.speak(u);
}
const voiceBtn = document.getElementById('voice');
function drawVoiceBtn() { voiceBtn.textContent = voice.on ? '人聲 開' : '人聲 關'; voiceBtn.classList.toggle('off', !voice.on); }
voiceBtn.addEventListener('click', () => {
  voice.on = !voice.on; drawVoiceBtn();
  if (!voice.on && synth) synth.cancel();
  try { localStorage.setItem('merit-temple:voice', voice.on ? 'on' : 'off'); } catch (e) {}
});
drawVoiceBtn();

/* ---------- 跪下 → 換施主敲 30 下 → 功德圓滿 ---------- */
const GOAL = 30;
const knockUI = document.getElementById('knock'), knockN = document.getElementById('knockN'), knockBar = document.getElementById('knockBar');
function kneelDown() {
  if (show.mode !== 'rap') return;
  stopBeat();
  bowl(audio.ctx.currentTime + 0.05);
  show.mode = 'kneel'; show.drawn = ''; show.count = 0;
  flyClose();
  bubble.classList.remove('rap');
  const blessing = show.rap.blessing || '善哉善哉。';
  setTimeout(() => {
    // 小師父先示範三下，不算在施主的 30 下裡
    let n = 0;
    const iv = setInterval(() => { strike(false); if (++n >= 3) clearInterval(iv); }, SPB() * 1000);
    sing(blessing, 0, 0.9);
    say(blessing, () => setTimeout(() => {
      show.mode = 'knock';
      say(`換施主了！敲滿 ${GOAL} 下木魚，功德就圓滿。`);
      drawKnock();
      knockUI.classList.add('show');
    }, 1200));
  }, 700);
}
function drawKnock() {
  knockN.textContent = show.count;
  knockBar.style.width = (show.count / GOAL * 100) + '%';
}
function strike(counted = true) {
  if (!monk) return;
  ensureAudio();
  woodfish(audio.ctx.currentTime, 0.75);
  show.strikeAt = show.clock;
  if (!counted) return;
  merit++; meritEl.textContent = merit;
  try { localStorage.setItem('merit-temple:merit', merit); } catch (e) {}
  meritBox.classList.add('bump'); setTimeout(() => meritBox.classList.remove('bump'), 150);
  const p = new THREE.Vector3(0, 0.75, 0); monk.fish.localToWorld(p); p.project(camera);
  const plus = el('div', 'plus', '功德 +1');
  plus.style.left = ((p.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 40) + 'px';
  plus.style.top = ((-p.y * 0.5 + 0.5) * innerHeight) + 'px';
  document.body.append(plus); setTimeout(() => plus.remove(), 1000);
  if (show.mode === 'knock') {
    show.count++; drawKnock();
    if (show.count === 10) say('善哉，再接再厲。');
    if (show.count === 20) say('業障正在消散中⋯⋯');
    if (show.count >= GOAL) complete();
  }
}
function knockTap() { if (show.mode === 'knock' || show.mode === 'done') strike(true); }
document.getElementById('knockBtn').addEventListener('click', knockTap);
addEventListener('keydown', e => { if (e.code === 'Space' && document.activeElement !== q && (show.mode === 'knock' || show.mode === 'done')) { e.preventDefault(); knockTap(); } });

/* ---------- 功德圓滿與收據 ---------- */
const doneUI = document.getElementById('complete'), receiptBox = document.getElementById('receiptPaper');
let receiptCanvas = null;
function complete() {
  show.mode = 'complete';
  knockUI.classList.remove('show');
  bowl(audio.ctx.currentTime);
  setTimeout(() => bowl(audio.ctx.currentTime), 900);
  say('功德圓滿，阿彌陀佛。');
  sing('功德圓滿，阿彌陀佛', 0, 0.9);
  receiptCanvas = drawReceipt();
  receiptBox.replaceChildren(receiptCanvas);
  const clip = receiptBox.parentElement;
  clip.style.setProperty('--paper-h', Math.ceil(receiptCanvas.height * (clip.clientWidth || 312) / receiptCanvas.width) + 'px');
  doneUI.classList.remove('printing');
  doneUI.classList.add('show');
  setTimeout(() => { doneUI.classList.add('printing'); printerSound(); }, 1500);
}
function printerSound() {
  const t = audio.ctx.currentTime;
  for (let i = 0; i < 26; i++) noise(t + i * 0.09, 0.08, 0.06, 'bandpass', 2400 + (i % 3) * 300, 3);
}
function taipeiNow() {
  const f = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
  const o = Object.fromEntries(f.formatToParts(new Date()).map(x => [x.type, x.value]));
  return { text: `${o.year}/${o.month}/${o.day} ${o.hour}:${o.minute}`, id: `${o.year}${o.month}${o.day}-${o.hour}${o.minute}` };
}
function wrapText(g, text, maxW) {
  const out = []; let line = '';
  for (const ch of text) { if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch; } else line += ch; }
  if (line) out.push(line);
  return out;
}
function drawReceipt() {
  const W = 600, pad = 44, inner = W - pad * 2, now = taipeiNow();
  const rap = show.rap || localRap(show.complaint);
  const no = `${now.id}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const c = document.createElement('canvas'), g = c.getContext('2d');
  const SANS = '"Noto Sans TC", "PingFang TC", sans-serif';
  // 先量高度，再畫
  const draw = (dry) => {
    let y = 0;
    const text = (str, size, { font = SANS, weight = 400, align = 'left', color = '#2d211b', x } = {}) => {
      g.font = `${weight} ${size}px ${font}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'top';
      const lines = wrapText(g, str, inner);
      for (const l of lines) { if (!dry) g.fillText(l, x ?? (align === 'center' ? W / 2 : pad), y); y += size * 1.45; }
    };
    const row = (a, b, size = 24, weight = 400) => {
      g.font = `${weight} ${size}px ${SANS}`; g.fillStyle = '#2d211b'; g.textBaseline = 'top';
      if (!dry) { g.textAlign = 'left'; g.fillText(a, pad, y); g.textAlign = 'right'; g.fillText(b, W - pad, y); }
      y += size * 1.5;
    };
    const dash = () => { y += 8; if (!dry) { g.strokeStyle = '#2d211b'; g.setLineDash([8, 7]); g.lineWidth = 2; g.beginPath(); g.moveTo(pad, y); g.lineTo(W - pad, y); g.stroke(); g.setLineDash([]); } y += 20; };
    y = 48;
    text('職場功德所', 46, { font: SERIF, weight: 900, align: 'center' });
    text('功 德 收 據　MERIT RECEIPT', 20, { weight: 700, align: 'center', color: '#6b5546' });
    y += 10; dash();
    row('收據編號', no, 20); row('開立時間', now.text + '（台北）', 20); row('施主', '無名施主', 20);
    dash();
    text('事由', 20, { weight: 700, color: '#6b5546' });
    const gist = (show.complaint || '').replace(/\s+/g, ' ');
    text(gist.length > 40 ? gist.slice(0, 40) + '⋯' : gist || '上班好累', 24);
    y += 8; dash();
    row('品項', '數量', 20, 700);
    row(`rap 開示〈${rap.title}〉`, '× 1', 24);
    row('小師父示範木魚', '× 3', 24);
    row('施主親手敲木魚', `× ${GOAL}`, 24);
    dash();
    row('本次功德', `+${GOAL}`, 32, 900);
    row('累積功德', String(merit), 24, 700);
    dash();
    text('小師父開示', 20, { weight: 700, color: '#6b5546' });
    text(rap.blessing || '善哉善哉。', 26, { weight: 500 });
    y += 16;
    // 條碼
    if (!dry) { let x = pad + 40; g.fillStyle = '#2d211b'; while (x < W - pad - 40) { const w = 2 + Math.floor(Math.random() * 4); g.fillRect(x, y, w, 64); x += w + 2 + Math.floor(Math.random() * 5); } }
    y += 76;
    text(no, 18, { align: 'center', color: '#6b5546' });
    y += 10;
    text('本收據不可報帳，但可抵銷今日業障。', 20, { align: 'center', weight: 500 });
    text('感謝蒞臨，請準時下班。', 20, { align: 'center', weight: 500 });
    y += 40;
    return y;
  };
  c.width = W; c.height = draw(true);
  // 紙
  g.fillStyle = '#fffdf7'; g.fillRect(0, 0, W, c.height);
  draw(false);
  // 紅色印章
  g.save(); g.translate(W - pad - 80, 300); g.rotate(-0.22);
  g.strokeStyle = 'rgba(196,40,30,.82)'; g.fillStyle = 'rgba(196,40,30,.82)'; g.lineWidth = 6;
  g.beginPath(); g.arc(0, 0, 70, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 60, 0, Math.PI * 2); g.stroke();
  g.font = `900 30px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('功德', 0, -16); g.fillText('圓滿', 0, 20);
  g.restore();
  return c;
}
document.getElementById('saveReceipt').addEventListener('click', () => {
  if (!receiptCanvas) return;
  const a = document.createElement('a');
  a.download = `功德收據-${taipeiNow().id}.png`;
  a.href = receiptCanvas.toDataURL('image/png');
  a.click();
});
document.getElementById('printReceipt').addEventListener('click', () => {
  if (!receiptCanvas) return;
  document.getElementById('printImg').src = receiptCanvas.toDataURL('image/png');
  setTimeout(() => print(), 100);
});
document.getElementById('again').addEventListener('click', () => {
  doneUI.classList.remove('show', 'printing');
  show.mode = 'done';
  say('還有苦水，隨時再來。也可以繼續敲木魚喔。');
  q.placeholder = '還有苦水？再說一次⋯⋯';
  askForm.classList.add('show');
});

// 點木魚：只算「點一下」，拖曳旋轉不算
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || (show.mode !== 'done' && show.mode !== 'knock')) return;
  const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y), dt = performance.now() - downAt.t;
  downAt = null;
  if (moved > 8 || dt > 500) return;
  ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (ray.intersectObject(monk.fish, true).length || ray.intersectObject(monk.root, true).length) knockTap();
});

const easeOut = x => 1 - (1 - x) ** 3;
// 鏡頭飛行：跪下時拉近看木魚，下一首再拉回全景
const fly = { on: false, t0: 0, dur: 1.4, fromP: new THREE.Vector3(), fromT: new THREE.Vector3(), toP: new THREE.Vector3(), toT: new THREE.Vector3() };
const HOME_T = new THREE.Vector3(0, 2.3, -1.8);
function flyTo(pos, target) {
  fly.fromP.copy(camera.position); fly.fromT.copy(controls.target);
  fly.toP.copy(pos); fly.toT.copy(target); fly.t0 = show.clock; fly.on = true; controls.enabled = false;
}
function flyHome() {
  const portrait = innerWidth / innerHeight < 0.8;
  const s = new THREE.Spherical(a0Dist(), THREE.MathUtils.degToRad(portrait ? 84 : 86.5), THREE.MathUtils.degToRad(4));
  flyTo(HOME_T.clone().add(new THREE.Vector3().setFromSpherical(s)), HOME_T);
}
function flyClose() {
  const portrait = innerWidth / innerHeight < 0.8;
  const tgt = new THREE.Vector3(-0.25, portrait ? 0.95 : 1.0, 4.6);
  flyTo(tgt.clone().add(new THREE.Vector3(0.7, portrait ? 1.0 : 0.7, portrait ? 4.3 : 4.0)), tgt);
}
function flyTick() {
  if (!fly.on) return;
  const k = Math.min((show.clock - fly.t0) / fly.dur, 1), e = k * k * (3 - 2 * k);
  camera.position.lerpVectors(fly.fromP, fly.toP, e);
  controls.target.lerpVectors(fly.fromT, fly.toT, e);
  camera.lookAt(controls.target);
  if (k >= 1) { fly.on = false; controls.enabled = true; controls.update(); }
}
const malletAim = new THREE.Vector3(), malletFrom = new THREE.Vector3();
// 雙手合十：手臂直接指向合掌的手腕，長度剛好接上，不會跟手掌分開
const PRAY_DOWN = new THREE.Vector3(0, -1, 0), prayDir = new THREE.Vector3();
function monkPray(c) {
  for (const a of c.arms) {
    const s = a.userData.s;
    prayDir.set(s * 0.06 - a.position.x, 0.35 - a.position.y, 0.31 - a.position.z);
    a.scale.y = prayDir.length() / 0.29;
    a.quaternion.setFromUnitVectors(PRAY_DOWN, prayDir.normalize());
  }
}
function stageTick(t) {
  show.clock = t;
  soulTick(t);
  flyTick();
  if (!monk) return;
  const c = monk, b = beatPos();
  const grooving = (show.mode === 'rap' || show.mode === 'waiting') && b >= 0;
  const bounce = grooving ? (1 - (b % 1)) ** 3 : 0;
  anim.lanternMat && (anim.lanternMat.emissiveIntensity = 0.55 + bounce * 0.45);
  for (const p of anim.people) if (p.kind !== 'walk' && p.kind !== 'kneelBow') p.c.head.rotation.x += bounce * 0.14;

  const kneeling = ['kneel', 'knock', 'complete', 'done'].includes(show.mode);
  show.kneelK += ((kneeling ? 1 : 0) - show.kneelK) * 0.12;
  const k = show.kneelK;
  c.root.position.y = -0.3 * k;
  for (const l of c.legs) l.visible = k < 0.5;
  c.cushion.visible = k > 0.02; c.cushion.scale.setScalar(Math.max(k, 0.001));
  c.fish.visible = k > 0.02; c.fish.scale.setScalar(Math.max(easeOut(k), 0.001));
  c.mallet.visible = k > 0.5;
  const since = t - show.strikeAt;
  const hit = since < 0.07 ? since / 0.07 : since < 0.35 ? 1 - (since - 0.07) / 0.28 : 0;
  c.fishBody.scale.set(1 + hit * 0.06, 1 - hit * 0.08, 1 + hit * 0.06);

  for (const a of c.arms) a.scale.y = 1;
  if (grooving) {
    c.palms.visible = false;
    for (const a of c.arms) a.children[1].visible = true;
    c.hips.position.y = 0.42 - 0.035 * bounce;
    c.torso.rotation.set(0.07 * bounce, 0, Math.sin(b * Math.PI / 2) * 0.05);
    c.head.rotation.set(-0.06 + 0.14 * bounce, 0, 0);
    c.root.rotation.y = 0.06 + Math.sin(b * Math.PI / 4) * 0.14;
    const bar = Math.floor(b / 4);
    const [up, low] = bar % 2 ? [c.arms[1], c.arms[0]] : [c.arms[0], c.arms[1]];
    up.rotation.set(-1.85 + 0.35 * bounce, 0, (0.95 - 0.15 * bounce) * up.userData.s);
    low.rotation.set(-0.95 - 0.25 * bounce, 0, -0.55 * low.userData.s);
  } else if (kneeling) {
    c.palms.visible = false;
    for (const a of c.arms) a.children[1].visible = true;
    c.hips.position.y = 0.42;
    c.torso.rotation.set(0.12, 0, 0);
    c.head.rotation.set(0.12, 0, 0);
    c.root.rotation.y = 0.06;
    c.arms[0].rotation.set(-1.85 + 0.75 * hit, 0, 0.3);
    c.arms[1].rotation.set(-1.25, 0, -0.62);
    // 槌頭對準木魚頂部，舉起時對準上方，敲下時貼到木魚
    c.root.updateMatrixWorld(true);
    // 槌頭中心 = 木魚頂部再往上一個槌頭半徑（0.07），舉起時再高一點
    malletAim.set(0, 0.21 + 0.075 + 0.2 * (1 - hit), 0.04); c.fishBody.localToWorld(malletAim);
    c.mallet.lookAt(malletAim);
    const reach = c.mallet.getWorldPosition(malletFrom).distanceTo(malletAim) / c.root.scale.x;
    c.malletParts.head.position.z = reach;
    c.malletParts.stick.scale.z = reach;
  } else {
    c.palms.visible = true;
    for (const a of c.arms) a.children[1].visible = false;
    c.hips.position.y = 0.42;
    c.torso.rotation.set(0, 0, 0);
    c.head.rotation.set(0, 0, 0);
    c.root.rotation.y = 0.06;
    monkPray(c);
  }
  lyricTick();
}

askForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = q.value.trim(); if (!text || !['idle', 'done'].includes(show.mode)) return;
  q.value = ''; sendBtn.disabled = true; q.style.height = '44px'; q.blur();
  perform(text);
});

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
// 你的螢幕：公司群組視窗，會顯示你打的字
function drawPlayerScreen(text) {
  const s = OFF.screen; if (!s) return;
  const g = s.g, w = 512, h = 320;
  g.fillStyle = '#f7fbf7'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d9ead9'; g.fillRect(0, 0, w, 50);
  g.fillStyle = '#4d6b55'; g.font = '700 24px "Noto Sans TC", sans-serif'; g.textBaseline = 'middle';
  g.fillText('公司群組・未讀 99+', 20, 26);
  const msg = text || '今天又怎麼了？把苦水打在這裡⋯⋯';
  g.fillStyle = text ? '#23313a' : '#8fa39a'; g.font = '500 32px "Noto Sans TC", sans-serif'; g.textBaseline = 'top';
  const lines = []; let cur = '';
  for (const ch of msg) { if (g.measureText(cur + ch).width > w - 50) { lines.push(cur); cur = ch; } else cur += ch; }
  lines.push(cur);
  lines.slice(0, 6).forEach((l, i) => g.fillText(l, 24, 72 + i * 40));
  const last = lines.slice(0, 6), lw = g.measureText(last[last.length - 1]).width;
  g.fillStyle = '#2f7d4f'; g.fillRect(28 + lw, 72 + (last.length - 1) * 40, 4, 34);
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
  officeScene.add(new THREE.HemisphereLight('#fbf6ea', '#6f8f74', 1.05));
  const sun = new THREE.DirectionalLight('#ffe9cc', 2.3);
  sun.position.set(5, 11, 12.5); sun.target.position.set(0, 0, 2.0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 12, bottom: -12, near: 1, far: 50 });
  sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.02; sun.shadow.radius = 5;
  officeScene.add(sun, sun.target);
  const winLight = new THREE.PointLight('#dff0ff', 12, 14, 2); winLight.position.set(0, 2.6, -5.2); officeScene.add(winLight);

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
  buildOfficeRoom(); buildDesks(); buildMovers(); buildFrontZone();
  drawPlayerScreen('');
  buildNav();
  OFF.soulModel = buildSoul3D(); OFF.soulModel.visible = false; officeScene.add(OFF.soulModel);
  OFF.tail = makeSoulTail(); officeScene.add(OFF.tail.mesh);
  OFF.headGlow = glowSprite(); OFF.headGlow.visible = false; officeScene.add(OFF.headGlow);
  OFF.soulLight = new THREE.PointLight('#8fd6ff', 0, 7, 2); officeScene.add(OFF.soulLight);
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
    } else if (p.kind === 'drink') {
      const cyc = (t + p.ph) % 5, up = cyc > 3 && cyc < 4.6 ? Math.sin((cyc - 3) / 1.6 * Math.PI) : 0;
      c.arms[1].rotation.set(-1.0 - up * 1.3, 0, -0.35 * (1 - up) - up * 0.55);
      c.arms[0].rotation.set(0.05, 0, 0.12);
      c.head.rotation.set(-up * 0.35 + bounce * 0.15, 0, 0);
    }
  }
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

/* ---------- 辦公室：起身、走路、坐回去 ---------- */
const standBtn = document.getElementById('standBtn'), walkHint = document.getElementById('walkHint'), talkEl = document.getElementById('talk');
const HOVER = matchMedia('(hover: hover)').matches;
function setOfficeUI() {
  const st = OFF.state;
  standBtn.hidden = !(st === 'seated' || st === 'walk');
  standBtn.textContent = st === 'seated' ? '起身走走' : '回座位';
  walkHint.textContent = st === 'walk' ? (HOVER ? '點地板或用 WASD 走路・點同事聊天・點你的電腦回座位' : '點地板走路・點同事聊天・點你的電腦回座位') : '';
  if (st === 'seated' && show.mode === 'idle') askForm.classList.add('show'); else if (st !== 'soul') askForm.classList.remove('show');
}
function standUp() {
  if (OFF.state !== 'seated' || show.mode !== 'idle') return;
  const me = OFF.me;
  officeScene.attach(me.root);
  me.root.position.set(SEAT_STAND.x, 0, SEAT_STAND.z); me.root.rotation.set(0, 0, 0);
  me.hips.position.y = 0.42;
  for (const l of me.legs) { l.rotation.x = 0; l.children[1].rotation.x = 0; l.children[1].position.set(0, -0.38, 0.03); }
  me.torso.rotation.set(0, 0, 0); me.head.rotation.set(0, 0, 0);
  q.blur();
  OFF.state = 'walk'; OFF.path = [];
  setOfficeUI();
}
function sitDown() {
  const me = OFF.me;
  OFF.mine.add(me.root);
  me.root.position.set(0, 0, 0); me.root.rotation.set(0, 0, 0);
  sit(me);
  me.torso.rotation.set(0, 0, 0);
  OFF.state = 'seated'; OFF.path = []; OFF.goSeat = false;
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
  else if (OFF.state === 'walk') goTo(SEAT_STAND.x, SEAT_STAND.z, true);
});

const SPEED = 2.1;
function playerTick(t, dt, bounce, b) {
  const me = OFF.me; if (!me) return;
  if (OFF.state === 'soul') {
    // 靈魂出竅：身體趴在桌上
    const k = Math.min((t - OFF.soulT0) / 0.8, 1);
    me.torso.rotation.x = THREE.MathUtils.lerp(0.08, 0.72, easeOut(k));
    me.head.rotation.set(THREE.MathUtils.lerp(0.1, 0.45, k), 0, THREE.MathUtils.lerp(0, 0.25, k));
    for (const a of me.arms) { a.rotation.x = THREE.MathUtils.lerp(-1.05, -1.55, k); a.rotation.z = -0.35 * a.userData.s; }
    return;
  }
  if (OFF.state !== 'walk') return;
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
  if (OFF.face != null) { let d = OFF.face - me.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); me.root.rotation.y += d * Math.min(1, dt * 10); }
  const sw = moving ? Math.sin(t * 9) : 0;
  pos.y = moving ? Math.abs(Math.sin(t * 9)) * 0.04 : 0;
  me.legs[0].rotation.x = sw * 0.55; me.legs[1].rotation.x = -sw * 0.55;
  me.arms[0].rotation.set(-sw * 0.5, 0, 0.12); me.arms[1].rotation.set(sw * 0.5, 0, -0.12);
  me.head.rotation.set(0, 0, 0);
}

/* ---------- 辦公室：鏡頭（坐著看螢幕／走路跟著你／出竅看靈魂） ---------- */
const _camP = new THREE.Vector3(), _camT = new THREE.Vector3();
function camWant() {
  const P = OFF.portrait, st = OFF.state;
  if (st === 'walk') {
    const m = OFF.me ? OFF.me.root.position : SEAT_STAND;
    const off = P ? [1.4, 5.6, 7.6] : [1.2, 4.6, 6.6], tg = P ? [0, 0.5, -2.0] : [0, 0.6, -1.6];
    _camP.set(m.x * 0.6 + off[0], off[1], THREE.MathUtils.clamp(m.z + off[2], P ? 2.6 : 2.0, OFRONT - 0.6));
    _camT.set(m.x * 0.9 + tg[0], tg[1], Math.max(m.z + tg[2], OBACK + 1.2));
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
const _headW = new THREE.Vector3();
function cameraTick(dt) {
  const v = camWant(), k = OFF.camInit ? 1 - Math.exp(-dt * 3.2) : 1;
  OFF.camInit = true;
  ocam.position.lerp(v.pos, k); OFF.look.lerp(v.tgt, k); ocam.lookAt(OFF.look);
  // 坐著是第一人稱，視野放寬才看得到螢幕、鍵盤和手
  const fovWant = OFF.state === 'seated' ? (OFF.portrait ? 80 : 70) : (OFF.portrait ? 56 : 40);
  if (Math.abs(ocam.fov - fovWant) > 0.05) { ocam.fov += (fovWant - ocam.fov) * k; ocam.updateProjectionMatrix(); }
  // 鏡頭貼近自己時把頭藏起來，只留伸向鍵盤的手
  if (OFF.me) {
    OFF.me.head.getWorldPosition(_headW);
    const far = ocam.position.distanceTo(_headW) > 0.95;
    OFF.me.head.visible = far;
    OFF.me.torso.children[0].visible = far;   // 第一人稱時整個角色藏起來，換成專用手臂
    for (const l of OFF.me.legs) l.visible = far;
    for (const a of OFF.me.arms) a.visible = far;
    if (OFF.mySeat) for (const m of OFF.mySeat) m.visible = far;
    if (OFF.fpv) {
      const typing = show.clock - (OFF.lastKey ?? -9) < 0.35;
      for (const a of OFF.fpv) {
        a.g.visible = !far;
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
  if (moved > 10 || dtp > 600 || OFF.state === 'soul' || show.mode !== 'idle') return;
  ondc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  oray.setFromCamera(ondc, ocam);
  // 同事
  let best = null;
  for (const p of OFF.people) {
    if (p.me || !p.lines) continue;
    const hit = oray.intersectObject(p.c.root, true)[0];
    if (hit && (!best || hit.distance < best.d)) best = { p, d: hit.distance };
  }
  const mineHit = oray.intersectObject(OFF.mine, true)[0];
  if (best && (!mineHit || best.d < mineHit.distance)) { say2(best.p); return; }
  if (mineHit) { if (OFF.state === 'walk') goTo(SEAT_STAND.x, SEAT_STAND.z, true); else q.focus(); return; }
  if (oray.ray.intersectPlane(FLOOR, hitP)) {
    if (OFF.state === 'seated') standUp();
    if (OFF.state === 'walk') goTo(hitP.x, hitP.z);
  }
});
addEventListener('keydown', e => {
  if (!office.active || e.target === q) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
    if (OFF.state === 'seated' && show.mode === 'idle') standUp();
    if (OFF.state === 'walk') { OFF.keys.add(k); e.preventDefault(); }
  }
});
addEventListener('keyup', e => OFF.keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => OFF.keys.clear());

function say2(p) {
  const L = p.lines; p.lineIdx = ((p.lineIdx ?? -1) + 1) % L.length;
  talkEl.textContent = L[p.lineIdx];
  OFF.talk = { c: p.c, until: show.clock + 2.8 };
  talkEl.classList.add('show');
}
const _hp = new THREE.Vector3();
function talkTick(t) {
  const T = OFF.talk; if (!T) return;
  if (t > T.until || OFF.state === 'soul') { talkEl.classList.remove('show'); OFF.talk = null; return; }
  T.c.head.getWorldPosition(_hp); _hp.y += 0.55; _hp.project(ocam);
  talkEl.style.left = Math.min(Math.max((_hp.x * 0.5 + 0.5) * innerWidth, 110), innerWidth - 110) + 'px';
  talkEl.style.top = Math.max((-_hp.y * 0.5 + 0.5) * innerHeight, 60) + 'px';
}


/* ---------- 3D 靈魂：照 C 款（刺刺頭、鬆領帶、拿麥克風、往前指、幽靈尾巴） ---------- */
function ghostMat(o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: '#6ccbff', emissive: '#1b86e0', emissiveIntensity: 0.35, roughness: 0.4,
    transparent: true, opacity: 0.84, depthWrite: false, ...o });
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
  const body = M(), bright = M({ color: '#a8e4ff', emissiveIntensity: 0.45 }), deep = M({ color: '#2f86d6', emissive: '#0f5fb0' });
  const torso = new THREE.Group(); torso.position.y = 0.08; root.add(torso);
  mesh(lathe([[0, 0], [0.27, 0], [0.31, 0.08], [0.3, 0.3], [0.25, 0.48], [0.12, 0.56], [0, 0.57]]), body, torso);
  // 鬆掉的領帶、衣領
  const tie = mesh(rbox(0.08, 0.26, 0.035, 0.015), deep, torso, 0.03, 0.3, 0.29); tie.rotation.z = 0.25;
  for (const s of [-1, 1]) { const c = mesh(rbox(0.12, 0.05, 0.08, 0.02), bright, torso, s * 0.08, 0.52, 0.17); c.rotation.z = s * 0.4; }
  // 尾巴是另外一條連續的光（makeSoulTail），從這裡一路接到本人頭頂
  // 頭：臉、耳朵、圓圓的頭髮（跟本人一樣）
  const head = new THREE.Group(); head.position.y = 0.88; torso.add(head);
  mesh(sphere(0.4, 40, 24), M({ map: soulFaceTex(), color: '#9fdcff', opacity: 0.92 }), head);
  for (const s of [-1, 1]) mesh(sphere(0.085, 12, 10), body, head, s * 0.39, -0.02, 0);
  const cap = mesh(new THREE.SphereGeometry(0.42, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), bright, head); cap.rotation.x = -0.5;
  // 手：畫面左邊拿麥克風靠近嘴巴，畫面右邊往前指
  const micArm = new THREE.Group(); micArm.position.set(-0.25, 0.46, 0); torso.add(micArm);
  limb([0, 0, 0], [0.04, 0.22, 0.3], 0.07, body, micArm);
  mesh(sphere(0.08, 12, 10), body, micArm, 0.05, 0.25, 0.33);
  const mic = new THREE.Group(); mic.position.set(0.08, 0.3, 0.38); mic.rotation.set(-0.6, 0, -0.5); micArm.add(mic);
  mesh(cyl(0.025, 0.02, 0.2, 10), deep, mic, 0, -0.06, 0);
  mesh(sphere(0.055, 14, 10), M({ color: '#7fcfff', emissive: '#2f9cf0', emissiveIntensity: 0.8 }), mic, 0, 0.07, 0);
  const pointArm = new THREE.Group(); pointArm.position.set(0.25, 0.46, 0); torso.add(pointArm);
  limb([0, 0, 0], [0.38, 0.12, 0.26], 0.07, body, pointArm);
  mesh(sphere(0.08, 12, 10), body, pointArm, 0.41, 0.13, 0.28);
  const finger = mesh(new THREE.CapsuleGeometry(0.025, 0.09, 4, 8), body, pointArm, 0.5, 0.15, 0.33); finger.rotation.z = -1.2;
  root.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 5; } });
  root.userData = { mats, torso, head, micArm, pointArm };
  return root;
}
function makeSoulTail() {
  const N = 48, R = 16, geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 1) * (R + 1) * 3), 3));
  const idx = [];
  for (let i = 0; i < N; i++) for (let j = 0; j < R; j++) { const a = i * (R + 1) + j, b = a + R + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  geo.setIndex(idx);
  const mat = ghostMat({ color: '#7fd2ff', emissiveIntensity: 0.55 });
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
const SOUL_HOVER = new THREE.Vector3(0, 2.8, 3.55), _sf = new THREE.Vector3(), _sp = new THREE.Vector3();
function soulOut() {
  OFF.state = 'soul'; OFF.soulT0 = show.clock; OFF.soulUpT0 = null;
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
  if (k < 0) { s.visible = false; T.mesh.visible = false; G.scale.setScalar(0.3 + glowIn * 0.9); G.material.opacity = glowIn; return; }
  s.visible = true;
  const e = easeOut(k);
  // 靈魂從光裡長出來、往上飄
  _sp.copy(_hd).lerp(SOUL_HOVER, e);
  _sp.y += Math.sin(t * 1.7) * 0.07 * e + bounce * 0.05;
  let op = Math.min(1, k * 3), up = 0;
  if (OFF.soulUpT0 != null) { up = Math.min((t - OFF.soulUpT0) / 0.9, 1); _sp.y += up * up * 6; op *= 1 - up * 0.5; }
  s.position.copy(_sp);
  const sc = THREE.MathUtils.lerp(0.12, 1, e), stretch = (1 - e) * 0.7;
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
  G.scale.setScalar(THREE.MathUtils.lerp(1.2, 0.55, e) * (1 + bounce * 0.15));
  G.material.opacity = THREE.MathUtils.lerp(1, 0.55, e) * (1 - up);
  OFF.soulLight.position.copy(_sp).add(new THREE.Vector3(0, 0.9, 0.4)); OFF.soulLight.intensity = 6 * op;
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
const SCREEN_HINT = '今天又怎麼了？把苦水打在這裡⋯⋯';
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
  bubble.classList.add('show');
  soulOut();
  woosh(0.6, 240, 900);
}, { capture: true });

function woosh(dur, f0, f1) {
  ensureAudio();
  const t = audio.ctx.currentTime;
  noise(t, 0.22, dur, 'bandpass', f0, 2);
  tone('sine', f0, f1, t, 0.12, dur + 0.3);
}

// rap 唱完：靈魂往上飛出畫面 → 閃白 → 寺廟裡一道光飛進小和尚
function soulExit() {
  if (show.mode !== 'rap') return;
  show.mode = 'soul'; show.drawn = '';
  stopBeat();
  bubble.classList.remove('show', 'rap');
  OFF.soulUpT0 = show.clock;
  woosh(0.9, 300, 1400);
  setTimeout(() => office.flash.classList.add('on'), 550);
  setTimeout(() => {
    office.active = false;
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

/* ---------- 開場 ---------- */
const hint = document.getElementById('hint');
controls.addEventListener('start', () => { hint.style.opacity = 0; }, { once: true });

async function start() {
  try { await Promise.race([document.fonts.load(`900 64px "Noto Serif TC"`, '職場功德所準時下班薪想事成上班摸魚功德無量準點下班福報綿長福'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  window.__marks = { font: performance.now() - t0 };
  for (const f of [buildShell, buildPillars, buildPlaques, buildNiches, buildWindows, buildAltarBack, buildBuddha, buildAltar, buildCushions, buildLanterns, buildPeople, buildSmoke]) {
    const a = performance.now(); f(); window.__marks[f.name] = Math.round(performance.now() - a);
  }
  monk = buildMonk();
  buildOffice();
  tintShadows();
  window.__buildMs = performance.now() - t0;

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    tick(t);
    if (!fly.on) controls.update();
    if (office.active) { officeTick(t); renderer.render(officeScene, ocam); }
    else renderer.render(scene, camera);
    placeBubble();
  });
  const ld = document.getElementById('loading');
  ld.style.opacity = 0; setTimeout(() => ld.remove(), 700);
  window.__ready = true;
  if (office.active) officeIntro();
  else setTimeout(() => say('施主，今天有什麼可以幫您？', () => askForm.classList.add('show')), 900);
  setTimeout(() => { hint.style.opacity = 0; }, 7000);
}
start();
