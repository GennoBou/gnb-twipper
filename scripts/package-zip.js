import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { buildFirefox } from './build-firefox.js';

// 作業ディレクトリとメタデータの取得
const rootDir = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));
const version = packageJson.version || '1.0.0';

console.log(`\n========================================`);
console.log(`  拡張機能 ZIP パッケージング開始 (v${version})`);
console.log(`========================================\n`);

// 1. Firefox 用ビルドディレクトリの準備
buildFirefox();

// ZIP 出力先ファイル名
const chromeZipName = `chrome-extension-v${version}.zip`;
const firefoxZipName = `firefox-extension-v${version}.zip`;
const sourceZipName = `source-code-v${version}.zip`;

// 2. Chrome / Edge 向け ZIP の生成 (dist ディレクトリから)
console.log(`\n[package-zip] Chrome / Edge 用 ZIP パッケージを生成中: ${chromeZipName}...`);
execSync(
  `npx web-ext build --source-dir dist --artifacts-dir . --filename "${chromeZipName}" --overwrite-dest`,
  { stdio: 'inherit', cwd: rootDir }
);

// 3. Firefox 向け ZIP の生成 (dist-firefox ディレクトリから)
console.log(`\n[package-zip] Firefox 用 ZIP パッケージを生成中: ${firefoxZipName}...`);
execSync(
  `npx web-ext build --source-dir dist-firefox --artifacts-dir . --filename "${firefoxZipName}" --overwrite-dest`,
  { stdio: 'inherit', cwd: rootDir }
);

// 4. Firefox (AMO) 審査提出用ソースコード ZIP の生成 (Git HEAD からアーカイブ)
console.log(`\n[package-zip] ソースコード ZIP を生成中: ${sourceZipName}...`);
execSync(
  `git archive --format=zip -o "${sourceZipName}" HEAD`,
  { stdio: 'inherit', cwd: rootDir }
);

// 5. 生成結果の確認とサマリー表示
const chromeZipPath = path.join(rootDir, chromeZipName);
const firefoxZipPath = path.join(rootDir, firefoxZipName);
const sourceZipPath = path.join(rootDir, sourceZipName);

const formatSize = (bytes) => (bytes / 1024).toFixed(1) + ' KB';

console.log(`\n========================================`);
console.log(`  ZIP パッケージングが完了しました！`);
console.log(`========================================`);
if (fs.existsSync(chromeZipPath)) {
  const size = fs.statSync(chromeZipPath).size;
  console.log(`  - Chrome / Edge 用:  ${chromeZipName} (${formatSize(size)})`);
}
if (fs.existsSync(firefoxZipPath)) {
  const size = fs.statSync(firefoxZipPath).size;
  console.log(`  - Firefox 用:        ${firefoxZipName} (${formatSize(size)})`);
}
if (fs.existsSync(sourceZipPath)) {
  const size = fs.statSync(sourceZipPath).size;
  console.log(`  - ソースコード用:    ${sourceZipName} (${formatSize(size)})`);
}
console.log(`========================================\n`);
