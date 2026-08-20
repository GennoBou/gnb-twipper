import type { AppSettings, StreamInfo, AutoState, ExtensionMessage } from '../types';

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

let settings: AppSettings = { ...DEFAULT_SETTINGS };
let liveStreamers: StreamInfo[] = [];
let watchTimeMap: Record<string, number> = {};
let autoState: AutoState = {
  isActive: false,
  isStandby: false,
  timeRemainingSeconds: 0,
  totalDurationSeconds: 180,
  currentChannel: '',
};

let countdownTimer: number | null = null;
let watchTimer: number | null = null;

let dynamicClientId: string | null = null; // インストール時・401エラー時は白紙 (null)
let last401Time = 0;
const COOL_DOWN_401_MS = 60000; // 401発生後、1分間は無駄なGQL再判定の頻発を防止

// 保存済みの動的 Client-ID をロード (あれば使用、なければ白紙のまま)
chrome.storage.local.get(['detectedClientId'], (res) => {
  if (res && typeof res.detectedClientId === 'string') {
    dynamicClientId = res.detectedClientId;
    console.log('[gnb-twipper] Loaded saved Client-ID:', dynamicClientId);
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
            console.log('[gnb-twipper] [Auto Detect] Captured valid Client-ID from Twitch packet:', clientHeader.value);
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

function extractChannelFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('twitch.tv')) return null;
    const pathname = parsed.pathname.slice(1);
    const parts = pathname.split('/');
    const firstPart = parts[0]?.toLowerCase();
    const reserved = ['directory', 'settings', 'subscriptions', 'wallet', 'downloads', 'p', 'search', 'videos', 'moderator', 'popout'];
    if (firstPart && !reserved.includes(firstPart) && firstPart.length > 0) {
      return firstPart;
    }
  } catch (e) {}
  return null;
}

// API-level sub-only entitlement check via Twitch GQL PlaybackAccessToken
async function checkSubOnlyAuthViaGql(logins: string[]): Promise<Record<string, boolean>> {
  if (!logins || logins.length === 0 || !dynamicClientId) return {};

  try {
    const authToken = await getTwitchAuthToken();
    const deviceId = await getTwitchDeviceId();

    const headers: Record<string, string> = {
      'Client-ID': dynamicClientId,
      'Content-Type': 'text/plain; charset=UTF-8',
    };

    if (deviceId) headers['Device-ID'] = deviceId;
    if (authToken) headers['Authorization'] = `OAuth ${authToken}`;

    const bodyPayload = logins.map((login) => ({
      operationName: 'PlaybackAccessTokenQuery',
      query: `
        query PlaybackAccessTokenQuery($login: String!) {
          streamPlaybackAccessToken(channelName: $login, params: { platform: "web", playerBackend: "mediaplayer", playerType: "site" }) {
            authorization {
              isForbidden
              forbiddenReasonCode
            }
          }
        }
      `,
      variables: { login },
    }));

    const response = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) return {};

    const data = await response.json();
    const subOnlyMap: Record<string, boolean> = {};

    if (Array.isArray(data)) {
      data.forEach((item: any, idx: number) => {
        const login = logins[idx];
        const auth = item?.data?.streamPlaybackAccessToken?.authorization;
        if (login && auth) {
          const isSubOnly = !!auth.isForbidden && (auth.forbiddenReasonCode === 'UNAUTHORIZED_ENTITLEMENTS' || auth.forbiddenReasonCode === 'SUB_ONLY');
          subOnlyMap[login.toLowerCase()] = isSubOnly;
        }
      });
    }

    return subOnlyMap;
  } catch (e) {
    console.error('[gnb-twipper] Error checking sub-only API status:', e);
    return {};
  }
}

