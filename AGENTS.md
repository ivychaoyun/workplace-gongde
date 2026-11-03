# AGENTS.md

給 AI 程式助手（Claude Code、OpenAI Codex、ChatGPT、GitHub Copilot 等）的專案說明。
人類組員請看 [README.md](README.md) 與 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 專案是什麼

「職場功德所」：讓上班族匿名寄放工作怨氣，透過幽默嘴替、梗圖、音樂與「今日功德單」短暫喘息的網頁原型。
四人學生團隊協作，設計思考紀錄在 [docs/design-thinking.md](docs/design-thinking.md)。

**最重要的原則：功德不等於忍耐不合理的事情。** 準時下班、拒絕額外工作、開口求助都算功德。任何文案或功能都不能鼓勵使用者吞忍。

## 技術

- 純 HTML / CSS / 原生 JavaScript，**沒有框架、沒有建置工具、沒有 npm**。不要引入 React、Tailwind、打包工具或套件，除非組員明確要求。
- 腳本用一般 `<script>` 依序載入（`content.js` → `modes.js` → `app.js`），共用全域變數，不是 ES module。
- 字型從 Google Fonts 載入，其他資源都在本地。
- 使用者輸入的抱怨只在瀏覽器中使用，**不可送到任何伺服器、不可存進 localStorage**。

## 執行與檢查

```bash
python3 -m http.server 5173   # 在專案根目錄執行，然後打開 http://localhost:5173
```

沒有自動化測試。改完請在瀏覽器實際走一遍流程：選情境 → 選模式 → 回應頁 → 勾功德 → 功德單 → 列印預覽，並檢查手機寬度（375px）。

## 檔案地圖

| 檔案 | 用途 | 負責分支 |
| --- | --- | --- |
| `index.html` | 五個步驟畫面（`#step-deposit`、`#step-mode`、`#step-response`、`#step-merits`、`#step-slip`） | 共用 |
| `js/app.js` | 狀態、步驟切換、渲染 | 共用 |
| `js/content.js` | 所有文案：`SCENARIOS`、`FALLBACK_SCENARIO`、`MODES`、`MERITS` | `feature/dark-humor` |
| `js/modes.js` | `applyModeEffect(modeId)`：各陪伴模式的特效 | `feature/mode-experience` |
| `css/modes.css` | 依 `body[data-mode="roast|quiet|courage"]` 切換樣式 | `feature/mode-experience` |
| `css/style.css` | 全站樣式與色彩變數（`:root`） | `feature/music-visual` |
| `assets/memes/<情境id>.png` | 梗圖，缺檔會自動顯示佔位框 | `feature/memes` |
| `assets/music/<模式id>.mp3` | 音樂，缺檔會自動顯示佔位框 | `feature/music-visual` |

分工細節見 [docs/分工.md](docs/分工.md)。

## 修改規則

- **只改目前分支負責的檔案。** 需要動 `index.html` 或 `js/app.js` 時，改動要小，並在回覆中明確告知使用者，因為其他組員也會改。
- 情境的 `id` 同時是梗圖檔名，模式的 `id` 同時是音樂檔名與 `data-mode` 值；改 id 要一起改對應檔名。
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

- `main` 是可展示的穩定版；工作在 `feature/*` 分支進行，透過 Pull Request 合併。
- commit 訊息用繁體中文，簡短描述做了什麼，例如「新增休假被找的三句嘴替」。
- 不要直接 push 到 `main`，不要 force push，不要改寫別人的提交。
