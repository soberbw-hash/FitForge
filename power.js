/* ═══════════════════════════════════════════════════════════
 * 增强模块：工具箱 / 统计可视化 / 本地备份 / 交互打磨
 * 借鉴 openGym（1RM、杠铃片、热力图、PR、肌群覆盖）
 *      workout.cool（多条件筛选、随机挑动作）
 *      Strong / Hevy（引导式记录、进阶建议）
 * 全部本地计算，无任何网络请求
 * ═══════════════════════════════════════════════════════════ */

const TOOL_VIEWS = ['library', 'planner', 'musclemap', 'favorites', 'log', 'stats', 'tools'];
const TOOL_LABEL = { library: '动作库', planner: '周计划', musclemap: '肌肉地图', favorites: '收藏', log: '记录', stats: '概览', tools: '工具箱' };

/* ═════════ 工具箱 ═════════ */
function renderTools() {
  const box = document.getElementById('toolsBody');
  if (!box) return;
  box.innerHTML = `
  <div class="tool-grid">

    <section class="tool-card">
      <div class="tool-h"><span class="tool-ic">${ic('dumbbell')}</span><div><h3>1RM 极限重量估算</h3><p>用一组力竭成绩，估算一次能举起的最大重量</p></div></div>
      <div class="tool-form">
        <label>重量 <input type="number" id="rmW" value="60" min="1" step="2.5" oninput="calc1RM()"><span>kg</span></label>
        <label>次数 <input type="number" id="rmR" value="8" min="1" max="20" oninput="calc1RM()"><span>次</span></label>
      </div>
      <div id="rmOut"></div>
    </section>

    <section class="tool-card">
      <div class="tool-h"><span class="tool-ic">${ic('target')}</span><div><h3>杠铃片配重</h3><p>算出每边该挂哪些片，不用蹲在地上心算</p></div></div>
      <div class="tool-form">
        <label>目标 <input type="number" id="plW" value="100" min="10" step="2.5" oninput="calcPlates()"><span>kg</span></label>
        <label>杆重 <select id="plBar" onchange="calcPlates()"><option value="20">20kg 奥杆</option><option value="15">15kg 女杆</option><option value="10">10kg 短杆</option><option value="0">无杆</option></select></label>
      </div>
      <div id="plOut"></div>
    </section>

    <section class="tool-card">
      <div class="tool-h"><span class="tool-ic">${ic('flame')}</span><div><h3>身体数据与热量</h3><p>BMI · 基础代谢 · 每日消耗 · 三大营养素</p></div></div>
      <div class="tool-form four">
        <label>性别 <select id="bdSex" onchange="calcBody()"><option value="m">男</option><option value="f">女</option></select></label>
        <label>年龄 <input type="number" id="bdAge" value="28" min="10" max="90" oninput="calcBody()"></label>
        <label>身高 <input type="number" id="bdH" value="175" min="120" max="230" oninput="calcBody()"><span>cm</span></label>
        <label>体重 <input type="number" id="bdW" value="70" min="30" max="250" step="0.5" oninput="calcBody()"><span>kg</span></label>
      </div>
      <div class="tool-form"><label>活动量 <select id="bdAct" onchange="calcBody()">
        <option value="1.2">久坐 · 几乎不运动</option><option value="1.375" selected>轻度 · 每周 1-3 次</option>
        <option value="1.55">中度 · 每周 3-5 次</option><option value="1.725">高强度 · 每周 6-7 次</option>
        <option value="1.9">体力工作 / 双练</option></select></label></div>
      <div id="bdOut"></div>
    </section>

    <section class="tool-card">
      <div class="tool-h"><span class="tool-ic">${ic('zap')}</span><div><h3>心率区间</h3><p>按年龄估算最大心率与 5 个训练区间</p></div></div>
      <div class="tool-form"><label>年龄 <input type="number" id="hrAge" value="28" min="10" max="90" oninput="calcHR()"><span>岁</span></label></div>
      <div id="hrOut"></div>
    </section>

    <section class="tool-card">
      <div class="tool-h"><span class="tool-ic">${ic('chart')}</span><div><h3>训练容量计算</h3><p>组 × 次 × 重量，衡量一次训练做了多少功</p></div></div>
      <div class="tool-form three">
        <label>组数 <input type="number" id="volS" value="4" min="1" oninput="calcVol()"></label>
        <label>次数 <input type="number" id="volR" value="10" min="1" oninput="calcVol()"></label>
        <label>重量 <input type="number" id="volW" value="50" min="0" step="2.5" oninput="calcVol()"><span>kg</span></label>
      </div>
      <div id="volOut"></div>
    </section>

    <section class="tool-card">
      <div class="tool-h"><span class="tool-ic">${ic('download')}</span><div><h3>本地数据备份</h3><p>计划、记录、收藏、PR 全部导出成一个文件</p></div></div>
      <div class="backup-row">
        <button class="btn btn-solid" onclick="backupData()">${ic('download')}导出备份</button>
        <label class="btn btn-soft">${ic('rotate')}导入还原<input type="file" accept="application/json,.json" style="display:none" onchange="restoreData(this)"></label>
      </div>
      <p class="tool-note">文件只在本机生成，不上传任何服务器。换电脑或重装浏览器前记得导一份。</p>
      <div id="backupInfo"></div>
    </section>
  </div>`;
  ['calc1RM', 'calcPlates', 'calcBody', 'calcHR', 'calcVol'].forEach(f => { try { window[f](); } catch (e) {} });
  const bi = document.getElementById('backupInfo');
  if (bi) bi.innerHTML = `<p class="tool-note">当前数据：${state.trainingLog.length} 次训练 · ${state.favorites.length} 个收藏 · ${Object.keys(getPRs()).length} 个个人纪录</p>`;
}

