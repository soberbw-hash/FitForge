/* 由 popularity_sources.js（人工核对过的公开榜单）生成 popularity.js
 * 纯离线构建，只在开发时跑一次；生成物是死数据，页面运行时不联网、不重算。
 * 用法：node build_popularity.js
 */
const fs = require('fs');
const vm = require('vm');
const { POP_SOURCES, POP_BOARDS, POP_UNMAPPED } = require('./popularity_sources.js');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data.js', 'utf8'), ctx);
const EX = JSON.parse(vm.runInContext('JSON.stringify(EXERCISES)', ctx));
const byId = Object.create(null);
EX.forEach(e => { byId[e.id] = e; });

const srcW = Object.create(null);
POP_SOURCES.forEach(s => { srcW[s.id] = s.w; });

/* ── 1. 先把所有榜单条目折算成每个动作的原始强度 ── */
const perSrc = Object.create(null);   // id -> { 来源 id: 该来源的最强贡献 }
const refs = Object.create(null);     // id -> Set(来源 id)
const approx = Object.create(null);   // id -> 是否为近似映射
const badIds = [];
let rowCount = 0, boardCount = 0;

function add(id, src, v) {
  if (!byId[id]) { badIds.push(id); return; }
  const m = perSrc[id] = perSrc[id] || Object.create(null);
  m[src] = Math.max(m[src] || 0, v);   // 同一来源多个榜单只取最强，避免重复计权
}

POP_BOARDS.forEach(board => {
  boardCount++;
  const vals = board.rows.map(r => board.kind === 'rank'
    ? (board.count - r[1] + 1) : r[1]);
  const maxV = Math.max.apply(null, vals);
  /* scale：同一份报告的补充榜沿用主榜标尺，避免小数值被独立放大 */
  const denom = board.scale || maxV;
  board.rows.forEach((row, i) => {
    rowCount++;
    const [label, , ids, note] = row;
    const nv = Math.min(1, vals[i] / denom);
    const contrib = srcW[board.src] * (0.35 + 0.65 * nv);
    ids.forEach((id, j) => {
      if (!byId[id]) { badIds.push(id + ' <- ' + label); return; }
      /* 主项全权重 / 同族近亲 0.45 / 近似映射再打 0.7 折 */
      const v = contrib * (j === 0 ? 1 : 0.45) * (note === '近似' ? 0.7 : 1);
      add(id, board.src, v);
      (refs[id] = refs[id] || new Set()).add(board.src);
      if (note === '近似') approx[id] = true;
    });
  });
});

/* ── 2. 同一动作在各来源里的最强贡献，留待第 3 步合成 ── */
const hitIds = Object.keys(perSrc);

/* ── 3. 分数合成 ──
   主锚 = 最强一份来源的榜内强度（0-1），决定主要排序，保证 StrengthLog
   这类大样本榜单的「卧推 > 深蹲 > 硬拉」顺序不被小榜单的反复合计冲掉。
   其余来源只给最多 6 分的印证加成。
   实证动作统一 ≥56 分，推断动作统一 ≤55 分，界限一眼可辨。 */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const parts = Object.create(null);
hitIds.forEach(id => {
  const vals = Object.keys(perSrc[id]).map(k => perSrc[id][k]);
  const mx = Math.max.apply(null, vals);
  parts[id] = { mx: mx, rest: vals.reduce((a, b) => a + b, 0) - mx };
});

const POP = Object.create(null);
hitIds.forEach(id => {
  const p = parts[id];
  const s = clamp(Math.round(56 + 40 * p.mx + Math.min(6, 2.5 * p.rest)), 56, 99);
  POP[id] = { s: s, k: 1, r: Array.from(refs[id]).sort(), a: approx[id] ? 1 : 0 };
});

/* ── 4. 榜单没覆盖到的动作：按「同器械 + 同主肌群」的命中邻居做同类推断 ──
   明确标 k:0，且分数上限 55，永远不会挤进有实据的热门榜 */