function attachWatchTimeAndCleanup(fetched: StreamInfo[]): StreamInfo[] {
  const currentLiveLogins = new Set(fetched.map((s) => s.user_login.toLowerCase()));
  
  // 配信終了したチャンネルの視聴時間をクリア（0秒にリセット）
  Object.keys(watchTimeMap).forEach((key) => {
    if (!currentLiveLogins.has(key)) {
      delete watchTimeMap[key];
    }
  });

  return fetched.map((s) => {
    const key = s.user_login.toLowerCase();
    return {
      ...s,
      watch_time_seconds: watchTimeMap[key] || 0,
    };
  });
}

function startWatchTimer() {
  if (watchTimer !== null) return;
  watchTimer = self.setInterval(() => {
    chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
      let activeChannel: string | null = null;
      // アクティブなTwitchタブを優先検索
      const activeTab = tabs.find((t) => t.active && t.url);
      if (activeTab && activeTab.url) {
        activeChannel = extractChannelFromUrl(activeTab.url);
      } else if (tabs.length > 0 && tabs[0].url) {
        activeChannel = extractChannelFromUrl(tabs[0].url);
      }

      if (!activeChannel && autoState.isActive && autoState.currentChannel) {
        activeChannel = autoState.currentChannel.toLowerCase();
      }

      if (activeChannel) {
        const key = activeChannel.toLowerCase();
        watchTimeMap[key] = (watchTimeMap[key] || 0) + 1;

        let updated = false;
        liveStreamers.forEach((s) => {
          if (s.user_login.toLowerCase() === key) {
            s.watch_time_seconds = watchTimeMap[key];
            updated = true;
          }
        });

        if (updated) {
          broadcastState();
        }
      }
    });
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
  } else {
    chrome.storage.local.set({ settings });
  }

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

// Helper to get Twitch auth-token cookie
async function getTwitchAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://www.twitch.tv', name: 'auth-token' }, (cookie) => {
      if (cookie && cookie.value) {
        console.log('[gnb-twipper] Auth-token found via www.twitch.tv URL');
        resolve(cookie.value);
        return;
      }
      chrome.cookies.get({ url: 'https://gql.twitch.tv', name: 'auth-token' }, (cookie2) => {
        if (cookie2 && cookie2.value) {
          console.log('[gnb-twipper] Auth-token found via gql.twitch.tv URL');
          resolve(cookie2.value);
          return;
        }
        chrome.cookies.getAll({ name: 'auth-token' }, (cookies) => {
          const match = cookies.find((c) => c.domain.includes('twitch.tv'));
          if (match && match.value) {
            console.log('[gnb-twipper] Auth-token found via cookies.getAll search for twitch.tv');
            resolve(match.value);
          } else {
            console.warn('[gnb-twipper] Auth-token cookie NOT found');
            resolve(null);
          }
        });
      });
    });
  });
}

let zeroStreamerCount = 0;
let domScrapeRetryTimer: any = null;

// Request active Twitch tabs to scrape live streamers from DOM with optional retry
function requestDomScrapeFromTabs(retryCount = 0) {
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    tabs.forEach((tab) => {
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

// Helper to get Twitch device-id (unique_id cookie)
async function getTwitchDeviceId(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://www.twitch.tv', name: 'unique_id' }, (cookie) => {
      if (cookie && cookie.value) {
        resolve(cookie.value);
      } else {
        chrome.cookies.getAll({ name: 'unique_id' }, (cookies) => {
          const match = cookies.find((c) => c.domain.includes('twitch.tv'));
          resolve(match ? match.value : null);
        });
      }
    });
  });
}

let lastGqlFetchTime = 0;
const MIN_GQL_INTERVAL_MS = 5000; // 5秒以内の連続GQLリクエストを抑止

