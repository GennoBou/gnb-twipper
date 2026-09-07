import { describe, it, expect } from 'vitest';
import { getRotationTargetStreamers, getAutoRotationCandidates } from './rotation';
import type { AppSettings, StreamInfo } from '../types';

const defaultSettings: AppSettings = {
  rotationTimeMinutes: 3,
  autoStartOnLogin: true,
  language: 'ja',
  customCss: '',
  customJs: '',
  customCssEnabled: false,
  customJsEnabled: false,
  excludedChannels: [],
  skipSubOnlyStreams: false,
  allowSubOnlyFreePreview: true,
};

const mockStreamers: StreamInfo[] = [
  {
    user_login: 'streamer_a',
    user_name: 'Streamer A',
    title: 'Playing Game A',
    game_name: 'Game A',
    profile_image_url: 'http://example.com/a.jpg',
    viewer_count: 100,
    is_sub_only: false,
  },
  {
    user_login: 'streamer_b',
    user_name: 'Streamer B',
    title: 'Playing Game B',
    game_name: 'Game B',
    profile_image_url: 'http://example.com/b.jpg',
    viewer_count: 200,
    is_sub_only: true,
  },
  {
    user_login: 'streamer_c',
    user_name: 'Streamer C',
    title: 'Playing Game C',
    game_name: 'Game C',
    profile_image_url: 'http://example.com/c.jpg',
    viewer_count: 300,
    is_sub_only: false,
  },
];

describe('getRotationTargetStreamers', () => {
  it('should return all live streamers when excludedChannels is empty', () => {
    const settings = { ...defaultSettings, excludedChannels: [] };
    const result = getRotationTargetStreamers(mockStreamers, settings);
    expect(result).toHaveLength(3);
    expect(result).toEqual(mockStreamers);
  });

  it('should filter out enabled excluded channels regardless of case', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      excludedChannels: [
        { user_login: 'STREAMER_A', enabled: true, addedAt: Date.now() },
        { user_login: 'streamer_c', enabled: false, addedAt: Date.now() }, // disabled, should NOT be excluded
      ],
    };
    const result = getRotationTargetStreamers(mockStreamers, settings);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.user_login)).toEqual(['streamer_b', 'streamer_c']);
  });
});

describe('getAutoRotationCandidates', () => {
  it('should return all target streamers when skipSubOnlyStreams is false', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      skipSubOnlyStreams: false,
      allowSubOnlyFreePreview: false,
    };
    const result = getAutoRotationCandidates(mockStreamers, settings);
    expect(result).toHaveLength(3);
  });

  it('should filter out sub-only streams when skipSubOnlyStreams is true and allowSubOnlyFreePreview is false', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      skipSubOnlyStreams: true,
      allowSubOnlyFreePreview: false,
    };
    const result = getAutoRotationCandidates(mockStreamers, settings);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.user_login)).toEqual(['streamer_a', 'streamer_c']);
  });

  it('should NOT filter out sub-only streams when skipSubOnlyStreams is true but allowSubOnlyFreePreview is true', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      skipSubOnlyStreams: true,
      allowSubOnlyFreePreview: true,
    };
    const result = getAutoRotationCandidates(mockStreamers, settings);
    expect(result).toHaveLength(3);
  });

  it('should apply both excluded channels and sub-only stream filtering', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      excludedChannels: [{ user_login: 'streamer_a', enabled: true, addedAt: Date.now() }],
      skipSubOnlyStreams: true,
      allowSubOnlyFreePreview: false,
    };
    // streamer_a excluded by channel setting
    // streamer_b excluded because it is sub_only and skipSubOnlyStreams = true, allowSubOnlyFreePreview = false
    // streamer_c should remain
    const result = getAutoRotationCandidates(mockStreamers, settings);
    expect(result).toHaveLength(1);
    expect(result[0].user_login).toBe('streamer_c');
  });

  it('should return empty array when no streamers are available or all are excluded', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      excludedChannels: [
        { user_login: 'streamer_a', enabled: true, addedAt: Date.now() },
        { user_login: 'streamer_b', enabled: true, addedAt: Date.now() },
        { user_login: 'streamer_c', enabled: true, addedAt: Date.now() },
      ],
    };
    const result = getAutoRotationCandidates(mockStreamers, settings);
    expect(result).toEqual([]);
  });
});
