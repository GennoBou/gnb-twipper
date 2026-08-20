import { mount, unmount } from 'svelte';
import GnbNavTrigger from './GnbNavTrigger.svelte';
import type { AppSettings, AutoState, StreamInfo } from '../types';

if (typeof window !== 'undefined') {
  console.log('[gnb-twipper] Content Script Initialized on Twitch');
}

let triggerComponent: any = null;
let currentSettings: AppSettings = {
  rotationTimeMinutes: 3,
  autoStartOnLogin: true,
  language: 'ja',
  customCss: '',
  customJs: '',
  customCssEnabled: false,
  customJsEnabled: false,
};
let currentAutoState: AutoState = {
  isActive: false,
  timeRemainingSeconds: 0,
  totalDurationSeconds: 180,
  currentChannel: '',
};
let currentStreamers: StreamInfo[] = [];

// Custom Injection Elements
let customStyleElement: HTMLStyleElement | null = null;
let customScriptElement: HTMLScriptElement | null = null;

// Find Twitch Nav Search Container and ensure flex row layout
function findTwitchSearchTarget(): { container: HTMLElement; searchBox: HTMLElement } | null {
  const searchBox = document.querySelector('div[data-a-target="nav-search-box"]') as HTMLElement
    || document.querySelector('div[data-a-target="nav-search-input"]') as HTMLElement;

  if (searchBox && searchBox.parentElement) {
    const container = searchBox.parentElement as HTMLElement;
    // Force horizontal flex layout on search container so button stays on the right
    container.style.setProperty('display', 'flex', 'important');
    container.style.setProperty('flex-direction', 'row', 'important');
    container.style.setProperty('align-items', 'center', 'important');
    return { container, searchBox };
  }

  // Fallback: Left/Center area of top navbar
  const topNav = document.querySelector('nav[data-a-target="top-nav"]') || document.querySelector('nav');
  if (topNav) {
    const centerDiv = (topNav.querySelector('div[class*="center"]') || topNav.children[1] || topNav) as HTMLElement;
    if (centerDiv) {
      centerDiv.style.setProperty('display', 'flex', 'important');
      centerDiv.style.setProperty('flex-direction', 'row', 'important');
      centerDiv.style.setProperty('align-items', 'center', 'important');
      return { container: centerDiv, searchBox: centerDiv };
    }
  }

  return null;
}

// Safe sendMessage helper to avoid "Extension context invalidated" errors
function safeSendMessage(message: any, responseCallback?: (response: any) => void) {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          // Extension context invalidated or port closed silently
          return;
        }
        if (responseCallback) responseCallback(res);
      });
    }
  } catch (e) {
    // Context invalidated
  }
}

function remountTriggerComponent() {
  const root = document.getElementById('gnb-twipper-trigger-root');
  if (!root) {
    initNavTrigger();
    return;
  }
  if (triggerComponent) {
    try { unmount(triggerComponent); } catch (e) {}
    triggerComponent = null;
  }
  root.innerHTML = '';

  triggerComponent = mount(GnbNavTrigger, {
    target: root,
    props: {
      autoState: currentAutoState,
      settings: currentSettings,
      liveStreamers: currentStreamers,
      onToggleAuto: () => {
        if (currentAutoState.isActive) {
          safeSendMessage({ type: 'STOP_AUTO_MODE' });
        } else {
          safeSendMessage({ type: 'START_AUTO_MODE' });
        }
      },
      onSkip: () => {
        safeSendMessage({ type: 'SKIP_NEXT' });
      },
      onSelectChannel: (channel: string) => {
        safeSendMessage({ type: 'SELECT_STREAMER', channel });
      },
      onOpenOptions: () => {
        safeSendMessage({ type: 'OPEN_OPTIONS' });
      },
    },
  });
}

