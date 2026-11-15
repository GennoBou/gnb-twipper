import type { AppSettings, StreamInfo, AutoState, ExtensionMessage } from '../types';
import { extractChannelFromUrl } from '../utils/url';
import { getRotationTargetStreamers as getRotationTargetStreamersUtil, getAutoRotationCandidates as getAutoRotationCandidatesUtil } from './rotation';
import { getTwitchAuthToken, getTwitchDeviceId } from './auth';
import { syncCustomUserScript, checkUserScriptsStatus, getUserScriptsApi } from './userScripts';
import {
  watchTimeMap,
  setWatchTimeMap,
  getWatchTimeMap,
  attachWatchTimeAndCleanup,
  incrementWatchTime,
  removeWatchTime,
} from './watchTime';

import {
  sendFollowedLiveGqlRequest,
  parseFollowedLiveGqlResponse,
  checkSubOnlyAuthViaGql as checkSubOnlyAuthViaGqlUtil,
} from './gql';

export {
  getTwitchAuthToken,
  getTwitchDeviceId,
  syncCustomUserScript,
  checkUserScriptsStatus,
  getUserScriptsApi,
  watchTimeMap,
  setWatchTimeMap,
  getWatchTimeMap,
  attachWatchTimeAndCleanup,
  sendFollowedLiveGqlRequest,
  parseFollowedLiveGqlResponse,
  checkSubOnlyAuthViaGql,
  getPrimaryTabId,
  setPrimaryTabId,
};

console.log('[gnb-twipper] Background Service Worker Initialized');

const DEFAULT_SETTINGS: AppSettings = {
  rotationTimeMinutes: 3,
  autoStartOnLogin: true,
  language: 'ja',
  customCss: '',
  customJs: '',
  customCssEnabled: false,
  customJsEnabled: false,
  excludedChannels: [],
  skipSubOnlyStreams: false,
  allowSubOnlyFreePreview: true,
};

const INITIAL_PRIORITY_WATCH_TIME_SECONDS = 600; // 10分 (初期目標視聴時間: 未視聴・新規配信者の優先巡回基準)

/**
 * 巡回時間（分）を 1〜60 の有効な整数に正規化する（0・負数・NaN・null による無限リロードループを防止）
 */
export function normalizeRotationMinutes(val: unknown): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(num) || num < 1) return DEFAULT_SETTINGS.rotationTimeMinutes;
  return Math.min(60, Math.max(1, Math.round(num)));
}

let settings: AppSettings = { ...DEFAULT_SETTINGS };
let cachedExcludedLogins: Set<string> = new Set();

function updateExcludedLoginsCache(): void {
  if (!settings.excludedChannels || settings.excludedChannels.length === 0) {
    cachedExcludedLogins = new Set();
    return;
  }
  const newSet = new Set<string>();
  for (const item of settings.excludedChannels) {
    if (item.enabled) {
      newSet.add(item.user_login.toLowerCase());
    }
  }
  cachedExcludedLogins = newSet;
}

updateExcludedLoginsCache();

let liveStreamers: StreamInfo[] = [];
let liveStreamersByLogin = new Map<string, StreamInfo>();

function updateLiveStreamers(newStreamers: StreamInfo[]): void {
  liveStreamers = newStreamers;
  const newMap = new Map<string, StreamInfo>();
  for (const s of newStreamers) {
    newMap.set(s.user_login.toLowerCase(), s);
  }
  liveStreamersByLogin = newMap;
}
let autoState: AutoState = {
  isActive: false,
  isStandby: false,
  timeRemainingSeconds: 0,
  totalDurationSeconds: 180,
  currentChannel: '',
};

let userManuallyStopped = false; // ユーザーが手動でオートモードを停止したフラグ

let countdownTimer: number | null = null;
let watchTimer: number | null = null;

let cachedActiveTwitchChannel: string | null = null;
let cachedTwitchTabIds: Set<number> = new Set();
let primaryTabId: number | null = null;

/**
 * 現在オートモードの制御対象となっているプライマリタブの ID を取得する
 */
function getPrimaryTabId(): number | null {
  return primaryTabId;
}

/**
 * プライマリタブ ID を設定し、セッションストレージへ永続化する
 */
function setPrimaryTabId(tabId: number | null): void {
  primaryTabId = tabId;
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.session?.set) {
      Promise.resolve(chrome.storage.session.set({ primaryTabId: tabId })).catch(() => {});
    }
  } catch {
    // テスト環境等で session storage が未定義の場合は無視
  }
}

// Service Worker 再起動時にプライマリタブ ID を復元
try {
  if (typeof chrome !== 'undefined' && chrome.storage?.session?.get) {
    Promise.resolve(chrome.storage.session.get(['primaryTabId']))
      .then((res) => {
        if (res && typeof res.primaryTabId === 'number' && primaryTabId === null) {
          primaryTabId = res.primaryTabId;
        }
      })
      .catch(() => {});
  }
} catch {
  // テスト環境等で session storage が未定義の場合は無視
}

