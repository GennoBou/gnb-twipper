[English Edition](./DEPLOYMENT_GUIDE.md)

# 自動リリース・ストア自動公開ガイド (日本語版)

本ガイドでは、GitHub Actions を使用して Chrome Web Store、Firefox Add-ons (AMO)、および Opera Addons へ自動デプロイするための GitHub Secrets の設定手順および自動公開の流れを解説します。

---

## 🚀 リリース自動化の仕組み

`v` から始まる Git タグ（例: `v1.0.0`）を作成して push すると、GitHub Actions ワークフローが自動的に発動します:
1. 型チェック (`npm run check`) とプロダクションビルド (`npm run build`) を実行。
2. Chrome/Opera 用 (`chrome-extension-vX.X.X.zip`) および Firefox 用 (`firefox-extension-vX.X.X.zip`) の ZIP パッケージを自動生成。
3. **GitHub Release** を自動生成し、成果物 ZIP ファイルをアタッチ。
4. 各ストアへの自動アップロード:
   - **Chrome Web Store**（設定に応じてドラフト登録または自動公開）。
   - **Firefox Add-ons (AMO)**（自動署名および掲載申請）。

---

## 🔑 必要な GitHub Secrets 設定手順

各ストアへの自動アップロードを有効化するには、GitHub リポジトリの **Settings -> Secrets and variables -> Actions** に以下の Secret を登録します:

### 1. Chrome Web Store API 認証情報

| Secret 名 | 説明 | 取得方法 |
| :--- | :--- | :--- |
| `CHROME_EXTENSION_ID` | Chrome Web Store の拡張機能ID | Chrome Developer Dashboard で最初のドラフトを作成した際の URL 内のID。 |
| `CHROME_CLIENT_ID` | Google OAuth2 クライアントID | Google Cloud Console で Chrome Web Store API を有効化して作成。 |
| `CHROME_CLIENT_SECRET` | Google OAuth2 クライアントシークレット | Google Cloud Console の OAuth2 クライアント詳細画面から取得。 |
| `CHROME_REFRESH_TOKEN` | OAuth2 リフレッシュトークン | Google OAuth2 Playground を使用して Client ID/Secret から発行。 |

### 2. Firefox Add-ons (AMO) 認証情報

| Secret 名 | 説明 | 取得方法 |
| :--- | :--- | :--- |
| `WEB_EXT_API_KEY` | AMO API キー (Issuer) | Firefox Add-on Developer Hub -> APIキーの管理画面から生成。 |
| `WEB_EXT_API_SECRET` | AMO API シークレット | Firefox Add-on Developer Hub で API キーと同時に発行されるシークレット。 |

---

## 📦 リリースの実行方法 (タグ打出し)

新しいバージョンをリリースする手順:

```bash
# 1. package.json および src/manifest.json の version を更新 (例: 0.1.0 -> 1.0.0)
# 2. 変更をコミット
git commit -am "release: v1.0.0"

# 3. バージョンタグを作成して push
git tag v1.0.0
git push origin v1.0.0
```

> [!NOTE]
> 各ストアの API Secret が未設定の場合でも、ワークフローはエラーで失敗することなく、ビルド生成物を **GitHub Release** に安全に保存・添付して完了します（Opera Addons 等への手動アップロード用として使用可能です）。
