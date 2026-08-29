import { describe, it, expect, vi } from 'vitest';

// Setup chrome mock before importing background module
vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: (_keys: any, cb: any) => cb && cb({}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    },
    session: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
    },
  },
  webRequest: {
    onBeforeSendHeaders: {
      addListener: () => {},
    },
  },
  tabs: {
    query: () => {},
    sendMessage: () => Promise.resolve(),
    update: () => {},
    onUpdated: {
      addListener: () => {},
    },
  },
  runtime: {
    onMessage: {
      addListener: () => {},
    },
    sendMessage: () => Promise.resolve(),
    getURL: (path: string) => path,
  },
  alarms: {
    create: () => {},
    onAlarm: {
      addListener: () => {},
    },
  },
  cookies: {
    get: (_details: any, cb: any) => cb && cb(null),
    getAll: (_details: any, cb: any) => cb && cb([]),
  },
});

vi.stubGlobal('self', globalThis);

import { getRotationTargetStreamers } from './background';
import type { AppSettings, StreamInfo } from '../types';

describe('getRotationTargetStreamers', () => {
  const dummyStreamers: StreamInfo[] = [
    { user_login: 'streamer1', user_name: 'Streamer One' },
    { user_login: 'streamer2', user_name: 'Streamer Two' },
    { user_login: 'streamer3', user_name: 'Streamer Three' },
  ];

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

  it('should return all streamers when excludedChannels is undefined or empty', () => {
    const settingsNoExclusion: AppSettings = { ...defaultSettings, excludedChannels: undefined };
    expect(getRotationTargetStreamers(dummyStreamers, settingsNoExclusion)).toEqual(dummyStreamers);

    const settingsEmptyExclusion: AppSettings = { ...defaultSettings, excludedChannels: [] };
    expect(getRotationTargetStreamers(dummyStreamers, settingsEmptyExclusion)).toEqual(dummyStreamers);
  });

  it('should filter out channels that are in excludedChannels with enabled: true', () => {
    const settingsWithExclusion: AppSettings = {
      ...defaultSettings,
      excludedChannels: [
        { user_login: 'streamer2', enabled: true, addedAt: Date.now() },
      ],
    };

    const result = getRotationTargetStreamers(dummyStreamers, settingsWithExclusion);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.user_login)).toEqual(['streamer1', 'streamer3']);
  });

  it('should NOT filter out channels if enabled: false in excludedChannels', () => {
    const settingsDisabledExclusion: AppSettings = {
      ...defaultSettings,
      excludedChannels: [
        { user_login: 'streamer2', enabled: false, addedAt: Date.now() },
      ],
    };

    const result = getRotationTargetStreamers(dummyStreamers, settingsDisabledExclusion);
    expect(result).toHaveLength(3);
    expect(result).toEqual(dummyStreamers);
  });

  it('should handle case insensitivity in user_login exclusion matching', () => {
    const settingsCaseInsensitive: AppSettings = {
      ...defaultSettings,
      excludedChannels: [
        { user_login: 'STREAMER1', enabled: true, addedAt: Date.now() },
      ],
    };

    const result = getRotationTargetStreamers(dummyStreamers, settingsCaseInsensitive);
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.user_login)).toEqual(['streamer2', 'streamer3']);
  });

  it('should return empty array when all streamers are excluded', () => {
    const settingsAllExcluded: AppSettings = {
      ...defaultSettings,
      excludedChannels: [
        { user_login: 'streamer1', enabled: true, addedAt: Date.now() },
        { user_login: 'streamer2', enabled: true, addedAt: Date.now() },
        { user_login: 'streamer3', enabled: true, addedAt: Date.now() },
      ],
    };

    const result = getRotationTargetStreamers(dummyStreamers, settingsAllExcluded);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array when input streamers array is empty', () => {
    const settings: AppSettings = {
      ...defaultSettings,
      excludedChannels: [{ user_login: 'streamer1', enabled: true, addedAt: Date.now() }],
    };

    const result = getRotationTargetStreamers([], settings);
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });
});
