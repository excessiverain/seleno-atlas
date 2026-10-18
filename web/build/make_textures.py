from PIL import Image
import numpy as np
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
os.makedirs('textures', exist_ok=True)

# Color texture: 8k -> 4k equirectangular
color = Image.open('source/moon_color_8k.jpg').convert('RGB')
print('color source', color.size)
color4k = color.resize((4096, 2048), Image.LANCZOS)
color4k.save('textures/moon_color_4k.jpg', quality=88, optimize=True, progressive=True)
print('color4k', color4k.size, os.path.getsize('textures/moon_color_4k.jpg'))

# Bump texture: original LRO map is 0..360 longitude (center=180E), shift to -180..180
bump = Image.open('source/moon_lro_bumpmap_8192x4096.jpg').convert('L')
print('bump source', bump.size)
b = np.array(bump)
b = np.roll(b, b.shape[1] // 2, axis=1)  # center longitude 180 -> 0
# 原始 LRO 镶嵌图在 0°/360° 接缝处有一条 2~3 px 的黑线，转到中央后需修补
c = b.shape[1] // 2
left = b[:, c - 6:c - 5].astype(np.float32)
right = b[:, c + 6:c + 7].astype(np.float32)
for off in range(5, -6, -1):
    t = (off + 6) / 12.0
    b[:, c + off] = np.round(left[:, 0] * (1 - t) + right[:, 0] * t).astype(np.uint8)
bump_shift = Image.fromarray(b, 'L')
bump4k = bump_shift.resize((4096, 2048), Image.LANCZOS)
bump4k.save('textures/moon_bump_4k.jpg', quality=82, optimize=True, progressive=True)
print('bump4k', bump4k.size, os.path.getsize('textures/moon_bump_4k.jpg'))

# thumbnails for checking
color.resize((1024, 512), Image.LANCZOS).save('textures/moon_color_1k.jpg', quality=88, optimize=True)
bump_shift.resize((1024, 512), Image.LANCZOS).save('textures/moon_bump_1k.jpg', quality=80, optimize=True)

# composite check: color with bump as 50% soft light? Just make a side-by-side alignment strip
c = np.array(color.resize((1024, 512), Image.LANCZOS)).astype(float)
b2 = np.array(bump_shift.resize((1024, 512), Image.LANCZOS)).astype(float)
# colorize bump in red/blue over color to see align edges
comp = c.copy()
comp[:, :, 0] = np.clip(comp[:, :, 0] * 0.6 + b2 * 0.4, 0, 255)
comp[:, :, 1] = np.clip(comp[:, :, 1] * 0.6 + b2 * 0.4, 0, 255)
comp[:, :, 2] = np.clip(comp[:, :, 2] * 0.6 + b2 * 0.4, 0, 255)
Image.fromarray(comp.astype(np.uint8)).save('textures/alignment_check.jpg', quality=90)
print('done')