function initNavTrigger() {
  if (document.getElementById('gnb-twipper-trigger-root')) {
    remountTriggerComponent();
    return;
  }

  const target = findTwitchSearchTarget();
  if (!target) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'gnb-twipper-trigger-root';
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.marginLeft = '8px';
  wrapper.style.flexShrink = '0';

  // Insert right after search box element
  if (target.searchBox && target.searchBox.nextSibling) {
    target.container.insertBefore(wrapper, target.searchBox.nextSibling);
  } else {
    target.container.appendChild(wrapper);
  }

  // Extract current channel from URL path
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    currentAutoState.currentChannel = pathParts[0];
  }

  remountTriggerComponent();

  // Request initial state from background
  safeSendMessage({ type: 'GET_SETTINGS' }, (res) => {
    if (res) {
      if (res.settings) applySettings(res.settings);
      if (res.autoState) currentAutoState = res.autoState;
      if (res.liveStreamers) currentStreamers = res.liveStreamers;
      remountTriggerComponent();
    }
  });
}

function applySettings(newSettings: AppSettings) {
  const cssChanged =
    !currentSettings ||
    currentSettings.customCss !== newSettings.customCss ||
    currentSettings.customCssEnabled !== newSettings.customCssEnabled;

  const jsChanged =
    !currentSettings ||
    currentSettings.customJs !== newSettings.customJs ||
    currentSettings.customJsEnabled !== newSettings.customJsEnabled;

  // Custom CSS Injection (実際に変更があった場合のみDOM更新)
  if (cssChanged) {
    if (newSettings.customCssEnabled && newSettings.customCss) {
      if (!customStyleElement) {
        customStyleElement = document.createElement('style');
        customStyleElement.id = 'gnb-twipper-custom-css';
        document.head.appendChild(customStyleElement);
      }
      customStyleElement.textContent = newSettings.customCss;
    } else if (customStyleElement) {
      customStyleElement.textContent = '';
    }
  }

  // Custom JS Injection (初回または設定変更時のみスクリプト送信)
  if (jsChanged && newSettings.customJsEnabled && newSettings.customJs && newSettings.customJs.trim()) {
    safeSendMessage({
      type: 'EXECUTE_CUSTOM_JS',
      code: newSettings.customJs,
    });
  }

  currentSettings = newSettings;
}

