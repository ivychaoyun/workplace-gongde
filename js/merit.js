// 敲木魚、功德圓滿與社群分享，由 feature/merit-share 負責。

const FISH_GOAL = 10; // 敲幾下功德圓滿
let fishCount = 0;

function resetFish() {
  fishCount = 0;
  updateFishProgress();
}

function updateFishProgress() {
  document.querySelector("#fish-count").textContent = fishCount;
  document.querySelector("#fish-bar").style.width = `${(fishCount / FISH_GOAL) * 100}%`;
}

// 回傳 true 代表剛好功德圓滿
function hitFish(btn) {
  if (fishCount >= FISH_GOAL) return false;
  fishCount += 1;
  updateFishProgress();

  btn.classList.remove("is-hit");
  void btn.offsetWidth; // 重新觸發動畫
  btn.classList.add("is-hit");

  const plus = document.createElement("span");
  plus.className = "fish-plus";
  plus.textContent = "怨氣 −1";
  btn.appendChild(plus);
  setTimeout(() => plus.remove(), 900);

  return fishCount === FISH_GOAL;
}

// 分享圖：專輯封面＋「功德圓滿」印章＋迴向＋今日功德
async function drawShareCard(canvas, scenario, merits) {
  await drawCover(canvas, scenario);
  const size = canvas.width;
  const ctx = canvas.getContext("2d");
  const pad = size * 0.08;

  // 印章
  ctx.save();
  ctx.translate(size - pad - size * 0.12, pad + size * 0.12);
  ctx.rotate(-0.15);
  ctx.strokeStyle = COVER_COLORS.red;
  ctx.fillStyle = "rgba(246, 239, 226, 0.92)";
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COVER_COLORS.red;
  ctx.font = `900 ${size * 0.05}px "Noto Serif TC", serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("功德", 0, -size * 0.03);
  ctx.fillText("圓滿", 0, size * 0.035);
  ctx.restore();

  // 底部：迴向與今日功德
  const panelH = size * 0.26;
  ctx.fillStyle = COVER_COLORS.paper;
  ctx.fillRect(0, size - panelH, size, panelH);
  ctx.fillStyle = COVER_COLORS.bg;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.font = `900 ${size * 0.04}px "Noto Serif TC", serif`;
  const blessing = wrapText(ctx, scenario.blessing, size - pad * 2).slice(0, 2);
  let y = size - panelH + pad * 0.6;
  blessing.forEach((line) => {
    ctx.fillText(line, pad, y);
    y += size * 0.055;
  });
  ctx.fillStyle = COVER_COLORS.red;
  ctx.font = `500 ${size * 0.028}px "Noto Sans TC", sans-serif`;
  const meritText = merits.length ? `今日功德：${merits.join("、")}` : "今日功德：撐過了今天";
  ctx.fillText(wrapText(ctx, meritText, size - pad * 2)[0], pad, y + size * 0.015);
}

function canvasToFile(canvas) {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(new File([blob], "職場功德所.png", { type: "image/png" })), "image/png")
  );
}

async function downloadCard(canvas) {
  const file = await canvasToFile(canvas);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// 手機上會叫出系統分享（IG、LINE⋯⋯），不支援的瀏覽器改成下載圖片
async function shareCard(canvas) {
  const file = await canvasToFile(canvas);
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: "職場功德所",
        text: "今天受的氣，已寄放職場功德所。",
      });
    } catch (e) {
      // 使用者取消分享，不用處理
    }
  } else {
    downloadCard(canvas);
  }
}
