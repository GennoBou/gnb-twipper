import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import {
  getCurrentChannelPath,
  isSubOnlyLocked,
  isStreamOffline,
  PlayerMonitor,
} from './player-monitor';

describe('src/content/player-monitor.ts', () => {
  let domWindow: Window;
  let document: Document;

  beforeEach(() => {
    domWindow = new Window();
    document = domWindow.document as unknown as Document;
  });

  describe('getCurrentChannelPath', () => {
    it('パスからチャンネルログイン名を抽出する', () => {
      const loc = { pathname: '/streamer_taro' } as Location;
      expect(getCurrentChannelPath(loc)).toBe('streamer_taro');
    });

    it('先頭・末尾のスラッシュや大文字を小文字に正規化する', () => {
      const loc = { pathname: '/Streamer_Hanako/' } as Location;
      expect(getCurrentChannelPath(loc)).toBe('streamer_hanako');
    });

    it('ドットを含むパスや空文字は null を返す', () => {
      expect(getCurrentChannelPath({ pathname: '/script.js' } as Location)).toBeNull();
      expect(getCurrentChannelPath({ pathname: '/' } as Location)).toBeNull();
    });
  });

  describe('isSubOnlyLocked', () => {
    it('オーバーレイ内にサブスク限定キーワードが含まれる場合は true を返す', () => {
      const overlay = document.createElement('div');
      overlay.className = 'preview-overlay';
      overlay.textContent = 'この配信はサブスクライバー限定です。';
      document.body.appendChild(overlay);

      expect(isSubOnlyLocked(document)).toBe(true);
    });

    it('英語の「Subscriber-Only」キーワードでも true を返す', () => {
      const gate = document.createElement('div');
      gate.setAttribute('data-a-target', 'player-overlay-gate');
      gate.textContent = 'Subscriber-Only Stream';
      document.body.appendChild(gate);

      expect(isSubOnlyLocked(document)).toBe(true);
    });

    it('サブスク限定を示す要素がない場合は false を返す', () => {
      const normalOverlay = document.createElement('div');
      normalOverlay.className = 'preview-overlay';
      normalOverlay.textContent = '通常の配信です。ご視聴ありがとうございます。';
      document.body.appendChild(normalOverlay);

      expect(isSubOnlyLocked(document)).toBe(false);
    });
  });

  describe('isStreamOffline', () => {
    it('オフライン表示要素が存在する場合は true を返す', () => {
      const offlineHero = document.createElement('div');
      offlineHero.setAttribute('data-a-target', 'user-channel-offline-hero');
      document.body.appendChild(offlineHero);

      expect(isStreamOffline(document, 'streamer_a')).toBe(true);
    });

    it('ステータスインジケーターに「オフライン」または「Offline」とある場合は true を返す', () => {
      const subtitle = document.createElement('div');
      subtitle.setAttribute('data-test-selector', 'stream-info-card-component__subtitle');
      subtitle.textContent = 'オフライン';
      document.body.appendChild(subtitle);

      expect(isStreamOffline(document, 'streamer_b')).toBe(true);
    });

    it('LIVEバッジ要素が表示されている場合はオフライン要素があっても false を返す', () => {
      const subtitle = document.createElement('div');
      subtitle.setAttribute('data-test-selector', 'stream-info-card-component__subtitle');
      subtitle.textContent = 'オフライン';
      document.body.appendChild(subtitle);

      const liveBadge = document.createElement('span');
      liveBadge.setAttribute('data-a-target', 'live-indicator');
      document.body.appendChild(liveBadge);

      expect(isStreamOffline(document, 'streamer_c')).toBe(false);
    });

    it('システム予約パス（directory, settings 等）の場合は常に false を返す', () => {
      const offlineHero = document.createElement('div');
      offlineHero.setAttribute('data-a-target', 'user-channel-offline-hero');
      document.body.appendChild(offlineHero);

      expect(isStreamOffline(document, 'directory')).toBe(false);
      expect(isStreamOffline(document, 'settings')).toBe(false);
    });
  });

  describe('PlayerMonitor Class', () => {
    it('サブスクロック検知時にコールバックが1度だけ発火し、同じチャンネルで重複発火しない', () => {
      const onLock = vi.fn();
      const monitor = new PlayerMonitor({ onSubOnlyLockDetected: onLock });

      const overlay = document.createElement('div');
      overlay.className = 'preview-overlay';
      overlay.textContent = 'サブスクライバー限定';
      document.body.appendChild(overlay);

      const loc = { pathname: '/streamer_test' } as Location;

      // 1回目の検知
      monitor.checkSubOnlyLock(document, loc);
      expect(onLock).toHaveBeenCalledTimes(1);
      expect(onLock).toHaveBeenCalledWith('streamer_test');

      // 2回目の実行（同じチャンネル・同じ状態）では重複発火しない
      monitor.checkSubOnlyLock(document, loc);
      expect(onLock).toHaveBeenCalledTimes(1);
    });

    it('オフライン検知時にコールバックが発火し、復帰・チャンネル変更でリセットされる', () => {
      const onOffline = vi.fn();
      const monitor = new PlayerMonitor({ onOfflineDetected: onOffline });

      const offlineEl = document.createElement('div');
      offlineEl.setAttribute('data-a-target', 'player-overlay-offline');
      document.body.appendChild(offlineEl);

      const loc1 = { pathname: '/streamer_1' } as Location;
      monitor.checkOfflineState(document, loc1);
      expect(onOffline).toHaveBeenCalledTimes(1);
      expect(onOffline).toHaveBeenCalledWith('streamer_1');

      // 別チャンネルへ移動
      const loc2 = { pathname: '/streamer_2' } as Location;
      monitor.checkOfflineState(document, loc2);
      expect(onOffline).toHaveBeenCalledTimes(2);
      expect(onOffline).toHaveBeenCalledWith('streamer_2');
    });
  });
});
