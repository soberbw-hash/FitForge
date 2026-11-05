const fs = require('fs');
const { translateName } = require('./translate.js');

const raw = JSON.parse(fs.readFileSync('exercises_raw.json', 'utf8'));
const GIF_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

// ─── 器械映射 ───
const EQ_MAP = {
  'body weight':'bodyweight', 'barbell':'barbell', 'olympic barbell':'barbell',
  'ez barbell':'barbell', 'trap bar':'barbell', 'dumbbell':'dumbbell',
  'cable':'cable', 'rope':'cable', 'leverage machine':'machine', 'smith machine':'smith',
  'assisted':'machine', 'sled machine':'machine', 'upper body ergometer':'machine',
  'skierg machine':'machine', 'stationary bike':'machine', 'elliptical machine':'machine',
  'stepmill machine':'machine', 'band':'band', 'resistance band':'band',
  'kettlebell':'kettlebell', 'medicine ball':'kettlebell', 'stability ball':'bodyweight',
  'bosu ball':'bodyweight', 'weighted':'dumbbell', 'roller':'bodyweight',
  'wheel roller':'bodyweight', 'hammer':'dumbbell', 'tire':'bodyweight',
};

// ─── 肌群映射 ───
function mapPrimary(ex) {
  const cat = ex.category;
  const t = (ex.target || '').toLowerCase();
  switch(cat) {
    case 'chest': return 'chest';
    case 'back': return t.includes('trap') ? 'traps' : (t.includes('lower') ? 'lower_back' : 'lats');
    case 'shoulders': return 'shoulders';
    case 'upper arms': return t.includes('tricep') ? 'triceps' : 'biceps';
    case 'lower arms': return 'forearms';
    case 'upper legs':
      if (t.includes('quad')) return 'quadriceps';
      if (t.includes('hamstring')) return 'hamstrings';
      if (t.includes('glute')) return 'glutes';
      return 'quadriceps';
    case 'lower legs': return 'calves';
    case 'waist': return t.includes('oblique') ? 'obliques' : 'abs';
    case 'cardio': return 'abs';
    case 'neck': return 'traps';
    default: return 'abs';
  }
}
function mapSecondary(ex) {
  const result = [];
  const map = {
    'biceps':'biceps','triceps':'triceps','pectorals':'chest','chest':'chest',
    'lats':'lats','latissimus':'lats','traps':'traps','trapezius':'traps',
    'shoulders':'shoulders','deltoid':'shoulders','quadriceps':'quadriceps',
    'quads':'quadriceps','hamstrings':'hamstrings','glutes':'glutes',
    'gluteus':'glutes','calves':'calves','abs':'abs','abdominals':'abs',
    'obliques':'obliques','forearms':'forearms','lower back':'lower_back',
    'erector':'lower_back','hip flexors':'abs','gastrocnemius':'calves',
    'brachioradialis':'forearms','serratus':'chest','rhomboids':'back',
    'rear deltoid':'shoulders','adductor':'quadriceps','adductors':'quadriceps',
  };
  (ex.secondary_muscles || []).forEach(m => {
    const ml = m.toLowerCase();
    for (const [k,v] of Object.entries(map)) {
      if (ml.includes(k) && !result.includes(v)) { result.push(v); return; }
    }
  });
  return result.slice(0, 3);
}

// ─── 发力 / 力学 / 训练参数 ───
function inferForce(ex) {
  const name = (ex.name || '').toLowerCase();
  const cat = ex.category;
  const target = (ex.target || '').toLowerCase();
  if (name.includes('press')||name.includes('push')||name.includes('dip')||
      name.includes('extension')||name.includes('raise')||name.includes('fly')||
      name.includes('crunch')||name.includes('sit-up')||name.includes('squat')||
      name.includes('lunge')||name.includes('leg press')||name.includes('calf raise')) return 'push';
  if (name.includes('pull')||name.includes('row')||name.includes('curl')||
      name.includes('chin')||name.includes('pulldown')||name.includes('shrug')||
      name.includes('deadlift')||name.includes('hyperextension')||name.includes('face pull')) return 'pull';
  if (name.includes('hold')||name.includes('plank')||name.includes('bridge')||
      name.includes('stretch')||name.includes('isometric')||name.includes('carry')) return 'static';
  if (cat === 'chest' || cat === 'shoulders') return 'push';
  if (cat === 'back') return 'pull';
  if (cat === 'upper arms') return target.includes('tricep') ? 'push' : 'pull';
  if (cat === 'upper legs') return 'push';
  if (cat === 'waist') return 'static';
  return 'push';
}
function inferMechanic(ex) {
  const name = (ex.name || '').toLowerCase();
  const cat = ex.category;
  if (name.includes('squat')||name.includes('deadlift')||name.includes('press')||
      name.includes('row')||name.includes('pull-up')||name.includes('chin')||
      name.includes('dip')||name.includes('lunge')||name.includes('clean')||
      name.includes('snatch')||name.includes('thruster')||name.includes('push-up')||
      name.includes('bench')||name.includes('military')||name.includes('overhead')) return 'compound';
  if (name.includes('curl')||name.includes('extension')||name.includes('raise')||
      name.includes('fly')||name.includes('lateral')||name.includes('kickback')||
      name.includes('crunch')||name.includes('leg curl')||name.includes('shrug')) return 'isolation';
  if (cat === 'chest' || cat === 'back' || cat === 'upper legs') return 'compound';
  return 'isolation';
}
function inferRest(ex) {
  const mech = inferMechanic(ex);
  const eq = ex.equipment;
  const diff = eq === 'body weight' ? 'beginner' :
    ['barbell','smith machine','olympic barbell'].includes(eq) ? 'advanced' : 'intermediate';
  if (mech === 'compound') return diff === 'advanced' ? 120 : 90;
  return 60;
}
function inferReps(ex) {
  if (ex.category === 'lower legs') return '15-20';
  return inferMechanic(ex) === 'compound' ? '6-10' : '10-15';
}
function inferSets(ex) {
  return inferMechanic(ex) === 'compound' ? '4' : '3';
}

