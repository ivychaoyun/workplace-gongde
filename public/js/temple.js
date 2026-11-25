// 寺廟的流程：動畫、對話、等歌詞 → rap → 跪下敲木魚 → 功德單。
// 主要負責：安淇（foraianother8-ann）；歌詞來源（LYRIC_SOURCE、localRap）與姵宣協調
import * as THREE from 'three';
import { askForm, bubble, q, sayEl, sendBtn, show } from './ui.js';
import { SERIF, a0Dist, altarLight, camera, controls, renderer } from './core.js';
import { W, anim } from './temple-scene.js';
import { SPB, WAITING_BEAT, audio, beatPos, bowl, ensureAudio, noise, pickBeat, sing, singLead, startBeat, stopBeat, synth, voice, woodfish } from './audio.js';
import { OFF, hideKtv, ktvOpen, ktvTick, ocam, office, placeKtv, soulExit, soulTick } from './office.js';
import { walkTick } from './temple-walk.js';

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
let monk;
// 小和尚在 main.js 開場時建好，再交給這裡
function setMonk(m) { monk = m; }
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
    if (!s || !s.visible) { bubble.style.visibility = 'hidden'; hideKtv(); return; }
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
  placeKtv(x, y, bubble.style.visibility);
}
q.addEventListener('input', () => {
  sendBtn.disabled = !q.value.trim();
  q.style.height = '44px'; q.style.height = Math.min(q.scrollHeight, 120) + 'px';
});
q.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); askForm.requestSubmit(); } });
/* ---------- 表演流程：等歌詞 → rap → 跪下敲木魚 ---------- */
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
    if (pick.verse) return { title: pick.verse.title, lines: pick.lines, scenario: pick.verse.scenario, blessing: '善哉善哉，施主今天辛苦了。' };
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
  if (office.active) { ktvTick(b); return; }
  if (show.mode === 'waiting') {
    drawLyric('wait' + (Math.floor(b / 2) % 3), () => [el('span', 'line', ['Beat 下', '呦～', '貧僧押韻中'][Math.floor(Math.max(b, 0) / 2) % 3]), el('span', 'next', '施主的苦水，正在變成歌詞⋯⋯')]);
    return;
  }
  if (show.mode !== 'rap') return;
  const { lines, title } = show.rap;
  const idx = Math.floor(b / 4) - show.startBar;
  // 語音開口會延遲一下，提早一點點送出，才會剛好在小節第 1 拍唱出來（singLead 在 audio.js 自動量）
  const singIdx = Math.floor((b + singLead()) / 4) - show.startBar;
  if (singIdx >= 0 && singIdx < lines.length && voice.sungIdx !== singIdx) { voice.sungIdx = singIdx; sing(lines[singIdx], SPB() * 3.3); }
  if (idx < 0) { drawLyric('ready', () => [el('span', 'title', `〈${title}〉`), el('span', 'line', '準備好了沒？'), el('span', 'next', lines[0])]); return; }
  if (idx >= lines.length) { office.active ? soulExit() : kneelDown(); return; }
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
  if (office.active) ktvOpen(); else bubble.classList.add('rap');
  show.mode = 'waiting'; show.drawn = ''; show.complaint = complaint; voice.sungIdx = -1;
  if (synth && voice.on) { synth.cancel(); synth.speak(new SpeechSynthesisUtterance(' ')); }
  if (controls.target.distanceTo(HOME_T) > 0.5) flyHome();
  startBeat(WAITING_BEAT);
  const rap = await fetchRap(complaint);
  if (show.mode !== 'waiting') return;
  show.rap = rap;
  startBeat(pickBeat(rap.scenario)); // 依歌詞的情境換一首節拍（beats.js），從頭開始
  show.startBar = Math.floor(Math.max(beatPos(), 0) / 4) + (audio.beat.intro ?? 2); // 前奏放完才開唱
  show.mode = 'rap';
}
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
  if (!office.active) walkTick(t, c);
  lyricTick();
}

askForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = q.value.trim(); if (!text || !['idle', 'done', 'roam'].includes(show.mode)) return;
  q.value = ''; sendBtn.disabled = true; q.style.height = '44px'; q.blur();
  perform(text);
});

export { easeOut, fly, kneelDown, monk, placeBubble, say, setMonk, tick, typing };
