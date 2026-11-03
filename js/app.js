// 互動邏輯。文案在 content.js。

const state = {
  scenario: null,
  mode: null,
  fishCount: 0,
};

const $ = (sel) => document.querySelector(sel);
const STEPS = ["deposit", "mode", "response", "merits", "slip"];

function showStep(name) {
  STEPS.forEach((s) => $(`#step-${s}`).classList.toggle("is-active", s === name));
  // 進度條只有四格，merits 併入「功德單」
  const progressName = name === "merits" ? "slip" : name;
  document.querySelectorAll(".progress li").forEach((li) => {
    li.classList.toggle("is-current", li.dataset.step === progressName);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 步驟一：情境
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
  $("#to-mode").disabled = !(state.scenario || hasText);
}

// 步驟二：模式
function renderModes() {
  const list = $("#mode-list");
  MODES.forEach((m) => {
    const btn = document.createElement("button");
    btn.className = `mode mode-${m.id}`;
    btn.type = "button";
    btn.innerHTML = `<strong>${m.label}</strong><span>${m.desc}</span>`;
    btn.addEventListener("click", () => {
      state.mode = m;
      renderResponse();
      applyModeEffect(m.id);
      showStep("response");
    });
    list.appendChild(btn);
  });
}

// 步驟三：回應
function currentScenario() {
  return state.scenario || FALLBACK_SCENARIO;
}

function renderResponse() {
  const sc = currentScenario();
  $("#case-tag").textContent = `${sc.label}・${state.mode.label}`;
  $("#response-text").textContent = sc[state.mode.id];

  const memePath = `assets/memes/${sc.id}.png`;
  const img = $("#meme-img");
  $("#meme-path").textContent = memePath;
  img.hidden = false;
  $("#meme-placeholder").hidden = true;
  img.onerror = () => {
    img.hidden = true;
    $("#meme-placeholder").hidden = false;
  };
  img.src = memePath;
  img.alt = `${sc.label}梗圖`;

  const musicPath = `assets/music/${state.mode.id}.mp3`;
  const audio = $("#music");
  $("#music-path").textContent = musicPath;
  audio.hidden = false;
  $("#music-placeholder").hidden = true;
  audio.onerror = () => {
    audio.hidden = true;
    $("#music-placeholder").hidden = false;
  };
  audio.src = musicPath;
  audio.load();
}

function hitFish(e) {
  state.fishCount += 1;
  $("#fish-count").textContent = state.fishCount;
  const btn = e.currentTarget;
  btn.classList.remove("is-hit");
  void btn.offsetWidth; // 重新觸發動畫
  btn.classList.add("is-hit");

  const plus = document.createElement("span");
  plus.className = "fish-plus";
  plus.textContent = "怨氣 −1";
  btn.appendChild(plus);
  setTimeout(() => plus.remove(), 900);
}

// 步驟四：功德
function renderMerits() {
  const list = $("#merit-list");
  MERITS.forEach((text, i) => {
    const label = document.createElement("label");
    label.className = "merit";
    label.innerHTML = `<input type="checkbox" value="${i}"><span>${text}</span>`;
    list.appendChild(label);
  });
}

function renderSlip() {
  const sc = currentScenario();
  const checked = [...document.querySelectorAll("#merit-list input:checked")].map(
    (el) => MERITS[Number(el.value)]
  );
  const today = new Date();

  $("#slip-date").textContent = today.toLocaleDateString("zh-TW", {
    year: "numeric", month: "long", day: "numeric",
  });
  $("#slip-no").textContent = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
  $("#slip-case").textContent = sc.label;
  $("#slip-verdict").textContent = sc.verdict;
  $("#slip-blessing").textContent = sc.blessing;

  const ul = $("#slip-merits");
  ul.innerHTML = "";
  const items = checked.length ? checked : ["撐過了今天（這本身就算）"];
  items.forEach((t) => {
    const li = document.createElement("li");
    li.textContent = t;
    ul.appendChild(li);
  });

  // 每項功德 10 點，敲木魚每 10 下加 1 點，只是好玩
  const total = items.length * 10 + Math.floor(state.fishCount / 10);
  $("#slip-total").textContent = total;
}

function restart() {
  state.scenario = null;
  state.mode = null;
  state.fishCount = 0;
  delete document.body.dataset.mode;
  $("#fish-count").textContent = "0";
  $("#complaint").value = "";
  document.querySelectorAll(".scenario").forEach((b) => b.classList.remove("is-selected"));
  document.querySelectorAll("#merit-list input").forEach((el) => (el.checked = false));
  updateDepositButton();
  showStep("deposit");
}

// 綁定事件
renderScenarios();
renderModes();
renderMerits();

$("#complaint").addEventListener("input", updateDepositButton);
$("#to-mode").addEventListener("click", () => showStep("mode"));
$("#fish-btn").addEventListener("click", hitFish);
$("#to-slip").addEventListener("click", () => {
  renderSlip();
  showStep("slip");
});
$("#restart").addEventListener("click", restart);
$("#print").addEventListener("click", () => window.print());

document.querySelectorAll("[data-back]").forEach((btn) =>
  btn.addEventListener("click", () => showStep(btn.dataset.back))
);
document.querySelectorAll("[data-go]").forEach((btn) =>
  btn.addEventListener("click", () => showStep(btn.dataset.go))
);
