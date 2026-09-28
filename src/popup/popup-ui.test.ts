// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import Popup from './Popup.svelte';

describe('src/popup/Popup.svelte UI Interaction Tests', () => {
  let target: HTMLElement;
  let component: any;
  let mockSendMessage: any;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);

    mockSendMessage = vi.fn((message, callback) => {
      if (message.type === 'GET_AUTO_STATE') {
        callback &&
          callback({
            autoState: {
              isActive: false,
              timeRemainingSeconds: 120,
              totalDurationSeconds: 180,
              currentChannel: 'test_channel',
            },
            settings: {
              rotationTimeMinutes: 3,
              autoStartOnLogin: true,
              language: 'ja',
            },
            liveStreamers: [
              { user_login: 'streamer_1', user_name: '配信者1', watch_time_seconds: 65 },
            ],
          });
      } else if (message.type === 'GET_LIVE_STREAMERS') {
        callback &&
          callback({
            liveStreamers: [
              { user_login: 'streamer_1', user_name: '配信者1', watch_time_seconds: 65 },
            ],
          });
      }
    });

    (globalThis as any).chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        onMessage: {
          addListener: vi.fn(),
        },
        getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
        lastError: null,
      },
      tabs: {
        query: vi.fn((_obj, cb) => cb && cb([])),
        create: vi.fn(),
        update: vi.fn(),
      },
      windows: {
        update: vi.fn(),
      },
    };
  });

  afterEach(() => {
    if (component) {
      try {
        unmount(component);
      } catch {}
      component = null;
    }
    target.remove();
    vi.restoreAllMocks();
  });

  it('マウント時に初期状態要求（GET_AUTO_STATE, GET_LIVE_STREAMERS）を発行する', async () => {
    component = mount(Popup, { target });

    await vi.waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GET_AUTO_STATE' }),
        expect.any(Function)
      );

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GET_LIVE_STREAMERS' }),
        expect.any(Function)
      );
    });
  });

  it('オートモード開始ボタンをクリックすると START_AUTO_MODE が送信される', async () => {
    component = mount(Popup, { target });

    await vi.waitFor(() => {
      const buttons = Array.from(target.querySelectorAll('button'));
      const startButton = buttons.find((b) => b.textContent?.includes('開始') || b.textContent?.includes('Start'));
      expect(startButton).toBeDefined();
      if (startButton) {
        startButton.click();
      }
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'START_AUTO_MODE' })
    );
  });

  it('スキップボタンをクリックすると SKIP_NEXT が送信される', async () => {
    component = mount(Popup, { target });

    await vi.waitFor(() => {
      const buttons = Array.from(target.querySelectorAll('button'));
      const skipButton = buttons.find((b) => b.textContent?.includes('スキップ') || b.textContent?.includes('Skip'));
      expect(skipButton).toBeDefined();
      if (skipButton) {
        skipButton.click();
      }
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SKIP_NEXT' })
    );
  });
});
