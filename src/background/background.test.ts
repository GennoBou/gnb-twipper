import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// モジュールインポート前に globalThis に mock を注入
const mockChrome = {
  storage: {
    local: {
      get: vi.fn((_keys, cb) => cb && cb({})),
      set: vi.fn(),
      remove: vi.fn(),
    },
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  webRequest: {
    onBeforeSendHeaders: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
    sendMessage: vi.fn(() => Promise.resolve()),
  },
  tabs: {
    query: vi.fn((_queryInfo, cb) => cb && cb([])),
    sendMessage: vi.fn(() => Promise.resolve()),
    update: vi.fn(),
    create: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
    },
  },
  cookies: {
    get: vi.fn((_details, cb) => cb && cb(null)),
    getAll: vi.fn((_details, cb) => cb && cb([])),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  userScripts: {
    getScripts: vi.fn((..._args: any[]) => Promise.resolve([] as any[])),
    unregister: vi.fn((..._args: any[]) => Promise.resolve()),
    register: vi.fn((..._args: any[]) => Promise.resolve()),
  },
};

(globalThis as any).chrome = mockChrome;
if (typeof (globalThis as any).self === 'undefined') {
  (globalThis as any).self = globalThis;
}
(globalThis as any).fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));

// chrome のモック設定後に background.ts をインポート
const {
  attachWatchTimeAndCleanup,
  getWatchTimeMap,
  setWatchTimeMap,
  parseFollowedLiveGqlResponse,
  checkUserScriptsStatus,
  getTwitchDeviceId,
  syncCustomUserScript,
  getTwitchAuthToken,
} = await import('./background');
import type { AppSettings, StreamInfo } from '../types';

const sampleSettings: AppSettings = {
  rotationTimeMinutes: 3,
  autoStartOnLogin: true,
  language: 'ja',
  customCss: '',
  customJs: 'console.log("hello")',
  customCssEnabled: false,
  customJsEnabled: true,
  excludedChannels: [],
  skipSubOnlyStreams: false,
  allowSubOnlyFreePreview: true,
};

