[Japanese Edition](./README_ja.md)

# gnb-twipper (v0.1.0)

A minimalist Twitch auto-rotation Chrome Extension (Manifest V3 + Svelte 5).

## Overview

`gnb-twipper` is a Chrome Extension designed for efficient Twitch channel rotation and watching. Leveraging your existing logged-in browser session, it operates securely without triggering Twitch Integrity protection, using a hybrid GQL API + DOM fallback architecture for maximum reliability.

### Key Features

- **Auto Rotation Mode**: Automatically rotates through followed live channels based on a customizable interval (default 3 minutes).
- **Hybrid GQL API & DOM Scrape Architecture**:
  - Fetches followed live streams directly via Service Worker using Twitch GQL API.
  - Automatically falls back to Content Script DOM scraping when API limits or unauthenticated states occur.
- **Twitch Header Embedded UI (`GnbNavTrigger`)**:
  - Seamlessly injected into the Twitch top search bar.
  - Features an accordion followed streamer list, timer badge, AUTO Start/Stop, Skip button, and quick settings access.
- **Auto Start on Launch (`autoStartOnLogin`)**:
  - Option to automatically begin channel rotation as soon as Twitch or Chrome is launched.
- **Custom Injections (CSS/JS)**:
  - Inject custom CSS styles and JavaScript logic onto Twitch pages, managed via an animated code editor in Options.
- **CDP Remote Debugging Ready**:
  - Fully compatible with Chrome DevTools Protocol (CDP) & MCP `chrome-devtools` for live browser debugging.

## Tech Stack

- **Extension Standard**: Manifest V3
- **Build Tool**: Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **Frontend**: Svelte 5 (Runes / `$state` / `$effect`) + TypeScript
- **Icons**: [@lucide/svelte](https://lucide.dev/)

## Installation

1. Install dependencies and build:

   ```bash
   npm install
   npm run build
   ```

2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the generated `dist/` directory.
5. Open [Twitch](https://www.twitch.tv) to see the injected `GNB` control button.

## Documentation & Store Publishing

- 🌐 [Store Listing Specifications](./docs/STORE_LISTING.md) ([日本語版](./docs/STORE_LISTING_ja.md))
- 🔒 [Privacy Policy](./docs/PRIVACY_POLICY.md) ([日本語版](./docs/PRIVACY_POLICY_ja.md))
- 🚀 [Automated Release & Store Publishing Guide](./docs/DEPLOYMENT_GUIDE.md) ([日本語版](./docs/DEPLOYMENT_GUIDE_ja.md))

## Legacy Version

- The previous desktop app version built with Wails 3 (Go + WebView2) is archived under the `legacy-wails3` Git branch and documented in `/docs/local`.

