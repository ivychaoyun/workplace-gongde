# 職場功德所

> 今天受的氣，先寄放這裡。

讓員工透過匿名抒發、幽默回應與音樂陪伴，短暫整理工作情緒，再決定下一步。以「功德」作為趣味敘事，把每天努力克制、維持界線或照顧自己的小行動變得可見。

**核心原則：功德不等於忍耐不合理的事情。** 拒絕額外工作、準時下班、開口求助，也都是今天累積的功德。

---

## 體驗流程（3D 版）

在 3D 辦公室寫下今天的鳥事 → 靈魂出竅，在辦公室上空把抱怨唱成饒舌 → 飛到寺廟變成戴墨鏡的小和尚 → 敲木魚、領功德單 → 回到公司，泡杯咖啡、開窗看看外面、回座位休息，重新開始

完整的故事與之後要做的段落見 [docs/劇本.md](docs/劇本.md)。

- 歌詞預設從 50 首的歌詞庫依抱怨挑一首（不花錢、不上傳）；AI 現編功能保留，目前先關閉
- 節拍、木魚聲與小師父人聲都由瀏覽器即時產生，不需要音檔

> 2D 版（寄放 → 抱怨專輯 → 木魚 → 分享圖）已經停用，存在 Git 標記 `v1-2d`，需要時可以用 `git checkout v1-2d` 找回。

## 怎麼跑起來

**只看網頁（不需要安裝任何東西）**

用 VS Code 的 **Live Server** 打開 `public/index.html`；或在專案根目錄執行：

```bash
python3 -m http.server 5175 --directory public
```

然後打開 http://localhost:5175 。

**連同 AI 歌詞服務一起跑（需要 Node.js 22 以上和 API 金鑰）**

```bash
npm install
npm start
```

金鑰放在專案根目錄的 `.env`（`ANTHROPIC_API_KEY=...`），這個檔案不會進 repo。

## 專案結構

```
workplace-gongde/
├── public/                    # 網站本身（部署時整個資料夾就是網站）
│   ├── index.html             # 頁面骨架
│   ├── css/main.css           # 樣式
│   ├── js/main.js             # 入口：開場、主迴圈
│   ├── js/core.js             # 共用：畫布、相機、材質小工具、光線
│   ├── js/ui.js               # 共用：對話泡泡、輸入框、表演狀態
│   ├── js/office.js           # 辦公室、靈魂出竅、飛進小和尚
│   ├── js/temple-scene.js     # 寺廟建築與香煙
│   ├── js/characters.js       # Q 版人物、小和尚、信眾
│   ├── js/temple.js           # 寺廟流程：rap 表演、敲木魚、功德單
│   ├── js/temple-walk.js      # 小和尚在寺廟裡用鍵盤走動
│   ├── js/audio.js            # 節拍、木魚聲、小師父人聲
│   ├── js/ending.js           # 結局：回到公司、重新開始
│   ├── js/lyric-library.js    # 歌詞庫（50 首）
│   ├── js/lyrics.js           # 依抱怨從歌詞庫配對
│   ├── js/content.js          # 情境文案
│   ├── assets/office/         # 辦公室與靈魂的圖片
│   └── tools/                 # 組員用的小工具：Rap 調音台、歌詞庫配對
├── worker.js                  # 線上版後端（Cloudflare Worker）：送出網頁＋/api/rap
├── server.mjs                 # 本機版後端（npm start）
├── rap.js                     # 給 AI 的作詞規則，兩個後端共用
├── wrangler.jsonc             # Cloudflare 部署設定
└── docs/
    ├── design-thinking.md     # 設計思考紀錄
    ├── 劇本.md                 # 故事與每一幕的互動
    ├── 分工.md                 # 分工與待辦
    └── 歌詞庫製作指南.md        # 怎麼擴充歌詞庫
```

## 協作方式

請看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 備註

人物設定與需求目前為初步假設，待訪談與試用確認；尚不宣稱具有提升幸福感的實證效果。
