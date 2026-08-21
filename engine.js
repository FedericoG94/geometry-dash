export const MODE={CUBE:'cube',SHIP:'ship',BALL:'ball',UFO:'ufo',WAVE:'wave'};
export const OBJECTS={SPIKE:'spike',DOUBLE:'doubleSpike',BLOCK:'block',PLATFORM:'platform',SAW:'saw',PAD:'pad',RING:'ring',GRAVITY_RING:'gravityRing',MODE_PORTAL:'modePortal',GRAVITY_PORTAL:'gravityPortal',SPEED_PORTAL:'speedPortal',MINI_PORTAL:'miniPortal',DUAL_PORTAL:'dualPortal'};
export const WORLD={H:320,FLOOR:0,SPEED_MIN:120,SPEED_MAX:900};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const hitbox=p=>({x:p.x+4,y:p.y+4,w:p.size-8,h:p.size-8});
const makePlayer=id=>({id,x:100,y:WORLD.FLOOR,size:34,vy:0,gravity:1,mode:MODE.CUBE,onGround:true,alive:true,hold:false,mini:false,rotation:0});

export class GameEngine{
  constructor(level){this.level=level;this.resetState()}
  resetState(){this.players=[makePlayer(0)];this.speed=clamp(Number(this.level.speed)||285,WORLD.SPEED_MIN,WORLD.SPEED_MAX);this.running=false;this.completed=false;this.crashed=false;this.checkpoint=null;this.checkpoints=[];this.triggered=new Set();this.actions=new Set()}

  reset(startX=100,preserve=false){
    const cp=preserve?this.checkpoint:null;
    const cps=preserve?[...this.checkpoints]:[];
    this.players=[makePlayer(0)];
    const p=this.players[0];
    p.x=Math.max(100,startX);
    p.y=WORLD.FLOOR;
    p.vy=0;
    p.gravity=1;
    p.mode=MODE.CUBE;
    p.onGround=true;
    p.alive=true;
    this.speed=clamp(Number(this.level.speed)||285,WORLD.SPEED_MIN,WORLD.SPEED_MAX);
    this.running=true;
    this.completed=false;
    this.crashed=false;
    this.triggered.clear();
    this.actions.clear();
    this.checkpoint=cp;
    this.checkpoints=cps;
  }

  inputDown(){
    if(!this.running)return;
    for(const p of this.players){
      if(p.mode===MODE.CUBE&&p.onGround){p.vy=650*p.gravity;p.onGround=false}
      else if(p.mode===MODE.BALL&&p.onGround){p.gravity*=-1;p.vy=0;p.onGround=false}
      else if(p.mode===MODE.UFO){p.vy=600*p.gravity}
      else if(p.mode===MODE.SHIP||p.mode===MODE.WAVE)p.hold=true
    }
  }

  inputUp(){for(const p of this.players)p.hold=false}
  release(){this.inputUp()}

  step(dt){
    if(!this.running)return;
    for(const p of this.players)if(p.alive)this.move(p,dt);
    if(this.processPortals()){this.crash();return}
    for(const p of this.players){
      if(!p.alive)continue;
      if(!this.checkBounds(p)||!this.checkSolids(p)||!this.checkHazards(p)){this.crash();return}
    }
    this.syncDual();
    if(this.players[0].x>=this.level.length){this.running=false;this.completed=true}
  }

  move(p,dt){
    const oldY=p.y;
    p.x+=this.speed*dt;
    if(p.mode===MODE.WAVE){
      p.y+=(p.hold?1:-1)*p.gravity*430*(p.mini?2:1)*dt;
      p.onGround=false;
      return;
    }

    let acceleration;
    if(p.mode===MODE.SHIP)acceleration=p.gravity*(p.hold?1700:-1150);
    else acceleration=-p.gravity*(p.mode===MODE.UFO?1450:1800);
    p.vy=clamp(p.vy+acceleration*dt,-900,900);
    p.y+=p.vy*dt;
    this.resolveSurface(p,oldY);
  }

  resolveSurface(p,oldY){
    let landed=false;
    const b=hitbox(p);
    for(const o of this.solids()){
      if(b.x+b.w<=o.x||b.x>=o.x+o.w)continue;
      if(p.gravity>0){
        const top=o.y+o.h;
        if(oldY>=top&&p.y<=top&&p.vy<=0){p.y=top;p.vy=0;p.onGround=true;landed=true}
      }else{
        if(oldY+p.size<=o.y&&p.y+p.size>=o.y&&p.vy>=0){p.y=o.y-p.size;p.vy=0;p.onGround=true;landed=true}
      }
    }
    if(p.mode!==MODE.SHIP&&p.mode!==MODE.UFO&&p.mode!==MODE.WAVE&&!landed){
      if(p.gravity>0&&p.y<=WORLD.FLOOR){p.y=WORLD.FLOOR;p.vy=0;p.onGround=true}
      else if(p.gravity<0&&p.y+p.size>=WORLD.H){p.y=WORLD.H-p.size;p.vy=0;p.onGround=true}
      else p.onGround=false;
    }
  }

