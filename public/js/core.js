// 共用：畫布、相機、鏡頭控制、材質小工具、光線。
// 主要負責：趙芸（chaoyun）
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

export { GOLD, GOLD_SOFT, SERIF, a0Dist, altarLight, camera, canvasTex, controls, cyl, faceTex, lathe, limb, mat, mesh, plaqueTex, rbox, renderer, rnd, scene, sphere, sun, t0 };
