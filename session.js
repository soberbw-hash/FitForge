/* ═══════════════════════════════════════════════════════════
 * 跟练演示：从周计划或今日训练卡进入，大 GIF 循环 → 分步要领 → 逐组打勾 → 休息计时
 * 只是按计划看动作的引导器：不记录成绩、不写训练日志、不保存个人数据
 * 仅临时存一下「看到第几个动作」，方便中断续看
 * ═══════════════════════════════════════════════════════════ */

const SESSION = {
  on: false, day: null, items: [], idx: 0,
  started: 0, rest: 0, restTimer: null, wake: null, finished: false
};

function ssGet(k, d) { try { return _get(k, d); } catch (e) { return d; } }
function ssSet(k, v) { try { _set(k, v); } catch (e) {} }

function beep(freq, ms) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ac = new AC(), o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = freq || 880; o.type = 'sine';
    g.gain.setValueAtTime(.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.12, ac.currentTime + .01);
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + (ms || 180) / 1000);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + (ms || 180) / 1000 + .02);
    setTimeout(() => ac.close(), 400);
  } catch (e) {}
}

async function requestWake() {
  try { if ('wakeLock' in navigator) SESSION.wake = await navigator.wakeLock.request('screen'); } catch (e) {}
}
function releaseWake() {
  try { if (SESSION.wake) SESSION.wake.release(); } catch (e) {}
  SESSION.wake = null;
}

/* ─── 启动 ─── */
function startSession(dayKey, resume) {
  const todayKey = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const saved = resume ? ssGet('ff_session', null) : null;
  /* 「继续训练」直接续上次那天，即使今天是休息日 */
  const key = dayKey || (resume && saved && saved.items && saved.items.length ? saved.day : todayKey);
  const plan = state.weeklyPlan[key]?.exercises || [];
  if (!plan.length && !dayKey) {
    /* 今天休息：直接列出有安排的训练日，而不是只报错 */
    const trained = DAYS.filter(d => (state.weeklyPlan[d]?.exercises || []).length);
    if (!trained.length) {
      toast('本周还没有训练安排', 'ok', {
        label: '去周计划',
        fn: () => switchView('planner')
      });
      return;
    }
    showStartDayPicker(trained);
    return;
  }
  if (!plan.length) { toast('这天没有安排训练动作，先去周计划选一套模板', 'err'); return; }

  const snap = saved && saved.day === key ? saved : null;
  if (snap && snap.items && snap.items.length) {
    SESSION.items = snap.items; SESSION.idx = Math.min(snap.idx || 0, snap.items.length - 1);
    SESSION.started = snap.started || Date.now();
    toast('已恢复上次的训练进度');
  } else {
    SESSION.items = plan.map(it => {
      const ex = EXERCISES.find(e => e.id === it.id);
      if (!ex) return null;
      const n = Math.max(1, Math.min(8, parseInt(it.sets) || 3));
      const reps = String(it.reps || ex.repRange || '10').replace(/[^0-9].*$/, '') || '10';
      const weight = (it.weight !== '' && it.weight != null) ? it.weight : '';
      return {
        id: it.id, name: ex.name, gif: ex.gifUrl, rest: ex.restSec || 60,
        target: (EXERCISE_EXTRA[it.id] || {}).t || '',
        equip: (EQUIPMENT[ex.equipment] || {}).name || '',
        steps: ex.steps || [], planSets: n,
        sets: Array.from({ length: n }, () => ({ reps, weight, rpe: '', done: false }))
      };
    }).filter(Boolean);
    SESSION.idx = 0; SESSION.started = Date.now();
  }
  if (!SESSION.items.length) { toast('计划里的动作都找不到，请重新选模板', 'err'); return; }

  SESSION.day = key; SESSION.on = true; SESSION.finished = false;
  SESSION.rest = 0; clearInterval(SESSION.restTimer);
  requestWake();
  openModal('sessionModal');
  renderSession();
}

/* 今天休息时：列出有安排的训练日，直接点一天开练 */
function showStartDayPicker(trained) {
  document.getElementById('pickerTitle').textContent = '今天休息 · 选一天开练';
  const search = document.querySelector('#pickerModal .search');
  if (search) search.style.display = 'none';
  document.getElementById('pickerList').innerHTML = trained.map(d => {
    const day = state.weeklyPlan[d] || { name: '', exercises: [] };
    return `<div class="pick" onclick="closeModal('pickerModal');startSession('${d}')">
      <div class="pick-info">
        <div class="pick-name">${DAY_NAMES[d]} · ${day.name || '训练'}</div>
        <div class="pick-meta">${day.exercises.length} 个动作 · 点击开始</div>
      </div>
      <div class="pick-add">${ic('play')}</div>
    </div>`;
  }).join('');
  openModal('pickerModal');
}