function num(id, d) { const v = parseFloat(document.getElementById(id)?.value); return isFinite(v) ? v : d; }

function calc1RM() {
  const w = num('rmW', 60), r = num('rmR', 8), out = document.getElementById('rmOut');
  if (!out) return;
  const forms = [
    ['Epley', w * (1 + r / 30)],
    ['Brzycki', r < 37 ? w * 36 / (37 - r) : 0],
    ['Lombardi', w * Math.pow(r, 0.1)],
    ["O'Conner", w * (1 + r / 40)]
  ].filter(x => x[1] > 0);
  const avg = forms.reduce((s, x) => s + x[1], 0) / forms.length;
  const table = [[95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15]];
  out.innerHTML = `
    <div class="tool-big">${avg.toFixed(1)}<span>kg 估算 1RM</span></div>
    <div class="tool-mini">${forms.map(f => `${f[0]} ${f[1].toFixed(1)}kg`).join(' · ')}</div>
    ${r > 12 ? '<p class="tool-warn">次数超过 12 次，估算偏差较大，建议用 5-8 组的成绩重算。</p>' : ''}
    <div class="pct-table"><div class="pct-h"><span>强度</span><span>参考次数</span><span>训练重量</span></div>
    ${table.map(([p, reps]) => `<div><span>${p}%</span><span>约 ${reps} 次</span><b>${(avg * p / 100).toFixed(1)} kg</b></div>`).join('')}</div>`;
}

function calcPlates() {
  const target = num('plW', 100), bar = num('plBar', 20), out = document.getElementById('plOut');
  if (!out) return;
  const each = (target - bar) / 2;
  if (each < 0) { out.innerHTML = `<p class="tool-warn">目标重量比空杆还轻，检查一下输入。</p>`; return; }
  const plates = [25, 20, 15, 10, 5, 2.5, 1.25], res = [];
  let left = each;
  plates.forEach(p => { const n = Math.floor((left + 0.001) / p); if (n > 0) { res.push([p, n]); left = Math.round((left - n * p) * 100) / 100; } });
  const actual = bar + (each - left) * 2;
  out.innerHTML = `
    <div class="tool-big">${each.toFixed(2)}<span>kg / 每边</span></div>
    <div class="plate-row">${res.length ? res.map(([p, n]) => `<span class="plate" data-p="${p}">${p}<small>kg</small>${n > 1 ? `<i>×${n}</i>` : ''}</span>`).join('') : '<span class="tool-mini">只需空杆</span>'}</div>
    ${Math.abs(actual - target) > 0.01 ? `<p class="tool-warn">配不出精确 ${target}kg，最接近 ${actual.toFixed(1)}kg（每边余 ${left.toFixed(2)}kg）。</p>` : '<p class="tool-mini">可以精确配出目标重量。</p>'}`;
}

function calcBody() {
  const out = document.getElementById('bdOut');
  if (!out) return;
  const sex = document.getElementById('bdSex').value, age = num('bdAge', 28),
    h = num('bdH', 175), w = num('bdW', 70), act = num('bdAct', 1.375);
  const bmi = w / Math.pow(h / 100, 2);
  const bmiTxt = bmi < 18.5 ? '偏瘦' : bmi < 24 ? '正常' : bmi < 28 ? '超重' : '肥胖';
  const bmr = 10 * w + 6.25 * h - 5 * age + (sex === 'm' ? 5 : -161);
  const tdee = bmr * act;
  const prot = Math.round(w * 1.8), fat = Math.round(w * 0.8), carb = Math.round((tdee - prot * 4 - fat * 9) / 4);
  out.innerHTML = `
    <div class="tool-metrics">
      <div><b>${bmi.toFixed(1)}</b><span>BMI · ${bmiTxt}</span></div>
      <div><b>${Math.round(bmr)}</b><span>基础代谢 kcal</span></div>
      <div><b>${Math.round(tdee)}</b><span>每日消耗 kcal</span></div>
    </div>
    <div class="pct-table"><div class="pct-h"><span>目标</span><span>每日热量</span><span>建议</span></div>
      <div><span>减脂</span><b>${Math.round(tdee * 0.8)} kcal</b><span>每周约 -0.5kg</span></div>
      <div><span>维持</span><b>${Math.round(tdee)} kcal</b><span>体重基本不变</span></div>
      <div><span>增肌</span><b>${Math.round(tdee * 1.1)} kcal</b><span>配合渐进超负荷</span></div>
    </div>
    <div class="macro"><span>蛋白 <b>${prot}g</b></span><span>脂肪 <b>${fat}g</b></span><span>碳水 <b>${Math.max(0, carb)}g</b></span></div>`;
}

