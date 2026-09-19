# 開発推奨コマンド (Windows PowerShell)

本プロジェクトの開発において使用する推奨コマンド一覧です。環境は Windows 11 PowerShell を前提としています。

## 依存関係管理・ビルド
- **依存関係のインストール**:
  ```powershell
  npm install
  ```
- **開発モード (ファイル変更監視・ホットリロード)**:
  ```powershell
  npm run dev
  ```
- **プロダクションビルド (`dist/` の生成)**:
  ```powershell
  npm run build
  ```
- **配布用 ZIP パッケージの作成**:
  ```powershell
  npm run build-zip
  ```

## 検証・テスト
- **単体テストの実行 (Vitest - 高速単体テストのみ)**:
  ```powershell
  npm run test
  ```
- **ベンチマークテストの実行 (大量データ・パフォーマンス測定用)**:
  ```powershell
  npm run test:bench
  ```
- **すべてのテストの一括実行**:
  ```powershell
  npm run test:all
  ```
- **TypeScript 型チェック (コンパイラ直接検証)**:
  ```powershell
  npx tsc --noEmit
  ```
- **Svelte / TypeScript 型チェック**:
  ```powershell
  npm run check
  ```

## Windows PowerShell 環境におけるユーティリティコマンドの規則
Linux のエイリアスではなく、必ず正規の PowerShell コマンドレットを使用してください。
- ファイル/ディレクトリ一覧: `Get-ChildItem` (不可: `ls`)
- ファイル/ディレクトリ削除: `Remove-Item` (不可: `rm`)
- ファイル/ディレクトリコピー: `Copy-Item` (不可: `cp`)
- ファイル/ディレクトリ移動: `Move-Item` (不可: `mv`)
- パターン検索: `Select-String` (不可: `grep`)
- 新規ファイル作成: `New-Item -ItemType File` (不可: `touch`)
- 新規ディレクトリ作成: `New-Item -ItemType Directory -Force` (不可: `mkdir`)
- ファイル内容の出力: `Get-Content` (不可: `cat`)
- 現在のパス取得: `Get-Location` (不可: `pwd`)
