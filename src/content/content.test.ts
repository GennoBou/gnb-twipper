import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { safeSendMessage } from './content';
import type { ExtensionMessage } from '../types';

describe('safeSendMessage in content.ts', () => {
  const originalChrome = (globalThis as any).chrome;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
  });

  it('sends message successfully and calls responseCallback when chrome.runtime.lastError is null', () => {
    const mockSendMessage = vi.fn((message, callback) => {
      // simulate background returning response with no lastError
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

  it('does not call responseCallback when chrome.runtime.lastError is set', () => {
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

  it('handles synchronous exception thrown by chrome.runtime.sendMessage gracefully', () => {
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

  it('does nothing when chrome is undefined', () => {
    (globalThis as any).chrome = undefined;

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    expect(() => safeSendMessage(msg, callback)).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('does nothing when chrome.runtime is undefined', () => {
    (globalThis as any).chrome = {};

    const callback = vi.fn();
    const msg: ExtensionMessage = { type: 'GET_SETTINGS' };

    expect(() => safeSendMessage(msg, callback)).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });

  it('does nothing when chrome.runtime.id is undefined', () => {
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
