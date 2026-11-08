/* ═══════════════════════════════════════════
   FitForge — 应用逻辑
   ═══════════════════════════════════════════ */

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DAY_NAMES = { mon:'周一',tue:'周二',wed:'周三',thu:'周四',fri:'周五',sat:'周六',sun:'周日' };
const FORCE_LABEL = { push:'推', pull:'拉', static:'静态' };
const MECH_LABEL  = { compound:'复合', isolation:'孤立' };

const ic = (n, cls='') => `<svg class="ic ${cls}"><use href="#i-${n}"/></svg>`;

let state = {
  view: 'library',
  selectedMuscle: null,
  bodyView: 'front',
  weeklyPlan: {},
  pickerTargetDay: null,
  displayLimit: 48,
  muscleFilter: 'all',
  forceFilter: 'all',
  mechanicFilter: 'all',
};

/* 人体肌群图由 body_svg.js 提供（BODY_SVG） */

/* ─── Storage ─── */
function _get(k, d) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; }
  catch(e) { return d; }
}
function _set(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {}
}

/* ─── Theme ─── */
function initTheme() {
  let t = 'light';
  try { t = localStorage.getItem('ff_theme') || 'light'; } catch(e) {}
  applyTheme(t);
}
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = ic(t === 'dark' ? 'sun' : 'moon');
  try { localStorage.setItem('ff_theme', t); } catch(e) {}
}
function toggleTheme() {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  initTheme();

  try { state.weeklyPlan = _get('ff_plan', null) || {}; } catch(e) {}
  DAYS.forEach(d => { if (!state.weeklyPlan[d]) state.weeklyPlan[d] = { name:'', exercises:[] }; });

  // 首次打开：默认载入「新手入门」模板，避免周计划一片空白
  if (!Object.keys(state.weeklyPlan).some(d => state.weeklyPlan[d].exercises.length)) {
    try {
      const tpl = PLAN_TEMPLATES.beginner;
      if (tpl) {
        DAYS.forEach(d => {
          const day = tpl.days[d];
          const list = (day && day.exercises || []).map(id => {
            const ex = EXERCISES.find(e => e.id === id);
            return ex ? { id, sets: ex.setRange || '3', reps: ex.repRange || '10', weight: '' } : null;
          }).filter(Boolean);
          state.weeklyPlan[d] = { name: day?.name || '', exercises: list };
        });
        _set('ff_plan', state.weeklyPlan);
      }
    } catch(e) {}
  }

  try { renderMuscleChips(); } catch(e) {}
  try { renderEquipSelect(); } catch(e) {}
  try { renderGrid(); } catch(e) {}
  try { renderTplRow(); } catch(e) {}
  try { renderWeek(); } catch(e) {}
  try { renderBodyMap(); } catch(e) {}
  try { renderMuscleLegend(); } catch(e) {}
  try { initTimer(); } catch(e) {}

  // 顶栏导航：事件委托，任何带 data-view 的元素都能触发切换
  try {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-view]');
      if (!t) return;
      const v = t.dataset.view;
      if (!v) return;
      if (v === state.view) {
        // 已在该视图：品牌区点击则回到顶部
        if (t.classList.contains('brand')) try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
        return;
      }
      switchView(v);
    });
  } catch(e) {}
});

/* ─── View switch ─── */
function switchView(v, fromPop) {
  state.view = v;
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === v));
  document.querySelectorAll('.view').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`view-${v}`);
  if (el) el.classList.add('active');
  if (v === 'planner') renderWeek();
  if (!fromPop) {
    try {
      const h = '#' + v;
      if (location.hash !== h) history.pushState({ view: v }, '', h);
    } catch (e) {}
  }
  try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch(e) {}
}

/* 手机返回键：回到上一个页面而不是直接退出 */
window.addEventListener('popstate', () => {
  const v = (location.hash || '').replace('#', '') || 'library';
  if (document.getElementById('view-' + v)) switchView(v, true);
});

