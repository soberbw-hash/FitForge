/* 批量把本地 GIF 的首帧压成 140×140 JPEG dataURL
 * 生成 thumbs_data.js，供「导出训练卡」在 file:// 下安全绘制到 Canvas
 * （file:// 直接 drawImage 本地图片会污染 canvas，data: URL 不会）
 *
 * 用法: node build_thumbs.js
 * 依赖: 本机 Chrome，以及 D:/Desktop/FitForge/gifs/ 下已下载的 GIF
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const GIF_DIR = 'D:/Desktop/FitForge/gifs';
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TMP = path.join(GIF_DIR, '..', '_thumb_batch.html');
const BATCH = 120;
const SIZE = 140;
const QUALITY = 0.62;

if (!fs.existsSync(CHROME)) {
  console.error('X 找不到 Chrome:', CHROME);
  process.exit(1);
}
if (!fs.existsSync(GIF_DIR)) {
  console.error('X 找不到 GIF 目录:', GIF_DIR);
  process.exit(1);
}

const files = fs.readdirSync(GIF_DIR).filter(f => /^\d{4}-.*\.gif$/i.test(f)).sort();
console.log('共', files.length, '个 GIF，分', Math.ceil(files.length / BATCH), '批处理');

const all = {};

for (let i = 0; i < files.length; i += BATCH) {
  const batch = files.slice(i, i + BATCH);
  const page = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><pre id="o">PENDING</pre>
<script>
var files = ${JSON.stringify(batch)};
var out = {}, done = 0;
function finish(){
  if (done < files.length) return;
  document.getElementById('o').textContent = 'RESULT' + JSON.stringify(out);
}
files.forEach(function(f){
  var img = new Image();
  img.onload = function(){
    try {
      var c = document.createElement('canvas');
      c.width = ${SIZE}; c.height = ${SIZE};
      var x = c.getContext('2d');
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, ${SIZE}, ${SIZE});
      x.drawImage(img, 0, 0, ${SIZE}, ${SIZE});
      out[f.slice(0,4)] = c.toDataURL('image/jpeg', ${QUALITY});
    } catch(e) { out[f.slice(0,4)] = ''; }
    done++; finish();
  };
  img.onerror = function(){ out[f.slice(0,4)] = ''; done++; finish(); };
  img.src = 'gifs/' + f;
});
</script></body></html>`;
  fs.writeFileSync(TMP, page, 'utf8');

  let dom = '';
  try {
    dom = execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--allow-file-access-from-files',
      '--dump-dom', '--virtual-time-budget=45000',
      'file:///' + TMP.replace(/\\/g, '/')
    ], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    console.error('X 第', (i / BATCH + 1), '批 Chrome 执行失败:', e.message);
    process.exit(1);
  }

  const m = dom.match(/<pre id="o">RESULT([\s\S]*?)<\/pre>/);
  if (!m) {
    console.error('X 第', (i / BATCH + 1), '批未产出结果');
    process.exit(1);
  }
  let obj;
  try {
    obj = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'));
  } catch (e) {
    console.error('X 第', (i / BATCH + 1), '批 JSON 解析失败:', e.message);
    process.exit(1);
  }
  Object.assign(all, obj);
  const ok = Object.values(obj).filter(v => v && v.startsWith('data:')).length;
  console.log('  批', (i / BATCH + 1), '成功', ok + '/' + batch.length);
}

try { fs.unlinkSync(TMP); } catch (e) {}

const keys = Object.keys(all).filter(k => all[k] && all[k].startsWith('data:'));
const body = '/* 动作 GIF 首帧缩略图（140×140 JPEG dataURL），供导出训练卡使用 */\n'
  + 'const EXERCISE_THUMBS = ' + JSON.stringify(all) + ';\n';
fs.writeFileSync('thumbs_data.js', body, 'utf8');
console.log('thumbs_data.js 已生成:', (fs.statSync('thumbs_data.js').size / 1024 / 1024).toFixed(2), 'MB');
console.log('有效缩略图:', keys.length, '/', files.length);
