/* 从 exercises_raw.json 生成 extra_data.js
 * 补上原数据集里已存在、但界面还没用起来的字段：
 * 具体目标肌/协同肌中文名、细分器械、身体部位、内容标签、搜索别名、版权归属
 * 全部本地生成，运行时无网络请求
 */
const fs = require('fs');
const vm = require('vm');
const raw = JSON.parse(fs.readFileSync('exercises_raw.json', 'utf8'));

// 中文动作名从已生成的 data.js 取（翻译引擎的结果）
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data.js', 'utf8') + ';globalThis.__E=EXERCISES;', ctx);
const ZH = {};
ctx.__E.forEach(e => { ZH[e.id] = e.name; });

const TARGET_ZH = {
  'abs': '腹直肌', 'quads': '股四头肌', 'lats': '背阔肌', 'calves': '小腿三头肌',
  'pectorals': '胸大肌', 'glutes': '臀大肌', 'hamstrings': '腘绳肌', 'adductors': '大腿内收肌',
  'triceps': '肱三头肌', 'cardiovascular system': '心肺系统', 'spine': '竖脊肌',
  'upper back': '上背肌群', 'biceps': '肱二头肌', 'delts': '三角肌', 'forearms': '前臂肌群',
  'traps': '斜方肌', 'serratus anterior': '前锯肌', 'abductors': '髋外展肌',
  'levator scapulae': '肩胛提肌'
};
const MUSCLE_ZH = {
  'hip flexors': '髋屈肌', 'obliques': '腹斜肌', 'hamstrings': '腘绳肌', 'biceps': '肱二头肌',
  'ankle stabilizers': '踝稳定肌', 'triceps': '肱三头肌', 'shoulders': '肩部', 'glutes': '臀部',
  'quadriceps': '股四头肌', 'chest': '胸部', 'calves': '小腿', 'forearms': '前臂',
  'lower back': '下背部', 'traps': '斜方肌', 'upper back': '上背部', 'ankles': '踝关节',
  'trapezius': '斜方肌', 'deltoids': '三角肌', 'core': '核心', 'rhomboids': '菱形肌',
  'rotator cuff': '肩袖', 'wrist flexors': '腕屈肌', 'wrist extensors': '腕伸肌',
  'latissimus dorsi': '背阔肌', 'abdominals': '腹部'
};
const PART_ZH = {
  waist: '腰腹', 'upper legs': '腿部', back: '背部', 'lower legs': '小腿', chest: '胸部',
  'upper arms': '手臂', cardio: '有氧', shoulders: '肩部', 'lower arms': '前臂', neck: '颈部'
};
const EQUIP_ZH = {
  'body weight': '自重', cable: '绳索', 'leverage machine': '固定器械', assisted: '辅助器械',
  'medicine ball': '药球', 'stability ball': '瑞士球', band: '弹力带', barbell: '杠铃',
  rope: '战绳', dumbbell: '哑铃', 'ez barbell': 'EZ 曲杆', 'sled machine': '雪橇机',
  'upper body ergometer': '上肢测功仪', kettlebell: '壶铃', 'olympic barbell': '奥林匹克杠铃',
  weighted: '额外负重', 'bosu ball': '平衡半球', 'resistance band': '弹力带', roller: '泡沫轴',
  'skierg machine': '滑雪机', hammer: '锤式器械', 'smith machine': '史密斯架',
  'wheel roller': '健腹轮', 'stationary bike': '动感单车', tire: '训练轮胎'
};

/* 中文同义词：让「推胸」「伏地挺身」之类的口语也能搜到 */
const SYN = [
  [/卧推|bench press/, ['胸推', '推胸']],
  [/俯卧撑|push.?up/, ['伏地挺身', '掌上压']],
  [/深蹲|squat/, ['蹲起', '蹲腿']],
  [/硬拉|deadlift/, ['拉起', '屈髋拉']],
  [/引体|pull.?up|chin.?up/, ['拉单杠', '引体']],
  [/划船|\brow\b|rowing/, ['拉背', '背部划船']],
  [/推举|press/, ['肩上推', '推肩']],
  [/弯举|curl/, ['二头弯举', '手臂弯举']],
  [/卷腹|仰卧起坐|crunch|sit.?up/, ['腹肌', '收腹']],
  [/平板支撑|plank/, ['核心支撑', '平板']],
  [/双杠臂屈伸|dip/, ['双杠', '臂屈伸']],
  [/臀桥|hip thrust|glute bridge/, ['顶髋', '翘臀']],
  [/弓步|箭步|lunge/, ['箭步蹲', '分腿蹲']],
  [/平板|plank/, ['静力支撑']],
  [/波比|burpee/, ['立卧撑']],
  [/壶铃|kettlebell/, ['壶铃摆荡']],
  [/拉伸|stretch/, ['放松', '柔韧']],
  [/跑步|treadmill|jog|run/, ['有氧', '跑步机']],
  [/单车|bike|cycle/, ['有氧', '骑行']]
];

