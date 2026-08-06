import { mount } from 'svelte';
import OverlayUI from './OverlayUI.svelte';
import type { AppSettings, AutoState, StreamInfo } from '../types';

let overlayComponent: any = null;
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

function initOverlay() {
  if (document.getElementById('gnb-twview-root')) return;

  // Shift Twitch body down by 40px to fit top navbar
  document.documentElement.style.marginTop = '40px';

  const container = document.createElement('div');
  container.id = 'gnb-twview-root';
  document.body.appendChild(container);

  // Extract current channel from URL path (e.g. twitch.tv/fps_shaka)
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  if (pathParts.length > 0) {
    currentAutoState.currentChannel = pathParts[0];
  }

  // Mount Svelte 5 Overlay UI
  overlayComponent = mount(OverlayUI, {
    target: container,
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

// Initialize Overlay on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOverlay);
} else {
  initOverlay();
}