function scrapeLiveStreamersFromDOM(): StreamInfo[] {
  const streamers: StreamInfo[] = [];

  // Helper to clean accessibility tooltips or right-arrow instructions
  const cleanText = (str: string | null | undefined): string => {
    if (!str) return '';
    if (str.includes('詳細情報') || str.includes('詳細') || str.includes('Press right arrow') || str.includes('押すと')) return '';
    return str.trim();
  };

  // Find Left Navigation Container specifically (STRICTLY exclude right chat panel)
  let leftNav =
    document.querySelector('[data-a-target="side-nav-bar"]') ||
    document.querySelector('nav[aria-label*="左ナビゲーション"]') ||
    document.querySelector('nav[aria-label*="Left Navigation"]');

  if (!leftNav) {
    const candidateNavs = Array.from(document.querySelectorAll<HTMLElement>('aside, nav, [aria-label*="ナビゲーション"], [aria-label*="Navigation"]'));
    leftNav = candidateNavs.find((el) => {
      // Must NOT be inside or equal to right column / chat room
      const isRightChat =
        el.closest('[data-a-target="right-column"]') ||
        el.classList.contains('chat-room') ||
        !!el.querySelector('[data-a-target="chat-scroller"]') ||
        !!el.querySelector('[data-a-target="chat-input"]');
      return !isRightChat;
    }) || null;
  }

  if (!leftNav) {
    console.warn('[gnb-twipper] Left SideNav container not found on page');
    return [];
  }

  // Dump sections info from user's live browser console for exact verification
  const sectionsInfo = Array.from(leftNav.querySelectorAll('div[aria-label], section[aria-label], [data-a-target]')).map(el => ({
    tag: el.tagName,
    dataTarget: el.getAttribute('data-a-target'),
    ariaLabel: el.getAttribute('aria-label'),
    textSample: el.textContent?.substring(0, 30)?.trim(),
  }));
  console.log('[gnb-twipper] REAL USER BROWSER Left SideNav Sections:', sectionsInfo);

  // Locate Followed Channels Section STRICTLY using verified aria-label "フォローしているチャンネル"
  const followedSection =
    leftNav.querySelector('[aria-label*="フォローしているチャンネル"]') ||
    leftNav.querySelector('[aria-label*="フォロー中のチャンネル"]') ||
    leftNav.querySelector('[aria-label*="Followed Channels"]') ||
    leftNav.querySelector('[data-a-target="side-nav-section-followed-channels"]') ||
    leftNav.querySelector('[data-test-selector="followed-channels"]');

  let cardLinks: HTMLAnchorElement[] = [];

  if (followedSection) {
    console.log('[gnb-twipper] Found EXACT followedSection container:', followedSection.getAttribute('aria-label'));
    cardLinks = Array.from(followedSection.querySelectorAll<HTMLAnchorElement>('a[href]'));
  } else {
    console.log('[gnb-twipper] followedSection container not matched, filtering by non-followed sections');
    
    // Exclude recommended live channels and recommended categories sections
    const excludedSections = Array.from(leftNav.querySelectorAll(
      '[aria-label*="ライブ配信中のチャンネル"], [aria-label*="おすすめ"], [aria-label*="Recommended"], [data-a-target="side-nav-section-recommended-channels"]'
    ));

    const allLinks = Array.from(leftNav.querySelectorAll<HTMLAnchorElement>('a[href]'));
    cardLinks = allLinks.filter(a => !excludedSections.some(sec => sec.contains(a)));
  }

  console.log('[gnb-twipper] Candidate links in followed section count:', cardLinks.length);

  cardLinks.forEach((a) => {
    const rawHref = a.getAttribute('href') || a.href;
    if (!rawHref) return;

    let path = '';
    try {
      const url = new URL(rawHref, window.location.origin);
      path = url.pathname;
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
      return;
    }

    const userLogin = path.replace(/^\//, '').split('/')[0].toLowerCase();
    if (!userLogin || userLogin.includes('.')) return;

    // Filter OUT offline channels!
    // Strict Twitch CSS class offline check for both Expanded and Collapsed SideNav
    const isOfflineAvatar = !!a.querySelector('.side-nav-card__avatar--offline, .tw-avatar--offline');
    const isOfflineText = a.textContent?.includes('オフライン') || a.textContent?.includes('Offline');

    if (isOfflineAvatar || isOfflineText) {
      console.log('[gnb-twipper] Skipping offline channel:', userLogin);
      return;
    }

    const imgEl = a.querySelector<HTMLImageElement>('img');
    const profileImageUrl = imgEl?.src || '';

    const rawAria = a.getAttribute('aria-label') || a.getAttribute('title') || '';
    let extractedNameFromAria = '';
    if (rawAria) {
      // "表示名 (login_id)" や "表示名" のパターンから表示名を抽出
      const match = rawAria.match(/^([^(]+)\s*\([^)]+\)/);
      if (match) {
        extractedNameFromAria = cleanText(match[1]);
      } else {
        extractedNameFromAria = cleanText(rawAria.split('\n')[0]);
      }
    }

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

    const gameEl =
      a.querySelector('[data-a-target="side-nav-game-title"]') ||
      a.querySelector('.side-nav-card__game');
    const gameName = cleanText(gameEl?.textContent);

    const recapEl =
      a.querySelector('[data-a-target="side-nav-live-recap"]') ||
      a.querySelector('.side-nav-card__live-stat');

    let viewerCount = 0;
    const fullText = (recapEl?.textContent || a.getAttribute('aria-label') || a.textContent || '').replace(/,/g, '');
    const numMatch = fullText.match(/(\d+(\.\d+)?)/);
    if (numMatch) {
      let val = parseFloat(numMatch[1]);
      if (fullText.includes('万')) val *= 10000;
      else if (fullText.toLowerCase().includes('k')) val *= 1000;
      viewerCount = Math.round(val);
    }

    if (!streamers.some((s) => s.user_login.toLowerCase() === userLogin)) {
      streamers.push({
        user_login: userLogin,
        user_name: userName,
        game_name: gameName,
        profile_image_url: profileImageUrl,
        viewer_count: viewerCount,
      });
    }
  });

  console.log('[gnb-twipper] EXACT Followed LIVE streamers count from DOM:', streamers.length, streamers);
  return streamers;
}

function performAndSendDomScrape() {
  const streamers = scrapeLiveStreamersFromDOM();
  console.log('[gnb-twipper] DOM Scrape found streamers:', streamers.length, streamers);
  safeSendMessage({
    type: 'UPDATE_STREAMERS_FROM_DOM',
    streamers,
  });
}

// Listen for updates or scrape requests from background
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    try {
      if (msg.type === 'AUTO_STATE_UPDATE') {
        if (msg.autoState) currentAutoState = msg.autoState;
        if (msg.settings) applySettings(msg.settings);
        if (msg.liveStreamers) currentStreamers = msg.liveStreamers;
      } else if (msg.type === 'SCRAPE_LIVE_STREAMERS_REQUEST') {
        console.log('[gnb-twipper] Received SCRAPE_LIVE_STREAMERS_REQUEST from background (Fallback Triggered)');
        performAndSendDomScrape();
      } else if (msg.type === 'NAVIGATE_TO_CHANNEL_REPLACE') {
        if (msg.channel) {
          const targetUrl = `https://www.twitch.tv/${msg.channel}`;
          // 履歴を増やさずに現在の履歴エントリを上書きして遷移
          window.location.replace(targetUrl);
        }
      }
    } catch (e) {
      // Context invalidated
    }
  });
}

