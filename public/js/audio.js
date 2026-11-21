// 聲音：Web Audio 即時合成的節拍、木魚、磬，以及小師父的人聲（瀏覽器內建語音）。
// 主要負責：姵宣（peixuan）
import { q, show } from './ui.js';

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

export { SPB, audio, beatPos, bowl, ensureAudio, noise, sing, startBeat, stopBeat, synth, tone, voice, woodfish };
