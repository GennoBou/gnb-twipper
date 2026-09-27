import type { StreamInfo } from '../types';
import { parseStreamerFromLink } from './streamer-parser';
import { SIDE_NAV_SELECTORS, FOLLOWED_SECTION_SELECTORS } from './selectors';

/**
 * Twitch ページの左側サイドナビゲーション要素を特定する（右側のチャット欄等は厳密に除外）
 */
export function findLeftSideNav(doc: Document = document): Element | null {
  if (!doc) return null;

  let leftNav =
    doc.querySelector(SIDE_NAV_SELECTORS.SIDE_NAV_BAR) ||
    doc.querySelector(SIDE_NAV_SELECTORS.ARIA_LEFT_NAV_JA) ||
    doc.querySelector(SIDE_NAV_SELECTORS.ARIA_LEFT_NAV_EN);

  if (!leftNav) {
    const candidateNavs = Array.from(
      doc.querySelectorAll<HTMLElement>(SIDE_NAV_SELECTORS.NAV_CANDIDATES)
    );
    leftNav =
      candidateNavs.find((el) => {
        // 右側カラムやチャットルーム内部の要素を除外
        const isRightChat =
          el.closest(SIDE_NAV_SELECTORS.RIGHT_COLUMN) ||
          el.classList.contains(SIDE_NAV_SELECTORS.CHAT_ROOM_CLASS) ||
          !!el.querySelector(SIDE_NAV_SELECTORS.CHAT_SCROLLER) ||
          !!el.querySelector(SIDE_NAV_SELECTORS.CHAT_INPUT);
        return !isRightChat;
      }) || null;
  }

  return leftNav;
}

/**
 * フォロー中チャンネルセクションを特定し、チャンネルリンクのアンカー要素リストを返す
 */
export function getFollowedCardLinks(leftNav: Element): HTMLAnchorElement[] {
  if (!leftNav) return [];

  // フォロー中セクションのマッチャーから一致するコンテナを検索
  for (const selector of FOLLOWED_SECTION_SELECTORS.MATCHERS) {
    const followedSection = leftNav.querySelector(selector);
    if (followedSection) {
      console.log('[gnb-twipper] Found EXACT followedSection container:', followedSection.getAttribute('aria-label') || selector);
      return Array.from(followedSection.querySelectorAll<HTMLAnchorElement>('a[href]'));
    }
  }

  console.log('[gnb-twipper] followedSection container not matched, filtering by non-followed sections');

  // おすすめ配信やカテゴリなどの除外セクションを特定
  const excludedSections = Array.from(
    leftNav.querySelectorAll(FOLLOWED_SECTION_SELECTORS.EXCLUDED_SECTION_QUERY)
  );

  const excludedLinks = new Set<HTMLAnchorElement>();
  excludedSections.forEach((sec) => {
    sec.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => excludedLinks.add(link));
  });

  const allLinks = Array.from(leftNav.querySelectorAll<HTMLAnchorElement>('a[href]'));
  return allLinks.filter((a) => !excludedLinks.has(a));
}

/**
 * DOM からフォロー中ライブ配信者一覧を取得し、O(N) で重複排除して返す
 */
export function scrapeLiveStreamersFromDOM(doc: Document = document): StreamInfo[] {
  const leftNav = findLeftSideNav(doc);
  if (!leftNav) {
    console.warn('[gnb-twipper] Left SideNav container not found on page');
    return [];
  }

  const cardLinks = getFollowedCardLinks(leftNav);
  console.log('[gnb-twipper] Candidate links in followed section count:', cardLinks.length);

  const streamers: StreamInfo[] = [];
  const seenLogins = new Set<string>();

  cardLinks.forEach((a) => {
    const streamer = parseStreamerFromLink(a);
    if (streamer) {
      const loginKey = streamer.user_login.toLowerCase();
      if (!seenLogins.has(loginKey)) {
        seenLogins.add(loginKey);
        streamers.push(streamer);
      }
    }
  });

  console.log('[gnb-twipper] EXACT Followed LIVE streamers count from DOM:', streamers.length, streamers);
  return streamers;
}
