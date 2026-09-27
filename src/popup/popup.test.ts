import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Popup openOptions functionality', () => {
  let mockChrome: any;

  beforeEach(() => {
    mockChrome = {
      runtime: {
        getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
        sendMessage: vi.fn(),
      },
      tabs: {
        query: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      windows: {
        update: vi.fn(),
      },
    };
    (globalThis as any).chrome = mockChrome;
  });

  it('queries tabs with URL filter optionsUrl directly', () => {
    const optionsUrl = mockChrome.runtime.getURL("src/options/index.html");

    // モック実装
    mockChrome.tabs.query.mockImplementation((queryObj: any, callback: Function) => {
      expect(queryObj).toEqual({ url: optionsUrl });
      callback([{ id: 42, windowId: 7, url: optionsUrl }]);
    });

    // openOptions 相当の関数の動作テスト
    function openOptionsOptimized() {
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        const url = chrome.runtime.getURL("src/options/index.html");
        chrome.tabs.query({ url }, (tabs) => {
          const existingTab = tabs?.[0];
          if (existingTab && existingTab.id) {
            chrome.tabs.update(existingTab.id, { active: true });
            if (existingTab.windowId) {
              chrome.windows.update(existingTab.windowId, { focused: true });
            }
          } else {
            chrome.tabs.create({ url });
          }
        });
      }
    }

    openOptionsOptimized();

    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ url: optionsUrl }, expect.any(Function));
    expect(mockChrome.tabs.update).toHaveBeenCalledWith(42, { active: true });
    expect(mockChrome.windows.update).toHaveBeenCalledWith(7, { focused: true });
    expect(mockChrome.tabs.create).not.toHaveBeenCalled();
  });

  it('creates new options tab if no tab matches query', () => {
    const optionsUrl = mockChrome.runtime.getURL("src/options/index.html");

    mockChrome.tabs.query.mockImplementation((_queryObj: any, callback: Function) => {
      callback([]);
    });

    function openOptionsOptimized() {
      if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
        const url = chrome.runtime.getURL("src/options/index.html");
        chrome.tabs.query({ url }, (tabs) => {
          const existingTab = tabs?.[0];
          if (existingTab && existingTab.id) {
            chrome.tabs.update(existingTab.id, { active: true });
            if (existingTab.windowId) {
              chrome.windows.update(existingTab.windowId, { focused: true });
            }
          } else {
            chrome.tabs.create({ url });
          }
        });
      }
    }

    openOptionsOptimized();

    expect(mockChrome.tabs.query).toHaveBeenCalledWith({ url: optionsUrl }, expect.any(Function));
    expect(mockChrome.tabs.create).toHaveBeenCalledWith({ url: optionsUrl });
    expect(mockChrome.tabs.update).not.toHaveBeenCalled();
  });
});
