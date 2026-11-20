# Store Screenshots & Promotional Assets Guide

Place your Chrome Web Store / Microsoft Edge Add-ons / Firefox Add-ons / Opera Addons screenshots and promotional assets here.

---

## 📷 Recommended Screenshot Specifications

- **Dimensions**: `1280 x 800` pixels (or `640 x 400` / `640 x 480` pixels)
- **Format**: PNG (`.png`) or JPEG (`.jpg`)
- **Quantity**: 1 to 5 images (up to 6 on Microsoft Edge Add-ons)

---

## 🎨 Store Promotional Assets

- **Microsoft Edge Add-ons**:
  - `edge_logo_300x300.png` — Store Logo (`300 x 300` pixels, 1:1 PNG, required)
  - `edge_promo_440x280.png` / `edge_promo_440x280_ja.png` — Small Promotional Tile (`440 x 280` pixels, PNG, English & Japanese, also compatible with Chrome Web Store)
  - `edge_promo_1400x560.png` / `edge_promo_1400x560_ja.png` — Large Promotional Tile (`1400 x 560` pixels, PNG, English & Japanese)
  - Regenerate with: `python scripts/generate-edge-assets.py`
- **Opera Addons**:
  - `opera_promo_300x188.png` — Promotional Tile (`300 x 188` pixels, PNG)
  - Regenerate with: `python scripts/generate-opera-promo.py`

---

## 📁 Screenshot File Naming Convention

- `screenshot01.png` - Main interface (Injected navigation header on Twitch)
- `screenshot02.png` - Options page (Custom CSS/JS editor)
- `screenshot03.png` - Popup interface or Rotation exclusions setting
- `screenshot01_store_*.png` / `screenshot02_store_*.png` - Localized store banner cards (`1280 x 800`, generated via `python scripts/generate-banners.py`)
