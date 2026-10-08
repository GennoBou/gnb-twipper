import os
import sys
import json
from PIL import Image, ImageDraw, ImageFilter, ImageFont

# Base paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_IMAGES = os.path.join(PROJECT_ROOT, "docs", "images")
JSON_PATH = os.path.join(PROJECT_ROOT, "docs", "banner_texts.json")
ICON_PATH = os.path.join(PROJECT_ROOT, "public", "icons", "icon128.png")
PANEL_PATH = os.path.join(DOCS_IMAGES, "panel_twipper_transparent.png")

CANVAS_W, CANVAS_H = 1280, 800

# Fonts mapping
FONTS = {
    "ja": {
        "title": ImageFont.truetype("C:/Windows/Fonts/yugothb.ttc", 44),
        "sub": ImageFont.truetype("C:/Windows/Fonts/meiryo.ttc", 20),
        "card_head": ImageFont.truetype("C:/Windows/Fonts/yugothb.ttc", 18),
        "card_desc": ImageFont.truetype("C:/Windows/Fonts/meiryo.ttc", 14),
    },
    "en": {
        "title": ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 46),
        "sub": ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 20),
        "card_head": ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 19),
        "card_desc": ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 14),
    },
    "brand_main": ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 32),
    "brand_sub": ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", 24),
}


def create_base_canvas(with_panel=True):
    canvas = Image.new("RGBA", (CANVAS_W, CANVAS_H), (10, 9, 16, 255))
    
    # Ambient Glow
    glow_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)
    
    cx, cy = 940, 440
    for r in range(450, 40, -15):
        alpha = int(40 * (1 - r / 450.0) ** 2)
        glow_draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(145, 70, 255, alpha))
        
    for r in range(350, 50, -20):
        alpha = int(25 * (1 - r / 350.0) ** 2)
        glow_draw.ellipse([1150 - r, 750 - r, 1150 + r, 750 + r], fill=(119, 44, 232, alpha))
        
    for r in range(250, 30, -15):
        alpha = int(20 * (1 - r / 250.0) ** 2)
        glow_draw.ellipse([140 - r, 90 - r, 140 + r, 90 + r], fill=(145, 70, 255, alpha))

    canvas = Image.alpha_composite(canvas, glow_layer)
    
    # Dot Pattern
    dot_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    dot_draw = ImageDraw.Draw(dot_layer)
    for x in range(32, CANVAS_W, 32):
        for y in range(32, CANVAS_H, 32):
            dot_draw.point((x, y), fill=(255, 255, 255, 14))
    canvas = Image.alpha_composite(canvas, dot_layer)

    if with_panel and os.path.exists(PANEL_PATH):
        panel = Image.open(PANEL_PATH).convert("RGBA")
        scale = 1.68
        pw = int(panel.width * scale)
        ph = int(panel.height * scale)
        panel_scaled = panel.resize((pw, ph), Image.Resampling.LANCZOS)
        
        panel_x = 705
        panel_y = (CANVAS_H - ph) // 2 + 10

        # Drop shadow
        shadow_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        p_alpha = panel_scaled.split()[3]
        black_panel = Image.new("RGBA", (pw, ph), (0, 0, 0, 255))
        black_panel.putalpha(p_alpha)
        shadow_layer.paste(black_panel, (panel_x + 8, panel_y + 16))
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=30))
        canvas = Image.alpha_composite(canvas, shadow_layer)

        # Border glow
        border_glow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        glow_panel = Image.new("RGBA", (pw, ph), (145, 70, 255, 120))
        glow_panel.putalpha(p_alpha)
        border_glow.paste(glow_panel, (panel_x, panel_y))
        border_glow = border_glow.filter(ImageFilter.GaussianBlur(radius=8))
        canvas = Image.alpha_composite(canvas, border_glow)

        # Panel
        panel_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
        panel_layer.paste(panel_scaled, (panel_x, panel_y))
        canvas = Image.alpha_composite(canvas, panel_layer)

    # Header Brand: "GNB Twipper for Twitch"
    header_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    if os.path.exists(ICON_PATH):
        icon = Image.open(ICON_PATH).convert("RGBA").resize((48, 48), Image.Resampling.LANCZOS)
        header_layer.paste(icon, (75, 68))
        brand_x = 75 + 48 + 14
    else:
        brand_x = 75

    h_draw = ImageDraw.Draw(header_layer)
    h_draw.text((brand_x, 72), "GNB Twipper", fill=(255, 255, 255, 255), font=FONTS["brand_main"])
    w_main = int(h_draw.textlength("GNB Twipper", font=FONTS["brand_main"]))
    h_draw.text((brand_x + w_main + 10, 78), "for Twitch", fill=(185, 155, 255, 240), font=FONTS["brand_sub"])

    canvas = Image.alpha_composite(canvas, header_layer)
    return canvas


