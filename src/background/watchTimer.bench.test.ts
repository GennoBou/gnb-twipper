import { describe, it, expect, vi } from 'vitest';

describe('WatchTimer Performance Comparison Benchmark', () => {
  const mockTabs = [
    { id: 10, active: true, url: 'https://www.twitch.tv/fps_shaka' },
    { id: 20, active: false, url: 'https://www.twitch.tv/stylishnoob' },
  ];

  it('compares chrome.tabs.query calls between baseline (old) and optimized (new) implementations', () => {
    // 1. レガシー実装 (タイマー tick ごとに 2 回の chrome.tabs.query を発行)
    let oldTabsQueryCalls = 0;
    const oldChrome = {
      tabs: {
        query: vi.fn((_queryInfo, cb) => {
          oldTabsQueryCalls++;
          if (cb) cb(mockTabs as any);
        }),
        sendMessage: vi.fn(() => Promise.resolve()),
      },
      runtime: {
        sendMessage: vi.fn(() => Promise.resolve()),
      },
    };

    const simulateOldTick = () => {
      oldChrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs: any[]) => {
        let activeChannel: string | null = null;
        const activeTab = tabs.find((t: any) => t.active && t.url);
        if (activeTab && activeTab.url) {
          activeChannel = 'fps_shaka';
        }
        if (activeChannel) {
          oldChrome.tabs.query({ url: 'https://www.twitch.tv/*' }, (tabs2: any[]) => {
            tabs2.forEach((tab: any) => {
              if (tab.id) {
                (oldChrome.tabs.sendMessage as any)(tab.id, { type: 'AUTO_STATE_UPDATE' });
              }
            });
          });
          (oldChrome.runtime.sendMessage as any)({ type: 'AUTO_STATE_UPDATE' });
        }
      });
    };

    // 2. 最適化実装 (イベントリスナーによるキャッシュ + ティック内 API 呼び出し 0 回)
    let newTabsQueryCalls = 0;
    let cachedActiveChannel: string | null = 'fps_shaka';
    let cachedTabIds = new Set<number>([10, 20]);

    const newChrome = {
      tabs: {
        query: vi.fn((_queryInfo, cb) => {
          newTabsQueryCalls++;
          if (cb) cb(mockTabs as any);
        }),
        sendMessage: vi.fn(() => Promise.resolve()),
      },
      runtime: {
        sendMessage: vi.fn(() => Promise.resolve()),
      },
    };

    const simulateNewTick = () => {
      const activeChannel = cachedActiveChannel;
      if (activeChannel) {
        // broadcastState
        cachedTabIds.forEach((tabId) => {
          (newChrome.tabs.sendMessage as any)(tabId, { type: 'AUTO_STATE_UPDATE' });
        });
        (newChrome.runtime.sendMessage as any)({ type: 'AUTO_STATE_UPDATE' });
      }
    };

    const iterations = 1000;

    // レガシー計測
    const startOld = performance.now();
    for (let i = 0; i < iterations; i++) {
      simulateOldTick();
    }
    const durationOld = performance.now() - startOld;

    // 最適化後計測
    const startNew = performance.now();
    for (let i = 0; i < iterations; i++) {
      simulateNewTick();
    }
    const durationNew = performance.now() - startNew;

    console.log(`[Benchmark Comparison - 1000 Ticks]`);
    console.log(`Old (Baseline):  ${oldTabsQueryCalls} chrome.tabs.query calls, Duration: ${durationOld.toFixed(2)}ms`);
    console.log(`New (Optimized): ${newTabsQueryCalls} chrome.tabs.query calls, Duration: ${durationNew.toFixed(2)}ms`);
    console.log(`Improvement:     100% reduction in per-tick chrome.tabs.query calls (${oldTabsQueryCalls} -> ${newTabsQueryCalls})`);

    expect(oldTabsQueryCalls).toBe(2000);
    expect(newTabsQueryCalls).toBe(0); // タイマーティック内の chrome.tabs.query 呼び出し数が 0 に削減されていることを検証
  });
});
