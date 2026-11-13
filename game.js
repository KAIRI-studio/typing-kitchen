"use strict";

const ui = Object.fromEntries([...document.querySelectorAll("[id]")].map(element => [element.id, element]));
const ctx = ui.kitchen.getContext("2d");
const orders = [
  ["オムライス", ["たまねぎ", "tamanegi"], ["たまご", "tamago"], ["ケチャップ", "kechappu", "ketyappu"]],
  ["ナポリタン", ["ピーマン", "pi-man"], ["いためる", "itameru"], ["ナポリタン", "naporitan"]],
  ["カレーライス", ["じゃがいも", "jagaimo", "zyagaimo"], ["にこむ", "nikomu"], ["カレーライス", "kare-raisu"]],
  ["ハンバーグ", ["ひきにく", "hikiniku"], ["やきあげる", "yakiageru"], ["デミグラス", "demigurasu"]],
];
const stages = ["仕込み", "加熱", "盛り付け"];
const stations = [
  { x: 728, y: 118, width: 132, height: 75, labelX: 524, labelY: 131 },
  { x: 728, y: 223, width: 151, height: 90, labelX: 503, labelY: 238 },
  { x: 728, y: 365, width: 140, height: 85, labelX: 480, labelY: 376 },
];
const waiterHome = { x: 1048, y: 542 };
const pickup = { x: 691, y: 491 };
const counterY = 573;
const servingSize = { width: 76, height: 31 };
const slots = [907, 1039, 1171, 1303];
const state = { order: 0, step: 0, typed: "", served: 0, stageTime: 0, deliveryTime: null };
let art;
let time = 0;
let flash;

function showPrompt() {
  ui.order.textContent = orders[state.order][0];
  ui.stage.textContent = `${state.step + 1} / 3　${stages[state.step]}`;
  ui.prompt.textContent = orders[state.order][state.step + 1][0];
  showRoman();
}

function showRoman() {
  const [, ...options] = orders[state.order][state.step + 1];
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
  if (!art || state.deliveryTime !== null) return;
  if (event.key === "Backspace") {
    state.typed = state.typed.slice(0, -1);
    showRoman();
    return;
  }
  const candidate = state.typed + event.key.toLowerCase();
  const [, ...options] = orders[state.order][state.step + 1];
  if (!options.some(option => option.startsWith(candidate))) {
    ui.key.classList.add("bad");
    clearTimeout(flash);
    flash = setTimeout(() => ui.key.classList.remove("bad"), 200);
    return;
  }
  state.typed = candidate;
  showRoman();
  if (!options.includes(candidate)) return;
  state.typed = "";
  if (state.step < 2) {
    state.step++;
    state.stageTime = time;
    ui.status.textContent = state.step === 1 ? "フライパンで加熱中" : "お皿に盛り付け中";
    showPrompt();
    return;
  }
  state.deliveryTime = time;
  ui.status.textContent = "できあがり。ウェイターが運びます";
  ui.key.value = "";
});
ui.key.addEventListener("input", () => {
  if (state.deliveryTime === null) showRoman();
  else ui.key.value = "";
});
ui.kitchen.addEventListener("click", () => ui.key.focus());

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

function shadow(x, y, width) {
  ctx.fillStyle = "rgba(24,25,26,.33)";
  ctx.beginPath();
  ctx.ellipse(x, y, width, width * .26, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawChef(frame, x, y, height, active) {
  shadow(x, y - 3, 28);
  const rock = active ? Math.sin(time / 125) * 2 : 0;
  drawSprite(art.actors, actorFrames[frame], x + rock, y, 145, height - Math.abs(rock), 1, 1);
}

function drawStations(showFinished) {
  for (const [index, station] of stations.entries()) {
    const active = index === state.step;
    ctx.fillStyle = active ? "rgba(38,32,26,.9)" : "rgba(35,39,41,.75)";
    ctx.fillRect(station.labelX, station.labelY - 16, 88, 23);
    ctx.fillStyle = active ? "#ffd29a" : "#e3dfd6";
    ctx.font = "bold 13px 'Yu Gothic UI', sans-serif";
    ctx.fillText(`0${index + 1}  ${stages[index]}`, station.labelX + 7, station.labelY);
  }

  const station = stations[state.step];
  if (state.deliveryTime !== null) {
    if (showFinished) drawFood(state.order, 2, station.x, station.y, station.width, station.height);
    return;
  }

  const previous = stations[state.step - 1];
  const amount = progress(time - state.stageTime, 280);
  if (previous && amount < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - amount;
    drawFood(state.order, state.step - 1, previous.x, previous.y, previous.width, previous.height);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = amount;
    drawFood(state.order, state.step, station.x, station.y + (1 - amount) * 8, station.width, station.height);
    ctx.restore();
  } else {
    drawFood(state.order, state.step, station.x, station.y, station.width, station.height);
  }

  if (state.step === 1) {
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const rise = (time / 780 + i / 3) % 1;
      ctx.strokeStyle = `rgba(250,239,218,${Math.sin(rise * Math.PI) * .36})`;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      const x = station.x - 17 + i * 14 + Math.sin(rise * Math.PI * 2) * 5;
      const y = station.y - 17 - rise * 32;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x - 6, y - 7, x + 2, y - 16);
      ctx.stroke();
    }
    ctx.restore();
  }
}

