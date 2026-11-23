import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT_DIR, '.github', 'workflows');
const SCRIPTS_DIR = path.join(ROOT_DIR, 'scripts');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const MANIFEST_PATH = path.join(SRC_DIR, 'manifest.json');

/**
 * 指定ディレクトリ配下のファイルを再帰的に収集する
 */
function collectFiles(dir: string, predicate: (filePath: string) => boolean): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * GitHub Actions ワークフロー YAML からすべての `run:` ブロック（単一行および複数行スカラー）を抽出する
 */
function extractRunBlocks(yamlContent: string): { line: number; block: string }[] {
  const lines = yamlContent.split(/\r?\n/);
  const blocks: { line: number; block: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i];
    const match = /^(\s*)(?:-\s*)?run:\s*(.*)$/.exec(lineText);
    if (!match) continue;

    const baseIndent = match[1].length;
    const afterColon = match[2].trim();
    const startLine = i + 1;

    // `run: |` や `run: >` などの複数行ブロックスカラーを判定
    if (/^[|>][-+]?(?:\s+#.*)?$/.test(afterColon)) {
      const bodyLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine.trim() === '') {
          bodyLines.push(nextLine);
          j++;
          continue;
        }
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent <= baseIndent) {
          break;
        }
        bodyLines.push(nextLine);
        j++;
      }
      blocks.push({ line: startLine, block: bodyLines.join('\n') });
      i = j - 1;
    } else {
      blocks.push({ line: startLine, block: afterColon });
    }
  }

  return blocks;
}

/**
 * URL マッチパターンが HTTPS の Twitch ドメインのみに限定されているか判定する
 */
function isTwitchOnlyMatchPattern(pattern: string): boolean {
  if (pattern === '<all_urls>' || pattern.includes('*://*/*')) {
    return false;
  }
  return /^https:\/\/(?:[a-z0-9-]+\.)*twitch\.tv\/|^https:\/\/\*\.twitch\.tv\//.test(pattern);
}

