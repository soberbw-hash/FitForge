const fs = require('fs');
const { translateName } = require('./translate.js');

const raw = JSON.parse(fs.readFileSync('exercises_raw.json', 'utf8'));
const GIF_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/';

// ─── 器械映射 ───
/* 原始库有 28 种器械。之前把「额外负重 / 药球 / 瑞士球 / 战绳 / 泡沫轴」
   粗暴并进哑铃 / 壶铃 / 绳索 / 自重，器械筛选会张冠李戴，现按实物拆开。 */
const EQ_MAP = {
  'body weight':'bodyweight', 'weighted':'weighted',
  'barbell':'barbell', 'olympic barbell':'barbell',
  'ez barbell':'barbell', 'trap bar':'barbell',
  'dumbbell':'dumbbell', 'kettlebell':'kettlebell',
  'medicine ball':'medicine_ball',
  'stability ball':'stability_ball', 'bosu ball':'stability_ball',
  'roller':'roller', 'wheel roller':'roller',
  'rope':'rope', 'tire':'other', 'hammer':'other',
  'band':'band', 'resistance band':'band',
  'cable':'cable',
  'leverage machine':'machine', 'smith machine':'smith',
  'assisted':'machine', 'sled machine':'machine',
  'upper body ergometer':'machine', 'skierg machine':'machine',
  'stationary bike':'machine', 'elliptical machine':'machine',
  'stepmill machine':'machine',
};

// ─── 肌群映射 ───
/* target 里 upper back / spine / adductors / abductors 有明确解剖含义，
   旧版一律塞进 lats / quadriceps，现分别归上背 / 下背 / 髋部。 */
