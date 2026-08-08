import { mount, unmount } from 'svelte';
import GnbNavTrigger from './GnbNavTrigger.svelte';
import type { AppSettings, AutoState, StreamInfo } from '../types';

let triggerComponent: any = null;
let currentSettings: AppSettings = {
  rotationTimeMinutes: 3,
  autoStartOnLogin: true,
  language: 'ja',
  customCss: '',
  customJs: '',
  customCssEnabled: true,
  customJsEnabled: true,
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

function remountTriggerComponent() {
  const root = document.getElementById('gnb-twview-trigger-root');
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
          chrome.runtime.sendMessage({ type: 'STOP_AUTO_MODE' });
        } else {
          chrome.runtime.sendMessage({ type: 'START_AUTO_MODE' });
        }
      },
      onSkip: () => {
        chrome.runtime.sendMessage({ type: 'SKIP_NEXT' });
      },
      onSelectChannel: (channel: string) => {
        chrome.runtime.sendMessage({ type: 'SELECT_STREAMER', channel });
      },
      onOpenOptions: () => {
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
      },
    },
  });
}

function initNavTrigger() {
  if (document.getElementById('gnb-twview-trigger-root')) {
    remountTriggerComponent();
    return;
  }

  const target = findTwitchSearchTarget();
  if (!target) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'gnb-twview-trigger-root';
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
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
    if (res) {
      if (res.settings) applySettings(res.settings);
      if (res.autoState) currentAutoState = res.autoState;
      if (res.liveStreamers) currentStreamers = res.liveStreamers;
      remountTriggerComponent();
    }
  });
}

function applySettings(newSettings: AppSettings) {
  currentSettings = newSettings;

  // Custom CSS Injection
  if (newSettings.customCssEnabled && newSettings.customCss) {
    if (!customStyleElement) {
      customStyleElement = document.createElement('style');
      customStyleElement.id = 'gnb-twview-custom-css';
      document.head.appendChild(customStyleElement);
    }
    customStyleElement.textContent = newSettings.customCss;
  } else if (customStyleElement) {
    customStyleElement.textContent = '';
  }

  // Custom JS Injection via Background (bypasses page CSP inline script violation)
  if (newSettings.customJsEnabled && newSettings.customJs && newSettings.customJs.trim()) {
    chrome.runtime.sendMessage({
      type: 'EXECUTE_CUSTOM_JS',
      code: newSettings.customJs,
    });
  }
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

    const titleEl =
      a.querySelector('[data-a-target="side-nav-title"]') ||
      a.querySelector('.side-nav-card__title') ||
      a.querySelector('p') ||
      a.querySelector('span');

    let userName = cleanText(titleEl?.textContent);
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
  if (streamers.length > 0) {
    console.log('[gnb-twipper] DOM Scrape found streamers:', streamers.length, streamers);
    chrome.runtime.sendMessage({
      type: 'UPDATE_STREAMERS_FROM_DOM',
      streamers,
    }).catch(() => {});
  }
}

// Listen for updates or scrape requests from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AUTO_STATE_UPDATE') {
    if (msg.autoState) currentAutoState = msg.autoState;
    if (msg.settings) applySettings(msg.settings);
    if (msg.liveStreamers) currentStreamers = msg.liveStreamers;
    // Note: GnbNavTrigger handles AUTO_STATE_UPDATE internally without unmounting!
  } else if (msg.type === 'SCRAPE_LIVE_STREAMERS_REQUEST') {
    console.log('[gnb-twipper] Received SCRAPE_LIVE_STREAMERS_REQUEST from background (Fallback Triggered)');
    performAndSendDomScrape();
  }
});

// Observe DOM changes to re-inject trigger button if Twitch SPA replaces header
const observer = new MutationObserver(() => {
  if (!document.getElementById('gnb-twview-trigger-root')) {
    initNavTrigger();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Initialize trigger button on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initNavTrigger();
  });
} else {
  initNavTrigger();
}