function calcHR() {
  const out = document.getElementById('hrOut'); if (!out) return;
  const age = num('hrAge', 28), max = 220 - age;
  const zones = [['Z1 恢复', .5, .6, '热身 / 放松'], ['Z2 有氧', .6, .7, '燃脂基础'], ['Z3 耐力', .7, .8, '心肺提升'], ['Z4 阈值', .8, .9, '高强度间歇'], ['Z5 极限', .9, 1, '短时冲刺']];
  out.innerHTML = `<div class="tool-big">${max}<span>次/分 · 估算最大心率</span></div>
    <div class="pct-table"><div class="pct-h"><span>区间</span><span>心率范围</span><span>用途</span></div>
    ${zones.map(([n, a, b, u]) => `<div><span>${n}</span><b>${Math.round(max * a)}-${Math.round(max * b)}</b><span>${u}</span></div>`).join('')}</div>
    <p class="tool-note">公式 220 − 年龄为粗略估算，实际最大心率因人而异。</p>`;
}

function calcVol() {
  const out = document.getElementById('volOut'); if (!out) return;
  const s = num('volS', 4), r = num('volR', 10), w = num('volW', 50);
  const v = s * r * w;
  out.innerHTML = `<div class="tool-big">${Math.round(v).toLocaleString('zh-CN')}<span>kg · 本次训练容量</span></div>
    <p class="tool-mini">${s} 组 × ${r} 次 × ${w}kg　·　自重动作建议按「次数 × 组数」单独衡量</p>`;
}

/* ═════════ 本地备份 ═════════ */
function backupData() {
  const data = {
    app: 'FitForge', version: 2, exported: new Date().toISOString(),
    plan: state.weeklyPlan, favorites: state.favorites, log: state.trainingLog,
    pr: getPRs(), theme: document.documentElement.dataset.theme
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'FitForge_备份_' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast('备份文件已保存到下载目录');
}
function restoreData(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const d = JSON.parse(fr.result);
      if (d.app !== 'FitForge') throw new Error('不是 FitForge 备份文件');
      if (!confirm('导入会替换当前的周计划、记录、收藏和 PR。\n建议先导出一份当前备份，确定继续吗？')) return;
      const before = {
        plan: JSON.parse(JSON.stringify(state.weeklyPlan)),
        favs: state.favorites.slice(), log: state.trainingLog.slice(),
        pr: JSON.parse(JSON.stringify(getPRs()))
      };
      const refresh = () => { try { renderWeek(); renderGrid(); renderFavorites(); renderLogView(); renderStats(); updateFavCount(); renderTools(); } catch (e) {} };
      if (d.plan) { state.weeklyPlan = d.plan; ssSet('ff_plan', d.plan); }
      if (Array.isArray(d.favorites)) { state.favorites = d.favorites; ssSet('ff_favs', d.favorites); }
      if (Array.isArray(d.log)) { state.trainingLog = d.log; ssSet('ff_log', d.log); }
      if (d.pr) savePRs(d.pr);
      refresh();
      toast('数据已还原：' + (d.log || []).length + ' 次训练', 'ok', {
        label: '撤销',
        fn: () => {
          state.weeklyPlan = before.plan; state.favorites = before.favs; state.trainingLog = before.log;
          ssSet('ff_plan', before.plan); ssSet('ff_favs', before.favs); ssSet('ff_log', before.log);
          savePRs(before.pr); refresh(); toast('已恢复导入前的数据');
        }
      });
    } catch (e) { toast('导入失败：' + e.message, 'err'); }
    input.value = '';
  };
  fr.readAsText(f);
}