describe('attachWatchTimeAndCleanup', () => {
  beforeEach(() => {
    // watchTimeMap の状態をリセット
    setWatchTimeMap({});
  });

  it('既存の視聴時間を fetched の各ストリーマーにマッピングする', () => {
    setWatchTimeMap({
      streamer1: 120,
      streamer2: 300,
    });

    const fetched: StreamInfo[] = [
      {
        user_login: 'streamer1',
        user_name: 'StreamerOne',
        title: 'Title 1',
        game_name: 'Game 1',
        profile_image_url: '',
        viewer_count: 100,
      },
      {
        user_login: 'streamer2',
        user_name: 'StreamerTwo',
        title: 'Title 2',
        game_name: 'Game 2',
        profile_image_url: '',
        viewer_count: 200,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    expect(result).toHaveLength(2);
    expect(result[0].watch_time_seconds).toBe(120);
    expect(result[1].watch_time_seconds).toBe(300);
  });

  it('視聴時間記録がないストリーマーには watch_time_seconds = 0 を設定する', () => {
    const fetched: StreamInfo[] = [
      {
        user_login: 'newstreamer',
        user_name: 'NewStreamer',
        title: 'New Stream',
        game_name: 'Game',
        profile_image_url: '',
        viewer_count: 50,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    expect(result[0].watch_time_seconds).toBe(0);
  });

  it('配信終了した（fetched に含まれない）チャンネルの視聴時間を watchTimeMap からクリーンアップする', () => {
    setWatchTimeMap({
      active_streamer: 150,
      offline_streamer: 500,
    });

    const fetched: StreamInfo[] = [
      {
        user_login: 'active_streamer',
        user_name: 'ActiveStreamer',
        title: 'Live',
        game_name: 'Game',
        profile_image_url: '',
        viewer_count: 300,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    // active_streamer の視聴時間は維持される
    expect(result[0].watch_time_seconds).toBe(150);
    // offline_streamer は watchTimeMap から削除されている
    const map = getWatchTimeMap();
    expect(map).toHaveProperty('active_streamer', 150);
    expect(map).not.toHaveProperty('offline_streamer');
  });

  it('大文字小文字（case-insensitivity）の違いを正しく解決してマッピング・維持する', () => {
    setWatchTimeMap({
      streamer_case: 240,
    });

    const fetched: StreamInfo[] = [
      {
        user_login: 'Streamer_Case', // fetched では大文字混ざり
        user_name: 'Streamer_Case',
        title: 'Title',
        game_name: 'Game',
        profile_image_url: '',
        viewer_count: 10,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    expect(result[0].watch_time_seconds).toBe(240);
    const map = getWatchTimeMap();
    expect(map).toHaveProperty('streamer_case', 240);
  });

  it('fetched が空配列の場合、watchTimeMap 内のすべてのエントリーが削除される', () => {
    setWatchTimeMap({
      streamer1: 100,
      streamer2: 200,
    });

    const result = attachWatchTimeAndCleanup([]);

    expect(result).toHaveLength(0);
    const map = getWatchTimeMap();
    expect(Object.keys(map)).toHaveLength(0);
  });
});

describe('checkUserScriptsStatus', () => {
  let originalUserScripts: any;

  beforeEach(() => {
    originalUserScripts = (globalThis as any).chrome.userScripts;
  });

  afterEach(() => {
    (globalThis as any).chrome.userScripts = originalUserScripts;
  });

  it('userScripts API が存在しない場合は { allowed: false, error: "API unavailable" } を返す', async () => {
    delete (globalThis as any).chrome.userScripts;

    const result = await checkUserScriptsStatus();
    expect(result).toEqual({ allowed: false, error: 'API unavailable' });
  });

  it('userScripts.getScripts() が成功した場合は { allowed: true } を返す', async () => {
    (globalThis as any).chrome.userScripts = {
      ...originalUserScripts,
      getScripts: vi.fn().mockResolvedValue([]),
    };

    const result = await checkUserScriptsStatus();
    expect(result).toEqual({ allowed: true });
  });

  it('userScripts.getScripts() が Error オブジェクトでキャッチされた場合はエラーメッセージを返す', async () => {
    (globalThis as any).chrome.userScripts = {
      ...originalUserScripts,
      getScripts: vi.fn().mockRejectedValue(new Error('Developer mode is disabled')),
    };

    const result = await checkUserScriptsStatus();
    expect(result).toEqual({ allowed: false, error: 'Developer mode is disabled' });
  });

  it('userScripts.getScripts() が非 Error 例外（文字列等）でキャッチされた場合は文字列化したエラーを返す', async () => {
    (globalThis as any).chrome.userScripts = {
      ...originalUserScripts,
      getScripts: vi.fn().mockRejectedValue('Custom string error'),
    };

    const result = await checkUserScriptsStatus();
    expect(result).toEqual({ allowed: false, error: 'Custom string error' });
  });
});

describe('getTwitchAuthToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('https://www.twitch.tv の chrome.cookies.get で auth-token が取得できる場合、そのトークンを返す', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    mockChrome.cookies.get.mockImplementation((details: any, cb: any) => {
      if (details.url === 'https://www.twitch.tv' && details.name === 'auth-token') {
        cb({ value: 'token_www_twitch' });
      } else {
        cb(null);
      }
    });

    const token = await getTwitchAuthToken();

    expect(token).toBe('token_www_twitch');
    expect(mockChrome.cookies.get).toHaveBeenCalledWith(
      { url: 'https://www.twitch.tv', name: 'auth-token' },
      expect.any(Function)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('[gnb-twipper] Auth-token found via www.twitch.tv URL');

    consoleLogSpy.mockRestore();
  });

  it('www.twitch.tv では取得できず、https://gql.twitch.tv の chrome.cookies.get で取得できる場合、そのトークンを返す', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    mockChrome.cookies.get.mockImplementation((details: any, cb: any) => {
      if (details.url === 'https://gql.twitch.tv' && details.name === 'auth-token') {
        cb({ value: 'token_gql_twitch' });
      } else {
        cb(null);
      }
    });

    const token = await getTwitchAuthToken();

    expect(token).toBe('token_gql_twitch');
    expect(mockChrome.cookies.get).toHaveBeenCalledTimes(2);
    expect(consoleLogSpy).toHaveBeenCalledWith('[gnb-twipper] Auth-token found via gql.twitch.tv URL');

    consoleLogSpy.mockRestore();
  });

  it('個別URLでの取得は失敗し、chrome.cookies.getAll から twitch.tv ドメインの auth-token が取得できる場合、そのトークンを返す', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    mockChrome.cookies.get.mockImplementation((_details: any, cb: any) => {
      cb(null);
    });

    mockChrome.cookies.getAll.mockImplementation((details: any, cb: any) => {
      if (details.name === 'auth-token') {
        cb([
          { domain: 'other.com', name: 'auth-token', value: 'other_token' },
          { domain: '.twitch.tv', name: 'auth-token', value: 'token_get_all' },
        ]);
      } else {
        cb([]);
      }
    });

    const token = await getTwitchAuthToken();

    expect(token).toBe('token_get_all');
    expect(mockChrome.cookies.getAll).toHaveBeenCalledWith(
      { name: 'auth-token' },
      expect.any(Function)
    );
    expect(consoleLogSpy).toHaveBeenCalledWith('[gnb-twipper] Auth-token found via cookies.getAll search for twitch.tv');

    consoleLogSpy.mockRestore();
  });

  it('cookie オブジェクトが存在しても value が空文字列の場合は次の取得手段へフォールバックする', async () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    mockChrome.cookies.get.mockImplementation((details: any, cb: any) => {
      if (details.url === 'https://www.twitch.tv') {
        cb({ value: '' }); // 空文字列
      } else if (details.url === 'https://gql.twitch.tv') {
        cb({ value: 'fallback_gql_token' });
      } else {
        cb(null);
      }
    });

    const token = await getTwitchAuthToken();

    expect(token).toBe('fallback_gql_token');
    expect(consoleLogSpy).toHaveBeenCalledWith('[gnb-twipper] Auth-token found via gql.twitch.tv URL');

    consoleLogSpy.mockRestore();
  });

  it('どの方法でも cookie が見つからない（または value が空）場合は null を返し console.warn を出力する', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');

    mockChrome.cookies.get.mockImplementation((_details: any, cb: any) => {
      cb(null);
    });

    mockChrome.cookies.getAll.mockImplementation((_details: any, cb: any) => {
      cb([{ domain: '.twitch.tv', name: 'auth-token', value: '' }]); // 空文字列
    });

    const token = await getTwitchAuthToken();

    expect(token).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith('[gnb-twipper] Auth-token cookie NOT found');

    consoleWarnSpy.mockRestore();
  });
});

