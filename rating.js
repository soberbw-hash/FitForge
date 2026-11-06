/* ═══════════════════════════════════════════════════════════
   FitForge — 难度星级与站内热度
   ---------------------------------------------------------------
   全部由本地数据计算，没有任何联网统计、没有随机编造的人气值：
   · 星级 = 动作库自带的难度字段（初级 1 星 / 中级 2 星 / 高级 3 星）
   · 热度 = 动作通用度（复合、经典主项、肌群覆盖、器械易得、要领完整）
            + 你自己的使用频次（收藏 / 周计划 / 训练记录 / 详情查看）
   ═══════════════════════════════════════════════════════════ */

const DIFF_STARS = { beginner: 1, intermediate: 2, advanced: 3 };
function diffStarsOf(ex) { return DIFF_STARS[ex && ex.difficulty] || 1; }

/* 三格星级；实心为当前难度，空心补足三格 */
function starHTML(ex) {
  const n = diffStarsOf(ex);
  return `<span class="stars" aria-label="难度 ${n} 星">${'★'.repeat(n)}<i>${'☆'.repeat(3 - n)}</i></span>`;
}

/* 经典主项白名单：按动作库里实际存在的基础动作名精确匹配，
   不靠模糊关键词，避免「单腿深蹲 / 如厕式深蹲」这类小众变式混进热门榜 */
const CLASSIC_NAMES = new Set([
  '俯卧撑','引体向上','卷腹','波比跳','登山跑','开合跳跳','跳绳','俄罗斯转体',
  '死虫式','熊爬','农夫走','悬垂抬腿','全程平板','站姿提踵','壶铃摆荡','壶铃前蹲',
  '杠铃深蹲','杠铃前蹲','杠铃卧推','杠铃硬拉','杠铃弯举','杠铃臀桥','杠铃箭步蹲',
  '杠铃耸肩','杠铃登台阶','杠铃前平举','杠铃早安式',
  '哑铃深蹲','哑铃卧推','哑铃硬拉','哑铃推举','哑铃箭步蹲','哑铃侧平举',
  '哑铃飞鸟','哑铃前平举','哑铃耸肩','哑铃登台阶',
  '绳索下压','绳索下拉','绳索弯举','绳索硬拉','绳索卧推','绳索侧平举','绳索肩推','绳索耸肩',
  '弹力带深蹲','弹力带卧推','弹力带肩推','弹力带耸肩',
  'EZ杠弯举','蝴蝶式','杠铃俯身划船','哑铃俯身划船','绳索坐姿划船'
]);
const EQUIP_HEAT = {
  bodyweight: 14, dumbbell: 12, band: 9, barbell: 8,
  kettlebell: 6, cable: 5, machine: 4, smith: 3
};

const FFHeat = (() => {
  let base = null;      // id -> 通用度基准分
  let dyn = null;       // id -> 本地行为加权分
  let views = null;     // id -> 详情查看次数

  function readViews() {
    if (views) return views;
    try { views = JSON.parse(localStorage.getItem('ff_views') || '{}') || {}; }
    catch (e) { views = {}; }
    return views;
  }

  function baseScore(ex) {
    const extra = (typeof EXERCISE_EXTRA !== 'undefined' && EXERCISE_EXTRA[ex.id]) || {};
    const tags = extra.g || [];
    const muscles = new Set([].concat(ex.primary || [], ex.secondary || []));
    let s = 24;
    if (ex.mechanic === 'compound') s += 10;                  // 多关节复合动作，通用度更高
    s += Math.min(muscles.size, 6) * 2.5;                     // 参与肌群覆盖
    s += EQUIP_HEAT[ex.equipment] != null ? EQUIP_HEAT[ex.equipment] : 4;
    if (CLASSIC_NAMES.has(ex.name)) s += 22;                  // 基础主项
    s -= Math.max(0, ex.name.length - 7) * 1.0;               // 名称越长的变式越小众
    s += Math.min((ex.steps || []).length, 8) * 1.2;          // 动作要领完整度
    if (tags.includes('居家可练')) s += 4;
    s += ({ beginner: 5, intermediate: 2, advanced: 0 }[ex.difficulty] || 0);
    if (ex.category === 'cardio') s += 3;
    return Math.min(96, s);
  }

  function build() {
    if (base) return;
    base = {};
    EXERCISES.forEach(ex => { base[ex.id] = baseScore(ex); });
  }

  /* 每次筛选前重算本地行为分量（收藏、计划、训练、查看） */
  function sync() {
    build();
    const d = {};
    const add = (id, v) => { if (id) d[id] = (d[id] || 0) + v; };
    try { (state.favorites || []).forEach(id => add(id, 18)); } catch (e) {}
    try {
      Object.values(state.weeklyPlan || {}).forEach(day =>
        (day.exercises || []).forEach(it => add(it.id, 8)));
    } catch (e) {}
    try {
      (state.trainingLog || []).forEach(entry =>
        (entry.exercises || []).forEach(it => add(it.id, 6)));
    } catch (e) {}
    const v = readViews();
    Object.keys(v).forEach(id => add(id, Math.min(Number(v[id]) || 0, 10) * 1.5));
    dyn = d;
  }

  function score(ex) {
    if (!dyn) sync();
    return Math.max(1, Math.min(99, Math.round((base[ex.id] || 40) + (dyn[ex.id] || 0))));
  }

  function noteView(id) {
    const v = readViews();
    v[id] = Math.min((Number(v[id]) || 0) + 1, 99);
    try { localStorage.setItem('ff_views', JSON.stringify(v)); } catch (e) {}
    sync();
  }

  return { sync, score, noteView };
})();

/* 卡片上的热度小胶囊 */
function heatPillHTML(ex) {
  return `<span class="heat-pill" title="站内热度 ${FFHeat.score(ex)}／100 · 动作通用度 + 你的使用频次"><span class="heat-lb">热</span>${FFHeat.score(ex)}</span>`;
}
