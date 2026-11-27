// 聲音：Web Audio 即時合成的節拍、木魚、磬，以及小師父的人聲（瀏覽器內建語音）。
// 主要負責：姵宣（peixuan）
import { q, show } from './ui.js';
import { BEATS, WAITING_BEAT, pickBeat } from './beats.js';

/* ---------- 節拍：全部用 Web Audio 即時合成 ---------- */
const audio = { ctx: null, out: null, noise: null, playing: false, start: 0, next: 0, step: 0, timer: 0, bpm: 88 };
const SPB = () => 60 / audio.bpm;
function ensureAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = audio.ctx = new AC();
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    audio.out = ctx.createGain(); audio.out.gain.value = 0.8;
    audio.tone = ctx.createBiquadFilter(); audio.tone.type = 'lowpass'; audio.tone.frequency.value = 20000;
    audio.out.connect(audio.tone).connect(comp).connect(ctx.destination);
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
function woodfish(t = audio.ctx.currentTime, a = 0.7) { tone('triangle', 560, 430, t, a, 0.13); noise(t, a * 0.45, 0.035, 'bandpass', 1500, 5); }
function bowl(t) { tone('sine', 528, 0, t, 0.35, 3.2); tone('sine', 1327, 0, t, 0.12, 2.2); tone('sine', 2112, 0, t, 0.05, 1.4); }

/* ---------- 節拍庫用到的其他聲音 ---------- */
const clap = (t, a = 0.4) => { [0, 0.011, 0.023].forEach(d => noise(t + d, a, 0.08, 'bandpass', 1500, 1.5)); };
const openHat = (t, a) => noise(t, a, 0.28, 'highpass', 6500);
const rim = (t, a = 0.35) => { tone('triangle', 1700, 0, t, a * 0.5, 0.03); noise(t, a, 0.04, 'bandpass', 2600, 6); };
const snap = (t, a = 0.35) => noise(t, a, 0.05, 'bandpass', 2200, 3);
const shaker = (t, a) => noise(t, a, 0.06, 'bandpass', 6000, 1.5);
// 廟鼓：低沉的大鼓，音高往下掉
function drum(t, a = 0.8) { tone('sine', 120, 62, t, a, 0.55); noise(t, a * 0.25, 0.08, 'lowpass', 400, 1); }
const lowFish = (t, a = 0.6) => { tone('triangle', 380, 300, t, a, 0.16); noise(t, a * 0.35, 0.035, 'bandpass', 900, 5); };
// R&B 和弦鋪底：電鋼琴感，一個和弦撐整小節
const CHORDS = { m7: [0, 3, 7, 10], maj7: [0, 4, 7, 11], m9: [0, 3, 7, 10, 14], dom9: [0, 4, 10, 14], sus: [0, 5, 7, 10] };
function pad(t, root, kind, len) {
  (CHORDS[kind] || CHORDS.m7).forEach((iv, i) => {
    const f = root * 4 * 2 ** (iv / 12), { ctx } = audio, g = ctx.createGain(), o = ctx.createOscillator(), o2 = ctx.createOscillator();
    o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = f; o2.frequency.value = f * 2.001;
    const st = t + i * 0.012; // 和弦稍微錯開，像手指按下去
    g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(0.045, st + 0.02);
    g.gain.exponentialRampToValueAtTime(0.012, st + len * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, st + len);
    const g2 = ctx.createGain(); g2.gain.value = 0.25;
    o.connect(g).connect(audio.out); o2.connect(g2).connect(g);
    o.start(st); o2.start(st); o.stop(st + len + 0.05); o2.stop(st + len + 0.05);
  });
}
function bass(t, f, wave = 'sine', len = 0.38) {
  len = Math.max(len, 0.2);
  if (wave === 'saw') {
    const { ctx } = audio, o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; lp.type = 'lowpass'; lp.Q.value = 4;
    lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(140, t + len);
    env(g, t, 0.28, len); o.connect(lp).connect(g).connect(audio.out); o.start(t); o.stop(t + len + 0.05);
  } else if (wave === 'warm') {
    // 溫暖的電貝斯：三角波過低通，比純正弦波多一點「手彈」的顆粒
    const { ctx } = audio, o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 420;
    env(g, t, 0.5, len); o.connect(lp).connect(g).connect(audio.out); o.start(t); o.stop(t + len + 0.05);
  } else tone('sine', f, 0, t, 0.42, len);
  tone('sine', f * 2, 0, t, 0.12, len * 0.8); // 高八度的泛音，筆電喇叭也聽得到 bass
}
const STABS = {
  bell:  (t, f) => { tone('sine', f * 8, 0, t, 0.12, 1.2); tone('sine', f * 8 * 2.76, 0, t, 0.04, 0.6); },
  beep:  (t, f) => { tone('square', 1760, 0, t, 0.06, 0.07); tone('square', 1760, 0, t + 0.1, 0.06, 0.07); },
  siren: (t, f) => { tone('sawtooth', 700, 1300, t, 0.05, 0.55); },
  keys:  (t, f) => [1, 1.19, 1.5, 1.78].forEach(r => tone('sine', f * 4 * r, 0, t, 0.06, 0.9)), // 小七和弦
  pluck: (t, f) => tone('triangle', f * 8, f * 7.9, t, 0.18, 0.25),
  click: (t) => noise(t, 0.3, 0.015, 'bandpass', 3200, 8),
};
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteHz(name) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(name || 'A1');
  if (!m) return 55;
  const midi = 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