const deliveryPhases = { approach: 930, carry: 1970, place: 2270, reset: 2910 };

function waiterPose(elapsed) {
  if (elapsed === null || elapsed < 260) return { ...waiterHome, direction: 1, walk: false, hands: false };
  const destination = slots[state.served % slots.length];
  if (elapsed < deliveryPhases.approach) {
    const amount = progress(elapsed - 260, deliveryPhases.approach - 260);
    return { x: mix(waiterHome.x, pickup.x, amount), y: mix(waiterHome.y, pickup.y, amount), direction: -1, walk: true, hands: true };
  }
  if (elapsed < deliveryPhases.carry) {
    const amount = progress(elapsed - deliveryPhases.approach, deliveryPhases.carry - deliveryPhases.approach);
    return { x: mix(pickup.x, destination - 38, amount), y: mix(pickup.y, waiterHome.y, amount), direction: 1, walk: true, hands: true };
  }
  if (elapsed < deliveryPhases.place) {
    return { x: destination - 38, y: waiterHome.y, direction: 1, walk: false, hands: true };
  }
  const amount = progress(elapsed - deliveryPhases.place, deliveryPhases.reset - deliveryPhases.place);
  return { x: mix(destination - 38, waiterHome.x, amount), y: waiterHome.y, direction: destination - 38 > waiterHome.x ? -1 : 1, walk: true, hands: false };
}

function drawWaiter(elapsed) {
  const pose = waiterPose(elapsed);
  shadow(pose.x, pose.y - 3, 32);
  const walkFrames = [3, 4, 5, 4];
  const frame = pose.walk ? walkFrames[Math.floor(time / 115) % walkFrames.length] : (pose.hands ? 4 : 2);
  drawSprite(art.actors, actorFrames[frame], pose.x, pose.y, 132, 151, pose.direction, 1);

  if (elapsed === null || elapsed < deliveryPhases.approach || elapsed >= deliveryPhases.place) return;
  const amount = progress(elapsed - deliveryPhases.carry, deliveryPhases.place - deliveryPhases.carry);
  const slot = slots[state.served % slots.length];
  const fromPickup = progress(elapsed - deliveryPhases.approach, 170);
  const handX = mix(stations[2].x, pose.x + 36, fromPickup);
  const handY = mix(stations[2].y, pose.y - 84, fromPickup);
  const width = mix(mix(stations[2].width, 83, fromPickup), servingSize.width, amount);
  const height = mix(mix(stations[2].height, 56, fromPickup), servingSize.height, amount);
  drawFood(state.order, 2, mix(handX, slot, amount), mix(handY, counterY, amount), width, height);
}

function drawCounter(elapsed) {
  const inDelivery = elapsed !== null && elapsed >= deliveryPhases.place;
  const total = state.served + Number(inDelivery);
  for (let item = Math.max(0, total - slots.length); item < total; item++) {
    drawFood(item % orders.length, 2, slots[item % slots.length], counterY, servingSize.width, servingSize.height);
  }
}

function draw(timestamp) {
  time = timestamp;
  const elapsed = state.deliveryTime === null ? null : time - state.deliveryTime;
  if (elapsed !== null && elapsed >= deliveryPhases.reset) {
    state.served++;
    state.order = state.served % orders.length;
    state.step = 0;
    state.stageTime = time;
    state.deliveryTime = null;
    ui.served.textContent = String(state.served).padStart(2, "0");
    ui.status.textContent = "次の注文をどうぞ";
    showPrompt();
  }
  const delivery = state.deliveryTime === null ? null : time - state.deliveryTime;
  ctx.drawImage(art.kitchen, 0, 0, ui.kitchen.width, ui.kitchen.height);
  drawStations(delivery === null || delivery < deliveryPhases.approach);
  drawChef(0, 347, 313, 207, state.step === 0 && delivery === null);
  drawChef(1, 1167, 307, 238, state.step === 1 && delivery === null);
  drawWaiter(delivery);
  drawCounter(delivery);
  if (delivery !== null && delivery >= deliveryPhases.place) {
    ui.served.textContent = String(state.served + 1).padStart(2, "0");
  }
  requestAnimationFrame(draw);
}

const actorFrames = [[3, 3, 137, 254], [263, 3, 110, 254], [523, 3, 81, 254], [3, 263, 162, 254], [263, 263, 132, 254], [523, 263, 168, 254]];

const foodFrames = [[3, 3, 184, 102], [193, 3, 184, 135], [383, 3, 184, 103], [3, 193, 184, 94], [193, 193, 184, 143], [383, 193, 184, 117], [3, 383, 184, 94], [193, 383, 184, 138], [383, 383, 184, 115], [3, 573, 184, 92], [193, 573, 184, 139], [383, 573, 184, 126]];

const files = ["kitchen", "actors", "food"];
Promise.all(files.map(name => loadImage(`assets/${name}.webp`))).then(images => {
  art = Object.fromEntries(files.map((name, index) => [name, images[index]]));
  ui.status.textContent = "ローマ字を入力して調理開始";
  showPrompt();
  requestAnimationFrame(draw);
}).catch(() => {
  ui.status.textContent = "厨房の画像を読み込めませんでした。ページを開き直してください。";
});
