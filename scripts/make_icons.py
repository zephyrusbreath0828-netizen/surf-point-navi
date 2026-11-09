"""PWAアイコン生成(Deep ocean のグラデーション + 太陽 + 波2本)"""
import os

from PIL import Image, ImageDraw

OUT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', 'public', 'icons'))
os.makedirs(OUT, exist_ok=True)

TOP = (10, 37, 64)      # 深い海(ネイビー)
BOT = (20, 110, 140)    # 青緑
TEAL = (23, 163, 152)
SUN = (245, 165, 36)
WHITE = (255, 255, 255)


def gradient(size: int, top, bottom) -> Image.Image:
    col = Image.new('RGB', (1, size))
    for y in range(size):
        t = y / (size - 1)
        col.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    return col.resize((size, size))


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    img = gradient(size, TOP, BOT).convert('RGB')
    d = ImageDraw.Draw(img)
    s = size / 512
    pad = 0.22 if maskable else 0.0  # maskableは中心66%のセーフゾーン

    # 太陽
    r = int(50 * s * (1 - pad))
    cx = int(size * (0.70 if not maskable else 0.62))
    cy = int(size * (0.29 if not maskable else 0.34))
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=SUN)

    # 波2本(白+ティールの弧)
    w = max(2, int(24 * s * (1 - pad)))
    box1 = [int(size * (0.18 + pad / 2)), int(size * (0.46 + pad / 2)), int(size * (0.82 - pad / 2)), int(size * (1.08 - pad / 2))]
    box2 = [int(size * (0.10 + pad / 2)), int(size * (0.64 + pad / 2)), int(size * (0.90 - pad / 2)), int(size * (1.32 - pad / 2))]
    d.arc(box1, start=185, end=355, fill=WHITE, width=w)
    d.arc(box2, start=185, end=355, fill=TEAL, width=w)
    return img


for name, size, mask in [
    ('icon-192.png', 192, False),
    ('icon-512.png', 512, False),
    ('icon-maskable-512.png', 512, True),
    ('apple-touch-icon.png', 180, False),
]:
    draw_icon(size, mask).save(os.path.join(OUT, name))
    print('saved', name)