describe('Client-ID logging security', () => {
  it('chrome.storage.local から Client-ID をロードした際にログへ生の Client-ID 値を出力しないこと', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const secretClientId = 'sensitive_client_id_abc123';

    // モックの get メソッドを呼び出された際にコールバックを実行するように動作確認
    const getMock = mockChrome.storage.local.get;
    let getCallback: any = null;
    for (const call of getMock.mock.calls) {
      if (Array.isArray(call[0]) && call[0].includes('detectedClientId') && typeof call[1] === 'function') {
        getCallback = call[1];
        break;
      }
    }

    if (getCallback) {
      getCallback({ detectedClientId: secretClientId });
    }

    const matchedLogs = consoleSpy.mock.calls.filter((call) =>
      call.some((arg) => typeof arg === 'string' && arg.includes('[gnb-twipper] Loaded saved Client-ID'))
    );

    for (const logCall of consoleSpy.mock.calls) {
      for (const arg of logCall) {
        expect(String(arg)).not.toContain(secretClientId);
      }
    }

    consoleSpy.mockRestore();
  });

  it('webRequest で Client-ID をキャプチャした際にログへ生の Client-ID 値を出力しないこと', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const capturedClientId = 'captured_client_id_xyz789';

    const addListenerMock = mockChrome.webRequest.onBeforeSendHeaders.addListener;
    if (addListenerMock.mock.calls.length > 0) {
      const listener = addListenerMock.mock.calls[0][0];
      listener({
        requestHeaders: [
          { name: 'Client-ID', value: capturedClientId }
        ]
      });
    }

    for (const logCall of consoleSpy.mock.calls) {
      for (const arg of logCall) {
        expect(String(arg)).not.toContain(capturedClientId);
      }
    }

    consoleSpy.mockRestore();
  });
});