/* ─── Toast（可带撤销） ─── */
function toast(msg, type = 'ok', action) {
  const box = document.getElementById('toastBox');
  if (!box) return;
  box.innerHTML = ''; /* 一次只留一条，避免多个「撤销」按钮串台 */
  const t = document.createElement('div');
  t.className = 'toast' + (type === 'err' ? ' err' : '');
  t.innerHTML = ic(type === 'err' ? 'x' : 'check') + `<span>${msg}</span>`;
  if (action && action.label && typeof action.fn === 'function') {
    const b = document.createElement('button');
    b.className = 'toast-act';
    b.textContent = action.label;
    b.onclick = () => { try { action.fn(); } catch (e) {} t.remove(); };
    t.appendChild(b);
  }
  box.appendChild(t);
  const life = action ? 6000 : 2600;
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; t.style.transition = 'all .25s'; }, life);
  setTimeout(() => t.remove(), life + 300);
}

/* 统一的空状态：一句说明 + 一个能立刻点的动作 */
function emptyHTML(icon, title, desc, actions = '') {
  return `<div class="empty">${ic(icon)}<h3>${title}</h3><p>${desc}</p>${actions ? `<div class="empty-acts">${actions}</div>` : ''}</div>`;
}

/* ─── Modal（带打开顺序栈，Esc 后开先关） ─── */
const _modalStack = [];
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('on');
  const i = _modalStack.indexOf(id);
  if (i >= 0) _modalStack.splice(i, 1);
  _modalStack.push(id);
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('on');
  const i = _modalStack.indexOf(id);
  if (i >= 0) _modalStack.splice(i, 1);
}

/* ═══ FILTERS ═══ */
function renderMuscleChips() {
  const c = document.getElementById('muscleFilters');
  if (!c) return;
  let h = `<button class="chip on" data-m="all" onclick="setMuscle('all')">全部</button>`;
  for (const [k, v] of Object.entries(MUSCLE_GROUPS)) {
    h += `<button class="chip" data-m="${k}" onclick="setMuscle('${k}')">${v.name}</button>`;
  }
  c.innerHTML = h;
}

