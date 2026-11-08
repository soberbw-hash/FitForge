/* 打包 FitForge
 * 1) fitforge.html  —— 桌面离线单文件：全部内嵌，双击即用，无需联网
 * 2) web/index.html —— 线上版：33MB 动画帧拆成 anim/cNN.json，只在导出动图时按需加载；
 *                       首屏 HTML 约 6MB，动作卡直接播放 web/gifs/ 里的 1324 个原始 GIF
 * 两份产物共用同一套源码，全部素材本地生成，无任何第三方请求。
 */
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const animText = fs.readFileSync('anim_frames.json', 'utf8');
const anim = JSON.parse(animText);

const parts = [
  ['data.js', '动作与计划数据 / 18 套模板'],
  ['thumbs_data.js', 'GIF 首帧缩略图'],
  ['extra_data.js', '肌肉 / 标签 / 别名增强数据'],
  ['popularity.js', '公开榜单调研后的静态热门度'],
  ['rating.js', '难度星级 / 热门度'],
  ['gif_encoder.js', 'GIF 编码器'],
  ['body_svg.js', '解剖人体肌群图'],
  ['app.js', '应用逻辑'],
  ['export_card.js', '训练卡导出'],
  ['session.js', '跟练演示（不记录）'],
  ['power.js', '工具箱 / 周计划存取 / 交互增强'],
  ['anim_loader.js', '线上动画分块加载']
];

/* 内联 CSS 与所有 JS，动画帧占位保持为空 */
let base = html;
base = base.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, '<style>\n' + css + '\n</style>');
for (const [file, label] of parts) {
  const code = fs.readFileSync(file, 'utf8');
  const re = new RegExp('<script[^>]*src=["\']' + file.replace('.', '\\.') + '["\'][^>]*>\\s*</script>', 'i');
  if (!re.test(base)) {
    console.error('X 找不到脚本占位:', file);
    process.exit(1);
  }
  base = base.replace(re, () => '<script>\n' + code + '\n</script>');
  console.log('  + ' + file + ' (' + label + '):', (code.length / 1024).toFixed(0) + ' KB');
}

const placeholder = '<script type="application/json" id="animFrames">{}</script>';
if (!base.includes(placeholder)) {
  console.error('X 找不到动画帧数据占位节点');
  process.exit(1);
}

/* 残留外部引用检查 */
const leftover = [];
base.replace(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi, (m, p) => { leftover.push(p); return m; });
base.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (m, p) => {
  if (!/^data:/i.test(p)) leftover.push(p);
  return m;
});
if (leftover.length) {
  console.error('X 仍有外部引用:', leftover.join(', '));
  process.exit(1);
}

/* ── 1. 桌面离线单文件 ── */
const offline = base.replace(placeholder, () =>
  '<script type="application/json" id="animFrames">' + animText + '</script>');
fs.writeFileSync('fitforge.html', offline, 'utf8');
console.log('\n[桌面版] fitforge.html:', (fs.statSync('fitforge.html').size / 1048576).toFixed(2), 'MB');
console.log('  内嵌 anim_frames.json:', (animText.length / 1048576).toFixed(2), 'MB / GIF 引用数:',
  (offline.match(/gifs\//g) || []).length);

/* ── 2. 线上版：动画帧分块 ── */
const WEB_DIR = 'web';
const ANIM_DIR = path.join(WEB_DIR, 'anim');
fs.mkdirSync(ANIM_DIR, { recursive: true });
const keys = Object.keys(anim).sort();
const CHUNK = 100;
const index = {};
let chunks = 0;
for (let i = 0; i < keys.length; i += CHUNK) {
  const name = 'c' + String(Math.floor(i / CHUNK)).padStart(2, '0');
  const chunk = {};
  keys.slice(i, i + CHUNK).forEach(k => { chunk[k] = anim[k]; index[k] = name; });
  fs.writeFileSync(path.join(ANIM_DIR, name + '.json'), JSON.stringify(chunk), 'utf8');
  chunks++;
}
const boot = '<script>window.FF_WEB=true;window.ANIM_INDEX=' + JSON.stringify(index) + ';</script>';
const web = base.replace('</head>', boot + '\n</head>');
fs.writeFileSync(path.join(WEB_DIR, 'index.html'), web, 'utf8');
const webSize = fs.statSync(path.join(WEB_DIR, 'index.html')).size;
console.log('\n[线上版] web/index.html:', (webSize / 1048576).toFixed(2), 'MB');
console.log('  anim/ 分块:', chunks, '个 /', keys.length, '个动作 / 共',
  (animText.length / 1048576).toFixed(2), 'MB（按需加载，首屏 0 下载）');
console.log('  首屏瘦身:', (100 - webSize / fs.statSync('fitforge.html').size * 100).toFixed(1), '%');
