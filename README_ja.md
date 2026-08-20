[English Edition](./README.md)

# gnb-twipper (v0.1.0)

Twitchを効率的に視聴するために設計された、Chrome 拡張機能 (Manifest V3 + Svelte 5) の自動巡回ビューアです。

## 概要

`gnb-twipper` は、Twitchのライブ配信を効率的に巡回・観賞するために開発された Chrome 拡張機能です。既存ブラウザのログインセッションをそのまま活用し、Twitch のセキュリティ保護 (Twitch Integrity) を侵害することなく、API 直接取得と DOM スクレイピングの自動二重化（ハイブリッド構造）により高速かつ超高精度に動作します。

### 主な機能

- **オート巡回モード & スマート待機**:
  - ライブ配信中のフォロー中配信者を指定時間（初期値3分）ごとに自動的に切り替えて順次巡回。
  - 巡回対象が1人のみの場合は自動でページ遷移を停止して視聴を継続し、2人以上になると自動で巡回を再開。
- **サブスク限定配信の自動スキップ**:
  - Twitch GQL API およびプレイヤー検知により、未加入のサブスクライバー限定配信を自動スキップ（無料プレビュー期間の終了時自動スキップにも対応）。
- **巡回除外設定**:
  - 24時間配信や公式音楽配信など、自動巡回から外したいチャンネルを簡単に除外登録・管理可能。
- **GQL API & DOM ハイブリッド取得**:
  - 通常時は Service Worker 経由で Twitch GQL API から高速・高精度にライブ配信者リストを直接取得。
  - 万が一のAPI制限時や未ログイン時も Content Script 側から自動的に DOM フォールバックがバックアップ動作。
- **ヘッダー統合インジェクト UI (`GnbNavTrigger`)**:
  - Twitch 画面上部検索バー横にシームレスに埋め込まれるミニマルな操作ナビ。
  - アコーディオン形式の配信者一覧、タイマー＆待機中バッジ、AUTO 開始/停止、スキップボタン、詳細設定へのクイックアクセス。
- **起動時オート巡回自動連動 (`autoStartOnLogin`)**:
  - Twitch を開いた際やブラウザ起動時に、手動でボタンを押すことなく全自動でオート巡回を開始。
- **カスタムインジェクション (CSS/JS)**:
  - Twitch Web ページ上にユーザー独自の CSS スタイルおよび JavaScript ロジックを動的に埋め込み（設定画面にてぬるっと生えるアニメーション付きエディタ）。
- **CDP リモートデバッグ統合**:
  - Chrome DevTools Protocol (CDP) / MCP `chrome-devtools` 経由での実機ブラウザデバッグに完全対応。

## 技術スタック

- **拡張機能規格**: Chrome Extension Manifest V3
- **ビルドツール**: Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **フロントエンド UI**: Svelte 5 (Runes / `$state` / `$effect`) + TypeScript
- **アイコン**: [@lucide/svelte](https://lucide.dev/)

## インストール手順

1. 本リポジトリのコードを取得し、依存関係をインストールしてビルドします。
   ```bash
   npm install
   npm run build
   ```
2. Google Chrome を開き、`chrome://extensions/` にアクセスします。
3. 画面右上の **「デベロッパーモード」** を ON にします。
4. **「パッケージ化されていない拡張機能を読み込む」** を選択し、本プロジェクトの `dist` フォルダを指定します。
5. [Twitch](https://www.twitch.tv) を開くと、上部ナビゲーションバーに `GNB` コントロールボタンが表示されます。

## ドキュメント＆ストア公開ガイド

- 🌐 [ストア掲載情報・申請用ドキュメント](./docs/STORE_LISTING_ja.md) ([English Edition](./docs/STORE_LISTING.md))
- 🔒 [プライバシーポリシー](./docs/PRIVACY_POLICY_ja.md) ([English Edition](./docs/PRIVACY_POLICY.md))
- 🚀 [自動リリース・ストア自動公開ガイド](./docs/DEPLOYMENT_GUIDE_ja.md) ([English Edition](./docs/DEPLOYMENT_GUIDE.md))

## 旧バージョンについて

- Wails 3 (Go + WebView2) ベースの旧デスクトップアプリ版コードは、歴史的経緯として `legacy-wails3` Git ブランチおよび `/docs/local` の設計ログに保管されています。


