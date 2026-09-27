import type { StreamInfo, GqlPlaybackAccessTokenResponseItem } from '../types';

/**
 * フォロー中チャンネルのライブ配信一覧を取得するための Twitch GQL リクエストを送信する
 */
export async function sendFollowedLiveGqlRequest(
  clientId: string,
  authToken: string | null,
  deviceId: string | null
): Promise<Response> {
  console.log('[gnb-twipper] [GQL Request] Sending request to https://gql.twitch.tv/gql', {
    time: new Date().toLocaleTimeString(),
    hasAuthToken: !!authToken,
    hasDeviceId: !!deviceId,
    hasClientId: !!clientId,
  });

  const headers: Record<string, string> = {
    'Client-ID': clientId,
    'Content-Type': 'text/plain; charset=UTF-8',
  };

  if (deviceId) {
    headers['Device-ID'] = deviceId;
  }

  if (authToken) {
    headers['Authorization'] = `OAuth ${authToken}`;
  }

  const bodyPayload = [
    {
      operationName: 'GnbFollowsLiveQuery',
      query: `
        query GnbFollowsLiveQuery {
          currentUser {
            id
            follows(first: 100) {
              edges {
                node {
                  id
                  login
                  displayName
                  profileImageURL(width: 70)
                  stream {
                    id
                    title
                    viewersCount
                    game {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `,
    },
  ];

  return fetch('https://gql.twitch.tv/gql', {
    method: 'POST',
    headers,
    body: JSON.stringify(bodyPayload),
  });
}

/**
 * GQL レスポンスデータを StreamInfo 配列にパースする
 * currentUser が取得できない場合やエラー時は null を返す
 */
export function parseFollowedLiveGqlResponse(data: any): StreamInfo[] | null {
  if (data && Array.isArray(data) && data[0]?.errors) {
    console.warn('[gnb-twipper] GQL returned errors:', data[0].errors);
  }

  const currentUser = data?.[0]?.data?.currentUser;
  if (!currentUser) {
    console.warn('[gnb-twipper] GQL currentUser is null. Token may be invalid or Twitch Integrity protection triggered.');
    return null;
  }

  const edges = currentUser.follows?.edges || [];
  const rawFetched: StreamInfo[] = [];

  edges.forEach((edge: any) => {
    const node = edge?.node;
    const stream = node?.stream;
    if (node && stream) {
      rawFetched.push({
        user_login: node.login,
        user_name: node.displayName || node.login,
        title: stream.title || '',
        game_name: stream.game?.name || '',
        profile_image_url: node.profileImageURL || '',
        viewer_count: stream.viewersCount || 0,
      });
    }
  });

  return rawFetched;
}

/**
 * Twitch GQL API (PlaybackAccessToken) で各ライブ配信のサブスク視聴権限・ロックを一括判定する
 */
export async function checkSubOnlyAuthViaGql(
  streamersOrLogins: string[] | { user_login: string }[],
  clientId: string | null,
  authToken: string | null,
  deviceId: string | null
): Promise<Record<string, boolean>> {
  if (!streamersOrLogins || streamersOrLogins.length === 0 || !clientId) return {};

  try {
    const headers: Record<string, string> = {
      'Client-ID': clientId,
      'Content-Type': 'text/plain; charset=UTF-8',
    };

    if (deviceId) headers['Device-ID'] = deviceId;
    if (authToken) headers['Authorization'] = `OAuth ${authToken}`;

    const logins = streamersOrLogins.map((item) => (typeof item === 'string' ? item : item.user_login));
    const bodyPayload = logins.map((login) => ({
      operationName: 'PlaybackAccessTokenQuery',
      query: `
        query PlaybackAccessTokenQuery($login: String!) {
          streamPlaybackAccessToken(channelName: $login, params: { platform: "web", playerBackend: "mediaplayer", playerType: "site" }) {
            authorization {
              isForbidden
              forbiddenReasonCode
            }
          }
        }
      `,
      variables: { login },
    }));

    const response = await fetch('https://gql.twitch.tv/gql', {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) return {};

    const data = await response.json();
    const subOnlyMap: Record<string, boolean> = {};

    if (Array.isArray(data)) {
      data.forEach((item: GqlPlaybackAccessTokenResponseItem, idx: number) => {
        const login = logins[idx];
        const auth = item?.data?.streamPlaybackAccessToken?.authorization;
        if (login && auth) {
          const isSubOnly = !!auth.isForbidden && (auth.forbiddenReasonCode === 'UNAUTHORIZED_ENTITLEMENTS' || auth.forbiddenReasonCode === 'SUB_ONLY');
          subOnlyMap[login.toLowerCase()] = isSubOnly;
        }
      });
    }

    return subOnlyMap;
  } catch (e) {
    console.error('[gnb-twipper] Error checking sub-only API status:', e);
    return {};
  }
}
