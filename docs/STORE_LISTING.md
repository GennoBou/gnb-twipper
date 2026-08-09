[日本語版 (Japanese)](./STORE_LISTING_ja.md)

# Store Listing Specifications & Descriptions

This document contains the official metadata, short descriptions, detailed descriptions, privacy justifications, and submission details for Chrome Web Store, Firefox Add-ons (AMO), and Opera Addons.

---

## General Information

- **Extension Name**: `GNB Twipper for Twitch`
- **Version**: `0.1.0`
- **Primary Category**: Social & Communication (ソーシャル ネットワーク)
- **Secondary Category**: Entertainment
- **Default Language**: English (`en`)
- **Supported Locales**: English (`en`), Japanese (`ja`)
- **Homepage / Repository**: `https://github.com/GennoBou/gnb-twipper`

---

## 1. Chrome Web Store Listing

### App Title / Name (Up to 45 characters)
`GNB Twipper for Twitch`

### Summary / Short Description (Up to 132 characters)
`Automated stream rotation viewer for Twitch followed channels.`

### Detailed Description (Overview text in Web Store)
**GNB Twipper for Twitch** is a minimalist browser extension designed to help you efficiently watch and rotate through live streams of your followed Twitch channels.

#### Key Features:
- 🔄 **Smart Channel Auto-Rotation**: Automatically switches between your live followed channels based on a smart queue and target watch time.
- 🚫 **Channel Exclusions**: Easily exclude specific channels (e.g. 24/7 streams or music channels) from auto-rotation.
- ⚡ **Minimalist & Lightweight UI**: Seamlessly integrated top navigation bar with quick controls (AUTO Start/Stop, Skip, Channel List).
- 🌐 **Multi-language Support**: Built-in support for English and Japanese environments.

---
*Advanced Customization Note*: Supports optional custom styling and script adjustments for tailored viewing setups.

---

## 2. Firefox Add-ons (AMO) Listing

### Summary (Up to 250 characters)
`Automated stream rotation viewer for Twitch followed channels.`

### Detailed Description
(Same as Chrome Web Store detailed description above)

---

## 3. Opera Addons Listing

### Short Summary
`Automated stream rotation viewer for Twitch followed channels.`

### Detailed Description
(Same as Chrome Web Store detailed description above)

---

## 🔒 Publishing Scope (Limited / Unlisted Publication)

To publish as a **Limited / Unlisted (限定公開)** extension:
1. In Chrome Developer Dashboard, navigate to **Distribution -> Visibility**.
2. Select **Unlisted**.
3. Only users with the direct store link will be able to view and install the extension; it will not appear in public search results.

---

## Required Permissions Justification

When submitting to store reviewers, provide the following justifications for permissions used in `manifest.json`:

| Permission | Justification / Purpose |
| :--- | :--- |
| `storage` | Save user preferences, rotation interval settings, and channel exclusion lists locally. |
| `alarms` | Manage precise timers for channel rotation without degrading CPU efficiency. |
| `scripting` | Apply user-configured layout display tweaks onto twitch.tv pages. |
| `cookies` | Maintain session state and seamless streaming experience across tab switches. |
| `tabs` | Handle Twitch player and chat window navigation for automated hopping. |
| Host: `https://www.twitch.tv/*`, `https://gql.twitch.tv/*` | Interact with Twitch Web UI and Twitch GQL API to retrieve follow lists and stream status. |
