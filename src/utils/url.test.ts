import { describe, it, expect } from 'vitest';
import { extractChannelFromUrl, sanitizeProfileImageUrl } from './url';

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

  it('should return null for non-Twitch URLs or spoofed domains', () => {
    expect(extractChannelFromUrl('https://www.youtube.com/ninja')).toBeNull();
    expect(extractChannelFromUrl('https://example.com/twitch.tv')).toBeNull();
    expect(extractChannelFromUrl('https://evil-twitch.tv/ninja')).toBeNull();
    expect(extractChannelFromUrl('https://twitch.tv.attacker.com/ninja')).toBeNull();
    expect(extractChannelFromUrl('https://www.twitch.tv/sw.js')).toBeNull();
  });

  it('should return null for invalid or empty URL strings', () => {
    expect(extractChannelFromUrl('')).toBeNull();
    expect(extractChannelFromUrl('not-a-url')).toBeNull();
  });
});

describe('sanitizeProfileImageUrl', () => {
  it('安全な HTTPS URL はそのまま返す', () => {
    expect(sanitizeProfileImageUrl('https://static-cdn.jtvnw.net/jtv_user_pictures/avatar.png')).toBe(
      'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar.png'
    );
  });

  it('http / javascript / data などの非 HTTPS スキームや不正 URL を空文字に無害化する', () => {
    expect(sanitizeProfileImageUrl('http://example.com/avatar.png')).toBe('');
    expect(sanitizeProfileImageUrl('javascript:alert(1)')).toBe('');
    expect(sanitizeProfileImageUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe('');
    expect(sanitizeProfileImageUrl('not-a-url')).toBe('');
    expect(sanitizeProfileImageUrl('')).toBe('');
    expect(sanitizeProfileImageUrl(null)).toBe('');
  });
});
