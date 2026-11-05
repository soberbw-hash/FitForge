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
  favorites: [],
  trainingLog: [],
  pickerTargetDay: null,
  displayLimit: 48,
  muscleFilter: 'all',
  forceFilter: 'all',
  mechanicFilter: 'all',
};

const BODY_SVG = {
  front: `<svg viewBox="0 0 360 620" class="body-svg" xmlns="http://www.w3.org/2000/svg">
  <g class="body-silhouette">
    <path d="M180,18 C197,18 210,32 210,49 C210,62 204,73 196,79
             L200,90 C214,95 232,103 244,114 C256,125 262,140 263,157
             L265,196 C266,210 262,224 254,234 L246,244
             C245,266 244,286 244,304 L243,352
             C250,372 254,398 253,424 C252,446 249,464 246,478
             L243,506 C243,516 240,524 233,527 C227,529 221,525 220,517
             L216,478 C214,462 212,444 211,426
             C203,434 197,446 195,462 L193,516
             C192,525 187,530 180,530 C173,530 168,525 167,516
             L165,462 C163,446 157,434 149,426
             C148,444 146,462 144,478 L140,517
             C139,525 133,529 127,527 C120,524 117,516 117,506
             L114,478 C111,464 108,446 107,424 C106,398 110,372 117,352
             L116,304 C116,286 115,266 114,244
             C106,234 94,210 95,196 L97,157
             C98,140 104,125 116,114 C128,103 146,95 160,90
             L164,79 C156,73 150,62 150,49 C150,32 163,18 180,18 Z"/>
  </g>

  <g>
    <!-- 斜方肌 -->
    <path class="muscle" data-muscle="traps" d="M162,84 C171,79 189,79 198,84 L203,110 C191,101 169,101 157,110 Z" fill="#D9707F"/>
    <!-- 肩部（三角肌） -->
    <ellipse class="muscle" data-muscle="shoulders" cx="140" cy="120" rx="30" ry="34" fill="#D9A93E"/>
    <ellipse class="muscle" data-muscle="shoulders" cx="220" cy="120" rx="30" ry="34" fill="#D9A93E"/>
    <!-- 胸肌 -->
    <path class="muscle" data-muscle="chest" d="M154,98 C166,91 177,96 180,101 L180,150 C164,155 153,145 149,127 C146,114 148,102 154,98 Z" fill="#D4574E"/>
    <path class="muscle" data-muscle="chest" d="M206,98 C194,91 183,96 180,101 L180,150 C196,155 207,145 211,127 C214,114 212,102 206,98 Z" fill="#D4574E"/>
    <!-- 肱二头肌 -->
    <path class="muscle" data-muscle="biceps" d="M121,142 C131,140 138,147 138,161 L136,202 C134,216 122,218 117,206 L111,166 C110,152 115,143 121,142 Z" fill="#6FA85C"/>
    <path class="muscle" data-muscle="biceps" d="M239,142 C229,140 222,147 222,161 L224,202 C226,216 238,218 243,206 L249,166 C250,152 245,143 239,142 Z" fill="#6FA85C"/>
    <!-- 前臂 -->
    <path class="muscle" data-muscle="forearms" d="M113,210 C120,207 127,212 128,222 L129,258 C129,271 120,275 114,265 L106,226 C105,217 108,211 113,210 Z" fill="#559FB0"/>
    <path class="muscle" data-muscle="forearms" d="M247,210 C240,207 233,212 232,222 L231,258 C231,271 240,275 246,265 L254,226 C255,217 252,211 247,210 Z" fill="#559FB0"/>
    <!-- 腹直肌 -->
    <rect class="muscle" data-muscle="abs" x="160" y="150" width="40" height="108" rx="11" fill="#5D89C4"/>
    <!-- 腹斜肌 -->
    <path class="muscle" data-muscle="obliques" d="M138,150 C149,147 156,152 158,160 L157,252 C147,248 140,238 136,222 C132,204 132,166 138,150 Z" fill="#7B76BE"/>
    <path class="muscle" data-muscle="obliques" d="M222,150 C211,147 204,152 202,160 L203,252 C213,248 220,238 224,222 C228,204 228,166 222,150 Z" fill="#7B76BE"/>
    <!-- 股四头肌 -->
    <path class="muscle" data-muscle="quadriceps" d="M147,266 C159,261 169,268 170,282 L167,346 C166,362 155,366 148,354 C142,340 141,292 147,266 Z" fill="#8C7CC4"/>
    <path class="muscle" data-muscle="quadriceps" d="M213,266 C201,261 191,268 190,282 L193,346 C194,362 205,366 212,354 C218,340 219,292 213,266 Z" fill="#8C7CC4"/>
    <!-- 小腿 -->
    <path class="muscle" data-muscle="calves" d="M148,374 C157,369 165,376 166,388 L165,440 C164,454 153,457 147,446 C142,432 143,392 148,374 Z" fill="#CE6A94"/>
    <path class="muscle" data-muscle="calves" d="M212,374 C203,369 195,376 194,388 L195,440 C196,454 207,457 213,446 C218,432 217,392 212,374 Z" fill="#CE6A94"/>
  </g>
</svg>`,

  back: `<svg viewBox="0 0 360 620" class="body-svg" xmlns="http://www.w3.org/2000/svg">
  <g class="body-silhouette">
    <path d="M180,18 C197,18 210,32 210,49 C210,62 204,73 196,79
             L200,90 C214,95 232,103 244,114 C256,125 262,140 263,157
             L265,196 C266,210 262,224 254,234 L246,244
             C245,266 244,286 244,304 L243,352
             C250,372 254,398 253,424 C252,446 249,464 246,478
             L243,506 C243,516 240,524 233,527 C227,529 221,525 220,517
             L216,478 C214,462 212,444 211,426
             C203,434 197,446 195,462 L193,516
             C192,525 187,530 180,530 C173,530 168,525 167,516
             L165,462 C163,446 157,434 149,426
             C148,444 146,462 144,478 L140,517
             C139,525 133,529 127,527 C120,524 117,516 117,506
             L114,478 C111,464 108,446 107,424 C106,398 110,372 117,352
             L116,304 C116,286 115,266 114,244
             C106,234 94,210 95,196 L97,157
             C98,140 104,125 116,114 C128,103 146,95 160,90
             L164,79 C156,73 150,62 150,49 C150,32 163,18 180,18 Z"/>
  </g>

  <g>
    <!-- 斜方肌 -->
    <path class="muscle" data-muscle="traps" d="M158,86 C168,77 192,77 202,86 L208,122 C194,111 166,111 152,122 Z" fill="#D9707F"/>
    <!-- 肩部 -->
    <ellipse class="muscle" data-muscle="shoulders" cx="138" cy="122" rx="30" ry="34" fill="#D9A93E"/>
    <ellipse class="muscle" data-muscle="shoulders" cx="222" cy="122" rx="30" ry="34" fill="#D9A93E"/>
    <!-- 背阔肌 -->
    <path class="muscle" data-muscle="lats" d="M152,112 C165,105 175,109 177,120 L176,198 C171,212 159,218 150,213 C141,202 142,136 152,112 Z" fill="#DE9155"/>
    <path class="muscle" data-muscle="lats" d="M208,112 C195,105 185,109 183,120 L184,198 C189,212 201,218 210,213 C219,202 218,136 208,112 Z" fill="#DE9155"/>
    <!-- 三角肌后束 -->
    <ellipse class="muscle" data-muscle="shoulders" cx="118" cy="148" rx="21" ry="25" fill="#D9A93E"/>
    <ellipse class="muscle" data-muscle="shoulders" cx="242" cy="148" rx="21" ry="25" fill="#D9A93E"/>
    <!-- 肱三头肌 -->
    <path class="muscle" data-muscle="triceps" d="M120,150 C130,148 137,155 137,169 L135,204 C133,218 121,220 116,208 L110,170 C109,157 114,151 120,150 Z" fill="#43A294"/>
    <path class="muscle" data-muscle="triceps" d="M240,150 C230,148 223,155 223,169 L225,204 C227,218 239,220 244,208 L250,170 C251,157 246,151 240,150 Z" fill="#43A294"/>
    <!-- 前臂 -->
    <path class="muscle" data-muscle="forearms" d="M111,212 C118,209 125,214 126,224 L127,260 C127,273 118,277 112,267 L104,228 C103,219 106,213 111,212 Z" fill="#559FB0"/>
    <path class="muscle" data-muscle="forearms" d="M249,212 C242,209 235,214 234,224 L233,260 C233,273 242,277 248,267 L256,228 C257,219 254,213 249,212 Z" fill="#559FB0"/>
    <!-- 下背 -->
    <rect class="muscle" data-muscle="lower_back" x="161" y="198" width="38" height="76" rx="10" fill="#C9A03F"/>
    <!-- 臀部 -->
    <ellipse class="muscle" data-muscle="glutes" cx="161" cy="294" rx="31" ry="28" fill="#BE63B4"/>
    <ellipse class="muscle" data-muscle="glutes" cx="199" cy="294" rx="31" ry="28" fill="#BE63B4"/>
    <!-- 腘绳肌 -->
    <path class="muscle" data-muscle="hamstrings" d="M147,302 C159,297 169,304 170,318 L167,370 C166,386 155,390 148,378 C142,364 141,316 147,302 Z" fill="#9E70C4"/>
    <path class="muscle" data-muscle="hamstrings" d="M213,302 C201,297 191,304 190,318 L193,370 C194,386 205,390 212,378 C218,364 219,316 213,302 Z" fill="#9E70C4"/>
    <!-- 小腿 -->
    <path class="muscle" data-muscle="calves" d="M148,388 C157,383 165,390 166,402 L165,448 C164,462 153,465 147,454 C142,440 143,404 148,388 Z" fill="#CE6A94"/>
    <path class="muscle" data-muscle="calves" d="M212,388 C203,383 195,390 194,402 L195,448 C196,462 207,465 213,454 C218,440 217,404 212,388 Z" fill="#CE6A94"/>
  </g>
</svg>`
};

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
  try { state.favorites = _get('ff_favs', []); } catch(e) { state.favorites = []; }
  try { state.trainingLog = _get('ff_log', []); } catch(e) { state.trainingLog = []; }
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
  try { renderStats(); } catch(e) {}
  try { updateFavCount(); } catch(e) {}
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
  if (v === 'stats') renderStats();
  if (v === 'planner') renderWeek();
  if (v === 'log') renderLogView();
  if (v === 'favorites') renderFavorites();
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
  for (const [k, v] of Object.entries(EQUIPMENT)) {
    h += `<option value="${k}">${v.name}</option>`;
  }
  sel.innerHTML = h;
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
  const diff = document.getElementById('diffSelect')?.value || 'all';
  return EXERCISES.filter(ex => {
    if (q && !ex.name.toLowerCase().includes(q) && !(ex.nameEn || '').toLowerCase().includes(q)) return false;
    if (state.muscleFilter !== 'all' && !ex.primary.includes(state.muscleFilter) && !ex.secondary.includes(state.muscleFilter)) return false;
    if (eq !== 'all' && ex.equipment !== eq) return false;
    if (diff !== 'all' && ex.difficulty !== diff) return false;
    if (state.forceFilter !== 'all' && ex.force !== state.forceFilter) return false;
    if (state.mechanicFilter !== 'all' && ex.mechanic !== state.mechanicFilter) return false;
    return true;
  });
}