function mapPrimary(ex) {
  const cat = ex.category;
  const t = (ex.target || '').toLowerCase();
  switch(cat) {
    case 'chest': return 'chest';
    case 'back':
      if (t.includes('upper back')) return 'back';
      if (t.includes('spine')) return 'lower_back';
      return t.includes('trap') ? 'traps' : (t.includes('lower') ? 'lower_back' : 'lats');
    case 'shoulders': return 'shoulders';
    case 'upper arms': return t.includes('tricep') ? 'triceps' : 'biceps';
    case 'lower arms': return 'forearms';
    case 'upper legs':
      if (t.includes('adduct') || t.includes('abduct')) return 'glutes';  // 髋内收 / 外展
      if (t.includes('quad')) return 'quadriceps';
      if (t.includes('hamstring')) return 'hamstrings';
      if (t.includes('glute')) return 'glutes';
      return 'quadriceps';
    case 'lower legs': return 'calves';
    case 'waist': return t.includes('oblique') ? 'obliques' : 'abs';
    case 'cardio': return 'abs';   // 展示层改为「有氧全身」，肌群筛选时排除
    case 'neck': return 'traps';
    default: return 'abs';
  }
}
function mapSecondary(ex) {
  const result = [];
  /* 顺序敏感：长的复合词必须排在短词前，否则 upper back 会被 back 抢先命中 */
  const map = {
    'upper back':'back', 'lower back':'lower_back', 'erector':'lower_back',
    'biceps':'biceps', 'brachialis':'biceps',
    'brachioradialis':'forearms', 'triceps':'triceps',
    'pectorals':'chest', 'chest':'chest', 'serratus':'chest',
    'lats':'lats', 'latissimus':'lats',
    'traps':'traps', 'trapezius':'traps', 'rhomboids':'back',
    'sternocleidomastoid':'traps', 'levator':'traps',
    'shoulders':'shoulders', 'rear deltoid':'shoulders',
    'deltoid':'shoulders', 'rotator cuff':'shoulders',
    'quadriceps':'quadriceps', 'quads':'quadriceps',
    'hamstrings':'hamstrings', 'glutes':'glutes', 'gluteus':'glutes',
    'calves':'calves', 'gastrocnemius':'calves', 'soleus':'calves',
    'ankle stabilizers':'calves', 'ankles':'calves', 'feet':'calves', 'shins':'calves',
    'abs':'abs', 'abdominals':'abs', 'core':'abs', 'obliques':'obliques',
    'forearms':'forearms', 'wrist flexors':'forearms', 'wrist extensors':'forearms',
    'wrists':'forearms', 'hands':'forearms', 'grip muscles':'forearms',
    'hip flexors':'abs', 'groin':'quadriceps', 'inner thighs':'quadriceps',
    'adductor':'quadriceps', 'adductors':'quadriceps',
    'back':'back'
  };
  (ex.secondary_muscles || []).forEach(m => {
    const ml = String(m).toLowerCase();
    for (const [k,v] of Object.entries(map)) {
      if (ml.includes(k) && !result.includes(v)) { result.push(v); return; }
    }
  });
  return result.slice(0, 4);
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

/* 难度：原始动作库【没有难度字段】，只能本地按动作特征估算，UI 上已如实标注。
   旧版只按器械一刀切（自重全初级、杠铃全高级），会把引体向上标成 ★☆☆、
   杠铃弯举标成 ★★★。现按：拉伸 < 固定器械/简单自重 < 自由重量孤立 < 复合主项/高阶自重。 */
function inferDifficulty(ex, mech, zh) {
  const n = ((ex.name || '') + ' ' + (zh || '')).toLowerCase();
  const eq = ex.equipment;
  const STRETCH = /stretch|拉伸|伸展|放松|mobility|foam|warm.?up|热身/;
  const HARD = /引体|双杠|倒立|单腿|单臂|单侧|手枪|悬垂|龙旗|俄式|挺举|抓举|翻站|土耳其|跳箱|击掌|muscle.?up|pull.?up|chin.?up|\bdips?\b|pistol|one.?leg|single.?leg|one.?arm|single.?arm|unilateral|handstand|planche|front lever|back lever|dragon flag|hanging|kipping|clap|snatch|clean|thruster|turkish|box jump|plyo/;
  const BIG = /深蹲|硬拉|卧推|推举|划船|弓步|箭步|squat|deadlift|bench press|overhead press|military press|barbell row|lunge/;
  const FREE_EQ = /^(barbell|olympic barbell|ez barbell|trap bar|dumbbell|kettlebell|medicine ball|weighted|hammer)$/;
  const FIXED_EQ = /^(cable|band|resistance band|leverage machine|smith machine|assisted|sled machine|stationary bike|elliptical machine|stepmill machine|skierg machine|upper body ergometer|roller)$/;

  if (STRETCH.test(n)) return 'beginner';
  if (ex.category === 'cardio') return 'intermediate';       // 有氧动作普遍中等强度
  if (HARD.test(n)) return 'advanced';
  if (eq === 'wheel roller') return 'advanced';                          // 健腹轮
  if (eq === 'rope' || eq === 'stability ball' || eq === 'bosu ball') return 'intermediate';
  if (FREE_EQ.test(eq)) {
    if (mech === 'compound' && BIG.test(n)) return 'advanced';
    return 'intermediate';
  }
  if (FIXED_EQ.test(eq)) return 'beginner';
  return mech === 'compound' ? 'intermediate' : 'beginner';
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
const processed = raw.map(ex => {
  const zh = translateName(ex.name);
  const mech = inferMechanic(ex);
  return {
    id: ex.id,
    name: zh,                              // ← 中文名
    nameEn: ex.name,                       // ← 保留英文供搜索
    category: ex.category,
    equipment: EQ_MAP[ex.equipment] || 'machine',
    difficulty: inferDifficulty(ex, mech, zh),
    primary: [mapPrimary(ex)],
    secondary: mapSecondary(ex),
    force: inferForce(ex),
    mechanic: mech,
    restSec: inferRest(ex),
    repRange: inferReps(ex),
    setRange: inferSets(ex),
    gifUrl: 'gifs/' + ex.gif_url.replace(/^.*\//, ''),
    instructions: ex.instructions?.zh || ex.instructions?.en || '',
    steps: ex.instruction_steps?.zh || ex.instruction_steps?.en || [],
  };
});

const header = `/* FitForge — 健身动作数据库 (${processed.length} 动作 · 全中文) */
/* 数据: exercises-dataset · 媒体 © Gym visual */
/* 分类口径：部位 / 目标肌 / 器械 / 协同肌均取自原始库；原始库无难度字段，
   难度星级由 build_data.js 按动作特征本地估算，非官方评级。 */\n\n`;
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
  barbell:       { name: '杠铃',        type: 'free' },
  dumbbell:      { name: '哑铃',        type: 'free' },
  kettlebell:    { name: '壶铃',        type: 'free' },
  band:          { name: '弹力带',      type: 'free' },
  medicine_ball: { name: '药球',        type: 'free' },
  stability_ball:{ name: '平衡球',      type: 'free' },
  roller:        { name: '滚轮 / 泡沫轴', type: 'free' },
  rope:          { name: '绳类',        type: 'free' },
  other:         { name: '其它器械',    type: 'free' },
  cable:         { name: '绳索',        type: 'fixed' },
  machine:       { name: '训练机',      type: 'fixed' },
  smith:         { name: '史密斯机',    type: 'fixed' },
  bodyweight:    { name: '自重',        type: 'body' },
  weighted:      { name: '额外负重',    type: 'body' },
};
/* 器械大类：固定器械（轨迹固定）/ 自由器械（自由重量与辅助器械）/ 自重训练 */
const EQUIP_TYPES = {
  fixed: { name: '固定器械', desc: '轨迹固定，器械引导发力' },
  free:  { name: '自由器械', desc: '自由重量与辅助器械，需自主控制轨迹' },
  body:  { name: '自重训练', desc: '自重或额外负重，无需固定器械' },
};
function equipTypeOf(ex) {
  return (EQUIPMENT[ex && ex.equipment] || {}).type || 'body';
}
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