describe('Security Guardrails', () => {
  describe('CI/CD Workflows (.github/workflows)', () => {
    const workflowFiles = collectFiles(WORKFLOWS_DIR, (filePath) =>
      /\.(ya?ml)$/i.test(filePath)
    );

    it('ワークフローファイルが存在し、run: ブロックに ${{ ... }} の直接展開が含まれないこと', () => {
      expect(workflowFiles.length).toBeGreaterThan(0);

      for (const filePath of workflowFiles) {
        const relPath = path.relative(ROOT_DIR, filePath);
        const content = fs.readFileSync(filePath, 'utf-8');
        const runBlocks = extractRunBlocks(content);

        // 抽出空振りによる偽グリーンを防止
        expect(runBlocks.length, `${relPath} should contain at least one run: block`).toBeGreaterThan(0);
        if (path.basename(filePath) === 'release.yml') {
          expect(runBlocks.length, 'release.yml should extract all 8 run: blocks').toBeGreaterThanOrEqual(8);
        }

        const unsafeBlocks = runBlocks.filter((entry) => entry.block.includes('${{'));
        expect(
          unsafeBlocks,
          `${relPath} has direct \${{ ... }} interpolation inside run: block(s)`
        ).toEqual([]);
      }
    });

    it('外部 GitHub Actions (uses:) がすべて 40 桁のコミット SHA でピン留めされていること', () => {
      expect(workflowFiles.length).toBeGreaterThan(0);
      let totalExternalUses = 0;

      for (const filePath of workflowFiles) {
        const relPath = path.relative(ROOT_DIR, filePath);
        const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

        lines.forEach((lineText, idx) => {
          const match = /^\s*(?:-\s*)?uses:\s*([^\s#]+)/.exec(lineText);
          if (!match) return;

          const actionRef = match[1];
          // リポジトリ内ローカルアクション参照は除外
          if (actionRef.startsWith('./')) return;

          totalExternalUses++;
          expect(
            actionRef,
            `${relPath}:${idx + 1} uses unpinned action reference: ${actionRef}`
          ).toMatch(/^[^@]+@[0-9a-f]{40}$/);
        });
      }

      expect(totalExternalUses).toBeGreaterThan(0);
    });

    it('release.yml で RELEASE_REF / RELEASE_REF_NAME / RELEASE_TAG が env: 経由で定義・参照されていること', () => {
      const releasePath = path.join(WORKFLOWS_DIR, 'release.yml');
      const content = fs.readFileSync(releasePath, 'utf-8');

      expect(content).toMatch(/RELEASE_REF:\s*\$\{\{\s*github\.ref\s*\}\}/);
      expect(content).toMatch(/RELEASE_REF_NAME:\s*\$\{\{\s*github\.ref_name\s*\}\}/);
      expect(content).toMatch(/RELEASE_TAG:\s*\$\{\{\s*steps\.meta\.outputs\.tag\s*\}\}/);

      const runBlocks = extractRunBlocks(content);
      const joinedRuns = runBlocks.map((b) => b.block).join('\n');
      expect(joinedRuns).toContain('$RELEASE_REF');
      expect(joinedRuns).toContain('${RELEASE_REF_NAME}');
      expect(joinedRuns).toContain('chrome-extension-${RELEASE_TAG}.zip');
      expect(joinedRuns).toContain('firefox-extension-${RELEASE_TAG}.zip');
      expect(joinedRuns).toContain('source-code-${RELEASE_TAG}.zip');
    });
  });

  describe('Build Scripts (scripts/)', () => {
    it('scripts/ 内の npx 呼び出しには必ず --no-install が指定されていること', () => {
      const scriptFiles = collectFiles(SCRIPTS_DIR, (filePath) => /\.(js|ts)$/i.test(filePath));
      expect(scriptFiles.length).toBeGreaterThan(0);

      let npxCallCount = 0;
      const unsafeCalls: string[] = [];

      for (const filePath of scriptFiles) {
        const relPath = path.relative(ROOT_DIR, filePath);
        const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

        lines.forEach((lineText, idx) => {
          if (/\bnpx\b/.test(lineText)) {
            npxCallCount++;
            if (!lineText.includes('--no-install')) {
              unsafeCalls.push(`${relPath}:${idx + 1}: ${lineText.trim()}`);
            }
          }
        });
      }

      expect(npxCallCount, 'Expected at least one npx call in scripts/').toBeGreaterThan(0);
      expect(unsafeCalls).toEqual([]);
    });
  });

  describe('Manifest & Permissions (src/manifest.json)', () => {
    interface ManifestJson {
      permissions?: string[];
      host_permissions?: string[];
      content_scripts?: Array<{ matches?: string[] }>;
      web_accessible_resources?: Array<{ matches?: string[] }>;
    }

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8')) as ManifestJson;

    it('高リスクな不要権限（scripting, debugger 等）が含まれないこと', () => {
      const forbiddenPermissions = [
        'scripting',
        'debugger',
        'management',
        'nativeMessaging',
        'history',
        'bookmarks',
      ];
      const permissions = manifest.permissions ?? [];
      for (const perm of forbiddenPermissions) {
        expect(permissions).not.toContain(perm);
      }
    });

    it('host_permissions / content_scripts / web_accessible_resources が Twitch の HTTPS ドメインのみに限定されていること', () => {
      const hostPermissions = manifest.host_permissions ?? [];
      expect(hostPermissions.length).toBeGreaterThan(0);
      for (const pattern of hostPermissions) {
        expect(isTwitchOnlyMatchPattern(pattern), `Unexpected host_permission: ${pattern}`).toBe(true);
      }

      const contentMatches = (manifest.content_scripts ?? []).flatMap((cs) => cs.matches ?? []);
      expect(contentMatches.length).toBeGreaterThan(0);
      for (const pattern of contentMatches) {
        expect(isTwitchOnlyMatchPattern(pattern), `Unexpected content_script match: ${pattern}`).toBe(true);
      }

      const warMatches = (manifest.web_accessible_resources ?? []).flatMap((war) => war.matches ?? []);
      expect(warMatches.length).toBeGreaterThan(0);
      for (const pattern of warMatches) {
        expect(isTwitchOnlyMatchPattern(pattern), `Unexpected web_accessible_resources match: ${pattern}`).toBe(true);
      }
    });
  });

  describe('Production Source Code (src/)', () => {
    it('本番コード内に危険な XSS / 動的コード実行シンクが含まれないこと', () => {
      const prodFiles = collectFiles(
        SRC_DIR,
        (filePath) =>
          /\.(ts|svelte|js|html)$/i.test(filePath) && !path.basename(filePath).includes('.test.')
      );
      expect(prodFiles.length).toBeGreaterThan(0);

      const sinkPattern =
        /\{@html|innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(|new Function|postMessage/;
      const violations: string[] = [];

      for (const filePath of prodFiles) {
        const relPath = path.relative(ROOT_DIR, filePath);
        const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/);

        lines.forEach((lineText, idx) => {
          if (sinkPattern.test(lineText)) {
            violations.push(`${relPath}:${idx + 1}: ${lineText.trim()}`);
          }
        });
      }

      expect(violations).toEqual([]);
    });
  });
});
