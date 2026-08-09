[日本語版 (Japanese)](./DEPLOYMENT_GUIDE_ja.md)

# Automated Release & Store Publishing Guide

This guide explains how to set up GitHub Secrets and automate deployments for Chrome Web Store, Firefox Add-ons (AMO), and Opera Addons using GitHub Actions.

---

## 🚀 How Release Automation Works

When you create and push a Git tag starting with `v` (e.g. `v1.0.0`):
1. GitHub Actions runs type checking (`npm run check`) and builds the extension (`npm run build`).
2. Production ZIP archives are automatically created for Chrome/Opera (`chrome-extension-vX.X.X.zip`) and Firefox (`firefox-extension-vX.X.X.zip`).
3. A new **GitHub Release** is drafted/published automatically with the attached ZIP assets.
4. The extension is automatically uploaded to:
   - **Chrome Web Store** (as Draft or Published depending on configuration).
   - **Firefox Add-ons (AMO)** (signed and published).

---

## 🔑 Required GitHub Secrets Setup

To enable auto-publishing to the web stores, configure the following Secrets in your GitHub Repository under **Settings -> Secrets and variables -> Actions**:

### 1. Chrome Web Store API Credentials

| Secret Name | Description | How to Obtain |
| :--- | :--- | :--- |
| `CHROME_EXTENSION_ID` | Your Chrome Web Store extension ID | Found in the Chrome Developer Dashboard URL after initial manual draft creation. |
| `CHROME_CLIENT_ID` | Google OAuth2 Client ID | Created in Google Cloud Console with Chrome Web Store API enabled. |
| `CHROME_CLIENT_SECRET` | Google OAuth2 Client Secret | Created alongside the OAuth2 Client ID in Google Cloud Console. |
| `CHROME_REFRESH_TOKEN` | OAuth2 Refresh Token | Generated via Google OAuth2 Playground using the Client ID and Secret. |

### 2. Firefox Add-ons (AMO) Credentials

| Secret Name | Description | How to Obtain |
| :--- | :--- | :--- |
| `WEB_EXT_API_KEY` | AMO API Issuer / Key | Generated in Firefox Add-on Developer Hub -> Manage API Keys. |
| `WEB_EXT_API_SECRET` | AMO API Secret | Generated alongside the API Key in Firefox Add-on Developer Hub. |

---

## 📦 How to Trigger a New Release

To trigger a release workflow:

```bash
# 1. Update version in package.json and src/manifest.json (e.g. 0.1.0 -> 1.0.0)
# 2. Commit your changes
git commit -am "release: v1.0.0"

# 3. Create and push tag
git tag v1.0.0
git push origin v1.0.0
```

> [!NOTE]
> If store Secrets are not set up yet, the workflow will still complete successfully by building the ZIP packages and publishing them to **GitHub Releases**, allowing manual uploads to Opera Addons or store developer dashboards.
