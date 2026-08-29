import { describe, it, expect } from 'vitest';
import { extractChannelFromUrl } from './url';

describe('extractChannelFromUrl', () => {
  it('should extract channel name from standard Twitch channel URL', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv/ninja')).toBe('ninja');
    expect(extractChannelFromUrl('https://twitch.tv/shroud')).toBe('shroud');
  });

  it('should handle subpaths and query parameters correctly', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv/fps_shaka/about')).toBe('fps_shaka');
    expect(extractChannelFromUrl('https://www.twitch.tv/tarik?referrer=raid')).toBe('tarik');
    expect(extractChannelFromUrl('https://www.twitch.tv/strikers#chat')).toBe('strikers');
  });

  it('should return lowercase channel login', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv/Ninja')).toBe('ninja');
  });

  it('should return null for Twitch reserved system paths', () => {
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
      expect(extractChannelFromUrl(`https://www.twitch.tv/${path}/game/Valorant`)).toBeNull();
    });
  });

  it('should return null for non-Twitch hostnames', () => {
    expect(extractChannelFromUrl('https://youtube.com/ninja')).toBeNull();
    expect(extractChannelFromUrl('https://fake-twitch.tv/ninja')).toBeNull();
    expect(extractChannelFromUrl('https://google.com')).toBeNull();
  });

  it('should return null for empty path or root URL', () => {
    expect(extractChannelFromUrl('https://www.twitch.tv')).toBeNull();
    expect(extractChannelFromUrl('https://www.twitch.tv/')).toBeNull();
  });

  it('should return null for invalid URL strings', () => {
    expect(extractChannelFromUrl('not-a-url')).toBeNull();
    expect(extractChannelFromUrl('')).toBeNull();
  });
});
