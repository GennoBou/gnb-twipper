"""Microsoft Edge Add-ons ストア提出用アセット画像を生成するスクリプト。"""

import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# パス定義
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_IMAGES_DIR = os.path.join(PROJECT_ROOT, "docs", "images")
ICON_PATH = os.path.join(PROJECT_ROOT, "public", "icons", "icon512.png")
PANEL_PATH = os.path.join(DOCS_IMAGES_DIR, "panel_twipper_transparent.png")

FONT_BOLD_PATH = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REGULAR_PATH = "C:/Windows/Fonts/segoeui.ttf"
FONT_JA_BOLD_PATH = "C:/Windows/Fonts/yugothb.ttc"
FONT_JA_REGULAR_PATH = "C:/Windows/Fonts/meiryo.ttc"

# 言語別の小プロモーションタイル (440x280) テキスト設定
SMALL_PROMO_VARIANTS = {
    "en": {
        "filename": "edge_promo_440x280.png",
        "tagline": "Auto-Rotate Live Streams",
        "tagline_font": FONT_REGULAR_PATH,
        "tagline_size": 16,
    },
    "ja": {
        "filename": "edge_promo_440x280_ja.png",
        "tagline": "フォロー配信をスマートに自動巡回",
        "tagline_font": FONT_JA_BOLD_PATH,
        "tagline_size": 14,
    },
}

# 言語別の大プロモーションタイル (1400x560) テキスト設定
LARGE_PROMO_VARIANTS = {
    "en": {
        "filename": "edge_promo_1400x560.png",
        "headline": "Auto-Rotate Followed Live Streams",
        "headline_font": FONT_BOLD_PATH,
        "headline_size": 35,
        "subtitle": "Comfortable hands-free watching with zero history clutter",
        "subtitle_font": FONT_REGULAR_PATH,
        "subtitle_size": 21,
    },
    "ja": {
        "filename": "edge_promo_1400x560_ja.png",
        "headline": "Twitchのフォロー配信をスマートに自動巡回",
        "headline_font": FONT_JA_BOLD_PATH,
        "headline_size": 32,
        "subtitle": "推しの配信を快適ながら見でも ブラウザ履歴が増えません",
        "subtitle_font": FONT_JA_REGULAR_PATH,
        "subtitle_size": 19,
    },
}


