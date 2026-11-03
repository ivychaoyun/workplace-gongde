# 職場功德所

> 今天受的氣，先寄放這裡。

讓員工透過匿名抒發、幽默回應與音樂陪伴，短暫整理工作情緒，再決定下一步。以「功德」作為趣味敘事，把每天努力克制、維持界線或照顧自己的小行動變得可見。

**核心原則：功德不等於忍耐不合理的事情。** 拒絕額外工作、準時下班、開口求助，也都是今天累積的功德。

---

## 體驗流程

寄放抱怨 → 選擇陪伴模式 → 查看嘴替與梗圖 → 聆聽音樂 → 領取今日功德單

- 五類情境：猜主管想法、反覆改稿、臨時加單、救火接手、休假被找（也可自由輸入）
- 三種陪伴模式：陪我吐槽／讓我靜靜／給我勇氣
- 功德單可列印或另存 PDF
- 輸入的抱怨只在瀏覽器裡使用，不會上傳或儲存

## 怎麼跑起來

不需要安裝任何東西，純 HTML / CSS / JavaScript。

1. 下載或 clone 這個 repo
2. 直接用瀏覽器打開 `index.html`
3. （建議）用 VS Code 的 **Live Server** 外掛開啟，存檔後會自動重新整理

## 專案結構

```
workplace-gongde/
├── index.html          # 頁面結構（各步驟畫面）
├── css/style.css       # 視覺樣式
├── js/content.js       # 所有文案：情境、嘴替、判詞、迴向、功德項目  ← 改文案改這裡
├── css/modes.css       # 三種陪伴模式的樣式
├── js/modes.js         # 三種陪伴模式的特效
├── js/app.js           # 互動邏輯
├── assets/memes/       # 梗圖，檔名對應情境 id（例：guess.png）
├── assets/music/       # 音樂，檔名對應模式 id（roast.mp3 / quiet.mp3 / courage.mp3）
└── docs/
    └── design-thinking.md   # 設計思考紀錄
```

### 素材命名規則

| 類型 | 位置 | 檔名 |
| --- | --- | --- |
| 梗圖 | `assets/memes/` | `guess.png`、`revise.png`、`rush.png`、`firefight.png`、`leave.png`、`other.png` |
| 音樂 | `assets/music/` | `roast.mp3`、`quiet.mp3`、`courage.mp3` |

檔案放進去就會自動顯示；還沒放的會顯示「待補」的佔位框。請只使用有授權或自己製作的素材。

## 協作方式

請看 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 備註

人物設定與需求目前為初步假設，待訪談與試用確認；尚不宣稱具有提升幸福感的實證效果。
