/**
 * Twitch 認証トークンおよびデバイス ID (Cookie) 取得モジュール
 */

/**
 * Twitch の auth-token Cookie を取得する
 * 1. www.twitch.tv の Cookie
 * 2. gql.twitch.tv の Cookie
 * 3. ドメイン名に twitch.tv を含む Cookie (getAll)
 * の優先順位でフォールバック探索を行う
 */
export async function getTwitchAuthToken(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.cookies) {
      resolve(null);
      return;
    }

    chrome.cookies.get({ url: 'https://www.twitch.tv', name: 'auth-token' }, (cookie) => {
      if (cookie && cookie.value) {
        console.log('[gnb-twipper] Auth-token found via www.twitch.tv URL');
        resolve(cookie.value);
        return;
      }
      chrome.cookies.get({ url: 'https://gql.twitch.tv', name: 'auth-token' }, (cookie2) => {
        if (cookie2 && cookie2.value) {
          console.log('[gnb-twipper] Auth-token found via gql.twitch.tv URL');
          resolve(cookie2.value);
          return;
        }
        chrome.cookies.getAll({ name: 'auth-token' }, (cookies) => {
          const match = cookies?.find((c) => c.domain.includes('twitch.tv'));
          if (match && match.value) {
            console.log('[gnb-twipper] Auth-token found via cookies.getAll search for twitch.tv');
            resolve(match.value);
          } else {
            console.warn('[gnb-twipper] Auth-token cookie NOT found');
            resolve(null);
          }
        });
      });
    });
  });
}

/**
 * Twitch のデバイス ID (unique_id Cookie) を取得する
 */
export async function getTwitchDeviceId(): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.cookies) {
      resolve(null);
      return;
    }

    chrome.cookies.get({ url: 'https://www.twitch.tv', name: 'unique_id' }, (cookie) => {
      if (cookie && cookie.value) {
        resolve(cookie.value);
      } else {
        chrome.cookies.getAll({ name: 'unique_id' }, (cookies) => {
          const match = cookies?.find((c) => c.domain.includes('twitch.tv'));
          resolve(match ? match.value : null);
        });
      }
    });
  });
}
