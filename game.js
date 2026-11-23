"use strict";

const ui = Object.fromEntries([...document.querySelectorAll("[id]")].map(element => [element.id, element]));
const ctx = ui.kitchen.getContext("2d");
const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent)
  || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

if (isMobileDevice) {
  document.body.dataset.mobile = "true";
  ui.start.hidden = true;
  ui.keyboardHint.hidden = true;
  ui.desktopOnly.hidden = false;
}

ui.copyGameLink.addEventListener("click", async () => {
  const url = new URL("./", window.location.href).href;
  try {
    await navigator.clipboard.writeText(url);
    ui.shareGameUrl.hidden = true;
    ui.copyGameStatus.textContent = "リンクをコピーしました";
  } catch {
    ui.shareGameUrl.hidden = false;
    ui.shareGameUrl.value = url;
    ui.shareGameUrl.focus();
    ui.shareGameUrl.select();
    ui.copyGameStatus.textContent = "このリンクをコピーしてね";
  }
});
const orders = [
  ["オムライス", ["たまねぎ", "tamanegi"], ["たまご", "tamago"], ["ケチャップ", "kechappu", "ketyappu"]],
  ["ナポリタン", ["ピーマン", "pi-man"], ["いためる", "itameru"], ["ナポリタン", "naporitan"]],
  ["カレーライス", ["じゃがいも", "jagaimo", "zyagaimo"], ["にこむ", "nikomu"], ["カレーライス", "kare-raisu"]],
  ["ハンバーグ", ["ひきにく", "hikiniku"], ["やきあげる", "yakiageru"], ["デミグラス", "demigurasu"]],
];
const extraPrompts = [
  [[["チキンライス", "chikinraisu", "tikinraisu"]], [["うすやき", "usuyaki"]], [["もりつけ", "moritsuke"]]],
  [[["パスタ", "pasuta"]], [["ケチャップ", "kechappu", "ketyappu"]], [["こなチーズ", "konachi-zu", "konati-zu"]]],
  [[["にんじん", "ninjin", "ninzin"]], [["カレー", "kare-"]], [["ごはん", "gohan"]]],
  [[["たまねぎ", "tamanegi"]], [["フライパン", "furaipan"]], [["ソース", "so-su"]]],
];
const roundDuration = 120000;
// This is also the maximum accepted by the existing monthly leaderboard.
const maxDishes = 41;
const recordKey = "typing-kitchen-round-2min";
const everydayPrompts = [
  ["ねこ", "neko"], ["うさぎ", "usagi"], ["きつね", "kitsune"], ["ぺんぎん", "pengin"],
  ["えんぴつ", "enpitsu"], ["けしごむ", "keshigomu"], ["としょしつ", "toshoshitsu"], ["うんどうかい", "undoukai"],
  ["しゃぼんだま", "shabondama"], ["かくれんぼ", "kakurenbo"], ["なわとび", "nawatobi"], ["たからさがし", "takarasagashi"],
  ["そら", "sora"], ["にじ", "niji"], ["ほしぞら", "hoshizora"], ["ひまわり", "himawari"],
  ["でんしゃ", "densha"], ["じてんしゃ", "jitensha"], ["ひこうき", "hikouki"], ["しんかんせん", "shinkansen"],
  ["ぼうし", "boushi"], ["かさ", "kasa"], ["ながぐつ", "nagagutsu"], ["とけい", "tokei"],
  ["おんがく", "ongaku"], ["えほん", "ehon"], ["おりがみ", "origami"], ["すいぞくかん", "suizokukan"],
  ["さくら", "sakura"], ["あさがお", "asagao"], ["いちょう", "ichou"], ["ゆきだるま", "yukidaruma"],
  ["かいがら", "kaigara"], ["ひこうきぐも", "hikoukigumo"], ["とんぼ", "tonbo"], ["ほたる", "hotaru"],
  ["きょうしつ", "kyoushitsu"], ["うわばき", "uwabaki"], ["じゆうちょう", "jiyuuchou"], ["らんどせる", "randoseru"],
  ["すべりだい", "suberidai"], ["ぶらんこ", "buranko"], ["えかきうた", "ekakiuta"], ["みずでっぽう", "mizudeppou"],
  ["こねこ", "koneko"], ["やまみち", "yamamichi"], ["しろくま", "shirokuma"], ["いるか", "iruka"],
];

function spellingOptions(prompt) {
  const [label, ...spellings] = prompt;
  const options = new Set(spellings);
  for (const [first, second] of [["shi", "si"], ["chi", "ti"], ["tsu", "tu"], ["ji", "zi"], ["sha", "sya"], ["shu", "syu"], ["sho", "syo"], ["cha", "tya"], ["chu", "tyu"], ["cho", "tyo"], ["ja", "zya"], ["ju", "zyu"], ["jo", "zyo"]]) {
    for (const spelling of [...options]) {
      options.add(spelling.replaceAll(first, second));
      options.add(spelling.replaceAll(second, first));
    }
  }
  return [label, ...options];
}

function choosePrompts(order, completed) {
  return orders[order].slice(1).map((original, stage) => {
    if (stage !== completed % 3) {
      const word = everydayPrompts[(completed * 2 + (stage < completed % 3 ? stage : stage - 1)) % everydayPrompts.length];
      return spellingOptions(word);
    }
    const variants = [original, ...extraPrompts[order][stage]];
    return spellingOptions(variants[Math.floor(completed / orders.length) % variants.length]);
  });
}

const trialOrders = new Map([["omurice", 0], ["napolitan", 1], ["curry", 2], ["hamburg", 3]]);
const firstOrder = trialOrders.get(new URLSearchParams(window.location.search).get("order")) ?? 0;
const stages = ["じゅんび", "火を通す", "もりつけ"];
const stations = [
  { x: 728, y: 108, width: 132, height: 70, labelX: 524, labelY: 131 },
  { x: 728, y: 227, width: 151, height: 80, labelX: 503, labelY: 238 },
  { x: 728, y: 359, width: 140, height: 85, labelX: 480, labelY: 376 },
];
// Table silhouettes follow the artwork, including the front rails and legs.
const tableLayers = [
  { depth: 181, outline: [[514, 69], [888, 69], [908, 149], [907, 157], [901, 158], [898, 181], [888, 181], [889, 158], [519, 158], [515, 181], [506, 181], [504, 158], [496, 157], [496, 146]] },
  { depth: 311, outline: [[490, 183], [915, 183], [935, 274], [936, 282], [929, 284], [928, 311], [917, 311], [917, 284], [496, 284], [495, 311], [484, 311], [481, 284], [470, 282], [470, 272]] },
  { depth: 477, outline: [[461, 312], [942, 312], [965, 408], [965, 418], [958, 419], [952, 475], [938, 477], [939, 460], [466, 460], [465, 477], [452, 476], [448, 419], [441, 417], [441, 406]] },
];

