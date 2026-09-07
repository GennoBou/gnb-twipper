import type { AppSettings, StreamInfo } from '../types';

/**
 * Helper to get active rotation target streamers for UI display (filtering out user exclusions)
 */
export function getRotationTargetStreamers(
  liveStreamers: StreamInfo[],
  settings: AppSettings,
  cachedExcludedLogins?: Set<string>
): StreamInfo[] {
  if (cachedExcludedLogins) {
    if (cachedExcludedLogins.size === 0) return liveStreamers;
    return liveStreamers.filter((streamer) => !cachedExcludedLogins.has(streamer.user_login.toLowerCase()));
  }
  if (!settings.excludedChannels || settings.excludedChannels.length === 0) {
    return liveStreamers;
  }
  const excludedLogins = new Set(
    settings.excludedChannels
      .filter((item) => item.enabled)
      .map((item) => item.user_login.toLowerCase())
  );
  return liveStreamers.filter(
    (streamer) => !excludedLogins.has(streamer.user_login.toLowerCase())
  );
}

/**
 * Helper to get eligible streamers for auto-rotation
 */
export function getAutoRotationCandidates(
  liveStreamers: StreamInfo[],
  settings: AppSettings,
  cachedExcludedLogins?: Set<string>
): StreamInfo[] {
  const targets = getRotationTargetStreamers(liveStreamers, settings, cachedExcludedLogins);
  if (settings.skipSubOnlyStreams && !settings.allowSubOnlyFreePreview) {
    return targets.filter((streamer) => !streamer.is_sub_only);
  }
  return targets;
}
