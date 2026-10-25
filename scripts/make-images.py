"""Turn raw PNGs from tests/shots.mjs into portfolio JPGs, an animated WebP, and public/og.jpg.
Run with the Pillow venv: /home/box/.venv-img/bin/python scripts/make-images.py"""
import json, os
from PIL import Image, ImageDraw

RAW = '/tmp/qd-shots'
OUT = '/workspace/quote-demo-shots'
os.makedirs(OUT, exist_ok=True)

def jpg(src, name, size):
    im = Image.open(f'{RAW}/{src}').convert('RGB').resize(size, Image.LANCZOS)
    im.save(f'{OUT}/{name}', 'JPEG', quality=90, optimize=True, progressive=True)

for w, h in [(1280, 769), (1024, 768)]:
    jpg(f'midflow-{w}x{h}.png', f'01-calculator-midflow-{w}x{h}.jpg', (w, h))
    jpg(f'summary-{w}x{h}.png', f'02-estimate-summary-{w}x{h}.jpg', (w, h))
    jpg(f'mobile-{w}x{h}.png', f'03-mobile-view-{w}x{h}.jpg', (w, h))

# Animated WebP with a simple cursor overlay
def cursor(im, x, y, down):
    d = ImageDraw.Draw(im, 'RGBA')
    if down:
        d.ellipse([x - 22, y - 22, x + 22, y + 22], fill=(14, 116, 144, 60), outline=(14, 116, 144, 160), width=2)
    pts = [(x, y), (x, y + 22), (x + 6, y + 17), (x + 10, y + 26), (x + 14, y + 24), (x + 10, y + 15), (x + 17, y + 15)]
    d.polygon(pts, fill=(11, 34, 51, 255), outline=(255, 255, 255, 255))
    return im

frames, durs = [], []
for fr in json.load(open(f'{RAW}/anim.json')):
    im = Image.open(fr['f']).convert('RGB')
    if fr['click']:
        im = cursor(im, fr['click']['x'], fr['click']['y'], fr['click']['down'])
    frames.append(im); durs.append(fr['ms'])
frames[0].save(f'{OUT}/04-price-updates-1280x769.webp', save_all=True, append_images=frames[1:],
               duration=durs, loop=0, quality=80, method=6)

# Open Graph image 1200x630 (crop of the 2x mid-flow shot)
im = Image.open(f'{RAW}/midflow-1280x769.png').convert('RGB')
W, H = im.size
ch = round(W * 630 / 1200)
im.crop((0, 0, W, ch)).resize((1200, 630), Image.LANCZOS).save(
    '/workspace/quote-demo/public/og.jpg', 'JPEG', quality=85, optimize=True, progressive=True)
for f in sorted(os.listdir(OUT)):
    p = f'{OUT}/{f}'; print(f, Image.open(p).size, os.path.getsize(p) // 1024, 'KB')
