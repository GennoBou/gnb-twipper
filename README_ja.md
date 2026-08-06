[English Edition](./README.md)

# gnb-twview

Twitchを効率的に視聴するために設計された、Chrome 拡張機能 (Manifest V3) の自動巡回ビューアです。

## 概要

`gnb-twview` は、Twitchのライブ配信を効率的に巡回・観賞するために開発された Chrome 拡張機能です。一般的なブラウザ拡張機能として動作するため、Twitch のログイン状態やセキュリティ検証を意識することなく、軽量かつ安全に動作します。

### 主な機能
- **オートモード**: ライブ配信中のフォロー中配信者を一定時間ごとに自動で切り替えて巡回します。
- **スキップボタン**: キュー内の次の配信者へ即座に切り替えます。
- **インジェクト UI**: Twitch Web 画面上部に統合されたミニマルな操作バー（AUTO開始/停止、タイマー、配信者切り替えドロップダウン）。
- **カスタムインジェクション (CSS/JS)**: Twitch ページ上にユーザー独自の CSS スタイルおよび JavaScript ロジックを動的に自動埋め込み。
- **多言語 GUI**: 日本語および英語に対応。設定画面から動的に切り替え可能。

## 技術スタック
- **標準規格**: Chrome Extension Manifest V3
- **ビルドツール**: Vite + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- **フロントエンド**: Svelte v5 + TypeScript

## インストール手順

1. 本リポジトリのコードを取得し、依存関係をインストールしてビルドします。
   ```bash
   npm install
   npm run build
   ```
2. Google Chrome を開き、`chrome://extensions/` にアクセスします。
3. 画面右上の **「デベロッパーモード」** を ON にします。
4. **「パッケージ化されていない拡張機能を読み込む」** を選択し、生成された `dist/` フォルダを指定します。
5. [Twitch](https://www.twitch.tv) を開くと、操作ナビゲーションバーが表示されます。

## 旧バージョンについて
- Wails 3 (WebView2) ベースの旧デスクトップ版コードは、`legacy-wails3` Git ブランチにて保管されています。
