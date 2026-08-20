# サブスクライバー限定配信判定の設計方針

## 方針概要
- **主軸**: Twitch GraphQL API (`streamPlaybackAccessToken`) の `authorization` フィールド（`isForbidden`, `forbiddenReasonCode: 'UNAUTHORIZED_ENTITLEMENTS'`）を用いた API レベルの権限判定に完全に依存する。
- **DOM / タイトル判定**: 配信タイトル文字列による判定や複雑な DOM スクリプトは不確実性が高く誤判定のリスクがあるため使用しない。DOM 側の要素検出は必要最小限のフェールセーフとして扱い、巡回視聴という拡張機能の基本機能を最優先とする。
- **リスト表示と巡回**:
  - サブスク限定配信は一覧表示（Popup / Navbar）には残し、`🔒 限定` アイコンバッジを付与。
  - オート巡回時 (`rotateToNextChannel`) に選定対象から動的にスルー（スキップ）する。