// 節奏字串的第 step 格：'x' 打、'X' 重音、'o' 開放 hi-hat、其他都不打
const hit = (pat, step) => (pat ? pat[step % pat.length] : '.') || '.';

// Trap 的 808：又長又重的低音，換音時從上一個音滑過去
let last808 = 0;
function bass808(t, f, len) {
  const { ctx } = audio, o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), g2 = ctx.createGain();
  const from = last808 || f; last808 = f;
  o.type = 'sine'; o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(f, t + (from === f ? 0.001 : 0.09));
  o2.type = 'sine'; o2.frequency.setValueAtTime(from * 2, t); o2.frequency.exponentialRampToValueAtTime(f * 2, t + (from === f ? 0.001 : 0.09));
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.75, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  g2.gain.value = 0.22; // 高八度，讓筆電喇叭也聽得到 808
  o.connect(g); o2.connect(g2).connect(g); g.connect(audio.out);
  o.start(t); o2.start(t); o.stop(t + len + 0.05); o2.stop(t + len + 0.05);
  tone('sine', 180, 50, t, 0.5, 0.08); // 808 的起音
}
// 暗黑鋼琴：一下一個音，依 arp 的音程輪流彈
function piano(t, f, a = 0.12) {
  tone('triangle', f, 0, t, a, 1.1); tone('sine', f * 2, 0, t, a * 0.35, 0.6); tone('sine', f * 3, 0, t, a * 0.1, 0.3);
}
// 黑膠底噪：隨機的細小爆音
const crackle = t => { if (Math.random() < 0.35) noise(t + Math.random() * 0.05, 0.03 + Math.random() * 0.04, 0.008, 'highpass', 3000); };

// 前奏的旋律：小調五聲音階，兩小節、每格一個 8 分音符；null 是休息。節拍資料可以用 hook 換掉
const HOOK = [0, 3, 5, 7, 10, 7, 5, 3,  0, 3, 5, 3, 0, -2, 0, null];
// 前奏的樂器（節拍資料用 introSound 選）
const INTRO = {
  keys:  { pad: 'm9', play: (t, f) => { tone('sine', f, 0, t, 0.1, 1.3); tone('sine', f * 2, 0, t, 0.025, 0.5); tone('triangle', f * 1.002, 0, t, 0.03, 0.9); } }, // R&B 電鋼琴
  piano: { pad: 'm7', play: (t, f) => piano(t, f, 0.14) },                                                                  // 爵士鋼琴
  bell:  { pad: 'sus', play: (t, f) => { tone('sine', f * 2, 0, t, 0.09, 1.6); tone('sine', f * 2 * 2.4, 0, t, 0.025, 0.7); tone('triangle', f, f * 0.995, t, 0.08, 0.3); } }, // 廟裡的鈴＋撥弦
  dark:  { pad: '', play: (t, f) => { piano(t, f / 2, 0.16); tone('sine', f / 2 * 1.006, 0, t, 0.04, 1.0); } },              // Trap 暗黑鋼琴
};

