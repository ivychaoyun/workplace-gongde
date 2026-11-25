// 節拍庫：6 個情境 × 4 首 = 24 首節拍（R&B、Boom-bap、廟會、Trap 各一首，之後再慢慢加），全部用 Web Audio 即時合成（audio.js 負責發聲），不用音檔、沒有版權問題。
// 開唱時依歌詞的情境，從同一個情境的節拍裡隨機挑一首（不會連續挑到同一首）。
// 主要負責：姵宣（peixuan）
//
// 想試聽、調整：打開 tools/beat-box.html，可以一首一首播。
//
// ---------- 欄位說明 ----------
// id        不可重複，格式「情境id-編號」
// scenario  對應歌詞庫的情境：guess / revise / rush / firefight / leave / other
// name      節拍名稱（只在試聽頁顯示）
// bpm       速度。歌詞一小節唱一句（8～12 字），建議 72～116，太快人聲會趕不上
// swing     搖擺感 0～0.3，0 是正拍，越大越有 lo-fi、慵懶的感覺
// key       調性的根音，bass 的音高都以它為準
// bass      每小節 bass 的音（4 小節一輪），寫「根音往上幾個半音」：0 = 根音，-2 = 低兩個半音
// bassWave  bass 音色：'sine' 圓潤、'warm' 溫暖電貝斯、'saw' 比較兇（電子感重，目前沒用）、'none' 不要
// bassLen   bass 每一下撐幾拍，R&B 用長一點（1～2）
// pad       R&B 和弦鋪底，每小節一個和弦：'m7' 'm9' 'maj7' 'dom9' 'sus'；不寫就沒有
// hatVol    hi-hat 音量倍數，R&B 建議 0.5～0.7
// warm      true = 整體聲音蒙一點（像取樣），vinyl：true = 加黑膠底噪
// b808      Trap 的 808 低音節奏，'X' 會滑到高五度；bassWave 設 'none' 讓大鼓不再帶 bass
// intro     前奏幾小節（預設 2），前奏只有旋律和和弦，鼓還沒進來
// introSound 前奏樂器：'keys' R&B 電鋼琴、'piano' 爵士鋼琴、'bell' 廟裡的鈴、'dark' Trap 暗黑鋼琴
// hook      前奏旋律：16 格（兩小節、每格一個 8 分音符），寫根音往上幾個半音，null 是休息
// piano     暗黑鋼琴的節奏，arp 是輪流彈的音程，例如 [0, 3, 7, 3]
// bowl      幾小節敲一次磬，0 = 不敲
// stabSound 主旋律點綴的音色：'bell' 鈴、'beep' 手機提示音、'siren' 警報、'keys' 電鋼琴、'pluck' 撥弦、'click' 滑鼠點擊
//
// ---------- 節奏寫法 ----------
// 一小節 16 格（16 分音符），也可以寫 32 格當兩小節一輪。
//   x  打一下      X  重音      .  不打
//   只有 hat 能用：o 開放的 hi-hat、r 兩連打（32 分音符）、t 三連音連打
// 四種風格：
//   R&B       慢、和弦、rimshot、彈指
//   Boom-bap  80–100 BPM、搖擺感、溫暖電貝斯、靈魂／爵士和弦、取樣與黑膠質感（warm、vinyl）
//   廟會      廟鼓、高低木魚、磬
//   Trap      原本 130–160 BPM 的半拍感；這裡寫成一半的速度（70–76），歌詞才唱得完
//             808 低音會滑音、hi-hat 有連打、暗黑鋼琴
// kick 大鼓、snare 小鼓、rim 鼓框（R&B 小鼓）、snap 彈指、clap 拍手、hat 鈸、shaker 沙鈴
// drum 廟鼓、fish 木魚（高）、fish2 木魚（低）、stab 旋律點綴（電子感較重，目前沒用）
// 沒寫的欄位就是不打。

