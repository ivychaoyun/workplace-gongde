// 不用 AI、不花錢的歌詞產生器：範本＋關鍵字填空，全部在瀏覽器裡完成。
// 從使用者的抱怨抓出「誰、什麼東西、什麼時候」，填進每個情境的歌詞範本。
// 押韻字都固定在句尾，填空只放在句子中間，所以換了關鍵字也不會破韻。
// AI 歌詞服務連不上（或沒設定 RAP_API_URL）時，rap.js 會改用這裡的結果。

// 關鍵字詞庫：左邊是抱怨裡可能出現的寫法，右邊是填進歌詞的樣子
const LYRIC_SLOTS = {
  who: {
    label: "誰",
    words: {
      主管: "主管", 老闆: "老闆", 經理: "經理", 總監: "總監", 組長: "組長", 客戶: "客戶",
      業主: "業主", 甲方: "甲方", PM: "PM", 同事: "同事", 前輩: "前輩", 長官: "長官",
    },
  },
  thing: {
    label: "什麼東西",
    words: {
      簡報: "簡報", 提案: "提案", 報告: "報告", 企劃: "企劃", 設計稿: "設計稿", 海報: "海報",
      文案: "文案", 報表: "報表", Excel: "Excel", excel: "Excel", 預算: "預算", 會議記錄: "會議記錄",
      影片: "影片", 網站: "網站", 合約: "合約", 需求: "需求", 專案: "專案", 投影片: "簡報",
    },
  },
  time: {
    label: "什麼時候",
    words: {
      週五: "週五", 星期五: "週五", 禮拜五: "週五", 週末: "週末", 假日: "假日", 連假: "連假",
      下班前: "下班前", 下班後: "下班後", 半夜: "半夜", 凌晨: "凌晨", 中午: "中午",
      晚上: "晚上", 五點半: "五點半", 每天: "每天", 天天: "每天",
    },
  },
};

// 每個情境一段 8 句範本；{who}{thing}{time} 會換成抓到的關鍵字，沒抓到就用 defaults
const LYRIC_TEMPLATES = {
  guess: {
    defaults: { who: "主管", thing: "提案", time: "每天" },
    lines: [
      "{who}說你懂 我其實不懂",
      "需求在雲端 我在通靈中",
      "{thing}要大器 又要很輕鬆",
      "要有質感 但預算是空",
      "猜對沒有賞 猜錯全部重",
      "{time}還在猜 猜到眼神空",
      "阿彌陀佛 求個明確的溝通",
      "講清楚再做 是功德一種",
    ],
  },
  revise: {
    defaults: { who: "客戶", thing: "簡報", time: "半夜" },
    lines: [
      "{thing}改到 第八版",
      "{who}一句 再看看",
      "第一版 被說太平淡",
      "第八版 又說回原案",
      "{time}還在改 改到眼神散",
      "存檔的手 已經在發軟",
      "回饋講具體 我才好辦",
      "先定標準 大家都不難",
    ],
  },
  rush: {
    defaults: { who: "老闆", thing: "報告", time: "五點半" },
    lines: [
      "{time}丟來 說很簡單就好",
      "五分鐘的事 你說得真巧",
      "{thing}明天 就要看到",
      "手上三件 也還沒做完半條",
      "{who}一句話 我變成夜貓",
      "急件變日常 業障在繞",
      "先排順序 不然全部搞不好",
      "拒絕亂加單 功德加一票",
    ],
  },
  firefight: {
    defaults: { who: "主管", thing: "專案", time: "每天" },
    lines: [
      "說好幫忙 只看一下",
      "回過神來 {thing}全在我名下",
      "{who}說 你最熟啦",
      "原本負責人 現在人在哪",
      "{time}都在 救火救到傻",
      "火不是我放 我也不想扛它",
      "幫忙有期限 寫清楚好嗎",
      "守住界線 功德大到爆炸",
    ],
  },
  leave: {
    defaults: { who: "同事", thing: "報告", time: "假日" },
    lines: [
      "人在度假 手機響不停",
      "{who}傳訊 說只問一件事情",
      "{thing}的進度 要我馬上回應",
      "{time}被打擾 壞了心情",
      "已讀不回 是我的修行",
      "請假是休息 不是遠端執行",
      "急件找代理 讓我安靜",
      "好好放假 功德才會靈",
    ],
  },
  other: {
    defaults: { who: "主管", thing: "工作", time: "晚上" },
    lines: [
      "今天這件事 真的很鳥",
      "{who}一開口 我火氣就飆",
      "{thing}卡關 心累到爆",
      "{time}還在想 睡也睡不好",
      "阿彌陀佛 怨氣先寄放好",
      "敲敲木魚 煩惱先跑",
      "不用硬撐 不用假裝很好",
      "準時下班 就是功德一票",
    ],
  },
};

// 從抱怨裡找每一類最先出現的關鍵字
function findKeywords(complaint) {
  const found = {};
  const text = complaint || "";
  Object.entries(LYRIC_SLOTS).forEach(([slot, { words }]) => {
    let best = null;
    Object.entries(words).forEach(([raw, value]) => {
      const at = text.indexOf(raw);
      if (at >= 0 && (!best || at < best.at)) best = { at, value };
    });
    if (best) found[slot] = best.value;
  });
  return found;
}

// 回傳 { lines: 填好的歌詞, keywords: 抓到的關鍵字, parts: 每句拆成文字與填空，給畫面標示用 }
function buildLyrics(scenario, complaint) {
  const tpl = LYRIC_TEMPLATES[scenario.id] || LYRIC_TEMPLATES.other;
  const keywords = findKeywords(complaint);
  const values = { ...tpl.defaults, ...keywords };
  const parts = tpl.lines.map((line) =>
    line.split(/(\{\w+\})/).filter(Boolean).map((piece) => {
      const m = piece.match(/^\{(\w+)\}$/);
      if (!m) return { text: piece };
      return { text: values[m[1]], slot: m[1], fromUser: m[1] in keywords };
    })
  );
  const lines = parts.map((p) => p.map((x) => x.text).join(""));
  return { lines, keywords, parts };
}
