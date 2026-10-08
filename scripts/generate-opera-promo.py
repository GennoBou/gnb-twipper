import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# プロジェクトパスの設定
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
docs_images = os.path.join(project_root, "docs", "images")
icon_path = os.path.join(project_root, "public", "icons", "icon512.png")
output_path = os.path.join(docs_images, "opera_promo_300x188.png")

# キャンバス解像度
canvas_width, canvas_height = 300, 188

# フォント読み込み (Windows 標準フォント Segoe UI)
font_title = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 23)
font_brand = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 15)
font_tagline = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11)
font_badge = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 9)

# 1. ベースキャンバスの作成 (高品質な2倍解像度 600x376 で描画してリサイズ = アンチエイリアス最高品質)
scale = 2
w, h = canvas_width * scale, canvas_height * scale
canvas = Image.new("RGBA", (w, h), (12, 10, 20, 255))

# 2. アンビエントグロー（Twitchパープルの光彩）を描画
glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow_layer)

# 右上の大きな光彩
for radius in range(240, 20, -10):
    alpha = int(35 * (1 - radius / 240.0) ** 2)
    glow_draw.ellipse(
        [w - 100 - radius, -50 - radius, w - 100 + radius, -50 + radius],
        fill=(145, 70, 255, alpha),
    )

# 左側（アイコン背面）のネオングロー
for radius in range(160, 15, -8):
    alpha = int(45 * (1 - radius / 160.0) ** 2)
    glow_draw.ellipse(
        [150 - radius, h // 2 - radius, 150 + radius, h // 2 + radius],
        fill=(120, 45, 240, alpha),
    )

canvas = Image.alpha_composite(canvas, glow_layer)

# 3. 洗練されたグリッドドットパターンの描画
dot_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
dot_draw = ImageDraw.Draw(dot_layer)
grid_step = 24
for x in range(grid_step, w, grid_step):
    for y in range(grid_step, h, grid_step):
        dot_draw.ellipse([x - 1, y - 1, x + 1, y + 1], fill=(255, 255, 255, 12))

canvas = Image.alpha_composite(canvas, dot_layer)

# 4. アイコンの配置 (高解像度 512px から 160x160 にリサイズ)
icon_size = 164
icon = Image.open(icon_path).convert("RGBA")
icon_resized = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

# アイコンのドロップシャドウ
shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
shadow_draw = ImageDraw.Draw(shadow_layer)
icon_x = 42
icon_y = (h - icon_size) // 2

shadow_draw.rounded_rectangle(
    [icon_x - 6, icon_y + 8, icon_x + icon_size + 6, icon_y + icon_size + 16],
    radius=30,
    fill=(0, 0, 0, 140),
)
shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(12))
canvas = Image.alpha_composite(canvas, shadow_layer)

# アイコン本体の合成
canvas.alpha_composite(icon_resized, (icon_x, icon_y))

# 5. テキストレイヤーの描画
text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
draw = ImageDraw.Draw(text_layer)

# テキスト開始座標
text_x = 236
base_y = 74

# バッジ「TWITCH EXTENSION」
badge_text = "TWITCH EXTENSION"
badge_bbox = font_badge.getbbox(badge_text)
bw = (badge_bbox[2] - badge_bbox[0]) * scale
bh = (badge_bbox[3] - badge_bbox[1]) * scale

draw.rounded_rectangle(
    [text_x, base_y - 2, text_x + bw + 24, base_y + bh + 10],
    radius=8,
    fill=(145, 70, 255, 45),
    outline=(169, 112, 255, 120),
    width=2,
)
draw.text(
    (text_x + 12, base_y + 1),
    badge_text,
    font=ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 9 * scale),
    fill=(191, 148, 255, 255),
)

# メインタイトル「GNB Twipper」
title_y = base_y + bh + 26
draw.text(
    (text_x, title_y),
    "GNB Twipper",
    font=ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 23 * scale),
    fill=(255, 255, 255, 255),
)

# サブタイトル「for Twitch」
sub_y = title_y + 58
draw.text(
    (text_x, sub_y),
    "for Twitch",
    font=ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 15 * scale),
    fill=(169, 112, 255, 255),
)

# キャッチコピー「Auto-Rotate Live Streams」
tagline_y = sub_y + 44
draw.text(
    (text_x, tagline_y),
    "Auto-Rotate Live Streams",
    font=ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 11 * scale),
    fill=(210, 200, 230, 230),
)

canvas = Image.alpha_composite(canvas, text_layer)

# 6. 最終出力サイズ (300x188) に最高品質 (LANCZOS) でリサンプリング
final_image = canvas.resize((canvas_width, canvas_height), Image.Resampling.LANCZOS)
final_image.save(output_path, "PNG", optimize=True)

print(f"Generated Opera promotional image: {output_path} ({canvas_width}x{canvas_height}px)")