// Fetch followed live channels via Twitch GQL API
async function fetchFollowedLiveChannels(): Promise<StreamInfo[]> {
  const now = Date.now();
  if (now - lastGqlFetchTime < MIN_GQL_INTERVAL_MS) {
    console.log(`[gnb-twipper] [GQL Throttle] Skipped GQL request (last request was ${now - lastGqlFetchTime}ms ago). Returning cached streamers (${liveStreamers.length}).`);
    return liveStreamers;
  }
  lastGqlFetchTime = now;

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
    const authToken = await getTwitchAuthToken();
    const deviceId = await getTwitchDeviceId();
    console.log('[gnb-twipper] [GQL Request] Sending request to https://gql.twitch.tv/gql', {
      time: new Date().toLocaleTimeString(),
      hasAuthToken: !!authToken,
      hasDeviceId: !!deviceId,
      usingClientId: dynamicClientId,
      authTokenPreview: authToken ? `${authToken.substring(0, 4)}...${authToken.substring(authToken.length - 4)}` : 'NULL',
    });

    const headers: Record<string, string> = {
      'Client-ID': dynamicClientId,
      'Content-Type': 'text/plain; charset=UTF-8',
    };

    if (deviceId) {
      headers['Device-ID'] = deviceId;
    }

    if (authToken) {
      headers['Authorization'] = `OAuth ${authToken}`;
    }

    const bodyPayload = [
      {
        operationName: 'GnbFollowsLiveQuery',
        query: `
          query GnbFollowsLiveQuery {
            currentUser {
              id
              follows(first: 100) {
                edges {
                  node {
                    id
                    login
                    displayName
                    profileImageURL(width: 70)
                    stream {
                      id
                      title
                      viewersCount
                      game {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      },
    ];

    const response = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

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
    console.log('[gnb-twipper] GQL raw response structure:', data);

    if (data && Array.isArray(data) && data[0]?.errors) {
      console.warn('[gnb-twipper] GQL returned errors:', data[0].errors);
    }

    const currentUser = data?.[0]?.data?.currentUser;
    if (!currentUser) {
      console.warn('[gnb-twipper] GQL currentUser is null. Token may be invalid or Twitch Integrity protection triggered. Requesting DOM scrape fallback.');
      requestDomScrapeFromTabs();
      return liveStreamers;
    }

    const edges = currentUser.follows?.edges || [];
    const rawFetched: StreamInfo[] = [];

    edges.forEach((edge: any) => {
      const node = edge?.node;
      const stream = node?.stream;
      if (node && stream) {
        rawFetched.push({
          user_login: node.login,
          user_name: node.displayName || node.login,
          title: stream.title || '',
          game_name: stream.game?.name || '',
          profile_image_url: node.profileImageURL || '',
          viewer_count: stream.viewersCount || 0,
        });
      }
    });

    // Twitch GQL API (PlaybackAccessToken) で各ライブ配信のサブスク視聴権限・ロックを一括判定
    const logins = rawFetched.map((s) => s.user_login);
    const subOnlyMap = await checkSubOnlyAuthViaGql(logins);

    const fetchedStreamers: StreamInfo[] = rawFetched.map((s) => ({
      ...s,
      is_sub_only: !!subOnlyMap[s.user_login.toLowerCase()],
    }));

    console.log('[gnb-twipper] GQL Parsed Live Streamers count:', fetchedStreamers.length, fetchedStreamers);

    liveStreamers = attachWatchTimeAndCleanup(fetchedStreamers);
    evaluateAutoState();

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

function startTimer() {
  stopTimer();
  autoState.totalDurationSeconds = settings.rotationTimeMinutes * 60;
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
function startAutoMode(initialChannel?: string) {
  markInitialAutoStarted();
  autoState.isActive = true;

  if (initialChannel) {
    autoState.currentChannel = initialChannel;
  }

  const candidates = getAutoRotationCandidates();

  if (candidates.length >= 2) {
    autoState.isStandby = false;
    // 現在のチャンネルが候補にいなければ1人目をセット
    if (!autoState.currentChannel || !candidates.some((s) => s.user_login.toLowerCase() === autoState.currentChannel.toLowerCase())) {
      autoState.currentChannel = candidates[0].user_login;
      navigateToChannel(autoState.currentChannel);
    }
    startTimer();
  } else if (candidates.length === 1) {
    autoState.isStandby = true;
    autoState.currentChannel = candidates[0].user_login;
    navigateToChannel(candidates[0].user_login);
    stopTimer();
  } else {
    autoState.isStandby = true;
    stopTimer();
  }

  broadcastState();
}

// Stop Auto Mode (ユーザーによる手動停止)
function stopAutoMode() {
  markInitialAutoStarted();
  autoState.isActive = false;
  autoState.isStandby = false;
  stopTimer();
  broadcastState();
}

// Helper to get active rotation target streamers for UI display (filtering out user exclusions)
function getRotationTargetStreamers(): StreamInfo[] {
  if (!settings.excludedChannels || settings.excludedChannels.length === 0) {
    return liveStreamers;
  }
  const excludedLogins = new Set(
    settings.excludedChannels
      .filter((item) => item.enabled)
      .map((item) => item.user_login.toLowerCase())
  );
  return liveStreamers.filter(
    (streamer) => !excludedLogins.has(streamer.user_login.toLowerCase())
  );
}

// Helper to get eligible streamers for auto-rotation
function getAutoRotationCandidates(): StreamInfo[] {
  const targets = getRotationTargetStreamers();
  if (settings.skipSubOnlyStreams && !settings.allowSubOnlyFreePreview) {
    return targets.filter((streamer) => !streamer.is_sub_only);
  }
  return targets;
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

// Rotate to next channel in Queue
async function rotateToNextChannel() {
  if (liveStreamers.length === 0) {
    await fetchFollowedLiveChannels();
  }

  const candidates = getAutoRotationCandidates();

  if (candidates.length >= 2) {
    const currentIndex = candidates.findIndex((s) => s.user_login.toLowerCase() === autoState.currentChannel.toLowerCase());
    const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % candidates.length : 0;
    const nextStreamer = candidates[nextIndex];

    autoState.isStandby = false;
    autoState.currentChannel = nextStreamer.user_login;
    startTimer();

    navigateToChannel(nextStreamer.user_login);
    broadcastState();
  } else {
    evaluateAutoState();
  }
}

// Navigate Twitch tab (履歴を増やさずに上書き遷移)
function navigateToChannel(channel: string) {
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    if (tabs.length > 0 && tabs[0].id) {
      const tabId = tabs[0].id;
      const targetUrl = `https://www.twitch.tv/${channel}`;
      chrome.tabs
        .sendMessage(tabId, {
          type: 'NAVIGATE_TO_CHANNEL_REPLACE',
          channel,
        })
        .catch(() => {
          chrome.tabs.update(tabId, { url: targetUrl });
        });
    }
  });
}

