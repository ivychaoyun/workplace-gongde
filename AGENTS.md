# AGENTS.md

給 AI 程式助手（Claude Code、OpenAI Codex、ChatGPT、GitHub Copilot 等）的專案說明。
人類組員請看 [README.md](README.md) 與 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 專案是什麼

「職場功德所」：讓上班族匿名寄放工作怨氣，把抱怨變成一張饒舌「抱怨專輯」，敲木魚功德圓滿後分享到社群的網頁原型。
四人學生團隊協作，設計思考紀錄在 [docs/design-thinking.md](docs/design-thinking.md)。

流程：寄放抱怨（`#step-deposit`）→ 抱怨專輯（`#step-album`）→ 敲木魚（`#step-fish`）→ 功德圓滿與分享（`#step-complete`）。沒有「陪伴模式」，不要再加回來，除非組員要求。

**最重要的原則：功德不等於忍耐不合理的事情。** 準時下班、拒絕額外工作、開口求助都算功德。任何文案或功能都不能鼓勵使用者吞忍。

## 技術

- 網頁是純 HTML / CSS / 原生 JavaScript，**沒有框架、沒有建置工具、沒有 npm**。不要引入 React、Tailwind、打包工具或套件，除非組員明確要求。唯一的例外是 `api/`（AI 歌詞服務，部署在 Cloudflare Workers），只有負責部署的人需要 npm。
- 腳本用一般 `<script>` 依序載入（`content.js` → `rap.js` → `album.js` → `merit.js` → `app.js`），共用全域變數，不是 ES module。
- 字型從 Google Fonts 載入，其他資源都在本地。
- **資料原則：不涉及資安的內容可以上傳。** 使用者的情境與抱怨可以送到本專案的 AI 歌詞服務（`api/`）寫成歌詞，但：
  - 服務端**不可記錄、不可儲存**抱怨內容（不寫 log、不存資料庫）。
  - 不可再轉送給 AI 歌詞服務以外的第三方。
  - 網頁要清楚告訴使用者內容會交給 AI，並提醒不要寫真實姓名、公司名稱或個資。
  - 抱怨**可以**存在使用者自己的瀏覽器（例如 localStorage），也**可以**印在分享圖上；分享圖是使用者自己決定要不要分享的。
  - 金鑰、密碼等機密只能放在 Cloudflare 的 secret，不可進 repo 或網頁。
- 封面與分享圖用 Canvas 繪製；用 `file://` 開啟時無法匯出圖片，請用本機伺服器測試。

## 執行與檢查

```bash
python3 -m http.server 5173   # 在專案根目錄執行，然後打開 http://localhost:5173
```

沒有自動化測試。改完請在瀏覽器實際走一遍流程：選情境 → 專輯頁 → 敲木魚 → 功德圓滿 → 下載分享圖，並檢查手機寬度（375px）。

## 歌詞來源（重要）

- 預設從歌詞庫 `js/lyric-library.js` 依情境與抱怨配對（`js/lyrics.js`）。
- **AI 現編功能目前隱藏，不要刪除。** 程式（`js/rap.js` 的 `fetchRapLines`）和 `api/` 都保留，由 `js/rap.js` 的 `LYRIC_SOURCE` 切換：`"library"` 是目前設定，`"ai"` 會打開 AI 現編。要不要打開由組員討論決定，不要自行切換。
- 寄放頁說明文字會跟著 `LYRIC_SOURCE` 自動切換，改說明時兩個版本都要顧到。

## 檔案地圖

| 檔案 | 用途 | 主要負責 |
| --- | --- | --- |
| `index.html` | 四個步驟畫面 | `feature/flow-test`（D 統整） |
| `js/app.js` | 狀態、步驟切換、串接各模組 | `feature/flow-test`（D 統整） |
| `css/style.css` | 全站樣式與色彩變數（`:root`） | `feature/visual-share` |
| `js/content.js` | 文案：`SCENARIOS`（`roast` 嘴替、`verdict` 判詞＝專輯名、`blessing` 迴向）、`FALLBACK_SCENARIO`、`MERITS` | `feature/memes-humor` |
| `assets/memes/<情境id>.png` | 梗圖，當專輯封面背景；缺檔會改用漸層 | `feature/memes-humor` |
| `js/rap.js` | `RAP_VERSES`（每情境一段歌詞）、`getRapVerse()`、`getSongPath()`、`startRap()` | `feature/rap-mode` |
| `css/rap.css` | 歌詞樣式 | `feature/rap-mode` |
| `assets/music/album/<情境id>.mp3` | 30 秒主打歌；缺檔會顯示佔位框 | `feature/rap-mode` |
| `js/album.js` | `drawCover(canvas, scenario)`、`wrapText()`、`COVER_COLORS` | `feature/visual-share` |
| `js/merit.js` | 木魚（`FISH_GOAL`、`hitFish()`）、`drawShareCard()`、`shareCard()`、`downloadCard()` | `feature/visual-share` |
| `api/` | AI 歌詞服務（Cloudflare Worker，目前隱藏不用）：`worker.js` 的 `SYSTEM` 是給 AI 的作詞規則 | 部署服務的組員 |
| `js/lyric-library.js` | 歌詞庫，50 首，格式見 `docs/歌詞庫製作指南.md` | `feature/rap-mode` |
| `js/lyrics.js` | 依情境＋抱怨從歌詞庫配對：`buildLyrics()`、`rankLyrics()` | `feature/rap-mode` |

分工細節見 [docs/分工.md](docs/分工.md)。

## 修改規則

- **分工是「主要負責」，不是限制。** 組員可以多做、改別人負責的檔案，但改動盡量小，並在回覆中明確告知使用者改了誰負責的檔案，請他在 PR 裡標註該負責人。
- 情境的 `id` 同時是梗圖檔名、主打歌檔名與 `RAP_VERSES` 的 key；改 id 要一起改對應的地方。
- `merit.js` 的分享圖會呼叫 `album.js` 的 `drawCover()`，兩者都屬 `feature/visual-share`。
- 新增文案放在 `content.js`，不要把文字寫死在 `app.js` 或 HTML。
- 沿用現有風格：2 空格縮排、雙引號、`const`、少量中文註解、CSS 使用 `:root` 的色彩變數。
- 介面文字一律用**繁體中文（台灣用語）**。

## 文案界線（地獄梗也要遵守）

- 酸的是情境，不是人；不針對身分、外貌、性別、年齡、族群、疾病、身心障礙或死亡開玩笑。
- 先理解、不說教，不強迫正向思考。
- 不把忍耐、加班、犧牲包裝成美德。
- 不宣稱有心理治療或提升幸福感的效果。
- 梗圖與音樂只能用自製或有授權的素材，來源記在 `assets/*/CREDITS.md`。

## Git

- `main` 是可展示的穩定版，由 D（統整與測試）負責合併；工作在 `feature/*` 分支進行，透過 Pull Request 合併。開 PR 前先把最新的 `main` 合進自己的分支。
- commit 訊息用繁體中文，簡短描述做了什麼，例如「新增休假被找的三句嘴替」。
- 不要直接 push 到 `main`，不要 force push，不要改寫別人的提交。
