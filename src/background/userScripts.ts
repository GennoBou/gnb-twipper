import type { AppSettings } from '../types';

/**
 * Chrome / Firefox 共通の userScripts API を取得する
 */
export function getUserScriptsApi(): typeof chrome.userScripts | null {
  if (typeof chrome !== 'undefined' && chrome.userScripts) {
    return chrome.userScripts;
  }
  const globalEnv = globalThis as { browser?: { userScripts?: typeof chrome.userScripts } };
  if (typeof globalEnv.browser !== 'undefined' && globalEnv.browser.userScripts) {
    return globalEnv.browser.userScripts;
  }
  return null;
}

/**
 * 設定に基づいてカスタムユーザースクリプトを userScripts API に同期・登録する
 */
export async function syncCustomUserScript(appSettings: AppSettings): Promise<{ allowed: boolean; error?: string }> {
  const userScriptsApi = getUserScriptsApi();
  if (!userScriptsApi) {
    console.warn('[gnb-twipper] userScripts API is not available in this environment.');
    return { allowed: false, error: 'API unavailable' };
  }

  const scriptId = 'gnb-twipper-custom-script';

  try {
    // Check if userScripts API is available / allowed (Developer mode check in Chrome)
    const existing = await userScriptsApi.getScripts({ ids: [scriptId] });
    if (existing.length > 0) {
      await userScriptsApi.unregister({ ids: [scriptId] });
    }

    if (appSettings.customJsEnabled && appSettings.customJs && appSettings.customJs.trim()) {
      await userScriptsApi.register([
        {
          id: scriptId,
          matches: ['*://*.twitch.tv/*'],
          js: [{ code: appSettings.customJs }],
          world: 'MAIN',
          runAt: 'document_idle',
        },
      ]);
      console.log('[gnb-twipper] Custom user script successfully registered via userScripts API');
    }
    return { allowed: true };
  } catch (err: unknown) {
    console.warn('[gnb-twipper] Error syncing user script via userScripts API:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { allowed: false, error: errorMessage };
  }
}

/**
 * userScripts API の利用可否ステータスを確認する（Developer mode 有効チェック等）
 */
export async function checkUserScriptsStatus(): Promise<{ allowed: boolean; error?: string }> {
  const userScriptsApi = getUserScriptsApi();
  if (!userScriptsApi) {
    return { allowed: false, error: 'API unavailable' };
  }
  try {
    await userScriptsApi.getScripts();
    return { allowed: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { allowed: false, error: errorMessage };
  }
}
