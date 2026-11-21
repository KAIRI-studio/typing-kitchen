"use strict";

const ui = Object.fromEntries([...document.querySelectorAll("[id]")].map(element => [element.id, element]));
const ctx = ui.kitchen.getContext("2d");
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
const roundDuration = 180000;
const recordKey = "typing-kitchen-round-v1";

function spellingOptions(prompt) {
  const [label, ...spellings] = prompt;
  const options = new Set(spellings);
  for (const [first, second] of [["shi", "si"], ["chi", "ti"], ["tsu", "tu"], ["ji", "zi"]]) {
    for (const spelling of [...options]) {
      options.add(spelling.replaceAll(first, second));
      options.add(spelling.replaceAll(second, first));
    }
  }
  return [label, ...options];
}

function choosePrompts(order, completed) {
  return orders[order].slice(1).map((original, stage) => {
    const variants = [original, ...extraPrompts[order][stage]];
    return spellingOptions(variants[Math.floor(completed / orders.length) % variants.length]);
  });
}

const trialOrders = new Map([["omurice", 0], ["napolitan", 1], ["curry", 2], ["hamburg", 3]]);
const firstOrder = trialOrders.get(new URLSearchParams(window.location.search).get("order")) ?? 0;
const stages = ["仕込み", "加熱", "盛り付け"];
const stations = [
  { x: 728, y: 118, width: 132, height: 75, labelX: 524, labelY: 131 },
  { x: 728, y: 223, width: 151, height: 90, labelX: 503, labelY: 238 },
  { x: 728, y: 365, width: 140, height: 85, labelX: 480, labelY: 376 },
];
// Table silhouettes follow the artwork, including the front rails and legs.
const tableLayers = [
  { depth: 181, outline: [[514, 69], [888, 69], [908, 149], [907, 157], [901, 158], [898, 181], [888, 181], [889, 158], [519, 158], [515, 181], [506, 181], [504, 158], [496, 157], [496, 146]] },
  { depth: 311, outline: [[490, 183], [915, 183], [935, 274], [936, 282], [929, 284], [928, 311], [917, 311], [917, 284], [496, 284], [495, 311], [484, 311], [481, 284], [470, 282], [470, 272]] },
  { depth: 477, outline: [[461, 312], [942, 312], [965, 408], [965, 418], [958, 419], [952, 475], [938, 477], [939, 460], [466, 460], [465, 477], [452, 476], [448, 419], [441, 417], [441, 406]] },
];

const mishaps = [
  { messages: [["たまねぎが散った！", "たまごが跳ねた！"], ["卵が焼けすぎそう！", "卵のふちが焦げてきた！"], ["ケチャップが跳ねた！", "ケチャップが皿のふちまで飛んだ！"]], prep: ["#eee0bf", "#f3b855"], plate: "#b43c29", shape: "drop" },
  { messages: [["ピーマンが飛び散った！", "ピーマンがまな板からこぼれた！"], ["麺がフライパンから跳ねた！", "麺が鍋肌にくっついて煙が出た！"], ["麺が皿からはみ出した！", "ナポリタンが皿のふちまで滑った！"]], prep: ["#6c8c44", "#b6c46d"], plate: "#d99148", shape: "strand" },
  { messages: [["じゃがいもが転がった！", "じゃがいもがまな板から落ちそう！"], ["鍋が泡立ってきた", "カレーが吹きこぼれた！"], ["ルーがご飯にかかりすぎた！", "ルーが皿のふちまで流れた！"]], prep: ["#e9c488", "#f9e2af"], plate: "#9e5c2c", shape: "pool" },
  { messages: [["ひき肉が形を崩した！", "ひき肉と玉ねぎが飛び散った！"], ["煙が出てきた", "ハンバーグが焦げはじめた！"], ["デミグラスソースが跳ねた！", "付け合わせまでずれた！"]], prep: ["#b87166", "#eed2aa"], plate: "#8f5034", shape: "garnish" },
];

const waiterHome = { x: 1048, y: 542 };
const pickup = { x: 681, y: 506 };
const deliveryHandX = 44;
const waiterHeight = 185;
const counterTop = 562;
const counterY = 611;
const platedDish = stations[2];
const slots = [802, 961, 1120, 1279];
const state = {
  order: firstOrder, step: 0, typed: "", served: 0, stageTime: 0, deliveryTime: null,
  trouble: 0, mistakeTime: -Infinity, easing: null,
  phase: "ready", remaining: roundDuration, lastFrame: null, correct: 0, misses: 0,
  prompts: choosePrompts(firstOrder, 0),

};
let art;
let time = 0;
let flash;
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

