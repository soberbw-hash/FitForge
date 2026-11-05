# -*- coding: utf-8 -*-
"""
把每个动作的 GIF 均匀抽 8 帧，横向拼成一张 sprite sheet（112*8 x 112），
压成 JPEG dataURL，输出 anim_frames.json。

导出训练卡时，浏览器在 file:// 下无法读取本地 GIF 的像素（canvas 会被污染），
因此把动画帧预先内嵌进 HTML；运行时按帧号裁切 sprite 绘制，再编码成 GIF。
"""
import os
import io
import json
import glob
import base64
from concurrent.futures import ProcessPoolExecutor, as_completed

from PIL import Image, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True

GIF_DIR = r'D:\Desktop\FitForge\gifs'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anim_frames.json')
FRAMES = 8
SIZE = 112
QUALITY = 50


def build_one(path):
    key = os.path.basename(path)[:4]
    try:
        im = Image.open(path)
        total = getattr(im, 'n_frames', 1)
        # GIF 的局部帧需要顺序解码才能正确合成
        picked = set(min(total - 1, (i * total) // FRAMES) for i in range(FRAMES))
        frames = {}
        for i in range(total):
            im.seek(i)
            if i in picked:
                frames[i] = im.convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
        sheet = Image.new('RGB', (SIZE * FRAMES, SIZE), (255, 255, 255))
        for j in range(FRAMES):
            idx = min(total - 1, (j * total) // FRAMES)
            fr = frames.get(idx)
            if fr is None:
                im.seek(0)
                fr = im.convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
            sheet.paste(fr, (j * SIZE, 0))
        buf = io.BytesIO()
        sheet.save(buf, 'JPEG', quality=QUALITY, optimize=True)
        data = 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode('ascii')
        return key, data
    except Exception as e:
        return key, ''


def main():
    files = sorted(glob.glob(os.path.join(GIF_DIR, '[0-9][0-9][0-9][0-9]-*.gif')))
    print('GIF 总数:', len(files), flush=True)
    out = {}
    with ProcessPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(build_one, f): f for f in files}
        for n, fut in enumerate(as_completed(futs), 1):
            k, v = fut.result()
            if v:
                out[k] = v
            if n % 150 == 0:
                print('  已处理', n, '/', len(files), flush=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('anim_frames.json:', round(os.path.getsize(OUT) / 1048576, 2), 'MB', flush=True)
    print('有效动作:', len(out), '/', len(files), flush=True)


if __name__ == '__main__':
    main()
