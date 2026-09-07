export function extractChannelFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('twitch.tv')) return null;
    const pathname = parsed.pathname.slice(1);
    const parts = pathname.split('/');
    const firstPart = parts[0]?.toLowerCase();
    const reserved = ['directory', 'settings', 'subscriptions', 'wallet', 'downloads', 'p', 'search', 'videos', 'moderator', 'popout'];
    if (firstPart && !reserved.includes(firstPart) && firstPart.length > 0) {
      return firstPart;
    }
  } catch (e) {}
  return null;
}
