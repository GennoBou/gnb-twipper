import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeSendMessage } from './messaging';
import type { ExtensionMessage } from '../types';

describe('safeSendMessage', () => {
  const originalChrome = (globalThis as any).chrome;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
  });

  it('chrome.runtime.lastError が null の場合、メッセージを送信してコールバックを実行する', () => {
    const mockSendMessage = vi.fn((message, callback) => {
      if (callback) callback({ status: 'ok' });
    });

    (globalThis as any).chrome = {
      runtime: {
        id: 'test-extension-id',
        sendMessage: mockSendMessage,
        lastError: null,
      },
    };

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    safeSendMessage(msg, callback);

    expect(mockSendMessage).toHaveBeenCalledWith(msg, expect.any(Function));
    expect(callback).toHaveBeenCalledWith({ status: 'ok' });
  });

  it('chrome.runtime.lastError が設定されている場合、コールバックを実行しない', () => {
    (globalThis as any).chrome = {
      runtime: {
        id: 'test-extension-id',
        get lastError() {
          return { message: 'Extension context invalidated.' };
        },
        sendMessage: vi.fn((message, callback) => {
          if (callback) callback(undefined);
        }),
      },
    };

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    safeSendMessage(msg, callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('chrome.runtime.sendMessage が同期例外をスローした場合も安全に処理する', () => {
    const mockSendMessage = vi.fn(() => {
      throw new Error('Extension context invalidated');
    });

    (globalThis as any).chrome = {
      runtime: {
        id: 'test-extension-id',
        sendMessage: mockSendMessage,
      },
    };

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    expect(() => safeSendMessage(msg, callback)).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('chrome が undefined の場合は何もしない', () => {
    (globalThis as any).chrome = undefined;

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    expect(() => safeSendMessage(msg, callback)).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('chrome.runtime が undefined の場合は何もしない', () => {
    (globalThis as any).chrome = {};

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    expect(() => safeSendMessage(msg, callback)).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('chrome.runtime.id が undefined の場合は何もしない', () => {
    (globalThis as any).chrome = {
      runtime: {
        id: undefined,
        sendMessage: vi.fn(),
      },
    };

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    safeSendMessage(msg, callback);

    expect((globalThis as any).chrome.runtime.sendMessage).not.toHaveBeenCalled();
    expect(callback).not.toHaveBeenCalled();
  });
});