const BEATS = [
  // ========== 猜主管想法 guess ==========
  { id: "guess-01", scenario: "guess", name: "通靈頻道（R&B）", bpm: 78, swing: 0.2, key: "A1", bass: [0, 0, -4, -2], bassLen: 1.5, pad: "m9", hatVol: 0.6, introSound: "keys", hook: [7, null, 10, 12, 14, 12, 10, null,  7, 5, 3, null, 2, 3, null, null], bowl: 4,
    kick: "x......x..x.....", rim: "....x.......x...", snap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.",
    fish: "x..............." },
  { id: "guess-02", scenario: "guess", name: "擲筊模式（廟會）", bpm: 86, swing: 0.1, key: "G1", bass: [0, -2, -4, -2], pad: "sus", introSound: "bell", hook: [0, 2, 4, 7, 9, null, 7, 4,  2, 4, 2, 0, null, 0, null, null], bowl: 2,
    drum: "X.......x.x.....", clap: "....x.......x...", shaker: "x.x.x.x.x.x.x.x.",
    fish: "x...x...x...x...", fish2: "......x.......x." },
  { id: "guess-03", scenario: "guess", name: "你懂我意思（Boom-bap）", bpm: 88, swing: 0.2, key: "B1", bass: [0, -2, -5, -3], pad: "m9", bassWave: "warm", bassLen: 0.9, warm: true, vinyl: true, introSound: "piano", hook: [0, null, 3, 7, null, 10, 7, null,  5, null, 3, 5, null, 0, null, null], bowl: 4,
    kick: "x.........x..x..", snare: "....x.......x...", hat: "x.x.x.x.x.x.x.x.",
    fish: "x.......x......." },
  { id: "guess-04", scenario: "guess", name: "讀心術（Trap）", bpm: 72, swing: 0, key: "F#1", bass: [0, 0, 1, -2], bassWave: "none", bassLen: 2, introSound: "dark", hook: [0, null, null, 1, null, null, 7, null,  6, null, null, 3, null, 1, 0, null], bowl: 4,
    kick: "x.........x.....", b808: "x.........x.....", clap: "....x.......x...", hat: "x.x.x.x.xrx.x.tx",
    piano: "x...x...x...x...", arp: [0, 3, 7, 3], fish: "........x......." },

  // ========== 反覆改稿 revise ==========
  { id: "revise-01", scenario: "revise", name: "第八版（Boom-bap）", bpm: 90, swing: 0.2, key: "A1", bass: [0, 0, 0, -2], pad: "maj7", bassWave: "warm", bassLen: 0.9, warm: true, vinyl: true, introSound: "piano", hook: [12, 10, 7, null, 10, 7, 3, null,  5, 7, null, 3, 0, null, -2, null], bowl: 4,
    kick: "x......x..x.....", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.x.",
    fish: "x.......x.....x.", fish2: "..x.......x....." },
  { id: "revise-02", scenario: "revise", name: "改回第一版（R&B）", bpm: 80, swing: 0.2, key: "F1", bass: [0, -3, -5, -1], bassLen: 1.5, pad: "maj7", hatVol: 0.6, introSound: "keys", hook: [null, 3, 7, 10, 14, null, 12, 10,  7, null, 10, null, 5, 3, null, null], bowl: 4,
    kick: "x.........x..x..", rim: "....x.......x...", snap: "............x...", hat: "x.xx.xx.x.xx.xx.",
    fish: "x..............." },
  { id: "revise-03", scenario: "revise", name: "追蹤修訂（廟會）", bpm: 90, swing: 0.05, key: "E1", bass: [0, 3, 5, 3], introSound: "bell", hook: [12, 9, 7, 9, 7, 4, 2, null,  4, 7, 4, 2, 0, null, null, null], bowl: 4,
    kick: "x.........x.....", drum: "X.......X.......", clap: "....x.......x...",
    fish: "x.xxx.x.x.xxx.x.", fish2: "....x.......x..." },
  { id: "revise-04", scenario: "revise", name: "Final_final（Trap）", bpm: 74, swing: 0, key: "A1", bass: [0, 0, -4, -2], bassWave: "none", bassLen: 1.5, introSound: "dark", hook: [12, null, 10, null, 7, null, 8, 7,  null, 3, null, 1, 0, null, null, null], bowl: 0,
    kick: "x......x..x.....", b808: "x......x..X.....", clap: "....x.......x...", hat: "xxxxxxrxxxxxtxxx", hatVol: 0.8,
    piano: "x.x.x.x.........", arp: [0, 3, 7, 10], fish: "x.......x......." },

  // ========== 臨時加單 rush ==========
  { id: "rush-01", scenario: "rush", name: "五分鐘（Boom-bap）", bpm: 98, swing: 0.15, key: "G1", bass: [0, 3, 5, 3], hatVol: 0.7, pad: "maj7", bassWave: "warm", bassLen: 0.9, warm: true, vinyl: true, introSound: "piano", hook: [7, 7, null, 5, 3, null, 5, 7,  10, null, 7, null, 5, 3, 0, null], bowl: 0,
    kick: "x..x..x...x.....", snare: "....x.......x...", hat: "xxxxxxxxxxxxxxxx",
    fish: "x...x...x...x..." },
  { id: "rush-02", scenario: "rush", name: "明早要（廟會）", bpm: 100, swing: 0, key: "A1", bass: [0, 0, -4, -2], introSound: "bell", hook: [7, null, 9, 12, 9, 7, null, 4,  7, 4, 2, null, 0, 2, 0, null], bowl: 4,
    kick: "x.......x.......", drum: "X...X...X...X...", clap: "....x.......x...", shaker: "xxxxxxxxxxxxxxxx",
    fish: "x.x.x.x.x.x.x.x.", fish2: "..x...x...x...x." },
  { id: "rush-03", scenario: "rush", name: "順便一下（R&B）", bpm: 86, swing: 0.15, key: "D2", bass: [0, -2, -4, -5], bassLen: 1, pad: "dom9", hatVol: 0.6, introSound: "keys", hook: [14, 12, 10, 7, null, 10, null, 7,  5, 3, null, 2, 3, null, 0, null], bowl: 0,
    kick: "x.x.......x..x..", rim: "....x.......x...", snap: "....x.......x...", shaker: "x.x.x.x.x.x.x.x.",
    fish: "x.......x......." },
  { id: "rush-04", scenario: "rush", name: "倒數計時（Trap）", bpm: 76, swing: 0, key: "G1", bass: [0, 3, 5, 3], bassWave: "none", bassLen: 1, introSound: "dark", hook: [7, null, 8, null, 7, null, 3, null,  1, null, 3, null, 0, null, null, null], bowl: 0,
    kick: "x..x......x..x..", b808: "x..x......x..X..", snare: "....x.......x...", clap: "....x.......x...", hat: "xrxrxrxrxrxrtttt", hatVol: 0.8,
    piano: "x...x...x...x...", arp: [0, 1, 7, 3], fish: "x...x...x...x..." },

  // ========== 救火接手 firefight ==========
  { id: "firefight-01", scenario: "firefight", name: "救火隊（廟會）", bpm: 92, swing: 0, key: "E1", bass: [0, 1, 3, 1], introSound: "bell", hook: [0, 2, 4, 7, 9, null, 7, 4,  2, 4, 2, 0, null, 0, null, null], bowl: 2,
    kick: "x.......x.......", drum: "X.....x.X.....x.", snare: "....x.......x...",
    fish: "x...x...x...x...", fish2: "..x.......x....." },
  { id: "firefight-02", scenario: "firefight", name: "接手包（Boom-bap）", bpm: 92, swing: 0.2, key: "A1", bass: [0, 0, 3, -2], pad: "m9", bassWave: "warm", bassLen: 0.9, warm: true, vinyl: true, introSound: "piano", hook: [0, null, 3, 7, null, 10, 7, null,  5, null, 3, 5, null, 0, null, null], bowl: 4,
    kick: "x......x.x....x.", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.o.",
    fish: "x.......x......." },
  { id: "firefight-03", scenario: "firefight", name: "他請假了（R&B）", bpm: 76, swing: 0.2, key: "C2", bass: [0, -4, -5, -7], bassLen: 1.5, pad: "m9", hatVol: 0.5, introSound: "keys", hook: [7, null, 10, 12, 14, 12, 10, null,  7, 5, 3, null, 2, 3, null, null], bowl: 4,
    kick: "x......x..x.....", rim: "....x.......x...", snap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.",
    fish: "x..............." },
  { id: "firefight-04", scenario: "firefight", name: "警報解除？（Trap）", bpm: 72, swing: 0, key: "E1", bass: [0, 1, 3, 1], bassWave: "none", bassLen: 2, introSound: "dark", hook: [0, null, null, 1, null, null, 7, null,  6, null, null, 3, null, 1, 0, null], bowl: 2,
    kick: "x.......x.x.....", b808: "x.......x.X.....", clap: "....x.......x...", hat: "x.x.xrx.x.x.t.x.",
    piano: "x.......x.......", arp: [0, 1, 7, 6], drum: "X..............." },

  // ========== 休假被找 leave ==========
  { id: "leave-01", scenario: "leave", name: "休假模式（R&B）", bpm: 72, swing: 0.25, key: "F1", bass: [0, -3, -5, -1], bassLen: 2, pad: "maj7", hatVol: 0.5, introSound: "keys", hook: [7, null, 10, 12, 14, 12, 10, null,  7, 5, 3, null, 2, 3, null, null], bowl: 4,
    kick: "x.........x.....", rim: "....x.......x...", snap: "....x.......x...", hat: "x.x.x.x.x.x.x.x.",
    fish: "x..............." },
  { id: "leave-02", scenario: "leave", name: "海邊收訊差（R&B）", bpm: 76, swing: 0.25, key: "A1", bass: [0, -2, -4, -5], bassLen: 1.5, pad: "m9", hatVol: 0.5, introSound: "keys", hook: [14, 12, 10, 7, null, 10, null, 7,  5, 3, null, 2, 3, null, 0, null], bowl: 4,
    kick: "x.........x..x..", rim: "........x.......", snap: "............x...", shaker: "x.x.x.x.x.x.x.x.",
    fish: "x.......x......." },
  { id: "leave-03", scenario: "leave", name: "已讀不回（木魚）", bpm: 74, swing: 0.2, key: "G1", bass: [0, 0, -4, -2], bassLen: 1.5, pad: "maj7", introSound: "bell", hook: [12, 9, 7, 9, 7, 4, 2, null,  4, 7, 4, 2, 0, null, null, null], bowl: 4,
    kick: "x.........x.....", snap: "....x.......x...", shaker: "x.x.x.x.x.x.x.x.",
    fish: "x.......x.......", fish2: "....x.......x..." },
  { id: "leave-04", scenario: "leave", name: "飛航模式（Trap）", bpm: 70, swing: 0, key: "C2", bass: [0, -4, -5, -7], bassWave: "none", bassLen: 2, pad: "m9", introSound: "dark", hook: [12, null, 10, null, 7, null, 8, 7,  null, 3, null, 1, 0, null, null, null], bowl: 4,
    kick: "x.........x.....", b808: "x.........x.....", clap: "............x...", snap: "....x...........", hat: "x.x.x.x.x.x.x.tx", hatVol: 0.6,
    fish: "x..............." },

  // ========== 其他鳥事 other ==========
  { id: "other-01", scenario: "other", name: "鳥事一籮筐（Boom-bap）", bpm: 86, swing: 0.22, key: "A1", bass: [0, 0, -4, -2], pad: "maj7", bassWave: "warm", bassLen: 0.9, warm: true, vinyl: true, introSound: "piano", hook: [7, 7, null, 5, 3, null, 5, 7,  10, null, 7, null, 5, 3, 0, null], bowl: 4,
    kick: "x......x..x.....", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.x.",
    fish: "x.......x.....x." },
  { id: "other-02", scenario: "other", name: "茶水間（R&B）", bpm: 80, swing: 0.2, key: "C2", bass: [0, -4, -5, -7], bassLen: 1.5, pad: "m7", hatVol: 0.6, introSound: "keys", hook: [null, 3, 7, 10, 14, null, 12, 10,  7, null, 10, null, 5, 3, null, null], bowl: 4,
    kick: "x.........x..x..", rim: "....x.......x...", snap: "....x.......x...", hat: "x.xx.xx.x.xx.xx.",
    fish: "x..............." },
  { id: "other-03", scenario: "other", name: "功德無量（廟會）", bpm: 86, swing: 0.1, key: "D2", bass: [0, -2, -4, -5], pad: "sus", introSound: "bell", hook: [7, null, 9, 12, 9, 7, null, 4,  7, 4, 2, null, 0, 2, 0, null], bowl: 2,
    kick: "x.........x.....", drum: "X.......X.x.....", clap: "....x.......x...", shaker: "x.x.x.x.x.x.x.x.",
    fish: "x.x.x.x.x.x.x.x.", fish2: "..x.......x....." },
  { id: "other-04", scenario: "other", name: "打卡（Trap）", bpm: 74, swing: 0, key: "B1", bass: [0, -2, 0, -5], bassWave: "none", bassLen: 1.5, introSound: "dark", hook: [7, null, 8, null, 7, null, 3, null,  1, null, 3, null, 0, null, null, null], bowl: 4,
    kick: "x......x.x......", b808: "x......x.X......", clap: "....x.......x...", hat: "xxxrxxxrxxxrtttx", hatVol: 0.8,
    piano: "x...x...x...x...", arp: [0, 3, 7, 10], fish: "x.......x......." },
];

// 等歌詞時先播的節拍（原本的預設節拍，不屬於任何情境）
const WAITING_BEAT = {
  id: "waiting", scenario: "", name: "等待中", bpm: 88, swing: 0, key: "A1", bass: [0, 0, -4, -2], bassWave: "sine", bowl: 4,
  kick:  "x......x..x.....", snare: "....x.......x..x", hat: "x.x.x.x.x.x.x.x.",
  fish:  "x.......x.....x.",
};

// 依情境隨機挑一首；不認得的情境（例如 AI 現編的歌沒有情境）就從全部節拍裡挑
let lastBeatId = null;
function pickBeat(scenario) {
  let pool = BEATS.filter((b) => b.scenario === scenario);
  if (!pool.length) pool = BEATS;
  if (pool.length > 1) pool = pool.filter((b) => b.id !== lastBeatId);
  const beat = pool[Math.floor(Math.random() * pool.length)];
  lastBeatId = beat.id;
  return beat;
}

export { BEATS, WAITING_BEAT, pickBeat };
