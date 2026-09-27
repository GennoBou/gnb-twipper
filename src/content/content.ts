import { mount, unmount } from 'svelte';
import GnbNavTrigger from './GnbNavTrigger.svelte';
import type { AppSettings, AutoState, StreamInfo, ExtensionMessage } from '../types';
import { safeSendMessage } from '../utils/messaging';
import { NAV_SELECTORS } from './selectors';
import { findTwitchSearchTarget, createTriggerRootWrapper, insertTriggerRoot, applyCustomCss } from './ui-injector';
import { findLeftSideNav, getFollowedCardLinks, scrapeLiveStreamersFromDOM } from './dom-scraper';
import { PlayerMonitor, getCurrentChannelPath, isSubOnlyLocked, isStreamOffline } from './player-monitor';
import {
  cleanText,
  extractUserLoginFromHref,
  isOfflineChannel,
  extractUserNameFromAria,
  extractUserName,
  parseViewerCount,
  parseStreamerFromLink,
} from './streamer-parser';

// 外部およびテスト用 re-export
export {
  cleanText,
  extractUserLoginFromHref,
  isOfflineChannel,
  extractUserNameFromAria,
  extractUserName,
  parseViewerCount,
  parseStreamerFromLink,
  findLeftSideNav,
  getFollowedCardLinks,
  scrapeLiveStreamersFromDOM,
  findTwitchSearchTarget,
  applyCustomCss,
  getCurrentChannelPath,
  isSubOnlyLocked,
  isStreamOffline,
  PlayerMonitor,
};

if (typeof window !== 'undefined') {
  console.log('[gnb-twipper] Content Script Initialized on Twitch');
}

let triggerComponent: ReturnType<typeof mount> | null = null;
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

// カスタム CSS <style> 要素の参照
let customStyleElement: HTMLStyleElement | null = null;

// Svelte ナビゲーションコンポーネントのマウント・再描画
function remountTriggerComponent() {
  const root = document.getElementById(NAV_SELECTORS.TRIGGER_ROOT_ID);
  if (!root) {
    initNavTrigger();
    return;
  }
  if (triggerComponent) {
    try {
      unmount(triggerComponent);
    } catch (e) {}
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

// ナビゲーションバーへのトリガーボタンの初期配置
function initNavTrigger() {
  if (document.getElementById(NAV_SELECTORS.TRIGGER_ROOT_ID)) {
    remountTriggerComponent();
    return;
  }

  const target = findTwitchSearchTarget(document);
  if (!target) {
    return;
  }

  const wrapper = createTriggerRootWrapper(document);
  insertTriggerRoot(target, wrapper);

  // URL パスから現在のチャンネル名を抽出
  const channel = getCurrentChannelPath();
  if (channel) {
    currentAutoState.currentChannel = channel;
  }

  remountTriggerComponent();

  // Background へ初期状態（設定・自動巡回状態・配信者一覧）を要求
  safeSendMessage({ type: 'GET_SETTINGS' }, (res) => {
    if (res) {
      if (res.settings) applySettings(res.settings);
      if (res.autoState) currentAutoState = res.autoState;
      if (res.liveStreamers) currentStreamers = res.liveStreamers;
      remountTriggerComponent();
    }
  });
}

// 設定変更の適用（カスタム CSS の挿入・更新）
function applySettings(newSettings: AppSettings) {
  const cssChanged =
    !currentSettings ||
    currentSettings.customCss !== newSettings.customCss ||
    currentSettings.customCssEnabled !== newSettings.customCssEnabled;

  if (cssChanged) {
    customStyleElement = applyCustomCss(
      newSettings.customCss,
      !!newSettings.customCssEnabled,
      customStyleElement,
      document
    );
  }

  currentSettings = newSettings;
}

// DOM スクレイピングを実行し、結果を Background Service Worker へ送信
function performAndSendDomScrape() {
  const streamers = scrapeLiveStreamersFromDOM(document);
  console.log('[gnb-twipper] DOM Scrape found streamers:', streamers.length, streamers);
  safeSendMessage({
    type: 'UPDATE_STREAMERS_FROM_DOM',
    streamers,
  });
}

// Background からのメッセージリスナー登録
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg: ExtensionMessage, _sender, sendResponse) => {
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
          const currentPath = getCurrentChannelPath();
          const targetChannel = msg.channel.toLowerCase();

          // すでに同一チャンネルを視聴中の場合は再遷移を行わない
          if (currentPath === targetChannel) {
            console.log(`[gnb-twipper] Already on channel @${msg.channel}. Skipping navigation.`);
            if (sendResponse) sendResponse({ success: true, skipped: true });
            return true;
          }

          const targetUrl = `https://www.twitch.tv/${msg.channel}`;
          if (sendResponse) sendResponse({ success: true });

          // Background側がレスポンスを受け取ってから履歴を増やさずに上書き遷移
          setTimeout(() => {
            window.location.replace(targetUrl);
          }, 50);
          return true;
        }
      }
    } catch (e) {
      // Context invalidated
    }
    return false;
  });
}

// DOM初期化および監視（MutationObserver）
if (typeof document !== 'undefined' && process.env.NODE_ENV !== 'test') {
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      if (!document.getElementById(NAV_SELECTORS.TRIGGER_ROOT_ID)) {
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

  // ページ読み込み完了時のトリガーボタン初期化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initNavTrigger();
    });
  } else {
    initNavTrigger();
  }
}

// プレイヤー監視マネージャーの初期化
const playerMonitor = new PlayerMonitor({
  onSubOnlyLockDetected: (channel) => {
    safeSendMessage({
      type: 'DETECTED_SUB_ONLY_LOCK',
      channel,
    });
  },
  onOfflineDetected: (channel) => {
    safeSendMessage({
      type: 'DETECTED_OFFLINE',
      channel,
    });
  },
});

// 定期タイマーによるサブスクロック・オフライン状態の監視（1.5秒間隔）
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'test') {
  window.setInterval(() => {
    try {
      playerMonitor.checkSubOnlyLock(document, window.location);
      playerMonitor.checkOfflineState(document, window.location);
    } catch (e) {
      // Background context invalidated 時の例外は無視
    }
  }, 1500);
}
