# 開発者ガイド (Development Guide)

本ドキュメントでは、`gnb-twipper` の開発環境構築、ビルド、テスト、デバッグ方法について解説します。

---

## 1. 前提条件

- **Node.js**: v20 以上推奨 (LTS)
- **npm**: v10 以上
- **Google Chrome**: 最新安定版
- **OS**: Windows 11 (PowerShell) / macOS / Linux

---

## 2. セットアップ & ビルド

### 2.1 依存パッケージのインストール

```powershell
npm install
```

### 2.2 プロダクションビルド

```powershell
npm run build
```
実行すると、アイコン生成スクリプト (`scripts/generate-icons.js`) が走り、`dist/` ディレクトリに拡張機能のバンドルが出力されます。

### 2.3 開発用ビルド (ファイル変更の監視)

```powershell
npm run dev
```
コードの変更を監視し、自動的に差分ビルドを行います。

---

## 3. Chrome への読み込み (ローカル検証)

1. Google Chrome を起動し、アドレスバーに `chrome://extensions/` を入力します。
2. 画面右上の **「デベロッパーモード」** を ON にします。
3. 左上の **「パッケージ化されていない拡張機能を読み込む」** ボタンをクリックします。
4. 本プロジェクトの **`dist`** フォルダを選択します。
5. 拡張機能一覧に `gnb-twipper` が登録されれば準備完了です。
6. [Twitch](https://www.twitch.tv) を開き、上部検索バー横に `GNB` 操作パネルが表示されることを確認します。

> **Tips: コード更新後の再読み込み**
> コードを変更して `dist` が更新されたら、`chrome://extensions/` 画面内の `gnb-twipper` カード右下にある **🔄 (更新ボタン)** をクリックして再読み込みしてください。

---

## 4. テストと型チェック

### 4.1 型チェック (svelte-check)

```powershell
npm run check
```
TypeScript の型定義、Svelte 5 Runes の構文チェックを実行します。コミット前には必ずエラーが 0 件であることを確認してください。

### 4.2 単体テスト (Vitest)

```powershell
npm run test
```
URL パース、ユーザー名抽出、ローテーション計算などのユーティリティ・ロジックのテストが実行されます。

---

## 5. デバッグ手法

### 5.1 Service Worker (Background) のデバッグ
1. `chrome://extensions/` を開きます。
2. `gnb-twipper` のカード内にある **「ビューを検証: Service Worker」** のリンクをクリックします。
3. 専用の DevTools が開き、ローテーションタイマーや GQL API リクエストのログを確認できます。

### 5.2 Content Script & 埋め込み UI のデバッグ
1. Twitch ページ上で `F12` (DevTools) を開きます。
2. 「要素 (Elements)」タブで `#gnb-nav-trigger-root` やヘッダー要素を検証できます。
3. 「コンソール (Console)」タブのターゲットドロップダウンを「gnb-twipper (Content Script)」に切り替えることで、Content Script 側のログや変数を直接参照できます。

### 5.3 CDP (Chrome DevTools Protocol) / MCP による自動デバッグ
本リポジトリは Chrome DevTools MCP (`chrome-devtools`) を利用した AI エージェントによる実機ブラウザ操作・検証に対応しています。リモートデバッグポートを有効にして Chrome を起動することで、エージェントが自律的にコンソールログやネットワーク通信を検証できます。

---

## 6. 配布パッケージの作成

```powershell
npm run build-zip
```
`npm run build` を実行した後、`dist/` 配下のファイルを `chrome-extension-v1.0.0.zip` にアーカイブします。Chrome Web Store への提出用パッケージとして使用します。
