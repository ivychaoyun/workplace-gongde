// 第三幕三個修行的畫面：靜坐（呼吸圓）、心經（卷軸逐行亮起）、抽籤（搖籤筒 → 掉籤 → 籤詩）。
// 每個都用 open*({ onDone, onExit }) 打開：真的做完才呼叫 onDone（打勾），Esc 或「收起」呼叫 onExit。
// 主要負責：安淇（foraianother8-ann）
import { audio, bowl, ensureAudio, noise } from './audio.js';

/* ---------- 籤詩 ----------
   依情境挑（劇本 3-5 的範例）。寺廟裡目前拿不到情境 id，pickLot() 先回傳通用籤詩；
   之後辦公室把情境 id 傳過來（例如放在 show.scenario），就會自動配對。 */
const LOTS = {
  guess: { lines: ['今日之事，非汝之過。', '需求不明，問清楚不丟臉。'], note: '先把話講清楚，再動手。' },
  revise: { lines: ['改稿八次，稿非汝心。', '定好標準，眾人皆安。'], note: '請對方說出「改到什麼樣子算完成」。' },
  rush: { lines: ['五分鐘者，非五分鐘也。', '手上之事，先排先後。'], note: '說「不」也是功德。' },
  firefight: { lines: ['火非汝放，鍋非汝背。', '幫忙有期，寫明為要。'], note: '幫忙可以，記得說好到哪天。' },
  leave: { lines: ['假者，休也。', '訊息可等，青春不可。'], note: '已讀不回，是今天的修行。' },
  other: { lines: ['今日很鳥，明日未必。'], note: '先吃飯，先睡覺，其他明天再說。' },
};
function pickLot(scenarioId) { return { rank: '上上籤', ...(LOTS[scenarioId] || LOTS.other) }; }

/* ---------- 心經（玄奘譯本） ---------- */
const SUTRA = [
  '觀自在菩薩，行深般若波羅蜜多時，', '照見五蘊皆空，度一切苦厄。',
  '舍利子，色不異空，空不異色，', '色即是空，空即是色，受想行識，亦復如是。',
  '舍利子，是諸法空相，不生不滅，', '不垢不淨，不增不減。',
  '是故空中無色，無受想行識，', '無眼耳鼻舌身意，無色聲香味觸法，', '無眼界，乃至無意識界。',
  '無無明，亦無無明盡，', '乃至無老死，亦無老死盡。', '無苦集滅道，無智亦無得。',
  '以無所得故，菩提薩埵，', '依般若波羅蜜多故，心無罣礙。', '無罣礙故，無有恐怖，', '遠離顛倒夢想，究竟涅槃。',
  '三世諸佛，依般若波羅蜜多故，', '得阿耨多羅三藐三菩提。',
  '故知般若波羅蜜多，是大神咒，是大明咒，', '是無上咒，是無等等咒，', '能除一切苦，真實不虛。',
  '故說般若波羅蜜多咒，即說咒曰：', '揭諦揭諦，波羅揭諦，', '波羅僧揭諦，菩提薩婆訶。',
];
const LINE_MS = 1700; // 每一行亮起的間隔

/* ---------- 共用的外框 ---------- */
const box = document.createElement('div');
box.id = 'practiceBox';
box.setAttribute('role', 'dialog');
document.body.append(box);
let current = null; // { kind, close() }

function make(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
const isTouch = matchMedia('(hover: none)').matches;

function frame(kind, title) {
  box.replaceChildren();
  box.className = 'show ' + kind;
  const head = make('div', 'pb-head');
  head.append(make('b', 'pb-title', title));
  const x = make('button', 'pb-close', isTouch ? '收起' : '收起（Esc）'); x.type = 'button';
  head.append(x);
  const body = make('div', 'pb-body');
  box.append(head, body);
  return { body, x };
}
function closeBox() {
  box.className = '';
  box.replaceChildren();
  document.activeElement?.blur();
}

// 按住：空白鍵或畫面上的按鈕
function holdInput(btn, onChange) {
  const set = v => onChange(v);
  const down = e => { e.preventDefault(); btn.setPointerCapture?.(e.pointerId); set(true); };
  const up = () => set(false);
  btn.addEventListener('pointerdown', down);
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, up);
  btn.addEventListener('contextmenu', e => e.preventDefault());
  const kd = e => { if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) set(true); } };
  const ku = e => { if (e.code === 'Space') { e.preventDefault(); set(false); } };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  return () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); };
}

