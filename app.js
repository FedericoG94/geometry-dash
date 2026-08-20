import { LEVELS, MODE, OBJECTS, createEmptyEditorLevel } from './levels.js';

const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d',{alpha:false});
const $=id=>document.getElementById(id);
const ui={menu:$('menu'),settings:$('settings'),pause:$('pausePanel'),result:$('resultPanel'),editor:$('editorPanel'),pauseBtn:$('pauseBtn'),practiceBtn:$('practiceModeBtn'),checkpointBtn:$('checkpointBtn'),touchJump:$('touchJump'),touchPause:$('touchPause'),progress:$('progress'),pct:$('pct'),title:$('title'),levelList:$('levelList'),menuBest:$('menuBest'),attempts:$('menuAttempts'),completed:$('menuCompleted'),resultTitle:$('resultTitle'),resultInfo:$('resultInfo'),pauseInfo:$('pauseInfo'),editorTools:$('editorTools')};
const CFG={gravity:1800,cubeJump:670,shipGravity:1150,shipThrust:1650,ufoGravity:1450,ufoJump:620,waveSpeed:430,speedFallback:290,WORLD_H:320,GROUND_Y:0,PLAYER_SIZE:34};
const skins={cyan:['#42e8ff','#fff'],red:['#ff5577','#ffd6df'],green:['#7dff5b','#e7ffd9'],gold:['#ffd84d','#fff4b8']};
const prefs=load('gd_prefs',{skin:'cyan',trail:'spark'});
const progress=load('gd_progress',{completed:{},best:{},attempts:0,skins:['cyan','red','green','gold']});
let W=1,H=1,DPR=1,viewTop=0,viewBottom=1,viewScale=1,cameraX=0,lastTime=0,rafId=0,resizeTimer=0;
const player={x:100,y:0,vy:0,size:CFG.PLAYER_SIZE,gravity:1,onGround:true,rotation:0};
const state={levelIndex:0,level:LEVELS[0],mode:MODE.CUBE,speed:CFG.speedFallback,mini:false,dual:false,dualY:0,running:false,paused:false,practice:false,checkpoint:null,manualCheckpoints:[],triggered:new Set(),holding:false,editor:false,editorData:createEmptyEditorLevel(),editorType:OBJECTS.BLOCK,selection:null,dragging:false,particles:[],audio:null,audioStart:0,nextBeat:0};
function load(k,f){try{const v=localStorage.getItem(k);return v===null?f:v&&typeof v==='string'?JSON.parse(v):v}catch{return f}}
function save(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch{}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function overlap(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function show(e){if(e)e.classList.remove('hidden')}
function hide(e){if(e)e.classList.add('hidden')}
function pct(){return clamp((player.x-100)/Math.max(1,(state.level.length||1)-100),0,1)}
function esc(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function safeInset(name){try{return parseFloat(getComputedStyle(document.documentElement).getPropertyValue(`--safe-${name}`))||0}catch{return 0}}
function resize(){
 const vv=window.visualViewport;
 const vw=vv&&vv.width>200?vv.width:window.innerWidth;
 const vh=vv&&vv.height>160?vv.height:window.innerHeight;
 W=Math.max(1,Math.round(vw));H=Math.max(1,Math.round(vh));
 const top=Math.max(0,safeInset('top'));const bottom=Math.max(0,safeInset('bottom'));
 viewTop=top;viewBottom=Math.max(viewTop+180,H-bottom);
 const available=Math.max(180,viewBottom-viewTop);
 viewScale=clamp(available/CFG.WORLD_H,.72,2);
 DPR=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.max(1,Math.floor(W*DPR));canvas.height=Math.max(1,Math.floor(H*DPR));
 canvas.style.width=`${W}px`;canvas.style.height=`${H}px`;
 ctx.setTransform(DPR,0,0,DPR,0,0);
 draw();
}
function scheduleResize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,80)}
addEventListener('resize',scheduleResize,{passive:true});
addEventListener('orientationchange',()=>{scheduleResize();setTimeout(resize,350)},{passive:true});
if(window.visualViewport)window.visualViewport.addEventListener('resize',scheduleResize,{passive:true});
function worldToScreenY(y,h=0){return viewBottom-(y+h)*viewScale}
function groundScreen(){return viewBottom}
function ceiling(){return CFG.WORLD_H-player.size}
function updateMenu(){
 const done=Object.values(progress.completed||{}).filter(Boolean).length;
 ui.attempts.textContent=String(progress.attempts||0);ui.completed.textContent=`${done}/${LEVELS.length}`;
 ui.practiceBtn.textContent=`Practice: ${state.practice?'ON':'OFF'}`;ui.menuBest.textContent=`${progress.best[state.level?.id]||0}%`;
 ui.levelList.innerHTML='';
 LEVELS.forEach((l,i)=>{const d=document.createElement('div');d.className='levelCard';d.innerHTML=`<strong>${esc(l.name)}</strong><div class="small">${esc(l.difficulty)} · ${Math.round(l.length/100)}m · Best ${progress.best[l.id]||0}%</div><button type="button">GIOCA</button>`;d.querySelector('button').onclick=()=>startLevel(i,state.practice);ui.levelList.appendChild(d)});
 document.querySelectorAll('.skin').forEach(b=>b.classList.toggle('active',b.dataset.skin===prefs.skin));document.querySelectorAll('.trail').forEach(b=>b.classList.toggle('active',b.dataset.trail===prefs.trail));
}
function resetRun(startX=100,preserve=false){
 const cp=preserve?state.checkpoint:null;const manual=preserve?[...state.manualCheckpoints]:[];
 player.x=Math.max(100,startX);player.y=0;player.vy=0;player.gravity=1;player.onGround=true;player.rotation=0;player.size=state.mini?24:CFG.PLAYER_SIZE;
 state.mode=MODE.CUBE;state.speed=Number(state.level.speed)||CFG.speedFallback;state.mini=false;state.dual=false;state.dualY=0;state.triggered=new Set();state.holding=false;state.checkpoint=cp;state.manualCheckpoints=manual;state.particles=[];cameraX=0;
}
function sanitize(l){const s=l||createEmptyEditorLevel();return{id:s.id||'custom',name:s.name||'Il mio livello',difficulty:s.difficulty||'Custom',length:Math.max(2000,Number(s.length)||12000),speed:Math.max(120,Number(s.speed)||CFG.speedFallback),music:s.music||'beat',objects:Array.isArray(s.objects)?s.objects.filter(Boolean).map(o=>({...o,x:Math.max(0,Number(o.x)||0),y:Math.max(0,Number(o.y)||0),w:Math.max(12,Number(o.w)||36),h:Math.max(8,Number(o.h)||36)})):[]}}
function startLevel(i=state.levelIndex,practice=state.practice){if(!LEVELS[i])return;cancelAnimationFrame(rafId);state.levelIndex=i;state.level=LEVELS[i];state.practice=!!practice;state.running=false;state.paused=false;resetRun();progress.attempts=(progress.attempts||0)+1;save('gd_progress',progress);hide(ui.menu);hide(ui.settings);hide(ui.pause);hide(ui.result);hide(ui.editor);setControls(true);ui.title.textContent=`${state.level.name} · ${state.level.difficulty}`;state.running=true;startAudio();lastTime=performance.now();rafId=requestAnimationFrame(loop)}
function startCustom(){const l=sanitize(state.editorData);if(!l.objects.length){alert('Inserisci almeno un oggetto.');return}cancelAnimationFrame(rafId);state.level=l;state.levelIndex=-1;state.practice=false;state.editor=false;hide(ui.editor);resetRun();state.speed=l.speed;state.running=true;setControls(true);startAudio();lastTime=performance.now();rafId=requestAnimationFrame(loop)}
function menu(){cancelAnimationFrame(rafId);stopAudio();state.running=false;state.paused=false;state.editor=false;setControls(false);hide(ui.settings);hide(ui.pause);hide(ui.result);hide(ui.editor);show(ui.menu);updateMenu();draw()}
function pause(){if(!state.running)return;state.paused=true;stopAudio();ui.pauseInfo.textContent=`${state.level.name} · ${Math.floor(pct()*100)}%`;show(ui.pause);draw()}
function resume(){if(!state.running)return;state.paused=false;hide(ui.pause);startAudio();lastTime=performance.now();cancelAnimationFrame(rafId);rafId=requestAnimationFrame(loop)}
function restart(){if(state.practice&&state.checkpoint!==null){startCheckpoint(state.checkpoint);return}state.levelIndex>=0?startLevel(state.levelIndex,state.practice):startCustom()}
function startCheckpoint(x){hide(ui.result);hide(ui.pause);resetRun(Math.max(100,x),true);state.running=true;setControls(true);startAudio();lastTime=performance.now();cancelAnimationFrame(rafId);rafId=requestAnimationFrame(loop)}
function setControls(on){ui.pauseBtn.style.display=on?'block':'none';ui.checkpointBtn.style.display=on&&state.practice?'block':'none';ui.touchJump.style.display=on?'block':'none';ui.touchPause.style.display=on?'block':'none'}
function inputDown(){if(!state.running||state.paused||state.editor)return;state.holding=true;switch(state.mode){case MODE.CUBE:if(player.onGround){player.vy=CFG.cubeJump*player.gravity;player.onGround=false}break;case MODE.BALL:if(player.onGround){player.gravity*=-1;player.vy=0;player.onGround=false}break;case MODE.UFO:player.vy=CFG.ufoJump*player.gravity;player.onGround=false;break;case MODE.SHIP:case MODE.WAVE:break}}
function inputUp(){state.holding=false}
function updatePlayer(dt){
 const oldY=player.y;
 if(state.mode===MODE.SHIP){player.vy+=(state.holding?CFG.shipThrust:-CFG.shipGravity)*player.gravity*dt;player.vy=clamp(player.vy,-760,760);player.y+=player.vy*dt}
 else if(state.mode===MODE.UFO){player.vy-=CFG.ufoGravity*player.gravity*dt;player.vy=clamp(player.vy,-850,850);player.y+=player.vy*dt}
 else if(state.mode===MODE.WAVE){const v=CFG.waveSpeed*(state.mini?1.45:1);player.y+=(state.holding?v:-v)*player.gravity*dt}
 else {player.vy-=CFG.gravity*player.gravity*dt;player.y+=player.vy*dt}
 if(state.mode!==MODE.WAVE){if(player.gravity>0){if(player.y<=0){player.y=0;player.vy=0;player.onGround=true}else player.onGround=false}else{const top=ceiling();if(player.y>=top){player.y=top;player.vy=0;player.onGround=true}else player.onGround=false}landOnPlatforms(oldY)}else player.onGround=false;
 if(state.dual)state.dualY=clamp(CFG.WORLD_H-player.y-player.size,0,CFG.WORLD_H-player.size);
 if(player.y<0||player.y+player.size>CFG.WORLD_H){crash();return}
}
function landOnPlatforms(oldY){
 if(state.mode===MODE.SHIP||state.mode===MODE.WAVE)return;
 for(const o of state.level.objects||[]){if(o.type!==OBJECTS.BLOCK&&o.type!==OBJECTS.PLATFORM)continue;if(player.x+player.size-4<=o.x||player.x+4>=o.x+o.w)continue;
  if(player.gravity>0&&player.vy<=0&&oldY>=o.y+o.h&&player.y<=o.y+o.h){player.y=o.y+o.h;player.vy=0;player.onGround=true}
  else if(player.gravity<0&&player.vy>=0&&oldY+player.size<=o.y&&player.y+player.size>=o.y){player.y=o.y-player.size;player.vy=0;player.onGround=true}
 }
}
function triggerObjects(){
 for(const o of state.level.objects||[]){if(o.x>player.x+player.size+40||o.x+o.w<player.x-40)continue;const key=`${o.type}:${o.x}:${o.y}`;const once=[OBJECTS.MODE_PORTAL,OBJECTS.GRAVITY_PORTAL,OBJECTS.SPEED_PORTAL,OBJECTS.MINI_PORTAL,OBJECTS.DUAL_PORTAL].includes(o.type);if(once&&state.triggered.has(key))continue;
  if(o.type===OBJECTS.MODE_PORTAL){state.mode=o.mode||MODE.CUBE;player.vy=0;player.onGround=false;state.triggered.add(key)}
  else if(o.type===OBJECTS.GRAVITY_PORTAL){player.gravity*=-1;player.vy=0;player.onGround=false;state.triggered.add(key)}
  else if(o.type===OBJECTS.SPEED_PORTAL){state.speed=Math.max(120,Number(o.speed)||state.speed);state.triggered.add(key)}
  else if(o.type===OBJECTS.MINI_PORTAL){state.mini=!state.mini;player.size=state.mini?24:CFG.PLAYER_SIZE;player.y=clamp(player.y,0,CFG.WORLD_H-player.size);state.triggered.add(key)}
  else if(o.type===OBJECTS.DUAL_PORTAL){state.dual=!state.dual;state.dualY=CFG.WORLD_H-player.y-player.size;state.triggered.add(key)}
  else if(o.type===OBJECTS.PAD){const padTop=o.y+o.h;const contact=state.gravity>0?player.y<=padTop+9&&player.y>=padTop-20&&player.vy<=0:player.y+player.size>=o.y-9&&player.y+player.size<=o.y+20&&player.vy>=0;if(state.mode!==MODE.WAVE&&contact&&player.x+player.size>o.x&&player.x<o.x+o.w){player.vy=760*player.gravity;player.onGround=false}}
  else if(o.type===OBJECTS.RING){const near=state.mode!==MODE.WAVE&&state.holding&&Math.abs(player.x-(o.x+o.w/2))<45&&Math.abs(player.y-(o.y+o.h/2))<48;if(near)player.vy=700*player.gravity}
  else if(o.type===OBJECTS.GRAVITY_RING){const near=state.mode!==MODE.WAVE&&state.holding&&Math.abs(player.x-(o.x+o.w/2))<45&&Math.abs(player.y-(o.y+o.h/2))<48;if(near){player.gravity*=-1;player.vy=0;player.onGround=false}}
 }
}
function hitbox(y=player.y){const i=Math.max(3,player.size*.13);return{x:player.x+i,y:y+i,w:Math.max(1,player.size-i*2),h:Math.max(1,player.size-i*2)}}
function hazardHit(b,o){
 if(o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE){const n=o.type===OBJECTS.DOUBLE?2:1;for(let i=0;i<n;i++){const sx=o.x+i*40;const r={x:sx+5,y:o.y,w:Math.min(30,o.w-10||30),h:Math.max(28,o.h||42)};if(overlap(b,r))return true}return false}
 if(o.type===OBJECTS.SAW){const cx=o.x+o.w/2,cy=o.y+o.h/2,dx=b.x+b.w/2-cx,dy=b.y+b.h/2-cy,r=o.w/2+b.w*.36;return dx*dx+dy*dy<=r*r}
 return false
}
function solidHit(b,o){if(o.type!==OBJECTS.BLOCK&&o.type!==OBJECTS.PLATFORM)return false;return overlap(b,{x:o.x,y:o.y,w:o.w,h:o.h})}
function hazards(){
 const boxes=[hitbox()];if(state.dual)boxes.push(hitbox(state.dualY));
 for(const b of boxes)for(const o of state.level.objects||[]){if(o.x>player.x+player.size+100||o.x+o.w<player.x-100)continue;if(hazardHit(b,o)){crash();return}if(solidHit(b,o)){const top=state.gravity>0&&Math.abs(b.y-(o.y+o.h))<8;const bottom=state.gravity<0&&Math.abs(b.y+b.h-o.y)<8;if(!top&&!bottom){crash();return}}}
}
function crash(){if(!state.running)return;state.running=false;cancelAnimationFrame(rafId);stopAudio();const p=Math.floor(pct()*100);if(state.level.id){progress.best[state.level.id]=Math.max(progress.best[state.level.id]||0,p);save('gd_progress',progress)}if(state.practice)state.checkpoint=state.manualCheckpoints.at(-1)??Math.max(100,Math.floor(player.x/1000)*1000);ui.resultTitle.textContent='CRASH!';ui.resultInfo.textContent=state.practice?`Progressi: ${p}% · Checkpoint: ${Math.floor((state.checkpoint/state.level.length)*100)}%`:`Progressi: ${p}%`;show(ui.result);draw()}
function win(){if(!state.running)return;state.running=false;cancelAnimationFrame(rafId);stopAudio();if(state.level.id){progress.completed[state.level.id]=true;progress.best[state.level.id]=100;save('gd_progress',progress)}ui.resultTitle.textContent='LIVELLO COMPLETATO!';ui.resultInfo.textContent=`100% · ${state.level.name}`;updateMenu();show(ui.result);draw()}
function createCheckpoint(){if(!state.practice||!state.running)return;const cp=Math.floor(player.x/50)*50;if(!state.manualCheckpoints.includes(cp))state.manualCheckpoints.push(cp);state.checkpoint=cp;tone(880)}
function loop(t){if(!state.running||state.paused)return;const dt=Math.min(.024,Math.max(.001,(t-lastTime)/1000));lastTime=t;triggerObjects();if(!state.running)return;player.x+=state.speed*dt;updatePlayer(dt);if(!state.running)return;hazards();if(!state.running)return;const p=pct();ui.progress.style.width=`${p*100}%`;ui.pct.textContent=`${Math.floor(p*100)}%`;cameraX=Math.max(0,player.x-W*.28);if(player.x>=state.level.length){win();return}updateParticles(dt);draw();audioTick();rafId=requestAnimationFrame(loop)}
function updateParticles(dt){for(const p of state.particles)p.life-=dt;state.particles=state.particles.filter(p=>p.life>0);if(prefs.trail!=='none'&&state.running)state.particles.push({x:player.x,y:player.y+player.size/2,life:.22})}
function startAudio(){try{if(window.navigator.standalone===true||(window.matchMedia&&window.matchMedia('(display-mode:standalone)').matches))return;const A=window.AudioContext||window.webkitAudioContext;if(!A)return;if(!state.audio)state.audio=new A;if(state.audio.state==='suspended')state.audio.resume();state.audioStart=state.audio.currentTime;state.nextBeat=0}catch{}}
function stopAudio(){state.audioStart=0}
function tone(f=440,d=.04){if(!state.audio)return;try{const o=state.audio.createOscillator(),g=state.audio.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(.0001,state.audio.currentTime);g.gain.exponentialRampToValueAtTime(.035,state.audio.currentTime+.008);g.gain.exponentialRampToValueAtTime(.0001,state.audio.currentTime+d);o.connect(g).connect(state.audio.destination);o.start();o.stop(state.audio.currentTime+d+.01)}catch{}}
function audioTick(){if(!state.audio||!state.running||!state.audioStart)return;const step=state.level.music==='pulse'?.30:state.level.music==='calm'?.60:.45;const elapsed=state.audio.currentTime-state.audioStart;if(elapsed>=state.nextBeat){state.nextBeat+=step;tone(state.level.music==='pulse'?180:240,.025)}}
function draw(){state.editor?drawEditor():drawGame()}
function drawGame(){const g=groundScreen(),bg=ctx.createLinearGradient(0,viewTop,0,g);bg.addColorStop(0,'#07152f');bg.addColorStop(1,'#103257');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(70,220,255,.11)';for(let x=(-cameraX*.18)%70;x<W;x+=70){ctx.beginPath();ctx.moveTo(x,viewTop);ctx.lineTo(x,g);ctx.stroke()}for(let y=viewTop+70;y<g;y+=70){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.fillStyle='#07101e';ctx.fillRect(0,g,W,H-g);ctx.strokeStyle='#42e8ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,g);ctx.lineTo(W,g);ctx.stroke();for(const o of state.level.objects||[]){const sx=o.x-cameraX;if(sx+o.w<-100||sx>W+100)continue;drawObject(o,sx)}drawTrail();drawPlayer(player.y);if(state.dual)drawPlayer(state.dualY,player.size+18)}
function drawObject(o,x){if(o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE){const n=o.type===OBJECTS.DOUBLE?2:1;for(let i=0;i<n;i++){const sx=x+i*40;const base=worldToScreenY(o.y),top=worldToScreenY(o.y+Math.max(42,o.h));ctx.fillStyle='#0b1019';ctx.beginPath();ctx.moveTo(sx,base);ctx.lineTo(sx+17,top);ctx.lineTo(sx+34,base);ctx.closePath();ctx.fill();ctx.strokeStyle='#fff';ctx.stroke()}}else if(o.type===OBJECTS.SAW){const cx=x+o.w/2,cy=worldToScreenY(o.y+o.h/2);ctx.fillStyle='#111823';ctx.beginPath();ctx.arc(cx,cy,o.w*viewScale/2,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.stroke()}else if(o.type===OBJECTS.BLOCK||o.type===OBJECTS.PLATFORM){const y=worldToScreenY(o.y,o.h);ctx.fillStyle='#101722';ctx.fillRect(x,y,o.w,o.h*viewScale);ctx.strokeStyle='#fff';ctx.strokeRect(x,y,o.w,o.h*viewScale)}else if(o.type===OBJECTS.PAD){const y=worldToScreenY(o.y,o.h);ctx.fillStyle='#ffe34d';ctx.fillRect(x,y,o.w,10*viewScale)}else if(o.type===OBJECTS.RING||o.type===OBJECTS.GRAVITY_RING){ctx.strokeStyle=o.type===OBJECTS.RING?'#ffe34d':'#c86cff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(x+o.w/2,worldToScreenY(o.y+o.h/2),o.w/2*viewScale,0,Math.PI*2);ctx.stroke()}else{const y=worldToScreenY(o.y,o.h);ctx.fillStyle=portalColor(o.type);ctx.globalAlpha=.8;ctx.fillRect(x,y,o.w,o.h*viewScale);ctx.globalAlpha=1;ctx.strokeStyle='#fff';ctx.strokeRect(x,y,o.w,o.h*viewScale)}}
function drawTrail(){if(prefs.trail==='none')return;const c=skins[prefs.skin][0];for(const p of state.particles){ctx.globalAlpha=Math.max(0,p.life/.22)*.5;ctx.fillStyle=c;ctx.fillRect(p.x-cameraX,worldToScreenY(p.y+2),5,5)}ctx.globalAlpha=1}
function drawPlayer(y,offset=0){const [primary,secondary]=skins[prefs.skin],s=player.size,px=player.x-cameraX+offset,py=worldToScreenY(y,s);ctx.save();ctx.translate(px+s/2,py+s*viewScale/2);ctx.rotate(player.rotation);if(state.mode===MODE.WAVE){ctx.fillStyle=primary;ctx.beginPath();ctx.moveTo(-s/2,s*viewScale/2);ctx.lineTo(s/2,0);ctx.lineTo(-s/2,-s*viewScale/2);ctx.closePath();ctx.fill()}else{ctx.fillStyle=primary;ctx.fillRect(-s/2,-s*viewScale/2,s,s*viewScale)}ctx.strokeStyle=secondary;ctx.lineWidth=2;ctx.strokeRect(-s/2,-s*viewScale/2,s,s*viewScale);ctx.fillStyle='#0b233b';ctx.fillRect(-7,-6,4,4);ctx.fillRect(3,-6,4,4);ctx.restore()}
function portalColor(t){return t===OBJECTS.GRAVITY_PORTAL?'#c86cff':t===OBJECTS.SPEED_PORTAL?'#ff9d3d':t===OBJECTS.MINI_PORTAL?'#75ffdf':t===OBJECTS.DUAL_PORTAL?'#ff5bd6':'#38ddff'}
function openSettings(){hide(ui.menu);show(ui.settings);updateMenu()}
function openEditor(){state.editor=true;state.running=false;cancelAnimationFrame(rafId);hide(ui.menu);hide(ui.settings);show(ui.editor);state.editorData=sanitize(load('gd_editor',createEmptyEditorLevel()));state.selection=null;state.dragging=false;buildEditorTools();draw()}
function buildEditorTools(){ui.editorTools.innerHTML='';for(const [name,type] of Object.entries(OBJECTS)){const b=document.createElement('button');b.type='button';b.className='choice editorTool';b.textContent=name;b.onclick=()=>{state.editorType=type;ui.editorTools.querySelectorAll('.editorTool').forEach(x=>x.classList.remove('active'));b.classList.add('active')};ui.editorTools.appendChild(b)}ui.editorTools.firstElementChild?.classList.add('active')}
function editorPoint(e){const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.round((e.clientX-r.left+cameraX)/20)*20),y:Math.max(0,Math.round((viewBottom-(e.clientY-r.top))/viewScale/20)*20)}}
function editorDown(e){const p=editorPoint(e);const existing=state.editorData.objects.find(o=>p.x>=o.x&&p.x<=o.x+o.w&&p.y>=o.y&&p.y<=o.y+Math.max(o.h,30));if(existing){state.selection=existing;state.dragging=true;return}const solid=state.editorType===OBJECTS.BLOCK||state.editorType===OBJECTS.PLATFORM;const o={type:state.editorType,x:p.x,y:p.y,w:solid?60:36,h:solid?60:40};if(state.editorType===OBJECTS.PAD)o.h=12;if(state.editorType.includes('Portal')){o.h=120;if(state.editorType===OBJECTS.MODE_PORTAL)o.mode=MODE.SHIP;if(state.editorType===OBJECTS.SPEED_PORTAL)o.speed=360}if(state.editorType===OBJECTS.RING||state.editorType===OBJECTS.GRAVITY_RING){o.w=28;o.h=28}state.editorData.objects.push(o);state.selection=o;state.dragging=true}
function editorMove(e){if(!state.editor||!state.selection||!state.dragging)return;const p=editorPoint(e);state.selection.x=p.x;state.selection.y=p.y;draw()}
function drawEditor(){const g=groundScreen();ctx.fillStyle='#09172d';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#20466c';for(let x=0;x<W;x+=50){ctx.beginPath();ctx.moveTo(x,viewTop);ctx.lineTo(x,g);ctx.stroke()}for(let y=viewTop;y<g;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke()}ctx.fillStyle='#07101e';ctx.fillRect(0,g,W,H-g);for(const o of state.editorData.objects){const x=o.x-cameraX,y=worldToScreenY(o.y,o.h);ctx.fillStyle=portalColor(o.type);ctx.globalAlpha=.7;ctx.fillRect(x,y,o.w,o.h*viewScale);ctx.globalAlpha=1;ctx.strokeStyle=o===state.selection?'#ffe34d':'#fff';ctx.lineWidth=o===state.selection?3:1;ctx.strokeRect(x,y,o.w,o.h*viewScale)}}
function saveEditor(){const data=sanitize(state.editorData);data.length=Math.max(2000,data.length,...data.objects.map(o=>o.x+o.w));state.editorData=data;save('gd_editor',data)}
function clearEditor(){state.editorData=createEmptyEditorLevel();state.selection=null;state.dragging=false;draw()}
function handlePointerDown(e){e.preventDefault();if(state.editor){editorDown(e);draw()}else inputDown()}
canvas.addEventListener('pointerdown',handlePointerDown,{passive:false});canvas.addEventListener('pointermove',e=>{if(state.editor){e.preventDefault();editorMove(e)}},{passive:false});addEventListener('pointerup',()=>{inputUp();if(state.editor)state.dragging=false},{passive:true});addEventListener('pointercancel',()=>{inputUp();if(state.editor)state.dragging=false},{passive:true});
ui.touchJump.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();inputDown()},{passive:false});ui.touchJump.addEventListener('pointerup',e=>{e.preventDefault();e.stopPropagation();inputUp()},{passive:false});ui.touchJump.addEventListener('pointercancel',inputUp,{passive:true});ui.touchPause.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pause()},{passive:false});
addEventListener('keydown',e=>{if(state.editor&&e.key==='Delete'){if(state.selection){state.editorData.objects=state.editorData.objects.filter(o=>o!==state.selection);state.selection=null;draw()}return}if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();inputDown()}if(e.code==='KeyR'&&state.running){e.preventDefault();restart()}if(e.code==='KeyC'&&state.practice&&state.running){e.preventDefault();createCheckpoint()}if(e.code==='Escape'&&state.running){e.preventDefault();pause()}},{passive:false});
addEventListener('keyup',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code))inputUp()},{passive:true});addEventListener('blur',inputUp);document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running&&!state.paused)pause()});
const bind=(id,fn)=>{const el=$(id);if(el)el.onclick=fn};
bind('play',()=>startLevel(0,state.practice));bind('editorBtn',openEditor);bind('settingsBtn',openSettings);bind('settingsBack',()=>{hide(ui.settings);show(ui.menu);updateMenu()});bind('resumeBtn',resume);bind('restartBtn',restart);bind('startBtn',()=>state.levelIndex>=0?startLevel(state.levelIndex,state.practice):startCustom());bind('menuBtn',menu);bind('resultRetry',restart);bind('resultMenu',menu);bind('editorExit',()=>{state.editor=false;hide(ui.editor);show(ui.menu);updateMenu();draw()});bind('editorSave',saveEditor);bind('editorLoad',()=>{state.editorData=sanitize(load('gd_editor',createEmptyEditorLevel()));state.selection=null;draw()});bind('editorClear',clearEditor);bind('editorTest',startCustom);ui.practiceBtn.onclick=()=>{state.practice=!state.practice;updateMenu()};ui.pauseBtn.onclick=pause;ui.checkpointBtn.onclick=createCheckpoint;
document.querySelectorAll('.skin').forEach(b=>b.onclick=()=>{prefs.skin=b.dataset.skin;save('gd_prefs',prefs);updateMenu();draw()});document.querySelectorAll('.trail').forEach(b=>b.onclick=()=>{prefs.trail=b.dataset.trail;save('gd_prefs',prefs);updateMenu();draw()});
for(const n of ['gesturestart','gesturechange','gestureend','contextmenu'])document.addEventListener(n,e=>e.preventDefault(),{passive:false});
resize();updateMenu();draw();