// ─── 处理 ───
const processed = raw.map(ex => ({
  id: ex.id,
  name: translateName(ex.name),          // ← 中文名
  nameEn: ex.name,                       // ← 保留英文供搜索
  category: ex.category,
  equipment: EQ_MAP[ex.equipment] || 'machine',
  difficulty: ex.equipment === 'body weight' ? 'beginner' :
    ['barbell','smith machine','olympic barbell'].includes(ex.equipment) ? 'advanced' : 'intermediate',
  primary: [mapPrimary(ex)],
  secondary: mapSecondary(ex),
  force: inferForce(ex),
  mechanic: inferMechanic(ex),
  restSec: inferRest(ex),
  repRange: inferReps(ex),
  setRange: inferSets(ex),
  gifUrl: 'gifs/' + ex.gif_url.replace(/^.*\//, ''),
  instructions: ex.instructions?.zh || ex.instructions?.en || '',
  steps: ex.instruction_steps?.zh || ex.instruction_steps?.en || [],
}));

const header = `/* FitForge — 健身动作数据库 (${processed.length} 动作 · 全中文) */
/* 数据: exercises-dataset · 媒体 © Gym visual */\n\n`;
const defs = `const MUSCLE_GROUPS = {
  chest:      { name: '胸肌',     color: '#D4574E' },
  back:       { name: '背部',     color: '#C97C42' },
  lats:       { name: '背阔肌',   color: '#DE9155' },
  traps:      { name: '斜方肌',   color: '#D9707F' },
  lower_back: { name: '下背',     color: '#C9A03F' },
  shoulders:  { name: '肩部',     color: '#D9A93E' },
  biceps:     { name: '二头肌',   color: '#6FA85C' },
  triceps:    { name: '三头肌',   color: '#43A294' },
  forearms:   { name: '前臂',     color: '#559FB0' },
  abs:        { name: '腹肌',     color: '#5D89C4' },
  obliques:   { name: '腹斜肌',   color: '#7B76BE' },
  quadriceps: { name: '股四头肌', color: '#8C7CC4' },
  hamstrings: { name: '腘绳肌',   color: '#9E70C4' },
  glutes:     { name: '臀部',     color: '#BE63B4' },
  calves:     { name: '小腿',     color: '#CE6A94' },
};
const EQUIPMENT = {
  barbell:    { name: '杠铃' },
  dumbbell:   { name: '哑铃' },
  cable:      { name: '绳索' },
  machine:    { name: '固定器械' },
  bodyweight: { name: '自重' },
  kettlebell: { name: '壶铃' },
  band:       { name: '弹力带' },
  smith:      { name: '史密斯机' },
};
const DIFFICULTY = {
  beginner:     { name: '初级' },
  intermediate: { name: '中级' },
  advanced:     { name: '高级' },
};
const CATEGORY = {
  chest:'胸部', back:'背部', shoulders:'肩部', 'upper arms':'手臂',
  'lower arms':'前臂', 'upper legs':'腿部', 'lower legs':'小腿',
  waist:'腰腹', cardio:'有氧', neck:'颈部',
};
const FORCE = {
  push:   { name: '推' },
  pull:   { name: '拉' },
  static: { name: '静态' },
};
const MECHANIC = {
  compound:  { name: '复合', desc: '多关节参与' },
  isolation: { name: '孤立', desc: '单关节集中' },
};
`;

const tpl = fs.readFileSync('templates.js', 'utf8');
fs.writeFileSync('data.js', header + defs + '\nconst EXERCISES = ' + JSON.stringify(processed) + ';\n' + tpl, 'utf8');
console.log('data.js 已生成:', (fs.statSync('data.js').size/1024).toFixed(0), 'KB');
console.log('动作数:', processed.length);
console.log('样例:', processed[0].name, '|', processed[200].name, '|', processed[800].name);