function renderEquipSelect() {
  const sel = document.getElementById('equipSelect');
  if (!sel) return;
  let h = `<option value="all">全部器械</option>`;
  /* 按固定 / 自由 / 自重三大类分组，避免「固定器械」既是大类又是具体器械的混淆 */
  for (const [tk, tv] of Object.entries(EQUIP_TYPES)) {
    const keys = Object.keys(EQUIPMENT).filter(k => EQUIPMENT[k].type === tk);
    if (!keys.length) continue;
    h += `<optgroup label="${tv.name}">`;
    keys.forEach(k => { h += `<option value="${k}">${EQUIPMENT[k].name}</option>`; });
    h += `</optgroup>`;
  }
  sel.innerHTML = h;

  const ts = document.getElementById('equipTypeSelect');
  if (ts && ts.options.length <= 1) {
    ts.innerHTML = `<option value="all">全部训练方式</option>` +
      Object.entries(EQUIP_TYPES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
  }
}

function setMuscle(m) {
  state.muscleFilter = m;
  document.querySelectorAll('#muscleFilters .chip').forEach(p => p.classList.toggle('on', p.dataset.m === m));
  doFilter();
}
function setForce(f) { state.forceFilter = f; doFilter(); }
function setMech(mc) { state.mechanicFilter = mc; doFilter(); }
function doFilter() {
  state.displayLimit = 48;
  renderGrid();
}

function getFiltered() {
  const q = (document.getElementById('searchInput')?.value || '').trim().toLowerCase();
  const eq = document.getElementById('equipSelect')?.value || 'all';
  const et = document.getElementById('equipTypeSelect')?.value || 'all';
  const diff = document.getElementById('diffSelect')?.value || 'all';
  return EXERCISES.filter(ex => {
    if (q && !ex.name.toLowerCase().includes(q) && !(ex.nameEn || '').toLowerCase().includes(q)) return false;
    /* 有氧动作在原始库里被标成腹肌，按单一肌群筛选时不混进来 */
    if (state.muscleFilter !== 'all' && (ex.category === 'cardio' || (!ex.primary.includes(state.muscleFilter) && !ex.secondary.includes(state.muscleFilter)))) return false;
    if (eq !== 'all' && ex.equipment !== eq) return false;
    if (et !== 'all' && equipTypeOf(ex) !== et) return false;
    if (diff !== 'all' && ex.difficulty !== diff) return false;
    if (state.forceFilter !== 'all' && ex.force !== state.forceFilter) return false;
    if (state.mechanicFilter !== 'all' && ex.mechanic !== state.mechanicFilter) return false;
    return true;
  });
}

/* ═══ GRID ═══ */
function cardHTML(ex) {
  /* 有氧动作在原始数据里被标成「腹肌」，展示上改为「有氧全身」更贴合实际 */
  const mg = ex.category === 'cardio'
    ? { name: '有氧全身', color: '#4C9A86' }
    : MUSCLE_GROUPS[ex.primary[0]];
  const diffCls = { beginner:'beg', intermediate:'int', advanced:'adv' }[ex.difficulty] || 'beg';
  const diffName = DIFFICULTY[ex.difficulty]?.name || '';
  const eq = EQUIPMENT[ex.equipment]?.name || ex.equipment;

  return `<article class="card" onclick="showDetail('${ex.id}')">
    <div class="card-media">
      <img src="${ex.gifUrl}" alt="${ex.name}" loading="lazy">
      ${heatPillHTML(ex)}
      <button class="card-add" title="加入周计划" aria-label="把${ex.name}加入周计划"
        onclick="event.stopPropagation();quickAdd('${ex.id}')">${ic('plus')}</button>
    </div>
    <div class="card-body">
      <div class="card-title">${ex.name}</div>
      <div class="card-foot">
        <div class="card-tags">
          <span class="badge ${diffCls}" title="难度星级按动作特征本地估算，原始动作库无难度字段">${starHTML(ex)}<span>${diffName}</span></span>
          ${ex.mechanic === 'compound' ? `<span class="badge comp">${ic('flame')}<span>复合</span></span>` : ''}
        </div>
        <div class="card-meta">
          <span class="dot" style="background:${mg?.color||'#999'}"></span>
          <span class="mname">${mg?.name||''}</span>
          <span class="sep"></span>
          <span>${eq}</span>
          <span class="sep"></span>
          <span>${ex.setRange}×${ex.repRange}</span>
        </div>
      </div>
    </div>
  </article>`;
}

function renderGrid() {
  const grid = document.getElementById('exGrid');
  if (!grid) return;
  const all = getFiltered();
  const items = all.slice(0, state.displayLimit);

  const num = document.getElementById('resultNum');
  if (num) num.textContent = all.length;

  if (all.length === 0) {
    grid.innerHTML = emptyHTML('search', '没有匹配的动作', '换个关键词，或者把筛选条件清掉',
      `<button class="btn btn-soft btn-sm" onclick="resetFilters()">${ic('rotate')}清空筛选</button>`);
    return;
  }

  grid.innerHTML = items.map(ex => cardHTML(ex)).join('');

  if (all.length > state.displayLimit) {
    grid.innerHTML += `<div class="load-more">
      <button class="btn btn-line" onclick="loadMore()">再看 ${Math.min(48, all.length - items.length)} 个 · 共 ${all.length}</button>
      <button class="btn btn-ghost btn-sm" onclick="showAllResults()">全部显示</button>
    </div>`;
  }
}

function loadMore() { state.displayLimit += 48; renderGrid(); }
function showAllResults() {
  state.displayLimit = getFiltered().length;
  renderGrid();
  toast('已显示全部动作，往下翻就行');
}

/* ═══ DETAIL ═══ */
function showDetail(id) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return;

  const eq = EQUIPMENT[ex.equipment]?.name || ex.equipment;
  const et = (EQUIP_TYPES[equipTypeOf(ex)] || {}).name || '';
  const diff = DIFFICULTY[ex.difficulty]?.name || '';
  const mech = MECHANIC[ex.mechanic]?.name || '';
  const isCardio = ex.category === 'cardio';

  const seenTag = new Set();
  const tags = [
    ...(isCardio ? ['有氧全身'] : ex.primary.map(m => MUSCLE_GROUPS[m]?.name || m))
      .map(t => ({ t, pri: true })),
    ...(isCardio ? [] : ex.secondary.map(m => ({ t: MUSCLE_GROUPS[m]?.name || m, pri: false }))),
    { t: eq }, { t: et }, { t: diff }, { t: FORCE_LABEL[ex.force] }, { t: mech }
  ].filter(o => o.t && !seenTag.has(o.t) && seenTag.add(o.t))
   .map(o => `<span class="dtag ${o.pri ? 'pri' : ''}">${o.t}</span>`).join('');

  const steps = (ex.steps || []).map((s, i) =>
    `<li class="step"><span class="step-n">${i+1}</span><span>${s}</span></li>`
  ).join('');

  const alts = EXERCISES
    .filter(e => e.id !== ex.id && e.primary.some(m => ex.primary.includes(m)))
    .sort(() => Math.random() - 0.5).slice(0, 6);

  const altHTML = alts.map(a =>
    `<div class="alt" onclick="showDetail('${a.id}')">
      <img src="${a.gifUrl}" alt="${a.name}" loading="lazy">
      <span>${a.name}</span>
    </div>`).join('');

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-top">
      <div class="detail-media"><img src="${ex.gifUrl}" alt="${ex.name}"></div>
      <div class="detail-info">
        <h2>${ex.name}</h2>
        <div class="detail-tags">${tags}</div>
        <div class="detail-rating">
          <span class="dr-box" title="原始动作库无难度字段，星级由本地按动作特征估算"><span class="dr-l">难度星级</span>${starHTML(ex)}<b>${diff}</b></span>
          <span class="dr-box" title="基于公开训练数据榜单静态合成，实证动作 ≥56 分；不是本站点击量"><span class="dr-l">热门度</span><b class="dr-heat"><span class="heat-lb">热</span>${FFHeat.score(ex)}</b><small>/100</small></span>
        </div>
        <div class="dr-src">${heatSourcesHTML(ex)}</div>
        <div class="dr-note">${(FFHeat.meta() || {}).sources || 6} 份公开榜单静态合成 · 实证 ≥56 分 · 不联网、不更新</div>
        <div class="train-grid">
          <div class="tg"><div class="tg-v">${ex.setRange}</div><div class="tg-l">建议组数</div></div>
          <div class="tg"><div class="tg-v">${ex.repRange}</div><div class="tg-l">建议次数</div></div>
          <div class="tg"><div class="tg-v">${ex.restSec}<span style="font-size:11px;color:var(--t3)">s</span></div><div class="tg-l">组间休息</div></div>
          <div class="tg"><div class="tg-v" style="font-size:14px">${mech}</div><div class="tg-l">训练类型</div></div>
        </div>
      </div>
    </div>
    ${steps ? `<div class="detail-sec"><h4>怎么做 · ${ex.steps.length} 步</h4><ul class="steps">${steps}</ul></div>`
            : (ex.instructions ? `<div class="detail-sec"><h4>动作说明</h4><p>${ex.instructions}</p></div>` : '')}
    ${alts.length ? `<div class="detail-sec"><h4>同肌群替代动作</h4><div class="alt-row">${altHTML}</div></div>` : ''}
  `;

  document.getElementById('detailActions').innerHTML = `
    <button class="btn btn-solid" onclick="addToPlanFromDetail('${ex.id}')">${ic('plus')}加入周计划</button>
    <button class="btn btn-soft" onclick="closeModal('detailModal');startSingleSession('${ex.id}')">${ic('play')}跟练这个动作</button>
    <button class="btn btn-soft" onclick="startRestTimer(${ex.restSec})">${ic('clock')}休息计时</button>
    <button class="btn btn-ghost modal-close-btn" onclick="closeModal('detailModal')">关闭</button>
  `;

  openModal('detailModal');
}

/* 卡片右上角的「+」：跳过详情，直接选加到哪天 */
function quickAdd(id) {
  state.pickerTargetDay = null;
  showDayPicker(id);
}

function addToPlanFromDetail(id) {
  closeModal('detailModal');
  quickAdd(id);
}

function showDayPicker(exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return;
  /* 选「哪天」时搜索框没有作用，藏起来免得用户以为该输入点什么 */
  const search = document.querySelector('#pickerModal .search');
  if (search) search.style.display = 'none';
  document.getElementById('pickerTitle').textContent = `把「${ex.name}」加到哪天`;
  document.getElementById('pickerList').innerHTML = DAYS.map(d => {
    const day = state.weeklyPlan[d] || { name:'', exercises:[] };
    return `<div class="pick" onclick="addExToDay('${exId}','${d}')">
      <div class="pick-thumb"><img src="${ex.gifUrl}" alt=""></div>
      <div class="pick-info">
        <div class="pick-name">${DAY_NAMES[d]}</div>
        <div class="pick-meta">${day.name || '未安排'} · ${day.exercises.length} 个动作</div>
      </div>
      <div class="pick-add">${ic('plus')}</div>
    </div>`;
  }).join('');
  openModal('pickerModal');
}

/* ═══ PLANNER ═══ */
function renderTplRow() {
  const row = document.getElementById('tplRow');
  if (!row) return;
  const icons = { ppl:'flame', upper_lower:'zap', full_body:'dumbbell', beginner:'leaf' };
  row.innerHTML = Object.entries(PLAN_TEMPLATES).map(([k, tpl]) => `
    <button class="tpl" onclick="loadTpl('${k}')">
      <div class="tpl-top">${ic(icons[k]||'grid')}<span class="tpl-name">${tpl.name}</span></div>
      <div class="tpl-desc">${tpl.description}</div>
    </button>`).join('');
}

function loadTpl(key) {
  const tpl = PLAN_TEMPLATES[key];
  if (!tpl) return;
  state.weeklyPlan = {};
  DAYS.forEach(d => {
    const day = tpl.days[d];
    // 模板里存的是动作 ID，需要展开成带组次/次数的完整对象
    const list = (day && day.exercises || []).map(id => {
      const ex = EXERCISES.find(e => e.id === id);
      if (!ex) return null;
      return {
        id,
        sets: ex.setRange || '3',
        reps: ex.repRange || '10',
        weight: '',
      };
    }).filter(Boolean);
    state.weeklyPlan[d] = { name: day?.name || '', exercises: list };
  });
  _set('ff_plan', state.weeklyPlan);
  renderWeek();
  toast(`已载入「${tpl.name}」`);
  switchView('planner');
}

function clearPlan() {
  const has = DAYS.some(d => (state.weeklyPlan[d]?.exercises || []).length);
  if (!has) { toast('周计划本来就是空的'); return; }
  const snapshot = JSON.parse(JSON.stringify(state.weeklyPlan));
  DAYS.forEach(d => { state.weeklyPlan[d] = { name:'', exercises:[] }; });
  _set('ff_plan', state.weeklyPlan);
  renderWeek();
  toast('周计划已清空', 'ok', {
    label: '撤销',
    fn: () => { state.weeklyPlan = snapshot; _set('ff_plan', snapshot); renderWeek(); toast('计划已恢复'); }
  });
}

function renderWeek() {
  const grid = document.getElementById('weekGrid');
  if (!grid) return;
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  grid.innerHTML = DAYS.map((d, idx) => {
    const day = state.weeklyPlan[d] || { name:'', exercises:[] };
    const isToday = idx === todayIdx;
    const isRest = day.exercises.length === 0;

    const exHTML = day.exercises.map((item, i) => {
      const ex = EXERCISES.find(e => e.id === item.id);
      if (!ex) return '';
      return `<div class="day-ex" onclick="editSetRep('${d}',${i})">
        <button class="day-x" onclick="event.stopPropagation();removeEx('${d}',${i})">${ic('x')}</button>
        <div class="dn">${ex.name}</div>
        <div class="dm">
          <span>${item.sets||3}×${item.reps||10}</span>
          ${item.weight ? `<span>@${item.weight}kg</span>` : ''}
          <span class="edit">${ic('pencil')}</span>
        </div>
      </div>`;
    }).join('');

    const totalSets = day.exercises.reduce((s,e) => s + (parseInt(e.sets)||3), 0);

    return `<div class="day ${isToday?'today':''}" data-k="${d}">
      <div class="day-head">
        <div class="day-week">${DAY_NAMES[d]}</div>
        <div class="day-title">${day.name || (isRest ? '休息' : '训练')}</div>
        ${day.name ? `<span class="day-tag">${day.name}</span>` : ''}
        ${day.exercises.length ? `<button class="day-dl" title="下载这天的训练卡" aria-label="下载${DAY_NAMES[d]}的训练卡" onclick="downloadDayCard('${d}',this)">${ic('download')}</button>` : ''}
      </div>
      <div class="day-exs">
        ${exHTML}
        ${isRest && !day.name ? `<div class="rest-note">休息日</div>` : ''}
      </div>
      <div class="day-add" onclick="showPicker('${d}')">+ 添加动作</div>
      <div class="day-foot"><span>${day.exercises.length} 个动作</span><span>${totalSets} 组</span></div>
    </div>`;
  }).join('');
}

let editCtx = null;
function editSetRep(dayKey, idx) {
  const item = state.weeklyPlan[dayKey]?.exercises[idx];
  if (!item) return;
  const ex = EXERCISES.find(e => e.id === item.id);
  editCtx = { dayKey, idx };
  document.getElementById('editItemTitle').textContent = ex ? ex.name : '调整训练参数';
  document.getElementById('editSets').value = item.sets || '3';
  document.getElementById('editReps').value = item.reps || '10';
  document.getElementById('editWeight').value = item.weight || '';
  openModal('editItemModal');
  setTimeout(() => { try { document.getElementById('editSets').focus(); } catch (e) {} }, 60);
}
function saveEditItem() {
  if (!editCtx) return;
  const item = state.weeklyPlan[editCtx.dayKey]?.exercises[editCtx.idx];
  if (!item) { closeModal('editItemModal'); return; }
  const s = parseInt(document.getElementById('editSets').value, 10);
  const r = parseInt(document.getElementById('editReps').value, 10);
  item.sets = String(Math.min(20, Math.max(1, s || 3)));
  item.reps = String(Math.min(100, Math.max(1, r || 10)));
  item.weight = String(document.getElementById('editWeight').value || '').trim();
  _set('ff_plan', state.weeklyPlan);
  closeModal('editItemModal');
  renderWeek();
  toast('训练参数已更新');
}
function removePlanItem() {
  if (!editCtx) return;
  const { dayKey, idx } = editCtx;
  const arr = state.weeklyPlan[dayKey]?.exercises;
  if (!arr || !arr[idx]) return;
  const removed = arr.splice(idx, 1)[0];
  _set('ff_plan', state.weeklyPlan);
  closeModal('editItemModal');
  renderWeek();
  toast('已移除动作', 'ok', {
    label: '撤销',
    fn: () => { arr.splice(idx, 0, removed); _set('ff_plan', state.weeklyPlan); renderWeek(); }
  });
}

function showPicker(dayKey) {
  state.pickerTargetDay = dayKey;
  const search = document.querySelector('#pickerModal .search');
  if (search) search.style.display = '';
  document.getElementById('pickerTitle').textContent = `添加到${DAY_NAMES[dayKey]}`;
  document.getElementById('pickerSearch').value = '';
  renderPickerList('');
  openModal('pickerModal');
}

function renderPickerList(q) {
  const list = document.getElementById('pickerList');
  const filtered = EXERCISES.filter(e => !q ||
    e.name.toLowerCase().includes(q.toLowerCase()) ||
    (e.nameEn || '').toLowerCase().includes(q.toLowerCase())
  ).slice(0, 120);
  list.innerHTML = filtered.map(ex => {
    const mg = MUSCLE_GROUPS[ex.primary[0]];
    return `<div class="pick" onclick="addExToDay('${ex.id}',state.pickerTargetDay)">
      <div class="pick-thumb"><img src="${ex.gifUrl}" alt="" loading="lazy"></div>
      <div class="pick-info">
        <div class="pick-name">${ex.name}</div>
        <div class="pick-meta">${mg?.name||''} · ${ex.setRange}×${ex.repRange}</div>
      </div>
      <div class="pick-add">${ic('plus')}</div>
    </div>`;
  }).join('');
}

function filterPicker() { renderPickerList(document.getElementById('pickerSearch').value); }

function addExToDay(exId, dayKey) {
  if (!dayKey) return;
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return;
  if (!state.weeklyPlan[dayKey]) state.weeklyPlan[dayKey] = { name:'', exercises:[] };
  state.weeklyPlan[dayKey].exercises.push({
    id: exId, sets: ex.setRange || '3', reps: ex.repRange || '10', weight: ''
  });
  _set('ff_plan', state.weeklyPlan);
  renderWeek();
  closeModal('pickerModal');
  closeModal('detailModal');
  /* 从动作库加入时给一个去周计划的入口，形成「挑 → 排 → 导出」的闭环 */
  toast(`已加入${DAY_NAMES[dayKey]}`, 'ok', state.view === 'planner' ? null : {
    label: '去看看', fn: () => switchView('planner')
  });
}

function removeEx(dayKey, idx) {
  state.weeklyPlan[dayKey]?.exercises.splice(idx, 1);
  _set('ff_plan', state.weeklyPlan);
  renderWeek();
  toast('已移除');
}

/* ═══ TIMER ═══ */
let timerState = { total: 0, remain: 0, running: false, interval: null };

function initTimer() { updateTimerDisplay(); }

function startRestTimer(seconds) {
  timerState.total = seconds;
  timerState.remain = seconds;
  timerState.running = true;
  document.getElementById('timerWidget')?.classList.add('on');
  if (timerState.interval) clearInterval(timerState.interval);
  timerState.interval = setInterval(() => {
    timerState.remain--;
    if (timerState.remain <= 0) {
      timerState.running = false;
      clearInterval(timerState.interval);
      timerState.remain = 0;
      try { if (Notification.permission === 'granted') new Notification('休息结束', { body: '开始下一组吧' }); } catch(e) {}
      toast('休息结束，开始下一组');
    }
    updateTimerDisplay();
  }, 1000);
  updateTimerDisplay();
  closeModal('detailModal');
  try { if (Notification.permission === 'default') Notification.requestPermission(); } catch(e) {}
}

function toggleTimer() {
  if (timerState.running) {
    timerState.running = false;
    clearInterval(timerState.interval);
  } else if (timerState.remain > 0) {
    timerState.running = true;
    timerState.interval = setInterval(() => {
      timerState.remain--;
      if (timerState.remain <= 0) {
        timerState.running = false;
        clearInterval(timerState.interval);
        timerState.remain = 0;
        toast('休息结束');
      }
      updateTimerDisplay();
    }, 1000);
  }
  updateTimerDisplay();
}

function resetTimer() {
  timerState.running = false;
  clearInterval(timerState.interval);
  timerState.remain = timerState.total;
  updateTimerDisplay();
}

function closeTimer() {
  timerState.running = false;
  clearInterval(timerState.interval);
  document.getElementById('timerWidget')?.classList.remove('on');
}

function updateTimerDisplay() {
  const el = document.getElementById('timerTime');
  if (!el) return;
  const m = Math.floor(timerState.remain / 60);
  const s = timerState.remain % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.className = 'timer-time' + (timerState.remain <= 10 ? ' danger' : timerState.remain <= 30 ? ' warn' : '');
  const fill = document.getElementById('timerFill');
  if (fill) {
    const pct = timerState.total ? (timerState.remain / timerState.total) * 100 : 0;
    fill.style.width = pct + '%';
  }
  const btn = document.getElementById('timerToggle');
  if (btn) btn.innerHTML = timerState.running ? ic('pause') : ic('play');
}

/* ═══ MUSCLE MAP ═══ */
function showBodyView(v) {
  state.bodyView = v;
  document.querySelectorAll('#bodyTabs .seg-btn').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  renderBodyMap();
}

function renderBodyMap() {
  const c = document.getElementById('bodySvgContainer');
  if (!c) return;
  c.innerHTML = BODY_SVG[state.bodyView];
  /* 翻面后仍保持当前选中肌群的高亮 */
  if (state.selectedMuscle) {
    c.querySelectorAll('.muscle').forEach(x =>
      x.classList.toggle('on', x.dataset.muscle === state.selectedMuscle));
  }
  c.querySelectorAll('.muscle').forEach(r => {
    r.addEventListener('click', () => selectMuscle(r.dataset.muscle));
  });
}

function renderMuscleLegend() {
  const box = document.getElementById('muscleExList');
  if (!box) return;
  const groups = Object.entries(MUSCLE_GROUPS)
    .map(([key, mg]) => {
      const n = EXERCISES.filter(e => e.primary.includes(key)).length;
      return { key, name: mg.name, color: mg.color, n };
    })
    .filter(g => g.n > 0)
    .sort((a, b) => b.n - a.n);

  box.innerHTML = `
    <div class="legend">
      ${groups.map(g => `<button class="legend-item" onclick="selectMuscle('${g.key}')">
        <span class="lg-dot" style="background:${g.color}"></span>
        <span class="lg-name">${g.name}</span>
        <span class="lg-n">${g.n}</span>
      </button>`).join('')}
    </div>`;
}

function selectMuscle(key) {
  state.selectedMuscle = key;
  const mg = MUSCLE_GROUPS[key];
  if (!mg) return;

  /* 只存在于背面的肌群：自动翻到背面，避免点了却看不到高亮 */
  const BACK_ONLY = ['back', 'lats', 'lower_back', 'triceps', 'glutes', 'hamstrings'];
  if (BACK_ONLY.includes(key) && state.bodyView !== 'back') showBodyView('back');

  /* 图例 / 动作库点进来时，人体图同步高亮 */
  const c = document.getElementById('bodySvgContainer');
  if (c) c.querySelectorAll('.muscle').forEach(x =>
    x.classList.toggle('on', x.dataset.muscle === key));

  document.getElementById('muscleName').textContent = mg.name;
  document.getElementById('muscleSub').textContent = '点动作看演示与要领';

  const exercises = EXERCISES.filter(e => e.primary.includes(key) || e.secondary.includes(key));

  let weeklySets = 0;
  DAYS.forEach(d => {
    (state.weeklyPlan[d]?.exercises || []).forEach(item => {
      const ex = EXERCISES.find(e => e.id === item.id);
      if (ex && (ex.primary.includes(key) || ex.secondary.includes(key))) weeklySets += parseInt(item.sets) || 3;
    });
  });

  const pct = Math.min((weeklySets / 20) * 100, 100);
  const color = weeklySets === 0 ? 'var(--t4)' : weeklySets < 8 ? 'var(--warn)' : weeklySets <= 20 ? 'var(--ok)' : 'var(--danger)';
  const label = weeklySets === 0 ? '未安排' : weeklySets < 8 ? '偏少' : weeklySets <= 20 ? '适中' : '偏多';

  document.getElementById('muscleExList').innerHTML = `
    <div class="vol">
      <div class="vol-top"><span class="l">本周训练量</span><span class="v" style="color:${color}">${weeklySets} 组 · ${label}</span></div>
      <div class="vol-track"><div class="vol-fill" style="width:${pct}%;background:${color}"></div></div>
    </div>
    <div class="ex-list">
      ${exercises.slice(0, 24).map(ex => {
        const isPri = ex.primary.includes(key);
        return `<div class="ex-row" onclick="showDetail('${ex.id}')">
          <div class="ex-thumb"><img src="${ex.gifUrl}" alt="" loading="lazy"></div>
          <div>
            <div class="ex-name">${ex.name}</div>
            <div class="ex-meta">${isPri?'主要目标':'辅助参与'} · ${DIFFICULTY[ex.difficulty]?.name||''}</div>
          </div>
        </div>`;
      }).join('')}
      ${exercises.length > 24 ? `<div style="text-align:center;padding:8px;font-size:11.5px;color:var(--t4)">还有 ${exercises.length - 24} 个动作</div>` : ''}
    </div>`;
}

/* ─── 点遮罩关闭弹窗（后开先关，跟 Esc 一致） ─── */
document.addEventListener('click', e => {
  if (!e.target.classList || !e.target.classList.contains('overlay')) return;
  const id = e.target.id;
  if (id === 'sessionModal' && typeof closeSession === 'function') closeSession();
  else closeModal(id);
});

/* ─── Keyboard ─── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const lb = [...document.querySelectorAll('.lightbox.on')].pop();
    if (lb) { lb.classList.remove('on'); return; }
    /* 后开先关：优先弹窗栈，栈空则退回 DOM 顺序 */
    let topId = _modalStack[_modalStack.length - 1];
    let top = topId ? document.getElementById(topId) : null;
    if (!top || !top.classList.contains('on')) {
      top = [...document.querySelectorAll('.overlay.on')].pop();
      topId = top ? top.id : null;
    }
    if (top) {
      if (topId === 'sessionModal' && typeof closeSession === 'function') closeSession();
      else closeModal(topId);
    }
    return;
  }
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) {
    e.preventDefault();
    const s = document.getElementById('searchInput');
    if (s) { switchView('library'); s.focus(); }
  }
});
