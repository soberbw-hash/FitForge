/* 线上版专用：33MB 动画帧拆成小分块按需加载，并让所有动作图播放 8 帧循环动画。
 * 桌面离线版不设置 FF_WEB，本文件直接退出，行为与原来完全一致。
 * 数据来源全部是本站点自带的 anim/ 目录（由本地 GIF 抽帧生成），无任何第三方请求。
 */
(function () {
  if (!window.FF_WEB) return;

  var INDEX = window.ANIM_INDEX || {};
  var chunks = Object.create(null);

  /* 与 export_card.js 的 animFrames() 共用同一份缓存，避免重复 JSON.parse */
  function frames() {
    if (window._ANIM_FRAMES) return window._ANIM_FRAMES;
    var d = {};
    try {
      var el = document.getElementById('animFrames');
      if (el) d = JSON.parse(el.textContent || '{}');
    } catch (e) { /* 空节点是正常情况 */ }
    window._ANIM_FRAMES = d;
    return d;
  }

  function loadChunk(name) {
    if (!chunks[name]) {
      chunks[name] = fetch('anim/' + name + '.json')
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function (d) { Object.assign(frames(), d); return d; })
        .catch(function (e) { console.warn('动画分块加载失败', name, e); return null; });
    }
    return chunks[name];
  }

  /* 导出训练卡用：拿到某个动作的 8 帧 sprite dataURL */
  window.ensureAnimSheet = function (id) {
    id = String(id).padStart(4, '0');
    var name = INDEX[id];
    if (!name) return Promise.resolve(null);
    if (frames()[id]) return Promise.resolve(frames()[id]);
    return loadChunk(name).then(function () { return frames()[id] || null; });
  };

  /* 把 img[src="gifs/xxxx-..."] 换成自带 CSS 帧动画的容器，先显示内嵌首帧 */
  var io = ('IntersectionObserver' in window)
    ? new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          activate(en.target);
        });
      }, { rootMargin: '240px 0px' })
    : null;

  function activate(el) {
    var id = el.getAttribute('data-anim-id');
    if (!id || el.classList.contains('playing') || el.dataset.ffLoading) return;
    el.dataset.ffLoading = '1';
    window.ensureAnimSheet(id).then(function (src) {
      if (!src || !el.isConnected) return;
      var img = document.createElement('img');
      img.className = 'anim-sheet';
      img.alt = '';
      img.decoding = 'async';
      img.onload = function () {
        el.classList.add('playing');
        el.style.backgroundImage = 'none';
      };
      img.src = src;
      el.appendChild(img);
    });
  }

  function convert(img) {
    if (img.dataset.ffConverted) return;
    var m = (img.getAttribute('src') || '').match(/gifs\/(\d{4})-/);
    if (!m) return;
    img.dataset.ffConverted = '1';
    var id = m[1];
    var div = document.createElement('div');
    div.className = 'anim-thumb';
    div.setAttribute('data-anim-id', id);
    var t = (window.EXERCISE_THUMBS || {})[id];
    if (t) div.style.backgroundImage = 'url("' + t + '")';
    img.replaceWith(div);
    if (io) io.observe(div); else activate(div);
  }

  function scan(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches && root.matches('img[src*="gifs/"]')) convert(root);
    if (root.querySelectorAll) root.querySelectorAll('img[src*="gifs/"]').forEach(convert);
  }

  new MutationObserver(function (muts) {
    muts.forEach(function (m) { (m.addedNodes || []).forEach(scan); });
  }).observe(document.documentElement, { childList: true, subtree: true });

  function boot() { scan(document.body); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
