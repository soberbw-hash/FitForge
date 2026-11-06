/* ═══════════════════════════════════════════════════════════
   FitForge — 难度星级与热门度
   ---------------------------------------------------------------
   · 星级 = 动作库自带的难度字段（初级 1 星 / 中级 2 星 / 高级 3 星）
   · 热门度 = 只由「动作本身」的属性静态估算的通用 / 常见程度：
       是否复合动作、是否基础主项、参与肌群覆盖、器械易得度、要领完整度
     不含任何使用者数据：不读收藏、周计划、训练记录、浏览记录，
     不联网、不统计、不随时间变化 —— 任何人、任何设备看到的分数与排名完全一致。
     它是通用度估算，不是网站真实点击量或人气排行榜。
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
  let base = null;   // id -> 静态通用度分数，只算一次

  /* 纯属性打分：同一个动作在任何时候、任何账号下结果都相同 */
  function baseScore(ex) {
    const extra = (typeof EXERCISE_EXTRA !== 'undefined' && EXERCISE_EXTRA[ex.id]) || {};
    const tags = extra.g || [];
    const muscles = new Set([].concat(ex.primary || [], ex.secondary || []));
    let s = 24;
    if (ex.mechanic === 'compound') s += 10;                  // 多关节复合动作
    s += Math.min(muscles.size, 6) * 2.5;                     // 参与肌群覆盖
    s += EQUIP_HEAT[ex.equipment] != null ? EQUIP_HEAT[ex.equipment] : 4;
    if (CLASSIC_NAMES.has(ex.name)) s += 22;                  // 基础主项
    s -= Math.max(0, ex.name.length - 7) * 1.0;               // 名称越长的变式越小众
    s += Math.min((ex.steps || []).length, 8) * 1.2;          // 动作要领完整度
    if (tags.includes('居家可练')) s += 4;
    s += ({ beginner: 5, intermediate: 2, advanced: 0 }[ex.difficulty] || 0);
    if (ex.category === 'cardio') s += 3;
    return Math.max(1, Math.min(96, Math.round(s)));
  }

  function score(ex) {
    if (!ex) return 0;
    if (!base) {
      base = Object.create(null);
      EXERCISES.forEach(e => { base[e.id] = baseScore(e); });
    }
    return base[ex.id] != null ? base[ex.id] : baseScore(ex);
  }

  /* 兼容旧调用：热门度是静态的，没有任何需要重算或同步的东西 */
  function sync() {}

  return { score, sync };
})();

/* 卡片上的热门度小胶囊 */
function heatPillHTML(ex) {
  const n = FFHeat.score(ex);
  return `<span class="heat-pill" title="热门度 ${n}／100 · 按动作本身估算的通用程度，与你的训练数据无关"><span class="heat-lb">热</span>${n}</span>`;
}
