[日本語版 (Japanese)](./STORE_LISTING_ja.md)

# Store Listing Specifications & Descriptions

This document contains the official metadata, short descriptions, detailed descriptions, privacy justifications, and submission details for Chrome Web Store, Firefox Add-ons (AMO), and Opera Addons.

---

## General Information

- **Extension Name**: GNB Twipper - Twitch Stream Hopper
- **Version**: 0.1.0
- **Category**: Productivity / Social & Communication / Entertainment
- **Default Language**: English (`en`)
- **Supported Locales**: English (`en`), Japanese (`ja`)
- **Homepage / Repository**: `https://github.com/GennoBou/gnb-twipper`

---

## 1. Chrome Web Store Listing

### Summary / Short Description (Up to 132 characters)
Twitch minimalist viewer extension with custom CSS/JS injection and smart channel auto-rotation.

### Detailed Description
**GNB Twipper** is a powerful Chrome Extension designed to optimize your Twitch stream viewing experience with automated rotation and minimalist UI enhancements.

#### Key Features:
- 🔄 **Smart Auto-Rotation Mode**: Automatically hop through active live streams you follow based on a smart queue system and watch-time thresholds.
- 🚫 **Rotation Exclusions**: Easily exclude specific channels (e.g. music channels, 24/7 streams) from auto-rotation.
- 🎨 **Custom CSS/JS & HTML Injection**: Personalize Twitch interface styling or embed DOM elements tailored to your desktop viewing setup.
- ⚡ **Minimalist & Lightweight**: Fast execution built with Svelte 5 and Manifest V3.
- 🌐 **Multi-language Support**: Full support for English and Japanese.

---

## 2. Firefox Add-ons (AMO) Listing

### Summary (Up to 250 characters)
A Twitch stream viewer extension featuring smart channel auto-hopping, custom UI injection, and exclusion rules.

### Detailed Description
(Same as Chrome Web Store detailed description above)

---

## 3. Opera Addons Listing

### Short Summary
Minimalist Twitch stream viewer with channel auto-rotation and custom injection support.

### Detailed Description
(Same as Chrome Web Store detailed description above)

---

## Required Permissions Justification

When submitting to store reviewers, provide the following justifications for permissions used in `manifest.json`:

| Permission | Justification / Purpose |
| :--- | :--- |
| `storage` | Save user preferences, rotation interval settings, custom injected CSS/JS, and excluded channel lists locally. |
| `alarms` | Manage precise timers for channel rotation without degrading CPU efficiency. |
| `scripting` | Inject custom CSS/JS scripts specified by the user into twitch.tv pages. |
| `activeTab` | Access the active Twitch tab to perform navigation during auto-rotation. |
| `cookies` | Maintain session state and seamless streaming experience across tab switches. |
| `tabs` | Handle Twitch player and chat window navigation for automated hopping. |
| Host: `https://www.twitch.tv/*`, `https://gql.twitch.tv/*` | Interact with Twitch Web UI and Twitch API/GQL to retrieve follow lists and stream status. |
