import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * dist ディレクトリの内容を dist-firefox にコピーし、Firefox 向けに manifest.json を調整します。
 */
export function buildFirefox() {
  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const firefoxDistDir = path.join(rootDir, 'dist-firefox');

  // package.json からバージョン情報を取得
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
  const version = packageJson.version || '1.0.0';

  console.log(`[build-firefox] Firefox用ビルド成果物の生成を開始します (v${version})...`);

  if (!fs.existsSync(distDir)) {
    console.error('[build-firefox] エラー: dist ディレクトリが存在しません。先に npm run build を実行してください。');
    process.exit(1);
  }

  // 既存の dist-firefox ディレクトリを削除して新規作成
  if (fs.existsSync(firefoxDistDir)) {
    fs.rmSync(firefoxDistDir, { recursive: true, force: true });
  }
  fs.cpSync(distDir, firefoxDistDir, { recursive: true });

  // manifest.json を読み込み
  const manifestPath = path.join(firefoxDistDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  // 1. Firefox用のアドオンIDおよびデータ収集宣言を追加
  manifest.browser_specific_settings = {
    gecko: {
      id: 'gnb-twipper@gennobou.com',
      data_collection_permissions: {
        required: ['none'],
      },
    },
  };

  // 2. background の設定を Firefox (MV3 scripts) 専用に調整 (service_worker キーを除去して警告を解消)
  if (manifest.background) {
    const serviceWorkerFile = manifest.background.service_worker || 'service-worker-loader.js';
    manifest.background = {
      scripts: [serviceWorkerFile],
      type: 'module',
    };
  }

  // 3. permissions から userScripts を除外して optional_permissions に移動 (Firefox MV3 規格)
  if (Array.isArray(manifest.permissions)) {
    manifest.permissions = manifest.permissions.filter((perm) => perm !== 'userScripts');
    if (!manifest.optional_permissions) {
      manifest.optional_permissions = [];
    }
    if (!manifest.optional_permissions.includes('userScripts')) {
      manifest.optional_permissions.push('userScripts');
    }
  }

  // 4. Firefox では options_ui が標準のため、レガシーな options_page を削除
  delete manifest.options_page;

  // 変換後の manifest.json を保存
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log('[build-firefox] Firefox用 manifest.json の生成が完了しました: dist-firefox/manifest.json');
}

// 直接スクリプトとして実行された場合は実行
const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  buildFirefox();
}