/* ═════════ 统计增强 ═════════ */
function renderStatsExtra() {
  const box = document.getElementById('statsExtra');
  if (!box) return;
  const logs = state.trainingLog || [];
  const byDate = {};
  logs.forEach(e => {
    const d = e.timestamp ? new Date(e.timestamp) : new Date(e.date);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    if (!byDate[k]) byDate[k] = { sets: 0, vol: 0 };
    (e.exercises || []).forEach(x => {
      const s = parseInt(x.sets) || 0;
      byDate[k].sets += s;
      byDate[k].vol += (e.volume || 0) ? 0 : s * (parseInt(x.reps) || 0) * (parseFloat(x.weight) || 0);
    });
    if (e.volume) byDate[k].vol += e.volume;
  });

  // 年度热力图（最近 26 周，按周排列）
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = [];
  for (let i = 181; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const v = byDate[k];
    const lv = !v ? 0 : v.sets >= 20 ? 4 : v.sets >= 14 ? 3 : v.sets >= 8 ? 2 : 1;
    cells.push(`<i class="hm lv${lv}" title="${k} · ${v ? v.sets + ' 组 / ' + Math.round(v.vol) + 'kg' : '休息'}"></i>`);
  }

  // 近 8 周容量
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const end = new Date(today.getTime() - i * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    let vol = 0, sets = 0, n = 0;
    logs.forEach(e => {
      const t = e.timestamp ? new Date(e.timestamp) : new Date(e.date);
      if (t >= start && t < end) { vol += e.volume || 0; n++; (e.exercises || []).forEach(x => sets += parseInt(x.sets) || 0); }
    });
    weeks.push({ label: (end.getMonth() + 1) + '/' + end.getDate(), vol, sets, n });
  }
  const maxVol = Math.max(1, ...weeks.map(w => w.vol));

  // PR 榜（从记录算 e1RM / 最大重量）
  const prs = getPRs(), best = {};
  logs.forEach(e => (e.exercises || []).forEach(x => {
    const w = parseFloat(x.weight) || 0, r = parseInt(x.reps) || 0;
    if (!w) return;
    const score = e1rm(w, r);
    if (!best[x.id] || score > best[x.id].score) best[x.id] = { name: x.name || x.id, w, r, score, date: e.date };
  }));
  Object.entries(prs).forEach(([id, p]) => {
    if (!best[id] || p.e1rm > best[id].score) best[id] = {
      name: (EXERCISES.find(e => e.id === id) || {}).name || id,
      w: p.weight, r: p.reps, score: p.e1rm || e1rm(p.weight, p.reps), date: p.date
    };
  });
  const prList = Object.values(best).sort((a, b) => b.score - a.score).slice(0, 8);

  // 本周未覆盖肌群
  const covered = new Set();
  DAYS.forEach(d => (state.weeklyPlan[d]?.exercises || []).forEach(it => {
    const ex = EXERCISES.find(e => e.id === it.id);
    if (ex) { ex.primary.forEach(m => covered.add(m)); ex.secondary.forEach(m => covered.add(m)); }
  }));
  const missing = Object.entries(MUSCLE_GROUPS).filter(([k]) => !covered.has(k)).map(([, v]) => v.name);
  const totalVol = logs.reduce((s, e) => s + (e.volume || 0), 0);
  const totalMin = logs.reduce((s, e) => s + (e.duration || 0), 0);

  const volT = totalVol >= 1000;
  const volText = totalVol ? (volT ? (totalVol / 1000).toFixed(1) : Math.round(totalVol)) : '—';
  const volUnit = volT ? 't' : 'kg';

  box.innerHTML = `
    ${logs.length ? `
    <div class="stat-mini-row">
      <div><b>${logs.length}</b><span>累计训练</span></div>
      <div><b>${totalMin}</b><span>训练分钟</span></div>
      <div><b>${volText}${totalVol ? `<small>${volUnit}</small>` : ''}</b><span>累计容量</span></div>
      <div><b>${prList.length}</b><span>有 PR 动作</span></div>
    </div>
    <div class="chart-card">
      <h3>训练热力图 <span class="chart-sub">最近 26 周 · 颜色越深练得越多</span></h3>
      <div class="heatmap">${cells.join('')}</div>
      <div class="hm-legend">少 <i class="hm lv0"></i><i class="hm lv1"></i><i class="hm lv2"></i><i class="hm lv3"></i><i class="hm lv4"></i> 多</div>
    </div>
    <div class="chart-card">
      <h3>近 8 周训练容量 <span class="chart-sub">${volUnit}</span></h3>
      <div class="wchart">${weeks.map(w => `<div class="wcol" title="${w.label} · ${w.n} 次训练 / ${Math.round(w.vol)}kg">
        <div class="wbar-wrap"><div class="wbar" style="height:${Math.max(w.vol ? 6 : 2, w.vol / maxVol * 100)}%"></div></div>
        <span>${w.label}</span></div>`).join('')}</div>
    </div>` : `
    <div class="stats-empty">
      <span class="se-ic">${ic('chart')}</span>
      <div class="se-txt"><b>还没有训练数据</b><p>练完一次，这里会出现热力图、容量曲线和个人纪录。</p></div>
      <button class="btn btn-solid btn-sm" onclick="startSession()">${ic('play')}开始训练</button>
    </div>`}
    <div class="two-col">
      <div class="chart-card"><h3>个人纪录 PR</h3>
        ${prList.length ? prList.map((p, i) => `<div class="pr-row"><b>${String(i + 1).padStart(2, '0')}</b><span>${p.name}</span><em>${p.w}kg × ${p.r}</em><i>e1RM ${p.score}kg</i></div>`).join('')
          : '<p class="tool-note">跟练时填上重量，系统会自动记下每个动作的最佳成绩。</p>'}
      </div>
      <div class="chart-card"><h3>本周肌群覆盖</h3>
        <p class="tool-note">已覆盖 ${covered.size} / ${Object.keys(MUSCLE_GROUPS).length} 个肌群</p>
        ${missing.length ? `<div class="miss-tags">${missing.map(m => `<span>${m}</span>`).join('')}</div><p class="tool-note">这些肌群本周还没练到，可以补一两个动作。</p>`
          : '<p class="tool-note ok">全部肌群都有练到，安排很均衡。</p>'}
      </div>
    </div>`;
}