const mishaps = [
  { messages: [["たまねぎがちった！", "たまごがはねた！"], ["たまごが焼けすぎそう！", "たまごのふちがこげてきた！"], ["ケチャップがはねた！", "ケチャップがさらのふちまでとんだ！"]], prep: ["#eee0bf", "#f3b855"], plate: "#b43c29", shape: "drop" },
  { messages: [["ピーマンがとびちった！", "ピーマンがまな板からこぼれた！"], ["めんがフライパンからはねた！", "めんがなべにくっついてけむりが出た！"], ["めんがさらからはみ出した！", "ナポリタンがさらのふちまですべった！"]], prep: ["#6c8c44", "#b6c46d"], plate: "#d99148", shape: "strand" },
  { messages: [["じゃがいもがころがった！", "じゃがいもがまな板から落ちそう！"], ["なべがあわだってきた", "カレーがふきこぼれた！"], ["ルーがごはんにかかりすぎた！", "ルーがさらのふちまで流れた！"]], prep: ["#e9c488", "#f9e2af"], plate: "#9e5c2c", shape: "pool" },
  { messages: [["ひきにくが形をくずした！", "ひきにくとたまねぎがとびちった！"], ["けむりが出てきた", "ハンバーグがこげはじめた！"], ["デミグラスソースがはねた！", "つけあわせまでずれた！"]], prep: ["#b87166", "#eed2aa"], plate: "#8f5034", shape: "garnish" },
];

const waiterHome = { x: 1048, y: 542 };
const pickup = { x: 818, y: 506 };
const deliveryHandX = 44;
const waiterHeight = 185;
const counterTop = 562;
const counterY = 611;
const platedDish = stations[2];
const slots = [720, 865, 575, 1010, 430, 1155, 285, 1300, 140];
const counterRowHeight = 85;
const counterSurfaceHeight = 97;
let counterRows = 1;

function counterSlot(index) {
  return { x: slots[index % slots.length], y: counterY + Math.floor(index / slots.length) * counterRowHeight };
}

function setCounterRows(rows) {
  counterRows = rows;
  const height = 672 + (rows - 1) * counterRowHeight;
  if (ui.kitchen.height !== height) ui.kitchen.height = height;
  ui.kitchen.style.setProperty("--scene-height", height);
  ui.kitchen.closest("main").style.setProperty("--scene-scale", 1440 / height);
}
const passPlate = { x: 862, y: platedDish.y };
const state = {
  order: firstOrder, step: 0, typed: "", served: 0, stageTime: 0, cooked: 0, deliveryTime: null, deliveryPlaced: false,
  trouble: 0, mistakeTime: -Infinity, easing: null,
  phase: "ready", remaining: roundDuration, lastFrame: null, correct: 0, misses: 0,
  prompts: choosePrompts(firstOrder, 0),

};
let art;
let time = 0;
let flash;
let stampTimeout;
let bellAudio;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const soundKey = "typing-kitchen-sound";
let soundOn = true;
try { soundOn = localStorage.getItem(soundKey) !== "off"; } catch {}

function updateSoundButton() {
  ui.sound.textContent = soundOn ? "音あり" : "音なし";
  ui.sound.setAttribute("aria-pressed", String(soundOn));
}

function prepareBell() {
  if (!soundOn || !window.AudioContext) return;
  try {
    bellAudio ??= new AudioContext();
    if (bellAudio.state === "suspended") bellAudio.resume().catch(() => {});
  } catch {}
}

function ringBell() {
  if (!soundOn || bellAudio?.state !== "running") return;
  const start = bellAudio.currentTime;
  for (const [frequency, volume] of [[1397, .07], [2093, .028]]) {
    const tone = bellAudio.createOscillator();
    const envelope = bellAudio.createGain();
    tone.frequency.value = frequency;
    envelope.gain.setValueAtTime(.001, start);
    envelope.gain.exponentialRampToValueAtTime(volume, start + .012);
    envelope.gain.exponentialRampToValueAtTime(.001, start + .36);
    tone.connect(envelope).connect(bellAudio.destination);
    tone.start(start);
    tone.stop(start + .37);
  }
}

ui.sound.addEventListener("click", () => {
  soundOn = !soundOn;
  updateSoundButton();
  try { localStorage.setItem(soundKey, soundOn ? "on" : "off"); } catch {}
  prepareBell();
});
updateSoundButton();

function stampOrder() {
  ui.stamp.hidden = false;
  clearTimeout(stampTimeout);
  stampTimeout = setTimeout(() => { ui.stamp.hidden = true; }, 480);
}
let completedRound = null;
let rankingReturn = "welcome";
let submissionBusy = false;
const chefs = [
  { x: 340, y: 326, height: 163, direction: 1, frame: 0, move: null },
  { x: 1152, y: 324, height: 177, direction: -1, frame: 3, move: null },
];
// Keep the badger's face clear of the tabletops as he moves through the left aisle.
const badgerAssistPosition = { x: 400, y: 297 };
const chefStations = [
  [{ x: 418, y: 225 }, { x: 1152, y: 324 }],
  [{ x: 373, y: 312 }, { x: 976, y: 324 }],
  [{ x: 369, y: 428 }, { x: 1070, y: 303 }],
];

function showPrompt() {
  ui.order.textContent = orders[state.order][0];
  ui.orderProgress.dataset.step = String(state.step + 1);
  ui.stage.textContent = `${state.step + 1} / 3　${stages[state.step]}`;
  ui.prompt.textContent = state.prompts[state.step][0];
  showRoman();
}

function showRoman() {
  const [, ...options] = state.prompts[state.step];
  const target = options.find(option => option.startsWith(state.typed));
  ui.typed.textContent = state.typed;
  ui.next.textContent = target[state.typed.length] || "";
  ui.rest.textContent = target.slice(state.typed.length + 1);
  ui.key.value = state.typed;
}

