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

// テスト用データ生成
function generateStreamers(count: number) {
  const list = [];
  for (let i = 0; i < count; i++) {
    list.push({
      user_login: `User_Login_${i}`,
      user_name: `User_Name_${i}`,
      title: `Stream Title ${i}`,
      game_name: `Game Name ${i}`,
      profile_image_url: `https://example.com/img/${i}.jpg`,
      viewer_count: i * 10,
    });
  }
  return list;
}

// レガシー処理
function processLegacy(rawFetched: any[], subOnlyMap: Record<string, boolean>) {
  const logins = rawFetched.map((s) => s.user_login);
  const fetchedStreamers = rawFetched.map((s) => ({
    ...s,
    is_sub_only: !!subOnlyMap[s.user_login.toLowerCase()],
  }));
  return { logins, fetchedStreamers };
}

// 最適化後処理
function processOptimized(rawFetched: any[], subOnlyMap: Record<string, boolean>) {
  const len = rawFetched.length;
  const logins: string[] = new Array(len);
  for (let i = 0; i < len; i++) {
    logins[i] = rawFetched[i].user_login;
  }

  const fetchedStreamers = new Array(len);
  for (let i = 0; i < len; i++) {
    const s = rawFetched[i];
    fetchedStreamers[i] = {
      ...s,
      is_sub_only: !!subOnlyMap[s.user_login.toLowerCase()],
    };
  }
  return { logins, fetchedStreamers };
}

describe('Performance Benchmark - Baseline vs Optimized Data Transformation', () => {
  it('compares baseline performance and optimized performance for 10,000 streamers', () => {
    const streamerCount = 10000;
    const rawFetched = generateStreamers(streamerCount);
    const subOnlyMap: Record<string, boolean> = {};
    for (let i = 0; i < streamerCount; i += 2) {
      subOnlyMap[`user_login_${i}`.toLowerCase()] = true;
    }

    // 正当性の検証 (同等の出力であることを確認)
    const legacyResult = processLegacy(rawFetched, subOnlyMap);
    const optResult = processOptimized(rawFetched, subOnlyMap);
    expect(optResult).toEqual(legacyResult);

    const iterations = 50;

    const startLegacy = performance.now();
    for (let i = 0; i < iterations; i++) {
      processLegacy(rawFetched, subOnlyMap);
    }
    const durationLegacy = performance.now() - startLegacy;

    const startOpt = performance.now();
    for (let i = 0; i < iterations; i++) {
      processOptimized(rawFetched, subOnlyMap);
    }
    const durationOpt = performance.now() - startOpt;

    console.log(`[Legacy]    ${iterations} iterations x ${streamerCount} items: ${durationLegacy.toFixed(2)} ms (avg ${(durationLegacy / iterations).toFixed(2)} ms/iter)`);
    console.log(`[Optimized] ${iterations} iterations x ${streamerCount} items: ${durationOpt.toFixed(2)} ms (avg ${(durationOpt / iterations).toFixed(2)} ms/iter)`);
    const improvement = ((durationLegacy - durationOpt) / durationLegacy * 100).toFixed(1);
    console.log(`[Improvement] Speedup: ${improvement}% faster`);
  });
});
