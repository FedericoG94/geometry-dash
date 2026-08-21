import { LEVELS, emptyLevel } from './levels.js';
import { GameEngine, OBJECTS, WORLD } from './engine.js';
import { Renderer } from './renderer.js';
import { LevelEditor } from './editor.js';
import { loadSave, saveSave, loadEditor, saveEditor as persistEditor } from './storage.js';

const $=id=>document.getElementById(id);
const canvas=$('game');
const renderer=new Renderer(canvas);
const save=loadSave();
const ui={menu:$('menu'),settings:$('settings'),pause:$('pause'),result:$('result'),editor:$('editor'),levels:$('levels'),title:$('title'),progress:$('progress'),pct:$('pct'),pauseBtn:$('pauseBtn'),cpBtn:$('cpBtn'),touchJump:$('touchJump'),touchPause:$('touchPause'),practice:$('practice'),editorTools:$('editorTools'),editorStatus:$('editorStatus')};
let engine=new GameEngine(LEVELS[0]);
let levelIndex=0,practice=false,raf=0,last=0,acc=0,editor=null;
const FIXED=1/120,MAX_STEPS=8;

function show(e){e?.classList.remove('hidden')}
function hide(e){e?.classList.add('hidden')}
function controls(on){ui.pauseBtn.style.display=on?'block':'none';ui.touchJump.style.display=on?'block':'none';ui.touchPause.style.display=on?'block':'none';ui.cpBtn.style.display=on&&practice?'block':'none'}
function escapeHtml(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function modeHint(mode){switch(mode){case 'ship':return 'SHIP · TIENI PREMUTO PER SALIRE';case 'ball':return 'BALL · TOCCA PER CAMBIARE GRAVITÀ';case 'ufo':return 'UFO · TOCCA PER SALTARE';case 'wave':return 'WAVE · TIENI/RILASCIA PER CAMBIARE DIREZIONE';default:return `${engine.level.name} · ${engine.level.difficulty}`}}
function updateModeUI(){const mode=engine.players[0]?.mode||'cube';ui.title.textContent=modeHint(mode);ui.touchJump.textContent=mode==='ship'?'TIENI':'SALTA'}
function updateMenu(){ui.levels.innerHTML='';LEVELS.forEach((l,i)=>{const d=document.createElement('div');d.className='level';d.innerHTML=`<strong>${escapeHtml(l.name)}</strong><div class="small">${escapeHtml(l.difficulty)} · Best ${save.best[l.id]||0}% · Attempts ${save.attempts[l.id]||0}</div><button type="button">GIOCA</button>`;d.querySelector('button').onclick=()=>startLevel(i);ui.levels.appendChild(d)});ui.practice.textContent=practice?'Practice: ON':'Practice: OFF';$('menuBest').textContent=`${save.best[LEVELS[levelIndex].id]||0}%`;$('menuDone').textContent=`${Object.values(save.completed).filter(Boolean).length}/${LEVELS.length}`;$('menuAttempts').textContent=String(Object.values(save.attempts).reduce((a,b)=>a+b,0));document.querySelectorAll('.skin').forEach(b=>b.classList.toggle('active',b.dataset.skin===save.settings.skin))}
function scene(){return{objects:engine.level?.objects||[],players:engine.players,camera:renderer.camera}}
function render(){renderer.draw(scene(),save)}
function startLevel(i){levelIndex=i;engine=new GameEngine(LEVELS[i]);engine.practice=practice;const id=LEVELS[i].id;save.attempts[id]=(save.attempts[id]||0)+1;saveSave(save);hide(ui.menu);hide(ui.settings);hide(ui.pause);hide(ui.result);hide(ui.editor);controls(true);engine.reset();updateModeUI();acc=0;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function startCustom(){if(!editor||!editor.level.objects.length){ui.editorStatus.textContent='Inserisci almeno un oggetto';return}engine=new GameEngine(editor.level);engine.reset();hide(ui.editor);controls(true);acc=0;last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop)}
function loop(t){if(!engine.running)return;const elapsed=Math.min(.05,Math.max(0,(t-last)/1000));last=t;acc+=elapsed;let steps=0;while(acc>=FIXED&&steps<MAX_STEPS&&engine.running){const before=engine.players[0]?.mode;engine.step(FIXED);acc-=FIXED;steps++;if(before!==engine.players[0]?.mode)updateModeUI()}if(!engine.running){finish();return}const p=engine.getProgress();renderer.camera=Math.max(0,engine.players[0].x-renderer.w*.28);ui.progress.style.width=`${p*100}%`;ui.pct.textContent=`${Math.floor(p*100)}%`;render();raf=requestAnimationFrame(loop)}
function finish(){cancelAnimationFrame(raf);controls(false);if(engine.completed){save.completed[engine.level.id]=true;save.best[engine.level.id]=100;saveSave(save);$('resultTitle').textContent='LIVELLO COMPLETATO';$('resultInfo').textContent='100%';show(ui.result)}else if(engine.crashed){const p=Math.floor(engine.getProgress()*100);if(engine.level.id&&LEVELS.some(l=>l.id===engine.level.id)){save.best[engine.level.id]=Math.max(save.best[engine.level.id]||0,p);saveSave(save)}$('resultTitle').textContent='CRASH!';$('resultInfo').textContent=practice&&engine.checkpoint!==null?`Crash al ${p}%. Checkpoint ${Math.floor(engine.checkpoint/engine.level.length*100)}%.`:`Crash al ${p}%.`;show(ui.result)}updateMenu();render()}
function restart(checkpoint=false){if(checkpoint&&practice&&engine.checkpoint!==null)engine.reset(engine.checkpoint,true);else engine.reset();hide(ui.pause);hide(ui.result);controls(true);updateModeUI();last=performance.now();acc=0;raf=requestAnimationFrame(loop)}
function pause(){if(!engine.running)return;engine.running=false;ui.pauseInfo.textContent=`${engine.level.name} · ${Math.floor(engine.getProgress()*100)}%`;show(ui.pause);cancelAnimationFrame(raf)}
function resume(){if(engine.completed||engine.crashed)return;hide(ui.pause);engine.running=true;last=performance.now();acc=0;raf=requestAnimationFrame(loop)}
function inputDown(){engine.inputDown()}
function inputUp(){engine.inputUp();engine.release()}

canvas.addEventListener('pointerdown',e=>{e.preventDefault();if(editor){editor.down(e,renderer.camera,WORLD.H,renderer.scale);return}inputDown()},{passive:false});
canvas.addEventListener('pointermove',e=>{if(editor){e.preventDefault();editor.move(e,renderer.camera,WORLD.H,renderer.scale)}},{passive:false});
addEventListener('pointerup',()=>{inputUp();editor?.up()},{passive:true});addEventListener('pointercancel',()=>{inputUp();editor?.up()},{passive:true});
ui.touchJump.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();inputDown()},{passive:false});ui.touchJump.addEventListener('pointerup',inputUp,{passive:true});ui.touchJump.addEventListener('pointercancel',inputUp,{passive:true});ui.touchPause.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();pause()},{passive:false});
addEventListener('keydown',e=>{if(editor&&e.key==='Delete'){editor.remove();return}if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();inputDown()}if(e.code==='KeyR'){e.preventDefault();restart(false)}if(e.code==='KeyC'&&practice&&engine.running){e.preventDefault();engine.checkpoint()}if(e.code==='Escape'&&engine.running){e.preventDefault();pause()}},{passive:false});
addEventListener('keyup',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code))inputUp()},{passive:true});addEventListener('blur',inputUp);document.addEventListener('visibilitychange',()=>{if(document.hidden&&engine.running)pause()});

