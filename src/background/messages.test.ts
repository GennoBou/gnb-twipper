import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ExtensionMessage } from '../types';

describe('background.ts chrome.runtime.onMessage listener integration', () => {
  let messageListener: (message: ExtensionMessage, sender: any, sendResponse: (res: any) => void) => boolean | void;

  const mockChrome = {
    storage: {
      local: {
        get: vi.fn((_keys, cb) => cb && cb({})),
        set: vi.fn(() => Promise.resolve()),
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
        addListener: vi.fn((listener) => {
          messageListener = listener;
        }),
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
      getScripts: vi.fn(() => Promise.resolve([])),
      unregister: vi.fn(() => Promise.resolve()),
      register: vi.fn(() => Promise.resolve()),
    },
  };

  (globalThis as any).chrome = mockChrome;
  if (typeof (globalThis as any).self === 'undefined') {
    (globalThis as any).self = globalThis;
  }
  (globalThis as any).fetch = vi.fn(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })));

  beforeEach(async () => {
    vi.clearAllMocks();
    // background.ts を読み込みリスナーを登録
    await import('./background');
  });

  it('AUTO_STATE_UPDATE メッセージは自己ループ防止のため即時無視（false）される', () => {
    const sendResponse = vi.fn();
    const result = messageListener(
      { type: 'AUTO_STATE_UPDATE', autoState: {} as any, settings: {} as any, liveStreamers: [] },
      {},
      sendResponse
    );

    expect(result).toBe(false);
    expect(sendResponse).not.toHaveBeenCalled();
  });

  it('GET_SETTINGS メッセージを受信した際、設定・巡回状態・配信者リストを返却する', () => {
    const sendResponse = vi.fn();
    messageListener({ type: 'GET_SETTINGS' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledTimes(1);
    const response = sendResponse.mock.calls[0][0];
    expect(response).toHaveProperty('settings');
    expect(response).toHaveProperty('autoState');
    expect(response).toHaveProperty('liveStreamers');
  });

  it('START_AUTO_MODE および STOP_AUTO_MODE でオートモードの開始・停止が動作する', () => {
    const startResponse = vi.fn();
    messageListener({ type: 'START_AUTO_MODE' }, {}, startResponse);
    expect(startResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(startResponse.mock.calls[0][0].autoState.isActive).toBe(true);

    const stopResponse = vi.fn();
    messageListener({ type: 'STOP_AUTO_MODE' }, {}, stopResponse);
    expect(stopResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    expect(stopResponse.mock.calls[0][0].autoState.isActive).toBe(false);
  });

  it('SKIP_NEXT で次のチャンネルへの巡回要求が処理される', () => {
    const sendResponse = vi.fn();
    messageListener({ type: 'SKIP_NEXT' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('SELECT_STREAMER で指定チャンネルへの選択と遷移が処理される', () => {
    const sendResponse = vi.fn();
    messageListener({ type: 'SELECT_STREAMER', channel: 'shroud' }, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        autoState: expect.objectContaining({ currentChannel: 'shroud' }),
      })
    );
  });

  it('OPEN_OPTIONS でオプション画面のURLを新規タブで開く', () => {
    const sendResponse = vi.fn();
    messageListener({ type: 'OPEN_OPTIONS' }, {}, sendResponse);

    expect(mockChrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://mock-id/src/options/index.html',
    });
    expect(sendResponse).toHaveBeenCalledWith({ success: true });
  });

  it('CHECK_USER_SCRIPTS_STATUS でスクリプトステータスが非同期返却される', async () => {
    const sendResponse = vi.fn();
    const keepOpen = messageListener({ type: 'CHECK_USER_SCRIPTS_STATUS' }, {}, sendResponse);

    expect(keepOpen).toBe(true);
    // 非同期Promise完了待ち
    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({ allowed: true });
    });
  });

  it('SAVE_SETTINGS で設定の保存と同期が実行される', async () => {
    const sendResponse = vi.fn();
    const keepOpen = messageListener(
      {
        type: 'SAVE_SETTINGS',
        settings: { rotationTimeMinutes: 5, language: 'en' },
      },
      {},
      sendResponse
    );

    expect(keepOpen).toBe(true);
    await vi.waitFor(() => {
      expect(mockChrome.storage.local.set).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          settings: expect.objectContaining({ rotationTimeMinutes: 5, language: 'en' }),
        })
      );
    });
  });

  it('未定義・未知のメッセージタイプの場合は success: false を返す', () => {
    const sendResponse = vi.fn();
    messageListener({ type: 'UNKNOWN_ACTION' } as any, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: false });
  });
});