/**
 * 指定タブ向けの AutoState（他タブでのオート稼働ロック状態を含む）を生成する
 */
function getAutoStateForTab(tabId?: number): AutoState {
  const isLockedByOtherTab = Boolean(
    autoState.isActive &&
      primaryTabId !== null &&
      tabId !== undefined &&
      tabId !== primaryTabId
  );
  return {
    ...autoState,
    isLockedByOtherTab,
  };
}

/**
 * Twitch タブ一覧から優先対象となるタブ（アクティブ優先、なければ先頭）を選出する
 */
function selectPrimaryTabFromList(tabs?: chrome.tabs.Tab[] | null): chrome.tabs.Tab | undefined {
  if (!tabs || tabs.length === 0) return undefined;
  return tabs.find((t) => t.active && t.url) || tabs.find((t) => t.active) || tabs[0];
}

export function refreshActiveTwitchChannelCache(): void {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) return;
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.lastError) return;
    let activeChannel: string | null = null;
    const newTabIds = new Set<number>();
    if (tabs) {
      tabs.forEach((t) => {
        if (t.id) newTabIds.add(t.id);
      });
      const primaryTab = primaryTabId !== null ? tabs.find((t) => t.id === primaryTabId) : undefined;
      const targetTab =
        primaryTab || tabs.find((t) => t.active && t.url) || (tabs.length > 0 ? tabs[0] : undefined);
      if (targetTab && targetTab.url) {
        activeChannel = extractChannelFromUrl(targetTab.url);
      }
    }
    cachedTwitchTabIds = newTabIds;
    cachedActiveTwitchChannel = activeChannel ? activeChannel.toLowerCase() : null;
  });
}

export function getCachedActiveTwitchChannel(): string | null {
  return cachedActiveTwitchChannel;
}

export function getCachedTwitchTabIds(): Set<number> {
  return cachedTwitchTabIds;
}

/**
 * プライマリタブが閉じられた、または Twitch 外へ遷移した場合にオートモードを安全に停止してロックを解除する
 */
function handlePrimaryTabLost(tabId: number): void {
  if (primaryTabId === null || tabId !== primaryTabId) return;
  if (autoState.isActive) {
    stopAutoMode();
  } else {
    setPrimaryTabId(null);
  }
}

// タブ関連のイベントリスナーを設定してアクティブチャンネルキャッシュおよびプライマリタブを更新
if (typeof chrome !== 'undefined' && chrome.tabs) {
  if (chrome.tabs.onActivated) {
    chrome.tabs.onActivated.addListener(() => {
      refreshActiveTwitchChannelCache();
    });
  }
  if (chrome.tabs.onRemoved) {
    chrome.tabs.onRemoved.addListener((tabId) => {
      handlePrimaryTabLost(tabId);
      refreshActiveTwitchChannelCache();
    });
  }
}

let dynamicClientId: string | null = null; // インストール時・401エラー時は白紙 (null)
let last401Time = 0;
const COOL_DOWN_401_MS = 60000; // 401発生後、1分間は無駄なGQL再判定の頻発を防止

// 保存済みの動的 Client-ID をロード (あれば使用、なければ白紙のまま)
chrome.storage.local.get(['detectedClientId'], (res) => {
  if (res && typeof res.detectedClientId === 'string') {
    dynamicClientId = res.detectedClientId;
    console.log('[gnb-twipper] Loaded saved Client-ID');
  } else {
    console.log('[gnb-twipper] Client-ID is initially empty (null). Waiting to capture from twitch.tv packet.');
  }
});

// Twitch タブからの GQL パケットをリアルタイム監視し、Client-ID を検出したら有効化
if (typeof chrome !== 'undefined' && chrome.webRequest && chrome.webRequest.onBeforeSendHeaders) {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
      if (details.requestHeaders) {
        const clientHeader = details.requestHeaders.find((h) => h.name.toLowerCase() === 'client-id');
        if (clientHeader && clientHeader.value) {
          if (dynamicClientId !== clientHeader.value) {
            console.log('[gnb-twipper] [Auto Detect] Captured valid Client-ID from Twitch packet');
            dynamicClientId = clientHeader.value;
            last401Time = 0; // 検出成功により401クールダウンを解除
            chrome.storage.local.set({ detectedClientId: dynamicClientId });
          }
        }
      }
      return undefined;
    },
    { urls: ['https://gql.twitch.tv/gql'] },
    ['requestHeaders']
  );
}


// API-level sub-only entitlement check via Twitch GQL PlaybackAccessToken
async function checkSubOnlyAuthViaGql(
  streamersOrLogins: string[] | { user_login: string }[]
): Promise<Record<string, boolean>> {
  const authToken = await getTwitchAuthToken();
  const deviceId = await getTwitchDeviceId();
  return checkSubOnlyAuthViaGqlUtil(streamersOrLogins, dynamicClientId, authToken, deviceId);
}