  checkBounds(p){
    if(p.mode===MODE.CUBE||p.mode===MODE.BALL){
      if(p.gravity>0&&p.y<WORLD.FLOOR){p.y=WORLD.FLOOR;p.vy=0;p.onGround=true}
      if(p.gravity<0&&p.y+p.size>WORLD.H){p.y=WORLD.H-p.size;p.vy=0;p.onGround=true}
      return true;
    }
    return p.y>=WORLD.FLOOR&&p.y+p.size<=WORLD.H;
  }

  solids(){return(this.level.objects||[]).filter(o=>o.type===OBJECTS.BLOCK||o.type===OBJECTS.PLATFORM)}
  hazards(){return(this.level.objects||[]).filter(o=>o.type===OBJECTS.SPIKE||o.type===OBJECTS.DOUBLE||o.type===OBJECTS.SAW)}

  checkSolids(p){
    const b=hitbox(p);
    for(const o of this.solids()){
      if(!overlap(b,o))continue;
      const safe=p.gravity>0?Math.abs(b.y-(o.y+o.h))<5:Math.abs(b.y+b.h-o.y)<5;
      if(!safe)return false;
    }
    return true;
  }

  checkHazards(p){
    const b=hitbox(p);
    for(const o of this.hazards()){
      if(o.type===OBJECTS.SAW){
        const cx=o.x+o.w/2,cy=o.y+o.h/2,dx=b.x+b.w/2-cx,dy=b.y+b.h/2-cy,r=o.w/2+b.w*.45;
        if(dx*dx+dy*dy<r*r)return false;
      }else{
        const n=o.type===OBJECTS.DOUBLE?2:1;
        for(let i=0;i<n;i++){
          const h={x:o.x+i*40+5,y:o.y,w:Math.min(30,o.w-8),h:o.h};
          if(overlap(b,h))return false;
        }
      }
    }
    return true;
  }

  processPortals(){
    const leader=this.players[0];
    const b=hitbox(leader);
    for(const o of this.level.objects||[]){
      if(![OBJECTS.MODE_PORTAL,OBJECTS.GRAVITY_PORTAL,OBJECTS.SPEED_PORTAL,OBJECTS.MINI_PORTAL,OBJECTS.DUAL_PORTAL].includes(o.type)||!overlap(b,o))continue;
      const k=`${o.type}:${o.x}:${o.y}`;
      if(this.triggered.has(k))continue;
      this.triggered.add(k);
      if(o.type===OBJECTS.MODE_PORTAL){for(const p of this.players){p.mode=o.mode||MODE.CUBE;p.vy=0;p.onGround=false}}
      else if(o.type===OBJECTS.GRAVITY_PORTAL){for(const p of this.players){p.gravity*=-1;p.vy=0;p.onGround=false}}
      else if(o.type===OBJECTS.SPEED_PORTAL)this.speed=clamp(Number(o.speed)||this.speed,WORLD.SPEED_MIN,WORLD.SPEED_MAX);
      else if(o.type===OBJECTS.MINI_PORTAL){for(const p of this.players){p.mini=!p.mini;p.size=p.mini?24:34;p.y=clamp(p.y,WORLD.FLOOR,WORLD.H-p.size)}}
      else if(o.type===OBJECTS.DUAL_PORTAL)this.toggleDual();
    }
    return false;
  }

  toggleDual(){
    if(this.players.length===2){this.players.pop();return}
    const a=this.players[0],b=makePlayer(1);
    b.x=a.x;b.mode=a.mode;b.gravity=-a.gravity;b.size=a.size;b.mini=a.mini;b.y=clamp(WORLD.H-a.y-a.size,WORLD.FLOOR,WORLD.H-b.size);this.players.push(b);
  }

  syncDual(){
    if(this.players.length!==2)return;
    const a=this.players[0],b=this.players[1];
    b.x=a.x;b.mode=a.mode;b.gravity=-a.gravity;b.size=a.size;b.mini=a.mini;b.y=clamp(WORLD.H-a.y-a.size,WORLD.FLOOR,WORLD.H-b.size);
  }

  checkpoint(){if(!this.running)return;const x=Math.floor(this.players[0].x/100)*100;if(!this.checkpoints.includes(x))this.checkpoints.push(x);this.checkpoint=x}
  crash(){this.running=false;this.crashed=true;this.players.forEach(p=>p.alive=false)}
  getProgress(){return clamp((this.players[0].x-100)/Math.max(1,this.level.length-100),0,1)}
}
