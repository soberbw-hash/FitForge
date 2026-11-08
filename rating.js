/* ═══════════════════════════════════════════════════════════
   FitForge — 难度星级与热门度
   ---------------------------------------------------------------
   · 星级   = 动作库无难度字段，按动作特征本地估算（1/2/3 星），已标注
   · 热门度 = 2026-11-07 联网调研的 6 份公开训练数据榜单，在构建期
             固化进 popularity.js 的静态结果：
               StrengthLog（70 万用户训练日志）/ Trainera（教练处方）
               BurnFit（繁中真实训练数据）/ Jefit（千万用户）
               SisuLift（自重动作）/ Age UK（民意调查）
             实证动作 ≥56 分并标注命中来源；榜单未覆盖的动作按
             同器械同肌群邻居推断，≤55 分并标注为推断值。
   · 完全静态：不联网、不实时更新、不随时间变化、不读取任何本机数据，
     任何人在任何设备看到的分数完全一致。
     它是跨源热度指数，不是本站点击量，也不是任何单一平台的占比。
   ═══════════════════════════════════════════════════════════ */

const DIFF_STARS = { beginner: 1, intermediate: 2, advanced: 3 };
function diffStarsOf(ex) { return DIFF_STARS[ex && ex.difficulty] || 1; }

/* 三格星级；实心为当前难度，空心补足三格 */
function starHTML(ex) {
  const n = diffStarsOf(ex);
  return `<span class="stars" aria-label="难度 ${n} 星">${'★'.repeat(n)}<i>${'☆'.repeat(3 - n)}</i></span>`;
}

const FFHeat = (() => {
  function table() { return typeof POPULARITY !== 'undefined' ? POPULARITY : null; }
  function srcMap() {
    const m = Object.create(null);
    if (typeof POP_SOURCES !== 'undefined') POP_SOURCES.forEach(s => { m[s.id] = s; });
    return m;
  }
  const sm = srcMap();

  /* 兜底：正常情况 1324 个动作全部在静态表里，这里只防数据缺失 */
  function fallback(ex) {
    const extra = (typeof EXERCISE_EXTRA !== 'undefined' && EXERCISE_EXTRA[ex.id]) || {};
    const tags = extra.g || [];
    let s = 24;
    if (ex.mechanic === 'compound') s += 8;
    s += Math.min(new Set([].concat(ex.primary || [], ex.secondary || [])).size, 6) * 2;
    s += Math.min((ex.steps || []).length, 8) * 1.2;
    if (tags.indexOf('居家可练') >= 0) s += 4;
    s -= Math.max(0, (ex.name || '').length - 8) * 0.9;
    return Math.max(10, Math.min(55, Math.round(s)));
  }

  function info(ex) {
    const empty = { score: 0, evidence: false, sources: [], approx: false };
    if (!ex) return empty;
    const t = table(), p = t && t[ex.id];
    if (!p) return { score: fallback(ex), evidence: false, sources: [], approx: false };
    return {
      score: p.s,
      evidence: !!p.k,
      sources: (p.r || []).map(id => sm[id]).filter(Boolean),
      approx: !!p.a
    };
  }

  function score(ex) { return info(ex).score; }
  /* 兼容旧调用：热门度是构建期死数据，运行时没有任何需要重算的东西 */
  function sync() {}
  function meta() { return typeof POP_META !== 'undefined' ? POP_META : null; }

  return { score, info, sync, meta };
})();

/* 卡片上的热门度小胶囊：实证动作多一个实心点，一眼可辨 */
function heatPillHTML(ex) {
  const i = FFHeat.info(ex);
  const label = i.evidence
    ? (i.sources.length ? i.sources.length + ' 份公开榜单实证' : '公开榜单实证')
    : '同类动作推断';
  const approx = i.approx ? ' · 同族近似' : '';
  const tip = `热门度 ${i.score}／100 · ${label}${approx}｜构建时固化，不联网、不随使用变化`;
  return `<span class="heat-pill${i.evidence ? ' is-evidence' : ''}" title="${tip}">`
    + (i.evidence ? '<i class="heat-dot"></i>' : '')
    + `<span class="heat-lb">热</span>${i.score}</span>`;
}

/* 详情弹窗里的来源小标签 */
function heatSourcesHTML(ex) {
  const i = FFHeat.info(ex);
  if (!i.evidence) return '<span class="hs-item hs-infer">同类动作推断</span>';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  return i.sources.map(s =>
    `<span class="hs-item" title="${esc(s.name)}｜${esc(s.sample)}">${esc(s.short)} ${esc(String(s.date).slice(0, 4))}</span>`
  ).join('') + (i.approx ? '<span class="hs-item hs-approx">同族近似</span>' : '');
}

/* 工具箱：完整来源清单（纯静态展示，点击打开原页面，不影响离线使用） */
function popularitySourcesHTML() {
  if (typeof POP_SOURCES === 'undefined') return '';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const m = FFHeat.meta();
  const rows = POP_SOURCES.map(s => `
    <a class="pop-src" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">
      <span class="pop-src-l"><b>${esc(s.short)}</b><small>${esc(s.date)} · 权重 ${s.w.toFixed(2)}</small></span>
      <span class="pop-src-r"><span>${esc(s.sample)}</span><small>${esc(s.metric)}</small></span>
    </a>`).join('');
  return `<p class="tool-note">${esc(m ? m.method : '')}</p>
    <div class="pop-src-list">${rows}</div>
    <p class="tool-note">${esc(m ? m.limitation : '')}</p>
    ${m ? `<p class="tool-note">调研于 ${esc(m.built)} 固化：${m.sources} 份来源 / ${m.boards} 张榜单 / ${m.rows} 条记录 → ${m.evidence} 个动作有实证，其余 ${m.inferred} 个标记为推断。本站运行时不联网。</p>` : ''}`;
}
