[Japanese Edition (日本語)](./README_ja.md)

# GNB Twipper for Twitch

> **A minimalist Chrome extension for auto-rotating and comfortably watching your followed Twitch channels**

---

## 💡 What is GNB Twipper?

`GNB Twipper` is a Google Chrome extension designed to automatically cycle through your followed live streamers on Twitch at customizable intervals.

By utilizing your existing browser login session, there is no need for manual token authentication or re-entering credentials. It operates safely and reliably without violating Twitch Integrity protections.

Perfect for monitoring multiple favorite streamers or keeping streams running as background audio without manual tab switching!

---

## ✨ Key Features

### 🔄 Smart Auto-Rotation & Standby
- **Automatic Channel Cycling**: Automatically jumps to the next live channel in your follow list at set intervals (e.g. every 3 minutes).
- **Smart Standby**:
  - If only **1 channel** is live, rotation automatically pauses to keep the stream playing without interruptions ("Standby (Single live)").
  - When 2 or more channels are live, auto-rotation resumes automatically.
  - If **0 channels** are live, it enters standby mode ("Standby (No live)").

### 🚫 Subscriber-Only Stream Auto-Skip
- Automatically detects and skips unsubscribed "Subscriber-Only" streams.
- **Free Preview Support**: Option to enjoy the free preview period and automatically skip to the next streamer the moment the preview ends and the stream is locked.

### ⛔ Rotation Exclusion Management
- Register channels you want to skip (e.g. 24/7 continuous broadcasts, official music bots) into the exclusion list.

### 🖥️ Twitch-Integrated Control Bar (`GnbNavTrigger`)
- Seamlessly embedded right next to the Twitch search bar:
  - **[AUTO Start / Stop]**: Toggle auto-rotation with a single click.
  - **[Skip]**: Immediately jump to the next streamer.
  - **Timer & Status Badges**: View remaining time and standby status at a glance.
  - **Accordion Streamer List**: Inspect live streamers and their watch progress directly from the header.

### 🚀 Auto Start on Launch (`autoStartOnLogin`)
- Automatically begins channel rotation when Twitch or Chrome is launched.

### 🎨 Custom CSS & JS Injections (Advanced)
- Dynamically inject custom CSS styling and JavaScript scripts into Twitch pages.
- Configured directly from the Options page with built-in syntax checks.
- ⚠️ **Note on JavaScript Execution**: Due to browser security restrictions (Manifest V3 `userScripts` API), running custom JavaScript requires enabling **"Allow user scripts"** in this extension's **Details** page via `chrome://extensions` or `opera://extensions`.

---

## 📥 Installation

### Chrome Web Store (Coming Soon)
One-click install directly from the official store once published.

### Manual Installation from ZIP
1. Download the latest `chrome-extension-vX.X.X.zip` from [GitHub Releases](../../releases).
2. Extract the ZIP archive to a folder of your choice.
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** in the top-right corner.
5. Click **Load unpacked** in the top-left corner and select the extracted folder (or the `dist` folder inside).
6. Open [Twitch](https://www.twitch.tv) and you will see the GNB Twipper control button on the top header!

---

## 🚀 Quick Start Guide

1. **Open Twitch**: Navigate to [Twitch](https://www.twitch.tv) on Chrome with your regular logged-in account.
2. **Start Rotating**:
   - Click the **`[AUTO]`** button next to the search bar (or in the extension popup) to start rotation.
   - The countdown timer will start, cycling through your followed live streamers.
3. **Control Rotation**:
   - Click **`[Skip]`** to jump to the next stream immediately.
   - Click **`[AUTO (Stop)]`** to pause rotation and stay on the current stream.

---

## ⚙️ Configuration

Open settings by clicking "Options" in the extension popup or the settings gear icon in the header bar:

| Option | Description | Default |
| :--- | :--- | :--- |
| **Rotation Interval** | Time spent on each streamer during normal rotation | 3 min |
| **Initial Target Watch Time** | Minimum time to watch each streamer (to maintain streaks, etc.) | 6 min |
| **Auto Start on Launch** | Automatically begin rotation when Twitch/browser opens | OFF |
| **Skip Sub-Only Streams** | Automatically skip unsubscribed subscriber-only streams | ON |
| **Allow Free Preview** | Stay on sub-only streams during the free preview period | ON |
| **Excluded Channels** | List of usernames/URLs excluded from rotation queue | None |
| **Custom CSS / JS** | User-defined custom styles and scripts for Twitch pages | Disabled |
| **Display Language** | UI language (Japanese / English) | Browser default |

---

## ❓ FAQ

### Q. Do I need to enter my Twitch username or password?
**A.** No! GNB Twipper uses your active browser session directly. Your credentials or passwords are never stored, transmitted, or requested.

### Q. Is there any risk of account bans or penalties?
**A.** No. The extension simply automates browser navigation and interacts with Twitch through standard browser requests, respecting Twitch Integrity protections.

### Q. Rotation stopped by itself. Why?
**A.** If only one followed channel is currently broadcasting live, the extension automatically pauses rotation and enters "Standby (Single live)" to prevent unnecessary page reloads. Rotation will resume once another streamer goes live.

---

## 📄 Documentation & Policies

- 🔒 [Privacy Policy](./docs/PRIVACY_POLICY.md) ([日本語版](./docs/PRIVACY_POLICY_ja.md))
- 🌐 [Store Listing Specifications](./docs/STORE_LISTING.md) ([日本語版](./docs/STORE_LISTING_ja.md))

---

## 🛠️ Developer & AI Agent Resources

For building from source, architecture design, and contribution guidelines:
- **Developer Guide**: [docs/DEVELOPMENT_ja.md](./docs/DEVELOPMENT_ja.md) (Build, test, debug setup)
- **Architecture Design**: [docs/ARCHITECTURE_ja.md](./docs/ARCHITECTURE_ja.md) (Hybrid GQL/DOM, state machines)
- **AI & Developer Master Guide**: [AGENT.md](./AGENT.md) (Repository design principles & components)
- **Deployment Guide**: [docs/DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md) ([日本語版](./docs/DEPLOYMENT_GUIDE_ja.md))
