import type { StreamInfo } from '../types';

/**
 * アクセシビリティ用ツールチップや矢印キー案内などの不要なテキストを除去・クリーンアップする
 */
export function cleanText(str: string | null | undefined): string {
  if (!str) return '';
  if (str.includes('詳細情報') || str.includes('詳細') || str.includes('Press right arrow') || str.includes('押すと')) return '';
  return str.trim();
}

/**
 * リンクの href 属性から Twitch 配信者の ID (user_login) を抽出する
 * 予約システムパスや無効なパスの場合は null を返す
 */
export function extractUserLoginFromHref(rawHref: string | null): string | null {
  if (!rawHref) return null;

  let path = '';
  try {
    if (rawHref.startsWith('http://') || rawHref.startsWith('https://')) {
      const url = new URL(rawHref);
      path = url.pathname;
    } else {
      const origin =
        typeof window !== 'undefined' && window.location?.origin && window.location.origin !== 'null'
          ? window.location.origin
          : 'https://www.twitch.tv';
      const url = new URL(rawHref, origin);
      path = url.pathname;
    }
  } catch (e) {
    path = rawHref;
  }

  if (
    !path ||
    path === '/' ||
    path.startsWith('/directory') ||
    path.startsWith('/videos') ||
    path.startsWith('/settings') ||
    path.startsWith('/wallet') ||
    path.startsWith('/prime') ||
    path.startsWith('/turbo') ||
    path.startsWith('/subscriptions') ||
    path.startsWith('/drops') ||
    path.startsWith('/friends') ||
    path.startsWith('/p/') ||
    path.startsWith('/popout')
  ) {
    return null;
  }

  const userLogin = path.replace(/^\//, '').split('/')[0].toLowerCase();
  if (!userLogin || userLogin.includes('.')) return null;

  return userLogin;
}

/**
 * チャンネル要素がオフライン状態を示しているか判定する
 */
export function isOfflineChannel(a: HTMLAnchorElement): boolean {
  const isOfflineAvatar = !!a.querySelector('.side-nav-card__avatar--offline, .tw-avatar--offline');
  const isOfflineText = a.textContent?.includes('オフライン') || a.textContent?.includes('Offline');
  return isOfflineAvatar || isOfflineText;
}

/**
 * aria-label または title 文字列から表示名を抽出する
 */
export function extractUserNameFromAria(rawAria: string): string {
  if (!rawAria) return '';
  // "表示名 (login_id)" や "表示名" のパターンから表示名を抽出
  const match = rawAria.match(/^([^(]+)\s*\([^)]+\)/);
  if (match) {
    return cleanText(match[1]);
  }
  return cleanText(rawAria.split('\n')[0]);
}

/**
 * カード要素、画像、aria 属性から優先度順に配信者名（表示名）を特定する
 */
export function extractUserName(
  a: HTMLAnchorElement,
  imgEl: HTMLImageElement | null,
  userLogin: string
): string {
  const rawAria = a.getAttribute('aria-label') || a.getAttribute('title') || '';
  const extractedNameFromAria = extractUserNameFromAria(rawAria);

  const titleEl =
    a.querySelector('[data-a-target="side-nav-title"]') ||
    a.querySelector('.side-nav-card__title') ||
    a.querySelector('p') ||
    a.querySelector('span');

  let userName = cleanText(titleEl?.textContent);
  if (!userName && extractedNameFromAria) {
    userName = extractedNameFromAria;
  }
  if (!userName && imgEl?.alt) {
    userName = cleanText(imgEl.alt);
  }
  if (!userName) {
    userName = userLogin;
  }

  return userName;
}

/**
 * テキスト（単位「万」「k」を含む数値）から視聴者数をパースする
 */
export function parseViewerCount(text: string): number {
  if (!text) return 0;
  const fullText = text.replace(/,/g, '');
  const numMatch = fullText.match(/(\d+(\.\d+)?)/);
  if (!numMatch) return 0;

  let val = parseFloat(numMatch[1]);
  if (fullText.includes('万')) val *= 10000;
  else if (fullText.toLowerCase().includes('k')) val *= 1000;

  return Math.round(val);
}

/**
 * 単一の配信者カード要素 (HTMLAnchorElement) から StreamInfo オブジェクトをパースする
 */
export function parseStreamerFromLink(a: HTMLAnchorElement): StreamInfo | null {
  const rawHref = a.getAttribute('href') || a.href;
  const userLogin = extractUserLoginFromHref(rawHref);
  if (!userLogin) return null;

  // オフラインチャンネルをフィルタリング
  if (isOfflineChannel(a)) {
    console.log('[gnb-twipper] Skipping offline channel:', userLogin);
    return null;
  }

  const imgEl = a.querySelector<HTMLImageElement>('img');
  const profileImageUrl = imgEl?.src || '';

  const userName = extractUserName(a, imgEl, userLogin);

  const gameEl =
    a.querySelector('[data-a-target="side-nav-game-title"]') ||
    a.querySelector('.side-nav-card__game');
  const gameName = cleanText(gameEl?.textContent);

  const recapEl =
    a.querySelector('[data-a-target="side-nav-live-recap"]') ||
    a.querySelector('.side-nav-card__live-stat');

  const viewerText = recapEl?.textContent || a.getAttribute('aria-label') || a.textContent || '';
  const viewerCount = parseViewerCount(viewerText);

  return {
    user_login: userLogin,
    user_name: userName,
    game_name: gameName,
    profile_image_url: profileImageUrl,
    viewer_count: viewerCount,
  };
}
