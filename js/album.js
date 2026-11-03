// 抱怨專輯封面，由 feature/visual-share 負責。
// drawCover 會把梗圖、專輯名（判詞）、廠牌與日期畫到 1:1 的 canvas 上。
// 注意：用 file:// 直接開網頁時，畫了梗圖的 canvas 無法匯出圖片，請用 Live Server 或本機伺服器。

const COVER_COLORS = {
  bg: "#2b2420",
  red: "#b8322a",
  gold: "#e3b964",
  paper: "#f6efe2",
};

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// 中文逐字換行
function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line += ch;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function drawCover(canvas, scenario) {
  const size = canvas.width;
  const ctx = canvas.getContext("2d");
  await document.fonts.ready;

  const meme = await loadImage(`assets/memes/${scenario.id}.png`);
  if (meme) {
    const scale = Math.max(size / meme.width, size / meme.height);
    const w = meme.width * scale;
    const h = meme.height * scale;
    ctx.drawImage(meme, (size - w) / 2, (size - h) / 2, w, h);
    ctx.fillStyle = "rgba(20, 14, 10, 0.55)";
    ctx.fillRect(0, 0, size, size);
  } else {
    const g = ctx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, COVER_COLORS.red);
    g.addColorStop(1, COVER_COLORS.bg);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }

  const pad = size * 0.08;

  ctx.fillStyle = COVER_COLORS.gold;
  ctx.font = `700 ${size * 0.032}px "Noto Sans TC", sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText("職場功德所 RECORDS", pad, pad);

  ctx.fillStyle = COVER_COLORS.paper;
  const titleSize = size * 0.1;
  ctx.font = `900 ${titleSize}px "Noto Serif TC", serif`;
  const lines = wrapText(ctx, scenario.verdict, size - pad * 2);
  const lineHeight = titleSize * 1.25;
  let y = size / 2 - (lines.length * lineHeight) / 2;
  lines.forEach((line) => {
    ctx.fillText(line, pad, y);
    y += lineHeight;
  });

  ctx.font = `500 ${size * 0.03}px "Noto Sans TC", sans-serif`;
  ctx.textBaseline = "bottom";
  const date = new Date().toLocaleDateString("zh-TW");
  ctx.fillText(`${scenario.label}・${date}`, pad, size - pad);
}
