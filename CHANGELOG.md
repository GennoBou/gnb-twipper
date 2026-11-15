# Changelog

All notable changes to **GNB Twipper for Twitch** will be documented in this file.

---

## [1.0.1] - 2026-11-15

### 日本語 (Japanese)

#### ✨ 改善・新機能
- **マルチタブ制御（プライマリタブ機能）**: 複数の Twitch タブを開いている際、オート巡回を単一のプライマリタブにロックし、他タブからの誤スキップや干渉を防止しました。他タブでは「GNB [他タブでAuto中] ▾」と表示され、メニュー内の「このタブに操作を切り替える」ボタンから操作対象を切り替えられます。また、プライマリタブを閉じるか Twitch 外へ遷移した場合はオート巡回を安全に停止します。
- **UI 表記の統一**: 拡張機能マニフェスト、ポップアップ、設定画面、操作バー、および全7言語のロケールファイルにおける名称表記を `GNB Twipper` に統一しました。
- **ストア対応・自動化基盤の刷新**:
  - `README.md` / `README_ja.md` に公開済みの Chrome ウェブストア、Microsoft Edge Add-ons、および Firefox Add-ons (AMO) の公式リンクを掲載しました。
  - GitHub Actions リリースワークフローを `iorate/wepub` へ移行し、Chrome Web Store (API v2)、Firefox Add-ons (API v5)、および Microsoft Edge Add-ons (API v1.1) への自動公開に対応しました。
  - ビルドスクリプト (`scripts/package-zip.js`) で Firefox (AMO) 審査提出用のソースコードアーカイブ (`source-code-vX.X.X.zip`) も自動生成するよう拡張しました。

#### 🐛 不具合修正
- チャンネル切り替え処理 (`rotateToNextChannel`) の再入による二重スキップ、および非アクティブ状態でのタイマー起動を防止しました。
- 巡回間隔 (`rotationTimeMinutes`) の正規化処理を追加し、不正な設定値による1秒間隔の無限リロードループを防止しました。
- Twitch 未ログイン状態（`auth-token` Cookie 不在またはログインボタン検出時）における不要な GQL 通信・DOM スクレイピングを抑制しました。
- 左サイドバーの除外対象に「視聴者が視聴 (`Also Watch`)」セクションを追加し、フォロー中以外のチャンネルが巡回対象へ混入する問題を修正しました。
- `chrome.userScripts` API 未対応環境でのプロパティアクセスを保護し、ステータス応答型を整合させました。

#### 🔒 セキュリティ・パフォーマンス
- Twitch ドメイン判定の厳格化およびチャンネル遷移時の URL / チャンネル名サニタイズを強化しました。
- カスタム CSS 機能にサニタイズ処理を追加し、`</style>` タグ脱出、`@import`、外部 `url()`、`expression()` / `javascript:` 構文を遮断・無害化しました。
- カスタム JS の実行環境を `MAIN` ワールドから分離された `USER_SCRIPT` ワールドへ変更しました。
- 配信者検索への `Map` キャッシュ導入や DOM セレクタ統合により、バックグラウンド処理およびスクレイピングの負荷を最適化しました。

### English

#### ✨ Improvements
- **Multi-Tab Control (Primary Tab Locking)**: When multiple Twitch tabs are open, active auto-rotation is now locked to a single primary tab to prevent interference or unintended skips from other tabs. Inactive tabs show a `GNB [Auto in other tab] ▾` indicator with a one-click **"Switch control to this tab"** action. Closing the primary tab or navigating away from Twitch safely stops auto-rotation.
- **UI Branding Consistency**: Unified the extension display name to `GNB Twipper` across the manifest, popup, options page, header trigger, and all 7 locale files.
- **Store Listings & Release Automation**:
  - Added official Chrome Web Store, Microsoft Edge Add-ons, and Firefox Add-ons (AMO) installation links to `README.md` and `README_ja.md`.
  - Migrated the GitHub Actions release workflow to `iorate/wepub`, adding support for Chrome Web Store (API v2), Firefox Add-ons (API v5), and Microsoft Edge Add-ons (API v1.1).
  - Extended `scripts/package-zip.js` to also generate `source-code-vX.X.X.zip` for Firefox (AMO) review submissions.

#### 🐛 Bug Fixes
- Prevented re-entrant double-skips in `rotateToNextChannel` and unintended timer starts while auto mode is inactive.
- Normalized `rotationTimeMinutes` values to prevent a 1-second infinite reload loop on invalid timer configurations.
- Skipped GQL requests and DOM scraping when logged out (missing `auth-token` cookie or detected login button).
- Excluded the "Viewers Also Watch" sidebar section from DOM scraping so unfollowed recommendations are not mixed into rotation targets.
- Guarded `chrome.userScripts` property access and aligned status response types on unsupported environments.

#### 🔒 Security & Performance
- Enforced strict `twitch.tv` domain checks and strengthened channel name sanitization before tab navigation.
- Added `sanitizeCustomCss` to strip `</style>` breakouts, `@import` rules, external `url()` references, and `expression()` / `javascript:` patterns.
- Isolated custom user script execution from `MAIN` world to `USER_SCRIPT` world.
- Reduced background and DOM scraping overhead via `Map`-based streamer lookups and consolidated DOM selectors.

---

## [1.0.0] - 2026-10-09

### 日本語 (Japanese)
- **初回正式リリース**: Chrome ウェブストアおよび Firefox Add-ons (AMO) 向けに公開。
- **自動巡回・スマート待機**: GQL / DOM ハイブリッド取得によるライブ配信者一覧取得、累積視聴時間に基づく均等ローテーション、1人以下の自動待機モード。
- **快適視聴機能**: サブスクライバー限定配信の自動スキップ（無料プレビュー継続視聴対応）、除外チャンネル管理、`location.replace` による履歴非汚染遷移。
- **統合 UI & 多言語対応**: Twitch ヘッダー統合操作バー、ツールバーポップアップ、詳細設定画面、7言語対応（日本語・英語・スペイン語・ポルトガル語・ドイツ語・フランス語・繁体字中国語）、カスタム CSS / JS インジェクション。

### English
- **Initial Official Release**: Published for Chrome Web Store and Firefox Add-ons (AMO).
- **Auto-Rotation & Smart Standby**: Hybrid GQL / DOM live channel fetching, fair rotation prioritized by least watch time, and automatic standby when 1 or 0 streamers are live.
- **Viewing Experience**: Automatic skipping of unsubscribed sub-only streams (with optional free-preview watching), channel exclusion list, and history-clean `location.replace` navigation.
- **Integrated UI & Localization**: Embedded Twitch header control bar, toolbar popup, options page, 7 supported languages, and optional Custom CSS / JS injection.
