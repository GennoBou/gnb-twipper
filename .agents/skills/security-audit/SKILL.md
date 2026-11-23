---
name: security-audit
description: gnb-twipper 拡張機能向けの定期セキュリティ・脆弱性監査を実行するスキル。依存パッケージ（npm audit / outdated）、型・テスト確認、拡張機能特有のセキュリティ観点（manifest権限、XSS、メッセージ送信元検証、CSSサニタイズ、CI/CDワークフロー）、および Dependabot PR のトリアージ（緊急リリース要否判定・一時 worktree 検証・マージ／クローズ）を一貫した手順で点検しレポートする。
---

# Security Audit Skill (`gnb-twipper`)

このスキルは、`gnb-twipper` の週次・リリース前のセキュリティ監査と Dependabot PR の自動トリアージを再現性高く実施するための手順を定義します。
ローカルの Antigravity App（`/automation` による週次実行）および Remote Agent の両方から利用できます。

## 前提ルール
- **ローカル `main` ブランチは読み取り専用**とし、ユーザーから明示的な修正指示がない限りローカル作業ツリーの変更・コミット・Push を行わない。
- 作業ツリー（`git status`）に未コミット変更がある場合は、変更を壊さず現状に対して検査のみ行う。
- **Dependabot PR 限定の操作許可**：GitHub 上のオープン PR のうち、`author.login` が `"app/dependabot"`（または `"dependabot[bot]"`）であり、かつ `headRefName` が `dependabot/` で始まり、`isDraft` が `false` の PR に限り、一時 worktree（`.temp/pr-audit-<number>`）での隔離検証と、本スキルの判定基準に沿ったマージ／クローズを実行してよい。人間が作成した PR には一切触れない。
- **バージョン番号変更・タグ作成・ストア公開は絶対に自動化しない**。配布物に影響するセキュリティ修正を取り込んだ場合は、レポート冒頭で「早急なバージョンアップおよびストア向けセキュリティリリースが必要」である旨を警告する。
- 実行環境（Windows PowerShell / Linux bash）に合わせて適切なコマンドを実行する（Windows PowerShell では `&&` や Linux コマンドエイリアスを使用しない）。

## 監査手順

### 1. 依存パッケージとサプライチェーン検査
1. `npm audit --package-lock-only`（または `npm audit`）を実行し、Critical / High / Moderate / Low の件数を確認する。
2. `npm outdated` を実行し、特に配布物に同梱されるパッケージ（`svelte`, `@lucide/svelte`, `acorn`, `@crxjs/vite-plugin`）の更新有無を確認する。
3. ファントム依存や未固定実行がないか確認する：
   - `src/` から直接 `import` されている外部パッケージが `package.json` に明記されているか。
   - `scripts/` 内に `--no-install` なしの `npx <pkg>` が混入していないか。

### 2. 静的チェック & テスト実行
1. `npm run check`（`svelte-check`）を実行し、型エラーがないことを確認する。
2. `npm test`（Vitest）を実行し、セキュリティ関連テスト（`security-guardrails.test.ts`, `ui-injector.test.ts`, `messages.test.ts`, `url.test.ts`, `auth.test.ts`, `userScripts.test.ts` 等）を含め全件パスすることを確認する。