ui.key.addEventListener("keydown", event => {
  if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
  const letter = /^[a-z-]$/i.test(event.key);
  if (!letter && event.key !== "Backspace") return;
  event.preventDefault();
  if (!art || state.phase !== "playing") return;
  updateClock(performance.now());
  if (state.phase !== "playing" || state.deliveryTime !== null) return;
  if (event.key === "Backspace") {
    state.typed = state.typed.slice(0, -1);
    showRoman();
    return;
  }
  const candidate = state.typed + event.key.toLowerCase();
  const [, ...options] = state.prompts[state.step];
  if (!options.some(option => option.startsWith(candidate))) {
    if (event.repeat) return;
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
  const recovered = clearTrouble();
  if (state.step < 2) {
    state.step++;
    state.stageTime = time;
    cueChefs(state.step);
    const nextStatus = state.step === 1
      ? (state.order === 2 ? "鍋で煮込み中" : "フライパンで加熱中")
      : "お皿に盛り付け中";
    ui.status.textContent = recovered ? `持ち直した！　${nextStatus}` : nextStatus;
    showPrompt();
    return;
  }
  state.deliveryTime = time;
  ui.status.textContent = recovered ? "持ち直した！　ウェイターが運びます" : "できあがり。ウェイターが運びます";
  ui.key.value = "";
});
ui.key.addEventListener("input", () => {
  if (state.phase === "playing" && state.deliveryTime === null) showRoman();
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
  for (const id of ["welcome", "pauseCard", "results"]) ui[id].hidden = id !== card;
}

function updateTimer() {
  const seconds = Math.ceil(state.remaining / 1000);
  ui.timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  ui.timer.classList.toggle("urgent", state.remaining > 0 && state.remaining <= 30000);
}

function startRound() {
  if (!art || !["ready", "finished"].includes(state.phase)) return;
  Object.assign(state, {
    order: firstOrder, step: 0, typed: "", served: 0, stageTime: 0, deliveryTime: null,
    trouble: 0, mistakeTime: -Infinity, easing: null, correct: 0, misses: 0,
    remaining: roundDuration, phase: "playing", lastFrame: performance.now(),
    prompts: choosePrompts(firstOrder, 0),
  });
  time = 0;
  chefs.forEach(chef => { chef.move = null; });
  cueChefs(0);
  clearTimeout(flash);
  ui.key.classList.remove("bad");
  ui.status.classList.remove("trouble");
  ui.served.textContent = "00";
  ui.status.textContent = "営業開始！　ローマ字で料理をつくろう";
  ui.key.disabled = false;
  ui.pause.hidden = false;
  showSessionCard(null);
  showPrompt();
  updateTimer();
  ui.key.focus();
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
  // A dish counts once it lands on the counter, including during the return walk.
  if (state.deliveryTime !== null && time - state.deliveryTime >= deliveryPhases.place) {
    state.served++;
  }
  state.phase = "finished";
  ui.key.disabled = true;
  ui.pause.hidden = true;
  ui.served.textContent = String(state.served).padStart(2, "0");
  ui.resultServed.textContent = `${state.served}皿`;
  const total = state.correct + state.misses;
  ui.resultAccuracy.textContent = total ? `${Math.round(state.correct / total * 100)}%` : "—";
  ui.resultMisses.textContent = `${state.misses}回`;
  const previous = readRecord();
  const best = Math.max(previous?.best ?? 0, state.served);
  const difference = previous ? state.served - previous.last : 0;
  const comparison = previous ? `前回 ${previous.last}皿（${difference > 0 ? "+" : ""}${difference}皿）　自己ベスト ${best}皿` : `はじめての記録　${state.served}皿`;
  ui.comparison.textContent = comparison;
  try {
    localStorage.setItem(recordKey, JSON.stringify({ last: state.served, best }));
  } catch {
    ui.comparison.textContent += "　このブラウザでは記録を保存できませんでした";
  }
  ui.status.classList.remove("trouble");
  ui.status.textContent = "3分間、おつかれさま！";
  showSessionCard("results");
  ui.retry.focus();
}

function pauseRound() {
  if (state.phase !== "playing") return;
  updateClock(performance.now());
  if (state.phase !== "playing") return;
  state.phase = "paused";
  ui.key.disabled = true;
  ui.pause.hidden = true;
  ui.status.textContent = "営業を一時停止しています";
  showSessionCard("pauseCard");
  ui.resume.focus();
}

function resumeRound() {
  if (state.phase !== "paused") return;
  state.phase = "playing";
  state.lastFrame = performance.now();
  ui.key.disabled = false;
  ui.pause.hidden = false;
  ui.status.textContent = "営業再開！";
  showSessionCard(null);
  ui.key.focus();
}

ui.start.addEventListener("click", startRound);
ui.retry.addEventListener("click", startRound);
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

function reportMistake() {
  const previous = state.trouble;
  state.trouble = Math.min(5, previous + 1);
  state.mistakeTime = time;
  if (previous !== state.trouble) cueChefs(state.step);

  const message = mishaps[state.order].messages[state.step][state.trouble === 1 ? 0 : 1];
  const reaction = ["", "", "クマも落ち着かない！", "額に汗が！", "みんな大慌て！"];
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

function drawSprite(sheet, frame, x, y, maxWidth, maxHeight, direction = 1, anchorY = .5) {
  const [sx, sy, sw, sh] = frame;
  const scale = Math.min(maxWidth / sw, maxHeight / sh);
  const w = sw * scale;
  const h = sh * scale;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  ctx.drawImage(sheet, sx, sy, sw, sh, -w / 2, -h * anchorY, w, h);
  ctx.restore();
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
  if (worried && (!moving || Math.floor(time / 92) % 2 === 0)) {
    const hop = Math.sin(time / (stress >= 2 ? 62 : 101)) * (stress + 1);
    drawSprite(art.reactions, reactionFrames[chef.frame === 0 ? 0 : 1], x, y - Math.abs(hop), 190, height, moving ? walkingDirection * chef.direction : 1, 1);
  } else if (moving || active) {
    const cycle = Math.floor(duration / (stress >= 2 ? 83 : 130)) % 4;
    const frame = moving ? chef.frame + [1, 0, 1, 0][cycle] : chef.frame + 2;
    const direction = moving ? walkingDirection * chef.direction : 1;
    ctx.save();
    ctx.translate(x, y);
    if (active && !moving) {
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

function drawTable(index, showFinished) {
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
  ctx.fillStyle = active ? "rgba(38,32,26,.9)" : "rgba(35,39,41,.75)";
  ctx.fillRect(station.labelX, station.labelY - 16, 88, 23);
  ctx.fillStyle = active ? "#ffd29a" : "#e3dfd6";
  ctx.font = "bold 13px 'Yu Gothic UI', sans-serif";
  ctx.fillText(`0${index + 1}  ${stages[index]}`, station.labelX + 7, station.labelY);

  if (state.deliveryTime !== null) {
    if (active && showFinished) drawPlatedDish(state.order, station.x, station.y);
    return;
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
  const shake = oscillation * (index === 1 ? 2.5 + strength * 2 : strength * (2 + hit * 3));
  const x = station.x + shake;
  const y = station.y + (index > 0 ? (1 - amount) * 8 : 0);
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
  const dish = mishaps[state.order];
  ctx.save();
  const count = 2 + level * 2;
  for (let i = 0; i < count; i++) {
    const phase = (time / 750 + i * .173) % 1;
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
      const age = (time / 590 + i * .193) % 1;
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
      const age = (time / 450 + i * .24) % 1;
      const side = i % 2 === 0 ? 1 : -1;
      fleck(potX + side * (15 + age * 23), potY - Math.sin(age * Math.PI) * (8 + 5 * level), 2.4, 3.7, side * .5, "#eab65f");
    }
  }
  if (state.order === 1 && level) {
    ctx.globalAlpha = .89;
    for (let i = 0; i < level; i++) {
      const age = (time / 520 + i * .29) % 1;
      noodle(potX + 12 + i * 13 + age * 22, potY - 23 * Math.sin(age * Math.PI), 1, "#da9456");
    }
  }
  const puffs = level === 0 ? 3 : curry ? level + 1 : level * 3;
  for (let i = 0; i < puffs; i++) {
    const age = (time / 940 + i / puffs) % 1;
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
  if (stress < 4) return;
  const count = stress >= 5 ? 4 : 2;
  const burst = 1 - progress(time - state.mistakeTime, 350);
  ctx.save();
  for (let i = 0; i < count; i++) {
    const phase = (time / 540 + i / count) % 1;
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

const deliveryPhases = { approach: 930, carry: 1970, place: 2270, reset: 2910 };

function waiterPose(elapsed) {
  if (elapsed === null && crewStress() >= 2.2) {
    const phase = time / 185;
    return { x: waiterHome.x + Math.sin(phase) * 52, y: waiterHome.y, direction: Math.cos(phase) > 0 ? 1 : -1, walk: true, hands: false };
  }
  if (elapsed === null || elapsed < 260) return { ...waiterHome, direction: 1, walk: false, hands: false };
  const destination = slots[state.served % slots.length];
  if (elapsed < deliveryPhases.approach) {
    const amount = progress(elapsed - 260, deliveryPhases.approach - 260);
    return { x: mix(waiterHome.x, pickup.x, amount), y: mix(waiterHome.y, pickup.y, amount), direction: -1, walk: true, hands: true };
  }
  if (elapsed < deliveryPhases.carry) {
    const amount = progress(elapsed - deliveryPhases.approach, deliveryPhases.carry - deliveryPhases.approach);
    return { x: mix(pickup.x, destination - deliveryHandX, amount), y: mix(pickup.y, waiterHome.y, amount), direction: 1, walk: true, hands: true };
  }
  if (elapsed < deliveryPhases.place) {
    return { x: destination - deliveryHandX, y: waiterHome.y, direction: 1, walk: false, hands: true };
  }
  const amount = progress(elapsed - deliveryPhases.place, deliveryPhases.reset - deliveryPhases.place);
  return { x: mix(destination - deliveryHandX, waiterHome.x, amount), y: waiterHome.y, direction: destination - deliveryHandX > waiterHome.x ? -1 : 1, walk: true, hands: false };
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
  if (elapsed === null || elapsed < deliveryPhases.approach || elapsed >= deliveryPhases.place) return;
  const amount = progress(elapsed - deliveryPhases.carry, deliveryPhases.place - deliveryPhases.carry);
  const slot = slots[state.served % slots.length];
  const fromPickup = progress(elapsed - deliveryPhases.approach, 170);
  const handX = mix(platedDish.x, pose.x + deliveryHandX, fromPickup);
  const handY = mix(platedDish.y, pose.y - waiterHeight * .36, fromPickup);
  drawPlatedDish(state.order, mix(handX, slot, amount), mix(handY, counterY, amount));
}

function drawCounter(elapsed) {
  const inDelivery = elapsed !== null && elapsed >= deliveryPhases.place;
  const total = state.served + Number(inDelivery);
  for (let item = Math.max(0, total - slots.length); item < total; item++) {
    drawPlatedDish((firstOrder + item) % orders.length, slots[item % slots.length], counterY);
  }
}

function draw(timestamp) {
  updateClock(timestamp);
  if (state.phase === "finished") {
    requestAnimationFrame(draw);
    return;
  }
  const elapsed = state.deliveryTime === null ? null : time - state.deliveryTime;
  if (state.phase === "playing" && elapsed !== null && elapsed >= deliveryPhases.reset) {
    state.served++;
    state.order = (firstOrder + state.served) % orders.length;
    state.prompts = choosePrompts(state.order, state.served);
    state.step = 0;
    state.stageTime = time;
    state.deliveryTime = null;
    cueChefs(0);
    ui.served.textContent = String(state.served).padStart(2, "0");
    ui.status.textContent = "次の注文をどうぞ";
    showPrompt();
  }
  const delivery = state.deliveryTime === null ? null : time - state.deliveryTime;
  ctx.drawImage(art.kitchen, 0, 0);
  const showFinished = delivery === null || delivery < deliveryPhases.approach;
  const scene = tableLayers.map(({ depth }, index) => ({ depth, draw: () => drawTable(index, showFinished) }));
  chefs.forEach((chef, index) => {
    const active = delivery === null && (index === 1 ? state.step === 1 : state.step !== 1);
    scene.push({ depth: chefPosition(chef).y, draw: () => drawChef(chef, active) });
  });
  scene.push({ depth: waiterPose(delivery).y, draw: () => drawWaiter(delivery) });
  scene.sort((left, right) => left.depth - right.depth);
  scene.forEach(layer => layer.draw());
  ctx.drawImage(art.counter, 0, counterTop);
  drawCounter(delivery);
  if (state.phase !== "finished" && delivery !== null && delivery >= deliveryPhases.place) {
    ui.served.textContent = String(state.served + 1).padStart(2, "0");
  }
  requestAnimationFrame(draw);
}

const characterFrames = [[4, 4, 199, 252], [264, 4, 200, 252], [524, 4, 204, 252], [4, 264, 184, 252], [264, 264, 194, 252], [524, 264, 196, 252], [4, 524, 178, 252], [264, 524, 178, 252], [524, 524, 180, 252]];

const foodFrames = [[3, 3, 184, 102], [193, 3, 184, 135], [383, 3, 184, 103], [3, 193, 184, 94], [193, 193, 184, 143], [383, 193, 184, 117], [3, 383, 184, 94], [193, 383, 184, 138], [383, 383, 184, 115], [3, 573, 184, 144], [193, 573, 176, 146], [383, 573, 184, 130]];

const reactionFrames = [[4, 4, 209, 252], [264, 4, 216, 252], [524, 4, 165, 252]];

const files = ["kitchen", "characters", "food", "counter", "reactions"];
Promise.all(files.map(name => loadImage(`assets/${name}.webp?v=chibi`))).then(images => {
  art = Object.fromEntries(files.map((name, index) => [name, images[index]]));
  ui.status.textContent = "準備できました。営業をはじめよう";
  ui.start.disabled = false;
  ui.start.textContent = "営業をはじめる";
  ui.start.focus();
  showPrompt();
  requestAnimationFrame(timestamp => {
    cueChefs(state.step);
    draw(timestamp);
  });
}).catch(() => {
  ui.status.textContent = "厨房の画像を読み込めませんでした。ページを開き直してください。";
  ui.start.textContent = "ページを開き直してください";
});
