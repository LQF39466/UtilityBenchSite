#!/usr/bin/env python3
"""Regenerate committed logo assets. Optional authoring dependency: Pillow with WebP.
The website and GitHub Pages build use the generated files without Python.
"""
from pathlib import Path
from PIL import Image

assets = Path(__file__).resolve().parents[1] / 'assets'
source = Image.open(assets / 'logo.png').convert('RGBA')
for width in (320, 640, 950):
    image = source.resize((width, round(source.height * width / source.width)), Image.Resampling.LANCZOS)
    image.save(assets / f'logo-{width}.webp', quality=92, method=6)
brand = source.copy()
brand.thumbnail((96, 96), Image.Resampling.LANCZOS)
brand.save(assets / 'logo-brand.webp', quality=92, method=6)
icon = source.copy()
icon.thumbnail((64, 64), Image.Resampling.LANCZOS)
favicon = Image.new('RGBA', (64, 64))
favicon.paste(icon, ((64 - icon.width) // 2, (64 - icon.height) // 2))
favicon.save(assets / 'favicon.png', optimize=True)
for path in sorted(assets.glob('logo-*.webp')):
    print(f'{path.name}: {path.stat().st_size:,} bytes')
print(f'favicon.png: {(assets / "favicon.png").stat().st_size:,} bytes')