/* ═════════ 筛选与搜索增强 ═════════ */
function fuzzyHit(text, q) {
  if (!q) return true;
  if (text.includes(q)) return true;
  // 子序列匹配：推胸 → 杠铃推举胸 / 卧推
  let i = 0;
  for (let j = 0; j < text.length && i < q.length; j++) if (text[j] === q[i]) i++;
  return i === q.length;
}
function searchScore(ex, q) {
  if (!q) return 1;
  const name = ex.name.toLowerCase(), en = (ex.nameEn || '').toLowerCase();
  const extra = EXERCISE_EXTRA[ex.id] || {};
  const aliases = (extra.a || []).join(' ').toLowerCase(), tags = (extra.g || []).join(' ').toLowerCase();
  /* 让「固定器械 / 自由器械 / 自重 / 胸部」这类分类词也能直接搜到动作 */
  const cats = [
    (EQUIPMENT[ex.equipment] || {}).name,
    (EQUIP_TYPES[equipTypeOf(ex)] || {}).name,
    PART_ZH[ex.category] || CATEGORY[ex.category],
    extra.e || ''   // 原始器械的精确中文名：药球 / 瑞士球 / 战绳 / 额外负重…
  ].filter(Boolean).join(' ').toLowerCase();
  const hay = name + ' ' + en + ' ' + aliases + ' ' + tags + ' ' + cats;
  const parts = q.split(/\s+/).filter(Boolean);
  return parts.every(p => hay.includes(p) || fuzzyHit(name, p) || fuzzyHit(en, p));
}

const _origGetFiltered = getFiltered;
getFiltered = function () {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const eq = document.getElementById('equipSelect')?.value || 'all';
  const et = document.getElementById('equipTypeSelect')?.value || 'all';
  const diff = document.getElementById('diffSelect')?.value || 'all';
  const part = document.getElementById('partSelect')?.value || 'all';
  const tag = document.getElementById('tagSelect')?.value || 'all';
  const sort = document.getElementById('sortSelect')?.value || 'default';
  let list = EXERCISES.filter(ex => {
    if (q && !searchScore(ex, q)) return false;
    if (state.muscleFilter !== 'all' && (ex.category === 'cardio' || (!ex.primary.includes(state.muscleFilter) && !ex.secondary.includes(state.muscleFilter)))) return false;
    if (eq !== 'all' && ex.equipment !== eq) return false;
    if (et !== 'all' && equipTypeOf(ex) !== et) return false;
    if (diff !== 'all' && ex.difficulty !== diff) return false;
    if (state.forceFilter !== 'all' && ex.force !== state.forceFilter) return false;
    if (state.mechanicFilter !== 'all' && ex.mechanic !== state.mechanicFilter) return false;
    if (part !== 'all' && ex.category !== part) return false;
    if (tag !== 'all' && !(EXERCISE_EXTRA[ex.id]?.g || []).includes(tag)) return false;
    return true;
  });
  const heatCmp = (a, b) => (FFHeat.score(b) - FFHeat.score(a)) || a.id.localeCompare(b.id);
  if (sort === 'name') list = list.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  else if (sort === 'random') list = list.slice().sort(() => Math.random() - .5);
  else if (sort === 'hot') list = list.slice().sort(heatCmp);
  else if (sort === 'starLow' || sort === 'starHigh' || sort === 'easy') {
    /* 同星级内按热度再排一次，避免几百个动作挤在一起看不出差别 */
    const asc = sort !== 'starHigh';
    list = list.slice().sort((a, b) => {
      const d = asc ? diffStarsOf(a) - diffStarsOf(b) : diffStarsOf(b) - diffStarsOf(a);
      return d || heatCmp(a, b);
    });
  }
  return list;
};

