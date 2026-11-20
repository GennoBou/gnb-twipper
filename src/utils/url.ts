export function extractChannelFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (host !== 'twitch.tv' && !host.endsWith('.twitch.tv')) return null;
    const pathname = parsed.pathname.slice(1);
    const parts = pathname.split('/');
    const firstPart = parts[0]?.toLowerCase();
    const reserved = ['directory', 'settings', 'subscriptions', 'wallet', 'downloads', 'p', 'search', 'videos', 'moderator', 'popout'];
    if (firstPart && !reserved.includes(firstPart) && !firstPart.includes('.') && firstPart.length > 0) {
      return firstPart;
    }
  } catch (e) {}
  return null;
}

/**
 * プロフィール画像 URL のスキームを検証し、安全な HTTPS URL のみ許可する
 */
export function sanitizeProfileImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    return '';
  }
}
