import type { AppSettings, StreamInfo, AutoState, ExtensionMessage } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  rotationTimeMinutes: 3,
  autoStartOnLogin: true,
  language: 'ja',
  customCss: '',
  customJs: '',
  customCssEnabled: true,
  customJsEnabled: true,
};

let settings: AppSettings = { ...DEFAULT_SETTINGS };
let liveStreamers: StreamInfo[] = [];
let autoState: AutoState = {
  isActive: false,
  timeRemainingSeconds: 0,
  totalDurationSeconds: 180,
  currentChannel: '',
};

let countdownTimer: number | null = null;

// Initialize settings from storage
chrome.storage.local.get(['settings'], (result) => {
  if (result.settings) {
    settings = { ...DEFAULT_SETTINGS, ...result.settings };
  } else {
    chrome.storage.local.set({ settings });
  }
});

// Helper to get Twitch auth-token cookie
async function getTwitchAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://www.twitch.tv', name: 'auth-token' }, (cookie) => {
      if (cookie && cookie.value) {
        resolve(cookie.value);
      } else {
        // Fallback check on .twitch.tv domain
        chrome.cookies.get({ url: 'https://gql.twitch.tv', name: 'auth-token' }, (cookie2) => {
          resolve(cookie2?.value || null);
        });
      }
    });
  });
}

// Fetch followed live channels via Twitch GQL API
async function fetchFollowedLiveChannels(): Promise<StreamInfo[]> {
  try {
    const authToken = await getTwitchAuthToken();
    console.log('[gnb-twview] Twitch Auth Token found:', !!authToken);

    const CLIENT_ID = 'kimne78q3ncx5we6bcd59myst66826';
    const headers: Record<string, string> = {
      'Client-ID': CLIENT_ID,
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `OAuth ${authToken}`;
    }

    // Try GQL Query for followed live streams
    const bodyPayload = [
      {
        operationName: 'SideNavSection_FollowedChannels',
        variables: {
          limit: 100,
        },
        query: `
          query SideNavSection_FollowedChannels($limit: Int) {
            currentUser {
              id
              followedLiveUsers(first: $limit) {
                edges {
                  node {
                    id
                    login
                    displayName
                    profileImageURL(width: 70)
                    stream {
                      id
                      title
                      viewerCount
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
      console.warn('[gnb-twview] GQL response HTTP error:', response.status);
      return [];
    }

    const data = await response.json();
    console.log('[gnb-twview] GQL raw response:', data);

    const edges = data[0]?.data?.currentUser?.followedLiveUsers?.edges || [];

    const streams: StreamInfo[] = edges
      .map((edge: any) => {
        const node = edge?.node;
        if (!node || !node.stream) return null; // Filter out non-live users
        return {
          user_login: node.login,
          user_name: node.displayName,
          profile_image_url: node.profileImageURL,
          title: node.stream.title || '',
          game_name: node.stream.game?.name || '',
          viewer_count: node.stream.viewerCount || 0,
        };
      })
      .filter((s: StreamInfo | null): s is StreamInfo => s !== null);

    console.log('[gnb-twview] Parsed live streamers count:', streams.length);
    liveStreamers = streams;
    return streams;
  } catch (err) {
    console.error('[gnb-twview] Error fetching followed live channels:', err);
    return [];
  }
}

// Start Auto Rotation Mode
function startAutoMode(initialChannel?: string) {
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

// Rotate to next channel in Queue
async function rotateToNextChannel() {
  if (liveStreamers.length === 0) {
    await fetchFollowedLiveChannels();
  }

  if (liveStreamers.length === 0) {
    console.log('[gnb-twview] No live streamers found to rotate.');
    stopAutoMode();
    return;
  }

  const currentIndex = liveStreamers.findIndex(s => s.user_login.toLowerCase() === autoState.currentChannel.toLowerCase());
  const nextIndex = (currentIndex + 1) % liveStreamers.length;
  const nextStreamer = liveStreamers[nextIndex];

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
  chrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'AUTO_STATE_UPDATE',
          autoState,
          settings,
          liveStreamers,
        }).catch(() => {});
      }
    });
  });

  chrome.runtime.sendMessage({
    type: 'AUTO_STATE_UPDATE',
    autoState,
    settings,
    liveStreamers,
  }).catch(() => {});
}

// Message listener
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case 'GET_SETTINGS':
        sendResponse({ settings, autoState, liveStreamers });
        break;

      case 'SAVE_SETTINGS':
        settings = { ...settings, ...message.settings };
        await chrome.storage.local.set({ settings });
        broadcastState();
        sendResponse({ success: true, settings });
        break;

      case 'GET_LIVE_STREAMERS':
        const streams = await fetchFollowedLiveChannels();
        sendResponse({ liveStreamers: streams });
        break;

      case 'START_AUTO_MODE':
        startAutoMode();
        sendResponse({ success: true, autoState });
        break;

      case 'STOP_AUTO_MODE':
        stopAutoMode();
        sendResponse({ success: true, autoState });
        break;

      case 'SKIP_NEXT':
        rotateToNextChannel();
        sendResponse({ success: true, autoState });
        break;

      case 'SELECT_STREAMER':
        autoState.currentChannel = message.channel;
        navigateToChannel(message.channel);
        if (autoState.isActive) {
          autoState.timeRemainingSeconds = settings.rotationTimeMinutes * 60;
        }
        broadcastState();
        sendResponse({ success: true, autoState });
        break;

      case 'GET_AUTO_STATE':
        // Fetch fresh streamers if list is empty
        if (liveStreamers.length === 0) {
          await fetchFollowedLiveChannels();
        }
        sendResponse({ autoState, settings, liveStreamers });
        break;

      case 'OPEN_OPTIONS':
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
        sendResponse({ success: true });
        break;

      default:
        break;
    }
  })();
  return true;
});

// Refresh live streamers every 2 minutes
chrome.alarms.create('refreshLiveStreamers', { periodInMinutes: 2 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshLiveStreamers') {
    fetchFollowedLiveChannels().then(() => broadcastState());
  }
});

// Initial fetch on Service Worker startup
fetchFollowedLiveChannels();
