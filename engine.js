export const MODE={CUBE:'cube',SHIP:'ship',BALL:'ball',UFO:'ufo',WAVE:'wave'};
export const OBJECTS={SPIKE:'spike',DOUBLE:'doubleSpike',BLOCK:'block',PLATFORM:'platform',SAW:'saw',PAD:'pad',RING:'ring',GRAVITY_RING:'gravityRing',MODE_PORTAL:'modePortal',GRAVITY_PORTAL:'gravityPortal',SPEED_PORTAL:'speedPortal',MINI_PORTAL:'miniPortal',DUAL_PORTAL:'dualPortal'};
export const WORLD={H:320,FLOOR:0,SPEED_MIN:120,SPEED_MAX:900};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const hitbox=p=>({x:p.x+4,y:p.y+4,w:p.size-8,h:p.size-8});
function makePlayer(id,y=0){return{id,x:100,y,size:34,vy:0,gravity:1,mode:MODE.CUBE,onGround:true,alive:true,rotation:0,mini:false}}
export class GameEngine{
  constructor(level){this.loadLevel(level)}
  loadLevel(level){this.level=level;this.players=[makePlayer(0)];this.speed=clamp(Number(level.speed)||300,WORLD.SPEED_MIN,WORLD.SPEED_MAX);this.running=false;this.completed=false;this.crashed=false;this.practice=false;this.checkpoint=null;this.checkpoints=[];this.triggered=new Set();this.oneShot=new Set();this.time=0}
  reset(startX=100,preserve=false){const oldCp=preserve?this.checkpoint:null;const oldCps=preserve?[...this.checkpoints]:[];this.players=[makePlayer(0)];this.players[0].x=Math.max(100,startX);this.speed=clamp(Number(this.level.speed)||300,WORLD.SPEED_MIN,WORLD.SPEED_MAX);this.running=true;this.completed=false;this.crashed=false;this.triggered.clear();this.oneShot.clear();this.time=0;this.checkpoint=oldCp;this.checkpoints=oldCps}
  inputDown(){if(!this.running)return;for(const p of this.players)this.press(p)}
  inputUp(){if(!this.running)return}
  press(p){if(p.mode===MODE.CUBE){if(p.onGround){p.vy=650*p.gravity;p.onGround=false}}else if(p.mode===MODE.BALL){if(p.onGround){p.gravity*=-1;p.vy=0;p.onGround=false}}else if(p.mode===MODE.UFO){p.vy=600*p.gravity;p.onGround=false}else if(p.mode===MODE.SHIP){p.hold=true}else if(p.mode===MODE.WAVE){p.hold=true}}
  release(){for(const p of this.players){p.hold=false}}
  step(dt){if(!this.running||this.completed||this.crashed)return;this.time+=dt;for(const p of this.players){if(!p.alive)continue;this.move(p,dt)}this.processPortals();for(const p of this.players){if(!p.alive)continue;if(!this.bounds(p)){this.crash();return}if(!this.solids(p)){this.crash();return}if(!this.hazards(p)){this.crash();return}}this.updateDual();if(this.players[0].x>=this.level.length){this.running=false;this.completed=true}}
  move(p,dt){const oldY=p.y;p.x+=this.speed*dt;if(p.mode===MODE.WAVE){const dir=(p.hold?1:-1)*p.gravity;const v=430*(p.mini?2:1);p.y+=dir*v*dt;p.onGround=false}else{let a=0;if(p.mode===MODE.CUBE||p.mode===MODE.BALL||p.mode===MODE.UFO)a=-1500*p.gravity;if(p.mode===MODE.SHIP)a=p.gravity*(p.hold?1650:-1150);p.vy+=a*dt;p.vy=clamp(p.vy,-900,900);p.y+=p.vy*dt;this.resolveSurfaces(p,oldY)}}
  resolveSurfaces(p,oldY){const b=hitbox(p);let landed=false;for(const o of this.solidsOnly()){if(b.x+b.w<=o.x||b.x>=o.x+o.w)continue;if(p.gravity>0){const top=o.y+o.h;if(oldY>=top&&p.y<=top&&p.vy<=0){p.y=top;p.vy=0;p.onGround=true;landed=true}}else{if(oldY+p.size<=o.y&&p.y+p.size>=o.y&&p.vy>=0){p.y=o.y-p.size;p.vy=0;p.onGround=true;landed=true}}}if(p.mode!==MODE.SHIP&&p.mode!==MODE.WAVE&&p.mode!==MODE.UFO&&!landed){p.onGround=(p.gravity>0&&p.y<=0)||(p.gravity<0&&p.y+p.size>=WORLD.H)}}
  bounds(p){if(p.mode===MODE.CUBE||p.mode===MODE.BALL){if(p.gravity>0&&p.y<0){p.y=0;p.vy=0;p.onGround=true}if(p.gravity<0&&p.y+p.size>WORLD.H){p.y=WORLD.H-p.size;p.vy=0;p.onGround=true}return true}return p.y>=0&&p.y+p.size<=WORLD.H}
  solidsOnly(){return(this.level.objects||[]).filter(o=>o.type===OBJECTS.BLOCK||o.type===OBJECTS.PLATFORM)}
  hazardsOnly(){return(this.level.objects||[]).filter(o=>o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE||o.type===OBJECTS.SAW)}
  solids(p){const b=hitbox(p);for(const o of this.solidsOnly()){if(!overlap(b,o))continue;const safeTop=p.gravity>0&&Math.abs(b.y-(o.y+o.h))<5;const safeBottom=p.gravity<0&&Math.abs(b.y+b.h-o.y)<5;if(!safeTop&&!safeBottom)return false}return true}
  hazards(p){const b=hitbox(p);for(const o of this.hazardsOnly()){if(o.type===OBJECTS.SAW){const cx=o.x+o.w/2,cy=o.y+o.h/2,dx=b.x+b.w/2-cx,dy=b.y+b.h/2-cy,r=o.w/2+b.w*.45;if(dx*dx+dy*dy<r*r)return false}else{const count=o.type===OBJECTS.DOUBLE?2:1;for(let i=0;i<count;i++){const r={x:o.x+i*40+5,y:o.y,w:Math.min(30,o.w-8),h:o.h};if(overlap(b,r))return false}}}return true}
  processPortals(){for(const p of this.players){const b=hitbox(p);for(const o of this.level.objects||[]){if(!['modePortal','gravityPortal','speedPortal','miniPortal','dualPortal'].includes(o.type)||!overlap(b,o))continue;const key=`${o.type}:${o.x}:${o.y}:${p.id}`;if(this.triggered.has(key))continue;this.triggered.add(key);if(o.type===OBJECTS.MODE_PORTAL)p.mode=o.mode||MODE.CUBE;if(o.type===OBJECTS.GRAVITY_PORTAL){p.gravity*=-1;p.vy=0;p.onGround=false}if(o.type===OBJECTS.SPEED_PORTAL)this.speed=clamp(Number(o.speed)||this.speed,WORLD.SPEED_MIN,WORLD.SPEED_MAX);if(o.type===OBJECTS.MINI_PORTAL){p.mini=!p.mini;p.size=p.mini?24:34}if(o.type===OBJECTS.DUAL_PORTAL)this.toggleDual()}}}
  toggleDual(){if(this.players.length===2){this.players.pop();return}const a=this.players[0],b=makePlayer(1,WORLD.H-a.y-a.size);b.x=a.x;b.mode=a.mode;b.gravity=-a.gravity;b.size=a.size;this.players.push(b)}
  updateDual(){if(this.players.length!==2)return;const a=this.players[0],b=this.players[1];b.x=a.x;b.mode=a.mode;b.gravity=-a.gravity;b.size=a.size;b.mini=a.mini;if(a.alive&&b.alive&&Math.abs(a.x-b.x)<1)b.y=clamp(WORLD.H-a.y-a.size,0,WORLD.H-b.size)}
  checkpoint(){const x=Math.floor(this.players[0].x/100)*100;this.checkpoint=x;if(!this.checkpoints.includes(x))this.checkpoints.push(x)}
  crash(){this.running=false;this.crashed=true;for(const p of this.players)p.alive=false}
  getProgress(){return clamp((this.players[0].x-100)/Math.max(1,this.level.length-100),0,1)}
}
