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
};

let settings: AppSettings = { ...DEFAULT_SETTINGS };
let liveStreamers: StreamInfo[] = [];
let watchTimeMap: Record<string, number> = {};
let autoState: AutoState = {
  isActive: false,
  timeRemainingSeconds: 0,
  totalDurationSeconds: 180,
  currentChannel: '',
};

let countdownTimer: number | null = null;
let watchTimer: number | null = null;

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

// Request active Twitch tabs to scrape live streamers from DOM
function requestDomScrapeFromTabs() {
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_LIVE_STREAMERS_REQUEST' }).catch(() => {});
      }
    });
  });
}

// Fetch followed live channels via Twitch GQL API
async function fetchFollowedLiveChannels(): Promise<StreamInfo[]> {
  try {
    const authToken = await getTwitchAuthToken();
    console.log('[gnb-twipper] Twitch Auth Token present:', !!authToken, authToken ? `(length: ${authToken.length})` : '');

    const CLIENT_ID = 'kimne78kx3ncx6brogo4h6w166b418';
    const headers: Record<string, string> = {
      'Client-ID': CLIENT_ID,
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `OAuth ${authToken}`;
    }

    // Verified working Twitch GQL Query for followed live streams
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
      console.warn('[gnb-twipper] GQL response HTTP error status:', response.status);
      requestDomScrapeFromTabs();
      return liveStreamers;
    }

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
    const fetchedStreamers: StreamInfo[] = [];

    edges.forEach((edge: any) => {
      const node = edge?.node;
      const stream = node?.stream;
      if (node && stream) {
        fetchedStreamers.push({
          user_login: node.login,
          user_name: node.displayName || node.login,
          title: stream.title || '',
          game_name: stream.game?.name || '',
          profile_image_url: node.profileImageURL || '',
          viewer_count: stream.viewersCount || 0,
        });
      }
    });

    console.log('[gnb-twipper] GQL Parsed Live Streamers count:', fetchedStreamers.length, fetchedStreamers);

    if (fetchedStreamers.length > 0) {
      liveStreamers = attachWatchTimeAndCleanup(fetchedStreamers);
    } else {
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

// Start Auto Rotation Mode
function startAutoMode(initialChannel?: string) {
  markInitialAutoStarted();
  autoState.isActive = true;
  autoState.totalDurationSeconds = settings.rotationTimeMinutes * 60;
  autoState.timeRemainingSeconds = autoState.totalDurationSeconds;
  if (initialChannel) {
    autoState.currentChannel = initialChannel;
  }

  stopTimer();

  countdownTimer = self.setInterval(() => {
    if (!autoState.isActive) return;

    if (autoState.timeRemainingSeconds > 0) {
      autoState.timeRemainingSeconds -= 1;
    } else {
      rotateToNextChannel();
    }

    broadcastState();
  }, 1000) as unknown as number;

  broadcastState();
}

// Stop Auto Mode
function stopAutoMode() {
  markInitialAutoStarted();
  autoState.isActive = false;
  stopTimer();
  broadcastState();
}

function stopTimer() {
  if (countdownTimer !== null) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

// Helper to get active rotation target streamers (filtering out enabled exclusions)
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

// Rotate to next channel in Queue
async function rotateToNextChannel() {
  if (liveStreamers.length === 0) {
    await fetchFollowedLiveChannels();
  }

  const targetStreamers = getRotationTargetStreamers();

  if (targetStreamers.length === 0) {
    console.log('[gnb-twipper] No rotation target streamers found.');
    stopAutoMode();
    return;
  }

  const currentIndex = targetStreamers.findIndex(s => s.user_login.toLowerCase() === autoState.currentChannel.toLowerCase());
  const nextIndex = (currentIndex + 1) % targetStreamers.length;
  const nextStreamer = targetStreamers[nextIndex];

  autoState.currentChannel = nextStreamer.user_login;
  autoState.timeRemainingSeconds = settings.rotationTimeMinutes * 60;

  navigateToChannel(nextStreamer.user_login);
  broadcastState();
}

// Navigate Twitch tab
function navigateToChannel(channel: string) {
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    if (tabs.length > 0 && tabs[0].id) {
      const targetUrl = `https://www.twitch.tv/${channel}`;
      chrome.tabs.update(tabs[0].id, { url: targetUrl });
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
      chrome.storage.local.set({ settings }).then(() => broadcastState());
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
      if (message.streamers && message.streamers.length >= 0) {
        console.log('[gnb-twipper] Received streamers from DOM:', message.streamers.length);
        liveStreamers = attachWatchTimeAndCleanup(message.streamers);
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