function startWatchTimer() {
  if (watchTimer !== null) return;
  refreshActiveTwitchChannelCache();
  watchTimer = self.setInterval(() => {
    let activeChannel = cachedActiveTwitchChannel;

    if (!activeChannel && autoState.isActive && autoState.currentChannel) {
      activeChannel = autoState.currentChannel.toLowerCase();
    }

    if (activeChannel) {
      const key = activeChannel.toLowerCase();
      watchTimeMap[key] = (watchTimeMap[key] || 0) + 1;

      const targetStreamer = liveStreamersByLogin.get(key);
      if (targetStreamer) {
        targetStreamer.watch_time_seconds = watchTimeMap[key];
        broadcastState();
      }
    }
  }, 1000) as unknown as number;
}

startWatchTimer();

async function isInitialAutoStarted(): Promise<boolean> {
  try {
    const res = await chrome.storage.session.get(['hasInitialAutoStarted']);
    return !!res.hasInitialAutoStarted;
  } catch (e) {
    return false;
  }
}

async function markInitialAutoStarted(): Promise<void> {
  try {
    await chrome.storage.session.set({ hasInitialAutoStarted: true });
  } catch (e) {
    console.error('[gnb-twipper] Error setting chrome.storage.session:', e);
  }
}

// Initialize settings from storage and handle autoStartOnLogin
chrome.storage.local.get(['settings'], async (result) => {
  if (result.settings) {
    settings = { ...DEFAULT_SETTINGS, ...result.settings };
    settings.rotationTimeMinutes = normalizeRotationMinutes(settings.rotationTimeMinutes);
  } else {
    chrome.storage.local.set({ settings });
  }
  updateExcludedLoginsCache();

  syncCustomUserScript(settings);

  const alreadyStarted = await isInitialAutoStarted();
  // Auto-start auto mode if autoStartOnLogin is enabled and not already running / triggered in session
  if (settings.autoStartOnLogin && !autoState.isActive && !alreadyStarted) {
    console.log('[gnb-twipper] autoStartOnLogin is enabled. Starting Auto Mode on extension init.');
    await markInitialAutoStarted();
    setTimeout(() => {
      startAutoMode();
    }, 1000);
  }
});


let zeroStreamerCount = 0;
let domScrapeRetryTimer: ReturnType<typeof setTimeout> | null = null;

// Request active Twitch tabs to scrape live streamers from DOM with optional retry
function requestDomScrapeFromTabs(retryCount = 0) {
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    if (!tabs) return;
    const hasPrimary = primaryTabId !== null && tabs.some((t) => t.id === primaryTabId);
    const targetTabs = hasPrimary ? tabs.filter((t) => t.id === primaryTabId) : tabs;
    targetTabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_LIVE_STREAMERS_REQUEST' }).catch(() => {});
      }
    });
  });

  // DOMがまだ未完成の場合を想定し、初期リトライをスケジュール (最大3回)
  if (retryCount < 3) {
    if (domScrapeRetryTimer) clearTimeout(domScrapeRetryTimer);
    domScrapeRetryTimer = setTimeout(() => {
      if (liveStreamers.length === 0) {
        console.log(`[gnb-twipper] Streamers count still 0. Retrying DOM scrape (attempt ${retryCount + 1}/3)...`);
        requestDomScrapeFromTabs(retryCount + 1);
      }
    }, 2500);
  }
}



let lastGqlFetchTime = 0;
const MIN_GQL_INTERVAL_MS = 5000; // 5秒以内の連続GQLリクエストを抑止



