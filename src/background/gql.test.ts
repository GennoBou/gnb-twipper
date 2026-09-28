import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sendFollowedLiveGqlRequest,
  parseFollowedLiveGqlResponse,
  checkSubOnlyAuthViaGql,
} from './gql';
import type { GqlFollowedLiveResponseItem } from '../types';

describe('src/background/gql.ts', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('sendFollowedLiveGqlRequest', () => {
    it('正しいエンドポイント、Client-IDヘッダー、POSTボディでリクエストを送信する', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      );
      globalThis.fetch = mockFetch;

      const clientId = 'test_client_id';
      const authToken = 'oauth_token_123';
      const deviceId = 'device_abc';

      await sendFollowedLiveGqlRequest(clientId, authToken, deviceId);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];

      expect(url).toBe('https://gql.twitch.tv/gql');
      expect(options.method).toBe('POST');

      const headers = options.headers as Record<string, string>;
      expect(headers['Client-ID']).toBe(clientId);
      expect(headers['Authorization']).toBe(`OAuth ${authToken}`);
      expect(headers['Device-ID']).toBe(deviceId);
      expect(headers['Content-Type']).toBe('text/plain; charset=UTF-8');

      const body = JSON.parse(options.body as string);
      expect(Array.isArray(body)).toBe(true);
      expect(body[0].operationName).toBe('GnbFollowsLiveQuery');
      expect(body[0].query).toContain('GnbFollowsLiveQuery');
    });

    it('authToken や deviceId が null の場合は該当ヘッダーを含めない', async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify([]), { status: 200 }))
      );
      globalThis.fetch = mockFetch;

      await sendFollowedLiveGqlRequest('client_only', null, null);

      const [, options] = mockFetch.mock.calls[0] as unknown as [string, RequestInit];
      const headers = options.headers as Record<string, string>;

      expect(headers['Client-ID']).toBe('client_only');
      expect(headers['Authorization']).toBeUndefined();
      expect(headers['Device-ID']).toBeUndefined();
    });
  });

  describe('parseFollowedLiveGqlResponse', () => {
    it('GQLレスポンスデータを StreamInfo 配列に正常にパースする', () => {
      const mockData: GqlFollowedLiveResponseItem[] = [
        {
          data: {
            currentUser: {
              id: 'user_123',
              follows: {
                edges: [
                  {
                    node: {
                      id: 'streamer_1',
                      login: 'fps_streamer',
                      displayName: 'FPS配信者',
                      profileImageURL: 'https://example.com/avatar.jpg',
                      stream: {
                        id: 'live_001',
                        title: 'Apex Legends 配信',
                        viewersCount: 1500,
                        game: {
                          name: 'Apex Legends',
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      ];

      const result = parseFollowedLiveGqlResponse(mockData);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toEqual({
        user_login: 'fps_streamer',
        user_name: 'FPS配信者',
        title: 'Apex Legends 配信',
        game_name: 'Apex Legends',
        profile_image_url: 'https://example.com/avatar.jpg',
        viewer_count: 1500,
      });
    });

    it('currentUser が null の場合は null を返す', () => {
      const mockData = [{ data: { currentUser: null } }];
      const result = parseFollowedLiveGqlResponse(mockData);
      expect(result).toBeNull();
    });

    it('無効なデータや空配列が渡された場合は null を返す', () => {
      expect(parseFollowedLiveGqlResponse(null)).toBeNull();
      expect(parseFollowedLiveGqlResponse([])).toBeNull();
      expect(parseFollowedLiveGqlResponse({})).toBeNull();
    });
  });

  describe('checkSubOnlyAuthViaGql', () => {
    it('配信者リストが空、または clientId が未指定の場合は即時空オブジェクトを返す', async () => {
      const mockFetch = vi.fn();
      globalThis.fetch = mockFetch;

      expect(await checkSubOnlyAuthViaGql([], 'client_id', null, null)).toEqual({});
      expect(await checkSubOnlyAuthViaGql(['streamer'], null, null, null)).toEqual({});
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('各配信者の PlaybackAccessToken レスポンスからサブスク限定状態を判定する', async () => {
      const mockGqlResponse = [
        {
          data: {
            streamPlaybackAccessToken: {
              authorization: {
                isForbidden: true,
                forbiddenReasonCode: 'SUB_ONLY',
              },
            },
          },
        },
        {
          data: {
            streamPlaybackAccessToken: {
              authorization: {
                isForbidden: true,
                forbiddenReasonCode: 'UNAUTHORIZED_ENTITLEMENTS',
              },
            },
          },
        },
        {
          data: {
            streamPlaybackAccessToken: {
              authorization: {
                isForbidden: false,
                forbiddenReasonCode: null,
              },
            },
          },
        },
      ];

      const mockFetch = vi.fn(() =>
        Promise.resolve(new Response(JSON.stringify(mockGqlResponse), { status: 200 }))
      );
      globalThis.fetch = mockFetch;

      const streamers = ['sub_locked_1', 'sub_locked_2', 'free_streamer'];
      const result = await checkSubOnlyAuthViaGql(streamers, 'client_id_123', 'token_abc', 'device_xyz');

      expect(result).toEqual({
        sub_locked_1: true,
        sub_locked_2: true,
        free_streamer: false,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('fetch が失敗した場合（!response.ok）は空オブジェクトを返す', async () => {
      globalThis.fetch = vi.fn(() =>
        Promise.resolve(new Response('Error', { status: 401 }))
      );

      const result = await checkSubOnlyAuthViaGql(['streamer_a'], 'client_id_123', null, null);
      expect(result).toEqual({});
    });

    it('ネットワーク例外が発生した場合は安全にハンドリングして空オブジェクトを返す', async () => {
      globalThis.fetch = vi.fn(() => Promise.reject(new Error('Network error')));

      const result = await checkSubOnlyAuthViaGql(['streamer_a'], 'client_id_123', null, null);
      expect(result).toEqual({});
    });
  });
});
