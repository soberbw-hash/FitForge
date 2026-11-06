/* ─── Gym Visual 风格解剖人体肌群图 ───
 * 与动作库 GIF 同一套视觉语言：灰白写实线描 + 肌肉纹理 + 橙红高亮
 * 正/背两面，15 个肌群分区可点击；左右对称部位用镜像复用
 * viewBox 360 × 640
 */

const BODY_SVG = (() => {
  const W = 360;
  const mirror = s => `<g transform="translate(${W},0) scale(-1,1)">${s}</g>`;

  /* 每张图各自的渐变定义（一次只渲染一张，id 不冲突） */
  const defs = `<defs>
    <linearGradient id="ffSkin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" style="stop-color:var(--bs1)"/>
      <stop offset=".22" style="stop-color:var(--bs2)"/>
      <stop offset=".5" style="stop-color:var(--bs3)"/>
      <stop offset=".78" style="stop-color:var(--bs2)"/>
      <stop offset="1" style="stop-color:var(--bs1)"/>
    </linearGradient>
    <linearGradient id="ffMus" x1="0" y1="0" x2=".35" y2="1">
      <stop offset="0" style="stop-color:var(--bm1)"/>
      <stop offset="1" style="stop-color:var(--bm2)"/>
    </linearGradient>
    <linearGradient id="ffOn" x1="0" y1="0" x2=".3" y2="1">
      <stop offset="0" stop-color="#F7885F"/>
      <stop offset=".55" stop-color="#E8502E"/>
      <stop offset="1" stop-color="#CF3D1C"/>
    </linearGradient>
    <radialGradient id="ffHead" cx=".38" cy=".32" r=".75">
      <stop offset="0" style="stop-color:var(--bs3)"/>
      <stop offset="1" style="stop-color:var(--bs1)"/>
    </radialGradient>
  </defs>`;

  /* 绘制样式内嵌：外部 CSS 里的 url(#渐变) 在部分场景会解析失效 */
  const style = `<style>
    .body-silhouette { fill: url(#ffSkin); stroke: var(--bl); stroke-width: 1.1; stroke-linejoin: round; }
    .body-line { fill: none; stroke: var(--bl); stroke-width: .9; opacity: .75; stroke-linecap: round; }
    .body-fiber { fill: none; stroke: var(--bf); stroke-width: .8; opacity: .8; stroke-linecap: round; }
    .muscle { cursor: pointer; fill: url(#ffMus); stroke: var(--bml); stroke-width: 1; stroke-linejoin: round; }
    .muscle:hover { fill: #F4B79E; stroke: #DE8768; }
    .muscle.on { fill: url(#ffOn); stroke: #B83417; stroke-width: 1.3; }
  </style>`;

  /* ── 人体轮廓：分部件绘制，重叠处形成解剖分节线 ── */
  const earL = `<path d="M154,47 C149,46 147,52 149,60 C150,65 154,66 155,62 Z"/>`;
  const head = `
    <path d="M180,18 C195,18 206,30 206,46 C206,57 203,65 199,72
             C197,78 197,83 198,88 L188,94 C184,97 176,97 172,94 L162,88
             C163,83 163,78 161,72 C157,65 154,57 154,46 C154,30 165,18 180,18 Z"
          fill="url(#ffHead)"/>
    ${earL}${mirror(earL)}
    <path style="fill:var(--bs1);opacity:.42" d="M156,45 C157,28 167,19 180,19
      C194,19 204,29 204,45 C199,38 191,34 180,34 C169,34 161,38 156,45 Z"/>
    <path d="M163,102 C168,108 192,108 197,102 L196,110 C190,116 170,116 164,110 Z" opacity=".55"/>`;

  const neck = `<path d="M166,86 L194,86 L197,105 C190,111 170,111 163,105 Z"/>`;

  const torso = `<path d="M163,104
    C149,108 131,113 119,124 C109,133 106,147 108,163
    C110,183 116,202 122,220 C127,237 132,253 135,269
    C137,285 138,299 139,313 C147,321 213,321 221,313
    C222,299 223,285 225,269 C228,253 233,237 238,220
    C244,202 250,183 252,163 C254,147 251,133 241,124
    C229,113 211,108 197,104 C190,110 170,110 163,104 Z"/>`;

  const armL = `
    <path d="M119,124 C107,128 100,140 98,156 C95,176 96,200 100,222
             C102,232 109,236 116,232 C123,228 126,218 127,206
             L129,164 C130,146 127,130 119,124 Z"/>
    <path d="M100,222 C94,226 90,236 88,250 C85,272 83,298 84,320
             C85,330 91,334 98,331 C105,328 108,318 109,306
             L113,260 C115,242 108,224 100,222 Z"/>
    <path d="M84,320 C79,324 77,336 76,350 C75,364 77,378 81,386
             C85,391 91,388 94,381 L101,350 C103,336 93,316 84,320 Z"/>`;

  const legL = `
    <path d="M139,313 C132,323 128,341 127,363 C125,389 128,415 132,439
             C135,451 145,455 154,450 C163,445 167,431 169,415
             L175,353 C177,333 159,311 147,311 Z"/>
    <path d="M132,439 C126,447 124,463 126,483 C128,507 132,533 136,555
             C138,565 147,567 154,561 C161,555 163,541 163,525
             L167,479 C169,459 149,435 132,439 Z"/>
    <path d="M136,555 C131,563 127,575 125,587 C123,595 129,599 139,599
             L163,599 C169,599 169,591 165,583 C161,573 155,561 151,555 Z"/>`;

  const silhouette = `<g class="body-silhouette">
    ${head}${neck}${torso}${armL}${legL}${mirror(armL + legL)}
  </g>`;

  /* ── 解剖细节线：锁骨、胸骨、腹白线、髂嵴、关节、五官、手指脚趾 ── */
  const detailL = `
    <path d="M150,119 Q180,112 210,119"/>
    <path d="M180,140 L180,192" stroke-dasharray="3 3"/>
    <path d="M139,292 Q180,306 221,292"/>
    <path d="M132,440 Q146,447 162,440"/>
    <path d="M98,232 Q108,236 118,232"/>
    <path d="M86,328 Q94,332 102,328"/>
    <path d="M78,356 L80,378 M84,358 L86,380 M90,356 L92,376"/>
    <path d="M132,584 Q145,588 160,584"/>`;

  /* 五官只是极淡的示意，避免简笔笑脸的廉价感 */
  const faceL = `
    <path d="M164,47 Q171,44 177,47"/>
    <path d="M164,54 Q170,57 176,54"/>
    <path d="M180,52 L179,64"/>
    <path d="M173,76 Q180,78 187,76"/>
    <path d="M160,28 Q180,20 200,28"/>`;

  const anatomy = `<g class="body-line" pointer-events="none">
    ${detailL}${mirror(detailL)}
    <path d="M180,196 L180,280" stroke-dasharray="2 4" opacity=".7"/>
  </g>
  <g class="body-line" opacity=".34" pointer-events="none">${faceL}${mirror(faceL)}</g>`;

  /* ── 正面肌肉分区 ── */
  const mFrontL = `
    <path class="muscle" data-muscle="shoulders" d="M119,124 C107,128 100,140 98,156
      C97,168 99,180 103,188 C111,184 119,176 123,164 C127,150 127,134 119,124 Z"/>
    <path class="muscle" data-muscle="chest" d="M153,127 C164,123 176,126 180,137
      L180,184 C169,191 155,188 149,175 C144,163 145,137 153,127 Z"/>
    <path class="muscle" data-muscle="biceps" d="M103,158 C112,156 120,162 122,174
      L120,210 C118,222 108,224 104,214 L99,178 C98,168 99,160 103,158 Z"/>
    <path class="muscle" data-muscle="forearms" d="M91,238 C100,234 108,240 110,252
      L106,308 C104,320 94,322 90,312 L86,260 C85,248 87,240 91,238 Z"/>
    <path class="muscle" data-muscle="obliques" d="M138,192 C148,190 155,194 158,202
      L156,266 C146,262 138,250 135,232 C132,216 133,200 138,192 Z"/>
    <g class="muscle" data-muscle="quadriceps">
      <path d="M143,320 C150,316 157,319 160,332 L159,406
               C158,424 150,430 145,422 C138,408 136,340 143,320 Z"/>
      <path d="M162,323 C166,327 168,333 168,340 L166,404
               C165,420 158,427 153,422 C150,402 157,336 162,323 Z"/>
    </g>
    <g class="muscle" data-muscle="calves">
      <path d="M137,458 C144,454 150,459 151,474 L150,528
               C149,544 141,548 137,536 C132,520 132,472 137,458 Z"/>
      <path d="M153,460 C158,458 161,466 161,478 L159,528
               C158,542 152,546 149,536 C146,520 150,472 153,460 Z"/>
    </g>`;

  const absSix = `<g class="muscle" data-muscle="abs">
    <path d="M158,196 L179,196 L179,217 L159,217 Z"/>
    <path d="M181,196 L202,196 L201,217 L181,217 Z"/>
    <path d="M159,220 L179,220 L179,241 L160,241 Z"/>
    <path d="M181,220 L201,220 L200,241 L181,241 Z"/>
    <path d="M160,244 L179,244 L179,272 L162,272 Z"/>
    <path d="M181,244 L200,244 L198,272 L181,272 Z"/>
  </g>`;

  const trapsFront = `<path class="muscle" data-muscle="traps"
    d="M163,103 C171,109 189,109 197,103 L207,121 C193,115 167,115 153,121 Z"/>`;

  const frontMuscles = `<g class="muscles">
    ${trapsFront}${mFrontL}${mirror(mFrontL)}${absSix}
  </g>`;

  /* ── 背面肌肉分区 ── */
  const mBackL = `
    <path class="muscle" data-muscle="shoulders" d="M119,124 C107,128 100,140 98,156
      C97,168 99,180 103,188 C111,184 119,176 123,164 C127,150 127,134 119,124 Z"/>
    <path class="muscle" data-muscle="back" d="M150,148 C162,144 174,150 178,161
      L176,196 C162,192 150,182 146,167 C144,158 146,151 150,148 Z"/>
    <path class="muscle" data-muscle="lats" d="M128,158 C140,152 152,162 156,180
      L158,246 C148,252 138,240 132,220 C126,200 124,170 128,158 Z"/>
    <path class="muscle" data-muscle="triceps" d="M103,156 C112,154 120,160 122,172
      L120,214 C118,226 108,228 104,218 L99,178 C98,166 99,158 103,156 Z"/>
    <path class="muscle" data-muscle="forearms" d="M91,238 C100,234 108,240 110,252
      L106,308 C104,320 94,322 90,312 L86,260 C85,248 87,240 91,238 Z"/>
    <path class="muscle" data-muscle="glutes" d="M142,290 C154,284 170,290 176,304
      C180,316 176,332 164,338 C150,342 140,332 138,316 C136,304 138,294 142,290 Z"/>
    <g class="muscle" data-muscle="hamstrings">
      <path d="M143,340 C150,336 157,340 160,352 L159,412
               C158,428 150,434 145,425 C138,411 136,354 143,340 Z"/>
      <path d="M162,343 C166,347 168,353 168,360 L166,412
               C165,428 158,434 153,428 C150,408 157,354 162,343 Z"/>
    </g>
    <g class="muscle" data-muscle="calves">
      <path d="M137,458 C144,454 150,459 151,474 L150,528
               C149,544 141,548 137,536 C132,520 132,472 137,458 Z"/>
      <path d="M153,460 C158,458 161,466 161,478 L159,528
               C158,542 152,546 149,536 C146,520 150,472 153,460 Z"/>
    </g>`;

  const trapsBack = `<path class="muscle" data-muscle="traps"
    d="M180,105 L213,118 L197,170 L180,190 L163,170 L147,118 Z"/>`;
  const lowerBack = `<g class="muscle" data-muscle="lower_back">
    <path d="M169,196 L178,196 L178,280 L171,280 Z"/>
    <path d="M182,196 L191,196 L189,280 L182,280 Z"/>
  </g>`;

  const backMuscles = `<g class="muscles">
    ${trapsBack}${mBackL}${mirror(mBackL)}${lowerBack}
  </g>`;

  /* ── 肌纤维纹理：顺肌束走向的细线，模拟解剖图质感 ── */
  const fiberL = `
    <path d="M150,134 Q160,142 170,138 M148,148 Q158,157 169,152 M147,162 Q157,171 168,166"/>
    <path d="M103,132 Q109,144 112,156 M100,144 Q106,157 109,169"/>
    <path d="M106,172 Q111,190 109,206"/>
    <path d="M92,254 Q95,280 94,304 M100,252 Q103,278 102,300"/>
    <path d="M141,210 Q140,234 143,254 M148,206 Q146,232 149,256"/>
    <path d="M148,338 Q146,378 149,412 M156,334 Q155,376 157,410"/>
    <path d="M141,474 Q140,504 143,530 M150,470 Q150,502 152,528"/>
    <path d="M146,300 Q158,306 170,300"/>
    <path d="M152,166 Q148,186 152,206 M144,168 Q140,188 143,208"/>`;

  const fibers = `<g class="body-fiber" pointer-events="none">${fiberL}${mirror(fiberL)}</g>`;

  const svg = (muscles, extraLines) => `<svg viewBox="0 0 ${W} 640" class="body-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="人体肌群分区图">
    ${defs}${style}
    ${silhouette}
    ${anatomy}
    ${muscles}
    ${fibers}
    ${extraLines || ''}
  </svg>`;

  return {
    front: svg(frontMuscles),
    back: svg(backMuscles, `<g class="body-line" pointer-events="none"><path d="M180,118 L180,190" stroke-dasharray="3 4" opacity=".6"/></g>`)
  };
})();