// Fetch followed live channels via Twitch GQL API
async function fetchFollowedLiveChannels(skipEvaluate = false): Promise<StreamInfo[]> {
  const now = Date.now();
  if (now - lastGqlFetchTime < MIN_GQL_INTERVAL_MS) {
    console.log(`[gnb-twipper] [GQL Throttle] Skipped GQL request (last request was ${now - lastGqlFetchTime}ms ago). Returning cached streamers (${liveStreamers.length}).`);
    return liveStreamers;
  }
  lastGqlFetchTime = now;

  // 未ログイン状態（auth-token Cookie 不在）の場合は GQL や DOM スクレイピングを行わず待機状態へ遷移
  const authToken = await getTwitchAuthToken();
  if (!authToken) {
    console.log('[gnb-twipper] User is not logged in (auth-token missing). Skipping GQL and DOM scrape.');
    updateLiveStreamers(attachWatchTimeAndCleanup([]));
    if (!skipEvaluate) {
      evaluateAutoState();
    }
    return liveStreamers;
  }

  // 1. Client-ID が白紙 (未検出) の場合は GQL を呼んで無駄な401を起こさず、DOMスクレイピングを使用
  if (!dynamicClientId) {
    console.log('[gnb-twipper] [GQL Init] Client-ID is empty (null). Waiting for Twitch tab packet to capture Client-ID. Using DOM scrape fallback.');
    requestDomScrapeFromTabs();
    return liveStreamers;
  }

  // 2. 直近で 401 エラーが発生した場合は 60 秒間のクールダウンを適用 (過剰な白紙化・連打防止)
  if (last401Time > 0 && now - last401Time < COOL_DOWN_401_MS) {
    console.log(`[gnb-twipper] [GQL Cooldown] 401 cooldown active (${Math.round((COOL_DOWN_401_MS - (now - last401Time)) / 1000)}s remaining). Using DOM scrape fallback.`);
    requestDomScrapeFromTabs();
    return liveStreamers;
  }

  try {
    const deviceId = await getTwitchDeviceId();
    const response = await sendFollowedLiveGqlRequest(dynamicClientId, authToken, deviceId);

    if (!response.ok) {
      console.warn(`[gnb-twipper] [GQL Response Error] HTTP ${response.status} ${response.statusText}.`);
      if (response.status === 401) {
        console.warn('[gnb-twipper] 401 Unauthorized detected. Resetting Client-ID to empty and starting 60s cooldown.');
        dynamicClientId = null;
        last401Time = now;
        chrome.storage.local.remove(['detectedClientId']);
      }
      requestDomScrapeFromTabs();
      return liveStreamers;
    }

    last401Time = 0; // 正常レスポンス時は 401 クールダウンをリセット
    console.log('[gnb-twipper] [GQL Response OK] HTTP 200 Success');

    const data = await response.json();
    const rawFetched = parseFollowedLiveGqlResponse(data);
    if (!rawFetched) {
      console.warn('[gnb-twipper] Requesting DOM scrape fallback because currentUser is null/missing.');
      requestDomScrapeFromTabs();
      return liveStreamers;
    }

    // Twitch GQL API (PlaybackAccessToken) で各ライブ配信のサブスク視聴権限・ロックを一括判定
    const subOnlyMap = await checkSubOnlyAuthViaGql(rawFetched);

    const fetchedStreamers: StreamInfo[] = rawFetched.map((s) => ({
      ...s,
      is_sub_only: !!subOnlyMap[s.user_login.toLowerCase()],
    }));

    console.log('[gnb-twipper] GQL Parsed Live Streamers count:', fetchedStreamers.length, fetchedStreamers);

    updateLiveStreamers(attachWatchTimeAndCleanup(fetchedStreamers));
    resetRefreshAlarm();
    if (!skipEvaluate) {
      evaluateAutoState();
    }

    if (fetchedStreamers.length === 0) {
      console.log('[gnb-twipper] GQL returned 0 live streamers. Requesting DOM scrape fallback to double check.');
      requestDomScrapeFromTabs();
    }

    return liveStreamers;
  } catch (err) {
    console.error('[gnb-twipper] Error fetching followed live channels via GQL:', err);
    requestDomScrapeFromTabs();
    return liveStreamers;
  }
}

// リスト更新が行われたタイミングで2分定期アラームをリセット
function resetRefreshAlarm() {
  chrome.alarms.create('refreshLiveStreamers', { delayInMinutes: 2, periodInMinutes: 2 });
}

function startTimer() {
  stopTimer();
  const validMinutes = normalizeRotationMinutes(settings.rotationTimeMinutes);
  autoState.totalDurationSeconds = validMinutes * 60;
  autoState.timeRemainingSeconds = autoState.totalDurationSeconds;

  countdownTimer = self.setInterval(() => {
    if (!autoState.isActive || autoState.isStandby) return;

    if (autoState.timeRemainingSeconds > 0) {
      autoState.timeRemainingSeconds -= 1;
    } else {
      rotateToNextChannel();
    }

    broadcastState();
  }, 1000) as unknown as number;
}

function stopTimer() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

// Start Auto Rotation Mode
function startAutoMode(initialChannel?: string, targetTabId?: number) {
  userManuallyStopped = false;
  markInitialAutoStarted();
  autoState.isActive = true;

  if (typeof targetTabId === 'number') {
    setPrimaryTabId(targetTabId);
    refreshActiveTwitchChannelCache();
  } else if (primaryTabId === null && typeof chrome !== 'undefined' && chrome.tabs?.query) {
    chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
      if (primaryTabId === null && autoState.isActive) {
        const selected = selectPrimaryTabFromList(tabs);
        if (selected?.id !== undefined) {
          setPrimaryTabId(selected.id);
          refreshActiveTwitchChannelCache();
          broadcastState();
        }
      }
    });
  }

  if (initialChannel) {
    autoState.currentChannel = initialChannel;
  }

  const candidates = getAutoRotationCandidates();

  if (candidates.length >= 2) {
    autoState.isStandby = false;
    // 現在のチャンネルが候補にいなければ1人目をセット
    if (!autoState.currentChannel || !candidates.some((s) => s.user_login.toLowerCase() === autoState.currentChannel.toLowerCase())) {
      autoState.currentChannel = candidates[0].user_login;
      navigateToChannel(autoState.currentChannel, targetTabId);
    }
    startTimer();
  } else if (candidates.length === 1) {
    autoState.isStandby = true;
    const singleStreamer = candidates[0].user_login;
    if (autoState.currentChannel.toLowerCase() !== singleStreamer.toLowerCase()) {
      autoState.currentChannel = singleStreamer;
      navigateToChannel(singleStreamer, targetTabId);
    }
    stopTimer();
  } else {
    autoState.isStandby = true;
    stopTimer();
  }

  broadcastState();
}

