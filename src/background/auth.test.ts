import { describe, it, expect, vi, afterEach } from 'vitest';
import { getTwitchAuthToken, getTwitchDeviceId } from './auth';

describe('src/background/auth.ts', () => {
  const originalChrome = (globalThis as any).chrome;

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
    vi.restoreAllMocks();
  });

  describe('getTwitchAuthToken', () => {
    it('https://www.twitch.tv の cookie から auth-token を正常に取得する', async () => {
      (globalThis as any).chrome = {
        cookies: {
          get: vi.fn(({ url }, cb) => {
            if (url === 'https://www.twitch.tv') {
              cb({ value: 'valid_token_123' });
            } else {
              cb(null);
            }
          }),
          getAll: vi.fn((_details, cb) => cb([])),
        },
      };

      const token = await getTwitchAuthToken();
      expect(token).toBe('valid_token_123');
    });

    it('www.twitch.tv で失敗した場合、https://gql.twitch.tv からフォールバック取得する', async () => {
      (globalThis as any).chrome = {
        cookies: {
          get: vi.fn(({ url }, cb) => {
            if (url === 'https://gql.twitch.tv') {
              cb({ value: 'gql_token_456' });
            } else {
              cb(null);
            }
          }),
          getAll: vi.fn((_details, cb) => cb([])),
        },
      };

      const token = await getTwitchAuthToken();
      expect(token).toBe('gql_token_456');
    });

    it('個別URLで失敗した場合、cookies.getAll からドメイン検索で取得する（domain が undefined の cookie が混在していても安全に処理する）', async () => {
      (globalThis as any).chrome = {
        cookies: {
          get: vi.fn((_details, cb) => cb(null)),
          getAll: vi.fn((_details, cb) =>
            cb([
              { value: 'other_token' }, // domain が undefined
              { value: 'global_token_789', domain: '.twitch.tv' },
            ])
          ),
        },
      };

      const token = await getTwitchAuthToken();
      expect(token).toBe('global_token_789');
    });

    it('cookie が見つからない場合は null を返す', async () => {
      (globalThis as any).chrome = {
        cookies: {
          get: vi.fn((_details, cb) => cb(null)),
          getAll: vi.fn((_details, cb) => cb([])),
        },
      };

      const token = await getTwitchAuthToken();
      expect(token).toBeNull();
    });
  });

  describe('getTwitchDeviceId', () => {
    it('https://www.twitch.tv の unique_id cookie から device ID を取得する', async () => {
      (globalThis as any).chrome = {
        cookies: {
          get: vi.fn(({ url, name }, cb) => {
            if (url === 'https://www.twitch.tv' && name === 'unique_id') {
              cb({ value: 'device_id_abc' });
            } else {
              cb(null);
            }
          }),
          getAll: vi.fn((_details, cb) => cb([])),
        },
      };

      const deviceId = await getTwitchDeviceId();
      expect(deviceId).toBe('device_id_abc');
    });

    it('cookies.get で見つからない場合、cookies.getAll から取得する', async () => {
      (globalThis as any).chrome = {
        cookies: {
          get: vi.fn((_details, cb) => cb(null)),
          getAll: vi.fn((_details, cb) => cb([{ value: 'device_id_fallback', domain: '.twitch.tv' }])),
        },
      };

      const deviceId = await getTwitchDeviceId();
      expect(deviceId).toBe('device_id_fallback');
    });

    it('どちらも見つからない場合は null を返す', async () => {
      (globalThis as any).chrome = {
        cookies: {
          get: vi.fn((_details, cb) => cb(null)),
          getAll: vi.fn((_details, cb) => cb([])),
        },
      };

      const deviceId = await getTwitchDeviceId();
      expect(deviceId).toBeNull();
    });
  });
});
