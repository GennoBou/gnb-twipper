import { mount } from 'svelte';
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

// Find Twitch Nav Search Container
function findTwitchSearchTarget(): HTMLElement | null {
  // Selector candidates for Twitch Header Search Bar area
  const selectors = [
    'div[data-a-target="nav-search-input"]',
    'div[data-a-target="nav-search-box"]',
    'div[data-a-target="search-box"]',
    'div.navigation-link[data-a-target="nav-search"]',
    'form[data-a-target="nav-search-input"]',
    'nav div[class*="search"]',
  ];

  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.parentElement) {
      return el.parentElement as HTMLElement;
    }
  }

  // Fallback: Left/Center area of top navbar
  const topNav = document.querySelector('nav[data-a-target="top-nav"]') || document.querySelector('nav');
  if (topNav) {
    const centerDiv = topNav.querySelector('div[class*="center"]') || topNav.children[1] || topNav;
    return centerDiv as HTMLElement;
  }

  return null;
}

function initNavTrigger() {
  if (document.getElementById('gnb-twview-trigger-root')) return;

  const targetContainer = findTwitchSearchTarget();
  if (!targetContainer) {
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.id = 'gnb-twview-trigger-root';
  wrapper.style.display = 'inline-flex';
  wrapper.style.alignItems = 'center';

  // Append right next to the search box
  targetContainer.appendChild(wrapper);

  // Extract current channel from URL path
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    currentAutoState.currentChannel = pathParts[0];
  }

  // Mount Svelte 5 Trigger Component
  triggerComponent = mount(GnbNavTrigger, {
    target: wrapper,
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
        chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : window.open(chrome.runtime.getURL('src/options/index.html'));
      },
    },
  });

  // Request initial state from background
  chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
    if (res) {
      if (res.settings) applySettings(res.settings);
      if (res.autoState) currentAutoState = res.autoState;
      if (res.liveStreamers) currentStreamers = res.liveStreamers;
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

  // Custom JS Injection
  if (newSettings.customJsEnabled && newSettings.customJs) {
    try {
      if (customScriptElement) customScriptElement.remove();
      customScriptElement = document.createElement('script');
      customScriptElement.id = 'gnb-twview-custom-js';
      customScriptElement.textContent = newSettings.customJs;
      document.head.appendChild(customScriptElement);
    } catch (err) {
      console.error('[gnb-twview] Custom JS injection error:', err);
    }
  }
}

// Listen for updates from background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'AUTO_STATE_UPDATE') {
    if (msg.autoState) currentAutoState = msg.autoState;
    if (msg.settings) applySettings(msg.settings);
    if (msg.liveStreamers) currentStreamers = msg.liveStreamers;
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

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavTrigger);
} else {
  initNavTrigger();
}
