// 入口：載入各個模組、開場、每一格畫面的主迴圈。
// 主要負責：趙芸（chaoyun）
import * as THREE from 'three';
import { askForm } from './ui.js';
import { camera, controls, renderer, scene, t0 } from './core.js';
import { buildAltar, buildAltarBack, buildBuddha, buildCushions, buildLanterns, buildNiches, buildPillars, buildPlaques, buildShell, buildSmoke, buildWindows, tintShadows } from './temple-scene.js';
import { buildMonk, buildPeople } from './characters.js';
import { fly, placeBubble, say, setMonk, tick } from './temple.js';
import { buildOffice, ocam, office, officeIntro, officeScene, officeTick } from './office.js';

/* ---------- 開場 ---------- */
const hint = document.getElementById('hint');
controls.addEventListener('start', () => { hint.style.opacity = 0; }, { once: true });

async function start() {
  try { await Promise.race([document.fonts.load(`900 64px "Noto Serif TC"`, '職場功德所準時下班薪想事成上班摸魚功德無量準點下班福報綿長福'), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  window.__marks = { font: performance.now() - t0 };
  for (const f of [buildShell, buildPillars, buildPlaques, buildNiches, buildWindows, buildAltarBack, buildBuddha, buildAltar, buildCushions, buildLanterns, buildPeople, buildSmoke]) {
    const a = performance.now(); f(); window.__marks[f.name] = Math.round(performance.now() - a);
  }
  setMonk(buildMonk());
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