// Stop Auto Mode (ユーザーによる手動停止)
function stopAutoMode() {
  userManuallyStopped = true;
  markInitialAutoStarted();
  autoState.isActive = false;
  autoState.isStandby = false;
  setPrimaryTabId(null);
  stopTimer();
  broadcastState();
}

// Helper to get active rotation target streamers for UI display (filtering out user exclusions)
function getRotationTargetStreamers(): StreamInfo[] {
  return getRotationTargetStreamersUtil(liveStreamers, settings, cachedExcludedLogins);
}

// Helper to get eligible streamers for auto-rotation
function getAutoRotationCandidates(): StreamInfo[] {
  return getAutoRotationCandidatesUtil(liveStreamers, settings, cachedExcludedLogins);
}

// 配信者一覧の更新や設定変更時に、オートモードの状態（通常巡回 / 待機）を自動判定・遷移
function evaluateAutoState() {
  // 手動で停止している場合は人数が増減しても何もしない
  if (!autoState.isActive) return;

  const candidates = getAutoRotationCandidates();

  if (candidates.length >= 2) {
    if (autoState.isStandby) {
      console.log('[gnb-twipper] Streamers increased to 2 or more. Resuming Auto Mode rotation.');
      autoState.isStandby = false;
      if (!autoState.currentChannel || !candidates.some((s) => s.user_login.toLowerCase() === autoState.currentChannel.toLowerCase())) {
        autoState.currentChannel = candidates[0].user_login;
        navigateToChannel(autoState.currentChannel);
      }
      startTimer();
    } else {
      // 巡回中だが、現在見ているチャンネルが配信終了等で候補外になった場合
      const isCurrentActive = candidates.some((s) => s.user_login.toLowerCase() === autoState.currentChannel.toLowerCase());
      if (!isCurrentActive) {
        rotateToNextChannel();
      }
    }
  } else if (candidates.length === 1) {
    const singleStreamer = candidates[0].user_login;
    if (!autoState.isStandby) {
      console.log('[gnb-twipper] Streamers decreased to 1. Switching to Standby mode (watching continuously without page reload).');
      autoState.isStandby = true;
      stopTimer();
    }
    if (autoState.currentChannel.toLowerCase() !== singleStreamer.toLowerCase()) {
      autoState.currentChannel = singleStreamer;
      navigateToChannel(singleStreamer);
    }
  } else {
    // 0人の場合
    if (!autoState.isStandby) {
      console.log('[gnb-twipper] No streamers live. Switching to Standby mode.');
      autoState.isStandby = true;
      stopTimer();
    }
  }

  broadcastState();
}

// Helper to select the next streamer using Smart Round-Robin
function selectNextStreamer(candidates: StreamInfo[], currentLogin: string): StreamInfo {
  // 候補者が2人以上いる場合は、直前に見ていた配信者を今回の選定対象から除外して同一人物の連続を防止
  const otherCandidates = candidates.filter(
    (s) => s.user_login.toLowerCase() !== currentLogin.toLowerCase()
  );

  const pool = otherCandidates.length > 0 ? otherCandidates : candidates;

  // 1. 初期目標未達グループ (累積視聴秒数 < 600秒)
  const underTargetCandidates = pool.filter(
    (s) => (s.watch_time_seconds || 0) < INITIAL_PRIORITY_WATCH_TIME_SECONDS
  );

  if (underTargetCandidates.length > 0) {
    // 未達者の中で、視聴時間が最も少ない人（未視聴・新規枠）を最優先 (同点ならリスト順を維持)
    const sortedUnder = [...underTargetCandidates].sort(
      (a, b) => (a.watch_time_seconds || 0) - (b.watch_time_seconds || 0)
    );
    return sortedUnder[0];
  }

  // 2. 全員が初期目標を満たしている場合は、直前の人を除いたプールの中で最も視聴時間が少ない人（均等ローテーション）を選択
  const sortedPool = [...pool].sort(
    (a, b) => (a.watch_time_seconds || 0) - (b.watch_time_seconds || 0)
  );
  return sortedPool[0];
}