/* ---------- 播放：依目前的節拍（beats.js 的一筆資料）排程 ---------- */
audio.beat = WAITING_BEAT;
function playStep(step, t) {
  const b = audio.beat, s = step % 16, bar = Math.floor(step / 16);
  if (s % 2 === 1 && b.swing) t += (SPB() / 4) * b.swing; // 反拍往後拖，做出搖擺感
  const root = noteHz(b.key) * 2 ** ((b.bass?.[bar % (b.bass.length || 1)] || 0) / 12);
  // 前奏：歌詞還沒開始的小節，只放旋律和和弦，鼓先不進來
  const introBars = b.intro ?? (b.scenario ? 2 : 0);
  if (bar < introBars) {
    const style = INTRO[b.introSound] || INTRO.piano;
    if (s === 0) { if (b.pad || style.pad) pad(t, root, b.pad || style.pad, SPB() * 4); if (bar === 0) bowl(t); }
    const hook = b.hook || HOOK, n = hook[(bar * 8 + Math.floor(s / 2)) % hook.length];
    if (s % 2 === 0 && n != null) style.play(t, noteHz(b.key) * 8 * 2 ** (n / 12));
    if (bar === introBars - 1 && s >= 8 && s % 2 === 0) hat(t, 0.05 + s * 0.004); // 第二小節後半 hi-hat 漸強，帶進主歌
    if (bar === introBars - 1 && s === 14) woodfish(t, 0.5);
    return;
  }
  if (s === 0 && b.bowl && bar % b.bowl === 0) bowl(t);
  if (s === 0 && b.pad) pad(t, root, b.pad, SPB() * 4);
  const k = hit(b.kick, step);   if (k !== '.') { kick(t); if (b.bassWave !== 'none') bass(t, root, b.bassWave, SPB() * (b.bassLen || 0.45)); }
  const d = hit(b.drum, step);   if (d !== '.') drum(t, d === 'X' ? 0.9 : 0.6);
  const r = hit(b.rim, step);    if (r !== '.') rim(t, r === 'X' ? 0.45 : 0.3);
  const sp = hit(b.snap, step);  if (sp !== '.') snap(t, 0.35);
  const sh = hit(b.shaker, step); if (sh !== '.') shaker(t, sh === 'X' ? 0.12 : 0.06);
  const lf = hit(b.fish2, step); if (lf !== '.') lowFish(t, lf === 'X' ? 0.6 : 0.45);
  const sn = hit(b.snare, step); if (sn !== '.') snare(t);
  const c = hit(b.clap, step);   if (c !== '.') clap(t, c === 'X' ? 0.55 : 0.4);
  const h = hit(b.hat, step);
  const hv = b.hatVol ?? 1;
  const sd = SPB() / 4;
  if (h === 'o') openHat(t, 0.12 * hv);
  else if (h === 'r') [0, 0.5].forEach(d => hat(t + d * sd, 0.08 * hv));          // 32 分音符連打
  else if (h === 't') [0, 1 / 3, 2 / 3].forEach(d => hat(t + d * sd, 0.07 * hv)); // 三連音連打
  else if (h !== '.') hat(t, (h === 'X' || s % 4 === 0 ? 0.16 : 0.09) * hv);
  const e8 = hit(b.b808, step);
  if (e8 !== '.') bass808(t, root * (e8 === 'X' ? 2 ** (7 / 12) : 1), SPB() * (b.bassLen || 2));
  const pn = hit(b.piano, step);
  if (pn !== '.') { const arp = b.arp || [0, 3, 7, 10]; piano(t, root * 8 * 2 ** (arp[Math.floor(step / 2) % arp.length] / 12)); }
  if (b.vinyl) crackle(t);
  const f = hit(b.fish, step);
  if (f !== '.') woodfish(t, f === 'X' ? 0.6 : 0.45);
  else if (show.mode === 'waiting' && s % 4 === 0) woodfish(t, 0.5); // 等歌詞時每拍敲木魚
  const st = hit(b.stab, step);  if (st !== '.') (STABS[b.stabSound] || STABS.bell)(t, root);
  // 每小節第 4 拍是換氣的空檔，用木魚墊一下（像饒舌的 ad-lib），句子之間比較有節奏感
  if (b.scenario && b.fill !== false && show.mode !== 'waiting') {
    if (s === 13) lowFish(t, 0.35);
    if (s === 15) woodfish(t, 0.3);
  }
}
function schedule() {
  while (audio.next < audio.ctx.currentTime + 0.12) { playStep(audio.step, audio.next); audio.next += SPB() / 4; audio.step++; }
}
// startBeat()：用目前的節拍；startBeat(節拍)：換成那一首並從頭開始
function startBeat(beat) {
  if (beat) { audio.beat = beat; audio.bpm = beat.bpm; last808 = 0; }
  audio.tone.frequency.setValueAtTime(audio.beat.warm ? 4200 : 20000, audio.ctx.currentTime);
  audio.start = audio.next = audio.ctx.currentTime + 0.12; audio.step = 0; audio.playing = true;
  clearInterval(audio.timer); audio.timer = setInterval(schedule, 25); schedule();
}
function stopBeat() { clearInterval(audio.timer); audio.playing = false; singTimers.forEach(clearTimeout); singTimers = []; }
const beatPos = () => (audio.playing ? (audio.ctx.currentTime - audio.start) / SPB() : -1);

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
// 唱一句（跟著節拍時給 seconds＝這句可以用的秒數）。
// 每台電腦的語音唸得快慢不同、開口前也會延遲一下，所以邊唱邊量：
//   voice.cps  這個語音在正常語速下每秒唸幾個字
//   voice.lat  呼叫後多久才真正出聲（秒）
// 量到的數字會讓下一句的語速更準；開口延遲則交給 temple.js 提早一點送出（singLead）。
voice.cps = 3.4; voice.lat = 0.35; // 起始值抓保守：寧可唸完早一點收，也不要被下一句切掉
let singTimers = [];
function sing(text, seconds, pitch = 0.85) {
  if (!synth || !voice.on || !text) return;
  synth.cancel(); singTimers.forEach(clearTimeout); singTimers = [];
  // 歌詞裡的空白是換氣點，換成逗號，語音會自然停頓一下
  const said = text.trim().replace(/\s+/g, '，');
  const chars = [...text.replace(/\s+/g, '')].length;
  const u = new SpeechSynthesisUtterance(said);
  voice.pick = voice.pick || pickVoice();
  if (voice.pick) u.voice = voice.pick;
  u.lang = voice.pick?.lang || 'zh-TW';
  // 每個換氣的逗號大約佔 1.5 個字的時間
  const need = chars + 1.5 * (said.length - text.replace(/\s+/g, '').length);
  u.rate = seconds ? Math.min(Math.max(need / (voice.cps * seconds), 0.8), 2.2) : 1;
  u.pitch = pitch;
  const sent = performance.now(); let began = 0;
  u.onstart = () => { began = performance.now(); voice.lat = voice.lat * 0.6 + ((began - sent) / 1000) * 0.4; };
  u.onend = () => {
    if (!began || !seconds) return;
    const dur = (performance.now() - began) / 1000;
    if (dur > 0.4) voice.cps = Math.min(Math.max(voice.cps * 0.6 + (need / (dur * u.rate)) * 0.4, 2.5), 7);
  };
  synth.speak(u);
}
// 要提早幾拍送出，才會剛好在小節第 1 拍開口
const singLead = () => Math.min(voice.lat, 0.6) / SPB();
/* ---------- 心經配樂（第三幕「心經」修行用，原創合成，不用任何錄音） ----------
   五種輕柔風格（鋼琴、豎琴、電鋼琴、弦樂），每句經文兩小節，小師父在第 1 拍開口唸，每句開頭一聲輕木魚。
   音樂帶著字走：卷軸要亮哪一行，由這裡用 onLine(i) 通知，不要另外用計時器。
   用法（temple-practice.js 的 openSutra）：
     startSutra(SUTRA, { onLine: i => 亮第 i 行, onEnd: () => 唸完了 });
     「下一句」按鈕 → sutraNext()；收起 → stopSutra(false)
   五種風格在 SUTRA_STYLES，每次隨機挑一種；想指定就傳 { style: 'zen' }。startSutra 會回傳挑到的風格。 */
