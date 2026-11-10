// 抱怨專輯的歌，由 feature/rap-mode 負責。
// 歌詞預設從歌詞庫（lyric-library.js）依「情境＋抱怨」挑一首；也可以切成 AI 現編（見 LYRIC_SOURCE）。
// 歌詞庫沒載入時才用下面固定的 RAP_VERSES。
// 節拍、木魚聲、磬都用 Web Audio 即時合成，不需要音檔；小師父用瀏覽器內建語音跟著唱。
// 30 秒主打歌放 assets/music/album/<情境id>.mp3（只配固定的 RAP_VERSES，其他歌詞時不播，因為字對不上）

const RAP_VERSES = {
  guess: [
    "需求不講 只說你懂",
    "我是企劃 不是乩童",
    "猜對沒賞 猜錯重弄",
    "拜託開口 別讓我放空",
  ],
  revise: [
    "第一版 第二版 改到第八版",
    "回饋只有一句 感覺不對再看看",
    "最後拍板 竟然選回第一版",
    "我的青春 全獻給存檔那一按",
  ],
  rush: [
    "五分鐘 很簡單 這句我聽到爛",
    "五點半 丟過來 說明天就要看",
    "手上三件 件件都在趕",
    "先排順序 不然我只能說 不敢",
  ],
  firefight: [
    "說好幫忙 只是看一下",
    "回過神來 火場登記在我名下",
    "原本的負責人 現在人在哪",
    "火不是我放的 別叫我一直扛著它",
  ],
  leave: [
    "人在海邊 手機響不停",
    "已讀不回 是我的休假宣言",
    "請假是休息 不是換地點上線",
    "急件找代理 我正在看海平線",
  ],
  other: [
    "今天這件事 真的很鳥",
    "我的火氣 已經快爆表",
    "先把怨氣 寄放這裡",
    "深呼吸 下班 明天再處理",
  ],
};

function getRapVerse(scenarioId) {
  return (RAP_VERSES[scenarioId] || RAP_VERSES.other).join("\n");
}

function getSongPath(scenarioId) {
  return `assets/music/album/${scenarioId}.mp3`;
}

// ---------- 歌詞來源 ----------
// "library"：從事先寫好的歌詞庫挑（lyric-library.js），不花錢、不上傳，是預設
// "ai"：交給 AI 現編（api/ 資料夾的服務），連不上時改用歌詞庫
const LYRIC_SOURCE = "library";

// AI 歌詞服務的網址；空字串代表不用 AI
const RAP_API_URL = "https://workplace-gongde-rap.lisashe56.workers.dev/rap";