describe('parseFollowedLiveGqlResponse', () => {
  it('GQLレスポンスを正しくパースし、console.log で生データをログ出力しない', () => {
    const consoleLogSpy = vi.spyOn(console, 'log');

    const sampleGqlData = [
      {
        data: {
          currentUser: {
            id: '12345',
            follows: {
              edges: [
                {
                  node: {
                    id: '101',
                    login: 'testuser',
                    displayName: 'TestUser',
                    profileImageURL: 'https://example.com/pic.jpg',
                    stream: {
                      id: 's101',
                      title: 'Test Stream Title',
                      viewersCount: 150,
                      game: {
                        name: 'Just Chatting',
                      },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    ];

    const result = parseFollowedLiveGqlResponse(sampleGqlData);

    expect(result).toEqual([
      {
        user_login: 'testuser',
        user_name: 'TestUser',
        title: 'Test Stream Title',
        game_name: 'Just Chatting',
        profile_image_url: 'https://example.com/pic.jpg',
        viewer_count: 150,
      },
    ]);

    // 生データを含む console.log の呼び出しが行われないことを検証
    expect(consoleLogSpy).not.toHaveBeenCalledWith('[gnb-twipper] GQL raw response structure:', sampleGqlData);

    consoleLogSpy.mockRestore();
  });

  it('currentUser が存在しない場合は null を返し console.warn を出力する', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn');

    const result = parseFollowedLiveGqlResponse([{ data: {} }]);

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[gnb-twipper] GQL currentUser is null. Token may be invalid or Twitch Integrity protection triggered.'
    );

    consoleWarnSpy.mockRestore();
  });
});

describe('getTwitchDeviceId', () => {
  it('chrome.cookies.get で unique_id クッキーが取得できた場合、その値を返す', async () => {
    mockChrome.cookies.get.mockImplementation((details, cb) => {
      if (details.url === 'https://www.twitch.tv' && details.name === 'unique_id') {
        cb({ name: 'unique_id', value: 'device_id_12345' });
      } else {
        cb(null);
      }
    });

    const deviceId = await getTwitchDeviceId();
    expect(deviceId).toBe('device_id_12345');
    expect(mockChrome.cookies.get).toHaveBeenCalledWith(
      { url: 'https://www.twitch.tv', name: 'unique_id' },
      expect.any(Function)
    );
  });

  it('chrome.cookies.get が null を返し、chrome.cookies.getAll にフォールバックして twitch.tv に一致するクッキーがある場合その値を返す', async () => {
    mockChrome.cookies.get.mockImplementation((_details, cb) => {
      cb(null);
    });

    mockChrome.cookies.getAll.mockImplementation((details, cb) => {
      if (details.name === 'unique_id') {
        cb([
          { domain: '.other.com', value: 'other_id' },
          { domain: '.twitch.tv', value: 'fallback_device_id_67890' },
        ]);
      } else {
        cb([]);
      }
    });

    const deviceId = await getTwitchDeviceId();
    expect(deviceId).toBe('fallback_device_id_67890');
    expect(mockChrome.cookies.getAll).toHaveBeenCalledWith(
      { name: 'unique_id' },
      expect.any(Function)
    );
  });

  it('chrome.cookies.get が null を返し、chrome.cookies.getAll でも twitch.tv に一致するクッキーがない場合 null を返す', async () => {
    mockChrome.cookies.get.mockImplementation((_details, cb) => {
      cb(null);
    });

    mockChrome.cookies.getAll.mockImplementation((details, cb) => {
      if (details.name === 'unique_id') {
        cb([
          { domain: '.other.com', value: 'other_id' },
        ]);
      } else {
        cb([]);
      }
    });

    const deviceId = await getTwitchDeviceId();
    expect(deviceId).toBeNull();
  });

  it('chrome.cookies.get でクッキーの value が空または未定義の場合、chrome.cookies.getAll にフォールバックする', async () => {
    mockChrome.cookies.get.mockImplementation((_details, cb) => {
      cb({ name: 'unique_id', value: '' });
    });

    mockChrome.cookies.getAll.mockImplementation((details, cb) => {
      if (details.name === 'unique_id') {
        cb([
          { domain: 'www.twitch.tv', value: 'fallback_from_empty_value' },
        ]);
      } else {
        cb([]);
      }
    });

    const deviceId = await getTwitchDeviceId();
    expect(deviceId).toBe('fallback_from_empty_value');
    expect(mockChrome.cookies.getAll).toHaveBeenCalledWith(
      { name: 'unique_id' },
      expect.any(Function)
    );
  });
});

describe('getWatchTimeMap and setWatchTimeMap', () => {
  beforeEach(() => {
    setWatchTimeMap({});
  });

  it('getWatchTimeMap は現在の watchTimeMap オブジェクトを返す', () => {
    const map = getWatchTimeMap();
    expect(map).toEqual({});
  });

  it('setWatchTimeMap はオブジェクト参照を維持しながら内容を置換する', () => {
    const refBefore = getWatchTimeMap();

    setWatchTimeMap({ streamer1: 100, streamer2: 200 });

    const refAfter = getWatchTimeMap();

    // 同一参照であることを検証
    expect(refAfter).toBe(refBefore);
    // 内容が更新されていることを検証
    expect(refAfter).toEqual({ streamer1: 100, streamer2: 200 });
  });

  it('setWatchTimeMap は既存のキーをクリアして新しいキー・値で上書きする', () => {
    setWatchTimeMap({ old_streamer: 500 });
    expect(getWatchTimeMap()).toHaveProperty('old_streamer', 500);

    setWatchTimeMap({ new_streamer: 120 });

    const map = getWatchTimeMap();
    expect(map).not.toHaveProperty('old_streamer');
    expect(map).toHaveProperty('new_streamer', 120);
  });

  it('setWatchTimeMap に空オブジェクトを渡した場合はすべてのキーがクリアされる', () => {
    setWatchTimeMap({ streamer1: 300, streamer2: 400 });

    setWatchTimeMap({});

    const map = getWatchTimeMap();
    expect(Object.keys(map)).toHaveLength(0);
  });
});

describe('syncCustomUserScript', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('既存のスクリプトが存在する場合に unregister が正常に呼び出され、新スクリプトが登録される', async () => {
    mockChrome.userScripts.getScripts.mockResolvedValueOnce([{ id: 'gnb-twipper-custom-script' }]);
    mockChrome.userScripts.unregister.mockResolvedValueOnce(undefined);
    mockChrome.userScripts.register.mockResolvedValueOnce(undefined);

    const result = await syncCustomUserScript(sampleSettings);

    expect(result).toEqual({ allowed: true });
    expect(mockChrome.userScripts.getScripts).toHaveBeenCalledWith({ ids: ['gnb-twipper-custom-script'] });
    expect(mockChrome.userScripts.unregister).toHaveBeenCalledWith({ ids: ['gnb-twipper-custom-script'] });
    expect(mockChrome.userScripts.register).toHaveBeenCalledWith([
      {
        id: 'gnb-twipper-custom-script',
        matches: ['*://*.twitch.tv/*'],
        js: [{ code: 'console.log("hello")' }],
        world: 'MAIN',
        runAt: 'document_idle',
      },
    ]);
  });

  it('userScriptsApi.unregister がエラーをスローした場合、エラーがキャッチされ allowed: false とエラーメッセージを返す', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockChrome.userScripts.getScripts.mockResolvedValueOnce([{ id: 'gnb-twipper-custom-script' }]);
    mockChrome.userScripts.unregister.mockRejectedValueOnce(new Error('Unregister failed'));

    const result = await syncCustomUserScript(sampleSettings);

    expect(result).toEqual({ allowed: false, error: 'Unregister failed' });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[gnb-twipper] Error syncing user script via userScripts API:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('userScriptsApi.getScripts がエラーをスローした場合、エラーがキャッチされ allowed: false とエラーメッセージを返す', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockChrome.userScripts.getScripts.mockRejectedValueOnce(new Error('UserScripts API disabled'));

    const result = await syncCustomUserScript(sampleSettings);

    expect(result).toEqual({ allowed: false, error: 'UserScripts API disabled' });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[gnb-twipper] Error syncing user script via userScripts API:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });

  it('userScriptsApi.register がエラーをスローした場合、エラーがキャッチされ allowed: false とエラーメッセージを返す', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockChrome.userScripts.getScripts.mockResolvedValueOnce([]);
    mockChrome.userScripts.register.mockRejectedValueOnce(new Error('Register failed'));

    const result = await syncCustomUserScript(sampleSettings);

    expect(result).toEqual({ allowed: false, error: 'Register failed' });
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[gnb-twipper] Error syncing user script via userScripts API:',
      expect.any(Error)
    );

    consoleWarnSpy.mockRestore();
  });
});
