/* 打包单文件 FitForge.html
 * 把 index.html + style.css + 各 JS + 动画帧 JSON 全部内联成一个 HTML
 * 双击即用，0 联网依赖（动作 GIF 仍走同目录 gifs/）
 */
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const anim = fs.readFileSync('anim_frames.json', 'utf8');

const parts = [
  ['data.js', '动作与计划数据 / 18 套模板'],
  ['thumbs_data.js', 'GIF 首帧缩略图'],
  ['extra_data.js', '肌肉 / 标签 / 别名增强数据'],
  ['gif_encoder.js', 'GIF 编码器'],
  ['app.js', '应用逻辑'],
  ['export_card.js', '训练卡导出'],
  ['session.js', '引导式跟练'],
  ['power.js', '工具箱 / 统计 / 交互增强']
];

let out = html;

// 内联 CSS
out = out.replace(/<link[^>]*href=["']style\.css["'][^>]*>/i, '<style>\n' + css + '\n</style>');

// 内联所有脚本
for (const [file, label] of parts) {
  const code = fs.readFileSync(file, 'utf8');
  const re = new RegExp('<script[^>]*src=["\']' + file.replace('.', '\\.') + '["\'][^>]*>\\s*</script>', 'i');
  if (!re.test(out)) {
    console.error('X 找不到脚本占位:', file);
    process.exit(1);
  }
  out = out.replace(re, () => '<script>\n' + code + '\n</script>');
  console.log('  + ' + file + ' (' + label + '):', (code.length / 1024).toFixed(0) + ' KB');
}

// 内联动画帧（type=application/json，浏览器不执行，导出时才解析）
const placeholder = '<script type="application/json" id="animFrames">{}</script>';
if (!out.includes(placeholder)) {
  console.error('X 找不到动画帧数据占位节点');
  process.exit(1);
}
out = out.replace(placeholder, () =>
  '<script type="application/json" id="animFrames">' + anim + '</script>');
console.log('  + anim_frames.json (1324 动作 × 8 帧):', (anim.length / 1048576).toFixed(2) + ' MB');

// 去掉残留的外部引用
const leftover = [];
out.replace(/<script[^>]*src=["']([^"']+)["'][^>]*>/gi, (m, p) => { leftover.push(p); return m; });
out.replace(/<link[^>]*href=["']([^"']+)["'][^>]*>/gi, (m, p) => { leftover.push(p); return m; });

if (leftover.length) {
  console.error('X 仍有外部引用:', leftover.join(', '));
  process.exit(1);
}

fs.writeFileSync('fitforge.html', out, 'utf8');
console.log('fitforge.html 已生成:', (fs.statSync('fitforge.html').size / 1048576).toFixed(2), 'MB');
console.log('GIF 引用数:', (out.match(/gifs\//g) || []).length);