def create_ambient_background(
    width: int,
    height: int,
    glow_specs: list[tuple[int, int, int, tuple[int, int, int], int]],
    dot_step: int,
) -> Image.Image:
    """ダーク背景にアンビエントグローとドットパターンを描画したベース画像を生成する。"""
    canvas = Image.new("RGBA", (width, height), (12, 10, 20, 255))

    # アンビエントグロー層
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    for cx, cy, max_radius, rgb, max_alpha in glow_specs:
        step = max(8, max_radius // 22)
        for radius in range(max_radius, step, -step):
            alpha = int(max_alpha * (1.0 - radius / float(max_radius)) ** 2)
            glow_draw.ellipse(
                [cx - radius, cy - radius, cx + radius, cy + radius],
                fill=(rgb[0], rgb[1], rgb[2], alpha),
            )
    canvas = Image.alpha_composite(canvas, glow_layer)

    # グリッドドットパターン層
    dot_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_layer)
    dot_radius = max(1, dot_step // 24)
    for x in range(dot_step, width, dot_step):
        for y in range(dot_step, height, dot_step):
            dot_draw.ellipse(
                [x - dot_radius, y - dot_radius, x + dot_radius, y + dot_radius],
                fill=(255, 255, 255, 14),
            )
    return Image.alpha_composite(canvas, dot_layer)


def draw_icon_with_shadow(
    canvas: Image.Image,
    icon_size: int,
    icon_x: int,
    icon_y: int,
    blur_radius: int,
    corner_radius: int,
) -> Image.Image:
    """ドロップシャドウ付きでアプリアイコンを合成する。"""
    icon = Image.open(ICON_PATH).convert("RGBA")
    icon_resized = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)

    shadow_layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_layer)
    pad = max(4, icon_size // 28)
    shadow_draw.rounded_rectangle(
        [
            icon_x - pad,
            icon_y + pad,
            icon_x + icon_size + pad,
            icon_y + icon_size + pad * 2,
        ],
        radius=corner_radius,
        fill=(0, 0, 0, 150),
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(blur_radius))
    canvas = Image.alpha_composite(canvas, shadow_layer)
    canvas.alpha_composite(icon_resized, (icon_x, icon_y))
    return canvas


def draw_badge(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    pad_x: int,
    pad_y: int,
    radius: int,
    border_width: int,
) -> int:
    """角丸バッジを描画し、バッジの下端 Y 座標を返す。"""
    bbox = draw.textbbox((0, 0), text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    box_w = text_w + pad_x * 2
    box_h = text_h + pad_y * 2

    draw.rounded_rectangle(
        [x, y, x + box_w, y + box_h],
        radius=radius,
        fill=(145, 70, 255, 48),
        outline=(169, 112, 255, 140),
        width=border_width,
    )
    draw.text(
        (x + pad_x - bbox[0], y + pad_y - bbox[1]),
        text,
        font=font,
        fill=(198, 160, 255, 255),
    )
    return y + box_h


def generate_store_logo() -> str:
    """300x300 px の Microsoft Edge Add-ons ストア用ロゴを生成する。"""
    output_path = os.path.join(DOCS_IMAGES_DIR, "edge_logo_300x300.png")
    icon = Image.open(ICON_PATH).convert("RGBA")
    logo = icon.resize((300, 300), Image.Resampling.LANCZOS)
    logo.save(output_path, "PNG", optimize=True)
    return output_path


def generate_small_promo_tile(locale: str) -> str:
    """指定言語の 440x280 px 小プロモーションタイルを生成する（2倍解像度レンダリング後に縮小）。"""
    spec = SMALL_PROMO_VARIANTS[locale]
    target_w, target_h = 440, 280
    scale = 2
    w, h = target_w * scale, target_h * scale

    glow_specs = [
        (w - 140, -60, 350, (145, 70, 255), 36),
        (210, h // 2, 240, (120, 45, 240), 46),
    ]
    canvas = create_ambient_background(w, h, glow_specs, dot_step=34)

    # 左側アイコン
    icon_size = 236
    icon_x = 60
    icon_y = (h - icon_size) // 2
    canvas = draw_icon_with_shadow(
        canvas,
        icon_size=icon_size,
        icon_x=icon_x,
        icon_y=icon_y,
        blur_radius=18,
        corner_radius=44,
    )

    # 右側テキスト群
    text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)

    font_badge = ImageFont.truetype(FONT_BOLD_PATH, 13 * scale)
    font_title = ImageFont.truetype(FONT_BOLD_PATH, 33 * scale)
    font_brand = ImageFont.truetype(FONT_BOLD_PATH, 21 * scale)
    font_tagline = ImageFont.truetype(spec["tagline_font"], spec["tagline_size"] * scale)

    text_x = 344
    badge_bottom = draw_badge(
        draw,
        x=text_x,
        y=114,
        text="TWITCH EXTENSION",
        font=font_badge,
        pad_x=18,
        pad_y=10,
        radius=12,
        border_width=2,
    )

    title_y = badge_bottom + 26
    draw.text((text_x, title_y), "GNB Twipper", font=font_title, fill=(255, 255, 255, 255))

    sub_y = title_y + 84
    draw.text((text_x, sub_y), "for Twitch", font=font_brand, fill=(178, 125, 255, 255))

    tagline_y = sub_y + 66
    draw.text(
        (text_x, tagline_y),
        spec["tagline"],
        font=font_tagline,
        fill=(212, 204, 232, 235),
    )

    canvas = Image.alpha_composite(canvas, text_layer)
    final_img = canvas.resize((target_w, target_h), Image.Resampling.LANCZOS)

    output_path = os.path.join(DOCS_IMAGES_DIR, spec["filename"])
    final_img.save(output_path, "PNG", optimize=True)
    return output_path


def generate_large_promo_tile(locale: str) -> str:
    """指定言語の 1400x560 px 大プロモーションタイルを生成する（2倍解像度レンダリング後に縮小）。"""
    spec = LARGE_PROMO_VARIANTS[locale]
    target_w, target_h = 1400, 560
    scale = 2
    w, h = target_w * scale, target_h * scale

    glow_specs = [
        (2250, h // 2, 720, (145, 70, 255), 42),
        (2560, h - 80, 460, (119, 44, 232), 28),
        (280, 160, 420, (145, 70, 255), 24),
    ]
    canvas = create_ambient_background(w, h, glow_specs, dot_step=52)

    # 右側のビジュアル（操作パネル透過画像、未存在時はアイコンカードへフォールバック）
    if os.path.exists(PANEL_PATH):
        panel = Image.open(PANEL_PATH).convert("RGBA")
        panel_target_h = 880
        panel_scale = panel_target_h / float(panel.height)
        pw = int(panel.width * panel_scale)
        ph = panel_target_h
        panel_scaled = panel.resize((pw, ph), Image.Resampling.LANCZOS)

        panel_x = w - pw - 190
        panel_y = (h - ph) // 2

        panel_alpha = panel_scaled.split()[3]

        # ドロップシャドウ
        shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        black_panel = Image.new("RGBA", (pw, ph), (0, 0, 0, 255))
        black_panel.putalpha(panel_alpha)
        shadow_layer.paste(black_panel, (panel_x + 14, panel_y + 24))
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=42))
        canvas = Image.alpha_composite(canvas, shadow_layer)

        # パープルエッジグロー
        border_glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        glow_panel = Image.new("RGBA", (pw, ph), (145, 70, 255, 130))
        glow_panel.putalpha(panel_alpha)
        border_glow.paste(glow_panel, (panel_x, panel_y))
        border_glow = border_glow.filter(ImageFilter.GaussianBlur(radius=14))
        canvas = Image.alpha_composite(canvas, border_glow)

        panel_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        panel_layer.paste(panel_scaled, (panel_x, panel_y))
        canvas = Image.alpha_composite(canvas, panel_layer)
    else:
        icon_size = 460
        canvas = draw_icon_with_shadow(
            canvas,
            icon_size=icon_size,
            icon_x=w - icon_size - 240,
            icon_y=(h - icon_size) // 2,
            blur_radius=30,
            corner_radius=80,
        )

    # 左側テキスト＆ブランドエリア
    text_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(text_layer)

    font_badge = ImageFont.truetype(FONT_BOLD_PATH, 16 * scale)
    font_brand = ImageFont.truetype(FONT_BOLD_PATH, 46 * scale)
    font_brand_sub = ImageFont.truetype(FONT_BOLD_PATH, 34 * scale)
    font_headline = ImageFont.truetype(spec["headline_font"], spec["headline_size"] * scale)
    font_subtitle = ImageFont.truetype(spec["subtitle_font"], spec["subtitle_size"] * scale)

    left_x = 180
    badge_bottom = draw_badge(
        draw,
        x=left_x,
        y=196,
        text="TWITCH EXTENSION",
        font=font_badge,
        pad_x=24,
        pad_y=12,
        radius=14,
        border_width=3,
    )

    # アイコン + 「GNB Twipper for Twitch」
    brand_y = badge_bottom + 54
    mini_icon_size = 108
    if os.path.exists(ICON_PATH):
        mini_icon = Image.open(ICON_PATH).convert("RGBA").resize(
            (mini_icon_size, mini_icon_size), Image.Resampling.LANCZOS
        )
        canvas.alpha_composite(mini_icon, (left_x, brand_y))
        brand_text_x = left_x + mini_icon_size + 32
    else:
        brand_text_x = left_x

    draw.text((brand_text_x, brand_y - 4), "GNB Twipper", font=font_brand, fill=(255, 255, 255, 255))
    main_w = int(draw.textlength("GNB Twipper", font=font_brand))
    draw.text(
        (brand_text_x + main_w + 22, brand_y + 14),
        "for Twitch",
        font=font_brand_sub,
        fill=(185, 145, 255, 250),
    )

    # アクセントバー
    accent_y = brand_y + mini_icon_size + 46
    draw.rounded_rectangle(
        [left_x, accent_y, left_x + 140, accent_y + 8],
        radius=4,
        fill=(145, 70, 255, 255),
    )

    # 見出し＆説明コピー
    headline_y = accent_y + 42
    draw.text(
        (left_x, headline_y),
        spec["headline"],
        font=font_headline,
        fill=(255, 255, 255, 255),
    )

    subtitle_y = headline_y + 104
    draw.text(
        (left_x, subtitle_y),
        spec["subtitle"],
        font=font_subtitle,
        fill=(206, 202, 226, 240),
    )

    canvas = Image.alpha_composite(canvas, text_layer)
    final_img = canvas.resize((target_w, target_h), Image.Resampling.LANCZOS)

    output_path = os.path.join(DOCS_IMAGES_DIR, spec["filename"])
    final_img.save(output_path, "PNG", optimize=True)
    return output_path


def main() -> None:
    """Microsoft Edge Add-ons 用の全画像アセット（英語・日本語）を生成する。"""
    os.makedirs(DOCS_IMAGES_DIR, exist_ok=True)
    if not os.path.exists(ICON_PATH):
        raise FileNotFoundError(f"ソースアイコンが見つかりません: {ICON_PATH}")

    for font_path in (FONT_BOLD_PATH, FONT_REGULAR_PATH, FONT_JA_BOLD_PATH, FONT_JA_REGULAR_PATH):
        if not os.path.exists(font_path):
            raise FileNotFoundError(f"必要なフォントが見つかりません: {font_path}")

    outputs = [
        generate_store_logo(),
        generate_small_promo_tile("en"),
        generate_small_promo_tile("ja"),
        generate_large_promo_tile("en"),
        generate_large_promo_tile("ja"),
    ]
    for path in outputs:
        with Image.open(path) as img:
            print(f"Generated Edge asset: {path} ({img.width}x{img.height}px)")


if __name__ == "__main__":
    main()
