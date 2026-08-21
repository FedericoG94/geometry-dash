import { MODE, OBJECTS } from './engine.js';

export const make=(type,x,y=0,w=36,h=36,extra={})=>({type,x,y,w,h,...extra});

// Course design follows a simple playability rule: every mode transition
// has a clear reaction window and no immediate hazard at the entrance.
const stereo=[
  make(OBJECTS.SPIKE,900),make(OBJECTS.SPIKE,1300),make(OBJECTS.DOUBLE,1700),make(OBJECTS.BLOCK,2150,0,60,60),make(OBJECTS.PAD,2500,0,50,12),make(OBJECTS.SPIKE,2850),

  // SHIP: very wide central corridor; ceiling/floor saws are far apart.
  make(OBJECTS.MODE_PORTAL,3300,0,36,160,{mode:MODE.SHIP}),
  make(OBJECTS.SAW,4200,8,42,42),make(OBJECTS.SAW,4550,270,42,42),make(OBJECTS.SAW,4900,8,42,42),
  make(OBJECTS.MODE_PORTAL,5250,0,36,160,{mode:MODE.CUBE}),

  make(OBJECTS.SPIKE,5800),make(OBJECTS.DOUBLE,6200),
  make(OBJECTS.MODE_PORTAL,6700,0,36,160,{mode:MODE.BALL}),make(OBJECTS.SPIKE,7300),make(OBJECTS.GRAVITY_PORTAL,7650,0,36,160),
  make(OBJECTS.MODE_PORTAL,8100,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.PAD,8600,0,50,12),

  make(OBJECTS.MODE_PORTAL,9200,0,36,160,{mode:MODE.UFO}),make(OBJECTS.SPIKE,10100),
  make(OBJECTS.MODE_PORTAL,10800,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.SPIKE,11300),
  make(OBJECTS.MODE_PORTAL,12000,0,36,160,{mode:MODE.WAVE}),make(OBJECTS.SPIKE,13000,0,34,42),make(OBJECTS.SPIKE,13600,245,34,42),
  make(OBJECTS.MODE_PORTAL,14300,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.SPIKE,15000),make(OBJECTS.DOUBLE,15500),make(OBJECTS.SPIKE,16000)
];

const speedRun=[
  make(OBJECTS.SPIKE,900),make(OBJECTS.DOUBLE,1300),make(OBJECTS.BLOCK,1750,0,70,70),make(OBJECTS.SPIKE,2200),make(OBJECTS.PAD,2550,0,50,12),

  // SHIP: long, open straight-fly section before the next mode switch.
  make(OBJECTS.MODE_PORTAL,3100,0,36,160,{mode:MODE.SHIP}),
  make(OBJECTS.SAW,4050,8,40,40),make(OBJECTS.SAW,4550,272,40,40),make(OBJECTS.SAW,5050,8,40,40),
  make(OBJECTS.MODE_PORTAL,5400,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.SPIKE,6000),
  make(OBJECTS.GRAVITY_PORTAL,6500,0,36,160),make(OBJECTS.MODE_PORTAL,7000,0,36,160,{mode:MODE.BALL}),make(OBJECTS.SPIKE,7700),
  make(OBJECTS.GRAVITY_PORTAL,8050,0,36,160),make(OBJECTS.MODE_PORTAL,8500,0,36,160,{mode:MODE.UFO}),make(OBJECTS.SPIKE,9400),
  make(OBJECTS.MODE_PORTAL,10100,0,36,160,{mode:MODE.WAVE}),make(OBJECTS.SPIKE,11100),
  make(OBJECTS.MODE_PORTAL,11800,0,36,160,{mode:MODE.CUBE}),make(OBJECTS.MINI_PORTAL,12400,0,36,160),make(OBJECTS.SPIKE,13200),
  make(OBJECTS.MINI_PORTAL,13700,0,36,160),make(OBJECTS.DUAL_PORTAL,14300,0,36,160),make(OBJECTS.SPIKE,15200),make(OBJECTS.DUAL_PORTAL,15900,0,36,160),
  make(OBJECTS.DOUBLE,16400),make(OBJECTS.SPIKE,16800)
];

const practiceLab=[
  make(OBJECTS.SPIKE,1000),make(OBJECTS.PAD,1500,0,50,12),make(OBJECTS.SPIKE,2050),
  make(OBJECTS.MODE_PORTAL,2600,0,36,160,{mode:MODE.SHIP}),
  make(OBJECTS.SAW,3250,8,40,40),make(OBJECTS.SAW,3550,272,40,40),
  make(OBJECTS.MODE_PORTAL,4000,0,36,160,{mode:MODE.CUBE}),
  make(OBJECTS.MODE_PORTAL,4900,0,36,160,{mode:MODE.BALL}),make(OBJECTS.GRAVITY_PORTAL,5600,0,36,160),make(OBJECTS.MODE_PORTAL,6100,0,36,160,{mode:MODE.CUBE}),
  make(OBJECTS.MODE_PORTAL,7000,0,36,160,{mode:MODE.UFO}),make(OBJECTS.SPIKE,7900),
  make(OBJECTS.MODE_PORTAL,8600,0,36,160,{mode:MODE.WAVE}),make(OBJECTS.SPIKE,9700),
  make(OBJECTS.MODE_PORTAL,10300,0,36,160,{mode:MODE.CUBE})
];

export const LEVELS=[
  {id:'stereo-basics',name:'Stereo Basics',difficulty:'Normal',length:16600,speed:275,music:'beat',objects:stereo},
  {id:'speed-run',name:'Speed Run',difficulty:'Hard',length:17200,speed:320,music:'pulse',objects:speedRun},
  {id:'practice-lab',name:'Practice Lab',difficulty:'Easy',length:11200,speed:250,music:'calm',objects:practiceLab}
];

export function emptyLevel(){return{id:'custom',name:'Il mio livello',difficulty:'Custom',length:9000,speed:285,music:'beat',objects:[]}}