function resetFilters() {
  ['searchInput', 'equipTypeSelect', 'equipSelect', 'diffSelect', 'forceSelect', 'mechSelect', 'partSelect', 'tagSelect', 'sortSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'INPUT') el.value = '';
    else el.value = id === 'sortSelect' ? 'default' : 'all';
  });
  ['forceSelect', 'mechSelect'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 'all'; });
  state.muscleFilter = 'all'; state.forceFilter = 'all'; state.mechanicFilter = 'all';
  document.querySelectorAll('#muscleFilters .chip').forEach(c => c.classList.toggle('on', c.dataset.m === 'all'));
  try { doFilter(); } catch (e) {}
}
function randomExercise() {
  const list = getFiltered();
  if (!list.length) { toast('当前筛选下没有动作，先重置筛选', 'err'); return; }
  const ex = list[Math.floor(Math.random() * list.length)];
  showDetail(ex.id);
  toast('随机挑了一个：' + ex.name);
}
function injectFilterExtras() {
  const f = document.getElementById('filtersAdv');
  if (!f || document.getElementById('partSelect')) return;
  const tags = [...new Set(Object.values(EXERCISE_EXTRA).flatMap(x => x.g || []))].sort();
  const parts = [...new Set(EXERCISES.map(e => e.category))].filter(Boolean);
  /* 排序已提到筛选条常驻；仅当旧版页面没有该控件时补一个，避免重复 id */
  const sortHTML = document.getElementById('sortSelect') ? '' : `
    <select class="sel" id="sortSelect" onchange="doFilter()">
      <option value="default">默认排序</option><option value="hot">热门优先</option>
      <option value="starHigh">星级 高 → 低</option><option value="starLow">星级 低 → 高</option>
      <option value="name">按名称</option><option value="random">随机打乱</option></select>`;
  const html = `
    <select class="sel" id="partSelect" onchange="doFilter()"><option value="all">全部分类</option>
      ${parts.map(p => `<option value="${p}">${PART_ZH[p] || p}</option>`).join('')}</select>
    <select class="sel" id="tagSelect" onchange="doFilter()"><option value="all">全部标签</option>
      ${tags.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
    ${sortHTML}
    <button class="btn btn-ghost btn-sm" onclick="randomExercise()">${ic('zap')}手气不错</button>
    <button class="btn btn-ghost btn-sm" onclick="resetFilters()">${ic('rotate')}重置</button>`;
  f.insertAdjacentHTML('beforeend', html);
}

/* ═════════ 今日训练条 ═════════ */
function todayKey() {
  const d = new Date().getDay();
  return DAYS[d === 0 ? 6 : d - 1];
}
function updateTodayStrip() {
  const box = document.getElementById('todayStrip');
  if (!box) return;
  const key = todayKey();
  const day = state.weeklyPlan[key] || { name: '', exercises: [] };
  const n = day.exercises.length;
  const sets = day.exercises.reduce((s, i) => s + (parseInt(i.sets, 10) || 3), 0);
  const names = day.exercises.slice(0, 3)
    .map(i => (EXERCISES.find(e => e.id === i.id) || {}).name).filter(Boolean);
  box.innerHTML = `
    <div class="today-card ${n ? '' : 'rest'}">
      <div class="tc-when"><span class="tc-day">今天 · ${DAY_NAMES[key]}</span>${n ? '<i class="tc-pill">训练日</i>' : '<i class="tc-pill rest">休息日</i>'}</div>
      <div class="tc-main">
        <div class="tc-txt">
          <b>${n ? (day.name || '今天的训练') : '今天没安排训练'}</b>
          <span>${n
            ? `${n} 个动作 · ${sets} 组${names.length ? ' · ' + names.join('、') + (n > 3 ? ' 等' : '') : ''}`
            : '挑一套模板开练，或者给自己放个假'}</span>
        </div>
        <div class="tc-acts">
          ${n
            ? `<button class="btn btn-solid btn-sm" onclick="startSession()">${ic('play')}开始训练</button>
               <button class="btn btn-ghost btn-sm" onclick="openExport('today')">${ic('image')}训练卡</button>`
            : `<button class="btn btn-soft btn-sm" onclick="toggleTplLib(true)">${ic('calendar')}挑套计划</button>`}
        </div>
      </div>
    </div>`;
}
const _origRenderWeek = renderWeek;
renderWeek = function () { _origRenderWeek(); try { updateTodayStrip(); } catch (e) {} };

