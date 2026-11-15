[日本語版 (Japanese)](./DEPLOYMENT_GUIDE_ja.md)

# Automated Release & Store Publishing Guide

This guide explains how to automate publishing **GNB Twipper** to **Chrome Web Store (API v2)**, **Firefox Add-ons (AMO API v5)**, and **Microsoft Edge Add-ons (API v1.1)** using [`iorate/wepub`](https://github.com/iorate/wepub) and GitHub Actions, as well as how to run updates locally.

> [!NOTE]
> **Initial submission** (creating the store listing and submitting the first version for review) must still be performed manually via each store's developer dashboard. `wepub` automates uploading and publishing updates for already-registered extensions.

---

## 🚀 How Release Automation Works

1. **Create GitHub Release (on tag push)**:
   When you push a Git tag starting with `v` (e.g., `v1.0.1`), `.github/workflows/release.yml` runs type checking (`npm run check`), builds the extension (`npm run build`), packages three ZIP archives (`node scripts/package-zip.js`), and publishes a **GitHub Release** (store publishing steps stay skipped on tag push to prevent unintended partial submissions):
   - `chrome-extension-vX.X.X.zip` (for Chrome / Edge)
   - `firefox-extension-vX.X.X.zip` (for Firefox)
   - `source-code-vX.X.X.zip` (clean Git `HEAD` source archive for Firefox AMO review)
2. **Publish to Each Store Individually (`workflow_dispatch`)**:
   From **Actions -> Release & Store Auto-Publish -> Run workflow** (or via `gh workflow run`), select `target_store` to publish one store at a time safely (or `all` to publish all three):
   - `chrome` — **Chrome Web Store** (`wepub chrome`)
   - `firefox` — **Firefox Add-ons (AMO)** (`wepub firefox --channel listed --source source-code-vX.X.X.zip`)
   - `edge` — **Microsoft Edge Add-ons** (`wepub edge`)

```powershell
# Example: Trigger per-store publishing via GitHub CLI
gh workflow run release.yml -f target_store=chrome
gh workflow run release.yml -f target_store=firefox
gh workflow run release.yml -f target_store=edge
```

---

## 🔑 Required GitHub Secrets Setup

Configure the following Secrets in your GitHub repository under **Settings -> Secrets and variables -> Actions**. Any store without configured credentials will be safely skipped without failing the workflow.

### 1. Chrome Web Store (API v2)

Chrome Web Store API v2 requires your **Publisher ID (UUID)** from the Developer Dashboard in addition to the Item ID.

| Secret Name | Required | Default / Legacy Fallback | How to Obtain |
| :--- | :---: | :--- | :--- |
| `WEPUB_CHROME_PUBLISHER_ID` | ✅ | `CHROME_PUBLISHER_ID` | Publisher ID (UUID) shown in the Chrome Developer Dashboard URL or account settings. |
| `WEPUB_CHROME_ITEM_ID` | Optional | `CHROME_EXTENSION_ID` / `hdnejkdhkppofpinlnloidcollpcjdfl` | 32-character extension ID. Defaults to this repository's published extension ID. |
| `WEPUB_CHROME_CLIENT_ID` | ✅ | `CHROME_CLIENT_ID` | OAuth2 Client ID created in Google Cloud Console with the Chrome Web Store API enabled. |
| `WEPUB_CHROME_CLIENT_SECRET` | ✅ | `CHROME_CLIENT_SECRET` | OAuth2 Client Secret paired with the Client ID above. |
| `WEPUB_CHROME_REFRESH_TOKEN` | ✅ | `CHROME_REFRESH_TOKEN` | OAuth2 Refresh Token authorized with the `https://www.googleapis.com/auth/chromewebstore` scope. |

### 2. Firefox Add-ons (AMO API v5)

| Secret Name | Required | Default / Legacy Fallback | How to Obtain |
| :--- | :---: | :--- | :--- |
| `WEPUB_FIREFOX_ADDON_ID` | Optional | `gnb-twipper@gennobou.com` | Gecko add-on ID configured in `build-firefox.js`. Set only if overriding. |
| `WEPUB_FIREFOX_API_KEY` | ✅ | `WEB_EXT_API_KEY` | JWT Issuer generated in Firefox Add-on Developer Hub -> **Manage API Keys**. |
| `WEPUB_FIREFOX_API_SECRET` | ✅ | `WEB_EXT_API_SECRET` | JWT Secret issued alongside the API Key above. |

### 3. Microsoft Edge Add-ons (API v1.1)

Developer registration on Microsoft Partner Center is **free**. After submitting the first version (`chrome-extension-vX.X.X.zip`) manually through the Partner Center web UI, generate Publish API credentials from the dashboard:

| Secret Name | Required | How to Obtain |
| :--- | :---: | :--- |
| `WEPUB_EDGE_PRODUCT_ID` | ✅ | Product ID (GUID) assigned to your extension in Microsoft Partner Center. |
| `WEPUB_EDGE_CLIENT_ID` | ✅ | Client ID generated under Partner Center -> **Publish API**. |
| `WEPUB_EDGE_API_KEY` | ✅ | API Key generated under Partner Center -> **Publish API**. |

---

## 💻 Running `wepub` Locally (with `.env`)

Since `@iorate/wepub` is included in `devDependencies`, you can also trigger store submissions manually from your local machine.

1. Create a `.env` file at the repository root (already listed in `.gitignore`):

```env
# Chrome Web Store
WEPUB_CHROME_PUBLISHER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
WEPUB_CHROME_ITEM_ID=hdnejkdhkppofpinlnloidcollpcjdfl
WEPUB_CHROME_CLIENT_ID=...
WEPUB_CHROME_CLIENT_SECRET=...
WEPUB_CHROME_REFRESH_TOKEN=...

# Firefox Add-ons
WEPUB_FIREFOX_ADDON_ID=gnb-twipper@gennobou.com
WEPUB_FIREFOX_API_KEY=...
WEPUB_FIREFOX_API_SECRET=...

# Microsoft Edge Add-ons
WEPUB_EDGE_PRODUCT_ID=...
WEPUB_EDGE_CLIENT_ID=...
WEPUB_EDGE_API_KEY=...
```

> [!CAUTION]
> Never commit `.env` files or expose API keys, secrets, or refresh tokens in source control.

2. Build the packages and upload with `npx wepub`:

```powershell
npm run build-zip
npx wepub chrome .\chrome-extension-v1.0.1.zip
npx wepub firefox --channel listed --source .\source-code-v1.0.1.zip .\firefox-extension-v1.0.1.zip
npx wepub edge .\chrome-extension-v1.0.1.zip
```

---

## 📦 Triggering a Release

```powershell
# 1. Update version in package.json, src/manifest.json, and CHANGELOG.md (e.g., 1.0.0 -> 1.0.1)
# 2. Commit your changes
git add .
git commit -m "release: v1.0.1"

# 3. Verify ZIP packaging locally (optional)
npm run build-zip

# 4. Create and push the release tag
git tag v1.0.1
git push origin main v1.0.1
```
