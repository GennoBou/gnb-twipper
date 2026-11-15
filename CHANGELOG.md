# Changelog

All notable changes to **GNB Twipper for Twitch** will be documented in this file.

---

## [1.0.2] - 2026-11-16

### 日本語 (Japanese)

- **権限の整理**: 使用していなかった `scripting` 権限を削除し、必要最小限の権限で動作するよう改善しました。

### English

- **Permissions Cleanup**: Removed the unused `scripting` permission so the extension requests only the minimum required permissions.

---

## [1.0.1] - 2026-11-15

### 日本語 (Japanese)

- **複数タブでの動作改善**: 複数の Twitch タブを開いている際、オート巡回が1つのタブのみで安全に動作するよう改善しました。別タブの「GNB」メニューから操作対象タブをワンクリックで切り替えられます。
- **表記の統一**: 拡張機能内の名称表記を「GNB Twipper」に統一しました。
- **不具合修正**:
  - チャンネル切り替え時のタイミングによって、2回連続でスキップされてしまうことがある問題を修正しました。
  - Twitch 未ログイン時や左サイドバーの「視聴者が視聴」欄から、フォローしていないチャンネルが巡回対象に混ざることがある問題を修正しました。
  - 巡回タイマーの設定値チェックを強化し、意図しない連続リロードが発生する問題を防止しました。
- **セキュリティ・動作の改善**:
  - カスタム CSS / JS 機能の安全性と全体の動作パフォーマンスを向上させました。

### English

- **Multi-Tab Control**: Improved auto-rotation when multiple Twitch tabs are open by locking active rotation to a single tab, with a one-click option to switch control to another tab.
- **UI Consistency**: Unified the extension display name to "GNB Twipper" across all views and languages.
- **Bug Fixes**:
  - Fixed an issue where channel rotation could occasionally skip twice in a row.
  - Prevented unfollowed channels (such as from the "Viewers Also Watch" sidebar section or when logged out) from being included in rotation.
  - Improved rotation timer validation to prevent unintended reload loops.
- **Security & Performance**:
  - Enhanced safety for Custom CSS / JS features and optimized overall background performance.

---

## [1.0.0] - 2026-10-09

### 日本語 (Japanese)

- **初回正式リリース**:
  - フォロー中のライブ配信チャンネルを一定時間ごとに自動巡回するオートモード機能。
  - 累積視聴時間が少ない配信者を優先する均等ローテーションと、配信者が1人以下の場合の自動待機機能。
  - 未加入のサブスクライバー限定配信の自動スキップ（無料プレビュー期間中の継続視聴に対応）。
  - 巡回対象から特定のチャンネルを除外できる除外リスト機能。
  - Twitch 画面上部の専用操作バー、ツールバーポップアップ、7言語対応の設定画面、および上級者向けカスタム CSS / JS 機能。

### English

- **Initial Official Release**:
  - Auto-rotation mode that cycles through followed live channels at a configurable interval.
  - Fair rotation prioritizing streamers with less watch time, plus automatic standby when 1 or 0 channels are live.
  - Automatic skipping of unsubscribed subscriber-only streams (with optional viewing during free previews).
  - Channel exclusion list to keep specific channels out of rotation.
  - Embedded Twitch header control bar, toolbar popup, options page supporting 7 languages, and optional Custom CSS / JS injection.
