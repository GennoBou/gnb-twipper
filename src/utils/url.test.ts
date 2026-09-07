import { describe, it, expect } from 'vitest';
import { extractChannelFromUrl } from './url';

describe('extractChannelFromUrl', () => {
  it('should extract channel name from simple valid Twitch channel URLs', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv/ninja')).toBe('ninja');
    expect(extractChannelFromUrl('http://twitch.tv/shroud')).toBe('shroud');
  });

  it('should extract channel name from Twitch URLs with subpaths', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv/ninja/about')).toBe('ninja');
    expect(extractChannelFromUrl('https://www.twitch.tv/shroud/schedule')).toBe('shroud');
    expect(extractChannelFromUrl('https://www.twitch.tv/fps_test/chat')).toBe('fps_test');
  });

  it('should convert channel name to lower case', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv/Ninja')).toBe('ninja');
    expect(extractChannelFromUrl('https://www.twitch.tv/SHROUD')).toBe('shroud');
  });

  it('should return null for Twitch reserved paths', () => {
    const reservedPaths = [
      'directory',
      'settings',
      'subscriptions',
      'wallet',
      'downloads',
      'p',
      'search',
      'videos',
      'moderator',
      'popout',
    ];

    reservedPaths.forEach((path) => {
      expect(extractChannelFromUrl(`https://www.twitch.tv/${path}`)).toBeNull();
      expect(extractChannelFromUrl(`https://www.twitch.tv/${path.toUpperCase()}`)).toBeNull();
    });
  });

  it('should return null for Twitch root path or empty subpath', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv')).toBeNull();
    expect(extractChannelFromUrl('https://www.twitch.tv/')).toBeNull();
  });

  it('should return null for non-Twitch URLs', () => {
    expect(extractChannelFromUrl('https://www.youtube.com/ninja')).toBeNull();
    expect(extractChannelFromUrl('https://example.com/twitch.tv')).toBeNull();
  });

  it('should return null for invalid or empty URL strings', () => {
    expect(extractChannelFromUrl('')).toBeNull();
    expect(extractChannelFromUrl('not-a-url')).toBeNull();
  });
});
