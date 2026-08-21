export const MODE={CUBE:'cube',SHIP:'ship',BALL:'ball',UFO:'ufo',WAVE:'wave'};
export const OBJECTS={SPIKE:'spike',DOUBLE:'doubleSpike',BLOCK:'block',PLATFORM:'platform',SAW:'saw',PAD:'pad',RING:'ring',GRAVITY_RING:'gravityRing',MODE_PORTAL:'modePortal',GRAVITY_PORTAL:'gravityPortal',SPEED_PORTAL:'speedPortal',MINI_PORTAL:'miniPortal',DUAL_PORTAL:'dualPortal'};
export const WORLD={H:320,FLOOR:0,SPEED_MIN:120,SPEED_MAX:900,SHIP_THRUST:1150,SHIP_DESCENT:760,SHIP_MAX_VY:520};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const hitbox=p=>({x:p.x+4,y:p.y+4,w:Math.max(2,p.size-8),h:Math.max(2,p.size-8)});
const makePlayer=id=>({id,x:100,y:WORLD.FLOOR,size:34,vy:0,gravity:1,mode:MODE.CUBE,onGround:true,alive:true,hold:false,inputBuffer:0,mini:false,rotation:0,portalGrace:0});

export class GameEngine{
  constructor(level){this.level=level;this.resetState()}
  resetState(){this.players=[makePlayer(0)];this.speed=clamp(Number(this.level.speed)||285,WORLD.SPEED_MIN,WORLD.SPEED_MAX);this.running=false;this.completed=false;this.crashed=false;this.checkpoint=null;this.checkpoints=[];this.triggered=new Set();this.actions=new Set()}
  reset(startX=100,preserve=false){const cp=preserve?this.checkpoint:null,cps=preserve?[...this.checkpoints]:[];this.players=[makePlayer(0)];const p=this.players[0];p.x=Math.max(100,startX);p.y=WORLD.FLOOR;p.vy=0;p.gravity=1;p.mode=MODE.CUBE;p.onGround=true;p.alive=true;p.hold=false;p.inputBuffer=0;p.mini=false;p.size=34;p.portalGrace=0;this.speed=clamp(Number(this.level.speed)||285,WORLD.SPEED_MIN,WORLD.SPEED_MAX);this.running=true;this.completed=false;this.crashed=false;this.triggered.clear();this.actions.clear();this.checkpoint=cp;this.checkpoints=cps}
  inputDown(){if(!this.running)return;for(const p of this.players){p.inputBuffer=.10;if(p.mode===MODE.CUBE){if(p.onGround){p.vy=650*p.gravity;p.onGround=false;p.inputBuffer=0}}else if(p.mode===MODE.BALL){if(p.onGround){p.gravity*=-1;p.vy=0;p.onGround=false;p.inputBuffer=0}}else if(p.mode===MODE.UFO){p.vy=600*p.gravity;p.onGround=false;p.inputBuffer=0}else if(p.mode===MODE.SHIP||p.mode===MODE.WAVE)p.hold=true}}}
  release(){for(const p of this.players)p.hold=false}
  step(dt){
    if(!this.running)return;
    const previousX=this.players[0]?.x||100;
    for(const p of this.players){if(!p.alive)continue;p.inputBuffer=Math.max(0,p.inputBuffer-dt);p.portalGrace=Math.max(0,p.portalGrace-dt);p.x+=this.speed*dt}
    this.processPortals(previousX,this.players[0]?.x||previousX);
    for(const p of this.players){if(!p.alive)continue;this.moveVertical(p,dt);if(!this.resolveSurfaces(p)||!this.checkBounds(p)||!this.checkHazards(p)){this.crash();return}this.processPadsAndRings(p);if(!this.checkBounds(p)){this.crash();return}}
    this.syncDual();
    if(this.players[0].x>=this.level.length){this.running=false;this.completed=true}
  }
  moveVertical(p,dt){
    if(p.portalGrace>0&&(p.mode===MODE.SHIP||p.mode===MODE.UFO||p.mode===MODE.WAVE)){p.onGround=false;return}
    if(p.mode===MODE.WAVE){const dir=p.hold?1:-1;p.y+=dir*p.gravity*430*(p.mini?2:1)*dt;p.onGround=false;return}
    let acceleration;
    if(p.mode===MODE.SHIP){
      const target=p.hold?WORLD.SHIP_MAX_VY:-WORLD.SHIP_MAX_VY;
      const rate=p.hold?WORLD.SHIP_THRUST:WORLD.SHIP_DESCENT;
      if(p.vy<target)p.vy=Math.min(target,p.vy+p.gravity*rate*dt);else if(p.vy>target)p.vy=Math.max(target,p.vy-p.gravity*rate*dt);
      p.vy=clamp(p.vy,-WORLD.SHIP_MAX_VY,WORLD.SHIP_MAX_VY);
    }else{
      acceleration=p.mode===MODE.UFO?-p.gravity*1450:-p.gravity*1800;
      p.vy=clamp(p.vy+acceleration*dt,-900,900);
    }
    p.y+=p.vy*dt;
  }
  resolveSurfaces(p){const b=hitbox(p);let landed=false;if(p.mode!==MODE.SHIP&&p.mode!==MODE.UFO&&p.mode!==MODE.WAVE){for(const o of this.solids()){if(b.x+b.w<=o.x||b.x>=o.x+o.w)continue;if(p.gravity>0){const top=o.y+o.h;if(p.y<=top&&p.y>=top-p.size-3&&p.vy<=0){p.y=top;p.vy=0;p.onGround=true;landed=true}}else{const bottom=o.y;if(p.y+p.size>=bottom&&p.y+p.size<=bottom+p.size+3&&p.vy>=0){p.y=bottom-p.size;p.vy=0;p.onGround=true;landed=true}}}if(p.gravity>0&&p.y<=WORLD.FLOOR){p.y=WORLD.FLOOR;p.vy=0;p.onGround=true;landed=true}if(p.gravity<0&&p.y+p.size>=WORLD.H){p.y=WORLD.H-p.size;p.vy=0;p.onGround=true;landed=true}}if(landed)return true;for(const o of this.solids()){if(!overlap(hitbox(p),o))continue;const hb=hitbox(p);const topContact=p.gravity>0&&Math.abs(hb.y-(o.y+o.h))<5;const bottomContact=p.gravity<0&&Math.abs(hb.y+hb.h-o.y)<5;if(!topContact&&!bottomContact)return false}return true}
  checkBounds(p){if(p.mode===MODE.CUBE||p.mode===MODE.BALL){if(p.gravity>0&&p.y<WORLD.FLOOR){p.y=WORLD.FLOOR;p.vy=0;p.onGround=true}if(p.gravity<0&&p.y+p.size>WORLD.H){p.y=WORLD.H-p.size;p.vy=0;p.onGround=true}return true}return p.y>=WORLD.FLOOR&&p.y+p.size<=WORLD.H}
  solids(){return(this.level.objects||[]).filter(o=>o.type===OBJECTS.BLOCK||o.type===OBJECTS.PLATFORM)}
  hazards(){return(this.level.objects||[]).filter(o=>o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE||o.type===OBJECTS.SAW)}
  checkHazards(p){if(p.portalGrace>0)return true;const b=hitbox(p);for(const o of this.hazards()){if(o.type===OBJECTS.SAW){const cx=o.x+o.w/2,cy=o.y+o.h/2,dx=b.x+b.w/2-cx,dy=b.y+b.h/2-cy,r=o.w/2+b.w*.45;if(dx*dx+dy*dy<r*r)return false}else{const n=o.type===OBJECTS.DOUBLE?2:1;for(let i=0;i<n;i++){const h={x:o.x+i*40+5,y:o.y,w:Math.min(30,o.w-8),h:o.h};if(overlap(b,h))return false}}}return true}
  processPortals(previousX,currentX){
    for(const o of this.level.objects||[]){if(![OBJECTS.MODE_PORTAL,OBJECTS.GRAVITY_PORTAL,OBJECTS.SPEED_PORTAL,OBJECTS.MINI_PORTAL,OBJECTS.DUAL_PORTAL].includes(o.type))continue;if(!(previousX<o.x&&currentX>=o.x))continue;const k=`${o.type}:${o.x}:${o.y}`;if(this.triggered.has(k))continue;this.triggered.add(k);
      if(o.type===OBJECTS.MODE_PORTAL){for(const p of this.players){p.mode=o.mode||MODE.CUBE;p.vy=0;p.onGround=false;p.inputBuffer=0;p.hold=false;p.portalGrace=.22;p.size=p.mini?24:34;if(p.mode===MODE.SHIP)p.y=160;else if(p.mode===MODE.UFO)p.y=155;else if(p.mode===MODE.WAVE)p.y=150;else p.y=clamp(p.y,WORLD.FLOOR,WORLD.H-p.size)}}
      else if(o.type===OBJECTS.GRAVITY_PORTAL){for(const p of this.players){p.gravity*=-1;p.vy=0;p.onGround=false;p.portalGrace=.08}}
      else if(o.type===OBJECTS.SPEED_PORTAL)this.speed=clamp(Number(o.speed)||this.speed,WORLD.SPEED_MIN,WORLD.SPEED_MAX);
      else if(o.type===OBJECTS.MINI_PORTAL){for(const p of this.players){p.mini=!p.mini;p.size=p.mini?24:34;p.y=clamp(p.y,0,WORLD.H-p.size);p.portalGrace=.08}}
      else if(o.type===OBJECTS.DUAL_PORTAL)this.toggleDual();
    }
  }
  processPadsAndRings(p){if(p.mode===MODE.WAVE||p.portalGrace>0)return;const b=hitbox(p);for(const o of this.level.objects||[]){if(!overlap(b,o))continue;const key=`${o.type}:${o.x}:${o.y}:${p.id}`;if(o.type===OBJECTS.PAD&&!this.actions.has(key)){const touchingSurface=p.onGround,descending=p.gravity>0?p.vy<0:p.vy>0;if(touchingSurface||descending){p.vy=p.gravity*760;p.onGround=false;this.actions.add(key)}}if((o.type===OBJECTS.RING||o.type===OBJECTS.GRAVITY_RING)&&p.inputBuffer>0&&!this.actions.has(key)){if(o.type===OBJECTS.RING)p.vy=p.gravity*700;else{p.gravity*=-1;p.vy=0;p.onGround=false}p.inputBuffer=0;this.actions.add(key)}}p.inputBuffer=0}
  toggleDual(){if(this.players.length===2){this.players.pop();return}const a=this.players[0],b=makePlayer(1);b.x=a.x;b.mode=a.mode;b.gravity=-a.gravity;b.size=a.size;b.mini=a.mini;b.y=clamp(WORLD.H-a.y-a.size,60,WORLD.H-b.size-60);b.portalGrace=.12;this.players.push(b)}
  syncDual(){if(this.players.length!==2)return;const a=this.players[0],b=this.players[1];b.x=a.x;b.mode=a.mode;b.gravity=-a.gravity;b.size=a.size;b.mini=a.mini;b.y=clamp(WORLD.H-a.y-a.size,0,WORLD.H-b.size);b.portalGrace=Math.max(0,b.portalGrace-.01)}
  checkpoint(){if(!this.running)return;const x=Math.floor(this.players[0].x/100)*100;if(!this.checkpoints.includes(x))this.checkpoints.push(x);this.checkpoint=x}
  crash(){this.running=false;this.crashed=true;this.players.forEach(p=>p.alive=false)}
  getProgress(){return clamp((this.players[0].x-100)/Math.max(1,this.level.length-100),0,1)}
}
