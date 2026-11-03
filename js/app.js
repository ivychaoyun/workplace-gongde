// 流程控制，由 feature/flow-test（D 統整）負責：寄放 → 專輯 → 木魚 → 功德圓滿。
// 文案在 content.js，歌在 rap.js，封面在 album.js，木魚與分享在 merit.js。

const state = {
  scenario: null,
};

const $ = (sel) => document.querySelector(sel);
const STEPS = ["deposit", "album", "fish", "complete"];

function showStep(name) {
  STEPS.forEach((s) => $(`#step-${s}`).classList.toggle("is-active", s === name));
  document.querySelectorAll(".progress li").forEach((li) => {
    li.classList.toggle("is-current", li.dataset.step === name);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentScenario() {
  return state.scenario || FALLBACK_SCENARIO;
}

// 步驟一：寄放
function renderScenarios() {
  const grid = $("#scenario-grid");
  SCENARIOS.forEach((sc) => {
    const btn = document.createElement("button");
    btn.className = "scenario";
    btn.type = "button";
    btn.innerHTML = `<strong>${sc.label}</strong><span>${sc.hint}</span>`;
    btn.addEventListener("click", () => {
      const selected = state.scenario === sc;
      state.scenario = selected ? null : sc;
      grid.querySelectorAll(".scenario").forEach((b) => b.classList.remove("is-selected"));
      if (!selected) btn.classList.add("is-selected");
      updateDepositButton();
    });
    grid.appendChild(btn);
  });
}

function updateDepositButton() {
  const hasText = $("#complaint").value.trim().length > 0;
  $("#to-album").disabled = !(state.scenario || hasText);
}

// 步驟二：專輯
function renderAlbum() {
  const sc = currentScenario();
  $("#album-roast").textContent = sc.roast;
  drawCover($("#cover"), sc);

  const songPath = getSongPath(sc.id);
  const audio = $("#song");
  $("#song-path").textContent = songPath;
  audio.hidden = false;
  $("#song-placeholder").hidden = true;
  audio.onerror = () => {
    audio.hidden = true;
    $("#song-placeholder").hidden = false;
  };
  audio.src = songPath;
  audio.load();
  loadRap(sc, $("#complaint").value.trim()); // 歌詞由 AI 現編，見 rap.js
}

// 步驟四：功德圓滿
function renderMerits() {
  const list = $("#merit-list");
  MERITS.forEach((text, i) => {
    const label = document.createElement("label");
    label.className = "merit";
    label.innerHTML = `<input type="checkbox" value="${i}"><span>${text}</span>`;
    label.querySelector("input").addEventListener("change", renderShareCard);
    list.appendChild(label);
  });
}

function checkedMerits() {
  return [...document.querySelectorAll("#merit-list input:checked")].map(
    (el) => MERITS[Number(el.value)]
  );
}

function renderShareCard() {
  return drawShareCard($("#share-card"), currentScenario(), checkedMerits());
}

function restart() {
  state.scenario = null;
  $("#song").pause();
  stopRap();
  $("#complaint").value = "";
  document.querySelectorAll(".scenario").forEach((b) => b.classList.remove("is-selected"));
  document.querySelectorAll("#merit-list input").forEach((el) => (el.checked = false));
  updateDepositButton();
  showStep("deposit");
}

// 綁定事件
renderScenarios();
renderMerits();
$("#fish-goal").textContent = FISH_GOAL;

$("#complaint").addEventListener("input", updateDepositButton);
$("#to-album").addEventListener("click", () => {
  renderAlbum();
  showStep("album");
});
$("#to-fish").addEventListener("click", () => {
  $("#song").pause();
  stopRap();
  resetFish();
  showStep("fish");
});
$("#fish-btn").addEventListener("click", (e) => {
  if (hitFish(e.currentTarget)) {
    renderShareCard();
    setTimeout(() => showStep("complete"), 700);
  }
});
$("#share").addEventListener("click", () => shareCard($("#share-card")));
$("#download").addEventListener("click", () => downloadCard($("#share-card")));
$("#restart").addEventListener("click", restart);

document.querySelectorAll("[data-back]").forEach((btn) =>
  btn.addEventListener("click", () => {
    stopRap();
    showStep(btn.dataset.back);
  })
);