// 回傳 { lines, title, source: "ai" | "library" | "fixed" }
async function fetchRapLines(scenario, complaint) {
  const picked = typeof buildLyrics === "function" ? buildLyrics(scenario, complaint) : null;
  const fallback = picked && picked.verse
    ? { lines: picked.lines, title: picked.verse.title, source: "library" }
    : { lines: RAP_VERSES[scenario.id] || RAP_VERSES.other, title: "", source: "fixed" };
  if (LYRIC_SOURCE !== "ai") return fallback;
  if (!RAP_API_URL) return fallback;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    const res = await fetch(RAP_API_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario: scenario.hint ? `${scenario.label}：${scenario.hint}` : scenario.label, complaint }),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    return { lines: data.lines, title: "小師父現編", source: "ai" };
  } catch (e) {
    console.info("改用預設歌詞：", e.message);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- 節拍：Web Audio 即時合成 ----------
const BPM = 88;
const SPB = 60 / BPM; // 一拍幾秒
const beat = { ctx: null, out: null, noise: null, playing: false, start: 0, next: 0, step: 0, timer: 0 };

function ensureAudio() {
  if (!beat.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    beat.ctx = new AC();
    const comp = beat.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    beat.out = beat.ctx.createGain();
    beat.out.gain.value = 0.8;
    beat.out.connect(comp).connect(beat.ctx.destination);
    const len = beat.ctx.sampleRate;
    beat.noise = beat.ctx.createBuffer(1, len, len);
    const d = beat.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  if (beat.ctx.state === "suspended") beat.ctx.resume();
}

function envelope(g, t, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
}

function tone(type, f0, f1, t, peak, decay) {
  const o = beat.ctx.createOscillator();
  const g = beat.ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
  envelope(g, t, peak, decay);
  o.connect(g).connect(beat.out);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function noise(t, peak, decay, type, freq, q = 1) {
  const src = beat.ctx.createBufferSource();
  const f = beat.ctx.createBiquadFilter();
  const g = beat.ctx.createGain();
  src.buffer = beat.noise;
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  envelope(g, t, peak, decay);
  src.connect(f).connect(g).connect(beat.out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.05);
}

// 木魚聲，merit.js 敲木魚時也可以呼叫
function woodfishSound(a = 0.7) {
  ensureAudio();
  const t = beat.ctx.currentTime;
  tone("triangle", 560, 430, t, a, 0.13);
  noise(t, a * 0.45, 0.035, "bandpass", 1500, 5);
}

function bowlSound(t) {
  tone("sine", 528, 0, t, 0.35, 3.2);
  tone("sine", 1327, 0, t, 0.12, 2.2);
  tone("sine", 2112, 0, t, 0.05, 1.4);
}

// 16 格一小節的 boom-bap
const KICK = [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0];
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];
const BASS_ROOTS = [55, 55, 43.65, 49];

function playStep(step, t) {
  const s = step % 16;
  const bar = Math.floor(step / 16);
  if (s === 0 && bar % 4 === 0) bowlSound(t);
  if (KICK[s]) {
    tone("sine", 150, 42, t, 1.0, 0.42);
    tone("sine", BASS_ROOTS[bar % 4], 0, t, 0.42, 0.38);
  }
  if (SNARE[s]) {
    noise(t, 0.5, 0.2, "highpass", 1200);
    tone("triangle", 200, 140, t, 0.3, 0.12);
  }
  if (s % 2 === 0) noise(t, s % 4 === 0 ? 0.16 : 0.09, 0.045, "highpass", 7500);
  if (s === 0 || s === 8 || s === 14) {
    tone("triangle", 560, 430, t, s === 14 ? 0.35 : 0.5, 0.13);
    noise(t, 0.2, 0.035, "bandpass", 1500, 5);
  }
}

function scheduleBeat() {
  while (beat.next < beat.ctx.currentTime + 0.12) {
    playStep(beat.step, beat.next);
    beat.next += SPB / 4;
    beat.step += 1;
  }
}

function startBeat() {
  ensureAudio();
  beat.start = beat.next = beat.ctx.currentTime + 0.12;
  beat.step = 0;
  beat.playing = true;
  clearInterval(beat.timer);
  beat.timer = setInterval(scheduleBeat, 25);
  scheduleBeat();
}

function stopBeat() {
  clearInterval(beat.timer);
  beat.playing = false;
}

// 從開始到現在第幾拍（含小數）
function beatPosition() {
  return beat.playing ? (beat.ctx.currentTime - beat.start) / SPB : -1;
}

// ---------- 小師父跟著唱：瀏覽器內建語音 ----------
const voice = { on: true, pick: null };

function pickVoice() {
  if (!window.speechSynthesis) return null;
  const vs = speechSynthesis.getVoices();
  return vs.find((v) => /zh[-_]TW/i.test(v.lang)) || vs.find((v) => /zh/i.test(v.lang)) || null;
}
if (window.speechSynthesis) speechSynthesis.onvoiceschanged = () => (voice.pick = pickVoice());

function sing(text, seconds) {
  if (!window.speechSynthesis || !voice.on || !text) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  voice.pick = voice.pick || pickVoice();
  if (voice.pick) u.voice = voice.pick;
  u.lang = voice.pick ? voice.pick.lang : "zh-TW";
  // 一般語速大約每秒 4.5 個字，照一小節的長度調快
  u.rate = Math.min(Math.max([...text].length / (4.5 * seconds), 1), 2);
  u.pitch = 0.85;
  speechSynthesis.speak(u);
}

// ---------- 專輯頁：載入歌詞、播放、卡拉 OK 字幕 ----------
const rap = { lines: [], source: "fixed", raf: 0, sung: -1, token: 0 };

// renderAlbum() 呼叫：先顯示作詞中，拿到歌詞後放上播放鈕
async function loadRap(scenario, complaint) {
  stopRap();
  const token = ++rap.token;
  const box = document.querySelector("#album-lyrics");
  const player = ensurePlayer();
  player.hidden = true;
  box.textContent = "小師父作詞中⋯⋯";
  const { lines, title, source } = await fetchRapLines(scenario, complaint);
  if (token !== rap.token) return; // 使用者已經離開或重來
  rap.lines = lines;
  rap.source = source;
  document.querySelector(".track-label").textContent = title ? `主打歌〈${title}〉` : "主打歌";
  renderLyrics(-1, 0);
  player.hidden = false;
  // 歌詞庫或 AI 的歌詞，跟依情境預錄的主打歌對不上，改用合成節拍
  if (source !== "fixed") {
    document.querySelector("#song").hidden = true;
    document.querySelector("#song-placeholder").hidden = true;
  }
}

function ensurePlayer() {
  let player = document.querySelector("#rap-player");
  if (player) return player;
  player = document.createElement("div");
  player.id = "rap-player";
  player.className = "rap-player";
  player.innerHTML = `<button type="button" class="btn btn-primary rap-play">▶ 播放主打歌</button>
    <button type="button" class="rap-voice" aria-pressed="true">人聲 開</button>`;
  document.querySelector("#album-lyrics").before(player);
  player.querySelector(".rap-play").addEventListener("click", () => (beat.playing ? stopRap() : startRap()));
  player.querySelector(".rap-voice").addEventListener("click", (e) => {
    voice.on = !voice.on;
    e.currentTarget.textContent = voice.on ? "人聲 開" : "人聲 關";
    e.currentTarget.setAttribute("aria-pressed", voice.on);
    if (!voice.on && window.speechSynthesis) speechSynthesis.cancel();
  });
  return player;
}

function renderLyrics(current, lit) {
  const box = document.querySelector("#album-lyrics");
  box.replaceChildren(
    ...rap.lines.map((line, i) => {
      const row = document.createElement("span");
      row.className = "lyric-line" + (i === current ? " is-current" : i < current ? " is-done" : "");
      if (i === current) {
        const chars = [...line];
        const on = document.createElement("span");
        on.className = "lyric-on";
        on.textContent = chars.slice(0, lit).join("");
        row.append(on, chars.slice(lit).join(""));
      } else {
        row.textContent = line;
      }
      return row;
    })
  );
}

function startRap() {
  if (!rap.lines.length) return;
  startBeat();
  // iOS 要在點擊當下先叫一次語音，之後才念得出來
  if (window.speechSynthesis && voice.on) speechSynthesis.speak(new SpeechSynthesisUtterance(" "));
  rap.sung = -1;
  document.querySelector("#rap-player .rap-play").textContent = "■ 停止";
  const tick = () => {
    const b = beatPosition();
    const idx = Math.floor(b / 4) - 1; // 第一小節是前奏
    if (idx >= rap.lines.length) {
      stopRap();
      bowlSound(beat.ctx.currentTime + 0.05);
      return;
    }
    if (idx >= 0 && rap.sung !== idx) {
      rap.sung = idx;
      sing(rap.lines[idx], SPB * 3.6);
    }
    const line = rap.lines[idx] || "";
    const lit = idx < 0 ? 0 : Math.min([...line].length, Math.ceil(((b % 4) / 4) * 1.25 * [...line].length));
    renderLyrics(idx, lit);
    rap.raf = requestAnimationFrame(tick);
  };
  tick();
}

// 離開專輯頁、重新寄放時呼叫
function stopRap() {
  cancelAnimationFrame(rap.raf);
  stopBeat();
  if (window.speechSynthesis) speechSynthesis.cancel();
  const btn = document.querySelector("#rap-player .rap-play");
  if (btn) btn.textContent = "▶ 再聽一次";
  if (rap.lines.length) renderLyrics(-1, 0);
}
