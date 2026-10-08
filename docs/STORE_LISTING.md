[English](./STORE_LISTING.md) / [日本語](./STORE_LISTING_ja.md) / [Español](./STORE_LISTING_es.md) / [Português](./STORE_LISTING_pt-BR.md) / [Deutsch](./STORE_LISTING_de.md) / [Français](./STORE_LISTING_fr.md) / [繁體中文](./STORE_LISTING_zh-TW.md)

# Store Listing Specifications & Descriptions

This document contains the official metadata, short descriptions, detailed descriptions, privacy justifications, and submission details for Chrome Web Store, Firefox Add-ons (AMO), and Opera Addons.

---

## General Information

- **Extension Name**: `GNB Twipper for Twitch`
- **Version**: `1.0.0`
- **Primary Category**: Social & Communication
- **Secondary Category**: Entertainment
- **Default Language**: English (`en`)
- **Supported Locales**: English (`en`), Japanese (`ja`), Spanish (`es`), Portuguese (`pt_BR`), German (`de`), French (`fr`), Traditional Chinese (`zh_TW`)
- **Homepage / Repository**: `https://github.com/GennoBou/gnb-twipper`
- **Support URL**: `https://github.com/GennoBou/gnb-twipper/issues`
- **License**: `MIT License`

---

## 1. Chrome Web Store Listing

> [!NOTE]
> The Chrome Web Store description field supports **plain text only** (Markdown and HTML are not supported). Please copy and paste the formatted text below directly.

### App Title / Name (Up to 45 characters)

`GNB Twipper for Twitch`

### Summary / Short Description (Up to 132 characters)

`Automatically cycle through live streams you follow on Twitch.`

### Detailed Description (Plain Text / Up to 16,000 characters)

```text
GNB Twipper for Twitch is a minimalist browser extension designed to help you efficiently watch and rotate through live streams of your followed Twitch channels.

[Key Features]
- 🔄 Smart Channel Auto-Rotation & Standby: Automatically switches between live followed channels on a timer. When only 1 channel is live, rotation automatically pauses so you can keep watching, and resumes automatically when 2 or more channels go live.
- 🚫 Channel Exclusions: Easily exclude specific channels (e.g. 24/7 streams or music channels) from auto-rotation.
- 🔒 Subscriber-Only Stream Auto-Skip: Automatically detects and skips locked sub-only streams (supports free preview periods).
- 🧭 Minimalist & Lightweight UI: Seamlessly integrated top navigation bar with quick controls (AUTO Start/Stop, Skip, Channel List, Standby indicator).
- ⚡ Clean Browser History: Uses in-place replacement navigation so your browser back button history stays clean.
- 🌐 Multi-language Support: Built-in native support for 7 languages (English, Japanese, Spanish, Portuguese, German, French, Traditional Chinese).

----------------------------------------

[💬 Feedback & Support]
- Homepage & Source Code:
https://github.com/GennoBou/gnb-twipper
- Bug Reports & Inquiries:
https://github.com/GennoBou/gnb-twipper/issues
(The author is a native Japanese speaker, but issues in English and other languages are warmly welcome via translation!)

----------------------------------------

* Advanced Customization Note: Supports optional custom styling and script adjustments for tailored viewing setups (Note: Due to browser security requirements, please enable "Allow user scripts" in the extension's Details settings to run custom JavaScript).
```

---

## 2. Firefox Add-ons (AMO) Listing

> [!NOTE]
> Firefox Add-ons (AMO) supports **Markdown** in the detailed description field (HTML is not supported). Please use the Markdown text below with formatting intact.

### Summary (Up to 250 characters)

`Automatically cycle through live streams you follow on Twitch.`

### Detailed Description (Markdown)

```markdown
**GNB Twipper for Twitch** is a minimalist browser extension designed to help you efficiently watch and rotate through live streams of your followed Twitch channels.

### Key Features

- 🔄 **Smart Channel Auto-Rotation & Standby**: Automatically switches between live followed channels on a timer. When only 1 channel is live, rotation automatically pauses so you can keep watching, and resumes automatically when 2 or more channels go live.
- 🚫 **Channel Exclusions**: Easily exclude specific channels (e.g. 24/7 streams or music channels) from auto-rotation.
- 🔒 **Subscriber-Only Stream Auto-Skip**: Automatically detects and skips locked sub-only streams (supports free preview periods).
- 🧭 **Minimalist & Lightweight UI**: Seamlessly integrated top navigation bar with quick controls (AUTO Start/Stop, Skip, Channel List, Standby indicator).
- ⚡ **Clean Browser History**: Uses in-place replacement navigation so your browser back button history stays clean.
- 🌐 **Multi-language Support**: Built-in native support for 7 languages (English, Japanese, Spanish, Portuguese, German, French, Traditional Chinese).

---

### 💬 Feedback & Support
- **Homepage & Source Code**: [GitHub](https://github.com/GennoBou/gnb-twipper)
- **Bug Reports & Inquiries**: [Issues](https://github.com/GennoBou/gnb-twipper/issues)
*(The author is a native Japanese speaker, but issues in English and other languages are warmly welcome via translation!)*

---

*Advanced Customization Note*: Supports optional custom styling and script adjustments for tailored viewing setups (Note: Due to browser security requirements, please enable "Allow user scripts" in the extension's Details settings to run custom JavaScript).
```

---

## 3. Opera Addons Listing

