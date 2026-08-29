import { describe, it, expect } from 'vitest';
import type { StreamInfo } from '../types';
import { attachWatchTimeAndCleanup } from './background';

describe('attachWatchTimeAndCleanup', () => {
  const createMockStreamer = (login: string, name: string = login): StreamInfo => ({
    user_login: login,
    user_name: name,
    title: 'Test Stream',
    game_name: 'Just Chatting',
    profile_image_url: 'https://example.com/avatar.png',
    viewer_count: 100,
  });

  it('should attach existing watch time from targetWatchTimeMap to matching streamers', () => {
    const watchMap: Record<string, number> = {
      streamer1: 120,
      streamer2: 300,
    };

    const fetchedStreamers = [
      createMockStreamer('streamer1'),
      createMockStreamer('streamer2'),
    ];

    const result = attachWatchTimeAndCleanup(fetchedStreamers, watchMap);

    expect(result).toHaveLength(2);
    expect(result[0].watch_time_seconds).toBe(120);
    expect(result[1].watch_time_seconds).toBe(300);
  });

  it('should set watch_time_seconds to 0 for streamers not in targetWatchTimeMap', () => {
    const watchMap: Record<string, number> = {
      streamer1: 60,
    };

    const fetchedStreamers = [
      createMockStreamer('streamer1'),
      createMockStreamer('new_streamer'),
    ];

    const result = attachWatchTimeAndCleanup(fetchedStreamers, watchMap);

    expect(result[0].watch_time_seconds).toBe(60);
    expect(result[1].watch_time_seconds).toBe(0);
  });

  it('should cleanup watch times for streamers no longer live (expired / offline)', () => {
    const watchMap: Record<string, number> = {
      active_streamer: 150,
      offline_streamer: 500,
    };

    const fetchedStreamers = [
      createMockStreamer('active_streamer'),
    ];

    const result = attachWatchTimeAndCleanup(fetchedStreamers, watchMap);

    expect(result).toHaveLength(1);
    expect(result[0].watch_time_seconds).toBe(150);
    // offline_streamer should be removed from watchMap
    expect(watchMap).toEqual({
      active_streamer: 150,
    });
    expect(watchMap).not.toHaveProperty('offline_streamer');
  });

  it('should handle empty fetched streamers array and clear all watch time records', () => {
    const watchMap: Record<string, number> = {
      streamer1: 100,
      streamer2: 200,
    };

    const result = attachWatchTimeAndCleanup([], watchMap);

    expect(result).toEqual([]);
    expect(watchMap).toEqual({});
  });

  it('should handle case insensitivity correctly for user_login comparison and watchTimeMap lookup', () => {
    const watchMap: Record<string, number> = {
      uppercase_user: 250,
    };

    const fetchedStreamers = [
      createMockStreamer('UpperCase_User'),
    ];

    const result = attachWatchTimeAndCleanup(fetchedStreamers, watchMap);

    expect(result[0].watch_time_seconds).toBe(250);
    expect(watchMap).toHaveProperty('uppercase_user');
  });
});