document.addEventListener("keydown", event => {
  if (!art || state.phase !== "playing" || event.defaultPrevented || event.isComposing
    || event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.target !== ui.key && event.target instanceof HTMLElement
    && (event.target.isContentEditable || event.target.matches("input, textarea, select"))) return;
  const letter = /^[a-z-]$/i.test(event.key);
  if (!letter && event.key !== "Backspace") return;
  event.preventDefault();
  if (letter && event.repeat) return;
  updateClock(performance.now());
  if (state.phase !== "playing" || state.cooked >= maxDishes) return;
  if (document.activeElement !== ui.key) ui.key.focus({preventScroll: true});
  if (event.key === "Backspace") {
    if (state.typed) state.correct--;
    state.typed = state.typed.slice(0, -1);
    showRoman();
    return;
  }
  const candidate = state.typed + event.key.toLowerCase();
  const [, ...options] = state.prompts[state.step];
  if (!options.some(option => option.startsWith(candidate))) {
    state.misses++;
    reportMistake();
    ui.key.classList.add("bad");
    clearTimeout(flash);
    flash = setTimeout(() => ui.key.classList.remove("bad"), 200);
    return;
  }
  state.correct++;
  state.typed = candidate;
  showRoman();
  if (!options.includes(candidate)) return;
  state.typed = "";
  stampOrder();
  const recovered = clearTrouble();
  if (state.step < 2) {
    state.step++;
    state.stageTime = time;
    cueChefs(state.step);
    const nextStatus = state.step === 1
      ? (state.order === 2 ? "なべで ぐつぐつ" : "フライパンで ジュージュー")
      : "おさらに もりつけ中";
    ui.status.textContent = recovered ? `うまくいった！　${nextStatus}` : nextStatus;
    showPrompt();
    return;
  }
  state.cooked++;
  if (state.deliveryTime === null) {
    state.deliveryTime = time;
    deliveryPhases = normalDelivery;
  }
  showDeliveryQueue();
  if (state.cooked === maxDishes) {
    showFinalDeliveryStatus();
    ui.typed.textContent = ui.next.textContent = ui.rest.textContent = "";
    ui.key.value = "";
    ui.key.disabled = true;
    return;
  }
  state.order = (firstOrder + state.cooked) % orders.length;
  state.prompts = choosePrompts(state.order, state.cooked);
  state.step = 0;
  state.stageTime = time;
  cueChefs(0);
  ui.status.textContent = recovered ? "うまくいった！　つぎの注文へ" : "料理ができた！　つぎの注文へ";
  showPrompt();
});
ui.key.addEventListener("input", () => {
  if (state.phase === "playing") showRoman();
  else ui.key.value = "";
});
ui.kitchen.addEventListener("click", () => ui.key.focus());

function readRecord() {
  try {
    const record = JSON.parse(localStorage.getItem(recordKey));
    return record && Number.isInteger(record.last) && record.last >= 0
      && Number.isInteger(record.best) && record.best >= record.last ? record : null;
  } catch {
    return null;
  }
}

function showSessionCard(card) {
  ui.curtain.hidden = card === null;
  const screens = { welcome: "home", opening: "opening", results: "results", ranking: "ranking" };
  document.body.dataset.screen = screens[card] ?? "game";
  ui.typingConsole.hidden = card !== null && card !== "pauseCard";
  if (card !== "results") ui.confetti.replaceChildren();
  for (const id of ["welcome", "opening", "pauseCard", "results", "ranking"]) ui[id].hidden = id !== card;
}

function updateTimer() {
  const seconds = Math.ceil(state.remaining / 1000);
  ui.timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  ui.timer.classList.toggle("urgent", state.remaining > 0 && state.remaining <= 30000);
}

function openForBusiness() {
  if (isMobileDevice || !art || submissionBusy || !["ready", "finished"].includes(state.phase)) return;
  prepareBell();
  setCounterRows(1);
  completedRound = null;
  ui.submitScore.disabled = true;
  ui.submitStatus.textContent = "";
  Object.assign(state, {
    order: firstOrder, step: 0, typed: "", served: 0, stageTime: 0, cooked: 0, deliveryTime: null, deliveryPlaced: false,
    trouble: 0, mistakeTime: -Infinity, easing: null, correct: 0, misses: 0,
    remaining: roundDuration, phase: "opening", lastFrame: null,
    prompts: choosePrompts(firstOrder, 0),
  });
  time = 0;
  chefs.forEach(chef => { chef.move = null; });
  cueChefs(0);
  clearTimeout(flash);
  ui.key.classList.remove("bad");
  ui.stamp.hidden = true;
  ui.status.classList.remove("trouble");
  ui.served.textContent = "00";
  showDeliveryQueue();
  showPrompt();
  updateTimer();
  if (reducedMotion.matches) {
    startRound();
  } else {
    showSessionCard("opening");
    setTimeout(startRound, 840);
  }
}

function startRound() {
  if (state.phase !== "opening") return;
  state.phase = "playing";
  state.lastFrame = performance.now();
  ui.status.textContent = "お店が開いたよ！　ローマ字で料理をつくろう";
  ui.key.disabled = false;
  ui.pause.hidden = false;
  showSessionCard(null);
  ui.key.focus();
  if (document.hidden) pauseRound();
}

function updateClock(now) {
  if (state.phase !== "playing") return;
  const delta = Math.max(0, now - state.lastFrame);
  state.lastFrame = now;
  const elapsed = Math.min(delta, state.remaining);
  state.remaining = Math.max(0, state.remaining - elapsed);
  time += elapsed;
  updateTimer();
  if (state.remaining === 0) finishRound();
}

