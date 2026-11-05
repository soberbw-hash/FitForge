/* ═══════════════════════════════════════════════════════════
 * 训练卡导出：把周计划按天渲染成「会动的 GIF」或「静态 PNG」
 * - 一天一张，五个训练日就是五张
 * - GIF 里每个动作的演示循环播放，保存到相册/发微信都能直接看
 * - 面板内可直接预览动图、点动作看大图、单张保存、一键保存全部
 * - 动画帧来自内嵌的 anim_frames（sprite sheet dataURL），全程离线
 * - GIF 由 gif_encoder.js 现场编码：整卡首帧 + 动作列局部帧更新
 * ═══════════════════════════════════════════════════════════ */

const CARD = {
  W: 1080,
  PAD: 64,
  HEADER: 286,
  ITEM_H: 316,
  ITEM_H_NOTE: 392,
  FOOTER: 132,
  FONT: '"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif'
};

const ANIM = { FRAMES: 8, SRC: 112, DELAY: 140 };

let exportState = {
  range: 'all', format: 'gif', withNotes: true,
  cards: [], active: 0, busy: false, token: 0
};

/* ─── 小工具 ─── */
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function setFont(ctx, size, weight) {
  ctx.font = (weight || 400) + ' ' + size + 'px ' + CARD.FONT;
}

/* 中文按字换行，返回实际绘制行数与结束 y */
function drawWrapped(ctx, text, x, y, maxW, lineH, maxLines) {
  const chars = Array.from(String(text || ''));
  const lines = [];
  let line = '';
  let overflow = false;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (line && ctx.measureText(line + ch).width > maxW) {
      lines.push(line);
      if (lines.length >= maxLines) { overflow = true; break; }
      line = ch;
    } else {
      line += ch;
    }
  }
  // 只有循环正常跑完才把最后一行收进来；短文本不应被误判为截断
  if (!overflow && line) lines.push(line);

  if (overflow && lines.length) {
    let last = lines[lines.length - 1];
    while (last && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    lines[lines.length - 1] = last + '…';
  }

  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
  return { lines: lines.length, endY: y + (lines.length - 1) * lineH };
}