> [!NOTE]
> The Opera Addons description field supports **plain text only** (Markdown and HTML are not rendered). Please use the same plain text as Chrome Web Store above.

### Short Summary

`Automatically cycle through live streams you follow on Twitch.`

### Detailed Description

(Same as Section 1. Chrome Web Store listing plain text above)

---

## 📷 Store Submission Screenshot Requirements

Image requirements for official store submission:
- **Dimensions**: `1280x800` or `640x400` (Aspect Ratio: **16:10**)
- **File Format**: `PNG` or `JPEG`

Generated asset files (`docs/images/`):
- `screenshot01_store_en.png` (Main view: 1280x800 English banner card)
- `screenshot02_store_en.png` (Options view: 1280x800 English banner card)
- `screenshot01_store_ja.png` (Main view: 1280x800 Japanese banner card)
- `screenshot02_store_ja.png` (Options view: 1280x800 Japanese banner card)
- `opera_promo_300x188.png` (Opera Addons promotional tile: 300x188 official spec)
- `banner_base_1280x800.png` (Blank template for creating other language banners)

---

## 📝 Promotional Banner Copy (Multi-Language Management)

Copywriting texts used across promotional store banners. **Japanese** is the original master copy, and **English** is the primary international reference.
*Note: Stored in `docs/banner_texts.json`. Run `python scripts/generate-banners.py` to re-generate all banner cards in batch.*

### Banner 1: Main Control Panel (`screenshot01_store_*.png`)

| Element | Japanese (Original) | English (Primary Reference) |
| :--- | :--- | :--- |
| **Header** | `GNB Twipper for Twitch` | `GNB Twipper for Twitch` |
| **Main Copy** | Twitchのフォロー配信を<br>スマートに自動巡回 | Auto-Rotate Followed<br>Twitch Streams |
| **Sub Copy** | 推しの配信を快適ながら見 でもブラウザ履歴が増えません | Comfortable hands-free watching with zero history clutter |
| **Card 1** | **フォロー配信者をローテーション視聴**<br>視聴時間が短い新規配信は優先的に視聴します。 | **Rotate Followed Streamers**<br>Prioritizes newly live streams with shorter watch time. |
| **Card 2** | **オートのON/OFF、配信のスキップ**<br>Twitchのトップバーから全てのツールにアクセスできます。 | **Auto Toggle & Instant Skip**<br>Access all tools directly from the Twitch top bar. |
| **Card 3** | **履歴を増やさず自動巡回**<br>自動巡回し続けてもブラウザ履歴は増えません。 | **Clean Browser History**<br>Browser history never piles up, even during continuous rotation. |

### Banner 2: Options Page (`screenshot02_store_*.png`)

| Element | Japanese (Original) | English (Primary Reference) |
| :--- | :--- | :--- |
| **Header** | `GNB Twipper for Twitch` | `GNB Twipper for Twitch` |
| **Main Copy** | オプション画面で<br>カスタマイズもできます | Full Customization in<br>Options Page |
| **Sub Copy** | 巡回間隔や除外チャンネルを あなたに合わせて調整しましょう | Tailor rotation timing and exclusions to your personal style |
| **Card 1** | **巡回間隔を変更できます**<br>巡回間隔(初期３分)をあなたの視聴スタイルに合わせて調整可能 | **Adjustable Rotation Interval**<br>Customize the interval (default 3 min) to match your rhythm. |
| **Card 2** | **とりあえずオート視聴？**<br>Twitch.tv視聴開始時にオートを開始するかを変更できます | **Auto-Start on Twitch Access?**<br>Choose whether to begin rotation automatically when opening Twitch. |
| **Card 3** | **サブスク限定配信は自動スキップ**<br>無料プレビューの間は視聴します。それともしません？ | **Skip Subscriber-Only Streams**<br>Watch during free previews, or skip immediately? You decide. |
| **Card 4** | **除外チャンネル登録**<br>24時間配信や音楽チャンネルなど巡回はしないチャンネルを除外リストに追加 | **Exclusion Channel List**<br>Exclude 24/7 loops, music bots, or specific channels from queue. |

---

## 🔒 Publishing Scope (Limited / Unlisted Publication)

To publish as a **Limited / Unlisted (限定公開)** extension:

1. In Chrome Developer Dashboard, navigate to **Distribution -> Visibility**.
2. Select **Unlisted**.
3. Only users with the direct store link will be able to view and install the extension; it will not appear in public search results.

---

## Required Permissions Justification

When submitting to store reviewers, provide the following justifications for permissions used in `manifest.json`:

**Single Purpose**: Automatically cycle through and control playback of live streams followed on Twitch.

| Permission | Justification / Purpose |
| :--- | :--- |
| `storage` | Save user preferences, rotation interval settings, and channel exclusion lists locally. |
| `alarms` | Manage precise timers for channel rotation without degrading CPU efficiency. |
| `scripting` | Apply user-configured layout display tweaks (Custom CSS) onto twitch.tv pages. |
| `userScripts` | Safely execute user-defined custom JavaScript logic in compliance with browser security specifications. |
| `cookies` | Maintain session state and seamless streaming experience across tab switches. |
| `tabs` | Handle Twitch player and chat window navigation for automated hopping. |
| `webRequest` | Automatically detect valid Twitch Client-ID headers from GraphQL requests to ensure stable stream status retrieval. |
| Host: `https://www.twitch.tv/*`, `https://gql.twitch.tv/*` | Interact with Twitch Web UI and Twitch GQL API to retrieve follow lists and stream status. |
