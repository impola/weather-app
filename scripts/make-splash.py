#!/usr/bin/env python3
"""Start-up images for the iOS home-screen app (iOS ignores the manifest for this).

One PNG per iPhone screen size: the sky gradient with the app icon in the middle.
Run from the project folder: python3 scripts/make-splash.py
Writes public/splash/*.png and prints the <link> tags for index.html.
"""
from pathlib import Path
from PIL import Image, ImageDraw

TOP, BOTTOM = (0x1F, 0x6F, 0xD1), (0x0B, 0x3D, 0x91)
ICON = Image.open(Path('public/icons/icon-512.png')).convert('RGBA')

# (width, height) in CSS points and device pixel ratio, portrait
DEVICES = [
    (440, 956, 3),  # 16 Pro Max
    (402, 874, 3),  # 16 Pro
    (430, 932, 3),  # 14 Pro Max, 15 Plus / Pro Max, 16 Plus
    (393, 852, 3),  # 14 Pro, 15, 15 Pro, 16
    (428, 926, 3),  # 12 / 13 Pro Max, 14 Plus
    (390, 844, 3),  # 12, 13, 14
    (375, 812, 3),  # X, XS, 11 Pro, 12 / 13 mini
    (414, 896, 3),  # XS Max, 11 Pro Max
    (414, 896, 2),  # XR, 11
    (414, 736, 3),  # 6/7/8 Plus
    (375, 667, 2),  # 6/7/8, SE 2nd / 3rd gen
]

out = Path('public/splash')
out.mkdir(parents=True, exist_ok=True)
links = []
for w, h, r in DEVICES:
    W, H = w * r, h * r
    img = Image.new('RGB', (W, H))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        f = min(1, y / (H * 0.85))
        draw.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * f) for a, b in zip(TOP, BOTTOM)))
    size = 120 * r
    icon = ICON.resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=27 * r, fill=255)
    img.paste(icon, ((W - size) // 2, (H - size) // 2 - 20 * r), mask)
    name = f'splash-{W}x{H}.png'
    img.save(out / name, optimize=True)
    links.append(
        f'<link rel="apple-touch-startup-image" href="splash/{name}" media="(device-width: {w}px) and (device-height: {h}px) and (-webkit-device-pixel-ratio: {r}) and (orientation: portrait)">'
    )
print('\n'.join(links))
