import { describe, it, expect, beforeEach } from 'vitest';
import {
  watchTimeMap,
  setWatchTimeMap,
  getWatchTimeMap,
  incrementWatchTime,
  removeWatchTime,
  attachWatchTimeAndCleanup,
} from './watchTime';
import type { StreamInfo } from '../types';

describe('src/background/watchTime.ts', () => {
  beforeEach(() => {
    setWatchTimeMap({});
  });

  describe('getWatchTimeMap and setWatchTimeMap', () => {
    it('マップの取得と設定が正しく動作する', () => {
      setWatchTimeMap({ streamer_a: 100, streamer_b: 200 });
      expect(getWatchTimeMap()).toEqual({ streamer_a: 100, streamer_b: 200 });
      expect(watchTimeMap).toEqual({ streamer_a: 100, streamer_b: 200 });
    });
  });

  describe('incrementWatchTime', () => {
    it('指定チャンネルの視聴時間を1秒加算する（初回は1になる）', () => {
      incrementWatchTime('streamer_x');
      expect(getWatchTimeMap()['streamer_x']).toBe(1);

      incrementWatchTime('streamer_x');
      expect(getWatchTimeMap()['streamer_x']).toBe(2);
    });

    it('大文字混じりのチャンネル名も小文字に正規化してインクリメントする', () => {
      incrementWatchTime('Streamer_Y');
      incrementWatchTime('streamer_y');
      expect(getWatchTimeMap()['streamer_y']).toBe(2);
      expect(getWatchTimeMap()['Streamer_Y']).toBeUndefined();
    });

    it('空文字列や無効な値の場合は何もしない', () => {
      incrementWatchTime('');
      expect(Object.keys(getWatchTimeMap())).toHaveLength(0);
    });
  });

  describe('removeWatchTime', () => {
    it('指定チャンネルの視聴時間を削除する', () => {
      setWatchTimeMap({ user_a: 50, user_b: 100 });
      removeWatchTime('user_a');

      expect(getWatchTimeMap()).toEqual({ user_b: 100 });
    });

    it('大文字混じりのチャンネル名でも小文字正規化して削除する', () => {
      setWatchTimeMap({ user_a: 50, user_b: 100 });
      removeWatchTime('USER_A');

      expect(getWatchTimeMap()).toEqual({ user_b: 100 });
    });
  });

  describe('attachWatchTimeAndCleanup', () => {
    it('配信中ストリーマーに既存の視聴時間をマッピングし、オフラインになったチャンネルをマップから削除する', () => {
      setWatchTimeMap({
        online_streamer: 300,
        offline_streamer: 500,
      });

      const currentLive: StreamInfo[] = [
        {
          user_login: 'online_streamer',
          user_name: 'Online Streamer',
        },
        {
          user_login: 'new_streamer',
          user_name: 'New Streamer',
        },
      ];

      const result = attachWatchTimeAndCleanup(currentLive);

      expect(result).toHaveLength(2);
      expect(result[0].watch_time_seconds).toBe(300);
      expect(result[1].watch_time_seconds).toBe(0);

      // オフラインになったチャンネル（offline_streamer）は watchTimeMap からクリーンアップされる
      expect(getWatchTimeMap()).toEqual({
        online_streamer: 300,
      });
    });

    it('空のリストが渡された場合、watchTimeMap も完全にクリアされる', () => {
      setWatchTimeMap({ streamer_1: 100 });
      const result = attachWatchTimeAndCleanup([]);
      expect(result).toEqual([]);
      expect(getWatchTimeMap()).toEqual({});
    });
  });
});
