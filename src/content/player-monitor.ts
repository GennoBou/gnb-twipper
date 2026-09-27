import { SUB_ONLY_SELECTORS, OFFLINE_SELECTORS } from './selectors';

/**
 * URL のパス部分からチャンネルログインIDを小文字で抽出する（予約語やファイルパスは除外）
 */
export function getCurrentChannelPath(loc: Location = window.location): string | null {
  if (!loc || !loc.pathname) return null;
  const currentPath = loc.pathname.replace(/^\/+|\/+$/g, '').split('/')[0].toLowerCase();
  if (!currentPath || currentPath.includes('.')) return null;
  return currentPath;
}

/**
 * プレイヤーオーバーレイまたはバッジ要素を解析し、サブスクライバー限定（ロック）状態かを判定する
 */
export function isSubOnlyLocked(doc: Document = document): boolean {
  if (!doc) return false;

  // 1. オーバーレイ要素のテキストを判定
  for (const selector of SUB_ONLY_SELECTORS.OVERLAYS) {
    const el = doc.querySelector(selector);
    if (el) {
      const text = el.textContent || '';
      for (const keyword of SUB_ONLY_SELECTORS.LOCK_KEYWORDS) {
        if (text.includes(keyword)) {
          return true;
        }
      }
    }
  }

  // 2. ロックバッジやサブスク限定コンテナを判定
  for (const selector of SUB_ONLY_SELECTORS.LOCK_BADGES) {
    const el = doc.querySelector(selector);
    if (el && el.textContent?.includes('サブスクライバー')) {
      return true;
    }
  }

  return false;
}

/**
 * 配信画面要素やバッジを解析し、配信者がオフライン状態かを判定する
 */
export function isStreamOffline(doc: Document = document, channelPath?: string | null): boolean {
  if (!doc) return false;

  const path = channelPath ?? getCurrentChannelPath();
  if (!path) return false;

  // システム予約パス（設定・ディレクトリ一覧等）の場合はオフライン検知しない
  if ((OFFLINE_SELECTORS.SYSTEM_RESERVED_PATHS as readonly string[]).includes(path)) {
    return false;
  }

  // 1. 明確なオフライン要素セレクタをチェック
  for (const selector of OFFLINE_SELECTORS.ELEMENTS) {
    if (doc.querySelector(selector)) {
      return true;
    }
  }

  // 2. ステータスインジケーターテキストをチェック
  let hasOfflineText = false;
  for (const selector of OFFLINE_SELECTORS.STATUS_INDICATORS) {
    const elements = Array.from(doc.querySelectorAll(selector));
    for (const el of elements) {
      const text = el.textContent?.trim() || '';
      for (const kw of OFFLINE_SELECTORS.OFFLINE_KEYWORDS) {
        if (text === kw || text.includes(kw)) {
          hasOfflineText = true;
          break;
        }
      }
      if (hasOfflineText) break;
    }
    if (hasOfflineText) break;
  }

  // 3. ライブインジケーター（LIVEバッジ）が表示されている場合はオフラインではないと判断
  const liveIndicator = doc.querySelector(OFFLINE_SELECTORS.LIVE_INDICATOR);
  if (liveIndicator) {
    return false;
  }

  return hasOfflineText;
}

export interface PlayerMonitorCallbacks {
  onSubOnlyLockDetected?: (channel: string) => void;
  onOfflineDetected?: (channel: string) => void;
}

/**
 * プレイヤーのサブスクロックおよびオフライン状態の監視・イベント発火を行うマネージャ
 */
export class PlayerMonitor {
  private lastLockedChannel: string | null = null;
  private lastOfflineChannel: string | null = null;
  private callbacks: PlayerMonitorCallbacks;

  constructor(callbacks: PlayerMonitorCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * サブスクライバー限定ロックの検知を実行し、新規検知時にコールバックを呼び出す
   */
  public checkSubOnlyLock(doc: Document = document, loc: Location = window.location): void {
    const currentPath = getCurrentChannelPath(loc);
    if (!currentPath) return;

    const isLocked = isSubOnlyLocked(doc);

    if (isLocked) {
      if (this.lastLockedChannel !== currentPath) {
        this.lastLockedChannel = currentPath;
        console.log(`[gnb-twipper] Detected sub-only stream lock on @${currentPath}. Sending DETECTED_SUB_ONLY_LOCK.`);
        this.callbacks.onSubOnlyLockDetected?.(currentPath);
      }
    } else {
      if (this.lastLockedChannel === currentPath) {
        this.lastLockedChannel = null;
      }
    }
  }

  /**
   * オフライン状態の検知を実行し、新規検知時にコールバックを呼び出す
   */
  public checkOfflineState(doc: Document = document, loc: Location = window.location): void {
    const currentPath = getCurrentChannelPath(loc);
    if (!currentPath) return;

    const isOffline = isStreamOffline(doc, currentPath);

    if (isOffline) {
      if (this.lastOfflineChannel !== currentPath) {
        this.lastOfflineChannel = currentPath;
        console.log(`[gnb-twipper] Detected offline stream on @${currentPath}. Sending DETECTED_OFFLINE.`);
        this.callbacks.onOfflineDetected?.(currentPath);
      }
    } else {
      if (this.lastOfflineChannel === currentPath) {
        this.lastOfflineChannel = null;
      }
    }
  }

  /**
   * 監視状態をリセットする
   */
  public reset(): void {
    this.lastLockedChannel = null;
    this.lastOfflineChannel = null;
  }
}
