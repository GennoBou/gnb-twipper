import type { StreamInfo } from '../types';

/**
 * チャンネルごとの累積視聴秒数を保持するマップ
 * キー: user_login (小文字)
 * 値: 累積視聴秒数
 */
export const watchTimeMap: Record<string, number> = {};

/**
 * 外部から watchTimeMap の状態を置換する（テストやリセット用）
 * オブジェクト参照を維持しながら内容を更新する
 */
export function setWatchTimeMap(map: Record<string, number>): void {
  for (const key of Object.keys(watchTimeMap)) {
    delete watchTimeMap[key];
  }
  Object.assign(watchTimeMap, map);
}

/**
 * 現在の watchTimeMap オブジェクトを取得する
 */
export function getWatchTimeMap(): Record<string, number> {
  return watchTimeMap;
}

/**
 * 取得した配信中ストリーマー一覧に現在の累積視聴時間を付与し、
 * 配信終了した（一覧にない）チャンネルの視聴時間をマップから削除・クリーンアップする
 */
export function attachWatchTimeAndCleanup(fetched: StreamInfo[]): StreamInfo[] {
  const currentLiveLogins = new Set(fetched.map((s) => s.user_login.toLowerCase()));

  // 配信終了したチャンネルの視聴時間をクリア（0秒にリセット）
  for (const key of Object.keys(watchTimeMap)) {
    if (!currentLiveLogins.has(key)) {
      delete watchTimeMap[key];
    }
  }

  return fetched.map((s) => ({
    ...s,
    watch_time_seconds: watchTimeMap[s.user_login.toLowerCase()] || 0,
  }));
}

/**
 * 指定したチャンネルの視聴時間を 1 秒加算し、加算後の視聴秒数を返す
 */
export function incrementWatchTime(login: string): number {
  const key = login.toLowerCase();
  watchTimeMap[key] = (watchTimeMap[key] || 0) + 1;
  return watchTimeMap[key];
}

/**
 * 指定したチャンネルの視聴時間記録を削除する
 */
export function removeWatchTime(login: string): void {
  delete watchTimeMap[login.toLowerCase()];
}
