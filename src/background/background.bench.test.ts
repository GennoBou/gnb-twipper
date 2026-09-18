import { describe, it, expect } from 'vitest';
import { attachWatchTimeAndCleanup, setWatchTimeMap } from './background';
import type { StreamInfo } from '../types';

// モック chrome の設定
const mockChrome = {
  storage: {
    local: {
      get: (_keys: any, cb: any) => cb && cb({}),
      set: () => {},
      remove: () => {},
    },
    session: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
  webRequest: {
    onBeforeSendHeaders: { addListener: () => {} },
  },
  runtime: {
    onMessage: { addListener: () => {} },
    getURL: (p: string) => `chrome-extension://mock-id/${p}`,
    sendMessage: () => Promise.resolve(),
  },
  tabs: {
    query: (_q: any, cb: any) => cb && cb([]),
    sendMessage: () => Promise.resolve(),
    update: () => {},
    create: () => {},
    onUpdated: { addListener: () => {} },
  },
  cookies: {
    get: (_d: any, cb: any) => cb && cb(null),
    getAll: (_d: any, cb: any) => cb && cb([]),
  },
  alarms: {
    create: () => {},
    onAlarm: { addListener: () => {} },
  },
};

(globalThis as any).chrome = mockChrome;
if (typeof (globalThis as any).self === 'undefined') {
  (globalThis as any).self = globalThis;
}

function generateMockData(count: number) {
  const fetched: StreamInfo[] = [];
  const map: Record<string, number> = {};

  for (let i = 0; i < count; i++) {
    const login = `Streamer_${i}`;
    const loginLower = `streamer_${i}`;
    fetched.push({
      user_login: login,
      user_name: `Streamer ${i}`,
      title: `Live Stream Title ${i}`,
      game_name: `Game Name ${i}`,
      profile_image_url: `https://example.com/avatar_${i}.jpg`,
      viewer_count: 100 + i,
    });
    if (i % 2 === 0) {
      map[loginLower] = i * 10;
    }
  }

  // 配信終了（watchTimeMap にはあるが fetched にはない）チャンネルを追加
  for (let i = count; i < count + count / 10; i++) {
    map[`offline_streamer_${i}`] = 500;
  }

  return { fetched, map };
}

describe('attachWatchTimeAndCleanup Performance Benchmark', () => {
  it('measures execution time for 10,000 items', () => {
    const itemCount = 10000;
    const iterations = 50;
    const { fetched, map } = generateMockData(itemCount);

    // ウォームアップ
    setWatchTimeMap({ ...map });
    attachWatchTimeAndCleanup(fetched);

    let totalDuration = 0;
    for (let i = 0; i < iterations; i++) {
      setWatchTimeMap({ ...map });
      const start = performance.now();
      attachWatchTimeAndCleanup(fetched);
      const end = performance.now();
      totalDuration += end - start;
    }

    const avgMs = totalDuration / iterations;
    console.log(`[BENCHMARK] attachWatchTimeAndCleanup (${itemCount} items, ${iterations} runs): ${avgMs.toFixed(3)} ms per run`);
    expect(avgMs).toBeGreaterThan(0);
  });
});