/* ═════════ 模板库：默认收起，把「我的计划」还给首屏 ═════════ */
let tplCat = '全部';
let tplLibOpen = false;
try { tplLibOpen = localStorage.getItem('ff_tplopen') === '1'; } catch (e) {}
function toggleTplLib(force) {
  tplLibOpen = force === true ? true : !tplLibOpen;
  try { localStorage.setItem('ff_tplopen', tplLibOpen ? '1' : '0'); } catch (e) {}
  renderTplRow();
  if (tplLibOpen) {
    const el = document.getElementById('tplRow');
    if (el && el.scrollIntoView) try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) {}
  }
}
function setTplCat(c) { tplCat = c; renderTplRow(); }
renderTplRow = function () {
  const box = document.getElementById('tplRow');
  if (!box) return;
  const cats = ['全部', ...new Set(Object.values(PLAN_TEMPLATES).map(t => t.tag || '综合'))];
  const list = Object.entries(PLAN_TEMPLATES).filter(([, t]) => tplCat === '全部' || (t.tag || '综合') === tplCat);
  const n = Object.keys(PLAN_TEMPLATES).length;
  box.innerHTML = `
    <button class="tpl-fold ${tplLibOpen ? 'on' : ''}" onclick="toggleTplLib()" aria-expanded="${tplLibOpen}">
      <span class="tf-ic">${ic('calendar')}</span>
      <span class="tf-txt"><b>换一套训练计划</b><small>${n} 套现成模板，一键套用</small></span>
      <svg class="ic chev"><use href="#i-chevron"/></svg>
    </button>
    <div class="tpl-lib ${tplLibOpen ? 'open' : ''}">
      <div class="tpl-cats">${cats.map(c => `<button class="chip ${c === tplCat ? 'on' : ''}" onclick="setTplCat('${c}')">${c}</button>`).join('')}</div>
      <div class="tpl-list">${list.map(([k, t]) => `
        <button class="tpl" onclick="loadTpl('${k}')">
          <span class="tpl-tag">${t.tag || '综合'}</span>
          <b>${t.name}</b><span class="tpl-desc">${t.description}</span>
          <span class="tpl-meta">${Object.values(t.days).filter(d => d.exercises.length).length} 个训练日 · ${Object.values(t.days).reduce((a, d) => a + d.exercises.length, 0)} 个动作</span>
        </button>`).join('')}</div>
    </div>`;
};

loadTpl = function (key) {
  const tpl = PLAN_TEMPLATES[key];
  if (!tpl) return;
  const previous = JSON.parse(JSON.stringify(state.weeklyPlan));
  state.weeklyPlan = {};
  DAYS.forEach(d => {
    const day = tpl.days[d];
    const list = (day?.exercises || []).map(id => {
      const ex = EXERCISES.find(e => e.id === id);
      if (!ex) return null;
      return {
        id, sets: day.sets || ex.setRange || '3',
        reps: day.reps || (String(ex.repRange || '10').match(/^\d+/) || ['10'])[0],
        weight: ''
      };
    }).filter(Boolean);
    state.weeklyPlan[d] = { name: day?.name || '', exercises: list };
  });
  ssSet('ff_plan', state.weeklyPlan);
  tplLibOpen = false;
  try { localStorage.setItem('ff_tplopen', '0'); } catch (e) {}
  renderTplRow();
  renderWeek();
  switchView('planner');
  toast(`已载入「${tpl.name}」`, 'ok', {
    label: '撤销',
    fn: () => { state.weeklyPlan = previous; ssSet('ff_plan', previous); renderWeek(); toast('已恢复原来的计划'); }
  });
};

/* ═════════ 动作详情增强 ═════════ */
const _origShowDetail = showDetail;
showDetail = function (id) {
  _origShowDetail(id);
  const ex = EXERCISES.find(e => e.id === id), x = EXERCISE_EXTRA[id];
  if (!ex) return;
  const body = document.getElementById('detailBody');
  const acts = document.getElementById('detailActions');
  if (body && x) {
    body.insertAdjacentHTML('beforeend', `
      <div class="detail-sec"><h4>肌肉与内容标签</h4>
        <div class="extra-meta">
          ${x.t ? `<div><span>目标肌肉</span><b>${x.t}</b></div>` : ''}
          ${x.s && x.s.length ? `<div><span>协同肌群</span><b>${x.s.join(' · ')}</b></div>` : ''}
          <div><span>身体部位</span><b>${x.p}</b></div>
          <div><span>细分器械</span><b>${x.e}</b></div>
        </div>
        ${x.g && x.g.length ? `<div class="extra-tags">${x.g.map(t => `<span>${t}</span>`).join('')}</div>` : ''}
        <p class="credit">动作演示来源：${EXTRA_CREDIT}</p>
      </div>`);
  }
  if (acts) acts.insertAdjacentHTML('afterbegin',
    `<button class="btn btn-soft" onclick="closeModal('detailModal');startSingleSession('${id}')">${ic('play')}跟练这个动作</button>`);
};

/* ═════════ 视图切换 & 统计挂钩 ═════════ */
const _origSwitchView = switchView;
switchView = function (v, fromPop) {
  _origSwitchView(v, fromPop);
  if (v === 'tools') renderTools();
  document.querySelectorAll('.bottom-nav .bn-item').forEach(b => b.classList.toggle('on', b.dataset.view === v));
};
const _origRenderStats = renderStats;
renderStats = function () { _origRenderStats(); try { renderStatsExtra(); } catch (e) { console.warn(e); } };