const STOP = new Set(['with', 'and', 'the', 'on', 'a', 'of', 'to', 'in', 'for', 'at', 'one', 'two', 'v', '2', 'female', 'male', 'alternate', 'assisted']);

function tagsOf(r, en, zh) {
  const t = [];
  const eq = r.equipment || '';
  if (eq === 'body weight') t.push('自重');
  if (/^(body weight|band|resistance band|dumbbell|stability ball|roller|wheel roller|medicine ball)$/.test(eq)) t.push('居家可练');
  if (r.category === 'cardio' || /cardio|burpee|jumping|jump|run|jog|bike|ski|row|treadmill|climber|step/.test(en)) t.push('有氧燃脂');
  if (/stretch|mobility|foam|roll|flexor|extension/.test(en) || /拉伸|放松/.test(zh)) t.push('拉伸放松');
  if (/warm.?up|dynamic|activation/.test(en)) t.push('热身激活');
  if (/jump|plyo|explosive|power clean|snatch|swing|clap|burst/.test(en)) t.push('爆发力');
  if (/single|one arm|one leg|unilateral|bulgarian|alternate|side/.test(en) || /单侧|单腿|单臂|交替/.test(zh)) t.push('单侧训练');
  if (/plank|bridge|hold|static|isometric|hang|wall sit/.test(en)) t.push('静态保持');
  if (/abs|core|oblique|crunch|plank|sit.?up|twist/.test(en) || r.category === 'waist') t.push('核心');
  if (/squat|deadlift|press|row|pull.?up|bench|lunge/.test(en)) t.push('复合动作');
  if (/rehab|mobility|stabiliz|rotator|posture/.test(en)) t.push('康复稳定');
  if (/barbell|deadlift|squat|bench|press/.test(en) && !/band|body weight/.test(eq)) t.push('大重量');
  return [...new Set(t)];
}

function aliasesOf(r, en, zh) {
  const a = new Set();
  SYN.forEach(([re, words]) => { if (re.test(zh) || re.test(en)) words.forEach(w => a.add(w)); });
  // 英文关键词（去掉停用词），用于英文模糊搜索
  en.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/)
    .filter(w => w.length > 2 && !STOP.has(w)).slice(0, 8).forEach(w => a.add(w));
  // 中文名里的短词
  zh.replace(/[^\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(w => w.length >= 2 && w.length <= 4)
    .slice(0, 5).forEach(w => a.add(w));
  return [...a].slice(0, 18);
}

const out = {};
raw.forEach(r => {
  const en = String(r.name || '').toLowerCase();
  const zh = ZH[r.id] || '';
  out[r.id] = {
    t: TARGET_ZH[r.target] || r.target || '',
    s: (r.secondary_muscles || []).map(m => MUSCLE_ZH[m] || m).filter(Boolean),
    p: PART_ZH[r.category] || r.category || '',
    e: EQUIP_ZH[r.equipment] || r.equipment || '',
    g: tagsOf(r, en, zh),
    a: aliasesOf(r, en, zh),
    k: (r.equipment || '').replace(/\s+/g, '_')
  };
});

const body = '/* 动作数据增强层（本地生成，源自 exercises_raw.json） */\n'
  + 'const EXTRA_CREDIT = ' + JSON.stringify(raw[0].attribution || '© Gym visual') + ';\n'
  + 'const TARGET_ZH = ' + JSON.stringify(TARGET_ZH) + ';\n'
  + 'const MUSCLE_ZH = ' + JSON.stringify(MUSCLE_ZH) + ';\n'
  + 'const PART_ZH = ' + JSON.stringify(PART_ZH) + ';\n'
  + 'const EQUIP_ZH = ' + JSON.stringify(EQUIP_ZH) + ';\n'
  + 'const EXERCISE_EXTRA = ' + JSON.stringify(out) + ';\n';
fs.writeFileSync('extra_data.js', body, 'utf8');
console.log('extra_data.js:', (body.length / 1024).toFixed(0), 'KB,', Object.keys(out).length, '个动作');
const tagCount = {};
Object.values(out).forEach(x => x.g.forEach(t => tagCount[t] = (tagCount[t] || 0) + 1));
console.log('标签分布:', JSON.stringify(tagCount, null, 0));
