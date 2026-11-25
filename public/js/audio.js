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
const voiceBtn = document.getElementById('voice');
function drawVoiceBtn() { voiceBtn.classList.toggle('off', !voice.on); voiceBtn.setAttribute('aria-label', voice.on ? '人聲 開' : '人聲 關'); }
voiceBtn.addEventListener('click', () => {
  voice.on = !voice.on; drawVoiceBtn();
  if (!voice.on && synth) synth.cancel();
  try { localStorage.setItem('merit-temple:voice', voice.on ? 'on' : 'off'); } catch (e) {}
});
drawVoiceBtn();

export { BEATS, SPB, singLead, WAITING_BEAT, audio, beatPos, bowl, ensureAudio, noise, pickBeat, sing, startBeat, stopBeat, synth, tone, voice, woodfish };