/* ═════════ 快捷键 / 底部导航 / 帮助 ═════════ */
function openHelp() {
  const m = document.getElementById('helpModal');
  if (m) openModal('helpModal');
}
document.addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  if (e.key >= '1' && e.key <= '7') { switchView(TOOL_VIEWS[+e.key - 1]); return; }
  if (e.key === 's' || e.key === 'S') { startSession(); return; }
  if (e.key === 't' || e.key === 'T') { toggleTheme(); return; }
  if (e.key === 'n' || e.key === 'N') { showLogModal(); return; }
  if (e.key === '?') { e.preventDefault(); openHelp(); return; }
  // Esc 由 app.js 统一处理：只关最上层弹窗，避免一次按掉多层
});

/* 图片兜底：首屏 GIF 并发多时，浏览器偶发连接被拒，先错峰重试一次；
   仍失败（例如只拷了 HTML 没带 gifs 目录）才退回内嵌首帧，不留破图 */
document.addEventListener('error', function (e) {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || img.dataset.fallback) return;
  const src = img.getAttribute('src') || '';
  const m = src.match(/gifs\/(\d{4})-/);
  if (!m) return;
  if (!img.dataset.retry) {
    img.dataset.retry = '1';
    setTimeout(() => {
      if (!img.isConnected || img.dataset.fallback) return;
      img.src = src + (src.includes('?') ? '&' : '?') + 'r=1';
    }, 260 + Math.floor(Math.random() * 700));
    return;
  }
  const t = (typeof EXERCISE_THUMBS !== 'undefined') && EXERCISE_THUMBS[m[1]];
  if (t) { img.dataset.fallback = '1'; img.src = t; }
}, true);

/* ═════════ 筛选折叠：把首屏还给动作卡 ═════════ */
function activeFilterCount() {
  let n = 0;
  ['equipTypeSelect', 'equipSelect', 'diffSelect', 'forceSelect', 'mechSelect', 'partSelect', 'tagSelect'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.value && el.value !== 'all') n++;
  });
  const sort = document.getElementById('sortSelect');
  if (sort && sort.value && sort.value !== 'default') n++;
  if (state.muscleFilter && state.muscleFilter !== 'all') n++;
  const s = document.getElementById('searchInput');
  if (s && s.value.trim()) n++;
  return n;
}
function updateFilterBadge() {
  const badge = document.getElementById('filterBadge');
  const btn = document.getElementById('filterToggle');
  if (!badge || !btn) return;
  const n = activeFilterCount();
  badge.textContent = n;
  badge.hidden = n === 0;
  btn.classList.toggle('has-active', n > 0);
}
function toggleFilters() {
  const adv = document.getElementById('filtersAdv');
  const btn = document.getElementById('filterToggle');
  if (!adv || !btn) return;
  const open = adv.classList.toggle('open');
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.classList.toggle('on', open);
}
const _origDoFilter = doFilter;
doFilter = function () { _origDoFilter(); try { updateFilterBadge(); } catch (e) {} };

/* ═════════ 首次使用引导 ═════════ */
function dismissWelcome() {
  const w = document.getElementById('welcomeBar');
  if (w) w.hidden = true;
  try { localStorage.setItem('ff_welcomed', '1'); } catch (e) {}
}

function buildBottomNav() {
  if (document.querySelector('.bottom-nav')) return;
  const icons = { library: 'grid', planner: 'calendar', musclemap: 'target', favorites: 'heart', log: 'clipboard', stats: 'chart', tools: 'sliders' };
  const nav = document.createElement('nav');
  nav.className = 'bottom-nav';
  nav.innerHTML = TOOL_VIEWS.map(v => `<button class="bn-item ${v === 'library' ? 'on' : ''}" data-view="${v}">${ic(icons[v])}<span>${TOOL_LABEL[v]}</span></button>`).join('');
  document.body.appendChild(nav);
}

/* ═════════ 初始化 ═════════ */
document.addEventListener('DOMContentLoaded', () => {
  try { injectFilterExtras(); } catch (e) { console.warn('筛选增强失败', e); }
  try { buildBottomNav(); } catch (e) {}
  try { renderTplRow(); } catch (e) {}
  try { updateTodayStrip(); } catch (e) {}
  try { renderStatsExtra(); } catch (e) {}
  try { updateFilterBadge(); } catch (e) {}
  try {
    if (localStorage.getItem('ff_welcomed') !== '1') {
      const w = document.getElementById('welcomeBar');
      if (w) w.hidden = false;
    }
  } catch (e) {}
  // 初始落在 hash 指定的页面（手机返回键 / 刷新保持位置）
  try {
    const v = (location.hash || '').replace('#', '');
    if (v && v !== 'library' && document.getElementById('view-' + v)) switchView(v, true);
  } catch (e) {}
  const topRight = document.querySelector('.top-right');
  if (topRight) {
    const resume = hasSavedSession();
    topRight.insertAdjacentHTML('afterbegin',
      `<button class="btn btn-soft" id="startSessionBtn" onclick="startSession(null, ${resume})">${ic(resume ? 'rotate' : 'play')}<span>${resume ? '继续训练' : '开始训练'}</span></button>`);
  }
});