// Content script DOM initialization (using document check so bundler does not tree-shake)
if (typeof document !== 'undefined') {
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      if (!document.getElementById('gnb-twipper-trigger-root')) {
        initNavTrigger();
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Initialize trigger button on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initNavTrigger();
    });
  } else {
    initNavTrigger();
  }
}

// Sub-only stream lock detection and auto-skip logic
let lastLockedChannel: string | null = null;

function checkSubOnlyLock() {
  const currentPath = window.location.pathname.replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
  if (!currentPath || currentPath.includes('.')) return;

  // Search Twitch player overlay for sub-only lock indicators
  const overlayContent =
    document.querySelector('.preview-overlay') ||
    document.querySelector('.preview-overlay__content') ||
    document.querySelector('[data-test-selector="preview-content-broadcaster-streaming-status"]') ||
    document.querySelector('[data-a-target="player-overlay-content"]') ||
    document.querySelector('.player-overlay-background') ||
    document.querySelector('[data-a-target="player-overlay-gate"]') ||
    document.querySelector('.sub-only-container') ||
    document.querySelector('[data-test-selector="sub-only-gate"]');

  let isLocked = false;

  if (overlayContent) {
    const text = overlayContent.textContent || '';
    if (
      text.includes('サブスクライバー向け') ||
      text.includes('サブスクライバー限定') ||
      text.includes('無料プレビューの期間が終了') ||
      text.includes('Subscriber-Only') ||
      text.includes('Subscribers Only') ||
      text.includes('この配信はサブスクライバー限定') ||
      text.includes('サブスクライブして') ||
      text.includes('Subscribe to continue') ||
      text.includes('Subscribe to watch')
    ) {
      isLocked = true;
    }
  }

  if (!isLocked) {
    // Additional check: Sub-only badge or locked player gates
    const lockElement =
      document.querySelector('div[class*="sub-only-container"]') ||
      document.querySelector('div[class*="sub_only_container"]') ||
      document.querySelector('p[data-test-selector="preview-content-broadcaster-streaming-status"]');

    if (lockElement && lockElement.textContent?.includes('サブスクライバー')) {
      isLocked = true;
    }
  }

  if (isLocked) {
    if (lastLockedChannel !== currentPath) {
      lastLockedChannel = currentPath;
      console.log(`[gnb-twipper] Detected sub-only stream lock on @${currentPath}. Sending DETECTED_SUB_ONLY_LOCK to background.`);
      safeSendMessage({
        type: 'DETECTED_SUB_ONLY_LOCK',
        channel: currentPath,
      });
    }
  } else {
    if (lastLockedChannel === currentPath) {
      lastLockedChannel = null;
    }
  }
}

// Periodic timer to monitor player lock state (every 1.5s)
if (typeof window !== 'undefined') {
  window.setInterval(() => {
    try {
      checkSubOnlyLock();
    } catch (e) {
      // Ignore background context invalidations
    }
  }, 1500);
}

