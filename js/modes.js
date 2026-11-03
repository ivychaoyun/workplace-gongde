// 三種陪伴模式各自的特效與流程，由 feature/mode-experience 負責。
// app.js 進入回應頁時會呼叫 applyModeEffect(mode.id)。

function applyModeEffect(modeId) {
  document.body.dataset.mode = modeId; // css/modes.css 可用 body[data-mode="quiet"] 換樣式

  // TODO：依模式加入不同效果，例如
  // roast   → 嘴替逐字打出來、震動
  // quiet   → 呼吸引導動畫、降低畫面亮度
  // courage → 提供可複製的開口話術
}