// Broadcast Auto State to all tabs/popups
function broadcastState() {
  const targetStreamers = getRotationTargetStreamers();
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'AUTO_STATE_UPDATE',
          autoState,
          settings,
          liveStreamers: targetStreamers,
        }).catch(() => {});
      }
    });
  });

  chrome.runtime.sendMessage({
    type: 'AUTO_STATE_UPDATE',
    autoState,
    settings,
    liveStreamers: targetStreamers,
  }).catch(() => {});
}

// Message listener
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  // Ignore self-broadcast messages
  if ((message as any).type === 'AUTO_STATE_UPDATE') {
    return false;
  }

  switch (message.type) {
    case 'GET_SETTINGS': {
      if (liveStreamers.length === 0) {
        requestDomScrapeFromTabs();
      }
      sendResponse({ settings, autoState, liveStreamers: getRotationTargetStreamers() });
      break;
    }

    case 'SAVE_SETTINGS': {
      settings = { ...settings, ...message.settings };
      chrome.storage.local.set({ settings }).then(() => {
        evaluateAutoState();
        broadcastState();
      });
      sendResponse({ success: true, settings });
      break;
    }

    case 'GET_LIVE_STREAMERS': {
      fetchFollowedLiveChannels().then(() => {
        sendResponse({ liveStreamers: getRotationTargetStreamers() });
      });
      return true; // Keep message channel open for async response
    }

    case 'START_AUTO_MODE': {
      startAutoMode();
      sendResponse({ success: true, autoState });
      break;
    }

    case 'STOP_AUTO_MODE': {
      stopAutoMode();
      sendResponse({ success: true, autoState });
      break;
    }

    case 'SKIP_NEXT': {
      rotateToNextChannel();
      sendResponse({ success: true, autoState });
      break;
    }

    case 'DETECTED_SUB_ONLY_LOCK': {
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

    case 'SELECT_STREAMER': {
      autoState.currentChannel = message.channel;
      navigateToChannel(message.channel);
      if (autoState.isActive) {
        autoState.timeRemainingSeconds = settings.rotationTimeMinutes * 60;
      }
      broadcastState();
      sendResponse({ success: true, autoState });
      break;
    }

    case 'GET_AUTO_STATE': {
      if (liveStreamers.length === 0) {
        fetchFollowedLiveChannels().then(() => {
          sendResponse({ autoState, settings, liveStreamers: getRotationTargetStreamers() });
        });
        return true; // Keep message channel open for async response
      } else {
        sendResponse({ autoState, settings, liveStreamers: getRotationTargetStreamers() });
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
        const logins = message.streamers.map((s) => s.user_login);
        checkSubOnlyAuthViaGql(logins).then((subOnlyMap) => {
          const updatedStreamers = message.streamers.map((s) => {
            const existing = liveStreamers.find((old) => old.user_login.toLowerCase() === s.user_login.toLowerCase());
            const apiSubOnly = subOnlyMap[s.user_login.toLowerCase()];
            const isSubOnly = apiSubOnly !== undefined ? apiSubOnly : (existing ? !!existing.is_sub_only : false);
            return {
              ...s,
              is_sub_only: isSubOnly,
            };
          });
          liveStreamers = attachWatchTimeAndCleanup(updatedStreamers);
          evaluateAutoState();
          broadcastState();
        });

        if (message.streamers.length > 0) {
          zeroStreamerCount = 0;
          if (domScrapeRetryTimer) clearTimeout(domScrapeRetryTimer);

          // autoStartOnLoginが有効で、初期読み込み遅延等によりオートモードが誤停止していた場合は自動再開
          if (settings.autoStartOnLogin && !autoState.isActive) {
            console.log('[gnb-twipper] Streamers successfully retrieved from DOM. Resuming Auto Mode.');
            startAutoMode();
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

    case 'EXECUTE_CUSTOM_JS': {
      if (_sender.tab && _sender.tab.id && message.code) {
        chrome.scripting.executeScript({
          target: { tabId: _sender.tab.id },
          world: 'MAIN',
          func: (codeToExec: string) => {
            try {
              const scriptFun = new Function(codeToExec);
              scriptFun();
            } catch (e) {
              console.error('[gnb-twipper] Custom JS execution error:', e);
            }
          },
          args: [message.code],
        }).catch((err) => {
          console.error('[gnb-twipper] chrome.scripting.executeScript error:', err);
        });
      }
      sendResponse({ success: true });
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

// Auto-start auto mode when Twitch tab is opened/loaded if autoStartOnLogin is enabled (initial load only)
chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('twitch.tv')) {
    const alreadyStarted = await isInitialAutoStarted();
    if (settings.autoStartOnLogin && !autoState.isActive && !alreadyStarted) {
      console.log('[gnb-twipper] Initial Twitch tab loaded/updated. Auto-starting Auto Mode via autoStartOnLogin.');
      await markInitialAutoStarted();
      startAutoMode();
    }
  }
});

// Initial fetch on Service Worker startup
fetchFollowedLiveChannels();
