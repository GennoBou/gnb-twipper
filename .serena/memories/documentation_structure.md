# ドキュメント構成仕様 (2026-11-16 改定)

- ルートのREADME（`README_ja.md`, `README.md`）:
  - 対象: エンドユーザー（一般利用者）
  - 内容: アプリ概要、主な機能（オート巡回、待機、サブスクスキップ、除外リスト、操作パネル、カスタムインジェクション）、導入手順（公式ストアリンク含む）、使い方、設定項目、FAQ
  - 開発者向けの情報（技術スタック、ビルドコマンド、GQL/DOMハイブリッド詳細、CDPデバッグ）は完全除外

- 変更履歴 (`CHANGELOG.md`):
  - 対象: 一般ユーザーおよびストア（Firefox Add-ons 等）のリリースノート欄
  - 内容: ユーザーに影響する改善・不具合修正のみを日英併記で簡潔に記載する。CI/CD (`wepub`)、README 更新、内部関数名や GQL/DOM などの開発者向け情報は記載せず、開発者向けの変更履歴は GitHub Releases の自動生成ノート（`generate_release_notes: true`）に委ねる。
  - 自動連携: `.github/workflows/release.yml` が `CHANGELOG.md` から該当バージョン節を抽出し、`wepub firefox --release-notes-file` へ渡す。

- 開発者・AIエージェント向けドキュメント:
  - `AGENT.md`: リポジトリ全体の設計原則、コンポーネント構成、AI/開発者向け実装ガイドライン
  - `docs/DEVELOPMENT_ja.md`: 開発環境構築、ビルド、テスト、デバッグ（CDP/DevTools）、ZIPパッケージング
  - `docs/ARCHITECTURE_ja.md`: Manifest V3レイヤー構造、GQL/DOMハイブリッド取得、ローテーション状態マシン、サブスク検出仕様
  - `docs/DEPLOYMENT_GUIDE_ja.md` / `docs/DEPLOYMENT_GUIDE.md`: `iorate/wepub` と GitHub Actions を使った各ストア自動公開手順
