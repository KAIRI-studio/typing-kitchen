"use strict";

const ui = Object.fromEntries([...document.querySelectorAll("[id]")].map(el => [el.id, el]));
const ctx = ui.kitchen.getContext("2d");
const orders = [
  ["オムライス", ["たまねぎ","tamanegi"], ["たまご","tamago"], ["ケチャップ","kechappu","ketyappu"]],
  ["ナポリタン", ["ピーマン","pi-man"], ["いためる","itameru"], ["ナポリタン","naporitan"]],
  ["カレーライス", ["じゃがいも","jagaimo","zyagaimo"], ["にこむ","nikomu"], ["カレーライス","kare-raisu"]],
  ["ハンバーグ", ["ひきにく","hikiniku"], ["やきあげる","yakiageru"], ["デミグラス","demigurasu"]]
];
const stages = ["仕込み","加熱","盛り付け"];
const tables = [{y:89},{y:169},{y:249}];
const counterY = 410;
const lane = {left:95, right:1105, y:394};
const pickupX = 600;
const slots = [215,345,475,605,735,865,995];
const state = {order:0, step:0, typed:"", misses:0, served:0, delivery:null};
const motion = {x:170, direction:1, phase:0};
let lastTime = 0;
let flash;

function showPrompt() {
  const [dish] = orders[state.order];
  ui.stage.textContent = `${state.step + 1} / 3　${stages[state.step]}`;
  ui.status.textContent = `注文　${dish}`;
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
  if (event.key === "Backspace") {
    event.preventDefault();
    state.typed = state.typed.slice(0,-1);
    showRoman();
    return;
  }
  if (!/^[a-z-]$/i.test(event.key)) return;
  event.preventDefault();
  if (state.delivery) return;
  const candidate = state.typed + event.key.toLowerCase();
  const [, ...options] = orders[state.order][state.step + 1];
  if (!options.some(option => option.startsWith(candidate))) {
    state.misses++;
    ui.key.classList.add("bad");
    clearTimeout(flash);
    flash = setTimeout(() => ui.key.classList.remove("bad"), 200);
    return;
  }
  state.typed = candidate;
  if (!options.includes(candidate)) return showRoman();
  state.typed = "";
  if (state.step < 2) {
    state.step++;
    showPrompt();
    return;
  }
  state.delivery = {carrying:false, slot:state.served % slots.length};
  ui.typed.textContent = candidate;
  ui.next.textContent = ui.rest.textContent = ui.key.value = "";
  ui.status.textContent = "ウェイターが提供カウンターへ運んでいます";
});
ui.key.addEventListener("input", showRoman);
ui.kitchen.addEventListener("click", () => ui.key.focus());

function box(x,y,w,h,color) {
  ctx.fillStyle = color;
  ctx.fillRect(x,y,w,h);
}
function shape(color,...points) {
  ctx.beginPath();
  ctx.moveTo(points[0],points[1]);
  for(let i=2;i<points.length;i+=2) ctx.lineTo(points[i],points[i+1]);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}
