import { vi } from 'vitest';

const chromeMock = {
  storage: {
    local: {
      get: (_keys: any, cb: any) => cb && cb({}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    },
    session: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
  webRequest: {
    onBeforeSendHeaders: {
      addListener: () => {},
    },
  },
  tabs: {
    query: () => {},
    sendMessage: () => Promise.resolve(),
    update: () => {},
    onUpdated: {
      addListener: () => {},
    },
  },
  runtime: {
    onMessage: {
      addListener: () => {},
    },
    sendMessage: () => Promise.resolve(),
    getURL: (path: string) => path,
  },
  alarms: {
    create: () => {},
    onAlarm: {
      addListener: () => {},
    },
  },
  cookies: {
    get: (_details: any, cb: any) => cb && cb(null),
    getAll: (_details: any, cb: any) => cb && cb([]),
  },
};

vi.stubGlobal('chrome', chromeMock);
vi.stubGlobal('self', globalThis);
