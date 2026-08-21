const KEY='gd_save_v1';
const DEFAULT={completed:{},best:{},attempts:{},skins:{unlocked:['cyan']},settings:{skin:'cyan',trail:'spark',autoCheckpoint:true}};
function clone(v){return JSON.parse(JSON.stringify(v))}
export function loadSave(){try{return {...clone(DEFAULT),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return clone(DEFAULT)}}
export function saveSave(data){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}}
export function loadEditor(){try{return JSON.parse(localStorage.getItem('gd_editor_v1')||'null')}catch{return null}}
export function saveEditor(data){try{localStorage.setItem('gd_editor_v1',JSON.stringify(data))}catch{}}
