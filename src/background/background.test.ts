import { describe, it, expect, beforeEach, vi } from 'vitest';

// モジュールインポート前に globalThis に mock を注入
const mockChrome = {
  storage: {
    local: {
      get: vi.fn((_keys, cb) => cb && cb({})),
      set: vi.fn(),
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
      addListener: vi.fn(),
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
};

(globalThis as any).chrome = mockChrome;
if (typeof (globalThis as any).self === 'undefined') {
  (globalThis as any).self = globalThis;
}
(globalThis as any).fetch = vi.fn(() => Promise.resolve({ ok: false, status: 500 }));

// chrome のモック設定後に background.ts をインポート
const { attachWatchTimeAndCleanup, getWatchTimeMap, setWatchTimeMap } = await import('./background');
import type { StreamInfo } from '../types';

describe('attachWatchTimeAndCleanup', () => {
  beforeEach(() => {
    // watchTimeMap の状態をリセット
    setWatchTimeMap({});
  });

  it('既存の視聴時間を fetched の各ストリーマーにマッピングする', () => {
    setWatchTimeMap({
      streamer1: 120,
      streamer2: 300,
    });

    const fetched: StreamInfo[] = [
      {
        user_login: 'streamer1',
        user_name: 'StreamerOne',
        title: 'Title 1',
        game_name: 'Game 1',
        profile_image_url: '',
        viewer_count: 100,
      },
      {
        user_login: 'streamer2',
        user_name: 'StreamerTwo',
        title: 'Title 2',
        game_name: 'Game 2',
        profile_image_url: '',
        viewer_count: 200,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    expect(result).toHaveLength(2);
    expect(result[0].watch_time_seconds).toBe(120);
    expect(result[1].watch_time_seconds).toBe(300);
  });

  it('視聴時間記録がないストリーマーには watch_time_seconds = 0 を設定する', () => {
    const fetched: StreamInfo[] = [
      {
        user_login: 'newstreamer',
        user_name: 'NewStreamer',
        title: 'New Stream',
        game_name: 'Game',
        profile_image_url: '',
        viewer_count: 50,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    expect(result[0].watch_time_seconds).toBe(0);
  });

  it('配信終了した（fetched に含まれない）チャンネルの視聴時間を watchTimeMap からクリーンアップする', () => {
    setWatchTimeMap({
      active_streamer: 150,
      offline_streamer: 500,
    });

    const fetched: StreamInfo[] = [
      {
        user_login: 'active_streamer',
        user_name: 'ActiveStreamer',
        title: 'Live',
        game_name: 'Game',
        profile_image_url: '',
        viewer_count: 300,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    // active_streamer の視聴時間は維持される
    expect(result[0].watch_time_seconds).toBe(150);
    // offline_streamer は watchTimeMap から削除されている
    const map = getWatchTimeMap();
    expect(map).toHaveProperty('active_streamer', 150);
    expect(map).not.toHaveProperty('offline_streamer');
  });

  it('大文字小文字（case-insensitivity）の違いを正しく解決してマッピング・維持する', () => {
    setWatchTimeMap({
      streamer_case: 240,
    });

    const fetched: StreamInfo[] = [
      {
        user_login: 'Streamer_Case', // fetched では大文字混ざり
        user_name: 'Streamer_Case',
        title: 'Title',
        game_name: 'Game',
        profile_image_url: '',
        viewer_count: 10,
      },
    ];

    const result = attachWatchTimeAndCleanup(fetched);

    expect(result[0].watch_time_seconds).toBe(240);
    const map = getWatchTimeMap();
    expect(map).toHaveProperty('streamer_case', 240);
  });

  it('fetched が空配列の場合、watchTimeMap 内のすべてのエントリーが削除される', () => {
    setWatchTimeMap({
      streamer1: 100,
      streamer2: 200,
    });

    const result = attachWatchTimeAndCleanup([]);

    expect(result).toHaveLength(0);
    const map = getWatchTimeMap();
    expect(Object.keys(map)).toHaveLength(0);
  });
});