function finishRound() {
  if (state.phase !== "playing") return;
  advanceDelivery();
  state.phase = "finished";
  completedRound = Object.freeze({
    id: crypto.randomUUID(), period: monthPeriod().key, served: state.served,
    correct: state.correct, misses: state.misses, elapsedMs: roundDuration,
  });
  ui.submitScore.disabled = state.served === 0;
  ui.submitStatus.textContent = state.served ? "" : "料理を1さらとどけると、きろくをとうろくできます。";
  ui.key.disabled = true;
  ui.pause.hidden = true;
  ui.served.textContent = String(state.served).padStart(2, "0");
  ui.resultServed.textContent = `${state.served}さら`;
  const total = state.correct + state.misses;
  const accuracy = Math.min(99.9, state.correct / total * 100);
  ui.resultAccuracy.textContent = !total ? "—" : state.misses ? `${accuracy.toFixed(1)}%` : "100%";
  ui.resultMisses.textContent = `${state.misses}回`;
  const previous = readRecord();
  const best = Math.max(previous?.best ?? 0, state.served);
  const difference = previous ? state.served - previous.last : 0;
  const comparison = previous ? `前のきろく ${previous.last}さら（${difference > 0 ? "+" : ""}${difference}さら）　ベストきろく ${best}さら` : `はじめてのきろく　${state.served}さら`;
  const newBest = state.served > (previous?.best ?? 0);
  ui.comparison.textContent = newBest ? `ベストきろく！　${best}さら` : comparison;
  ui.comparison.classList.toggle("best", newBest);
  showResultDishes();
  if (newBest && !reducedMotion.matches) celebrateBest();
  try {
    localStorage.setItem(recordKey, JSON.stringify({ last: state.served, best }));
  } catch {
    ui.comparison.textContent += "　このブラウザではきろくを残せませんでした";
  }
  ui.status.classList.remove("trouble");
  ui.status.textContent = `${roundDuration / 60000}分間、おつかれさま！`;
  showSessionCard("results");
  refreshHomeBest();
  ui.retry.focus();
}

function pauseRound() {
  if (state.phase !== "playing") return;
  updateClock(performance.now());
  if (state.phase !== "playing") return;
  state.phase = "paused";
  ui.key.disabled = true;
  ui.pause.hidden = true;
  ui.status.textContent = "ひと休み中";
  showSessionCard("pauseCard");
  ui.resume.focus();
}

function resumeRound() {
  if (state.phase !== "paused") return;
  state.phase = "playing";
  state.lastFrame = performance.now();
  ui.key.disabled = state.cooked >= maxDishes;
  ui.pause.hidden = false;
  if (state.cooked === maxDishes) showFinalDeliveryStatus();
  else ui.status.textContent = "つづけよう！";
  showSessionCard(null);
  ui.key.focus();
}

ui.start.addEventListener("click", openForBusiness);
ui.retry.addEventListener("click", openForBusiness);
ui.pause.addEventListener("click", pauseRound);
ui.resume.addEventListener("click", resumeRound);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pauseRound();
});
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;
  if (state.phase === "playing") pauseRound();
  else if (state.phase === "paused") resumeRound();
});

function monthPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit"}).formatToParts(date);
  const year = parts.find(part => part.type === "year").value;
  const month = parts.find(part => part.type === "month").value;
  return { key: `${year}-${month}`, title: `${year}年${Number(month)}月ランキング` };
}

function normalizedName(value) {
  return String(value).normalize("NFKC").replace(/[\u0000-\u001f\u007f<>]/g, "").trim();
}

const playerNameKey = "typing-kitchen-player-name-v1";
let playerName = "";
try { playerName = localStorage.getItem(playerNameKey) || ""; } catch {}

function renderPlayerName() {
  const label = playerName || "まだなし";
  ui.homeName.textContent = label;
  ui.resultName.textContent = label;
}

function editPlayerName() {
  ui.playerName.value = playerName;
  ui.nameStatus.textContent = "";
  ui.nameDialog.showModal();
}

ui.editHomeName.addEventListener("click", editPlayerName);
ui.editResultName.addEventListener("click", editPlayerName);
ui.cancelName.addEventListener("click", () => ui.nameDialog.close());
ui.nameForm.addEventListener("submit", event => {
  event.preventDefault();
  const name = normalizedName(ui.playerName.value);
  if (Array.from(name).length > 8) {
    ui.nameStatus.textContent = "ニックネームは8文字までです。";
    ui.playerName.focus();
    return;
  }
  playerName = name;
  try { localStorage.setItem(playerNameKey, name); } catch {}
  renderPlayerName();
  ui.nameDialog.close();
});
renderPlayerName();

function refreshHomeBest() {
  const record = readRecord();
  ui.homeBest.textContent = record ? `ベストきろく　${record.best}さら` : "";
}

function goHome() {
  if (submissionBusy) return;
  state.phase = "ready";
  state.deliveryTime = null;
  state.trouble = 0;
  state.easing = null;
  ui.key.disabled = true;
  ui.pause.hidden = true;
  ui.status.classList.remove("trouble");
  ui.status.textContent = "2分間で、何さらおとどけできるかな？";
  refreshHomeBest();
  showSessionCard("welcome");
  ui.start.focus();
}

async function rankingService() {
  if (!window.kitchenRankingReady) throw new Error("準備中");
  return await window.kitchenRankingReady;
}

let rankingRequest = 0;
async function openRanking(from = "welcome") {
  rankingReturn = from;
  showSessionCard("ranking");
  ui.rankingBack.focus();
  const request = ++rankingRequest;
  const period = monthPeriod();
  ui.rankingTitle.textContent = period.title;
  ui.rankingRows.replaceChildren();
  ui.rankingStatus.classList.remove("error");
  ui.rankingStatus.hidden = false;
  ui.rankingStatus.textContent = "ランキングを読み込んでいます…";
  ui.rankingReload.disabled = true;
  try {
    const service = await rankingService();
    const result = await service.load(period.key);
    if (request !== rankingRequest) return;
    for (const [index, entry] of result.entries.entries()) {
      const row = document.createElement("tr");
      const mine = entry.uid === result.uid;
      if (mine) row.className = "is-current";
      const values = [String(index + 1), entry.name, `${entry.served}さら`, `${(entry.accuracy / 100).toFixed(1)}%`];
      values.forEach((value, column) => {
        const cell = document.createElement("td");
        if (column === 0) {
          const badge = document.createElement("span");
          badge.className = "rank-number";
          badge.textContent = value;
          cell.append(badge);
        } else {
          cell.textContent = value;
        }
        if (mine && column === 1) {
          const mark = document.createElement("span");
          mark.className = "my-mark";
          mark.textContent = "あなた";
          cell.append(mark);
        }
        row.append(cell);
      });
      ui.rankingRows.append(row);
    }
    ui.rankingStatus.hidden = result.entries.length > 0;
    ui.rankingStatus.textContent = "今月のきろくはまだありません。最初の料理人になろう！";
  } catch (error) {
    if (request !== rankingRequest) return;
    ui.rankingStatus.classList.add("error");
    ui.rankingStatus.textContent = error.message === "準備中"
      ? "オンラインランキングは公開準備中です。営業とベストきろくの保存は使えます。"
      : "ランキングを読み込めませんでした。通信を確認して再読み込みしてください。";
  } finally {
    if (request === rankingRequest) ui.rankingReload.disabled = false;
  }
}

