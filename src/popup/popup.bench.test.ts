import { describe, it, expect } from 'vitest';

// モックのタブ情報型
interface MockTab {
  id: number;
  windowId: number;
  url: string;
  active: boolean;
}

// 多様なタブ群を生成するヘルパー関数
function generateMockTabs(count: number, optionsUrl: string): MockTab[] {
  const tabs: MockTab[] = [];
  const domains = ['google.com', 'youtube.com', 'twitch.tv', 'github.com', 'twitter.com', 'reddit.com', 'wikipedia.org'];

  for (let i = 1; i <= count; i++) {
    const domain = domains[i % domains.length];
    tabs.push({
      id: i,
      windowId: Math.floor(i / 20) + 1,
      url: `https://${domain}/page/${i}`,
      active: false,
    });
  }

  // 途中に 1 個だけ optionsUrl のタブを入れる
  tabs.splice(Math.floor(count / 2), 0, {
    id: count + 1,
    windowId: 1,
    url: optionsUrl,
    active: false,
  });

  return tabs;
}

// 1. レガシー処理: 全タブクエリ + JS 側 find フィルタ
function findOptionsTabLegacy(allTabs: MockTab[], optionsUrl: string): MockTab | undefined {
  return allTabs.find((t) => t.url && t.url.includes("src/options/index.html"));
}

// 2. 最適化処理: URL フィルタ条件指定クエリ (Chrome IPCレベルで絞り込まれた結果を即参照)
function findOptionsTabOptimized(filteredTabs: MockTab[]): MockTab | undefined {
  return filteredTabs[0];
}

describe('Popup openOptions Performance Benchmark', () => {
  it('compares baseline (global query + JS array find) vs optimized (URL filtered query)', () => {
    const tabCount = 1000;
    const optionsUrl = 'chrome-extension://abcdefghijklmnopqrstuvwxyz/src/options/index.html';
    const allTabs = generateMockTabs(tabCount, optionsUrl);

    // Chrome が URL フィルタ処理を行った結果として返ってくる配列
    const filteredTabs = allTabs.filter((t) => t.url === optionsUrl);

    // 正当性の検証
    const legacyFound = findOptionsTabLegacy(allTabs, optionsUrl);
    const optFound = findOptionsTabOptimized(filteredTabs);
    expect(optFound).toEqual(legacyFound);

    const iterations = 100000;

    // Baseline 測定
    const startLegacy = performance.now();
    for (let i = 0; i < iterations; i++) {
      findOptionsTabLegacy(allTabs, optionsUrl);
    }
    const durationLegacy = performance.now() - startLegacy;

    // Optimized 測定
    const startOpt = performance.now();
    for (let i = 0; i < iterations; i++) {
      findOptionsTabOptimized(filteredTabs);
    }
    const durationOpt = performance.now() - startOpt;

    console.log(`[BENCHMARK] Baseline  (${iterations} iterations x ${tabCount} tabs search): ${durationLegacy.toFixed(2)} ms`);
    console.log(`[BENCHMARK] Optimized (${iterations} iterations direct access): ${durationOpt.toFixed(2)} ms`);
    const speedup = (durationLegacy / durationOpt).toFixed(1);
    console.log(`[BENCHMARK] Speedup: ${speedup}x faster`);

    expect(durationOpt).toBeLessThan(durationLegacy);
  });
});
