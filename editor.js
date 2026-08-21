import { OBJECTS, MODE } from './engine.js';
import { emptyLevel } from './levels.js';
export class LevelEditor{
  constructor(canvas,save,load,onChange){this.c=canvas;this.save=save;this.load=load;this.onChange=onChange;this.level=load()||emptyLevel();this.type=OBJECTS.BLOCK;this.selected=null;this.drag=false}
  setType(type){this.type=type}
  pointer(e,camera,worldH,scale){const r=this.c.getBoundingClientRect();return{x:Math.max(0,Math.round((e.clientX-r.left+camera)/20)*20),y:Math.max(0,Math.round((worldH-(e.clientY-r.top))/scale/20)*20)}}
  down(e,camera,worldH,scale){const p=this.pointer(e,camera,worldH,scale);this.selected=this.level.objects.find(o=>p.x>=o.x&&p.x<=o.x+o.w&&p.y>=o.y&&p.y<=o.y+Math.max(20,o.h))||null;if(this.selected){this.drag=true;return}const portal=[OBJECTS.MODE_PORTAL,OBJECTS.GRAVITY_PORTAL,OBJECTS.SPEED_PORTAL,OBJECTS.MINI_PORTAL,OBJECTS.DUAL_PORTAL].includes(this.type);const solid=[OBJECTS.BLOCK,OBJECTS.PLATFORM].includes(this.type);const o={type:this.type,x:p.x,y:p.y,w:portal?34:solid?60:36,h:portal?120:this.type===OBJECTS.PAD?12:40};if(this.type===OBJECTS.MODE_PORTAL)o.mode=MODE.SHIP;if(this.type===OBJECTS.SPEED_PORTAL)o.speed=360;this.level.objects.push(o);this.selected=o;this.drag=true;this.onChange()}
  move(e,camera,worldH,scale){if(!this.drag||!this.selected)return;const p=this.pointer(e,camera,worldH,scale);this.selected.x=p.x;this.selected.y=p.y;this.onChange()}
  up(){this.drag=false}
  remove(){if(!this.selected)return;this.level.objects=this.level.objects.filter(o=>o!==this.selected);this.selected=null;this.onChange()}
  clear(){this.level=emptyLevel();this.selected=null;this.onChange()}
  persist(){this.level.length=Math.max(this.level.length,9000,...this.level.objects.map(o=>o.x+o.w));this.save(this.level)}
  export(){return JSON.stringify(this.level,null,2)}
}
