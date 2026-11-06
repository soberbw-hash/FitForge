/* 动作分类核验：字段合法性、语义对应、器械大类覆盖、素材一一对应。
 * 纯 Node 运行，不依赖浏览器，结果可直接作为分类核对报告。
 */
const fs = require('fs');
const vm = require('vm');

function load(files, tail) {
  const s = {};
  vm.createContext(s);
  files.forEach(f => vm.runInContext(fs.readFileSync(f, 'utf8'), s));
  vm.runInContext(tail, s);
  return s;
}
const s = load(['data.js', 'extra_data.js'],
  'globalThis.__E=EXERCISES;globalThis.__EQ=EQUIPMENT;globalThis.__ET=EQUIP_TYPES;' +
  'globalThis.__MG=MUSCLE_GROUPS;globalThis.__CAT=CATEGORY;globalThis.__PZ=PART_ZH;');
const E = s.__E, EQ = s.__EQ, ET = s.__ET, MG = s.__MG, CAT = s.__CAT, PZ = s.__PZ;

let fail = 0;
const ok = (cond, label, detail) => {
  console.log((cond ? 'PASS ' : 'FAIL ') + label + (detail ? '  ' + detail : ''));
  if (!cond) fail++;
};

console.log('═══ 1. 数据完整性 ═══');
ok(E.length === 1324, '动作总数 1324', '实际 ' + E.length);
const uniq = new Set(E.map(e => e.id));
ok(uniq.size === E.length, 'ID 唯一', uniq.size + ' 个');
['equipment', 'category', 'difficulty', 'force', 'mechanic', 'primary',
 'gifUrl', 'instructions', 'steps', 'name', 'restSec', 'setRange', 'repRange'].forEach(k => {
  const n = E.filter(e => e[k] === undefined || e[k] === null || e[k] === '' ||
    (Array.isArray(e[k]) && !e[k].length)).length;
  ok(n === 0, '字段 ' + k + ' 无缺失', n ? n + ' 条缺失' : '');
});
const noSec = E.filter(e => !Array.isArray(e.secondary));
ok(!noSec.length, 'secondary 字段齐全（孤立动作允许为空）',
  noSec.length + ' 条结构异常');
const emptySec = E.filter(e => Array.isArray(e.secondary) && !e.secondary.length);
console.log('     无协同肌的孤立动作 ' + emptySec.length + ' 个：' +
  emptySec.slice(0, 6).map(e => e.name).join('、') + (emptySec.length > 6 ? ' 等' : ''));

console.log('\n═══ 2. 枚举值合法 ═══');
const badEq = E.filter(e => !EQ[e.equipment]);
const badCat = E.filter(e => !CAT[e.category]);
const badDiff = E.filter(e => !['beginner', 'intermediate', 'advanced'].includes(e.difficulty));
const badForce = E.filter(e => !['push', 'pull', 'static'].includes(e.force));
const badMech = E.filter(e => !['compound', 'isolation'].includes(e.mechanic));
const badPri = E.filter(e => !MG[e.primary[0]]);
const badSec = E.filter(e => e.secondary.some(m => !MG[m]));
ok(!badEq.length, 'equipment 全部在字典内');
ok(!badCat.length, 'category 全部在字典内');
ok(!badDiff.length && !badForce.length && !badMech.length, '难度/发力/类型枚举合法');
ok(!badPri.length, 'primary 全部是有效肌群');
ok(!badSec.length, 'secondary 全部是有效肌群');

console.log('\n═══ 3. 部位 → 目标肌 语义对应 ═══');
const allow = {
  waist: ['abs', 'obliques'], back: ['lats', 'traps', 'lower_back', 'back'],
  chest: ['chest'], shoulders: ['shoulders'],
  'upper arms': ['biceps', 'triceps'], 'lower arms': ['forearms'],
  'upper legs': ['quadriceps', 'hamstrings', 'glutes'], 'lower legs': ['calves'],
  cardio: ['abs', 'obliques', 'quadriceps', 'glutes', 'calves'], neck: ['traps']
};
const mismatch = E.filter(e => !(allow[e.category] || []).includes(e.primary[0]));
ok(!mismatch.length, '部位与目标肌全部语义对应',
  mismatch.length ? mismatch.slice(0, 5).map(e => e.id + ':' + e.category + '->' + e.primary[0]).join(' ') : '');
const cross = {};
E.forEach(e => { const k = e.category + ' → ' + MG[e.primary[0]].name; cross[k] = (cross[k] || 0) + 1; });
Object.entries(cross).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log('     ' + String(v).padStart(4) + '  ' + k));

console.log('\n═══ 4. 器械大类（固定 / 自由 / 自重） ═══');
const typeKeys = Object.keys(ET);
const badType = Object.entries(EQ).filter(([, v]) => !typeKeys.includes(v.type));
ok(!badType.length, '每种器械都归入一个大类', badType.map(([k]) => k).join(','));
const covered = E.filter(e => typeKeys.includes(equipType(e))).length;
ok(covered === E.length, '1324 个动作全部可筛', covered + '/' + E.length);
typeKeys.forEach(t => {
  const keys = Object.keys(EQ).filter(k => EQ[k].type === t);
  const n = E.filter(e => keys.includes(e.equipment)).length;
  console.log('     ' + String(n).padStart(4) + '  ' + ET[t].name + '（' + keys.map(k => EQ[k].name).join('/') + '）');
});

console.log('\n═══ 5. 肌肉地图 / 筛选命中 ═══');
const zero = Object.keys(MG).filter(k =>
  !E.some(e => e.primary.includes(k) || e.secondary.includes(k)));