def build_s2_canvas(image_file):
    canvas = create_base_canvas(with_panel=False)
    if not os.path.exists(image_file):
        print(f"Warning: {image_file} not found")
        return canvas

    s2 = Image.open(image_file).convert("RGBA")
    target_h = 660
    target_w = int(s2.width * (target_h / s2.height))
    s2_scaled = s2.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    w, h = target_w, target_h
    mask = Image.new("L", (w * 4, h * 4), 0)
    m_draw = ImageDraw.Draw(mask)
    m_draw.rounded_rectangle((0, 0, w * 4 - 1, h * 4 - 1), radius=12 * 4, fill=255)
    mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    s2_scaled.putalpha(mask)

    s2_x = 640
    s2_y = (CANVAS_H - target_h) // 2 + 10

    # Shadow
    shadow_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    black_s2 = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    black_s2.putalpha(mask)
    shadow_layer.paste(black_s2, (s2_x + 8, s2_y + 16))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=30))
    canvas = Image.alpha_composite(canvas, shadow_layer)

    # Glow
    border_glow = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    glow_s2 = Image.new("RGBA", (w, h), (145, 70, 255, 120))
    glow_s2.putalpha(mask)
    border_glow.paste(glow_s2, (s2_x, s2_y))
    border_glow = border_glow.filter(ImageFilter.GaussianBlur(radius=8))
    canvas = Image.alpha_composite(canvas, border_glow)

    # Image
    s2_layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    s2_layer.paste(s2_scaled, (s2_x, s2_y))
    canvas = Image.alpha_composite(canvas, s2_layer)

    return canvas


def render_banner01(lang_key, data):
    canvas = create_base_canvas(with_panel=True)
    layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    fonts = FONTS.get(lang_key, FONTS["en"])

    title_lines = data["title"].split("\n")
    title_y = 195
    draw.text((75, title_y), title_lines[0], fill=(255, 255, 255, 255), font=fonts["title"])
    if len(title_lines) > 1:
        draw.text((75, title_y + 58), title_lines[1], fill=(178, 125, 255, 255), font=fonts["title"])

    sub_y = title_y + 130
    draw.text((75, sub_y), data["subtitle"], fill=(205, 205, 225, 255), font=fonts["sub"])

    card_colors = [(145, 70, 255), (0, 208, 132), (59, 130, 246)]
    card_start_y = sub_y + 60
    for i, card in enumerate(data["cards"]):
        cy = card_start_y + i * 86
        color = card_colors[i % len(card_colors)]
        draw.rounded_rectangle([75, cy, 75 + 565, cy + 70], radius=10, fill=(28, 25, 42, 200), outline=(55, 50, 78, 230), width=1)
        draw.rounded_rectangle([75, cy, 75 + 6, cy + 70], radius=3, fill=(*color, 255))
        draw.text((98, cy + 13), card["heading"], fill=(255, 255, 255, 255), font=fonts["card_head"])
        draw.text((98, cy + 40), card["description"], fill=(170, 170, 195, 230), font=fonts["card_desc"])

    final_img = Image.alpha_composite(canvas, layer)
    out_file = os.path.join(DOCS_IMAGES, f"screenshot01_store_{lang_key}.png")
    final_img.save(out_file)
    print(f"Generated: {out_file}")


def render_banner02(lang_key, data):
    # Select right-side screenshot based on language
    screenshot_file = os.path.join(DOCS_IMAGES, f"screenshot02_{lang_key}.png")
    if not os.path.exists(screenshot_file):
        screenshot_file = os.path.join(DOCS_IMAGES, "screenshot02.png")

    canvas = build_s2_canvas(screenshot_file)
    layer = Image.new("RGBA", (CANVAS_W, CANVAS_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    fonts = FONTS.get(lang_key, FONTS["en"])

    title_lines = data["title"].split("\n")
    title_y = 175
    draw.text((75, title_y), title_lines[0], fill=(255, 255, 255, 255), font=fonts["title"])
    if len(title_lines) > 1:
        draw.text((75, title_y + 54), title_lines[1], fill=(178, 125, 255, 255), font=fonts["title"])

    sub_y = title_y + 118
    draw.text((75, sub_y), data["subtitle"], fill=(205, 205, 225, 255), font=fonts["sub"])

    card_colors = [(145, 70, 255), (0, 208, 132), (59, 130, 246), (239, 68, 68)]
    card_start_y = sub_y + 50
    for i, card in enumerate(data["cards"]):
        cy = card_start_y + i * 86
        color = card_colors[i % len(card_colors)]
        draw.rounded_rectangle([75, cy, 75 + 520, cy + 72], radius=10, fill=(28, 25, 42, 200), outline=(55, 50, 78, 230), width=1)
        draw.rounded_rectangle([75, cy, 75 + 6, cy + 72], radius=3, fill=(*color, 255))
        draw.text((95, cy + 13), card["heading"], fill=(255, 255, 255, 255), font=fonts["card_head"])
        draw.text((95, cy + 41), card["description"], fill=(170, 170, 195, 230), font=fonts["card_desc"])

    final_img = Image.alpha_composite(canvas, layer)
    out_file = os.path.join(DOCS_IMAGES, f"screenshot02_store_{lang_key}.png")
    final_img.save(out_file)
    print(f"Generated: {out_file}")


def main():
    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found")
        sys.exit(1)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        config = json.load(f)

    # 1. Base Blank Banner
    base_banner = create_base_canvas(with_panel=True)
    base_out = os.path.join(DOCS_IMAGES, "banner_base_1280x800.png")
    base_banner.save(base_out)
    print(f"Generated Base Template: {base_out}")

    # 2. Render each language
    for lang_key, lang_data in config.get("languages", {}).items():
        print(f"Processing language: {lang_key} ({lang_data.get('name')})")
        if "banner01" in lang_data:
            render_banner01(lang_key, lang_data["banner01"])
        if "banner02" in lang_data:
            render_banner02(lang_key, lang_data["banner02"])

    print("\nAll banners generated successfully!")


if __name__ == "__main__":
    main()