### 3. 拡張機能コードのセキュリティ点検
以下を重点的に確認する：
1. **XSS・危険なシンク**：`src/`（テスト除く）内に `{@html`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`, `postMessage` が追加されていないか。
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

### 5. Dependabot PR トリアージ・隔離検証・対応（Dependabot 限定）
GitHub 上のオープン PR と Dependabot Security Alerts を確認し、**緊急セキュリティリリース要否**を判定のうえ安全な範囲で自動対応する。

#### 5.1 対象 PR とアラートの取得
1. `gh pr list --state open --json number,title,author,headRefName,baseRefName,labels,mergeable,isDraft,url` を実行し、`author.login` が `"app/dependabot"`（または `"dependabot[bot]"`）かつ `headRefName` が `dependabot/` で始まり、かつ `isDraft == false` のオープン PR のみを抽出する。
2. `gh api "repos/GennoBou/gnb-twipper/dependabot/alerts?state=open"`（GET 読み取り専用）を実行し、現在オープン中の Dependabot Security Alerts を取得する。
3. 各対象 PR について `gh pr view <num> --json title,body,files,labels` および `gh pr diff <num>` で変更内容を確認し、以下の 3 軸を判定する：
   - **影響レイヤー**：
     - **配布物同梱**：`svelte`, `@lucide/svelte`, `acorn`, `@crxjs/vite-plugin` 等の拡張機能バンドル対象、および判定不能な依存
     - **開発・テスト・ビルド・CI 専用**：`vitest`, `happy-dom`, `typescript`, `svelte-check`, `@sveltejs/vite-plugin-svelte`, `vite`, `sharp`, `web-ext`, `@iorate/wepub`, `@types/*`, `.github/workflows/*`
   - **セキュリティ修正有無**：Dependabot Security Alerts 該当、`npm audit` 対象、`security` ラベル、または PR タイトル・本文・リリースノートに CVE / GHSA / 脆弱性修正の記載があるか。
   - **更新種別**：メジャー更新か、マイナー／パッチ／Actions 更新か。

#### 5.2 `origin/main` 比較および一時 worktree での隔離検証
1. `git fetch origin` を実行し、ローカルの未コミット変更ではなく **`origin/main`** と比較して（`git show origin/main:package.json` 等）、すでに同等以上のバージョンへ更新済み・不要となっていないか確認する。
2. 既更新済みでない場合は、`git fetch origin pull/<num>/head` のうえ `git worktree add --detach .temp/pr-audit-<num> FETCH_HEAD` で隔離 worktree を作成する（検証の成否を問わず、終了時は必ず `Set-Location` でリポジトリルートへ戻ったうえで `git worktree remove --force .temp/pr-audit-<num>` を実行し、空の `.temp` ディレクトリも削除する）。
3. メジャー更新を含む場合は、`npm view` 等で関連パッケージ（例：`svelte-check` の `peerDependencies`）との互換性を確認する。
4. 隔離 worktree（`.temp/pr-audit-<num>`）に移動して、以下を順に検証する：
   - `npm ci`（`.github/workflows/` のみの更新でロックファイル変更がない場合は省略可、ただし変更がある場合は必須）
   - `npm run check`
   - `npm test`（`src/security-guardrails.test.ts` 含む全テスト）
   - `npm run build` および `npm run build:firefox`
   - `npm audit --package-lock-only`

#### 5.3 トリアージ判定区分と自動アクション
| 判定区分 | 判定条件 | 実施アクション | ストアリリース要否 |
| :--- | :--- | :--- | :--- |
| **🚨 緊急リリース要** | **配布物同梱**パッケージに対する**セキュリティ修正**かつ非メジャー更新で、隔離検証が全件パス | `gh pr merge <num> --merge --delete-branch` でマージし、レポート最上位で **「早急なバージョンアップ＆ストア向けセキュリティリリース要」** を強く警告する | **要（早急にセキュリティリリース）** |
| **✅ 取り込みのみで OK** | 以下のいずれかで隔離検証が全件パス：<br>・**開発・テスト・ビルド・CI 専用**の更新（セキュリティ修正含む）<br>・**配布物同梱**パッケージの非セキュリティ更新（マイナー／パッチ） | `gh pr merge <num> --merge --delete-branch` でマージし、「すぐさまのリリース不要・次回通常リリースに同梱」と報告する | **不要（コミット・取り込みのみ）** |
| **🗑️ 不要・非互換のためクローズ** | 以下のいずれかに該当：<br>・`origin/main` で既に同等以上へ更新済み・陳腐化<br>・非セキュリティ更新で `peerDependencies` 非互換または隔離検証（`check` / `test` / `build`）に失敗 | 根拠（既更新バージョン、未対応の `peerDependencies`、検証失敗内容など）を日本語でコメントし `gh pr close <num> --comment "..."` でクローズする（将来の互換バージョン再提案を妨げないため `@dependabot ignore` は付けない） | **不要** |
| **⚠️ 要・手動判断（保留）** | 以下のいずれかに該当：<br>・**緊急セキュリティ修正**だが隔離検証に失敗した（緊急）<br>・**配布物同梱**パッケージの**メジャー更新** | マージもクローズも行わず、エラー詳細・影響範囲・推奨対応をレポートで報告する | **手動判断** |

## 出力フォーマット
最後に以下の構成で簡潔な Markdown レポートを出力する：
1. **サマリー**：
   - **ストア緊急リリース要否**（🚨 要・早急なセキュリティリリース / ✅ 不要・取り込みのみで OK）
   - ローカル監査結果（問題なし / 要確認：件数・最大重要度）
   - Dependabot PR 対応件数（マージ / クローズ / 保留）
2. **Dependabot PR トリアージ結果**：PR ごとの表（PR番号 / 対象 / 影響レイヤー / セキュリティ修正 / 判定区分 / 実施アクション / ストアリリース要否）および根拠メモ（該当 PR なしの場合は「オープン中の Dependabot PR なし」）
3. **依存パッケージ監査結果**：`npm audit` 件数・主要アップデート候補
4. **テスト・型チェック結果**：`npm run check` / `npm test` の成否
5. **コード・CI/CD 点検で検出された項目**：ファイルパス・行番号・重要度・推奨対応（0 件なら「検出なし」）
