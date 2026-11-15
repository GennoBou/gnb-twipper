import { NAV_SELECTORS } from './selectors';

/**
 * Twitch 上部ナビゲーションの検索バーコンテナを探索し、flex 横並びスタイルを適用して返す
 */
export function findTwitchSearchTarget(
  doc: Document = document
): { container: HTMLElement; searchBox: HTMLElement } | null {
  if (!doc) return null;

  const searchBox =
    (doc.querySelector(NAV_SELECTORS.SEARCH_BOX) as HTMLElement) ||
    (doc.querySelector(NAV_SELECTORS.SEARCH_INPUT) as HTMLElement);

  if (searchBox && searchBox.parentElement) {
    const container = searchBox.parentElement as HTMLElement;
    // 検索コンテナを横並び flex に設定し、ボタンが右側に収まるようにする
    container.style.setProperty('display', 'flex', 'important');
    container.style.setProperty('flex-direction', 'row', 'important');
    container.style.setProperty('align-items', 'center', 'important');
    return { container, searchBox };
  }

  // フォールバック: トップナビの中央または左側コンテナ
  const topNav =
    doc.querySelector(NAV_SELECTORS.TOP_NAV) ||
    doc.querySelector(NAV_SELECTORS.NAV_FALLBACK);
  if (topNav) {
    const centerDiv = (topNav.querySelector('div[class*="center"]') ||
      topNav.children[1] ||
      topNav) as HTMLElement;
    if (centerDiv) {
      centerDiv.style.setProperty('display', 'flex', 'important');
      centerDiv.style.setProperty('flex-direction', 'row', 'important');
      centerDiv.style.setProperty('align-items', 'center', 'important');
      return { container: centerDiv, searchBox: centerDiv };
    }
  }

  return null;
}

/**
 * トリガーボタン配置用のルートラッパー要素（#gnb-twipper-trigger-root）を生成する
 */
export function createTriggerRootWrapper(doc: Document = document): HTMLDivElement {
  const wrapper = doc.createElement('div');
  wrapper.id = NAV_SELECTORS.TRIGGER_ROOT_ID;
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.marginLeft = '8px';
  wrapper.style.flexShrink = '0';
  return wrapper;
}

/**
 * 対象コンテナへトリガールート要素を挿入する
 */
export function insertTriggerRoot(
  target: { container: HTMLElement; searchBox: HTMLElement },
  wrapper: HTMLElement
): void {
  if (target.searchBox && target.searchBox.nextSibling) {
    target.container.insertBefore(wrapper, target.searchBox.nextSibling);
  } else {
    target.container.appendChild(wrapper);
  }
}

/**
 * カスタム CSS のサニタイズ結果
 */
export interface CssSanitizeResult {
  safeCss: string;
  isValid: boolean;
  warnings: string[];
}

/**
 * ユーザー指定のカスタム CSS を検証・無害化する
 * - </style> などのタグ脱出シーケンスを安全に無害化
 * - @import による外部スタイルシート読み込みを遮断
 * - url() による外部リソース通信（http:, https:, //）を遮断
 * - expression / javascript: などの危険なスクリプト構文を排除
 */
export function sanitizeCustomCss(rawCss: string): CssSanitizeResult {
  if (!rawCss) {
    return { safeCss: '', isValid: true, warnings: [] };
  }

  const warnings: string[] = [];

  // 1. </style> などの終了タグによる HTML 脱出を防止
  let cleaned = rawCss.replace(/<\/\s*style\s*>/gi, () => {
    warnings.push('Stripped dangerous </style> tag from custom CSS');
    return '/* stripped style close tag */';
  });

  // 2. @import ルールの検出と除去
  if (/@import\s+/i.test(cleaned)) {
    warnings.push('Blocked @import rule in custom CSS to prevent external stylesheet loading');
    cleaned = cleaned.replace(/@import\s+[^;]+;?/gi, '/* blocked import */');
  }

  // 3. 外部 URL (http://, https://, //) への url(...) 参照の検出と除去
  if (/url\s*\(\s*['"]?\s*(?:https?:|\/\/)/i.test(cleaned)) {
    warnings.push('Blocked external url(...) reference in custom CSS to prevent data exfiltration');
    cleaned = cleaned.replace(/url\s*\(\s*['"]?\s*(?:https?:|\/\/)[^)'"]*['"]?\s*\)/gi, '/* blocked external url */');
  }

  // 4. expression() や javascript: などのレガシー実行構文
  if (/expression\s*\(|javascript\s*:/i.test(cleaned)) {
    warnings.push('Blocked dynamic expression/javascript in custom CSS');
    cleaned = cleaned.replace(/expression\s*\([^)]*\)|javascript\s*:[^;'"]*/gi, '/* blocked expression */');
  }

  return {
    safeCss: cleaned,
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * ユーザー指定のカスタム CSS を <style id="gnb-twipper-custom-css"> として <head> に反映・更新する
 */
export function applyCustomCss(
  customCss: string,
  enabled: boolean,
  currentStyleEl: HTMLStyleElement | null,
  doc: Document = document
): HTMLStyleElement | null {
  if (!doc || !doc.head) return currentStyleEl;

  if (enabled && customCss) {
    const { safeCss, warnings } = sanitizeCustomCss(customCss);
    if (warnings.length > 0) {
      warnings.forEach((w) => console.warn(`[gnb-twipper] ${w}`));
    }
    let styleEl = currentStyleEl;
    if (!styleEl || !doc.getElementById('gnb-twipper-custom-css')) {
      styleEl = doc.createElement('style');
      styleEl.id = 'gnb-twipper-custom-css';
      doc.head.appendChild(styleEl);
    }
    styleEl.textContent = safeCss;
    return styleEl;
  } else if (currentStyleEl) {
    currentStyleEl.textContent = '';
    return currentStyleEl;
  }

  return null;
}
