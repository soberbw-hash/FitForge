/* 线上版动画帧分块加载（只服务「导出动态训练卡」）。
 *
 * 网页动作卡一律直接使用站点自带的 gifs/*.gif 原生播放：
 *   - 原始 GIF 帧数完整、比 8 帧 sprite 顺滑，且浏览器自己也懒加载；
 *   - 不再用 JS 把 <img> 换成 sprite，首屏不依赖任何 JSON 分块，
 *     即使分块或 GIF 暂时加载不到，power.js 的全局兜底也会显示内嵌首帧，
 *     动作区不会出现整片空白。
 * 桌面离线版不设置 FF_WEB，动画帧全部内嵌，本文件只保留分块函数不生效。
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

  /* 导出训练卡用：拿到某个动作的 8 帧 sprite dataURL，点导出时才下载分块 */
  window.ensureAnimSheet = function (id) {
    id = String(id).padStart(4, '0');
    var name = INDEX[id];
    if (!name) return Promise.resolve(null);
    if (frames()[id]) return Promise.resolve(frames()[id]);
    return loadChunk(name).then(function () { return frames()[id] || null; });
  };
})();