function oval(x,y,w,h,color) {
  ctx.beginPath();
  ctx.ellipse(x,y,w,h,0,0,Math.PI*2);
  ctx.fillStyle = color;
  ctx.fill();
}
function label(value,x,y,color="#c6d7d8",size=13) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px "Yu Gothic UI", sans-serif`;
  ctx.fillText(value,x,y);
}
const ink = "#273538";
const steelFace = "#899a9e";
const steelTop = "#c5cdca";
const cream = "#f4ebd6";

function line(color, width, ...points) {
  ctx.beginPath();
  ctx.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();
}

function steel(x, y, w, depth) {
  for (const leg of [x + 19, x + w - 28]) {
    box(leg, y + depth + 13, 9, 23, ink);
    box(leg + 1, y + depth + 13, 3, 20, steelFace);
  }
  shape(ink, x - 2, y + depth, x + 19, y - 2, x + w - 19, y - 2, x + w + 2, y + depth);
  shape(steelTop, x + 3, y + depth, x + 21, y, x + w - 21, y, x + w - 3, y + depth);
  box(x - 2, y + depth, w + 4, 16, ink);
  box(x, y + depth + 1, w, 10, steelFace);
  box(x, y + depth + 1, w, 2, "#e2e6dc");
}

function background() {
  box(0, 0, 1200, 480, "#8b9691");
  box(0, 0, 1200, 79, "#b4bcb5");
  box(0, 4, 1200, 24, "#344144");
  box(0, 4, 1200, 2, "#596866");
  box(0, 27, 1200, 3, "#273538");
  box(0, 76, 1200, 7, "#61716f");
  for (let x = 18; x < 1200; x += 58) {
    box(x, 30, 1, 45, "#a3afa8");
  }
  box(0, 53, 1200, 1, "#a3afa8");
  for (const y of [116, 161, 217, 280, 350, 409]) {
    line("#7d8a85", 1, 0, y, 1200, y);
  }
  for (let x = -560; x < 1800; x += 126) {
    const farX = 600 + (x - 600) * 0.58;
    line("#7d8a85", 1, farX, 83, x, 410);
  }

  box(65, 42, 150, 66, "#75827e");
  box(58, 12, 148, 88, ink);
  box(61, 15, 142, 80, "#9fadaa");
  box(65, 19, 134, 16, "#657674");
  box(65, 38, 65, 52, "#b7c1ba");
  box(134, 38, 65, 52, "#adb9b3");
  line("#e0e5dc", 1, 66, 39, 129, 39);
  line(ink, 3, 120, 53, 120, 68);
  line(ink, 3, 143, 53, 143, 68);
  box(75, 24, 20, 6, "#263a38");
  box(78, 26, 10, 2, "#a9ba99");

  steel(966, 70, 176, 18);
  shape("#687b78", 981, 81, 991, 73, 1117, 73, 1127, 81);
  line("#3f5350", 3, 1052, 79, 1052, 55, 1041, 55);
  box(963, 33, 184, 4, "#586967");
  for (const x of [983, 1003, 1023]) {
    oval(x, 30, 8, 3, "#7c9088");
    oval(x, 28, 8, 3, "#dae1d5");
  }

  steel(77, 222, 126, 25);
  shape("#ac9169", 104, 243, 116, 227, 159, 227, 166, 243);
  shape("#ccb58d", 105, 240, 116, 227, 159, 227, 165, 240);
  oval(176, 234, 11, 5, "#657771");
  oval(176, 232, 11, 5, "#e1e6d8");
  oval(176, 232, 7, 2, "#aabbaf");

  steel(1006, 238, 116, 22);
  box(1021, 214, 88, 32, ink);
  box(1023, 216, 84, 27, "#879995");
  box(1028, 221, 55, 16, "#4f6260");
  line("#a9b9ae", 1, 1031, 224, 1080, 224);
  oval(1094, 228, 3, 3, "#d0b57f");

  box(0, 344, 1200, 66, "#697b75");
  box(0, 344, 1200, 2, "#9aa59a");
  box(0, 405, 1200, 2, "#9aa59a");
  for (const x of [62, 1138]) {
    line("#c3b386", 2, x - 8, 385, x, 378, x + 8, 385);
    line("#c3b386", 2, x - 8, 377, x, 370, x + 8, 377);
  }
}

function plate(x, y, order, step = 3) {
  oval(x, y + 3, 26, 10, "#738581");
  oval(x, y, 25, 10, ink);
  oval(x, y - 1, 24, 9, "#e5e8db");
  oval(x, y - 1, 17, 6, "#c1ccbe");

  if (step === 0) {
    for (const offset of [-8, 0, 8]) oval(x + offset, y - 1, 4, 2.5, "#9b793f");
    oval(x + 4, y + 2, 3, 1.5, "#54724e");
    return;
  }

  const colors = ["#e1aa4c", "#be6646", "#ad7947", "#87503c"];
  oval(x, y - 1, 13, 5.5, colors[order]);
  if (order === 0) line("#a94834", 1.5, x - 7, y - 2, x - 2, y - 4, x + 2, y, x + 7, y - 2);
  if (order === 1) line("#e6a267", 1.5, x - 8, y, x - 3, y - 4, x + 3, y, x + 8, y - 3);
  if (order === 2) oval(x + 5, y - 1, 7, 4, cream);
  if (order === 3) line("#bf8460", 1.5, x - 6, y - 2, x + 5, y - 4);
  if (step >= 2) oval(x + 10, y + 2, 4, 1.8, "#557958");
}

function animal(x, y, kind, phase, direction) {
  const fur = ["#858c8a", "#b87850", "#a69e8d"][kind];
  const darkFur = ["#626d6d", "#804b39", "#72675f"][kind];
  const jacket = kind === 2 ? "#354e4a" : cream;
  const stride = Math.sin(phase) * 5;
  oval(x, y + 2, 21, 4, "#465952");

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(direction, 1);
  line(ink, 6, -8, -13, -9 + stride, -4);
  line(ink, 6, 8, -13, 9 - stride, -4);
  oval(-9 + stride, -2, 7, 3, ink);
  oval(9 - stride, -2, 7, 3, ink);
  ctx.translate(0, -Math.abs(Math.sin(phase)) * 2);

  shape(ink, -21, -29, -11, -38, 11, -38, 21, -27, 19, -9, -19, -9);
  shape(jacket, -18, -27, -10, -36, 10, -36, 18, -26, 16, -12, -16, -12);
  line(kind === 2 ? "#65827a" : "#c7bda5", 1.5, -12, -24, -14, -15);
  line(kind === 2 ? "#65827a" : "#c7bda5", 1.5, 12, -24, 14, -15);
  if (kind === 2) {
    shape(cream, -9, -33, 10, -33, 1, -17);
    shape("#b2664a", -7, -30, 7, -24, 7, -30, -7, -24);
    box(8, -19, 5, 2, "#d3ba84");
  } else {
    line("#a89f8b", 1, 2, -29, 2, -14);
    oval(7, -20, 1.5, 1.5, "#847d6d");
    oval(7, -15, 1.5, 1.5, "#847d6d");
  }

  if (kind === 1) {
    shape(ink, -22, -47, -21, -72, -5, -60, 8, -60, 23, -72, 23, -47);
    shape(fur, -20, -47, -19, -68, -6, -57, 9, -57, 21, -68, 21, -47);
    shape(darkFur, -18, -57, -18, -65, -10, -57, 13, -57, 19, -65, 19, -56);
  } else {
    for (const ear of [-16, 16]) {
      oval(ear, -57, 9, 9, ink);
      oval(ear, -57, 7, 7, fur);
      oval(ear, -56, 4, 4, darkFur);
    }
  }
  oval(0, -47, 24, 17, ink);
  oval(0, -47, 22, 15, fur);
  shape(darkFur, -20, -46, -13, -40, -10, -35, -17, -38);
  oval(7, -40, 13, 7, kind === 1 ? "#f1d5ae" : "#d7c7a9");
  line(ink, 1.8, -10, -49, -4, -48);
  line(ink, 1.8, 9, -48, 15, -49);
  oval(11, -43, 3, 1.8, ink);
  line(ink, 1, 10, -38, 15, -38);
  if (kind < 2) {
    box(-13, -65, 27, 10, ink);
    oval(-7, -65, 11, 8, ink);
    oval(5, -67, 11, 8, ink);
    oval(-7, -65, 9, 6, cream);
    oval(5, -67, 9, 6, cream);
    box(-11, -66, 23, 9, cream);
    box(-11, -59, 23, 2, "#c4bbab");
  }

  ctx.restore();
}

function advance(dt) {
  const delivery = state.delivery;
  const target = delivery ? (delivery.carrying ? slots[delivery.slot] : pickupX) :
    (motion.direction === 1 ? lane.right : lane.left);
  const distance = target - motion.x;
  const travel = Math.min(Math.abs(distance), dt * (delivery ? 740 : 185));
  if (distance) motion.direction = Math.sign(distance);
  motion.x += travel * motion.direction;
  motion.phase += travel / 10;
  if (Math.abs(distance) > travel) return;
  if (!delivery) {
    motion.direction *= -1;
    return;
  }
  if (!delivery.carrying) {
    delivery.carrying = true;
    return;
  }
  state.served++;
  state.order = state.served % orders.length;
  state.step = 0;
  state.delivery = null;
  ui.served.textContent = String(state.served).padStart(2,"0");
  showPrompt();
}

function draw(time) {
  advance(Math.min((time-lastTime)/1000,.05));
  lastTime = time;
  background();
  tables.forEach(({y},i) => {
    const active = state.step === i;
    box(390, y + 54, 420, 5, "#75817b");
    steel(365, y, 470, 29);
    shape("#a4b1ab", 392, y + 20, 405, y + 6, 483, y + 6, 492, y + 20);
    if (i === 1) {
      for (const x of [420, 464]) {
        oval(x, y + 14, 14, 5.5, "#4d5e5f");
        oval(x, y + 14, 9, 3.5, ink);
      }
    }
    if (i === 0) {
      shape("#cbb48a", 706, y + 21, 719, y + 6, 761, y + 6, 773, y + 21);
      line("#e1ccaa", 1, 714, y + 19, 764, y + 19);
    }
    if (i === 1) {
      line(ink, 4, 753, y + 12, 774, y + 7);
      oval(735, y + 16, 23, 7, "#506361");
      oval(735, y + 14, 19, 5, ink);
    }
    if (i === 2) {
      for (const x of [722, 753]) {
        oval(x, y + 17, 17, 6, "#879b94");
        oval(x, y + 15, 17, 6, "#e1e6da");
        oval(x, y + 15, 12, 4, "#b7c8bf");
      }
    }
    box(385, y + 33, 88, 19, active ? "#c59b59" : "#445653");
    label(`0${i+1}  ${stages[i]}`, 393, y + 46, active ? ink : "#e0e6da", 12);
    if(active && !state.delivery?.carrying) plate(pickupX,y+14,state.order,i);
    else oval(pickupX,y+15,24,9,"#899ca0");
  });
  for(let i=0;i<2;i++) {
    const p=time/850+i*2;
    const x=(i===0?235:965)+Math.sin(p)*51;
    const y=141+Math.cos(p)*9;
    animal(x,y,i,time/100,Math.cos(p)>0?1:-1);
  }
  animal(motion.x,lane.y,2,motion.phase,motion.direction);
  if(state.delivery?.carrying) plate(motion.x+motion.direction*23,lane.y-24,state.order);
  box(0, counterY, 1200, 34, "#b9c4be");
  box(0, counterY, 1200, 2, "#e8eadf");
  box(0, 441, 1200, 5, "#829390");
  box(0, 446, 1200, 34, "#334744");
  box(0, 446, 1200, 2, ink);
  label("提供カウンター", 53, 468, "#e3e7d9", 13);
  slots.forEach((x,i)=>{
    const item=state.served-1-((state.served-1-i+slots.length)%slots.length);
    if(item>=0) plate(x,426,item%orders.length);
    else oval(x, 427, 23, 7, "#aab8b2");
  });
  requestAnimationFrame(draw);
}
showPrompt();
requestAnimationFrame(draw);