ok(!zero.length, '15 个肌群筛选全部有结果', zero.length ? '空结果: ' + zero.join(',') : '');
console.log('     最少命中 ' + Math.min(...Object.keys(MG).map(k =>
  E.filter(e => e.primary.includes(k) || e.secondary.includes(k)).length)) + ' 个动作');

console.log('\n═══ 6. 中文分类一致性 ═══');
const catKeys = [...new Set(E.map(e => e.category))];
const noZh = catKeys.filter(k => !PZ[k]);
ok(!noZh.length, '所有部位都有中文名', noZh.join(','));
const diffZh = catKeys.filter(k => PZ[k] !== CAT[k]);
ok(!diffZh.length, 'PART_ZH 与 CATEGORY 译名统一', diffZh.map(k => k + ':' + PZ[k] + '/' + CAT[k]).join(' '));
ok(EQ.machine.name !== ET.fixed.name, '具体器械名不与大类重名',
  EQ.machine.name + ' vs ' + ET.fixed.name);

console.log('\n═══ 7. 素材与动作一一对应 ═══');
const dir = new Set(fs.readdirSync('gifs'));
const miss = E.filter(e => !dir.has(e.gifUrl.replace('gifs/', '')));
const extra = [...dir].filter(f => !E.some(e => e.gifUrl === 'gifs/' + f));
ok(!miss.length && !extra.length, '1324 个 GIF 与动作一一对应',
  '缺失 ' + miss.length + ' / 多余 ' + extra.length);
const cardio = E.filter(e => e.category === 'cardio');
console.log('     有氧动作 ' + cardio.length + ' 个（展示为「有氧全身」而非腹肌）');

function equipType(e) { return (EQ[e.equipment] || {}).type || 'body'; }

console.log('\n═══ 8. 原始库逐条反查（映射是否被改错） ═══');
const RAW = JSON.parse(fs.readFileSync('exercises_raw.json', 'utf8'));
const R = {}; RAW.forEach(r => { R[r.id] = r; });
const EbyId = {}; E.forEach(e => { EbyId[e.id] = e; });
const catBad = E.filter(e => !R[e.id] || R[e.id].category !== e.category);
ok(!catBad.length, '部位与原始库逐条一致', catBad.length + ' 条偏差');

/* 原始 28 种器械应当归入的大类 */
const EXPECT_TYPE = {
  'body weight':'body', 'weighted':'body',
  'barbell':'free', 'olympic barbell':'free', 'ez barbell':'free', 'trap bar':'free',
  'dumbbell':'free', 'kettlebell':'free', 'medicine ball':'free',
  'stability ball':'free', 'bosu ball':'free', 'roller':'free', 'wheel roller':'free',
  'rope':'free', 'tire':'free', 'hammer':'free', 'band':'free', 'resistance band':'free',
  'cable':'fixed', 'leverage machine':'fixed', 'smith machine':'fixed', 'assisted':'fixed',
  'sled machine':'fixed', 'upper body ergometer':'fixed', 'skierg machine':'fixed',
  'stationary bike':'fixed', 'elliptical machine':'fixed', 'stepmill machine':'fixed'
};
ok(Object.keys(EXPECT_TYPE).length === new Set(RAW.map(r => r.equipment)).size,
  '28 种原始器械全部登记', Object.keys(EXPECT_TYPE).length + ' 种');
const eqBad = RAW.filter(r => !EbyId[r.id] || EXPECT_TYPE[r.equipment] !== equipType(EbyId[r.id]));
ok(!eqBad.length, '原始器械 → 三大类归属正确',
  eqBad.slice(0, 5).map(r => r.id + ':' + r.equipment).join(' '));
[['medicine ball','medicine_ball'], ['rope','rope'], ['weighted','weighted'],
 ['stability ball','stability_ball'], ['body weight','bodyweight']].forEach(([rawEq, key]) => {
  const ids = RAW.filter(r => r.equipment === rawEq).map(r => r.id);
  ok(ids.length > 0 && ids.every(id => EbyId[id] && EbyId[id].equipment === key),
    '原始 ' + rawEq + ' → ' + key, ids.length + ' 条');
});

/* target 里过去被错并的取值 */
[['upper back','back'], ['spine','lower_back'], ['adductors','glutes'],
 ['abductors','glutes'], ['cardiovascular system','abs'],
 ['lats','lats'], ['pectorals','chest']].forEach(([t, p]) => {
  const bad = RAW.filter(r => r.target === t && (!EbyId[r.id] || EbyId[r.id].primary[0] !== p));
  ok(!bad.length, 'target=' + t + ' → ' + p, bad.length + ' 条错');
});
const emptySec2 = E.filter(e => !e.secondary.length).length;
ok(emptySec2 === 0, '协同肌词表完整（无空协同肌动作）', emptySec2 + ' 条为空');

/* 难度估算抽样：旧版把引体向上标初级、杠铃弯举标高级 */
const byName = n => E.find(e => e.name === n);
const pull = E.filter(e => /引体向上/.test(e.name) && e.equipment === 'bodyweight');
ok(pull.length > 0 && pull.every(e => e.difficulty === 'advanced'),
  '自重引体向上不再被标初级', pull.length + ' 条');
const curl = byName('杠铃弯举');
ok(!!curl && curl.difficulty !== 'advanced', '杠铃弯举不再被标高级',
  curl ? curl.difficulty : '未找到');

console.log('\n' + (fail ? '✗ 失败 ' + fail + ' 项' : '✓ 全部通过'));
process.exit(fail ? 1 : 0);