ui.openRanking.addEventListener("click", () => openRanking("welcome"));
ui.resultRanking.addEventListener("click", () => openRanking("results"));
ui.rankingReload.addEventListener("click", () => openRanking(rankingReturn));
ui.rankingBack.addEventListener("click", () => {
  rankingRequest++;
  showSessionCard(rankingReturn);
  (rankingReturn === "results" ? ui.resultRanking : ui.openRanking).focus();
});
ui.homeFromResult.addEventListener("click", goHome);
ui.quit.addEventListener("click", goHome);
ui.submitForm.addEventListener("submit", async event => {
  event.preventDefault();
  const round = completedRound;
  if (submissionBusy || !round || !round.served) return;
  const name = playerName;
  if (!name || Array.from(name).length > 8) {
    ui.submitStatus.textContent = "「かえる」から、なまえを設定してください。";
    ui.editResultName.focus();
    return;
  }
  submissionBusy = true;
  ui.submitScore.disabled = true;
  ui.retry.disabled = true;
  ui.homeFromResult.disabled = true;
  ui.resultRanking.disabled = true;
  ui.submitStatus.textContent = "ランキングにとうろくしています…";
  try {
    const service = await rankingService();
    const outcome = await service.submit({...round, name});
    ui.submitStatus.textContent = outcome === "saved"
      ? "今月のベストきろくをとうろくしました！"
      : "とうろく済みのベストきろくを残しました。";
  } catch (error) {
    ui.submitStatus.textContent = error.message === "準備中"
      ? "ランキングの公開準備中です。この画面できろくを確認できます。"
      : "とうろくできませんでした。通信を確認して、もう一度お試しください。";
    ui.submitScore.disabled = false;
  } finally {
    submissionBusy = false;
    ui.retry.disabled = false;
    ui.homeFromResult.disabled = false;
    ui.resultRanking.disabled = false;
  }
});
refreshHomeBest();

function reportMistake() {
  const previous = state.trouble;
  state.trouble = Math.min(5, previous + 1);
  state.mistakeTime = time;
  if (previous !== state.trouble) cueChefs(state.step);

  const message = mishaps[state.order].messages[state.step][state.trouble === 1 ? 0 : 1];
  const reaction = ["", "", "クマもそわそわ！", "おでこにあせが！", "みんな大あわて！"];
  ui.status.textContent = [message, reaction[state.trouble - 1]].filter(Boolean).join("　");
  ui.status.classList.add("trouble");
}

function clearTrouble() {
  if (!state.trouble) return false;
  state.easing = { level: state.trouble, start: time };
  state.trouble = 0;
  ui.status.classList.remove("trouble");
  return true;
}

function crewStress() {
  const easing = state.easing;
  return Math.max(state.trouble, easing ? easing.level * (1 - progress(time - easing.start, 310)) : 0);
}

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(path));
    image.src = path;
  });
}

function mix(from, to, amount) {
  return from + (to - from) * amount;
}

function progress(elapsed, duration) {
  return Math.max(0, Math.min(1, elapsed / duration));
}

function drawSprite(sheet, frame, x, y, maxWidth, maxHeight, direction = 1, anchorY = .5, surface = ctx) {
  const [sx, sy, sw, sh] = frame;
  const scale = Math.min(maxWidth / sw, maxHeight / sh);
  const w = sw * scale;
  const h = sh * scale;
  surface.save();
  surface.translate(x, y);
  surface.scale(direction, 1);
  surface.drawImage(sheet, sx, sy, sw, sh, -w / 2, -h * anchorY, w, h);
  surface.restore();
}

function drawFood(order, stage, x, y, width, height) {
  drawSprite(art.food, foodFrames[order * 3 + stage], x, y, width, height);
}

function drawPlatedDish(order, x, y) {
  drawFood(order, 2, x, y, platedDish.width, platedDish.height);
}

function shadow(x, y, width) {
  ctx.fillStyle = "rgba(24,25,26,.33)";
  ctx.beginPath();
  ctx.ellipse(x, y, width, width * .26, 0, 0, Math.PI * 2);
  ctx.fill();
}

function chefPosition(chef) {
  if (!chef.move) return { x: chef.x, y: chef.y, moving: false };
  const { from, to, start, duration } = chef.move;
  const amount = progress(time - start, duration);
  return { x: mix(from.x, to.x, amount), y: mix(from.y, to.y, amount), moving: amount < 1 };
}

function cueChefs(stage) {
  for (const [index, chef] of chefs.entries()) {
    const from = chefPosition(chef);
    const assists = state.trouble >= 2 && stage === 1 && index === 0;
    const to = assists ? badgerAssistPosition : chefStations[stage][index];
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    chef.move = { from, to, start: time, duration: Math.max(1, distance * (state.trouble >= 2 ? 2.3 : 3.1)) };
  }
}

function drawChef(chef, active) {
  const { x, y, moving } = chefPosition(chef);
  const duration = time - (chef.move?.start ?? time);
  const walkingDirection = Math.sign((chef.move?.to.x ?? x) - (chef.move?.from.x ?? x)) || chef.direction;
  const stress = crewStress();
  const height = chef.height + (y - 320) * .12;
  shadow(x, y - 3, chef.frame === 0 ? 34 : 28);
  const worried = stress >= (active ? .85 : 1.75);
  if (worried && (reducedMotion.matches || !moving || Math.floor(time / 92) % 2 === 0)) {
    const hop = reducedMotion.matches ? 0 : Math.sin(time / (stress >= 2 ? 62 : 101)) * (stress + 1);
    drawSprite(art.reactions, reactionFrames[chef.frame === 0 ? 0 : 1], x, y - Math.abs(hop), 190, height, moving ? walkingDirection * chef.direction : 1, 1);
  } else if (moving || active) {
    const cycle = Math.floor(duration / (stress >= 2 ? 83 : 130)) % 4;
    const frame = moving ? chef.frame + [1, 0, 1, 0][cycle] : chef.frame + 2;
    const direction = moving ? walkingDirection * chef.direction : 1;
    ctx.save();
    ctx.translate(x, y);
    if (active && !moving && !reducedMotion.matches) {
      const motion = Math.sin(duration / 118);
      ctx.rotate(chef.direction * motion * .026);
      ctx.scale(1, 1 + motion * .013);
    }
    drawSprite(art.characters, characterFrames[frame], 0, 0, 190, height, direction, 1);
    ctx.restore();
  } else {
    drawSprite(art.characters, characterFrames[chef.frame], x, y, 190, height, 1, 1);
  }
  drawSweat(x, y, height, moving ? walkingDirection : chef.direction, stress);
}

