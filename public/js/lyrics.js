// 從歌詞庫（lyric-library.js）挑一首最適合的歌，不用 AI、不花錢，全部在瀏覽器裡完成。
//
// 怎麼挑：
// 1. 選了情境 → 只在那個情境的歌裡挑；選「其他鳥事」或沒選 → 整個歌詞庫都可以挑。
// 2. 抱怨裡出現歌的 tags 就加分，詞越長分數越高（「設計稿」比「設計」更準）。
// 3. 分數最高的歌裡隨機挑一首；都沒分數就在候選裡隨機挑。
// 4. 同一次使用不會連續挑到同一首，按「換一首」會換。

let lastLyricId = null;

function scoreVerse(verse, text) {
  // 大小寫不同的同一個詞（logo / Logo / LOGO）只算一次
  const tags = [...new Set(verse.tags.map((t) => t.toLowerCase()))];
  const matched = tags.filter((tag) => text.includes(tag));
  // 同一個詞只算一次，被更長的詞包含的不重複算（例：「設計稿」已中，「設計」不再加分）
  const unique = matched.filter((tag) => !matched.some((other) => other !== tag && other.includes(tag)));
  return { score: unique.reduce((sum, tag) => sum + [...tag].length, 0), matched: unique };
}

function rankLyrics(scenario, complaint) {
  const text = (complaint || "").toLowerCase();
  const pool = scenario && scenario.id !== "other"
    ? LYRIC_LIBRARY.filter((v) => v.scenario === scenario.id)
    : LYRIC_LIBRARY;
  return pool
    .map((verse) => ({ verse, ...scoreVerse(verse, text) }))
    .sort((a, b) => b.score - a.score);
}

// 回傳 { lines, verse: 挑中的歌, score, matched: 對到的 tags, ranking: 所有候選與分數 }
function buildLyrics(scenario, complaint, { reroll = false } = {}) {
  const ranking = rankLyrics(scenario, complaint);
  if (!ranking.length) return { lines: [], verse: null, score: 0, matched: [], ranking };

  const top = ranking[0].score;
  let picks = top > 0 ? ranking.filter((r) => r.score === top) : ranking;
  // 換一首：最高分只有一首時，改挑其他也有對到的歌；都沒有就留在同一個情境裡挑
  if (reroll && picks.length === 1) {
    const hits = ranking.filter((r) => r.score > 0);
    picks = hits.length > 1 ? hits : ranking.filter((r) => r.verse.scenario === ranking[0].verse.scenario);
  }
  if (picks.length > 1) picks = picks.filter((r) => r.verse.id !== lastLyricId);

  const pick = picks[Math.floor(Math.random() * picks.length)];
  lastLyricId = pick.verse.id;
  return { lines: pick.verse.lines, verse: pick.verse, score: pick.score, matched: pick.matched, ranking };
}
