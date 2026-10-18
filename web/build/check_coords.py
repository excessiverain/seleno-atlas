from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

img = Image.open('textures/moon_color_1k.jpg').convert('RGB')
W, H = img.size
d = ImageDraw.Draw(img)
try:
    font = ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', 22)
except Exception:
    font = ImageFont.load_default()

points = [
    ('静海', 8.5, 31.4), ('危海', 17, 59.1), ('雨海', 34.72, -14.91),
    ('风暴洋', 20.67, -56.68), ('第谷', -43.4, -11.1), ('哥白尼', 9.7, -20.1),
    ('阿波罗11', 0.674, 23.473), ('嫦娥四号', -45.5, 177.6),
    ('嫦娥五号', 43.058, -51.916), ('嫦娥六号', -41.64, -153.99),
    ('南极-艾特肯', -53, -169), ('东方海', -19.87, -94.67),
    ('莫斯科海', 27.28, 148.12), ('齐奥尔科夫斯基', -20.38, 128.97),
]
for name, lat, lon in points:
    x = (lon + 180) / 360 * W
    y = (90 - lat) / 180 * H
    d.ellipse([x-5, y-5, x+5, y+5], outline=(255, 60, 60), width=2)
    d.text((x+8, y-12), name, font=font, fill=(255, 255, 0))
for lon in range(-180, 181, 30):
    x = (lon + 180) / 360 * W
    d.line([x, 0, x, H], fill=(80, 80, 80), width=1)
for lat in range(-60, 61, 30):
    y = (90 - lat) / 180 * H
    d.line([0, y, W, y], fill=(80, 80, 80), width=1)
img.save('textures/coords_check.jpg', quality=92)
print('saved', img.size)
