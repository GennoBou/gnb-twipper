import { describe, it, expect } from 'vitest';
import { isExtensionMessage, isToClientMessage } from './index';

describe('src/types/index.ts Type Guards', () => {
  describe('isExtensionMessage', () => {
    it('type プロパティを持つ有効なオブジェクトの場合は true を返す', () => {
      expect(isExtensionMessage({ type: 'GET_SETTINGS' })).toBe(true);
      expect(isExtensionMessage({ type: 'AUTO_STATE_UPDATE', autoState: {} })).toBe(true);
    });

    it('null、プリミティブ、または type プロパティのないオブジェクトは false を返す', () => {
      expect(isExtensionMessage(null)).toBe(false);
      expect(isExtensionMessage(undefined)).toBe(false);
      expect(isExtensionMessage('string')).toBe(false);
      expect(isExtensionMessage(123)).toBe(false);
      expect(isExtensionMessage({})).toBe(false);
      expect(isExtensionMessage({ data: 'some_data' })).toBe(false);
      expect(isExtensionMessage({ type: 123 })).toBe(false);
    });
  });

  describe('isToClientMessage', () => {
    it('クライアント向けメッセージ（AUTO_STATE_UPDATE, SCRAPE_LIVE_STREAMERS_REQUEST, NAVIGATE_TO_CHANNEL_REPLACE）に対して true を返す', () => {
      expect(isToClientMessage({ type: 'AUTO_STATE_UPDATE' })).toBe(true);
      expect(isToClientMessage({ type: 'SCRAPE_LIVE_STREAMERS_REQUEST' })).toBe(true);
      expect(isToClientMessage({ type: 'NAVIGATE_TO_CHANNEL_REPLACE', channel: 'test' })).toBe(true);
    });

    it('バックグラウンド向けメッセージや無効なオブジェクトに対して false を返す', () => {
      expect(isToClientMessage({ type: 'START_AUTO_MODE' })).toBe(false);
      expect(isToClientMessage({ type: 'GET_SETTINGS' })).toBe(false);
      expect(isToClientMessage({ type: 'UNKNOWN_TYPE' })).toBe(false);
      expect(isToClientMessage(null)).toBe(false);
    });
  });
});