/* ═══ GRID ═══ */
function cardHTML(ex, showFav = true) {
  const mg = MUSCLE_GROUPS[ex.primary[0]];
  const diffCls = { beginner:'beg', intermediate:'int', advanced:'adv' }[ex.difficulty] || 'beg';
  const diffName = DIFFICULTY[ex.difficulty]?.name || '';
  const isFav = state.favorites.includes(ex.id);
  const eq = EQUIPMENT[ex.equipment]?.name || ex.equipment;

  return `<article class="card" onclick="showDetail('${ex.id}')">
    <div class="card-media">
      <img src="${ex.gifUrl}" alt="${ex.name}" loading="lazy">
      ${showFav ? `<button class="fav ${isFav?'on':''}" onclick="event.stopPropagation();toggleFav('${ex.id}')" title="收藏">${ic(isFav?'heart-fill':'heart')}</button>` : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${ex.name}</div>
      <div class="card-foot">
        <div class="card-tags">
          <span class="badge ${diffCls}">${diffName}</span>
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

/* ─── Favorites ─── */
function toggleFav(id) {
  const idx = state.favorites.indexOf(id);
  if (idx >= 0) { state.favorites.splice(idx, 1); toast('已取消收藏'); }
  else { state.favorites.push(id); toast('已加入收藏'); }
  _set('ff_favs', state.favorites);
  updateFavCount();
  renderGrid();
  if (state.view === 'favorites') renderFavorites();
}
function updateFavCount() {
  const el = document.getElementById('favCount');
  if (!el) return;
  el.textContent = state.favorites.length;
  el.dataset.zero = state.favorites.length ? '0' : '1';
}
function renderFavorites() {
  const grid = document.getElementById('favGrid');
  if (!grid) return;
  const favs = EXERCISES.filter(e => state.favorites.includes(e.id));
  if (favs.length === 0) {
    grid.innerHTML = emptyHTML('heart', '这里还空着', '把常练的动作收进来，下次一点就到',
      `<button class="btn btn-solid btn-sm" onclick="switchView('library')">${ic('grid')}去挑动作</button>`);
    return;
  }
  grid.innerHTML = favs.map(ex => cardHTML(ex)).join('');
}

/* ═══ DETAIL ═══ */
function showDetail(id) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return;

  const mg = MUSCLE_GROUPS[ex.primary[0]];
  const eq = EQUIPMENT[ex.equipment]?.name || ex.equipment;
  const diff = DIFFICULTY[ex.difficulty]?.name || '';
  const mech = MECHANIC[ex.mechanic]?.name || '';

  const seenTag = new Set();
  const tags = [
    ...ex.primary.map(m => ({ t: MUSCLE_GROUPS[m]?.name || m, pri: true })),
    ...ex.secondary.map(m => ({ t: MUSCLE_GROUPS[m]?.name || m, pri: false })),
    { t: eq }, { t: diff }, { t: FORCE_LABEL[ex.force] }, { t: mech }
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
    <button class="btn btn-soft" onclick="startRestTimer(${ex.restSec})">${ic('clock')}休息计时</button>
  `;

  openModal('detailModal');
}