const groupHi = Object.create(null);
hitIds.forEach(id => {
  const e = byId[id];
  const g = e.equipment + '|' + (e.primary[0] || '-');
  groupHi[g] = Math.max(groupHi[g] || 0, POP[id].s);
});
const allScores = hitIds.map(id => POP[id].s).sort((a, b) => a - b);
const globalMedian = allScores[Math.floor(allScores.length / 2)] || 45;

let inferred = 0;
EX.forEach(e => {
  if (POP[e.id]) return;
  const g = e.equipment + '|' + (e.primary[0] || '-');
  const hi = groupHi[g] || globalMedian;
  const detail = Math.min((e.steps || []).length, 8) * 0.7;
  const longName = Math.max(0, (e.name || '').length - 8) * 0.9;
  const compound = e.mechanic === 'compound' ? 3 : 0;
  POP[e.id] = {
    s: clamp(Math.round(hi * 0.52 + detail - longName + compound), 10, 55),
    k: 0, r: [], a: 0
  };
  inferred++;
});

/* ── 5. 产物 ── */
const runtimeSources = POP_SOURCES.map(s => ({
  id: s.id, short: s.short, name: s.name, date: s.date,
  sample: s.sample, metric: s.metric, url: s.url, w: s.w, note: s.note
}));
const meta = {
  built: new Date().toISOString().slice(0, 10),
  sources: runtimeSources.length,
  boards: boardCount,
  rows: rowCount,
  evidence: hitIds.length,
  inferred: inferred,
  total: EX.length,
  method: '六份公开训练数据榜单按「最强来源的榜内强度」为主锚排序，其余来源最多加 6 分印证；实证动作 ≥56 分；榜单未覆盖动作按同器械同肌群邻居推断，≤55 分并标记为推断值',
  limitation: '跨来源口径不同（训练日志 / 教练编排 / 部位内占比 / 民意调查），合成结果是热度指数，不是任何单一平台的真实占比，也不是本站点击量；构建时固化，不会随时间变化'
};

const out = '/* FitForge 静态热门度 — 由 build_popularity.js 生成，请勿手改\n'
  + ' * 来源与方法见 popularity_sources.js / README.md\n'
  + ' * k=1 公开榜单实证 / k=0 同类动作推断；r=命中来源 id；a=近似映射\n'
  + ' * 纯静态数据，页面运行时不联网、不重算、不读取任何使用者数据\n */\n'
  + 'const POP_META = ' + JSON.stringify(meta, null, 2) + ';\n'
  + 'const POP_SOURCES = ' + JSON.stringify(runtimeSources, null, 2) + ';\n'
  + 'const POP_UNMAPPED = ' + JSON.stringify(POP_UNMAPPED, null, 2) + ';\n'
  + 'const POPULARITY = ' + JSON.stringify(POP) + ';\n';
fs.writeFileSync('popularity.js', out, 'utf8');

/* ── 6. 构建报告：所有数字可复现 ── */
console.log('=== 热门度构建报告 ===');
console.log('来源', runtimeSources.length, '| 榜单', boardCount, '| 条目', rowCount,
  '| 实证动作', hitIds.length, '| 推断动作', inferred, '| 合计', EX.length);
if (badIds.length) {
  console.log('X 无效 ID（必须修复）:', badIds.join(' , '));
  process.exitCode = 1;
} else console.log('✓ 全部榜单 ID 在动作库中存在');
console.log('产出 popularity.js', (fs.statSync('popularity.js').size / 1024).toFixed(0) + ' KB');
const top = EX.filter(e => POP[e.id].k === 1)
  .sort((a, b) => POP[b.id].s - POP[a.id].s).slice(0, 20);
console.log('--- 实证热门 Top 20 ---');
top.forEach((e, i) => console.log(' ', String(i + 1).padStart(2),
  String(POP[e.id].s).padStart(3), e.name.padEnd(18), POP[e.id].r.join('+')));
const dist = {};
EX.forEach(e => { const b = Math.floor(POP[e.id].s / 10) * 10; dist[b] = (dist[b] || 0) + 1; });
console.log('分数分布', JSON.stringify(dist));
console.log('范围', Math.min.apply(null, EX.map(e => POP[e.id].s)), '-',
  Math.max.apply(null, EX.map(e => POP[e.id].s)));
