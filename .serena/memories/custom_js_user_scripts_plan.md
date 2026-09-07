# カスタムJS実行機能の再設計方針（userScripts API & Firefox共通対応）

## 背景
- CWE-94（任意コード実行脆弱性）対応として PR #2, #15, #17 が作成されていた。
- Chrome Web Store 審査において、DOM scriptタグ注入や eval による動的文字列実行は厳格にリジェクトされる。
- Manifest V3 公式の `userScripts` API へ移行する方針で決定。

## 仕様方針
1. **Chrome / Chromium (Chrome 120+)**:
   - `chrome.userScripts` API を利用する。
   - ブラウザ仕様により「デベロッパーモード」が有効な場合のみ実行可能。
   - オプション画面（Options.svelte）でデベロッパーモードの有効/無効を判定し、無効時は案内メッセージを表示してカスタムJS設定を無効化。
2. **Firefox (AMO)**:
   - `browser.userScripts` API を利用する。
   - Firefox はデベロッパーモード不要で動作可能。
3. **ビルド構成**:
   - Chrome / Firefox で別ビルドに分ける必要はなく、単一コードベース・単一ビルドで実行時 feature detection により対応。
   - `manifest.json` の permissions に `"userScripts"` を追加。

## 進行状況 (2026-09-05)
- PR #2, PR #17 はクローズ。
- PR #15 に Jules への再実装指示コメントを投稿し、Jules による設計・実装案を依頼中。
- 後日（明日以降）、Julesの成果物を参考にしつつ Antigravity でレビュー・再検討・本実装を行う。
