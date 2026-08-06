[Japanese Edition](./README_ja.md)

# gnb-twview

A minimalist Twitch viewer & auto-rotation Chrome Extension (Manifest V3).

## Overview

`gnb-twview` is a lightweight Chrome extension designed for efficient Twitch watching. It seamlessly integrates into your regular browser session without security restrictions or bot detection issues.

### Key Features
- **Auto Mode**: Automatically rotates through live followed channels based on a customizable timer.
- **Skip Button**: Instantly switch to the next live channel in the queue.
- **Embedded UI**: Injects a clean top navigation bar onto Twitch.tv (Auto toggle, timer progress, channel selector).
- **Custom Injections (CSS/JS)**: Inject custom CSS styles and JavaScript logic directly onto Twitch pages.
- **Multi-language**: Supports English and Japanese.

## Tech Stack
- **Extension Standard**: Manifest V3
- **Build Tool**: Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **Frontend**: Svelte v5 + TypeScript

## Installation

1. Clone the repository, install dependencies, and build:
   ```bash
   npm install
   npm run build
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right.
4. Click **Load unpacked** and select the generated `dist/` folder.
5. Open [Twitch](https://www.twitch.tv) to use the extension navigation bar.

## Legacy Version
- The previous desktop version built with Wails 3 (WebView2) is archived under the `legacy-wails3` Git branch.
