import { vi } from 'vitest';

const mockChrome = {
  storage: {
    local: {
      get: vi.fn((_keys, cb) => cb && cb({})),
      set: vi.fn(),
      remove: vi.fn(),
    },
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    },
  },
  webRequest: {
    onBeforeSendHeaders: {
      addListener: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    onUpdated: {
      addListener: vi.fn(),
    },
  },
  runtime: {
    sendMessage: vi.fn().mockReturnValue(Promise.resolve()),
    getURL: vi.fn((path) => `chrome-extension://id/${path}`),
    onMessage: {
      addListener: vi.fn(),
    },
  },
  cookies: {
    get: vi.fn(),
    getAll: vi.fn(),
  },
  alarms: {
    create: vi.fn(),
    onAlarm: {
      addListener: vi.fn(),
    },
  },
  scripting: {
    executeScript: vi.fn(),
  },
};

vi.stubGlobal('chrome', mockChrome);
(globalThis as any).chrome = mockChrome;
(globalThis as any).self = globalThis;

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve([]),
}));
