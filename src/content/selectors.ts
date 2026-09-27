/**
 * Twitch DOM セレクタ定数定義
 * Twitch の Web UI 更新に追従しやすくするため、DOM セレクタを一元管理します。
 */

/**
 * ナビゲーションおよび検索バー関連のセレクタ
 */
export const NAV_SELECTORS = {
  SEARCH_BOX: 'div[data-a-target="nav-search-box"]',
  SEARCH_INPUT: 'div[data-a-target="nav-search-input"]',
  TOP_NAV: 'nav[data-a-target="top-nav"]',
  NAV_FALLBACK: 'nav',
  TRIGGER_ROOT_ID: 'gnb-twipper-trigger-root',
} as const;

/**
 * 左側サイドナビゲーション関連のセレクタ
 */
export const SIDE_NAV_SELECTORS = {
  SIDE_NAV_BAR: '[data-a-target="side-nav-bar"]',
  ARIA_LEFT_NAV_JA: 'nav[aria-label*="左ナビゲーション"]',
  ARIA_LEFT_NAV_EN: 'nav[aria-label*="Left Navigation"]',
  NAV_CANDIDATES: 'aside, nav, [aria-label*="ナビゲーション"], [aria-label*="Navigation"]',
  // 除外対象（右側チャットパネル）
  RIGHT_COLUMN: '[data-a-target="right-column"]',
  CHAT_ROOM_CLASS: 'chat-room',
  CHAT_SCROLLER: '[data-a-target="chat-scroller"]',
  CHAT_INPUT: '[data-a-target="chat-input"]',
} as const;

/**
 * フォロー中チャンネルセクション関連のセレクタ
 */
export const FOLLOWED_SECTION_SELECTORS = {
  MATCHERS: [
    '[aria-label*="フォローしているチャンネル"]',
    '[aria-label*="フォロー中のチャンネル"]',
    '[aria-label*="Followed Channels"]',
    '[data-a-target="side-nav-section-followed-channels"]',
    '[data-test-selector="followed-channels"]',
  ],
  EXCLUDED_SECTION_QUERY:
    '[aria-label*="ライブ配信中のチャンネル"], [aria-label*="おすすめ"], [aria-label*="Recommended"], [data-a-target="side-nav-section-recommended-channels"]',
} as const;

/**
 * サブスクライバー限定（サブスクロック）検知用セレクタとキーワード
 */
export const SUB_ONLY_SELECTORS = {
  OVERLAYS: [
    '.preview-overlay',
    '.preview-overlay__content',
    '[data-test-selector="preview-content-broadcaster-streaming-status"]',
    '[data-a-target="player-overlay-content"]',
    '.player-overlay-background',
    '[data-a-target="player-overlay-gate"]',
    '.sub-only-container',
    '[data-test-selector="sub-only-gate"]',
  ],
  LOCK_BADGES: [
    'div[class*="sub-only-container"]',
    'div[class*="sub_only_container"]',
    'p[data-test-selector="preview-content-broadcaster-streaming-status"]',
  ],
  LOCK_KEYWORDS: [
    'サブスクライバー向け',
    'サブスクライバー限定',
    '無料プレビューの期間が終了',
    'Subscriber-Only',
    'Subscribers Only',
    'この配信はサブスクライバー限定',
    'サブスクライブして',
    'Subscribe to continue',
    'Subscribe to watch',
  ],
} as const;

/**
 * オフライン配信検知用セレクタとキーワード
 */
export const OFFLINE_SELECTORS = {
  ELEMENTS: [
    '[data-a-target="player-overlay-offline"]',
    '[data-a-target="user-channel-offline-hero"]',
    '.channel-status-info--offline',
    '.channel-root--offline',
    '[data-test-selector="offline-channel-header"]',
  ],
  STATUS_INDICATORS: [
    '[data-test-selector="stream-info-card-component__subtitle"]',
    '.tw-channel-status-text-indicator',
    '[data-a-target="channel-header-avatar"] ~ div',
    '.channel-header',
  ],
  OFFLINE_KEYWORDS: [
    'オフライン',
    'Offline',
    'オフラインです',
    'currently offline',
  ],
  LIVE_INDICATOR: '[data-a-target="live-indicator"], .tw-channel-status-indicator--live',
  SYSTEM_RESERVED_PATHS: [
    'directory',
    'settings',
    'subscriptions',
    'wallet',
    'downloads',
    'p',
    'search',
    'videos',
    'moderator',
    'popout',
  ],
} as const;