addEventListener('keydown', e => { if (e.code === 'Escape' && current) { e.preventDefault(); current.close(); } });

/* ---------- 靜坐：按住吸氣、放開吐氣，各 4 秒，三輪 ---------- */
const BREATH_S = 4, ROUNDS = 3;
function openSit({ onDone, onExit }) {
  ensureAudio(); bowl(audio.ctx.currentTime + 0.05);
  const { body, x } = frame('sit', '🪷 靜坐');
  const circle = make('div', 'breath');
  const word = make('div', 'breath-word', '');
  circle.append(word);
  const line = make('p', 'breath-line', '');
  const dots = make('div', 'breath-dots');
  const btn = make('button', 'hold-btn', '按住　吸氣'); btn.type = 'button';
  body.append(circle, line, dots, btn);

  let p = 0, holding = false, top = false, rounds = 0, last = performance.now(), raf = 0, finished = false;
  const stopKeys = holdInput(btn, v => { holding = v; });
  const drawDots = () => dots.replaceChildren(...Array.from({ length: ROUNDS }, (_, i) => make('span', i < rounds ? 'on' : '')));
  drawDots();
  const loop = now => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!finished) {
      p = Math.min(1, Math.max(0, p + (holding ? dt : -dt) / BREATH_S));
      if (p >= 1) top = true;
      if (top && p <= 0) { top = false; rounds++; drawDots(); if (rounds >= ROUNDS) finish(); }
    }
    circle.style.setProperty('--k', (0.42 + p * 0.58).toFixed(3));
    if (finished) { word.textContent = '坐好了'; line.textContent = '這口氣是你的。'; }
    else if (holding && !top) { word.textContent = '吸——'; line.textContent = '這口氣是你的。'; btn.textContent = '繼續按住'; }
    else if (holding && top) { word.textContent = '放開'; line.textContent = '可以慢慢吐氣了。'; btn.textContent = '放開　吐氣'; }
    else if (top || p > 0) { word.textContent = '吐——'; line.textContent = '那件事，先放在門外。'; btn.textContent = '按住　吸氣'; }
    else { word.textContent = isTouch ? '按住按鈕' : '按住空白鍵'; line.textContent = `吸氣 ${BREATH_S} 秒，再放開吐氣 ${BREATH_S} 秒，一共 ${ROUNDS} 輪。`; btn.textContent = '按住　吸氣'; }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  function finish() {
    finished = true; btn.hidden = true;
    bowl(audio.ctx.currentTime + 0.05);
    onDone();
    setTimeout(() => { if (current && current.kind === 'sit') close(); }, 2200);
  }
  function close() {
    cancelAnimationFrame(raf); stopKeys();
    current = null; closeBox(); onExit();
  }
  x.addEventListener('click', close);
  current = { kind: 'sit', close };
}

/* ---------- 心經：卷軸展開，一行一行亮起 ---------- */
function openSutra({ onDone, onExit }) {
  const { body, x } = frame('sutra', '📜 般若波羅蜜多心經');
  const scroll = make('div', 'scroll');
  const lines = SUTRA.map(t => make('p', 'sutra-line', t));
  scroll.append(...lines);
  const end = make('p', 'sutra-end', '心無罣礙。至少這一分鐘。');
  const next = make('button', 'next-btn', isTouch ? '下一句' : '下一句（空白鍵）'); next.type = 'button';
  body.append(scroll, end, next);
  // 唸誦音訊之後和姵宣串接（audio.js）：可以在 light() 裡依行數播放
  let i = -1, timer = 0, finished = false;
  function light() {
    i++;
    lines.forEach((l, k) => { l.classList.toggle('lit', k < i); l.classList.toggle('now', k === i); });
    const cur = lines[i];
    if (cur) scroll.scrollTo({ top: cur.offsetTop - scroll.clientHeight / 2 + cur.offsetHeight / 2, behavior: 'smooth' });
    if (i >= lines.length - 1) {
      clearInterval(timer);
      setTimeout(() => {
        lines.forEach(l => { l.classList.add('lit'); l.classList.remove('now'); });
        finished = true; end.classList.add('show'); next.hidden = true; x.textContent = '收起';
        onDone();
      }, LINE_MS);
    }
  }
  const restart = () => { clearInterval(timer); timer = setInterval(light, LINE_MS); };
  const advance = () => { if (!finished && i < lines.length - 1) { light(); restart(); } };
  next.addEventListener('click', advance);
  const kd = e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); advance(); } };
  addEventListener('keydown', kd);
  setTimeout(() => { if (current && current.kind === 'sutra') { light(); restart(); } }, 500);
  function close() {
    clearInterval(timer); removeEventListener('keydown', kd);
    current = null; closeBox(); onExit();
  }
  x.addEventListener('click', close);
  current = { kind: 'sutra', close };
}

