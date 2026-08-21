import { MODE, OBJECTS } from './engine.js';

export const make=(type,x,y=0,w=36,h=36,extra={})=>({type,x,y,w,h,...extra});

// Levels are deliberately authored with generous reaction windows.
// Every flight section has an open corridor before its first hazard.
const stereo=[
  make(OBJECTS.SPIKE,900),
  make(OBJECTS.SPIKE,1300),
  make(OBJECTS.DOUBLE,1700),
  make(OBJECTS.BLOCK,2150,0,60,60),
  make(OBJECTS.PAD,2500,0,50,12),
  make(OBJECTS.SPIKE,2750),

  make(OBJECTS.MODE_PORTAL,3100,0,34,120,{mode:MODE.SHIP}),
  make(OBJECTS.SAW,4050,70,42,42),
  make(OBJECTS.SAW,4350,210,42,42),
  make(OBJECTS.MODE_PORTAL,4750,0,34,120,{mode:MODE.CUBE}),

  make(OBJECTS.SPIKE,5250),
  make(OBJECTS.DOUBLE,5600),
  make(OBJECTS.MODE_PORTAL,6050,0,34,120,{mode:MODE.BALL}),
  make(OBJECTS.GRAVITY_RING,7000,120,28,28),
  make(OBJECTS.GRAVITY_PORTAL,7450,0,34,120),
  make(OBJECTS.MODE_PORTAL,7900,0,34,120,{mode:MODE.CUBE}),

  make(OBJECTS.SPIKE,8350),
  make(OBJECTS.PAD,8700,0,50,12),
  make(OBJECTS.MODE_PORTAL,9200,0,34,120,{mode:MODE.UFO}),
  make(OBJECTS.SPIKE,10150),
  make(OBJECTS.SPIKE,10600),
  make(OBJECTS.MODE_PORTAL,11150,0,34,120,{mode:MODE.WAVE}),
  make(OBJECTS.SPIKE,12100,0,34,42),
  make(OBJECTS.SPIKE,12600,244,34,42),
  make(OBJECTS.MODE_PORTAL,13200,0,34,120,{mode:MODE.CUBE}),

  make(OBJECTS.SPIKE,13800),
  make(OBJECTS.DOUBLE,14200),
  make(OBJECTS.PAD,14600,0,50,12),
  make(OBJECTS.SPIKE,15100),
  make(OBJECTS.DOUBLE,15500)
];

const speedRun=[
  make(OBJECTS.SPIKE,950),
  make(OBJECTS.DOUBLE,1350),
  make(OBJECTS.BLOCK,1750,0,70,70),
  make(OBJECTS.SPIKE,2200),
  make(OBJECTS.PAD,2500,0,50,12),

  make(OBJECTS.MODE_PORTAL,3000,0,34,120,{mode:MODE.SHIP}),
  make(OBJECTS.SAW,3900,55,42,42),
  make(OBJECTS.SAW,4400,225,42,42),
  make(OBJECTS.SAW,4900,55,42,42),
  make(OBJECTS.MODE_PORTAL,5350,0,34,120,{mode:MODE.CUBE}),

  make(OBJECTS.GRAVITY_PORTAL,5900,0,34,120),
  make(OBJECTS.SPIKE,6350,245,34,42),
  make(OBJECTS.SPIKE,6800),
  make(OBJECTS.MODE_PORTAL,7300,0,34,120,{mode:MODE.BALL}),
  make(OBJECTS.GRAVITY_RING,8050,100,28,28),
  make(OBJECTS.MODE_PORTAL,8550,0,34,120,{mode:MODE.UFO}),
  make(OBJECTS.SPIKE,9400),
  make(OBJECTS.DOUBLE,9850),
  make(OBJECTS.MODE_PORTAL,10400,0,34,120,{mode:MODE.WAVE}),
  make(OBJECTS.SPIKE,11400),
  make(OBJECTS.SPIKE,11900,245,34,42),
  make(OBJECTS.MODE_PORTAL,12500,0,34,120,{mode:MODE.CUBE}),
  make(OBJECTS.MINI_PORTAL,13050,0,34,120),
  make(OBJECTS.SPIKE,13600),
  make(OBJECTS.DUAL_PORTAL,14100,0,34,120),
  make(OBJECTS.PAD,14900,0,50,12),
  make(OBJECTS.DUAL_PORTAL,15500,0,34,120),
  make(OBJECTS.SPIKE,16100),
  make(OBJECTS.DOUBLE,16600)
];

const practiceLab=[
  make(OBJECTS.SPIKE,1200),
  make(OBJECTS.PAD,1650,0,50,12),
  make(OBJECTS.MODE_PORTAL,2300,0,34,120,{mode:MODE.SHIP}),
  make(OBJECTS.MODE_PORTAL,3500,0,34,120,{mode:MODE.CUBE}),
  make(OBJECTS.MODE_PORTAL,4500,0,34,120,{mode:MODE.BALL}),
  make(OBJECTS.GRAVITY_RING,5200,100,28,28),
  make(OBJECTS.MODE_PORTAL,5850,0,34,120,{mode:MODE.UFO}),
  make(OBJECTS.SPIKE,6900),
  make(OBJECTS.MODE_PORTAL,7600,0,34,120,{mode:MODE.WAVE}),
  make(OBJECTS.SPIKE,8700),
  make(OBJECTS.SPIKE,9200,245,34,42),
  make(OBJECTS.MODE_PORTAL,9800,0,34,120,{mode:MODE.CUBE})
];

export const LEVELS=[
  {id:'stereo-basics',name:'Stereo Basics',difficulty:'Normal',length:16000,speed:285,music:'beat',objects:stereo},
  {id:'speed-run',name:'Speed Run',difficulty:'Hard',length:17000,speed:340,music:'pulse',objects:speedRun},
  {id:'practice-lab',name:'Practice Lab',difficulty:'Easy',length:10500,speed:255,music:'calm',objects:practiceLab}
];

export function emptyLevel(){
  return {id:'custom',name:'Il mio livello',difficulty:'Custom',length:9000,speed:285,music:'beat',objects:[]};
}
