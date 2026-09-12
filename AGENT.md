# AGENT.md - AI & Developer Guide for GNB Twipper

本ドキュメントは、人間開発者および AI エージェント（Copilot, Serena, Claude, Gemini 等）が `gnb-twipper` コードベースを正しく理解し、安全かつ一貫性のある機能追加・リファクタリング・デバッグを行うための総合ガイドです。

---

## 1. プロジェクト概要

`gnb-twipper` は、Twitch のライブ配信を効率的に巡回・視聴するための Google Chrome 拡張機能 (Manifest V3) です。

- **コア思想**:
  - 外部のヘッドレスブラウザや自動化スクリプトではなく、**ユーザー自身のログイン済みブラウザ環境**をそのまま活用。
  - Twitch のセキュリティ保護（Twitch Integrity）に抵触しないよう、ブラウザセッションの Cookie / GQL API を安全に利用し、必要に応じて DOM スクラップへフォールバックするハイブリッド設計。
  - Twitch 画面に違和感なく溶け込むミニマルな Svelte 5 コンポーネントのインジェクション。

---

## 2. 技術スタック

- **拡張機能仕様**: Chrome Extension Manifest V3
- **ビルドツール**: [Vite](https://vitejs.dev/) + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **UI フレームワーク**: [Svelte 5](https://svelte.dev/) (Runes: `$state`, `$effect`, `$derived`, `$props`)
- **プログラミング言語**: TypeScript
- **アイコン**: [@lucide/svelte](https://lucide.dev/)
- **CSS / スタイル**: Tailwind CSS + `theme.css` / `app.css` (CSS 変数ベース)
- **テスト**: Vitest (`npm run test`), svelte-check (`npm run check`)

---

## 3. ディレクトリ構成と役割

```text
gnb-twipper/
├── README_ja.md              # 利用者向けガイド（日本語）
├── README.md                 # 利用者向けガイド（英語）
├── AGENT.md                  # 本ドキュメント（開発者・AI向け仕様ガイド）
├── docs/                     # 詳細ドキュメント
│   ├── DEVELOPMENT_ja.md     # 環境構築・ビルド・デバッグ手順
│   ├── ARCHITECTURE_ja.md    # 内部アーキテクチャ・データフロー詳細
│   ├── STORE_LISTING_ja.md   # ストア掲載情報
│   ├── PRIVACY_POLICY_ja.md  # プライバシーポリシー
│   └── DEPLOYMENT_GUIDE_ja.md# リリース手順
├── src/
│   ├── manifest.json         # 拡張機能マニフェスト定義
│   ├── background/           # バックグラウンド (Service Worker)
│   │   ├── background.ts     # メッセージング、タイマー、巡回スケジューリング
│   │   └── rotation.ts       # 巡回キュー管理、待機判定、GQL/DOM取得ロジック
│   ├── content/              # コンテンツスクリプト (Twitch 画面側)
│   │   ├── content.ts        # Twitch DOM 監視、UI マウント、DOM スクラップフォールバック
│   │   └── GnbNavTrigger.svelte # ヘッダー検索バー横に注入される Svelte 5 UI
│   ├── popup/                # ツールバーアイコンクリック時のポップアップ UI
│   │   ├── Popup.svelte
│   │   └── index.ts
│   ├── options/              # 詳細設定画面 (Options page)
│   │   ├── Options.svelte    # 設定フォーム、カスタム CSS/JS エディタ
│   │   └── index.ts
│   ├── locales/              # 多言語 JSON (en.json, ja.json)
│   │   ├── en.json
│   │   └── ja.json
│   ├── utils/                # 共通ユーティリティ (URL解析、ユーザー名抽出等)
│   └── types/                # TypeScript 型定義 (Storage, State, Messages)
```

---

## 4. 主要アーキテクチャ設計

### 4.1 ハイブリッド配信者リスト取得
1. **プライマリ (Twitch GQL API)**:
   - バックグラウンド (Service Worker) から Twitch の GraphQL エンドポイントへリクエストを送信。
   - 既存のログイン Cookie を透過的に活用し、高速かつ軽量にフォロー中配信者のライブ状態を取得。
2. **フォールバック (DOM スクラップ)**:
   - API 制限やトークン未取得、ネットワーク切断等の場合は、Content Script 側で Twitch 画面の左サイドバー DOM からライブ配信者情報を抽出して Service Worker へ送信。

### 4.2 巡回ロジックとスマート待機 (`rotation.ts`)
- **目標視聴時間**: 連続視聴維持や視聴者体験のため、初回の最低視聴時間を確保。
- **巡回時間**: 目標視聴時間を満たした後のローテーション間隔（デフォルト3分）。
- **待機モード**:
  - `standbySingle`: ライブ配信者が1人のみの場合、自動巡回を停止してそのまま視聴を継続。
  - `standbyNone`: 配信者が0人の場合は待機。2人以上になったら巡回を自動再開。

### 4.3 サブスク限定配信の検出とスキップ
- GQL API のメタデータ、または動画プレイヤー上のサブスク限定オーバーレイ DOM を検出し、未加入の場合は自動スキップ。
- 無料プレビューが提供されている場合は、プレビュー終了トリガーを検知して次へ遷移。

### 4.4 Svelte 5 Runes の採用
- レガシーな `let` 構文ではなく、`$state()`, `$derived()`, `$effect()`, `$props()` を使用。
- コンポーネント内のリアクティビティを最新の Svelte 5 仕様で記述すること。

---

## 5. 開発規約 & ガイドライン

### 5.1 コードコメントと命名
- **コード内のコメント**: docstring を含め、すべて **日本語** で記述すること。
- **変数名・関数名**: 意味が明確な **英語** で命名すること（ローマ字は禁止）。

### 5.2 PowerShell 環境におけるルール
- Windows 11 PowerShell 環境で動作しています。
- Linux コマンドのエイリアス（`rm`, `ls`, `grep`, `cat` 等）は使用せず、正規の PowerShell コマンドレット（`Remove-Item`, `Get-ChildItem`, `Select-String`, `Get-Content`, `Set-Content` 等）を使用すること。

### 5.3 依存関係管理
- パッケージのバージョンは推測せず、`npm view <package> version` または `npx ncu -u` を使用して実測値に基づいて更新すること。

---

## 6. よく使う開発コマンド

```powershell
# 依存関係のインストール
npm install

# 型チェック (svelte-check)
npm run check

# 単体テストの実行 (Vitest)
npm run test

# 開発用ビルド (ファイル監視)
npm run dev

# プロダクションビルド (dist/ の生成)
npm run build

# 配布用 ZIP パッケージの作成
npm run build-zip
```

---

## 7. 関連ドキュメント
- [開発者向け環境構築・デバッグ手順](./docs/DEVELOPMENT_ja.md)
- [内部アーキテクチャ詳細](./docs/ARCHITECTURE_ja.md)
- [ストア公開・リリース手順](./docs/DEPLOYMENT_GUIDE_ja.md)
- [多言語化ガイド](./docs/i18n_ja.md)