$('practice').onclick=()=>{practice=!practice;updateMenu()};
$('settingsBtn').onclick=()=>{hide(ui.menu);show(ui.settings)};$('settingsBack').onclick=()=>{hide(ui.settings);show(ui.menu)};
ui.pauseBtn.onclick=pause;$('resumeBtn').onclick=resume;$('restartBtn').onclick=()=>restart(true);$('startBtn').onclick=()=>restart(false);$('menuBtn').onclick=()=>{hide(ui.pause);show(ui.menu);controls(false);updateMenu()};
$('resultRetry').onclick=()=>restart(false);$('resultMenu').onclick=()=>{hide(ui.result);show(ui.menu);controls(false);updateMenu()};
for(const b of document.querySelectorAll('.skin'))b.onclick=()=>{save.settings.skin=b.dataset.skin;saveSave(save);updateMenu();render()};

$('editorBtn').onclick=()=>openEditor();$('editorExit').onclick=()=>{editor=null;hide(ui.editor);show(ui.menu);updateMenu();render()};$('editorSave').onclick=()=>{editor.persist();ui.editorStatus.textContent='Salvato'};$('editorLoad').onclick=()=>{if(editor){editor.level=loadEditor()||emptyLevel();editor.selected=null;ui.editorStatus.textContent='Caricato';editor.onChange()}};$('editorClear').onclick=()=>{editor.clear();ui.editorStatus.textContent='Vuoto'};$('editorTest').onclick=startCustom;
function openEditor(){hide(ui.menu);editor=new LevelEditor(canvas,persistEditor,loadEditor,drawEditor);show(ui.editor);ui.editorStatus.textContent='Editor pronto';buildTools();drawEditor()}
function buildTools(){ui.editorTools.innerHTML='';for(const [label,type] of Object.entries(OBJECTS)){const b=document.createElement('button');b.className='choice';b.textContent=label;b.onclick=()=>editor.setType(type);ui.editorTools.appendChild(b)}}
function drawEditor(){renderer.draw({objects:editor.level.objects,players:[],camera:renderer.camera},save)}

updateMenu();render();
