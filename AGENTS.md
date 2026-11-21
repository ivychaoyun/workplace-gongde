# AGENTS.md

給 AI 程式助手（Claude Code、OpenAI Codex、ChatGPT、GitHub Copilot 等）的專案說明。
人類組員請看 [README.md](README.md) 與 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 專案是什麼

「職場功德所」：一個 3D 網頁體驗。上班族在辦公室遇到鳥事，靈魂出竅把抱怨唱成饒舌，飛到寺廟變成小和尚，敲木魚、領功德單，最後回到公司重新開始。
四人學生團隊協作，設計思考紀錄在 [docs/design-thinking.md](docs/design-thinking.md)，故事與每一幕的互動在 [docs/劇本.md](docs/劇本.md)。

2D 版已停用（Git 標記 `v1-2d`），不要再把它加回來，除非組員要求。

**最重要的原則：功德不等於忍耐不合理的事情。** 準時下班、拒絕額外工作、開口求助都算功德。任何文案或功能都不能鼓勵使用者吞忍。

## 技術

- 網站在 `public/`：HTML、CSS、原生 JavaScript，3D 用 **three.js**（`public/index.html` 的 importmap 從 jsDelivr 載入固定版本 0.170.0）。**沒有建置工具**，不要引入 React、Tailwind、打包工具，除非組員要求。
- `public/js/main.js` 是 ES module；`lyric-library.js`、`lyrics.js` 是一般 `<script>`，在 main.js 之前載入，透過全域的 `LYRIC_LIBRARY`、`buildLyrics()` 使用。
- 後端只有一個：`worker.js`（Cloudflare Worker，線上版）與 `server.mjs`（本機版）共用 `rap.js` 的作詞規則。只有負責部署的人需要 npm。
- **資料原則：不涉及資安的內容可以上傳。** 抱怨可以送到本專案的 `/api/rap` 寫成歌詞，但：
  - 服務端**不可記錄、不可儲存**抱怨內容（不寫 log、不存資料庫）。
  - 不可再轉送給 AI 歌詞服務以外的第三方。
  - 網頁要清楚告訴使用者內容會交給 AI，並提醒不要寫真實姓名、公司名稱或個資。
  - 抱怨**可以**存在使用者自己的瀏覽器，也**可以**印在功德單或分享圖上。
  - 金鑰只能放在 Cloudflare 的 secret 或本機的 `.env`，不可進 repo 或網頁。
- `/api/rap` 只接受同一個網址送來的請求（`worker.js` 檢查 origin），不要開放給其他網站。

## 執行與檢查

```bash
python3 -m http.server 5175 --directory public   # 只看網頁，打開 http://localhost:5175
npm start                                        # 連同 AI 歌詞服務（需要 .env 裡的金鑰）
```

沒有自動化測試。改完請在瀏覽器實際走一遍：辦公室寫抱怨 → 靈魂出竅唱饒舌 → 飛到寺廟 → 敲木魚 → 功德單，並檢查手機寬度。

## 歌詞來源（重要）

- 預設從歌詞庫 `public/js/lyric-library.js` 依抱怨配對（`public/js/lyrics.js`）。
- **AI 現編功能目前關閉，不要刪除。** 由 `public/js/main.js` 的 `LYRIC_SOURCE` 切換：`'library'` 是目前設定，`'ai'` 會呼叫 `/api/rap`，連不上時改用歌詞庫。要不要打開由組員討論決定，不要自行切換。

## 檔案地圖

| 檔案 | 用途 | 主要負責 |
| --- | --- | --- |
| `public/index.html` | 頁面骨架、importmap | 趙芸 `chaoyun` |
| `public/css/main.css` | 樣式 | 趙芸 `chaoyun` |
| `public/js/main.js` | 3D 場景與整個流程。依區塊註解分工：辦公室、出竅（欣亞）／寺廟、木魚、功德單（安淇）／節拍、人聲（姵宣）／流程串接（趙芸） | 共用，之後會拆檔 |
| `public/js/lyric-library.js` | 歌詞庫，格式見 `docs/歌詞庫製作指南.md` | 姵宣 `peixuan` |
| `public/js/lyrics.js` | 依抱怨從歌詞庫配對：`buildLyrics()`、`rankLyrics()` | 姵宣 `peixuan` |
| `public/js/content.js` | 情境文案（目前只有工具頁在用） | 欣亞 `cynthia` |
| `public/assets/office/` | 辦公室背景、靈魂圖片 | 欣亞 `cynthia` |
| `public/tools/` | Rap 調音台、歌詞庫配對 | 姵宣 `peixuan` |
| `worker.js`、`server.mjs`、`rap.js`、`wrangler.jsonc` | AI 歌詞服務與部署 | 欣亞 `cynthia`／部署：趙芸 `chaoyun` |

分工細節見 [docs/分工.md](docs/分工.md)。

## 修改規則

- **分工是「主要負責」，不是限制。** 組員可以多做、改別人負責的檔案，但改動盡量小，並在回覆中明確告知使用者改了誰負責的檔案，請他在 PR 裡標註該負責人。
- `public/js/main.js` 還是一個大檔案，多人同時改容易衝突：改之前先在群組說一聲，改動盡量只在自己負責的區塊裡。
- 沿用現有風格：2 空格縮排、`const`、少量中文註解；`main.js` 用單引號，歌詞庫與配對用雙引號，跟著各檔案原本的寫法。
- 介面文字一律用**繁體中文（台灣用語）**。

## 文案界線（地獄梗也要遵守）

- 酸的是情境，不是人；不針對身分、外貌、性別、年齡、族群、疾病、身心障礙或死亡開玩笑。
- 先理解、不說教，不強迫正向思考。
- 不把忍耐、加班、犧牲包裝成美德。
- 不宣稱有心理治療或提升幸福感的效果。
- 圖片與音樂只能用自製或有授權的素材，來源記在 `public/assets/CREDITS.md`。

## Git

- `main` 是可展示的穩定版，由趙芸（整合）負責合併；每個人在自己名字的分支（`cynthia`、`foraianother8-ann`、`peixuan`、`chaoyun`）工作，透過 Pull Request 合併。開 PR 前先把最新的 `main` 合進自己的分支。
- commit 訊息用繁體中文，簡短描述做了什麼，例如「新增休假被找的三句嘴替」。
- 不要直接 push 到 `main`，不要 force push，不要改寫別人的提交。