/* 单个动作临时跟练（从动作详情进入） */
function startSingleSession(id) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return;
  const key = '__single__';
  state.weeklyPlan[key] = {
    name: '单动作练习',
    exercises: [{ id, sets: ex.setRange || '3', reps: (String(ex.repRange || '10').match(/^\d+/) || ['10'])[0], weight: '' }]
  };
  ssSet('ff_session', null);
  startSession(key);
}

function closeSession() {
  if (SESSION.on && !SESSION.finished) {
    ssSet('ff_session', {
      day: SESSION.day, items: SESSION.items, idx: SESSION.idx, started: SESSION.started
    });
    toast('进度已保存，可从「继续训练」恢复');
  }
  SESSION.on = false;
  clearInterval(SESSION.restTimer);
  releaseWake();
  closeModal('sessionModal');
}
function hasSavedSession() {
  const s = ssGet('ff_session', null);
  return !!(s && s.items && s.items.length && !s.done);
}

/* ─── 渲染 ─── */
function renderSession() {
  const body = document.getElementById('sessionBody');
  const foot = document.getElementById('sessionFoot');
  const head = document.getElementById('sessionHead');
  if (!body || !SESSION.on) return;

  const it = SESSION.items[SESSION.idx];
  const doneCount = SESSION.items.reduce((n, x) => n + x.sets.filter(s => s.done).length, 0);
  const allSets = SESSION.items.reduce((n, x) => n + x.sets.length, 0);
  const pct = allSets ? Math.round(doneCount / allSets * 100) : 0;

  if (head) head.innerHTML = `
    <div class="ss-title"><b>${DAY_NAMES[SESSION.day] ? DAY_NAMES[SESSION.day] + ' · ' : ''}${state.weeklyPlan[SESSION.day]?.name || '训练'}</b>
      <span>动作 ${SESSION.idx + 1} / ${SESSION.items.length} · 已完成 ${doneCount}/${allSets} 组</span></div>
    <div class="ss-bar"><i style="width:${pct}%"></i></div>`;

  const doneSets = it.sets.filter(s => s.done).length;
  body.innerHTML = `
    <div class="ss-media">
      <img src="${it.gif}" alt="${it.name}">
      <span class="ss-idx">${String(SESSION.idx + 1).padStart(2, '0')}</span>
    </div>
    <div class="ss-info">
      <h2>${it.name}</h2>
      <div class="ss-meta">${it.sets.length} 组 × ${it.sets[0].reps} 次 · ${it.equip}${it.target ? ' · ' + it.target : ''} · 组间 ${it.rest}s</div>
      ${it.steps.length ? `<details class="ss-steps" open><summary>怎么做 · ${it.steps.length} 步 ${ic('arrow-right')}</summary>
        <ol>${it.steps.map(s => `<li>${s}</li>`).join('')}</ol></details>` : ''}
    </div>
    <div class="ss-sets">
      <div class="ss-sets-head"><span>组</span><span>次数</span><span>重量 kg</span><span>努力度</span><span>完成</span></div>
      ${it.sets.map((s, i) => `
        <div class="ss-set ${s.done ? 'ok' : ''} ${!s.done && i === doneSets ? 'cur' : ''}">
          <span class="ss-n">${i + 1}</span>
          <input type="number" min="0" value="${s.reps}" onchange="sessionSetVal(${i},'reps',this.value)" ${s.done ? 'disabled' : ''}>
          <input type="number" min="0" step="0.5" value="${s.weight}" placeholder="自重" onchange="sessionSetVal(${i},'weight',this.value)" ${s.done ? 'disabled' : ''}>
          <select onchange="sessionSetVal(${i},'rpe',this.value)" ${s.done ? 'disabled' : ''}>
            <option value="">RPE</option>
            ${[6, 7, 8, 9, 10].map(v => `<option value="${v}" ${String(s.rpe) === String(v) ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <button class="ss-tick" onclick="toggleSessionSet(${i})">${ic(s.done ? 'check' : 'check')}</button>
        </div>`).join('')}
    </div>`;

  if (foot) {
    const resting = SESSION.rest > 0;
    foot.innerHTML = `
      <button class="btn btn-ghost" onclick="closeSession()">${ic('x')}退出</button>
      ${resting ? `<div class="ss-rest"><b id="ssRestNum">${SESSION.rest}</b>s 休息中
        <button class="btn btn-soft btn-sm" onclick="skipRest()">跳过</button></div>` : ''}
      <div class="ss-foot-right">
        <button class="btn btn-soft" onclick="prevSessionExercise()" ${SESSION.idx === 0 ? 'disabled' : ''}>上一个</button>
        ${SESSION.idx < SESSION.items.length - 1
          ? `<button class="btn btn-solid" onclick="nextSessionExercise()">${ic('arrow-right')}下一个动作</button>`
          : `<button class="btn btn-solid" onclick="finishSession()">${ic('check')}完成训练</button>`}
      </div>`;
  }
}

function sessionSetVal(i, field, val) {
  const s = SESSION.items[SESSION.idx]?.sets[i];
  if (!s || s.done) return;
  s[field] = val;
  persistSession();
}

function persistSession() {
  if (SESSION.on && !SESSION.finished) ssSet('ff_session', {
    day: SESSION.day, items: SESSION.items, idx: SESSION.idx, started: SESSION.started
  });
}

function toggleSessionSet(i) {
  const it = SESSION.items[SESSION.idx];
  const s = it.sets[i];
  if (!s) return;
  s.done = !s.done;
  if (s.done) {
    beep(880, 140);
    // 只有还有未完成组时才自动休息
    if (it.sets.some(x => !x.done)) startRest(it.rest);
    else { clearInterval(SESSION.restTimer); SESSION.rest = 0; beep(1180, 260); }
  }
  persistSession();
  renderSession();
}

function startRest(sec) {
  clearInterval(SESSION.restTimer);
  SESSION.rest = Math.max(5, parseInt(sec) || 60);
  SESSION.restTimer = setInterval(() => {
    SESSION.rest--;
    const n = document.getElementById('ssRestNum');
    if (n) n.textContent = SESSION.rest;
    if (SESSION.rest <= 0) {
      clearInterval(SESSION.restTimer);
      beep(1320, 320);
      try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) {}
      renderSession();
    }
  }, 1000);
}
function skipRest() {
  clearInterval(SESSION.restTimer); SESSION.rest = 0; renderSession();
}
function prevSessionExercise() {
  if (SESSION.idx > 0) { SESSION.idx--; skipRest(); persistSession(); }
}
function nextSessionExercise() {
  if (SESSION.idx < SESSION.items.length - 1) {
    SESSION.idx++; skipRest(); persistSession();
    renderSession();
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
  }
}

/* ─── 结束 & 本次汇总（不写入任何存储） ─── */
function finishSession() {
  let volume = 0, doneSets = 0;
  SESSION.items.forEach(it => {
    const done = it.sets.filter(s => s.done);
    doneSets += done.length;
    volume += done.reduce((n, s) => n + (parseInt(s.reps) || 0) * (parseFloat(s.weight) || 0), 0);
  });

  const mins = Math.max(1, Math.round((Date.now() - SESSION.started) / 60000));
  ssSet('ff_session', { done: true, at: Date.now() });

  SESSION.finished = true; SESSION.on = false;
  clearInterval(SESSION.restTimer); releaseWake();
  beep(1046, 200); setTimeout(() => beep(1318, 300), 180);

  document.getElementById('sessionHead').innerHTML = '<div class="ss-title"><b>跟练结束</b><span>本次结果不保存</span></div>';
  document.getElementById('sessionBody').innerHTML = `
    <div class="ss-done">
      <div class="ss-done-icon">${ic('check')}</div>
      <h2>这一轮看完了</h2>
      <div class="ss-sum">
        <div><b>${SESSION.items.length}</b><span>动作</span></div>
        <div><b>${doneSets}</b><span>完成组数</span></div>
        <div><b>${mins}</b><span>分钟</span></div>
        <div><b>${Math.round(volume)}</b><span>总容量 kg</span></div>
      </div>
      <p class="ss-note">本站不记录训练数据，以上只在本次显示，关掉就没了。想留档请导出训练卡图片。</p>
    </div>`;
  document.getElementById('sessionFoot').innerHTML = `
    <button class="btn btn-solid" onclick="closeSession()">完成</button>`;
}