let isRotating = false;

// Rotate to next channel in Queue
async function rotateToNextChannel() {
  if (isRotating) return;
  isRotating = true;
  try {
    // スキップ直前に最新の配信中リストを即時取得して最新化（内部での再帰的 evaluateAutoState を抑止）
    await fetchFollowedLiveChannels(true);

    const candidates = getAutoRotationCandidates();

    if (candidates.length >= 2) {
      const nextStreamer = selectNextStreamer(candidates, autoState.currentChannel);

      autoState.isStandby = false;
      autoState.currentChannel = nextStreamer.user_login;
      if (autoState.isActive) {
        startTimer();
      }

      navigateToChannel(nextStreamer.user_login);
      broadcastState();
    } else {
      evaluateAutoState();
    }
  } finally {
    isRotating = false;
  }
}

// Navigate Twitch tab (履歴を増やさずに上書き遷移)
function navigateToChannel(channel: string, targetTabId?: number) {
  const safeChannel = channel.trim().replace(/[^a-zA-Z0-9_]/g, '');
  if (!safeChannel) return;

  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    if (tabs && tabs.length > 0) {
      // 優先順位: 指定タブ > プライマリタブ > アクティブタブ > 先頭タブ
      const targetTab =
        (typeof targetTabId === 'number' ? tabs.find((t) => t.id === targetTabId) : undefined) ||
        (primaryTabId !== null ? tabs.find((t) => t.id === primaryTabId) : undefined) ||
        tabs.find((t) => t.active) ||
        tabs[0];
      if (!targetTab || !targetTab.id) return;

      if (autoState.isActive && primaryTabId === null) {
        setPrimaryTabId(targetTab.id);
        broadcastState();
      }

      const tabId = targetTab.id;
      const targetChannelLower = safeChannel.toLowerCase();

      // すでに目的のチャンネルを開いている場合はナビゲーション不要
      if (targetTab.url) {
        const currentChannel = extractChannelFromUrl(targetTab.url);
        if (currentChannel && currentChannel.toLowerCase() === targetChannelLower) {
          console.log(`[gnb-twipper] Tab is already on target channel @${safeChannel}. Skipping navigation.`);
          return;
        }
      }

      const targetUrl = `https://www.twitch.tv/${safeChannel}`;
      chrome.tabs
        .sendMessage(tabId, {
          type: 'NAVIGATE_TO_CHANNEL_REPLACE',
          channel: safeChannel,
        })
        .then((res) => {
          if (res && res.skipped) {
            console.log(`[gnb-twipper] Navigation skipped by content script for @${safeChannel}.`);
          }
        })
        .catch(() => {
          // コンテンツスクリプト未読み込み等の場合にフォールバック
          chrome.tabs.update(tabId, { url: targetUrl });
        });
    }
  });
}

// Broadcast Auto State to all tabs/popups
function broadcastState() {
  const targetStreamers = getRotationTargetStreamers();
  if (cachedTwitchTabIds.size > 0) {
    cachedTwitchTabIds.forEach((tabId) => {
      chrome.tabs.sendMessage(tabId, {
        type: 'AUTO_STATE_UPDATE',
        autoState: getAutoStateForTab(tabId),
        settings,
        liveStreamers: targetStreamers,
      }).catch(() => {});
    });
  } else {
    chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
      if (!tabs) return;
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'AUTO_STATE_UPDATE',
            autoState: getAutoStateForTab(tab.id),
            settings,
            liveStreamers: targetStreamers,
          }).catch(() => {});
        }
      });
    });
  }

  chrome.runtime.sendMessage({
    type: 'AUTO_STATE_UPDATE',
    autoState: getAutoStateForTab(undefined),
    settings,
    liveStreamers: targetStreamers,
  }).catch(() => {});
}