function drawTable(index, delivery) {
  const { outline } = tableLayers[index];
  const station = stations[index];
  ctx.save();
  ctx.beginPath();
  outline.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(art.kitchen, 0, 0);
  ctx.restore();

  const active = index === state.step;
  const { labelX, labelY } = station;
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(labelX, labelY - 16, 88, 23, 4);
  else ctx.rect(labelX, labelY - 16, 88, 23);
  ctx.fillStyle = active ? "#fff0d1" : "#243c35";
  ctx.fill();
  ctx.strokeStyle = active ? "#be643d" : "#ffffff66";
  ctx.lineWidth = active ? 2 : 1;
  ctx.stroke();
  ctx.fillStyle = active ? "#8f3827" : "#fff4dc";
  ctx.font = "bold 13px 'Yu Gothic UI', sans-serif";
  ctx.fillText(`0${index + 1}  ${stages[index]}`, labelX + 7, labelY);

  if (index === 2 && delivery !== null && delivery < deliveryPhases.approach) {
    drawPlatedDish(deliveringOrder(), passPlate.x, passPlate.y);
  }

  const amount = progress(time - state.stageTime, 280);
  if (index === state.step - 1 && amount < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - amount;
    drawFood(state.order, index, station.x, station.y, station.width, station.height);
    ctx.restore();
  }
  if (!active) return;

  const strength = Math.min(3, state.trouble);
  const hit = 1 - progress(time - state.mistakeTime, 460);
  const oscillation = Math.sin(time / (strength ? 63 : 108));
  const shake = reducedMotion.matches ? 0 : oscillation * (index === 1 ? 2.5 + strength * 2 : strength * (2 + hit * 3));
  const x = station.x + shake;
  // Keep the entrance motion inside the front edge of the tabletop.
  const y = station.y + (index > 0 && !reducedMotion.matches ? (1 - amount) * 2 : 0);
  ctx.save();
  if (index > 0) ctx.globalAlpha = amount;
  drawFood(state.order, index, x, y, station.width, station.height);
  ctx.restore();

  if (index === 1) {
    drawCookingTrouble(x, y, strength, hit);
  } else if (strength) {
    drawStationMishap(x, y, index, strength, hit);
  }
}

function fleck(x, y, rx, ry, angle, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
  ctx.fill();
}

function noodle(x, y, scale, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 7 * scale, y);
  ctx.quadraticCurveTo(x, y - 9, x + 4 * scale, y);
  ctx.quadraticCurveTo(x + 10 * scale, y + 9, x + 15 * scale, y + 1);
  ctx.stroke();
}

function drawStationMishap(x, y, step, level, hit) {
  // Use a steady illustration when motion is reduced.
  const effectTime = reducedMotion.matches ? 0 : time;
  if (reducedMotion.matches) hit = 0;
  const dish = mishaps[state.order];
  ctx.save();
  const count = 2 + level * 2;
  for (let i = 0; i < count; i++) {
    const phase = (effectTime / 750 + i * .173) % 1;
    const side = i % 2 === 0 ? 1 : -1;
    const spread = 45 + (i % 4) * 8 + (level - 1) * 5 + hit * 13;
    const px = x + side * (27 + phase * spread);
    const py = y + 12 + (i % 3) * 4 - Math.sin(phase * Math.PI) * (13 + level * 5 + hit * 10);
    ctx.globalAlpha = .38 + Math.sin(phase * Math.PI) * .56;
    if (step === 0) {
      const color = dish.prep[i % 2];
      const rx = state.order === 1 ? 6 : 3.5 + level * .7;
      if (state.order === 2) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(phase * 3);
        ctx.fillStyle = color;
        ctx.fillRect(-rx, -rx * .65, rx * 1.6, rx * 1.3);
        ctx.restore();
      } else {
        fleck(px, py, rx, state.order === 1 ? 2.2 : 3.1, phase * 4, color);
      }
    } else if (dish.shape === "strand") {
      noodle(px, py, side, dish.plate);
    } else {
      const color = dish.shape === "garnish" && i % 3 === 0 ? "#789448" : dish.plate;
      const rx = dish.shape === "pool" ? 5 + level * 3 : 2 + level * 1.4;
      fleck(px, py, rx, 2 + level * .7, side * phase, color);
    }
  }
  ctx.restore();
}

