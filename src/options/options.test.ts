// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import Options from './Options.svelte';

describe('src/options/Options.svelte Component Test', () => {
  let target: HTMLElement;
  let component: any;
  let mockSendMessage: any;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);

    mockSendMessage = vi.fn((message, callback) => {
      if (message.type === 'GET_SETTINGS') {
        callback({
          settings: {
            rotationTimeMinutes: 5,
            autoStartOnLogin: true,
            language: 'ja',
            customCss: 'body { color: blue; }',
            customJs: 'console.log("test");',
            customCssEnabled: true,
            customJsEnabled: false,
            excludedChannels: [
              { user_login: 'excluded_streamer', user_name: '除外配信者', enabled: true, addedAt: 12345 },
            ],
            skipSubOnlyStreams: true,
            allowSubOnlyFreePreview: false,
          },
          liveStreamers: [
            { user_login: 'shroud', user_name: 'Shroud' },
          ],
        });
      } else if (message.type === 'CHECK_USER_SCRIPTS_STATUS') {
        callback({ allowed: true });
      } else if (message.type === 'SAVE_SETTINGS') {
        callback({ success: true });
      }
    });

    (globalThis as any).chrome = {
      runtime: {
        sendMessage: mockSendMessage,
        lastError: null,
      },
      tabs: {
        create: vi.fn(),
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

  it('マウント時に GET_SETTINGS と CHECK_USER_SCRIPTS_STATUS を送信して初期設定を読み込む', async () => {
    component = mount(Options, { target });

    await vi.waitFor(() => {
      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'GET_SETTINGS' }),
        expect.any(Function)
      );

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'CHECK_USER_SCRIPTS_STATUS' }),
        expect.any(Function)
      );
    });
  });

  it('初期ロード完了後、除外チャンネル一覧がレンダリングされる', async () => {
    component = mount(Options, { target });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('excluded_streamer');
    });
  });

  it('保存ボタン（または即時保存）をクリックした際に SAVE_SETTINGS が送信される', async () => {
    component = mount(Options, { target });

    await vi.waitFor(() => {
      const buttons = Array.from(target.querySelectorAll('button'));
      const saveButton = buttons.find((b) => b.textContent?.includes('保存') || b.textContent?.includes('Save'));
      expect(saveButton).toBeDefined();
      if (saveButton) {
        saveButton.click();
      }
    });

    expect(mockSendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SAVE_SETTINGS' }),
      expect.any(Function)
    );
  });
});