// Message listener
chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  // Ignore self-broadcast messages
  if (message.type === 'AUTO_STATE_UPDATE') {
    return false;
  }

  const senderTabId = sender?.tab?.id;
  if (typeof senderTabId === 'number' && !cachedTwitchTabIds.has(senderTabId) && isTwitchTabUrl(sender?.tab?.url)) {
    cachedTwitchTabIds.add(senderTabId);
  }

  switch (message.type) {
    case 'GET_SETTINGS': {
      if (liveStreamers.length === 0) {
        requestDomScrapeFromTabs();
      }
      sendResponse({ settings, autoState: getAutoStateForTab(senderTabId), liveStreamers: getRotationTargetStreamers() });
      break;
    }

    case 'SAVE_SETTINGS': {
      const nextMinutes = normalizeRotationMinutes(
        message.settings.rotationTimeMinutes ?? settings.rotationTimeMinutes
      );
      settings = { ...settings, ...message.settings, rotationTimeMinutes: nextMinutes };
      updateExcludedLoginsCache();
      if (autoState.isActive && !autoState.isStandby) {
        const nextTotalSeconds = nextMinutes * 60;
        autoState.totalDurationSeconds = nextTotalSeconds;
        if (autoState.timeRemainingSeconds > nextTotalSeconds || autoState.timeRemainingSeconds <= 0) {
          autoState.timeRemainingSeconds = nextTotalSeconds;
        }
      }
      chrome.storage.local.set({ settings }).then(() => {
        evaluateAutoState();
        broadcastState();
      });
      syncCustomUserScript(settings).then((status) => {
        sendResponse({ success: true, settings, userScriptsStatus: status });
      });
      return true;
    }

    case 'CHECK_USER_SCRIPTS_STATUS': {
      checkUserScriptsStatus().then((status) => {
        sendResponse(status);
      });
      return true;
    }

    case 'GET_LIVE_STREAMERS': {
      fetchFollowedLiveChannels().then(() => {
        sendResponse({ liveStreamers: getRotationTargetStreamers() });
      });
      return true; // Keep message channel open for async response
    }

    case 'START_AUTO_MODE': {
      startAutoMode(undefined, senderTabId);
      sendResponse({ success: true, autoState: getAutoStateForTab(senderTabId) });
      break;
    }

    case 'STOP_AUTO_MODE': {
      stopAutoMode();
      sendResponse({ success: true, autoState: getAutoStateForTab(senderTabId) });
      break;
    }

    case 'SWITCH_PRIMARY_TAB': {
      if (typeof senderTabId === 'number') {
        setPrimaryTabId(senderTabId);
        cachedTwitchTabIds.add(senderTabId);
        if (sender?.tab?.url) {
          const ch = extractChannelFromUrl(sender.tab.url);
          if (ch) {
            autoState.currentChannel = ch;
          }
        }
        refreshActiveTwitchChannelCache();
        broadcastState();
      }
      sendResponse({ success: true, autoState: getAutoStateForTab(senderTabId) });
      break;
    }

    case 'SKIP_NEXT': {
      rotateToNextChannel();
      sendResponse({ success: true, autoState: getAutoStateForTab(senderTabId) });
      break;
    }

    case 'DETECTED_SUB_ONLY_LOCK': {
      // 非プライマリタブからの検知は無視して他タブへの干渉を防止
      if (primaryTabId !== null && senderTabId !== undefined && senderTabId !== primaryTabId) {
        sendResponse({ success: true });
        break;
      }
      console.log('[gnb-twipper] Sub-only stream lock detected on channel:', message.channel);
      if (message.channel) {
        const targetLogin = message.channel.toLowerCase();
        const streamer = liveStreamers.find((s) => s.user_login.toLowerCase() === targetLogin);
        if (streamer && !streamer.is_sub_only) {
          streamer.is_sub_only = true;
          console.log(`[gnb-twipper] Marked @${targetLogin} as is_sub_only = true`);
          broadcastState();
        }
      }
      if (autoState.isActive && settings.skipSubOnlyStreams) {
        console.log('[gnb-twipper] Auto-skipping locked sub-only stream...');
        rotateToNextChannel();
      }
      sendResponse({ success: true });
      break;
    }

    case 'DETECTED_OFFLINE': {
      // 非プライマリタブからの検知は無視して他タブへの干渉を防止
      if (primaryTabId !== null && senderTabId !== undefined && senderTabId !== primaryTabId) {
        sendResponse({ success: true });
        break;
      }
      console.log('[gnb-twipper] Offline stream detected on channel:', message.channel);
      if (message.channel) {
        const targetLogin = message.channel.toLowerCase();
        const prevCount = liveStreamers.length;
        updateLiveStreamers(liveStreamers.filter((s) => s.user_login.toLowerCase() !== targetLogin));
        delete watchTimeMap[targetLogin];
        if (liveStreamers.length !== prevCount) {
          console.log(`[gnb-twipper] Removed offline streamer @${targetLogin} from liveStreamers (Remaining: ${liveStreamers.length})`);
          broadcastState();
        }
      }
      if (autoState.isActive) {
        console.log('[gnb-twipper] Auto-skipping offline channel...');
        rotateToNextChannel();
      }
      sendResponse({ success: true });
      break;
    }

    case 'SELECT_STREAMER': {
      const safeChannel = message.channel.trim().replace(/[^a-zA-Z0-9_]/g, '');
      if (safeChannel) {
        if (autoState.isActive && typeof senderTabId === 'number') {
          setPrimaryTabId(senderTabId);
        }
        autoState.currentChannel = safeChannel;
        navigateToChannel(safeChannel, senderTabId);
        if (autoState.isActive) {
          const validMinutes = normalizeRotationMinutes(settings.rotationTimeMinutes);
          autoState.totalDurationSeconds = validMinutes * 60;
          autoState.timeRemainingSeconds = autoState.totalDurationSeconds;
        }
        broadcastState();
      }
      sendResponse({ success: true, autoState: getAutoStateForTab(senderTabId) });
      break;
    }

    case 'GET_AUTO_STATE': {
      if (liveStreamers.length === 0) {
        fetchFollowedLiveChannels().then(() => {
          sendResponse({ autoState: getAutoStateForTab(senderTabId), settings, liveStreamers: getRotationTargetStreamers() });
        });
        return true; // Keep message channel open for async response
      } else {
        sendResponse({ autoState: getAutoStateForTab(senderTabId), settings, liveStreamers: getRotationTargetStreamers() });
        break;
      }
    }

    case 'OPEN_OPTIONS': {
      const optionsUrl = chrome.runtime.getURL('src/options/index.html');
      console.log('[gnb-twipper] OPEN_OPTIONS: Opening options tab directly:', optionsUrl);
      chrome.tabs.create({ url: optionsUrl });
      sendResponse({ success: true });
      break;
    }

    case 'UPDATE_STREAMERS_FROM_DOM': {
      if (message.streamers && Array.isArray(message.streamers)) {
        console.log('[gnb-twipper] Received streamers from DOM:', message.streamers.length);
        const domStreamers = message.streamers;
        checkSubOnlyAuthViaGql(domStreamers).then((subOnlyMap) => {
          const existingMap = new Map<string, StreamInfo>();
          for (const old of liveStreamers) {
            existingMap.set(old.user_login.toLowerCase(), old);
          }

          const updatedStreamers: StreamInfo[] = domStreamers.map((s) => {
            const lowerLogin = s.user_login.toLowerCase();
            const existing = existingMap.get(lowerLogin);
            const apiSubOnly = subOnlyMap[lowerLogin];
            const isSubOnly = apiSubOnly !== undefined ? apiSubOnly : (existing ? !!existing.is_sub_only : false);
            return {
              ...s,
              is_sub_only: isSubOnly,
            };
          });
          updateLiveStreamers(attachWatchTimeAndCleanup(updatedStreamers));
          resetRefreshAlarm();
          evaluateAutoState();
          broadcastState();
        });

        if (message.streamers.length > 0) {
          zeroStreamerCount = 0;
          if (domScrapeRetryTimer) clearTimeout(domScrapeRetryTimer);

          // autoStartOnLoginが有効で、かつユーザーが手動停止しておらず、セッション初回起動がまだの場合のみ自動開始
          if (settings.autoStartOnLogin && !autoState.isActive && !userManuallyStopped) {
            isInitialAutoStarted().then((alreadyStarted) => {
              if (!alreadyStarted && !autoState.isActive && !userManuallyStopped) {
                console.log('[gnb-twipper] Streamers successfully retrieved from DOM. Initial auto-start triggered.');
                startAutoMode(undefined, senderTabId);
              }
            });
          }
        } else {
          zeroStreamerCount += 1;
          // 初期化中のDOM未構築による誤停止を防ぐため、3回連続で0件の場合のみ判定
          if (zeroStreamerCount >= 3) {
            evaluateAutoState();
          } else {
            console.log(`[gnb-twipper] Streamers count is 0 (${zeroStreamerCount}/3 attempts). Waiting for DOM/Retries before changing Auto Mode.`);
          }
        }
        broadcastState();
      }
      sendResponse({ success: true, count: liveStreamers.length });
      break;
    }

    default:
      sendResponse({ success: false });
      break;
  }

  return true;
});

