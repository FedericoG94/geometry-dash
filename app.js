import { LEVELS, MODE, OBJECTS, createEmptyEditorLevel } from "./levels.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
const $ = id => document.getElementById(id);
const ui = {
  menu:$("menu"), settings:$("settings"), pause:$("pausePanel"), result:$("resultPanel"), editor:$("editorPanel"),
  pauseBtn:$("pauseBtn"), practiceBtn:$("practiceModeBtn"), checkpointBtn:$("checkpointBtn"),
  touchJump:$("touchJump"), touchPause:$("touchPause"), progress:$("progress"), pct:$("pct"), title:$("title"),
  levelList:$("levelList"), menuBest:$("menuBest"), attempts:$("menuAttempts"), completed:$("menuCompleted"),
  resultTitle:$("resultTitle"), resultInfo:$("resultInfo"), pauseInfo:$("pauseInfo"), editorTools:$("editorTools")
};
const CFG={WORLD_H:320,PLAYER_SIZE:34,gravity:1800,cubeJump:670,shipGravity:1150,shipThrust:1650,ufoGravity:1450,ufoJump:620,waveSpeed:430,speedFallback:290};
const skins={cyan:["#42e8ff","#fff"],red:["#ff5577","#ffd6df"],green:["#7dff5b","#e7ffd9"],gold:["#ffd84d","#fff4b8"]};
function load(k,f){try{const v=localStorage.getItem(k);return v==null?f:JSON.parse(v)}catch{return f}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
const prefs=load("gd_prefs",{skin:"cyan",trail:"spark"});
const progress=load("gd_progress",{completed:{},best:{},attempts:0,skins:["cyan","red","green","gold"]});
let W=1,H=1,DPR=1,scale=1,viewBottom=1,cameraX=0,rafId=0,lastTime=0,resizeTimer=0;
const player={x:100,y:0,vy:0,size:CFG.PLAYER_SIZE,gravity:1,onGround:true,rotation:0};
const state={levelIndex:0,level:LEVELS[0],mode:MODE.CUBE,speed:CFG.speedFallback,mini:false,dual:false,dualY:0,running:false,paused:false,practice:false,checkpoint:null,manualCheckpoints:[],triggered:new Set(),holding:false,editor:false,editorData:createEmptyEditorLevel(),editorType:OBJECTS.BLOCK,selection:null,dragging:false,particles:[],audio:null,audioStart:0,nextBeat:0};

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const esc=v=>String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
const hide=e=>e?.classList.add("hidden"), show=e=>e?.classList.remove("hidden");

function resize(){
  const vv=window.visualViewport;
  W=Math.max(1,Math.round(vv?.width>200?vv.width:innerWidth));
  H=Math.max(1,Math.round(vv?.height>160?vv.height:innerHeight));
  DPR=Math.min(devicePixelRatio||1,2);
  viewBottom=H;
  scale=clamp(viewBottom/CFG.WORLD_H,.72,2.2);
  canvas.width=Math.floor(W*DPR);canvas.height=Math.floor(H*DPR);canvas.style.width=W+"px";canvas.style.height=H+"px";
  ctx.setTransform(DPR,0,0,DPR,0,0);draw();
}
function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,80)}
addEventListener("resize",scheduleResize,{passive:true});
addEventListener("orientationchange",()=>{scheduleResize();setTimeout(resize,350)},{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener("resize",scheduleResize,{passive:true});

function pct(){return clamp((player.x-100)/Math.max(1,(state.level?.length||1)-100),0,1)}
function resetRun(startX=100,preserve=false){
  const cp=preserve?state.checkpoint:null,manual=preserve?[...state.manualCheckpoints]:[];
  player.x=Math.max(100,startX);player.y=0;player.vy=0;player.gravity=1;player.onGround=true;player.rotation=0;player.size=CFG.PLAYER_SIZE;
  state.mode=MODE.CUBE;state.speed=Number(state.level?.speed)||CFG.speedFallback;state.mini=false;state.dual=false;state.dualY=0;
  state.triggered=new Set();state.holding=false;state.checkpoint=cp;state.manualCheckpoints=manual;state.particles=[];cameraX=Math.max(0,player.x-W/3);
}
function updateMenu(){
  ui.attempts.textContent=String(progress.attempts||0);
  ui.completed.textContent=`${Object.values(progress.completed||{}).filter(Boolean).length}/${LEVELS.length}`;
  ui.practiceBtn.textContent=`Practice: ${state.practice?"ON":"OFF"}`;
  ui.menuBest.textContent=`${progress.best[state.level?.id]||0}%`;
  ui.levelList.innerHTML="";
  LEVELS.forEach((l,i)=>{
    const d=document.createElement("div");d.className="levelCard";
    d.innerHTML=`<strong>${esc(l.name)}</strong><div class="small">${esc(l.difficulty)} · ${Math.round(l.length/100)}m · Best ${progress.best[l.id]||0}%</div><button type="button">GIOCA</button>`;
    d.querySelector("button").addEventListener("click",()=>startLevel(i,state.practice));ui.levelList.appendChild(d);
  });
  document.querySelectorAll(".skin").forEach(b=>b.classList.toggle("active",b.dataset.skin===prefs.skin));
  document.querySelectorAll(".trail").forEach(b=>b.classList.toggle("active",b.dataset.trail===prefs.trail));
}
function setControls(on){
  ui.pauseBtn.style.display=on?"block":"none";ui.checkpointBtn.style.display=on&&state.practice?"block":"none";
  ui.touchJump.style.display=on?"block":"none";ui.touchPause.style.display=on?"block":"none";
}
function startLevel(i=state.levelIndex,practice=state.practice){
  if(!LEVELS[i])return;cancelAnimationFrame(rafId);state.levelIndex=i;state.level=LEVELS[i];state.practice=!!practice;state.running=false;state.paused=false;
  resetRun();progress.attempts=(progress.attempts||0)+1;save("gd_progress",progress);
  hide(ui.menu);hide(ui.settings);hide(ui.pause);hide(ui.result);hide(ui.editor);setControls(true);ui.title.textContent=`${state.level.name} · ${state.level.difficulty}`;
  state.running=true;startAudio();lastTime=performance.now();rafId=requestAnimationFrame(loop);
}
function sanitize(l){
  const s=l||createEmptyEditorLevel();
  return {id:s.id||"custom",name:s.name||"Il mio livello",difficulty:s.difficulty||"Custom",length:Math.max(2000,Number(s.length)||12000),
    speed:Math.max(120,Number(s.speed)||CFG.speedFallback),music:s.music||"beat",
    objects:Array.isArray(s.objects)?s.objects.filter(Boolean).map(o=>({...o,x:Math.max(0,Number(o.x)||0),y:Math.max(0,Number(o.y)||0),w:Math.max(12,Number(o.w)||36),h:Math.max(8,Number(o.h)||36)})):[]};
}
function startCustom(){
  const l=sanitize(state.editorData);if(!l.objects.length){alert("Inserisci almeno un oggetto.");return}
  cancelAnimationFrame(rafId);state.level=l;state.levelIndex=-1;state.practice=false;state.editor=false;hide(ui.editor);resetRun();state.speed=l.speed;
  state.running=true;setControls(true);startAudio();lastTime=performance.now();rafId=requestAnimationFrame(loop);
}
function backMenu(){cancelAnimationFrame(rafId);stopAudio();state.running=false;state.paused=false;state.editor=false;setControls(false);hide(ui.settings);hide(ui.pause);hide(ui.result);hide(ui.editor);show(ui.menu);updateMenu();draw()}
function pauseGame(){if(!state.running)return;state.paused=true;stopAudio();ui.pauseInfo.textContent=`${state.level.name} · ${Math.floor(pct()*100)}%`;show(ui.pause);draw()}
function resumeGame(){if(!state.running)return;state.paused=false;hide(ui.pause);startAudio();lastTime=performance.now();rafId=requestAnimationFrame(loop)}
function restart(){state.levelIndex>=0?startLevel(state.levelIndex,state.practice):startCustom()}
function restartCheckpoint(){if(state.practice&&state.checkpoint!==null){startCheckpoint(state.checkpoint)}else restart()}
function startCheckpoint(x){hide(ui.result);hide(ui.pause);resetRun(Math.max(100,x),true);state.running=true;setControls(true);startAudio();lastTime=performance.now();rafId=requestAnimationFrame(loop)}

function inputDown(){
  if(!state.running||state.paused||state.editor)return;
  state.holding=true;
  if(state.mode===MODE.CUBE){if(player.onGround){player.vy=CFG.cubeJump*player.gravity;player.onGround=false}}
  else if(state.mode===MODE.BALL){if(player.onGround){player.gravity*=-1;player.vy=0;player.onGround=false}}
  else if(state.mode===MODE.UFO){player.vy=CFG.ufoJump*player.gravity;player.onGround=false}
}
function inputUp(){state.holding=false}
function playerBox(y=player.y){const i=Math.max(3,player.size*.13);return{x:player.x+i,y:y+i,w:player.size-i*2,h:player.size-i*2}}
function solidObjects(){return (state.level.objects||[]).filter(o=>o.type===OBJECTS.BLOCK||o.type===OBJECTS.PLATFORM)}
function hazardObjects(){return (state.level.objects||[]).filter(o=>o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE||o.type===OBJECTS.SAW)}

function movePhysics(dt){
  const old={x:player.x,y:player.y,vy:player.vy};player.x+=state.speed*dt;
  if(state.mode===MODE.SHIP){player.vy+=(state.holding?CFG.shipThrust:-CFG.shipGravity)*player.gravity*dt;player.vy=clamp(player.vy,-760,760);player.y+=player.vy*dt}
  else if(state.mode===MODE.UFO){player.vy-=CFG.ufoGravity*player.gravity*dt;player.vy=clamp(player.vy,-850,850);player.y+=player.vy*dt}
  else if(state.mode===MODE.WAVE){const v=CFG.waveSpeed*(state.mini?2:1);player.y+=(state.holding?v:-v)*player.gravity*dt;player.onGround=false}
  else{player.vy-=CFG.gravity*player.gravity*dt;player.y+=player.vy*dt}
  return old;
}
function surfaceCollision(old){
  if(state.mode===MODE.SHIP||state.mode===MODE.WAVE)return false;
  let landed=false;
  for(const o of solidObjects()){
    const newLeft=player.x+4,newRight=player.x+player.size-4;
    if(newRight<=o.x||newLeft>=o.x+o.w)continue;
    if(player.gravity>0){if(old.y>=o.y+o.h&&player.y<=o.y+o.h&&player.vy<=0){player.y=o.y+o.h;player.vy=0;player.onGround=true;landed=true}}
    else{const oldTop=old.y+player.size,newTop=player.y+player.size;if(oldTop<=o.y&&newTop>=o.y&&player.vy>=0){player.y=o.y-player.size;player.vy=0;player.onGround=true;landed=true}}
  }
  if(!landed)player.onGround=false;return landed;
}
function boundaryCollision(){
  if(state.mode===MODE.WAVE||state.mode===MODE.SHIP||state.mode===MODE.UFO){if(player.y<=0||player.y+player.size>=CFG.WORLD_H){crash();return true}return false}
  if(player.gravity>0&&player.y<=0){player.y=0;player.vy=0;player.onGround=true}
  else if(player.gravity<0&&player.y+player.size>=CFG.WORLD_H){player.y=CFG.WORLD_H-player.size;player.vy=0;player.onGround=true}
  return false;
}
function solidSideCollision(){
  const box=playerBox();
  for(const o of solidObjects()){
    if(!overlap(box,{x:o.x,y:o.y,w:o.w,h:o.h}))continue;
    const supportedDown=player.gravity>0&&Math.abs(box.y-(o.y+o.h))<7;
    const supportedUp=player.gravity<0&&Math.abs(box.y+box.h-o.y)<7;
    if(!(supportedDown||supportedUp)){crash();return true}
  }
  return false;
}
function triggerObjects(){
  for(const o of state.level.objects||[]){
    const key=`${o.type}:${o.x}:${o.y}`;const once=[OBJECTS.MODE_PORTAL,OBJECTS.GRAVITY_PORTAL,OBJECTS.SPEED_PORTAL,OBJECTS.MINI_PORTAL,OBJECTS.DUAL_PORTAL].includes(o.type);
    const box=playerBox();
    if(o.type===OBJECTS.MODE_PORTAL||o.type===OBJECTS.GRAVITY_PORTAL||o.type===OBJECTS.SPEED_PORTAL||o.type===OBJECTS.MINI_PORTAL||o.type===OBJECTS.DUAL_PORTAL){
      if(once&&state.triggered.has(key)||!overlap(box,{x:o.x,y:o.y,w:o.w,h:o.h}))continue;
      if(o.type===OBJECTS.MODE_PORTAL){state.mode=o.mode||MODE.CUBE;player.vy=0;player.onGround=false}
      else if(o.type===OBJECTS.GRAVITY_PORTAL){player.gravity*=-1;player.vy=0;player.onGround=false}
      else if(o.type===OBJECTS.SPEED_PORTAL){state.speed=clamp(Number(o.speed)||state.speed,120,900)}
      else if(o.type===OBJECTS.MINI_PORTAL){state.mini=!state.mini;player.size=state.mini?24:CFG.PLAYER_SIZE;player.y=clamp(player.y,0,CFG.WORLD_H-player.size)}
      else{state.dual=!state.dual;state.dualY=CFG.WORLD_H-player.y-player.size}
      state.triggered.add(key);continue;
    }
    if(o.type===OBJECTS.PAD&&state.mode!==MODE.WAVE&&overlap(box,{x:o.x,y:o.y,w:o.w,h:o.h})){
      if(player.gravity>0&&player.vy<=0){player.y=o.y+o.h;player.vy=760;player.onGround=false}
      else if(player.gravity<0&&player.vy>=0){player.y=o.y-player.size;player.vy=-760;player.onGround=false}
    }
    if(o.type===OBJECTS.RING&&state.mode!==MODE.WAVE&&state.holding&&overlap(box,{x:o.x,y:o.y,w:o.w,h:o.h}))player.vy=700*player.gravity;
    if(o.type===OBJECTS.GRAVITY_RING&&state.mode!==MODE.WAVE&&state.holding&&overlap(box,{x:o.x,y:o.y,w:o.w,h:o.h})){player.gravity*=-1;player.vy=0;player.onGround=false}
  }
}
function hazardHit(box,o){
  if(o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE){const n=o.type===OBJECTS.DOUBLE?2:1;for(let i=0;i<n;i++){const r={x:o.x+i*40+5,y:o.y,w:Math.max(18,Math.min(32,o.w-8)),h:Math.max(30,o.h)};if(overlap(box,r))return true}}
  else if(o.type===OBJECTS.SAW){const cx=o.x+o.w/2,cy=o.y+o.h/2,dx=box.x+box.w/2-cx,dy=box.y+box.h/2-cy,r=o.w/2+box.w*.42;if(dx*dx+dy*dy<r*r)return true}
  return false;
}
function hazards(){const boxes=[playerBox()];if(state.dual)boxes.push(playerBox(state.dualY));for(const b of boxes)for(const o of hazardObjects())if(hazardHit(b,o)){crash();return true}return false}

function crash(){
  if(!state.running)return;state.running=false;cancelAnimationFrame(rafId);stopAudio();const p=Math.floor(pct()*100);
  if(state.level?.id){progress.best[state.level.id]=Math.max(progress.best[state.level.id]||0,p);save("gd_progress",progress)}
  if(state.practice)state.checkpoint=state.manualCheckpoints.at(-1)??Math.max(100,Math.floor(player.x/1000)*1000);
  ui.resultTitle.textContent="CRASH!";ui.resultInfo.textContent=state.practice&&state.checkpoint!==null?`Progressi: ${p}% · Checkpoint: ${Math.floor((state.checkpoint/state.level.length)*100)}%`:`Progressi: ${p}%`;show(ui.result);draw();
}
function win(){if(!state.running)return;state.running=false;cancelAnimationFrame(rafId);stopAudio();if(state.level?.id){progress.completed[state.level.id]=true;progress.best[state.level.id]=100;save("gd_progress",progress)}ui.resultTitle.textContent="LIVELLO COMPLETATO!";ui.resultInfo.textContent=`100% · ${state.level.name}`;updateMenu();show(ui.result);draw()}

function updateParticles(dt){for(const p of state.particles)p.life-=dt;state.particles=state.particles.filter(p=>p.life>0);if(state.running&&prefs.trail!=="none")state.particles.push({x:player.x,y:player.y+player.size/2,life:.22})}
function loop(t){
  if(!state.running||state.paused)return;const dt=Math.min(.022,Math.max(.001,(t-lastTime)/1000));lastTime=t;
  const old=movePhysics(dt);surfaceCollision(old);if(boundaryCollision())return;triggerObjects();if(solidSideCollision()||hazards())return;
  if(state.dual)state.dualY=clamp(CFG.WORLD_H-player.y-player.size,0,CFG.WORLD_H-player.size);
  if(player.x>=state.level.length){win();return}cameraX=Math.max(0,player.x-W*.28);updateParticles(dt);ui.progress.style.width=`${pct()*100}%`;ui.pct.textContent=`${Math.floor(pct()*100)}%`;draw();scheduleAudio();rafId=requestAnimationFrame(loop);
}

function startAudio(){try{const A=window.AudioContext||window.webkitAudioContext;if(!A||window.matchMedia("(display-mode: standalone)").matches)return;if(!state.audio)state.audio=new A();if(state.audio.state==="suspended")state.audio.resume();state.audioStart=state.audio.currentTime;state.nextBeat=0}catch{}}
function stopAudio(){state.audioStart=0}
function tone(f=440,d=.03){if(!state.audio)return;try{const o=state.audio.createOscillator(),g=state.audio.createGain();o.type="square";o.frequency.value=f;g.gain.setValueAtTime(.0001,state.audio.currentTime);g.gain.exponentialRampToValueAtTime(.025,state.audio.currentTime+.006);g.gain.exponentialRampToValueAtTime(.0001,state.audio.currentTime+d);o.connect(g);g.connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+d+.01)}catch{}}
function scheduleAudio(){if(!state.audio||!state.running||!state.audioStart)return;const i=state.level.music==="pulse"?.3:state.level.music==="calm"?.6:.45,e=state.audio.currentTime-state.audioStart;if(e>=state.nextBeat){state.nextBeat+=i;tone(state.level.music==="pulse"?180:240)}}

function draw(){
  const bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#07152f");bg.addColorStop(1,"#103257");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.strokeStyle="rgba(70,220,255,.1)";ctx.lineWidth=1;const off=(-cameraX*.18)%60;
  for(let x=off;x<W;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke()}for(let y=60;y<viewBottom;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}
  const ground=viewBottom;ctx.fillStyle="#07101e";ctx.fillRect(0,ground,W,H-ground);ctx.strokeStyle="#42e8ff";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,ground);ctx.lineTo(W,ground);ctx.stroke();
  for(const o of state.level?.objects||[]){const sx=o.x-cameraX;if(sx+o.w<-80||sx>W+80)continue;drawObject(o,sx)}drawTrail();drawPlayer(player.y);if(state.dual)drawPlayer(state.dualY,player.size+18);
}
function sy(y,h=0){return viewBottom-(y+h)*scale}
function drawObject(o,x){
  if(o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE){const n=o.type===OBJECTS.DOUBLE?2:1;for(let i=0;i<n;i++){ctx.fillStyle="#0b1019";ctx.beginPath();ctx.moveTo(x+i*40,viewBottom-o.y*scale);ctx.lineTo(x+i*40+17,sy(o.y,o.h));ctx.lineTo(x+i*40+34,viewBottom-o.y*scale);ctx.closePath();ctx.fill();ctx.strokeStyle="#fff";ctx.stroke()}return}
  if(o.type===OBJECTS.SAW){const cx=x+o.w/2,cy=sy(o.y,o.h/2);ctx.fillStyle="#111823";ctx.beginPath();ctx.arc(cx,cy,o.w/2,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff";ctx.stroke();return}
  if(o.type===OBJECTS.PAD){ctx.fillStyle="#ffe34d";ctx.fillRect(x,sy(o.y,o.h),o.w,10);ctx.strokeStyle="#fff";ctx.strokeRect(x,sy(o.y,o.h),o.w,10);return}
  if(o.type===OBJECTS.RING||o.type===OBJECTS.GRAVITY_RING){ctx.strokeStyle=o.type===OBJECTS.RING?"#ffe34d":"#c86cff";ctx.lineWidth=5;ctx.beginPath();ctx.arc(x+o.w/2,sy(o.y,o.h/2),o.w/2,0,Math.PI*2);ctx.stroke();return}
  const color=o.type===OBJECTS.GRAVITY_PORTAL?"#c86cff":o.type===OBJECTS.SPEED_PORTAL?"#ff9d3d":o.type===OBJECTS.MINI_PORTAL?"#75ffdf":o.type===OBJECTS.DUAL_PORTAL?"#ff5bd6":o.type===OBJECTS.MODE_PORTAL?"#38ddff":"#16263f";
  const yy=sy(o.y,o.h);ctx.fillStyle=color;ctx.globalAlpha=.8;ctx.fillRect(x,yy,o.w,o.h*scale);ctx.globalAlpha=1;ctx.strokeStyle="#fff";ctx.strokeRect(x,yy,o.w,o.h*scale);
}
function drawTrail(){if(prefs.trail==="none")return;const [c]=skins[prefs.skin];for(const p of state.particles){ctx.globalAlpha=p.life/.22*.45;ctx.fillStyle=c;ctx.fillRect(p.x-cameraX,sy(p.y,5),5,5)}ctx.globalAlpha=1}
function drawPlayer(y,offset=0){const [primary,secondary]=skins[prefs.skin],s=player.size,sx=player.x-cameraX+offset,screenY=sy(y,s);ctx.save();ctx.translate(sx+s/2,screenY+s/2);ctx.rotate(player.rotation);if(state.mode===MODE.WAVE){ctx.fillStyle=primary;ctx.beginPath();ctx.moveTo(-s/2,s/2);ctx.lineTo(s/2,0);ctx.lineTo(-s/2,-s/2);ctx.closePath();ctx.fill()}else{ctx.fillStyle=primary;ctx.fillRect(-s/2,-s/2,s,s)}ctx.strokeStyle=secondary;ctx.strokeRect(-s/2,-s/2,s,s);ctx.fillStyle="#0b233b";ctx.fillRect(-7,-6,4,4);ctx.fillRect(3,-6,4,4);ctx.restore()}

function openSettings(){hide(ui.menu);show(ui.settings);updateMenu()}
function openEditor(){state.editor=true;state.running=false;hide(ui.menu);hide(ui.settings);show(ui.editor);state.editorData=sanitize(load("gd_editor",createEmptyEditorLevel()));state.selection=null;buildEditorTools();draw()}
function buildEditorTools(){ui.editorTools.innerHTML="";for(const [name,type] of Object.entries(OBJECTS)){const b=document.createElement("button");b.type="button";b.className="choice editorTool";b.textContent=name;b.dataset.type=type;b.onclick=()=>{state.editorType=type;ui.editorTools.querySelectorAll(".editorTool").forEach(x=>x.classList.remove("active"));b.classList.add("active")};ui.editorTools.appendChild(b)}ui.editorTools.querySelector(".editorTool")?.classList.add("active")}
function editorPoint(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.round((e.clientX-r.left+cameraX)/20)*20),y:Math.max(0,Math.round((viewBottom-(e.clientY-r.top))/scale/20)*20)}}
function editorDown(e){if(!state.editor)return;const p=editorPoint(e);const found=state.editorData.objects.find(o=>p.x>=o.x&&p.x<=o.x+o.w&&p.y>=o.y&&p.y<=o.y+Math.max(o.h,30));if(found){state.selection=found;state.dragging=true;return}const portal=state.editorType.includes("Portal");const o={type:state.editorType,x:p.x,y:p.y,w:portal?30:(state.editorType===OBJECTS.BLOCK||state.editorType===OBJECTS.PLATFORM?60:36),h:portal?120:(state.editorType===OBJECTS.PAD?12:state.editorType.includes("Ring")?28:40)};if(state.editorType===OBJECTS.MODE_PORTAL)o.mode=MODE.SHIP;if(state.editorType===OBJECTS.SPEED_PORTAL)o.speed=360;state.editorData.objects.push(o);state.selection=o;state.dragging=true}
function editorMove(e){if(!state.editor||!state.dragging||!state.selection)return;const p=editorPoint(e);state.selection.x=p.x;state.selection.y=p.y;draw()}
function saveEditor(){state.editorData.length=Math.max(2000,state.editorData.length||0,...state.editorData.objects.map(o=>o.x+o.w));save("gd_editor",sanitize(state.editorData))}
function clearEditor(){state.editorData=createEmptyEditorLevel();state.selection=null;draw()}
function drawEditor(){draw();for(const o of state.editorData.objects){const x=o.x-cameraX,y=sy(o.y,o.h);ctx.fillStyle="#38ddff77";ctx.fillRect(x,y,o.w,o.h*scale);ctx.strokeStyle=o===state.selection?"#ffe34d":"#fff";ctx.strokeRect(x,y,o.w,o.h*scale)}}

