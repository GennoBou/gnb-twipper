import { performance } from 'perf_hooks';

interface StreamInfo {
  user_login: string;
  user_name: string;
  title: string;
  game_name: string;
  profile_image_url: string;
  viewer_count: number;
  watch_time_seconds?: number;
}

function generateStreamers(count: number): StreamInfo[] {
  return Array.from({ length: count }, (_, i) => ({
    user_login: `streamer_${i}`,
    user_name: `Streamer ${i}`,
    title: `Stream Title ${i}`,
    game_name: `Game ${i}`,
    profile_image_url: `https://example.com/img${i}.png`,
    viewer_count: i * 10,
  }));
}

function runBenchmark() {
  const sizes = [10, 100, 1000, 10000];
  const iterations = 100000;

  console.log('=== Performance Benchmark: forEach vs find ===\n');

  for (const size of sizes) {
    const liveStreamers = generateStreamers(size);
    const watchTimeMap: Record<string, number> = {};

    // Test cases: key at start, middle, end, not found
    const targetKeys = [
      { name: 'Start (index 0)', key: liveStreamers[0].user_login.toLowerCase() },
      { name: 'Middle (index mid)', key: liveStreamers[Math.floor(size / 2)].user_login.toLowerCase() },
      { name: 'End (index last)', key: liveStreamers[size - 1].user_login.toLowerCase() },
      { name: 'Not Found', key: 'non_existent_streamer' },
    ];

    console.log(`--- Array Size: ${size} items (${iterations.toLocaleString()} iterations) ---`);

    for (const { name, key } of targetKeys) {
      watchTimeMap[key] = (watchTimeMap[key] || 0) + 1;

      // 1. Current implementation using forEach
      const startForEach = performance.now();
      for (let i = 0; i < iterations; i++) {
        let updated = false;
        liveStreamers.forEach((s) => {
          if (s.user_login.toLowerCase() === key) {
            s.watch_time_seconds = watchTimeMap[key];
            updated = true;
          }
        });
      }
      const endForEach = performance.now();
      const timeForEach = endForEach - startForEach;

      // 2. Optimized implementation using find
      const startFind = performance.now();
      for (let i = 0; i < iterations; i++) {
        const target = liveStreamers.find((s) => s.user_login.toLowerCase() === key);
        if (target) {
          target.watch_time_seconds = watchTimeMap[key];
          // updated = true;
        }
      }
      const endFind = performance.now();
      const timeFind = endFind - startFind;

      const speedup = (timeForEach / timeFind).toFixed(2);
      const improvement = (((timeForEach - timeFind) / timeForEach) * 100).toFixed(1);

      console.log(
        `[${name}] forEach: ${timeForEach.toFixed(2)}ms | find: ${timeFind.toFixed(2)}ms | Speedup: ${speedup}x (${improvement}% faster)`
      );
    }
    console.log('');
  }
}

runBenchmark();