// Refresh live streamers every 2 minutes
chrome.alarms.create('refreshLiveStreamers', { periodInMinutes: 2 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshLiveStreamers') {
    fetchFollowedLiveChannels().then(() => broadcastState());
  }
});

function isTwitchTabUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === 'twitch.tv' || host.endsWith('.twitch.tv');
  } catch {
    return false;
  }
}

// Auto-start auto mode when Twitch tab is opened/loaded if autoStartOnLogin is enabled (initial load only)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const isTwitch = isTwitchTabUrl(tab.url);
  // プライマリタブが Twitch 以外のドメインへ遷移した場合はオートモードを安全停止
  if (tab.url && !isTwitch) {
    handlePrimaryTabLost(tabId);
  }
  // 他の無関係なタブ更新での不要な chrome.tabs.query ポーリングを防止
  if (isTwitch && (changeInfo.status === 'complete' || changeInfo.url)) {
    refreshActiveTwitchChannelCache();
  }
  if (changeInfo.status === 'complete' && isTwitch) {
    const alreadyStarted = await isInitialAutoStarted();
    if (settings.autoStartOnLogin && !autoState.isActive && !alreadyStarted) {
      console.log('[gnb-twipper] Initial Twitch tab loaded/updated. Auto-starting Auto Mode via autoStartOnLogin.');
      await markInitialAutoStarted();
      startAutoMode(undefined, tabId);
    }
  }
});

// Initial fetch on Service Worker startup
fetchFollowedLiveChannels();
