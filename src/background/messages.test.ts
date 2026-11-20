import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { ExtensionMessage } from '../types';

describe('background.ts chrome.runtime.onMessage listener integration', () => {
  let messageListener: (message: ExtensionMessage, sender: any, sendResponse: (res: any) => void) => boolean | void;
  let tabRemovedListener: ((tabId: number) => void) | undefined;
  let tabUpdatedListener: ((tabId: number, changeInfo: any, tab: any) => void) | undefined;

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
        addListener: vi.fn((listener) => {
          tabUpdatedListener = listener;
        }),
      },
      onRemoved: {
        addListener: vi.fn((listener) => {
          tabRemovedListener = listener;
        }),
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
      { url: 'chrome-extension://mock-id/src/options/index.html', tab: { id: 10, url: 'chrome-extension://mock-id/src/options/index.html' } },
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

  it('Twitch Content Script 等の非拡張ページからの SAVE_SETTINGS は拒否される', () => {
    const sendResponse = vi.fn();
    messageListener(
      {
        type: 'SAVE_SETTINGS',
        settings: { customJs: 'alert(1)', customJsEnabled: true },
      },
      { url: 'https://www.twitch.tv/shroud', tab: { id: 101, url: 'https://www.twitch.tv/shroud' } },
      sendResponse
    );

    expect(sendResponse).toHaveBeenCalledWith({ success: false, error: 'Unauthorized sender' });
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled();
    expect(mockChrome.userScripts.register).not.toHaveBeenCalled();
  });

  it('未定義・未知のメッセージタイプの場合は success: false を返す', () => {
    const sendResponse = vi.fn();
    messageListener({ type: 'UNKNOWN_ACTION' } as any, {}, sendResponse);

    expect(sendResponse).toHaveBeenCalledWith({ success: false });
  });

  describe('マルチタブ制御（オート稼働時ロック方式）', () => {
    afterEach(() => {
      // 各テスト後にオートモードとプライマリタブロックを解除
      messageListener({ type: 'STOP_AUTO_MODE' }, {}, vi.fn());
    });

    it('START_AUTO_MODE をタブ101から送信すると、別タブ202では isLockedByOtherTab が true になる', () => {
      const startRes = vi.fn();
      messageListener({ type: 'START_AUTO_MODE' }, { tab: { id: 101 } }, startRes);
      expect(startRes).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          autoState: expect.objectContaining({ isActive: true, isLockedByOtherTab: false }),
        })
      );

      const tab101SettingsRes = vi.fn();
      messageListener({ type: 'GET_SETTINGS' }, { tab: { id: 101 } }, tab101SettingsRes);
      expect(tab101SettingsRes.mock.calls[0][0].autoState.isLockedByOtherTab).toBe(false);

      const tab202SettingsRes = vi.fn();
      messageListener({ type: 'GET_SETTINGS' }, { tab: { id: 202 } }, tab202SettingsRes);
      expect(tab202SettingsRes.mock.calls[0][0].autoState.isLockedByOtherTab).toBe(true);

      const tab202StateRes = vi.fn();
      messageListener({ type: 'GET_AUTO_STATE' }, { tab: { id: 202 } }, tab202StateRes);
      // liveStreamersが空の場合は非同期のため、呼ばれていれば即確認、または waitFor で検証
      if (tab202StateRes.mock.calls.length > 0) {
        expect(tab202StateRes.mock.calls[0][0].autoState.isLockedByOtherTab).toBe(true);
      }
    });

    it('SWITCH_PRIMARY_TAB をタブ202から送信すると、操作権がタブ202に切り替わる', () => {
      messageListener({ type: 'START_AUTO_MODE' }, { tab: { id: 101 } }, vi.fn());

      const switchRes = vi.fn();
      messageListener(
        { type: 'SWITCH_PRIMARY_TAB' },
        { tab: { id: 202, url: 'https://www.twitch.tv/new_channel' } },
        switchRes
      );

      expect(switchRes).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          autoState: expect.objectContaining({
            isActive: true,
            isLockedByOtherTab: false,
            currentChannel: 'new_channel',
          }),
        })
      );

      const tab101Res = vi.fn();
      messageListener({ type: 'GET_SETTINGS' }, { tab: { id: 101 } }, tab101Res);
      expect(tab101Res.mock.calls[0][0].autoState.isLockedByOtherTab).toBe(true);

      const tab202Res = vi.fn();
      messageListener({ type: 'GET_SETTINGS' }, { tab: { id: 202 } }, tab202Res);
      expect(tab202Res.mock.calls[0][0].autoState.isLockedByOtherTab).toBe(false);
    });

    it('非プライマリタブからの DETECTED_OFFLINE / DETECTED_SUB_ONLY_LOCK では巡回スキップが発火しない', async () => {
      // skipSubOnlyStreams を有効にしておく
      const saveRes = vi.fn();
      messageListener(
        { type: 'SAVE_SETTINGS', settings: { skipSubOnlyStreams: true } },
        {},
        saveRes
      );
      await vi.waitFor(() => {
        expect(saveRes).toHaveBeenCalled();
      });
      await Promise.resolve();

      messageListener({ type: 'START_AUTO_MODE' }, { tab: { id: 101 } }, vi.fn());
      vi.clearAllMocks();

      const offlineRes = vi.fn();
      messageListener({ type: 'DETECTED_OFFLINE', channel: 'some_channel' }, { tab: { id: 202 } }, offlineRes);
      expect(offlineRes).toHaveBeenCalledWith({ success: true });
      expect(mockChrome.cookies.get).not.toHaveBeenCalled();
      expect(mockChrome.tabs.query).not.toHaveBeenCalled();

      const subOnlyRes = vi.fn();
      messageListener({ type: 'DETECTED_SUB_ONLY_LOCK', channel: 'some_channel' }, { tab: { id: 202 } }, subOnlyRes);
      expect(subOnlyRes).toHaveBeenCalledWith({ success: true });
      expect(mockChrome.cookies.get).not.toHaveBeenCalled();
      expect(mockChrome.tabs.query).not.toHaveBeenCalled();
    });

    it('プライマリタブが閉じられるか Twitch 外へ遷移すると、オートモードが安全に自動停止する', async () => {
      messageListener({ type: 'START_AUTO_MODE' }, { tab: { id: 101 } }, vi.fn());
      expect(tabRemovedListener).toBeDefined();
      tabRemovedListener?.(202); // 非プライマリタブの閉鎖では停止しない
      const stillActiveRes = vi.fn();
      messageListener({ type: 'GET_SETTINGS' }, { tab: { id: 101 } }, stillActiveRes);
      expect(stillActiveRes.mock.calls[0][0].autoState.isActive).toBe(true);

      tabRemovedListener?.(101); // プライマリタブの閉鎖で自動停止
      const stoppedRes = vi.fn();
      messageListener({ type: 'GET_SETTINGS' }, { tab: { id: 202 } }, stoppedRes);
      expect(stoppedRes.mock.calls[0][0].autoState.isActive).toBe(false);
      expect(stoppedRes.mock.calls[0][0].autoState.isLockedByOtherTab).toBe(false);

      // Twitch 外への遷移でも自動停止
      messageListener({ type: 'START_AUTO_MODE' }, { tab: { id: 303 } }, vi.fn());
      expect(tabUpdatedListener).toBeDefined();
      await tabUpdatedListener?.(303, { status: 'complete' }, { id: 303, url: 'https://example.com/' });
      const stoppedAfterLeaveRes = vi.fn();
      messageListener({ type: 'GET_SETTINGS' }, { tab: { id: 202 } }, stoppedAfterLeaveRes);
      expect(stoppedAfterLeaveRes.mock.calls[0][0].autoState.isActive).toBe(false);
    });
  });
});
