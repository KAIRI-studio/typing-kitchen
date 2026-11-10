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
function steel(x,y,w,d) {
  box(x+5,y+d,w-10,30,"#354951");
  box(x+15,y+d+25,10,12,"#273840");
  box(x+w-25,y+d+25,10,12,"#273840");
  shape("#a0b0b4",x,y+d,x+18,y,x+w-18,y,x+w,y+d);
  box(x,y+d,w,8,"#d1dbd9");
  box(x+17,y+d+11,w-34,2,"#6f8389");
}
function background() {
  box(0,0,1200,480,"#50646b");
  box(0,0,1200,64,"#263940");
  for(let x=0;x<1200;x+=60) box(x,0,1,64,"#42555b");
  for(let y=0;y<64;y+=20) box(0,y,1200,1,"#42555b");
  for(let y=68;y<410;y+=29) box(0,y,1200,1,"#41565d");
  for(let x=-900;x<2200;x+=110) shape("#41565d",600+(x-600)*.47,66,602+(x-600)*.47,66,x+2,410,x,410);
  box(0,63,1200,5,"#1a2b31");
  for(const x of [80,260,805,985]) {
    steel(x,37,135,22);
    box(x+33,17,76,19,"#73888d");
    box(x+38,21,66,3,"#adbdc0");
    box(x+48,44,54,9,"#4b6168");
    oval(x+60,48,7,3,"#a0b5b6");
    oval(x+89,48,7,3,"#a0b5b6");
  }
  label("KITCHEN   /   01",530,33,"#c4d3d3",16);
  for(const x of [60,1035]) {
    steel(x,167,105,34);
    box(x+23,175,60,13,"#42565c");
    box(x+23,175,60,2,"#dce5df");
  }
  box(48,342,1104,61,"#40585f");
  for(let x=53;x<1150;x+=22) {
    box(x,343,11,2,"#a39369");
    box(x,402,11,2,"#a39369");
  }
  label("厨房内  /  提供通路",54,358,"#c4d1ca",11);
}
function plate(x,y,order,step=3) {
  const colors = ["#e8b252","#bd664a","#bc8b55","#995744"];
  oval(x,y+3,25,10,"#42545a");
  oval(x,y,24,10,"#e2ebe1");
  oval(x,y,17,7,colors[order]);
  oval(x-7,y+1,step===0?5:9,4,step===0?"#85a275":"#f3d084");
  if(step>=2) {
    oval(x+7,y-2,7,3,"#b44f3a");
    oval(x+12,y-4,4,2,"#5e895e");
  }
}
function animal(x,y,kind,phase,direction) {
  const fur = ["#85949a","#c68961","#aaa79a"][kind];
  const suit = ["#dfe5dc","#d4ddd4","#22343e"][kind];
  const bob = Math.abs(Math.sin(phase))*2;
  const stride = Math.sin(phase)*6;
  oval(x,y,20,5,"#30474f");
  ctx.save();
  ctx.translate(x,y);
  ctx.scale(direction,1);
  oval(-8+stride, -3, 7,4,"#223037");
  oval(8-stride, -3, 7,4,"#223037");
  ctx.translate(0,-bob);
  shape(suit,-14,-29,13,-29,17,-7,-15,-7);
  shape("#eff0df",-9,-28,9,-28,0,-14);
  if(kind===2) shape("#ba765e",-8,-23,7,-18,7,-24,-8,-18);
  if(kind===1) {
    shape(fur,-21,-44,-19,-66,-4,-51);
    shape(fur,9,-51,21,-65,23,-41);
  } else {
    oval(-16,-50,8,8,fur);
    oval(15,-50,8,8,fur);
  }
  oval(0,-39,22,16,fur);
  oval(7,-32,12,7,"#e2d2b7");
  box(-7,-42,6,2,"#26373b");
  box(9,-42,6,2,"#26373b");
  oval(9,-35,3,2,"#26373b");
  if(kind<2) {
    box(-13,-57,25,9,"#dce5dc");
    oval(-5,-58,14,7,"#ecf0e6");
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
    steel(365,y,470,30);
    box(398,y+9,95,15,i===1?"#364b52":"#74898d");
    if(i===1) [423,466].forEach(x=>oval(x,y+16,12,5,"#1f3037"));
    box(700,y+8,90,17,"#7e9295");
    box(705,y+11,80,2,"#b1c2bf");
    box(376,y+42,7,13,active?"#f0bf69":"#6a8388");
    label(`0${i+1}  ${stages[i]}`,395,y+53,active?"#f7ce7b":"#cedbd9",14);
    if(active && !state.delivery?.carrying) plate(pickupX,y+14,state.order,i);
    else oval(pickupX,y+15,24,9,"#899ca0");
  });
  for(let i=0;i<2;i++) {
    const p=time/850+i*2;
    const x=(i===0?235:965)+Math.sin(p)*51;
    const y=141+Math.cos(p)*9;
    animal(x,y,i,time/100,Math.cos(p)>0?1:-1);
    label(i===0?"ベテラン":"弟子",x-22,y+16,"#e1e9e1",11);
  }
  animal(motion.x,lane.y,2,motion.phase,motion.direction);
  if(state.delivery?.carrying) plate(motion.x+motion.direction*23,lane.y-24,state.order);
  box(0,counterY,1200,34,"#b4c3c4");
  box(0,counterY,1200,3,"#e3eae3");
  box(0,444,1200,36,"#2d4149");
  box(0,444,1200,5,"#71868a");
  label("提供カウンター",53,468,"#e1e9df",14);
  slots.forEach((x,i)=>{
    const item=state.served-1-((state.served-1-i+slots.length)%slots.length);
    if(item>=0) plate(x,426,item%orders.length);
    else oval(x,427,24,9,"#a1b2b4");
  });
  label("SERVICE",1090,468,"#aebec0",12);
  requestAnimationFrame(draw);
}
showPrompt();
requestAnimationFrame(draw);