/* ---------- 抽籤：按住搖籤筒，放開掉出一支籤 ---------- */
const SHAKE_MIN = 700; // 至少搖這麼久才會掉籤
let lastLot = null;
function openLot({ scenarioId, onDone, onExit }) {
  ensureAudio();
  const { body, x } = frame('lot', '🎋 抽籤');
  const stage = make('div', 'lot-stage');
  const tube = make('div', 'lot-tube');
  for (let k = 0; k < 9; k++) { const s = make('i'); s.style.setProperty('--n', k); tube.append(s); }
  const tubeBody = make('div', 'lot-body'); tubeBody.append(make('span', 'lot-label', '籤'));
  tube.append(tubeBody);
  const drop = make('div', 'lot-stick');
  stage.append(tube, drop);
  const tip = make('p', 'lot-tip', isTouch ? '按住按鈕搖籤筒，放開就會掉出一支籤。' : '按住空白鍵或按鈕搖籤筒，放開就會掉出一支籤。');
  const btn = make('button', 'hold-btn', '按住　搖籤筒'); btn.type = 'button';
  const slip = make('div', 'lot-slip');
  body.append(stage, tip, btn, slip);

  let shakeAt = 0, rattle = 0, state = 'idle';
  const stopKeys = holdInput(btn, v => {
    if (state !== 'idle' && state !== 'shake') return;
    if (v && state === 'idle') {
      state = 'shake'; shakeAt = performance.now(); tube.classList.add('shake'); tip.textContent = '喀啦喀啦⋯⋯';
      const t0 = audio.ctx.currentTime;
      rattle = setInterval(() => { const t = audio.ctx.currentTime; noise(t, 0.09, 0.05, 'bandpass', 1800 + Math.random() * 900, 4); }, 95);
      noise(t0, 0.09, 0.05, 'bandpass', 2000, 4);
    } else if (!v && state === 'shake') {
      clearInterval(rattle); tube.classList.remove('shake');
      if (performance.now() - shakeAt < SHAKE_MIN) { state = 'idle'; tip.textContent = '再多搖一下下。'; return; }
      state = 'drop'; btn.hidden = true; tip.textContent = '';
      drop.classList.add('fall');
      noise(audio.ctx.currentTime + 0.35, 0.12, 0.08, 'bandpass', 1200, 2);
      setTimeout(reveal, 900);
    }
  });
  function reveal() {
    if (!current || current.kind !== 'lot') return;
    state = 'slip';
    const lot = pickLot(scenarioId);
    lastLot = lot;
    slip.replaceChildren(make('b', null, lot.rank), ...lot.lines.map(l => make('p', null, l)), make('p', 'note', `解曰：${lot.note}`));
    slip.classList.add('show'); stage.classList.add('small');
    x.textContent = '收起';
    onDone();
  }
  function close() {
    clearInterval(rattle); stopKeys();
    current = null; closeBox(); onExit();
  }
  x.addEventListener('click', close);
  current = { kind: 'lot', close };
}
function getLastLot() { return lastLot; }
function practiceOpen() { return !!current; }

export { getLastLot, openLot, openSit, openSutra, pickLot, practiceOpen };
