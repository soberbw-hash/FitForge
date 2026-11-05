/* ═══════════════════════════════════════════════════════════
 * GIF89a 极简编码器（无依赖，可在 file:// 下直接使用）
 * - 固定 256 色全局调色板 + 5bit RGB 查表量化
 * - LZW 压缩；支持「局部帧」（第一帧画全卡，后续帧只更新动作列）
 * - 输出 Uint8Array，浏览器侧包成 Blob 即可下载/预览
 * ═══════════════════════════════════════════════════════════ */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.GIFKit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ── 调色板：6×6×6 色立方 + 主题色 + 灰阶 ── */
  function buildPalette() {
    const c = [];
    for (let r = 0; r < 6; r++)
      for (let g = 0; g < 6; g++)
        for (let b = 0; b < 6; b++) c.push([r * 51, g * 51, b * 51]);
    const theme = [
      [232, 80, 46], [255, 106, 68], [247, 246, 243], [23, 22, 15],
      [95, 92, 83], [148, 144, 134], [169, 163, 153], [241, 239, 234],
      [237, 234, 227], [138, 133, 122], [255, 255, 255], [17, 17, 17],
      [200, 62, 34], [255, 178, 150], [230, 228, 220], [64, 62, 56]
    ];
    theme.forEach(x => c.push(x));
    while (c.length < 256) {
      const v = Math.round((c.length - 232) * 255 / 23);
      c.push([v, v, v]);
    }
    const pal = new Uint8Array(768);
    for (let i = 0; i < 256; i++) {
      pal[i * 3] = c[i][0]; pal[i * 3 + 1] = c[i][1]; pal[i * 3 + 2] = c[i][2];
    }
    return pal;
  }

  const PALETTE = buildPalette();
  let LUT = null;

  function buildLUT() {
    const lut = new Uint8Array(32768);
    for (let r = 0; r < 32; r++) {
      for (let g = 0; g < 32; g++) {
        for (let b = 0; b < 32; b++) {
          const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
          let best = 0, bd = 1e10;
          for (let i = 0; i < 256; i++) {
            const dr = R - PALETTE[i * 3];
            const dg = G - PALETTE[i * 3 + 1];
            const db = B - PALETTE[i * 3 + 2];
            const d = dr * dr * 3 + dg * dg * 4 + db * db * 2;
            if (d < bd) { bd = d; best = i; }
          }
          lut[(r << 10) | (g << 5) | b] = best;
        }
      }
    }
    return lut;
  }

  /* RGBA(Uint8ClampedArray) → 调色板索引(Uint8Array) */
  function quantize(rgba) {
    if (!LUT) LUT = buildLUT();
    const n = rgba.length >> 2;
    const out = new Uint8Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) {
      out[i] = LUT[((rgba[j] >> 3) << 10) | ((rgba[j + 1] >> 3) << 5) | (rgba[j + 2] >> 3)];
    }
    return out;
  }

  /* ── LZW ── */
  function lzw(indices, minCodeSize) {
    const clear = 1 << minCodeSize;      // 256
    const eoi = clear + 1;               // 257
    const bytes = [];
    let cur = 0, bits = 0;

    function emit(code, size) {
      cur |= code << bits;
      bits += size;
      while (bits >= 8) {
        bytes.push(cur & 255);
        cur >>>= 8;
        bits -= 8;
      }
    }

    let codeSize = minCodeSize + 1;      // 9
    let next = eoi + 1;                  // 258
    let dict = new Map();

    emit(clear, codeSize);
    if (!indices.length) {
      emit(eoi, codeSize);
      if (bits > 0) bytes.push(cur & 255);
      return bytes;
    }

    let prefix = indices[0];
    for (let i = 1; i < indices.length; i++) {
      const k = indices[i];
      const key = (prefix << 8) | k;
      const found = dict.get(key);
      if (found !== undefined) { prefix = found; continue; }

      emit(prefix, codeSize);
      if (next < 4096) {
        dict.set(key, next++);
        // GIF 解码器采用 early-change：码长阈值比字典容量多 1
        if (next >= (1 << codeSize) + 1 && codeSize < 12) codeSize++;
      } else {
        emit(clear, codeSize);
        dict = new Map();
        codeSize = minCodeSize + 1;
        next = eoi + 1;
      }
      prefix = k;
    }
    emit(prefix, codeSize);
    emit(eoi, codeSize);
    if (bits > 0) bytes.push(cur & 255);
    return bytes;
  }

  /* ── GIF 组装 ──
   * frames: [{ x, y, w, h, pixels(Uint8Array 索引), delay(ms), disposal }]
   * 第一帧应为整幅画面；后续帧可只给局部矩形（disposal=1 保留画布）
   */
  function encode(width, height, frames, loop) {
    const buf = [];
    const push = (...v) => { for (let i = 0; i < v.length; i++) buf.push(v[i]); };
    const u16 = v => push(v & 255, (v >> 8) & 255);
    const ascii = s => { for (let i = 0; i < s.length; i++) push(s.charCodeAt(i)); };

    ascii('GIF89a');
    u16(width); u16(height);
    push(0xF7, 0, 0);                       // 全局色表 256 色，背景 0
    for (let i = 0; i < 768; i++) push(PALETTE[i]);

    // 无限循环
    push(0x21, 0xFF, 0x0B);
    ascii('NETSCAPE2.0');
    push(0x03, 0x01);
    u16(loop === 0 ? 0 : (loop || 0));
    push(0x00);

    frames.forEach(f => {
      const delay = Math.max(2, Math.round((f.delay || 120) / 10)); // 1/100 秒
      push(0x21, 0xF9, 0x04, ((f.disposal == null ? 1 : f.disposal) & 7) << 2,
        delay & 255, (delay >> 8) & 255, 0x00, 0x00);
      push(0x2C);
      u16(f.x || 0); u16(f.y || 0); u16(f.w); u16(f.h);
      push(0x00);
      push(0x08);                            // LZW min code size = 8
      const data = lzw(f.pixels, 8);
      for (let i = 0; i < data.length; i += 255) {
        const n = Math.min(255, data.length - i);
        buf.push(n);
        for (let j = 0; j < n; j++) buf.push(data[i + j]);
      }
      push(0x00);
    });

    push(0x3B);
    return new Uint8Array(buf);
  }

  return { PALETTE, quantize, lzw, encode };
});