function drawCookingTrouble(x, y, level, hit) {
  // Use a steady illustration when motion is reduced.
  const effectTime = reducedMotion.matches ? 0 : time;
  if (reducedMotion.matches) hit = 0;
  const curry = state.order === 2;
  const potX = x - 17;
  const potY = y + (curry ? -6 : 4);
  ctx.save();
  if (!curry && level >= 2) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(potX + 8, y + 5, 25, 18, -.14, 0, Math.PI * 2);
    ctx.clip();
    ctx.filter = `brightness(${level === 3 ? .53 : .72}) saturate(.77)`;
    drawFood(state.order, 1, x, y, stations[1].width, stations[1].height);
    ctx.restore();
  }
  if (curry && level) {
    for (let i = 0; i < 4 * level + 1; i++) {
      const age = (effectTime / 590 + i * .193) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const dropX = potX + side * (9 + i % 4 * 4 + age * (level === 1 ? 7 : 52 + hit * 18));
      const dropY = potY - Math.sin(age * Math.PI) * (12 + level * 9 + hit * 10) + age * (level > 1 ? 18 : 0);
      ctx.globalAlpha = Math.sin(age * Math.PI) * .9;
      fleck(dropX, dropY, 3.1 + level, 2.8 + level * .8, age, i % 3 === 0 ? "#edb573" : "#ad682f");
    }
    if (level > 1) {
      ctx.globalAlpha = .72;
      fleck(potX + 38, potY + 27, 12 + level * 6, 3 + level, -.12, "#9e612d");
    }
  }
  if (state.order === 0 && level) {
    ctx.globalAlpha = .78;
    for (let i = 0; i < level + 2; i++) {
      const age = (effectTime / 450 + i * .24) % 1;
      const side = i % 2 === 0 ? 1 : -1;
      fleck(potX + side * (15 + age * 23), potY - Math.sin(age * Math.PI) * (8 + 5 * level), 2.4, 3.7, side * .5, "#eab65f");
    }
  }
  if (state.order === 1 && level) {
    ctx.globalAlpha = .89;
    for (let i = 0; i < level; i++) {
      const age = (effectTime / 520 + i * .29) % 1;
      noodle(potX + 12 + i * 13 + age * 22, potY - 23 * Math.sin(age * Math.PI), 1, "#da9456");
    }
  }
  const puffs = level === 0 ? 3 : curry ? level + 1 : level * 3;
  for (let i = 0; i < puffs; i++) {
    const age = (effectTime / 940 + i / puffs) % 1;
    const spread = 7 + level * 8;
    const smokeX = potX + Math.sin(i * 3.7 + age * 3) * spread * age;
    const smokeY = potY - 8 - age * (29 + level * 19);
    const radius = 4 + age * (4 + level * 7);
    ctx.globalAlpha = Math.sin(age * Math.PI) * (level === 0 ? .25 : curry ? .41 : .51 + level * .07);
    fleck(smokeX, smokeY, radius, radius * .64, -.35, level < 2 || curry ? "#ede5d5" : "#393332");
  }
  ctx.restore();
}