function addToPlanFromDetail(id) {
  closeModal('detailModal');
  state.pickerTargetDay = null;
  showDayPicker(id);
}

function showDayPicker(exId) {
  const ex = EXERCISES.find(e => e.id === exId);
  if (!ex) return;
  const search = document.querySelector('#pickerModal .search');
  if (search) search.style.display = '';
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
  toast(`「${ex.name}」已加入${DAY_NAMES[dayKey]}`);
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

/* ═══ TRAINING LOG ═══ */
function showLogModal() {
  const today = new Date().toLocaleDateString('zh-CN');
  const dayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const plan = state.weeklyPlan[dayKey]?.exercises || [];

  if (plan.length === 0) {
    toast('今天没有安排训练动作', 'err');
    return;
  }

  document.getElementById('logDate').textContent = today;
  document.getElementById('logExList').innerHTML = plan.map((item, i) => {
    const ex = EXERCISES.find(e => e.id === item.id);
    if (!ex) return '';
    return `<div class="log-ex">
      <div class="ln">${ex.name}</div>
      <div class="log-input">
        <input type="number" value="${parseInt(item.sets)||3}" id="logSets${i}" min="1" title="组数">×
        <input type="number" value="${parseInt(item.reps)||10}" id="logReps${i}" min="1" title="次数">
        <input type="number" class="w" placeholder="kg" id="logWeight${i}" min="0" step="0.5" title="重量">
      </div>
    </div>`;
  }).join('');

  openModal('logModal');
}

function saveLog() {
  const today = new Date().toLocaleDateString('zh-CN');
  const dayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const plan = state.weeklyPlan[dayKey]?.exercises || [];

  const entry = {
    date: today,
    timestamp: Date.now(),
    exercises: plan.map((item, i) => {
      const ex = EXERCISES.find(e => e.id === item.id);
      return {
        id: item.id,
        name: ex?.name || '',
        sets: parseInt(document.getElementById(`logSets${i}`)?.value) || 3,
        reps: parseInt(document.getElementById(`logReps${i}`)?.value) || 10,
        weight: parseFloat(document.getElementById(`logWeight${i}`)?.value) || 0,
      };
    }).filter(e => e.name)
  };

  state.trainingLog.unshift(entry);
  if (state.trainingLog.length > 100) state.trainingLog = state.trainingLog.slice(0, 100);
  _set('ff_log', state.trainingLog);
  closeModal('logModal');
  toast('训练记录已保存');
  if (state.view === 'log') renderLogView();
}

function renderLogView() {
  const container = document.getElementById('logList');
  if (!container) return;
  if (state.trainingLog.length === 0) {
    container.innerHTML = emptyHTML('clipboard', '还没有训练记录', '跟着计划练一次，数据会自动存进来',
      `<button class="btn btn-solid btn-sm" onclick="startSession()">${ic('play')}开始今天的训练</button>
       <button class="btn btn-ghost btn-sm" onclick="showLogModal()">${ic('plus')}补录一次</button>`);
    return;
  }
  container.innerHTML = state.trainingLog.map(entry => `
    <div class="log-card">
      <div class="log-date">${entry.date}</div>
      ${entry.exercises.map(ex => `
        <div class="log-ex">
          <div class="ln">${ex.name}</div>
          <div class="ls">${ex.sets}×${ex.reps}${ex.weight ? ' @'+ex.weight+'kg' : ''}</div>
        </div>`).join('')}
    </div>`).join('');
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
  c.querySelectorAll('.muscle').forEach(r => {
    r.addEventListener('click', () => {
      c.querySelectorAll('.muscle').forEach(x => x.classList.remove('on'));
      r.classList.add('on');
      selectMuscle(r.dataset.muscle);
    });
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

/* ═══ STATS ═══ */
function renderStats() {
  const grid = document.getElementById('statsRow');
  const detail = document.getElementById('statsDetail');
  if (!grid) return;

  let totalEx = 0, totalSets = 0;
  const muscles = new Set(), equips = new Set();
  DAYS.forEach(d => {
    (state.weeklyPlan[d]?.exercises || []).forEach(item => {
      totalEx++;
      totalSets += parseInt(item.sets) || 3;
      const ex = EXERCISES.find(e => e.id === item.id);
      if (ex) {
        ex.primary.forEach(m => muscles.add(m));
        ex.secondary.forEach(m => muscles.add(m));
        equips.add(ex.equipment);
      }
    });
  });
  const trainDays = DAYS.filter(d => (state.weeklyPlan[d]?.exercises || []).length > 0).length;
  const totalMuscles = Object.keys(MUSCLE_GROUPS).length;

  grid.innerHTML = `
    <div class="stat"><div class="stat-v">${totalEx}</div><div class="stat-l">计划动作数</div><div class="stat-tag ok">${trainDays} 个训练日</div></div>
    <div class="stat"><div class="stat-v">${totalSets}</div><div class="stat-l">总训练组数</div><div class="stat-tag ok">本周安排</div></div>
    <div class="stat"><div class="stat-v">${muscles.size}<small>/${totalMuscles}</small></div><div class="stat-l">覆盖肌群</div><div class="stat-tag ${muscles.size===totalMuscles?'ok':'no'}">${muscles.size===totalMuscles?'全部练到':(totalMuscles-muscles.size)+' 个待补'}</div></div>
    <div class="stat"><div class="stat-v">${state.trainingLog.length}</div><div class="stat-l">训练记录</div><div class="stat-tag ok">累计</div></div>
  `;

  const coverage = Object.entries(MUSCLE_GROUPS).map(([key, mg]) => {
    let sets = 0;
    DAYS.forEach(d => {
      (state.weeklyPlan[d]?.exercises || []).forEach(item => {
        const ex = EXERCISES.find(e => e.id === item.id);
        if (ex && (ex.primary.includes(key) || ex.secondary.includes(key))) sets += parseInt(item.sets)||3;
      });
    });
    return { key, ...mg, sets };
  }).sort((a,b) => b.sets - a.sets);

  const active = coverage.filter(m => m.sets > 0);
  const idle = coverage.length - active.length;
  detail.innerHTML = `
    <div class="chart-card">
      <h3>各肌群训练量分布 <span class="chart-sub">本周计划</span></h3>
      ${active.length ? active.map(m => `
        <div class="brow">
          <div class="blabel"><span class="bdot" style="background:${m.color}"></span>${m.name}</div>
          <div class="btrack"><div class="bfill" style="width:${Math.min((m.sets/20)*100,100)}%;background:${m.color}"></div></div>
          <div class="bval">${m.sets} 组</div>
        </div>`).join('')
        : '<p class="tool-note">还没安排训练动作，先去周计划挑一套模板。</p>'}
      ${idle ? `<p class="chart-foot">另有 ${idle} 个肌群本周未安排</p>` : ''}
    </div>`;
}

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
