import type { ExtensionMessage } from '../types';

/**
 * 拡張機能のコンテキスト無効化（Extension context invalidated）エラーを
 * 安全にハンドリングしながらメッセージを送信するユーティリティ関数
 */
export function safeSendMessage(
  message: ExtensionMessage,
  responseCallback?: (response: any) => void
): void {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage(message, (res) => {
        if (chrome.runtime.lastError) {
          // コンテキスト無効化またはポートクローズ時は握りつぶす
          return;
        }
        if (responseCallback) {
          responseCallback(res);
        }
      });
    }
  } catch (e) {
    // 拡張機能の更新・リロードによるコンテキスト無効化例外を握りつぶす
  }
}
