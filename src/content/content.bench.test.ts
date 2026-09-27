import { describe, it, expect } from 'vitest';
import type { StreamInfo } from '../types';

function generateMockParsedStreamers(count: number, duplicateRatio: number = 0.2): StreamInfo[] {
  const list: StreamInfo[] = [];
  const uniqueCount = Math.floor(count * (1 - duplicateRatio));

  for (let i = 0; i < count; i++) {
    const streamerId = i % uniqueCount;
    list.push({
      user_login: `streamer_${streamerId}`,
      user_name: `Streamer ${streamerId}`,
      game_name: `Game ${streamerId}`,
      profile_image_url: `https://example.com/avatar_${streamerId}.jpg`,
      viewer_count: 100 + streamerId,
    });
  }
  return list;
}

// O(N^2) Baseline
function deduplicateBaseline(parsedStreamers: StreamInfo[]): StreamInfo[] {
  const streamers: StreamInfo[] = [];
  parsedStreamers.forEach((streamer) => {
    if (streamer && !streamers.some((s) => s.user_login.toLowerCase() === streamer.user_login)) {
      streamers.push(streamer);
    }
  });
  return streamers;
}

// O(N) Optimized
function deduplicateOptimized(parsedStreamers: StreamInfo[]): StreamInfo[] {
  const streamers: StreamInfo[] = [];
  const seenLogins = new Set<string>();
  parsedStreamers.forEach((streamer) => {
    if (streamer && !seenLogins.has(streamer.user_login)) {
      seenLogins.add(streamer.user_login);
      streamers.push(streamer);
    }
  });
  return streamers;
}

describe('Content DOM Streamer Duplication Check Benchmark', () => {
  it('correctness check: both baseline and optimized produce identical results', () => {
    const mockData = generateMockParsedStreamers(500, 0.3);
    const baselineResult = deduplicateBaseline(mockData);
    const optimizedResult = deduplicateOptimized(mockData);

    expect(optimizedResult).toEqual(baselineResult);
  });

  it('measures execution time for baseline O(N^2) vs optimized O(N) Set check', { timeout: 30000 }, () => {
    const itemCount = 5000;
    const iterations = 50;
    const mockData = generateMockParsedStreamers(itemCount, 0.2);

    // Warm-up
    deduplicateBaseline(mockData);
    deduplicateOptimized(mockData);

    // Baseline benchmark
    const startBaseline = performance.now();
    for (let i = 0; i < iterations; i++) {
      deduplicateBaseline(mockData);
    }
    const durationBaseline = performance.now() - startBaseline;

    // Optimized benchmark
    const startOptimized = performance.now();
    for (let i = 0; i < iterations; i++) {
      deduplicateOptimized(mockData);
    }
    const durationOptimized = performance.now() - startOptimized;

    const avgBaseline = durationBaseline / iterations;
    const avgOptimized = durationOptimized / iterations;
    const speedupPct = ((durationBaseline - durationOptimized) / durationBaseline * 100).toFixed(1);

    console.log(`[BENCHMARK] Duplication Check (${itemCount} items, ${iterations} iterations):`);
    console.log(`  Baseline O(N^2): ${avgBaseline.toFixed(3)} ms / iter (Total: ${durationBaseline.toFixed(2)} ms)`);
    console.log(`  Optimized O(N):  ${avgOptimized.toFixed(3)} ms / iter (Total: ${durationOptimized.toFixed(2)} ms)`);
    console.log(`  Speedup:         ${speedupPct}% faster`);

    expect(avgOptimized).toBeLessThan(avgBaseline);
  });
});