function drawSweat(x, y, height, direction, stress) {
  // Use a steady illustration when motion is reduced.
  const effectTime = reducedMotion.matches ? 0 : time;
  if (stress < 4) return;
  const count = stress >= 5 ? 4 : 2;
  const burst = reducedMotion.matches ? 0 : 1 - progress(time - state.mistakeTime, 350);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const phase = (effectTime / 540 + i / count) % 1;
    const side = i % 3 === 2 ? -direction : direction;
    const size = (i % 2 ? 6 : 8.5) + burst * 2;
    const px = x + side * (height * .27 + phase * (18 + burst * 7));
    const py = y - height * .88 + phase * 29 - burst * 9;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(side * -.43);
    ctx.globalAlpha = .95 - phase * .64;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.bezierCurveTo(-size, 0, -size * .72, size * .68, 0, size * .72);
    ctx.bezierCurveTo(size * .72, size * .68, size, 0, 0, -size);
    ctx.fillStyle = "#b4dfec";
    ctx.strokeStyle = "#47606b";
    ctx.lineWidth = 1.7;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

const normalDelivery = { approach: 760, carry: 1580, place: 1830, reset: 2330 };
const rushDelivery = { approach: 500, carry: 1080, place: 1250, reset: 1510 };
let deliveryPhases = normalDelivery;

function showFinalDeliveryStatus() {
  const delivered = state.served === maxDishes;
  ui.prompt.textContent = delivered ? `${maxDishes}さら達成！` : "さいごのおとどけ中";
  ui.status.textContent = delivered ? "営業時間が終わると、けっかが出るよ。" : "ぜんぶの料理ができたよ！";
}

function showDeliveryQueue() {
  const waiting = state.cooked - state.served;
  ui.deliveryQueue.textContent = waiting ? `おとどけ中 ${waiting}さら` : "";
  ui.deliveryQueue.hidden = !waiting;
}

function deliveringOrder() {
  return (firstOrder + deliveryIndex()) % orders.length;
}

function deliveryIndex() {
  return state.served - Number(state.deliveryPlaced);
}

// Keep the current trip's destination fixed even after counting the plate.
function advanceDelivery() {
  if (state.deliveryTime === null) return;
  while (state.deliveryTime !== null) {
    const elapsed = time - state.deliveryTime;
    if (elapsed >= deliveryPhases.place && !state.deliveryPlaced) {
      state.deliveryPlaced = true;
      state.served++;
      showDeliveryQueue();
      ui.served.textContent = String(state.served).padStart(2, "0");
      if (state.served === maxDishes) showFinalDeliveryStatus();
      if (state.phase === "playing" && state.remaining > 0) ringBell();
    }
    if (elapsed < deliveryPhases.reset) return;
    state.deliveryTime = state.served < state.cooked ? state.deliveryTime + deliveryPhases.reset : null;
    state.deliveryPlaced = false;
    deliveryPhases = state.cooked - state.served >= 2 ? rushDelivery : normalDelivery;
  }
}

function waiterPose(elapsed) {
  if (elapsed === null && crewStress() >= 2.2 && !reducedMotion.matches) {
    const phase = time / 185;
    return { x: waiterHome.x + Math.sin(phase) * 52, y: waiterHome.y, direction: Math.cos(phase) > 0 ? 1 : -1, walk: true, hands: false };
  }
  if (elapsed === null || elapsed < 260) return { ...waiterHome, direction: 1, walk: false, hands: false };
  const destination = counterSlot(deliveryIndex()).x;
  if (elapsed < deliveryPhases.approach) {
    const amount = progress(elapsed - 260, deliveryPhases.approach - 260);
    return { x: mix(waiterHome.x, pickup.x, amount), y: mix(waiterHome.y, pickup.y, amount), direction: -1, walk: true, hands: true };
  }
  const direction = destination < pickup.x ? -1 : 1;
  const stopX = destination - direction * deliveryHandX;
  if (elapsed < deliveryPhases.carry) {
    const amount = progress(elapsed - deliveryPhases.approach, deliveryPhases.carry - deliveryPhases.approach);
    return { x: mix(pickup.x, stopX, amount), y: mix(pickup.y, waiterHome.y, amount), direction, walk: true, hands: true };
  }
  if (elapsed < deliveryPhases.place) {
    return { x: stopX, y: waiterHome.y, direction, walk: false, hands: true };
  }
  const amount = progress(elapsed - deliveryPhases.place, deliveryPhases.reset - deliveryPhases.place);
  return { x: mix(stopX, waiterHome.x, amount), y: waiterHome.y, direction: stopX > waiterHome.x ? -1 : 1, walk: true, hands: false };
}

function drawWaiter(elapsed) {
  const pose = waiterPose(elapsed);
  shadow(pose.x, pose.y - 3, 32);
  const walkFrames = [7, 8];
  const frame = pose.walk ? walkFrames[Math.floor(time / 115) % walkFrames.length] : (pose.hands ? 8 : 6);
  const worried = elapsed === null && crewStress() >= 1.8;
  if (worried && (!pose.walk || Math.floor(time / 95) % 2 === 0)) {
    drawSprite(art.reactions, reactionFrames[2], pose.x, pose.y, 185, waiterHeight, pose.direction, 1);
  } else {
    drawSprite(art.characters, characterFrames[frame], pose.x, pose.y, 185, waiterHeight, pose.direction, 1);
  }

  if (elapsed === null) drawSweat(pose.x, pose.y, waiterHeight, pose.direction, crewStress());
}

function drawCarriedDish(elapsed) {
  if (elapsed === null || elapsed < deliveryPhases.approach || elapsed >= deliveryPhases.place) return;
  const pose = waiterPose(elapsed);
  const amount = progress(elapsed - deliveryPhases.carry, deliveryPhases.place - deliveryPhases.carry);
  const slot = counterSlot(deliveryIndex());
  const fromPickup = progress(elapsed - deliveryPhases.approach, 170);
  const handX = mix(passPlate.x, pose.x + pose.direction * deliveryHandX, fromPickup);
  const handY = mix(passPlate.y, pose.y - waiterHeight * .36, fromPickup);
  drawPlatedDish(deliveringOrder(), mix(handX, slot.x, amount), mix(handY, slot.y, amount));
}

function drawCounter() {
  for (let item = 0; item < state.served; item++) {
    const { x, y } = counterSlot(item);
    drawPlatedDish((firstOrder + item) % orders.length, x, y);
  }
}

function draw(timestamp) {
  updateClock(timestamp);
  if (state.phase === "finished") {
    requestAnimationFrame(draw);
    return;
  }
  if (state.phase === "playing") advanceDelivery();
  const delivery = state.deliveryTime === null ? null : time - state.deliveryTime;
  if (delivery !== null && state.served < state.cooked) {
    const rows = Math.floor(deliveryIndex() / slots.length) + 1;
    if (rows > counterRows) setCounterRows(rows);
  }
  ctx.drawImage(art.kitchen, 0, 0);
  const scene = tableLayers.map(({ depth }, index) => ({ depth, draw: () => drawTable(index, delivery) }));
  chefs.forEach((chef, index) => {
    const active = index === 1 ? state.step === 1 : state.step !== 1;
    scene.push({ depth: chefPosition(chef).y, draw: () => drawChef(chef, active) });
  });
  scene.push({ depth: waiterPose(delivery).y, draw: () => drawWaiter(delivery) });
  scene.sort((left, right) => left.depth - right.depth);
  scene.forEach(layer => layer.draw());
  const depth = counterSurfaceHeight + (counterRows - 1) * counterRowHeight;
  ctx.drawImage(art.counter, 0, 0, 1440, counterSurfaceHeight, 0, counterTop, 1440, depth);
  const edge = art.counter.height - counterSurfaceHeight;
  ctx.drawImage(art.counter, 0, counterSurfaceHeight, 1440, edge, 0, counterTop + depth, 1440, edge);
  drawCounter();
  drawCarriedDish(delivery);
  requestAnimationFrame(draw);
}

const characterFrames = [[4, 4, 199, 252], [264, 4, 200, 252], [524, 4, 204, 252], [4, 264, 184, 252], [264, 264, 194, 252], [524, 264, 196, 252], [4, 524, 178, 252], [264, 524, 178, 252], [524, 524, 180, 252]];

const foodFrames = [[3, 3, 184, 102], [193, 3, 184, 135], [383, 3, 184, 103], [3, 193, 184, 94], [193, 193, 184, 143], [383, 193, 184, 117], [3, 383, 184, 94], [193, 383, 184, 138], [383, 383, 184, 115], [3, 573, 184, 144], [193, 573, 176, 146], [383, 573, 184, 130]];

const reactionFrames = [[4, 4, 209, 252], [264, 4, 216, 252], [524, 4, 165, 252]];

function showResultDishes() {
  const surface = ui.resultDishes.getContext("2d");
  surface.clearRect(0, 0, ui.resultDishes.width, ui.resultDishes.height);
  const count = Math.min(state.served, 5);
  ui.resultDishes.hidden = count === 0;
  const paint = position => {
    const order = (firstOrder + position) % orders.length;
    const x = 250 + (position - (count - 1) / 2) * 93;
    drawSprite(art.food, foodFrames[order * 3 + 2], x, 37, 89, 66, 1, .5, surface);
  };
  const round = completedRound;
  for (let position = 0; position < count; position++) {
    if (position === 0 || reducedMotion.matches) paint(position);
    else setTimeout(() => { if (completedRound === round) paint(position); }, position * 110);
  }
}

function celebrateBest() {
  const colors = ["#ba3328", "#238174", "#f0aa35", "#ec8672"];
  const pieces = Array.from({ length: 24 }, (_, index) => {
    const piece = document.createElement("i");
    piece.style.setProperty("--x", `${(index * 31 % 96) + 2}%`);
    piece.style.setProperty("--color", colors[index % colors.length]);
    piece.style.setProperty("--delay", `${index % 7 * 35}ms`);
    return piece;
  });
  ui.confetti.replaceChildren(...pieces);
}

const files = ["kitchen", "characters", "food", "counter", "reactions"];
Promise.all(files.map(name => loadImage(`assets/${name}.webp?v=chibi`))).then(images => {
  art = Object.fromEntries(files.map((name, index) => [name, images[index]]));
  ui.status.textContent = "じゅんびができたよ！";
  ui.start.disabled = false;
  ui.start.textContent = "開店する";
  if (document.activeElement === document.body) ui.start.focus();
  showPrompt();
  requestAnimationFrame(timestamp => {
    cueChefs(state.step);
    draw(timestamp);
  });
}).catch(() => {
  ui.status.textContent = "キッチンの絵が出ませんでした。ページをひらきなおしてね。";
  ui.homeStatus.textContent = ui.status.textContent;
  ui.start.textContent = "ページをひらきなおしてね";
});
