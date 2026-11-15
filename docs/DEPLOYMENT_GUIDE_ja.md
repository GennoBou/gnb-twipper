[English Edition](./DEPLOYMENT_GUIDE.md)

# 自動リリース・ストア自動公開ガイド (日本語版)

本ガイドでは、[`iorate/wepub`](https://github.com/iorate/wepub) と GitHub Actions を使用して **Chrome Web Store (API v2)**、**Firefox Add-ons (AMO API v5)**、および **Microsoft Edge Add-ons (API v1.1)** へ自動デプロイするための手順と、ローカル環境からの実行方法を解説します。

> [!NOTE]
> 各ストアへの**初回公開（ストアページの新規作成・初期審査提出）はそれぞれの開発者ダッシュボードから手動で行う必要があります**。`wepub` は公開済みアイテムのバージョン更新・再提出を自動化するためのツールです。

---

## 🚀 リリース自動化の仕組み

1. **GitHub Release 作成（タグ push 時）**:
   `v` から始まる Git タグ（例: `v1.0.1`）を作成して push すると、`.github/workflows/release.yml` が実行され、型チェック (`npm run check`)・ビルド (`npm run build`)・3種類の ZIP パッケージ生成 (`node scripts/package-zip.js`) を行い、**GitHub Release** を自動作成します（タグ push 時は誤送信防止のためストア公開ステップは自動実行されません）。
   - `chrome-extension-vX.X.X.zip`（Chrome / Edge 用）
   - `firefox-extension-vX.X.X.zip`（Firefox 用）
   - `source-code-vX.X.X.zip`（Firefox AMO 審査提出用ソースコード）
2. **ストアへの個別公開（`workflow_dispatch` 手動実行）**:
   GitHub リポジトリの **Actions -> Release & Store Auto-Publish -> Run workflow**、または `gh workflow run` から `target_store` を選択して、1 ストアずつ安全にアップロード・公開申請できます（`all` で全ストア一括実行も可能）:
   - `chrome` — **Chrome Web Store** (`wepub chrome`)
   - `firefox` — **Firefox Add-ons (AMO)** (`wepub firefox --channel listed --source source-code-vX.X.X.zip`)
   - `edge` — **Microsoft Edge Add-ons** (`wepub edge`)

```powershell
# 例: GitHub CLI で 1 ストアずつ公開を実行する場合
gh workflow run release.yml -f target_store=chrome
gh workflow run release.yml -f target_store=firefox
gh workflow run release.yml -f target_store=edge
```

---

## 🔑 必要な GitHub Secrets 設定手順

GitHub リポジトリの **Settings -> Secrets and variables -> Actions** に、対象ストアの Secret を登録します（未設定のストアはエラーにならず安全にスキップされます）。

### 1. Chrome Web Store (API v2)

Chrome Web Store API v2 では、`ITEM_ID` に加えてデベロッパーダッシュボードで確認できる **Publisher ID (UUID)** が必須となります。

| Secret 名 | 必須 | デフォルト値 / 互換Secret | 取得方法 |
| :--- | :---: | :--- | :--- |
| `WEPUB_CHROME_PUBLISHER_ID` | ✅ | `CHROME_PUBLISHER_ID` | Chrome Developer Dashboard のURLまたはアカウント設定から確認できる Publisher ID (UUID)。 |
| `WEPUB_CHROME_ITEM_ID` | 任意 | `CHROME_EXTENSION_ID` / `hdnejkdhkppofpinlnloidcollpcjdfl` | 拡張機能ID（32文字）。本リポジトリの公開済みIDがデフォルト指定済み。 |
| `WEPUB_CHROME_CLIENT_ID` | ✅ | `CHROME_CLIENT_ID` | Google Cloud Console で Chrome Web Store API を有効化して作成した OAuth2 クライアントID。 |
| `WEPUB_CHROME_CLIENT_SECRET` | ✅ | `CHROME_CLIENT_SECRET` | 上記 OAuth2 クライアントのシークレット。 |
| `WEPUB_CHROME_REFRESH_TOKEN` | ✅ | `CHROME_REFRESH_TOKEN` | OAuth2 Playground 等で `https://www.googleapis.com/auth/chromewebstore` スコープを認可して発行したリフレッシュトークン。 |

### 2. Firefox Add-ons (AMO API v5)

| Secret 名 | 必須 | デフォルト値 / 互換Secret | 取得方法 |
| :--- | :---: | :--- | :--- |
| `WEPUB_FIREFOX_ADDON_ID` | 任意 | `gnb-twipper@gennobou.com` | `build-firefox.js` で設定済みの Gecko ID。変更する場合のみ指定。 |
| `WEPUB_FIREFOX_API_KEY` | ✅ | `WEB_EXT_API_KEY` | Firefox Add-on Developer Hub -> **APIキーの管理** から取得する JWT Issuer。 |
| `WEPUB_FIREFOX_API_SECRET` | ✅ | `WEB_EXT_API_SECRET` | 上記 API キーと同時に発行される JWT シークレット。 |

### 3. Microsoft Edge Add-ons (API v1.1)

Microsoft Partner Center へのデベロッパー登録は**無料**です。初回のみ Partner Center の Web UI から `chrome-extension-vX.X.X.zip` をアップロードして公開申請し、作成された製品と **Publish API** 画面から以下の資格情報を取得してください。

| Secret 名 | 必須 | 取得方法 |
| :--- | :---: | :--- |
| `WEPUB_EDGE_PRODUCT_ID` | ✅ | Microsoft Partner Center で拡張機能を作成した際に発行される Product ID (GUID)。 |
| `WEPUB_EDGE_CLIENT_ID` | ✅ | Partner Center -> **Publish API** 設定画面で生成した Client ID。 |
| `WEPUB_EDGE_API_KEY` | ✅ | Partner Center -> **Publish API** 設定画面で生成した API Key。 |

---

## 💻 ローカル環境からの手動実行（`.env` 利用）

本リポジトリには `@iorate/wepub` が `devDependencies` として組み込まれているため、ローカル PC からもストア更新テスト・公開を実行できます。

1. プロジェクトルートに `.env` ファイルを作成し、上記 `WEPUB_*` 環境変数を記述します（`.env` は `.gitignore` に登録済みです）。

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
> `.env` ファイルや各 API キー・トークンなどの機密情報は、絶対に Git へコミットしたり公開しないでください。

2. ZIP パッケージをビルドし、`npx wepub` でアップロードします（PowerShell 例）:

```powershell
npm run build-zip
npx wepub chrome .\chrome-extension-v1.0.1.zip
npx wepub firefox --channel listed --source .\source-code-v1.0.1.zip .\firefox-extension-v1.0.1.zip
npx wepub edge .\chrome-extension-v1.0.1.zip
```

---

## 📦 リリースの実行手順 (タグ打出し)

新しいバージョンをリリースする標準手順は以下のとおりです:

```powershell
# 1. package.json と src/manifest.json の version、および CHANGELOG.md を更新 (例: 1.0.0 -> 1.0.1)
# 2. 変更をコミット
git add .
git commit -m "release: v1.0.1"

# 3. ZIP パッケージ生成確認（任意・ローカル確認用）
npm run build-zip

# 4. バージョンタグを作成して push
git tag v1.0.1
git push origin main v1.0.1
```
