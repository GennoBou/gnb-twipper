# プロジェクト概要 (gnb-twipper)

## 目的
`gnb-twipper` は、Twitch のライブ配信を効率的に巡回・視聴するために設計された Google Chrome 拡張機能 (Manifest V3 + Svelte 5) です。巡回オートモードや統合操作UIなど、配信観賞を快適にするための機能を提供します。

### 主な機能
- **オートモード**: ライブ配信中のフォロー中配信者を、スマートキューシステムに基づいて一定時間ごとに自動で切り替えて巡回します。
- **スマート待機**: 配信者が1人のみの場合は巡回を停止して視聴継続、0人の場合は待機し、配信者が増えたら自動再開します。
- **サブスク限定配信の自動スキップ**: GQL PlaybackAccessToken またはプレイヤー上のオーバーレイからサブスク限定配信を検知し、未加入の場合は自動スキップします。
- **オフライン検知と自動スキップ**: 配信が終了したチャンネルを検知して即座に次の配信者へ遷移します。
- **ミニマルなUI**: Twitch ヘッダー検索バー横に直接注入される Svelte 5 製のナビゲーションコンポーネント。

## 技術スタック
- **拡張機能仕様**: Chrome Extension Manifest V3
- **ビルドツール**: Vite + @crxjs/vite-plugin
- **フロントエンド**: Svelte 5 (Runes: $state, $derived, $effect, $props) + Tailwind CSS + Lucide Icons
- **プログラミング言語**: TypeScript
- **テスト**: Vitest (単体テスト: npm run test, ベンチマーク: npm run test:bench), svelte-check

## コードベースの構造
- `/src/manifest.json` - 拡張機能マニフェスト定義。
- `/src/background/background.ts` - バックグラウンド Service Worker。メッセージング、タイマー、GQL API連携、巡回スケジューリング。
- `/src/background/rotation.ts` - 巡回キュー管理、待機判定ロジック。
- `/src/content/content.ts` - Twitch DOM 監視、UI マウント、DOM スクラップフォールバック。
- `/src/content/GnbNavTrigger.svelte` - ヘッダー検索バー横に注入される Svelte 5 UI。
- `/src/popup/` - ツールバーポップアップ画面。
- `/src/options/` - 詳細設定画面（Options page）。
- `/src/utils/` - 共通ユーティリティ（messaging.ts, url.ts, username.ts）。
- `/src/locales/` - 多言語リソース（en.json, ja.json）および i18n モジュール。
