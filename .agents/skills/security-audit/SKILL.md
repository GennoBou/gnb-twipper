---
name: security-audit
description: gnb-twipper 拡張機能向けの定期セキュリティ・脆弱性監査を実行するスキル。依存パッケージ（npm audit / outdated）、型・テスト確認、拡張機能特有のセキュリティ観点（manifest権限、XSS、メッセージ送信元検証、CSSサニタイズ、CI/CDワークフロー）を一貫した手順で点検しレポートする。
---

# Security Audit Skill (`gnb-twipper`)

このスキルは、`gnb-twipper` の週次・リリース前のセキュリティ監査を再現性高く実施するための手順を定義します。
ローカルの Antigravity App（`/automation` による週次実行）および Remote Agent の両方から利用できます。

## 前提ルール
- **デフォルトは読み取り専用の監査**とし、ユーザーから明示的な修正指示がない限り `main` ブランチの変更・コミット・Push を行わない。
- 作業ツリー（`git status`）に未コミット変更がある場合は、変更を壊さず現状に対して検査のみ行う。
- 実行環境（Windows PowerShell / Linux bash）に合わせて適切なコマンドを実行する。

## 監査手順

### 1. 依存パッケージとサプライチェーン検査
1. `npm audit --package-lock-only`（または `npm audit`）を実行し、Critical / High / Moderate / Low の件数を確認する。
2. `npm outdated` を実行し、特に配布物に同梱されるパッケージ（`svelte`, `@lucide/svelte`, `acorn`, `@crxjs/vite-plugin`）の更新有無を確認する。
3. ファントム依存や未固定実行がないか確認する：
   - `src/` から直接 `import` されている外部パッケージが `package.json` に明記されているか。
   - `scripts/` 内に `--no-install` なしの `npx <pkg>` が混入していないか。

### 2. 静的チェック & テスト実行
1. `npm run check`（`svelte-check`）を実行し、型エラーがないことを確認する。
2. `npm test`（Vitest）を実行し、セキュリティ関連テスト（`ui-injector.test.ts`, `messages.test.ts`, `url.test.ts`, `auth.test.ts` 等）を含め全件パスすることを確認する。

### 3. 拡張機能コードのセキュリティ点検
以下を重点的に確認する：
1. **XSS・危険なシンク**：`src/` 内に `{@html`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`, `postMessage` が追加されていないか。
2. **マニフェスト & 権限最小化**：`src/manifest.json` および `scripts/build-firefox.js` に不要な `permissions` / `host_permissions` / `web_accessible_resources` が増えていないか。
3. **特権メッセージの送信元検証**：`src/background/background.ts` の `SAVE_SETTINGS` 等で `isAuthorizedSettingsSender` の検証が維持されているか。
4. **カスタム CSS / JS の安全性**：
   - `src/content/ui-injector.ts` の `sanitizeCustomCss`（`</style>`, `@import`, 外部 `url()`, コメント/エスケープ難読化）と `styleEl.textContent` 利用。
   - `src/background/userScripts.ts` の `world: 'USER_SCRIPT'` および `matches` スコープ。
5. **認証情報・URL の扱い**：
   - `src/background/auth.ts` / `gql.ts` で Cookie ドメイン検証が維持され、トークン実値がログ出力されていないか。
   - `src/utils/url.ts` の `sanitizeProfileImageUrl` 等で非 HTTPS スキームが遮断されているか。

### 4. CI/CD ワークフロー点検（`.github/workflows/`）
1. 外部 Actions がコミット SHA 固定（＋バージョンコメント）されているか。
2. `run:` 内で `${{ ... }}` をシェルや `node -e` の文字列リテラルへ直接展開していないか（`env:` 経由になっているか）。
3. `permissions:` が必要最小限か。

## 出力フォーマット
最後に以下の構成で簡潔な Markdown レポートを出力する：
1. **サマリー**：問題なし / 要確認（件数・最大重要度）
2. **依存パッケージ監査結果**：`npm audit` 件数・主要アップデート候補
3. **テスト・型チェック結果**：`npm run check` / `npm test` の成否
4. **コード・CI/CD 点検で検出された項目**：ファイルパス・行番号・重要度・推奨対応（0 件なら「検出なし」）