function loadThumb(id) {
  return new Promise(resolve => {
    const src = (typeof EXERCISE_THUMBS !== 'undefined') && EXERCISE_THUMBS[id];
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function shortGist(text) {
  const parts = String(text || '').split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).join('');
}

function todayKey() {
  const n = new Date().getDay();
  return DAYS[n === 0 ? 6 : n - 1];
}

function exportDayKeys() {
  const has = d => (state.weeklyPlan[d]?.exercises || []).length > 0;
  if (exportState.range === 'today') {
    const k = todayKey();
    return has(k) ? [k] : [];
  }
  return DAYS.filter(has);
}

/* ─── 内嵌动画帧（懒解析，不拖慢软件启动） ─── */
function animFrames() {
  if (window._ANIM_FRAMES) return window._ANIM_FRAMES;
  let data = {};
  try {
    const el = document.getElementById('animFrames');
    if (el) data = JSON.parse(el.textContent);
  } catch (e) { console.warn('动画帧数据解析失败', e); }
  window._ANIM_FRAMES = data;
  return data;
}

function loadAnimSheet(id) {
  return new Promise(resolve => {
    const src = animFrames()[id];
    if (!src) { resolve(null); return; }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function ensureSheets(c) {
  if (!c.sheets) c.sheets = await Promise.all(c.items.map(x => loadAnimSheet(x.ex.id)));
  return c.sheets;
}

/* 把第 f 帧画到卡片左侧所有动作图的位置 */
function paintAnimFrames(ctx, sheets, f, items, itemH) {
  const P = CARD.PAD, IMG = 208;
  items.forEach((x, i) => {
    const sheet = sheets[i];
    const dx = P + 6, dy = CARD.HEADER + i * itemH + 14, d = IMG - 12;
    ctx.save();
    rr(ctx, dx, dy, d, d, 12);
    ctx.clip();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(dx, dy, d, d);
    if (sheet) {
      ctx.drawImage(sheet, f * ANIM.SRC, 0, ANIM.SRC, ANIM.SRC, dx, dy, d, d);
    } else {
      ctx.fillStyle = '#EDEAE3';
      ctx.fillRect(dx, dy, d, d);
    }
    ctx.restore();
  });
}

/* 生成一张会动的 GIF：第 0 帧整卡，其余帧只更新动作所在的竖条区域 */
async function makeAnimatedCard(c) {
  if (typeof GIFKit === 'undefined') return null;
  const sheets = await ensureSheets(c);
  if (!sheets.some(Boolean)) return null;

  const ctx = c.canvas.getContext('2d', { willReadFrequently: true });
  const P = CARD.PAD, IMG = 208;
  const rx = P + 6, ry = CARD.HEADER + 14, rw = IMG - 12;
  const rh = (c.items.length - 1) * c.itemH + rw;
  if (rh <= 0 || ry + rh > c.canvas.height) return null;

  const frames = [];
  for (let f = 0; f < ANIM.FRAMES; f++) {
    paintAnimFrames(ctx, sheets, f, c.items, c.itemH);
    const full = f === 0;
    const img = full
      ? ctx.getImageData(0, 0, c.canvas.width, c.canvas.height)
      : ctx.getImageData(rx, ry, rw, rh);
    frames.push({
      x: full ? 0 : rx, y: full ? 0 : ry,
      w: full ? c.canvas.width : rw, h: full ? c.canvas.height : rh,
      pixels: GIFKit.quantize(img.data), delay: ANIM.DELAY, disposal: 1
    });
    // 让出主线程，进度提示能刷新
    if (f < ANIM.FRAMES - 1) await new Promise(r => setTimeout(r, 0));
  }
  paintAnimFrames(ctx, sheets, 0, c.items, c.itemH);
  const bytes = GIFKit.encode(c.canvas.width, c.canvas.height, frames, 0);
  return new Blob([bytes], { type: 'image/gif' });
}

/* ─── 绘制单张训练卡（静态底图） ─── */
async function buildCard(dayKey) {
  const day = state.weeklyPlan[dayKey] || { name: '', exercises: [] };
  const items = day.exercises.map(it => ({
    it, ex: EXERCISES.find(e => e.id === it.id)
  })).filter(x => x.ex);

  const withNotes = exportState.withNotes;
  const itemH = withNotes ? CARD.ITEM_H_NOTE : CARD.ITEM_H;
  const H = CARD.HEADER + items.length * itemH + CARD.FOOTER + CARD.PAD;

  const canvas = document.createElement('canvas');
  canvas.width = CARD.W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const P = CARD.PAD;
  const innerW = CARD.W - P * 2;

  // 背景
  ctx.fillStyle = '#F7F6F3';
  ctx.fillRect(0, 0, CARD.W, H);

  // 顶部橙红色条
  ctx.fillStyle = '#E8502E';
  ctx.fillRect(0, 0, CARD.W, 10);

  // 品牌行
  ctx.fillStyle = '#E8502E';
  rr(ctx, P, 52, 40, 40, 11); ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  setFont(ctx, 24, 700);
  ctx.textBaseline = 'middle';
  ctx.fillText('F', P + 20, 73);
  ctx.textAlign = 'center';

  ctx.textAlign = 'left';
  ctx.fillStyle = '#17160F';
  setFont(ctx, 28, 680);
  ctx.fillText('FitForge', P + 54, 73);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#949086';
  setFont(ctx, 22, 500);
  ctx.fillText('WEEKLY TRAINING CARD', CARD.W - P, 73);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // 大标题
  const isToday = dayKey === todayKey();
  const title = DAY_NAMES[dayKey] + ' · ' + (day.name || '训练');
  ctx.fillStyle = '#17160F';
  setFont(ctx, 62, 700);
  ctx.fillText(title, P, 178);

  // 副标题
  const totalSets = items.reduce((s, x) => s + (parseInt(x.it.sets) || 3), 0);
  ctx.fillStyle = '#5F5C53';
  setFont(ctx, 27, 400);
  ctx.fillText(
    items.length + ' 个动作   ·   共 ' + totalSets + ' 组   ·   ' + (items.length * 8) + ' 分钟左右',
    P, 224
  );

  // 今天角标
  if (isToday) {
    const tw = 92;
    ctx.fillStyle = '#E8502E';
    rr(ctx, CARD.W - P - tw, 138, tw, 44, 22); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    setFont(ctx, 23, 600);
    ctx.textAlign = 'center';
    ctx.fillText('今天', CARD.W - P - tw / 2, 168);
    ctx.textAlign = 'left';
  }

  // 分隔线
  ctx.strokeStyle = 'rgba(24,22,18,.10)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P, CARD.HEADER - 26);
  ctx.lineTo(CARD.W - P, CARD.HEADER - 26);
  ctx.stroke();

  // 预载所有静态缩略图
  const thumbs = await Promise.all(items.map(x => loadThumb(x.ex.id)));

  // 动作块
  items.forEach((x, i) => {
    const { ex, it } = x;
    const top = CARD.HEADER + i * itemH;
    const mg = MUSCLE_GROUPS[ex.primary[0]];
    const eq = EQUIPMENT[ex.equipment]?.name || ex.equipment;
    const diff = DIFFICULTY[ex.difficulty]?.name || '';

    // 缩略图白底卡片
    const IMG = 208;
    ctx.save();
    ctx.shadowColor = 'rgba(24,22,18,.07)';
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#FFFFFF';
    rr(ctx, P, top + 8, IMG, IMG, 16); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(24,22,18,.07)';
    ctx.lineWidth = 1.5;
    rr(ctx, P, top + 8, IMG, IMG, 16); ctx.stroke();

    if (thumbs[i]) {
      ctx.save();
      rr(ctx, P + 6, top + 14, IMG - 12, IMG - 12, 12);
      ctx.clip();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(P + 6, top + 14, IMG - 12, IMG - 12);
      ctx.drawImage(thumbs[i], P + 6, top + 14, IMG - 12, IMG - 12);
      ctx.restore();
    } else {
      ctx.fillStyle = '#EDEAE3';
      setFont(ctx, 56, 700);
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1).padStart(2, '0'), P + IMG / 2, top + 8 + IMG / 2 + 20);
      ctx.textAlign = 'left';
    }

    const TX = P + IMG + 30;
    const TW = innerW - IMG - 30;

    // 序号
    ctx.fillStyle = '#E8502E';
    setFont(ctx, 23, 700);
    ctx.fillText(String(i + 1).padStart(2, '0'), TX, top + 40);

    // 动作名（单行，超长才省略）
    ctx.fillStyle = '#17160F';
    setFont(ctx, 40, 680);
    drawWrapped(ctx, ex.name, TX + 52, top + 44, TW - 52, 48, 1);

    // 英文名
    ctx.fillStyle = '#A9A399';
    setFont(ctx, 21, 400);
    drawWrapped(ctx, ex.nameEn || '', TX, top + 84, TW, 28, 1);

    // 组次
    ctx.fillStyle = '#17160F';
    setFont(ctx, 32, 650);
    const setsTxt = (it.sets || 3) + ' 组  ×  ' + (it.reps || 10) + ' 次'
      + (it.weight ? '     @ ' + it.weight + ' kg' : '');
    ctx.fillText(setsTxt, TX, top + 140);

    // 标签行
    let lx = TX;
    const ly = top + 168;
    const tag = (label, color, bg) => {
      ctx.font = '500 20px ' + CARD.FONT;
      const w = ctx.measureText(label).width + 28;
      ctx.fillStyle = bg;
      rr(ctx, lx, ly, w, 38, 19); ctx.fill();
      if (color) {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(lx + 15, ly + 19, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#5F5C53';
      setFont(ctx, 20, 500);
      ctx.fillText(label, lx + (color ? 26 : 14), ly + 26);
      lx += w + 10;
    };
    if (mg) tag(mg.name, mg.color, '#FFFFFF');
    if (eq) tag(eq, null, '#FFFFFF');
    if (diff) tag(diff, null, '#F1EFEA');

    // 动作要领
    if (withNotes) {
      const gist = shortGist(ex.instructions);
      ctx.fillStyle = '#8A857A';
      setFont(ctx, 22, 400);
      ctx.fillText('动作要领', TX, top + 244);
      ctx.fillStyle = '#5F5C53';
      setFont(ctx, 23, 400);
      drawWrapped(ctx, gist || '按标准姿势完成动作，注意控制节奏与呼吸。',
        TX, top + 282, TW, 34, 2);
    }

    // 块间分隔
    if (i < items.length - 1) {
      ctx.strokeStyle = 'rgba(24,22,18,.07)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(P, top + itemH - 18);
      ctx.lineTo(CARD.W - P, top + itemH - 18);
      ctx.stroke();
    }
  });

  // 页脚
  const fy = CARD.HEADER + items.length * itemH + 46;
  ctx.strokeStyle = 'rgba(24,22,18,.10)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(P, fy); ctx.lineTo(CARD.W - P, fy); ctx.stroke();

  ctx.fillStyle = '#949086';
  setFont(ctx, 22, 400);
  ctx.fillText('FitForge · 本地健身动作库与周计划', P, fy + 46);
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('zh-CN'), CARD.W - P, fy + 46);
  ctx.textAlign = 'left';

  return {
    canvas, dayKey, items, itemH,
    label: DAY_NAMES[dayKey] + ' · ' + (day.name || '训练'),
    count: items.length
  };
}

/* ─── 面板渲染 ─── */
async function renderExport() {
  const box = document.getElementById('exportPreview');
  if (!box) return;
  const token = ++exportState.token;
  // 释放上一次预览的动图 URL，避免反复切换时内存堆积
  exportState.cards.forEach(c => {
    if (c.blobUrl) { try { URL.revokeObjectURL(c.blobUrl); } catch (e) {} }
  });
  const keys = exportDayKeys();
  const cnt = document.getElementById('exportCount');
  if (cnt) cnt.textContent = keys.length ? '· ' + keys.length + ' 张' : '';

  if (!keys.length) {
    const rest = exportState.range === 'today';
    box.innerHTML = rest
      ? '<div class="export-empty">今天 · 休息日<br><span>好好恢复，下次训练更有状态</span><br><button class="btn btn-soft" onclick="setExportRange(\'all\')">查看全部训练日</button></div>'
      : '<div class="export-empty">当前还没有安排训练动作<br><span>先在周计划里选一套模板，再回来导出</span></div>';
    exportState.cards = [];
    updateExportButtons();
    return;
  }

  box.innerHTML = '<div class="export-loading">正在生成预览…</div>';
  const cards = [];
  for (const k of keys) {
    try { cards.push(await buildCard(k)); } catch (e) { console.error('生成训练卡失败', k, e); }
  }
  if (token !== exportState.token) return;
  exportState.cards = cards;
  if (exportState.active >= cards.length) exportState.active = 0;

  box.innerHTML = cards.map((c, i) => {
    const url = c.canvas.toDataURL('image/png');
    return `<div class="export-card ${i === exportState.active ? 'sel' : ''}" data-i="${i}">
      <div class="export-card-img" onclick="openCardLightbox(${i})"><img class="export-img" src="${url}" alt="${c.label}"></div>
      <div class="export-card-bar">
        <div class="export-card-label"><b>${c.label}</b><span class="export-card-status">${exportState.format === 'gif' ? '动图生成中…' : c.count + ' 个动作'}</span></div>
        <button class="btn btn-soft btn-sm" onclick="downloadCard(${i})">${ic('arrow-right')}保存</button>
      </div>
      <div class="export-moves">${c.items.map((x, j) =>
        `<button class="move-chip" onclick="openMoveLightbox('${x.ex.id}', ${j + 1})"><span>${String(j + 1).padStart(2, '0')}</span>${x.ex.name}</button>`
      ).join('')}</div>
    </div>`;
  }).join('');

  updateExportButtons();

  if (exportState.format !== 'gif') return;
  for (let i = 0; i < cards.length; i++) {
    if (token !== exportState.token) return;
    await makeAnimated(i);
    await new Promise(r => setTimeout(r, 12));
  }
}

/* 生成第 i 张动图并替换预览 */
async function makeAnimated(i) {
  const c = exportState.cards[i];
  if (!c || c.blob || c.animBusy) return;
  const token = exportState.token, fmt = exportState.format;
  c.animBusy = true;
  updateExportButtons();
  try {
    const blob = await makeAnimatedCard(c);
    if (blob) {
      c.blob = blob;
      c.blobUrl = URL.createObjectURL(blob);
    }
  } catch (e) { console.error('生成动图失败', i, e); }
  c.animBusy = false;
  // 面板已被重开 / 切了格式：旧任务不再写 DOM
  if (token !== exportState.token || exportState.format !== fmt) return;
  const card = document.querySelector('.export-card[data-i="' + i + '"]');
  if (card && c.blobUrl) {
    const img = card.querySelector('img.export-img');
    if (img) img.src = c.blobUrl;
    const st = card.querySelector('.export-card-status');
    if (st) st.textContent = '会动 · 已就绪';
  } else if (card) {
    const st = card.querySelector('.export-card-status');
    if (st) st.textContent = c.count + ' 个动作';
  }
  updateExportButtons();
}

function updateExportButtons() {
  const cards = exportState.cards;
  const n = cards.length;
  const gif = exportState.format === 'gif';
  const ready = cards.filter(c => c.blob).length;
  const all = document.getElementById('exportAllBtn');
  if (all) {
    all.disabled = !n || exportState.busy;
    let label = n ? '保存全部 ' + n + ' 张' : '暂无训练卡';
    if (gif && n && ready < n) label = '动图生成中 ' + ready + '/' + n;
    all.innerHTML = ic('download') + '<span>' + label + '</span>';
  }
  const tip = document.getElementById('exportTip');
  if (tip) {
    tip.textContent = !n ? '' : gif
      ? '1080px ·  GIF 动图 · 一天一张'
      : '1080px · PNG 图片 · 一天一张';
  }
}

function openExport(range) {
  exportState.range = range || 'all';
  exportState.active = 0;
  document.querySelectorAll('#exportModal .seg-btn[data-range]').forEach(b => {
    b.classList.toggle('on', b.dataset.range === exportState.range);
  });
  document.querySelectorAll('#exportModal .seg-btn[data-fmt]').forEach(b => {
    b.classList.toggle('on', b.dataset.fmt === exportState.format);
  });
  openModal('exportModal');
  renderExport();
}

function setExportRange(r) {
  exportState.range = r;
  exportState.active = 0;
  document.querySelectorAll('#exportModal .seg-btn[data-range]').forEach(b => {
    b.classList.toggle('on', b.dataset.range === r);
  });
  renderExport();
}

function setExportFormat(f) {
  if (exportState.format === f) return;
  exportState.format = f;
  document.querySelectorAll('#exportModal .seg-btn[data-fmt]').forEach(b => {
    b.classList.toggle('on', b.dataset.fmt === f);
  });
  renderExport();
}

function toggleExportNotes() {
  const cb = document.getElementById('exportSteps');
  exportState.withNotes = !!(cb && cb.checked);
  renderExport();
}

function cardFileName(c, ext) {
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return 'FitForge_' + c.label.replace(/[·\s]+/g, '') + '_' + stamp + '.' + (ext || 'gif');
}

function triggerDownloadURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function downloadCard(i) {
  const c = exportState.cards[i];
  if (!c) return;
  if (exportState.format === 'gif') {
    if (!c.blob) await makeAnimated(i);
    if (c.blob) {
      triggerDownloadURL(c.blobUrl, cardFileName(c, 'gif'));
      toast('已保存「' + c.label + '」动态训练卡');
      return;
    }
    toast('动图数据不可用，已保存静态卡');
  }
  triggerDownloadURL(c.canvas.toDataURL('image/png'), cardFileName(c, 'png'));
  toast('已保存「' + c.label + '」训练卡');
}

/* ─── 从周计划日卡直接导出单日训练卡（无需打开导出面板） ─── */
async function downloadDayCard(dayKey, btn) {
  const day = state.weeklyPlan[dayKey] || { name: '', exercises: [] };
  if (!day.exercises.length) {
    toast('这天是休息日，没有可导出的动作', 'err');
    return;
  }
  if (btn && btn.classList.contains('busy')) return;
  if (btn) btn.classList.add('busy');
  try {
    const c = await buildCard(dayKey);
    let url, ext;
    const blob = await makeAnimatedCard(c);
    if (blob) {
      url = URL.createObjectURL(blob);
      ext = 'gif';
    } else {
      url = c.canvas.toDataURL('image/png');
      ext = 'png';
    }
    triggerDownloadURL(url, cardFileName(c, ext));
    if (ext === 'gif') setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('已保存「' + c.label + '」' + (ext === 'gif' ? '动态训练卡' : '训练卡'));
  } catch (e) {
    console.error('导出训练卡失败', dayKey, e);
    toast('导出失败，请重试', 'err');
  }
  if (btn) btn.classList.remove('busy');
}

async function downloadAllCards() {
  const cards = exportState.cards;
  if (!cards.length || exportState.busy) return;
  exportState.busy = true;
  updateExportButtons();
  const gif = exportState.format === 'gif';

  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    if (gif && !c.blob) await makeAnimated(i);
    const url = gif && c.blob ? c.blobUrl : c.canvas.toDataURL('image/png');
    triggerDownloadURL(url, cardFileName(c, gif && c.blob ? 'gif' : 'png'));
    if (i < cards.length - 1) await new Promise(r => setTimeout(r, 420));
  }

  exportState.busy = false;
  updateExportButtons();
  toast('已生成 ' + cards.length + ' 张' + (gif ? '动态' : '') + '训练卡');
  if (cards.length > 1) toast('如浏览器提示，请允许下载多个文件');
}

/* ─── 大图预览 ─── */
function openCardLightbox(i) {
  const c = exportState.cards[i];
  if (!c) return;
  exportState.active = i;
  document.querySelectorAll('.export-card').forEach((el, n) => el.classList.toggle('sel', n === i));
  const lb = document.getElementById('cardLightbox');
  const img = document.getElementById('cardLightboxImg');
  const cap = document.getElementById('cardLightboxCap');
  if (img) { img.hidden = false; img.src = (exportState.format === 'gif' && c.blobUrl) ? c.blobUrl : c.canvas.toDataURL('image/png'); }
  if (cap) cap.textContent = c.label + ' · ' + c.count + ' 个动作'
    + (exportState.format === 'gif' && c.blobUrl ? ' · 动图播放中' : '');
  if (lb) lb.classList.add('on');
}

function closeCardLightbox() {
  const lb = document.getElementById('cardLightbox');
  if (lb) lb.classList.remove('on');
}

/* ─── 单个动作大图（真·原始 GIF，跟练用） ─── */
function openMoveLightbox(id, idx) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return;
  const set = (q, v) => { const el = document.querySelector(q); if (el) el.textContent = v; };
  const img = document.getElementById('moveLightboxImg');
  if (img) { img.hidden = false; img.src = ex.gifUrl; }
  set('#moveLightboxIdx', '动作 ' + String(idx || 1).padStart(2, '0'));
  set('#moveLightboxName', ex.name);
  set('#moveLightboxMeta', [
    MUSCLE_GROUPS[ex.primary[0]]?.name,
    EQUIPMENT[ex.equipment]?.name || ex.equipment,
    DIFFICULTY[ex.difficulty]?.name
  ].filter(Boolean).join(' · '));
  set('#moveLightboxNote', (ex.instructions || '按标准姿势完成动作，注意控制节奏与呼吸。').trim());
  const lb = document.getElementById('moveLightbox');
  if (lb) lb.classList.add('on');
}

function closeMoveLightbox() {
  const lb = document.getElementById('moveLightbox');
  if (lb) lb.classList.remove('on');
}