const SUTRA_INTRO = 2, SUTRA_BARS_PER_LINE = 2, SUTRA_OUTRO = 2;
// 五種風格，每次打開隨機挑一種（不會連續同一種）。全部輕柔、沒有重鼓，主角樂器各不同。
// chords：每小節一個和弦，四小節一輪，第一個音是低音
// 節奏一小節 16 格：
//   comp 和弦伴奏（compInst：'piano' 鋼琴、'ep' 電鋼琴）
//   arp  分解和弦，一格一個音（arpInst：'piano' 鋼琴、'harp' 豎琴）
//   bass 低音（bassInst：'piano' 輕鋼琴低音、'cello' 大提琴長音）
//   strings: true＝弦樂長音鋪底，每小節換和弦
//   shaker 沙鈴、brush 輕刷、snap 彈指、kick 很輕的大鼓
const SUTRA_STYLES = [
  { id: 'piano', name: '晨光鋼琴', bpm: 96,
    chords: [['D3', 'A3', 'C#4', 'F#4'], ['B2', 'F#3', 'A3', 'D4'], ['G2', 'D3', 'F#3', 'B3'], ['A2', 'E3', 'G3', 'C#4']],
    comp: '...x..x...x.....', compInst: 'piano', bass: 'x.......x.......', bassInst: 'piano', shaker: '..x...x...x...x.', brush: '....x.......x...' },
  { id: 'harp', name: '海邊豎琴', bpm: 92,
    chords: [['G2', 'D3', 'B3', 'F#4'], ['E2', 'B2', 'G3', 'D4'], ['C3', 'G3', 'B3', 'E4'], ['D3', 'A3', 'B3', 'F#4']],
    arp: 'x.x.x.x.x.x.x.x.', arpInst: 'harp', strings: true },
  { id: 'lofi', name: '午後 lo-fi', bpm: 88,
    chords: [['F2', 'A3', 'C4', 'E4'], ['E2', 'G3', 'B3', 'D4'], ['D2', 'F3', 'A3', 'C4'], ['C2', 'E3', 'G3', 'B3']],
    comp: 'x.....x...x.....', compInst: 'ep', bass: 'x.........x.....', bassInst: 'piano', snap: '....x.......x...', kick: 'x.........x.....', shaker: 'x.x.x.x.x.x.x.x.' },
  { id: 'strings', name: '禪意弦樂', bpm: 90,
    chords: [['A2', 'E3', 'G3', 'C4'], ['F2', 'C3', 'E3', 'A3'], ['C3', 'G3', 'B3', 'E4'], ['G2', 'D3', 'E3', 'B3']],
    strings: true, bass: 'x...............', bassInst: 'cello', arp: 'x.......x.......', arpInst: 'piano' },
  { id: 'neosoul', name: '雨天 neo-soul', bpm: 90,
    chords: [['E2', 'G#3', 'B3', 'D#4', 'F#4'], ['C#2', 'E3', 'G#3', 'B3', 'D#4'], ['A2', 'C#3', 'G#3', 'B3', 'E4'], ['B2', 'A3', 'C#4', 'E4', 'F#4']],
    comp: 'x.......x.x.....', compInst: 'ep', strings: true, bass: 'x.....x.........', bassInst: 'piano', snap: '....x.......x...', brush: '..x...x...x...x.' },
];
const sutra = { on: false, lastStyle: null };
function pickSutraStyle(id) {
  let pool = SUTRA_STYLES.filter(st => !id || st.id === id);
  if (!id && pool.length > 1) pool = pool.filter(st => st.id !== sutra.lastStyle);
  const st = pool[Math.floor(Math.random() * pool.length)] || SUTRA_STYLES[0];
  sutra.lastStyle = st.id;
  return st;
}
// 共用：一個振盪器接到心經的總線
function sOsc(type, f, t, end, gainNode, detune = 0) {
  const o = audio.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(gainNode); o.start(t); o.stop(end + 0.05); return o;
}
// 鋼琴：柔和的槌擊，泛音少、慢慢消失（低音消失得慢）
function softPiano(t, f, a = 0.06) {
  const { ctx } = audio, g = ctx.createGain(), lp = ctx.createBiquadFilter(), dur = f < 200 ? 2.6 : f < 500 ? 2 : 1.5;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(f * 6, 6000), t); lp.frequency.exponentialRampToValueAtTime(Math.max(f * 2, 300), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.006); g.gain.exponentialRampToValueAtTime(a * 0.35, t + 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(lp).connect(sutra.bus);
  const h2 = ctx.createGain(); h2.gain.value = 0.35; h2.connect(g);
  const h3 = ctx.createGain(); h3.gain.value = 0.12; h3.connect(g);
  sOsc('sine', f, t, t + dur, g); sOsc('sine', f, t, t + dur, g, 3);
  sOsc('sine', f * 2, t, t + dur, h2); sOsc('sine', f * 3, t, t + dur, h3);
}
// 電鋼琴：圓潤、帶一點鐘聲感
function softEP(t, f, a = 0.045) {
  const { ctx } = audio, g = ctx.createGain(), bell = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  bell.gain.value = 0.12; g.connect(sutra.bus); bell.connect(g);
  sOsc('sine', f, t, t + 1.8, g); sOsc('sine', f * 2.002, t, t + 1.8, bell);
}
// 豎琴：清亮的撥弦，比吉他輕、高
function harp(t, f, a = 0.07) {
  const { ctx } = audio, g = ctx.createGain(), h = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  h.gain.value = 0.25; g.connect(sutra.bus); h.connect(g);
  sOsc('triangle', f, t, t + 1.6, g); sOsc('sine', f * 2, t, t + 0.6, h);
}
// 弦樂：幾把小提琴、中提琴一起拉長音，慢慢進來、慢慢退
function strings(t, notes, len) {
  const { ctx } = audio, lp = ctx.createBiquadFilter(), g = ctx.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 2600; lp.Q.value = 0.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.014, t + len * 0.3); g.gain.linearRampToValueAtTime(0.011, t + len * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + len * 1.08);
  lp.connect(g).connect(sutra.bus);
  for (const n of notes.slice(1)) {
    const f = noteHz(n) * UP;
    for (const d of [-7, 0, 7]) sOsc('sawtooth', f, t, t + len * 1.1, lp, d); // 三把琴稍微不同音準，聽起來像一群人
  }
}
// 大提琴：低音長音，慢慢拉出來
function cello(t, f, len) {
  const { ctx } = audio, lp = ctx.createBiquadFilter(), g = ctx.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 500;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.025, t + 0.5); g.gain.linearRampToValueAtTime(0.0001, t + len);
  lp.connect(g).connect(sutra.bus);
  sOsc('sawtooth', f, t, t + len, lp, -4); sOsc('sawtooth', f, t, t + len, lp, 4);
}
// 和弦都往上彈一個八度（UP），聲音比較輕、比較透，不會悶
const UP = 2;
const SUTRA_INST = {
  piano: (t, notes, a) => notes.forEach((n, i) => softPiano(t + i * 0.012, noteHz(n) * UP, a)),
  ep: (t, notes, a) => notes.forEach((n, i) => softEP(t + i * 0.01, noteHz(n) * UP, a)),
  harp: (t, notes, a) => notes.forEach(n => harp(t, noteHz(n) * UP * 2, a)),
};
function sutraStep(step, t) {
  const st = sutra.style, s = step % 16, bar = Math.floor(step / 16), sd = (60 / st.bpm) / 4;
  if (s % 2 === 1) t += sd * 0.14; // 一點點搖擺
  const ch = st.chords[bar % st.chords.length], up = ch.slice(1);
  const at = (p) => p && p[s] && p[s] !== '.';
  if (s === 0 && st.strings) strings(t, ch, sd * 16);
  if (at(st.bass)) {
    if (st.bassInst === 'cello') cello(t, noteHz(ch[0]), sd * 15);
    else softPiano(t, noteHz(ch[0]) * 2 * (s === 8 ? 1.5 : 1), 0.022); // 低音也輕輕的，往上一個八度
  }
  if (at(st.comp)) SUTRA_INST[st.compInst || 'piano'](t, up, st.compInst === 'ep' ? 0.04 : 0.035);
  if (at(st.arp)) {
    // 第幾個音：這一格前面打了幾下；單數小節往下彈，雙數小節往上彈
    const k = [...st.arp.slice(0, s)].filter(c => c !== '.').length, seq = bar % 2 ? [...up].reverse() : up;
    const n = seq[k % seq.length];
    SUTRA_INST[st.arpInst || 'piano'](t, [n], st.arpInst === 'harp' ? 0.07 : 0.06);
  }
  if (at(st.shaker)) noise(t, s % 4 === 2 ? 0.02 : 0.011, 0.05, 'bandpass', 5500, 1.5);
  if (at(st.brush)) noise(t, 0.03, 0.12, 'bandpass', 1800, 0.8);
  if (at(st.snap)) noise(t, 0.08, 0.04, 'bandpass', 2200, 3);
  if (at(st.kick)) tone('sine', 95, 45, t, 0.1, 0.22);
}
function startSutra(lines, { onLine, onEnd, style } = {}) {
  ensureAudio(); stopSutra(false);
  const st = pickSutraStyle(style);
  const { ctx } = audio, t = ctx.currentTime + 0.15, bar = 4 * 60 / st.bpm;
  const bus = ctx.createGain(); bus.gain.value = 0.95;
  const delay = ctx.createDelay(1), fb = ctx.createGain(), lp = ctx.createBiquadFilter(), wet = ctx.createGain();
  delay.delayTime.value = 0.3; fb.gain.value = 0.25; lp.type = 'lowpass'; lp.frequency.value = 2200; wet.gain.value = 0.22;
  bus.connect(audio.out); bus.connect(delay); delay.connect(lp).connect(fb).connect(delay); delay.connect(wet).connect(audio.out);
  Object.assign(sutra, { on: true, style: st, bus, fx: [delay, fb, lp, wet], lines, onLine, onEnd, t0: t, bar, step: 0, next: t,
    i: 0, lineAt: t + SUTRA_INTRO * bar, sung: -1, endAt: 0 });
  bowl(t);
  sutra.timer = setInterval(sutraTick, 25); sutraTick();
  return st;
}
function sutraTick() {
  if (!sutra.on) return;
  const now = audio.ctx.currentTime, sd = (60 / sutra.style.bpm) / 4;
  while (sutra.next < now + 0.15) { sutraStep(sutra.step, sutra.next); sutra.next += sd; sutra.step++; }
  const { lines } = sutra;
  if (sutra.i < lines.length) {
    // 提早一點送出語音（開口延遲），剛好在小節第 1 拍唸出來
    if (sutra.sung !== sutra.i && now >= sutra.lineAt - Math.min(voice.lat, 0.6)) {
      sutra.sung = sutra.i;
      woodfish(Math.max(sutra.lineAt, now), 0.22);
      sing(lines[sutra.i].replace(/[，。、：；！]/g, ' ').trim(), sutra.bar * SUTRA_BARS_PER_LINE * 0.82, 0.85);
    }
    if (now >= sutra.lineAt) {
      sutra.onLine && sutra.onLine(sutra.i);
      sutra.i++; sutra.lineAt += sutra.bar * SUTRA_BARS_PER_LINE;
      if (sutra.i >= lines.length) sutra.endAt = sutra.lineAt + SUTRA_OUTRO * sutra.bar;
    }
  } else if (now >= sutra.endAt) {
    const cb = sutra.onEnd; stopSutra(true); cb && cb();
  }
}
// 「下一句」：下一行改在下一個小節開頭進來（不會打亂節奏）
function sutraNext() {
  if (!sutra.on || sutra.i >= sutra.lines.length) return;
  const now = audio.ctx.currentTime, nextBar = sutra.t0 + Math.ceil((now - sutra.t0 + 0.05) / sutra.bar) * sutra.bar;
  if (nextBar < sutra.lineAt) sutra.lineAt = nextBar;
}
// final：true＝唸完了，最後一個和弦＋磬再淡出；false＝中途收起，直接淡出
function stopSutra(final = true) {
  if (!sutra.bus) return;
  clearInterval(sutra.timer);
  const { ctx } = audio, t = ctx.currentTime, bus = sutra.bus, fx = sutra.fx;
  let fade = 1;
  if (final && sutra.on) { const c = sutra.style.chords[0]; SUTRA_INST.piano(t + 0.05, c, 0.045); bowl(t + 0.05); fade = 4; }
  else if (synth) synth.cancel();
  bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t);
  bus.gain.setValueAtTime(bus.gain.value, t + fade - 0.8); bus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  setTimeout(() => { try { bus.disconnect(); fx.forEach(n => n.disconnect()); } catch (e) { /* 已經斷開 */ } }, (fade + 2.5) * 1000);
  Object.assign(sutra, { on: false, bus: null, fx: null, onLine: null, onEnd: null });
}

const voiceBtn = document.getElementById('voice');
function drawVoiceBtn() { voiceBtn.classList.toggle('off', !voice.on); voiceBtn.setAttribute('aria-label', voice.on ? '人聲 開' : '人聲 關'); }
voiceBtn.addEventListener('click', () => {
  voice.on = !voice.on; drawVoiceBtn();
  if (!voice.on && synth) synth.cancel();
  try { localStorage.setItem('merit-temple:voice', voice.on ? 'on' : 'off'); } catch (e) {}
});
drawVoiceBtn();

export { BEATS, SPB, singLead, WAITING_BEAT, audio, beatPos, bowl, ensureAudio, noise, pickBeat, sing, startBeat, SUTRA_STYLES, startSutra, stopBeat, stopSutra, sutraNext, synth, tone, voice, woodfish };
