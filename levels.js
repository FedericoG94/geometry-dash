import { MODE, OBJECTS } from './engine.js';

export const make=(type,x,y=0,w=36,h=36,extra={})=>({type,x,y,w,h,...extra});

// Deliberately generous layouts: every mode change has a clear recovery window.
const stereo=[
  make(OBJECTS.SPIKE,900),make(OBJECTS.SPIKE,1300),make(OBJECTS.DOUBLE,1700),make(OBJECTS.BLOCK,2150,0,60,60),make(OBJECTS.PAD,2500,0,50,12),make(OBJECTS.SPIKE,2850),
  make(OBJECTS.MODE_PORTAL,3300,0,36,160,{mode:MODE.SHIP}),
  make(OBJECTS.SAW,4200,220,42,42),make(OBJECTS.SAW,4550,45,42,42),
  make(OBJECTS.MODE_PORTAL,5050,0,36,160,{mode:MODE.CUBE}),
  make(OBJECTS.SPIKE,5600),make(OBJECTS.DOUBLE,6000),
  make(OBJECTS.MODE_PORTAL,6500,0,36,160,{mode:MODE.BALL}),make(OBJECTS.SPIKE,7100),
  make(OBJECTS.MODE_PORTAL,7700,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.PAD,8200,0,50,12),
  make(OBJECTS.MODE_PORTAL,8800,0,36,160,{mode:MODE.UFO}),make(OBJECTS.SPIKE,9600),
  make(OBJECTS.MODE_PORTAL,10300,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.SPIKE,10900),
  make(OBJECTS.MODE_PORTAL,11600,0,36,160,{mode:MODE.WAVE}),make(OBJECTS.SPIKE,12600),make(OBJECTS.SPIKE,13300,245,34,42),
  make(OBJECTS.MODE_PORTAL,14000,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.SPIKE,14700),make(OBJECTS.DOUBLE,15200),make(OBJECTS.SPIKE,15800)
];

const speedRun=[
  make(OBJECTS.SPIKE,900),make(OBJECTS.DOUBLE,1300),make(OBJECTS.BLOCK,1750,0,70,70),make(OBJECTS.SPIKE,2200),make(OBJECTS.PAD,2550,0,50,12),
  make(OBJECTS.MODE_PORTAL,3100,0,36,160,{mode:MODE.SHIP}),make(OBJECTS.SAW,4000,55,40,40),make(OBJECTS.SAW,4500,225,40,40),
  make(OBJECTS.MODE_PORTAL,5100,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.SPIKE,5700),
  make(OBJECTS.MODE_PORTAL,6300,0,36,160,{mode:MODE.BALL}),make(OBJECTS.SPIKE,7000),make(OBJECTS.MODE_PORTAL,7600,0,36,160,{mode:MODE.UFO}),
  make(OBJECTS.SPIKE,8500),make(OBJECTS.MODE_PORTAL,9200,0,36,160,{mode:MODE.WAVE}),make(OBJECTS.SPIKE,10200),
  make(OBJECTS.MODE_PORTAL,11000,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.MINI_PORTAL,11600,0,36,160),make(OBJECTS.SPIKE,12300),
  make(OBJECTS.MINI_PORTAL,12800,0,36,160),make(OBJECTS.DUAL_PORTAL,13400,0,36,160),make(OBJECTS.SPIKE,14300),make(OBJECTS.DUAL_PORTAL,15000,0,36,160),
  make(OBJECTS.DOUBLE,15600),make(OBJECTS.SPIKE,16200)
];

const practiceLab=[
  make(OBJECTS.SPIKE,1000),make(OBJECTS.PAD,1500,0,50,12),make(OBJECTS.SPIKE,2050),
  make(OBJECTS.MODE_PORTAL,2600,0,36,160,{mode:MODE.SHIP}),make(OBJECTS.MODE_PORTAL,3800,0,36,160,{mode:MODE.CUBE}),
  make(OBJECTS.MODE_PORTAL,4700,0,36,160,{mode:MODE.BALL}),make(OBJECTS.SPIKE,5400),make(OBJECTS.MODE_PORTAL,6100,0,36,160,{mode:MODE.CUBE}),
  make(OBJECTS.MODE_PORTAL,7000,0,36,160,{mode:MODE.UFO}),make(OBJECTS.SPIKE,7800),make(OBJECTS.MODE_PORTAL,8500,0,36,160,{mode:MODE.WAVE}),
  make(OBJECTS.SPIKE,9600),make(OBJECTS.MODE_PORTAL,10200,0,36,160,{mode:MODE.CUBE})
];

export const LEVELS=[
  {id:'stereo-basics',name:'Stereo Basics',difficulty:'Normal',length:16500,speed:275,music:'beat',objects:stereo},
  {id:'speed-run',name:'Speed Run',difficulty:'Hard',length:17000,speed:320,music:'pulse',objects:speedRun},
  {id:'practice-lab',name:'Practice Lab',difficulty:'Easy',length:11000,speed:250,music:'calm',objects:practiceLab}
];

export function emptyLevel(){
  return {id:'custom',name:'Il mio livello',difficulty:'Custom',length:9000,speed:285,music:'beat',objects:[]};
}