canvas.addEventListener("pointerdown",e=>{e.preventDefault();if(state.editor)editorDown(e);else inputDown()},{passive:false});
canvas.addEventListener("pointermove",e=>{if(state.editor){e.preventDefault();editorMove(e)}},{passive:false});
addEventListener("pointerup",()=>{inputUp();state.dragging=false},{passive:true});addEventListener("pointercancel",()=>{inputUp();state.dragging=false},{passive:true});
ui.touchJump.addEventListener("pointerdown",e=>{e.preventDefault();e.stopPropagation();inputDown()},{passive:false});ui.touchJump.addEventListener("pointerup",inputUp,{passive:true});ui.touchJump.addEventListener("pointercancel",inputUp,{passive:true});ui.touchPause.addEventListener("click",pauseGame);
addEventListener("keydown",e=>{if(state.editor&&e.key==="Delete"){if(state.selection){state.editorData.objects=state.editorData.objects.filter(o=>o!==state.selection);state.selection=null;draw()}return}if(["Space","ArrowUp","KeyW"].includes(e.code)){e.preventDefault();inputDown()}if(e.code==="KeyR"&&state.running){e.preventDefault();restart()}if(e.code==="KeyC"&&state.practice&&state.running){e.preventDefault();state.checkpoint=Math.floor(player.x/50)*50;state.manualCheckpoints.push(state.checkpoint)}if(e.code==="Escape"&&state.running){e.preventDefault();pauseGame()}},{passive:false});
addEventListener("keyup",e=>{if(["Space","ArrowUp","KeyW"].includes(e.code))inputUp()},{passive:true});addEventListener("blur",inputUp);document.addEventListener("visibilitychange",()=>{if(document.hidden&&state.running&&!state.paused)pauseGame()});
$("play")?.addEventListener("click",()=>startLevel(0,state.practice));ui.practiceBtn?.addEventListener("click",()=>{state.practice=!state.practice;updateMenu()});$("editorBtn")?.addEventListener("click",openEditor);$("settingsBtn")?.addEventListener("click",openSettings);$("settingsBack")?.addEventListener("click",()=>{hide(ui.settings);show(ui.menu)});
ui.pauseBtn?.addEventListener("click",pauseGame);$("resumeBtn")?.addEventListener("click",resumeGame);$("restartBtn")?.addEventListener("click",restartCheckpoint);$("startBtn")?.addEventListener("click",restart);$("checkpointBtn")?.addEventListener("click",()=>{if(state.practice&&state.running){state.checkpoint=Math.floor(player.x/50)*50;state.manualCheckpoints.push(state.checkpoint)}});$("menuBtn")?.addEventListener("click",backMenu);
$("resultRetry")?.addEventListener("click",restart);$("resultMenu")?.addEventListener("click",backMenu);$("editorExit")?.addEventListener("click",()=>{state.editor=false;hide(ui.editor);show(ui.menu);updateMenu();draw()});$("editorSave")?.addEventListener("click",saveEditor);$("editorLoad")?.addEventListener("click",()=>{state.editorData=sanitize(load("gd_editor",createEmptyEditorLevel()));state.selection=null;draw()});$("editorClear")?.addEventListener("click",clearEditor);$("editorTest")?.addEventListener("click",startCustom);
document.querySelectorAll(".skin").forEach(b=>b.addEventListener("click",()=>{prefs.skin=b.dataset.skin;save("gd_prefs",prefs);updateMenu();draw()}));document.querySelectorAll(".trail").forEach(b=>b.addEventListener("click",()=>{prefs.trail=b.dataset.trail;save("gd_prefs",prefs);updateMenu();draw()}));
["gesturestart","gesturechange","gestureend","contextmenu"].forEach(n=>document.addEventListener(n,e=>e.preventDefault(),{passive:false}));
resize();updateMenu();draw();