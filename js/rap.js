// 抱怨專輯的歌，由 feature/rap-mode 負責。
// 每個情境一段歌詞，key 對應 content.js 的情境 id；
// 30 秒主打歌放 assets/music/album/<情境id>.mp3

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

// TODO：歌詞跟著節拍逐行出現；用語音朗讀把使用者的關鍵字念在 beat 上，錄成自己的版本
function startRap() {}
