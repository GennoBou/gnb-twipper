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
    let styleEl = currentStyleEl;
    if (!styleEl || !doc.getElementById('gnb-twipper-custom-css')) {
      styleEl = doc.createElement('style');
      styleEl.id = 'gnb-twipper-custom-css';
      doc.head.appendChild(styleEl);
    }
    styleEl.textContent = customCss;
    return styleEl;
  } else if (currentStyleEl) {
    currentStyleEl.textContent = '';
    return currentStyleEl;
  }

  return null;
}
