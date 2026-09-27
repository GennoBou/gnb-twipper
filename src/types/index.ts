export interface StreamInfo {
  user_login: string;
  user_name: string;
  game_name?: string;
  title?: string;
  viewer_count?: number;
  profile_image_url?: string;
  started_at?: string;
  watch_time_seconds?: number;
  is_sub_only?: boolean;
}

export interface ExcludedChannel {
  user_login: string; // 小文字ユーザーID (例: 'amazonmusic')
  user_name?: string; // 表示名
  enabled: boolean; // 除外ON/OFF (true: 巡回から除外, false: 通常巡回)
  addedAt: number; // 登録タイムスタンプ
}

export interface AppSettings {
  rotationTimeMinutes: number; // 回転時間（分）
  autoStartOnLogin: boolean; // 起動時にオートモードを自動開始するか
  language: 'ja' | 'en'; // UI言語
  customCss: string; // カスタムインジェクションCSS
  customJs: string; // カスタムインジェクションJS
  customCssEnabled: boolean;
  customJsEnabled: boolean;
  excludedChannels?: ExcludedChannel[]; // 巡回除外対象リスト
  skipSubOnlyStreams?: boolean; // サブスク限定配信を自動スキップするか
  allowSubOnlyFreePreview?: boolean; // 無料視聴期間中はスキップせずに視聴するか
}

export interface AutoState {
  isActive: boolean;
  isStandby?: boolean;
  timeRemainingSeconds: number;
  totalDurationSeconds: number;
  currentChannel: string;
  nextChannel?: string;
}

// Twitch GQL PlaybackAccessToken レスポンス型
export interface GqlPlaybackAccessTokenResponseItem {
  data?: {
    streamPlaybackAccessToken?: {
      authorization?: {
        isForbidden?: boolean;
        forbiddenReasonCode?: string;
      };
    };
  };
  errors?: unknown[];
}

// Twitch GQL FollowedLiveQuery レスポンス型
export interface GqlFollowEdgeNode {
  id: string;
  login: string;
  displayName?: string;
  profileImageURL?: string;
  stream?: {
    id: string;
    title?: string;
    viewersCount?: number;
    game?: {
      name?: string;
    };
  } | null;
}

export interface GqlFollowEdge {
  node?: GqlFollowEdgeNode;
}

export interface GqlFollowedLiveResponseItem {
  data?: {
    currentUser?: {
      id: string;
      follows?: {
        edges?: GqlFollowEdge[];
      };
    } | null;
  };
  errors?: unknown[];
}

/**
 * ユーザースクリプト API のステータスレスポンス型
 */
export interface UserScriptsStatusResponse {
  apiAvailable: boolean;
  userScriptsConfigured: boolean;
  error?: string;
}

/**
 * クライアント（Popup / Options / Content Script）から Background Service Worker への要求メッセージ
 */
export type ToBackgroundMessage =
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'GET_LIVE_STREAMERS' }
  | { type: 'START_AUTO_MODE' }
  | { type: 'STOP_AUTO_MODE' }
  | { type: 'SKIP_NEXT' }
  | { type: 'SELECT_STREAMER'; channel: string }
  | { type: 'GET_AUTO_STATE' }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'CHECK_USER_SCRIPTS_STATUS' }
  | { type: 'UPDATE_STREAMERS_FROM_DOM'; streamers: StreamInfo[] }
  | { type: 'DETECTED_SUB_ONLY_LOCK'; channel?: string }
  | { type: 'DETECTED_OFFLINE'; channel?: string };

/**
 * Background Service Worker からクライアントへのブロードキャストまたは指示メッセージ
 */
export type ToClientMessage =
  | {
      type: 'AUTO_STATE_UPDATE';
      autoState: AutoState;
      settings: AppSettings;
      liveStreamers: StreamInfo[];
    }
  | { type: 'SCRAPE_LIVE_STREAMERS_REQUEST' }
  | { type: 'NAVIGATE_TO_CHANNEL_REPLACE'; channel: string };

/**
 * 拡張機能内で送受信される全メッセージの判別可能なユニオン型
 */
export type ExtensionMessage = ToBackgroundMessage | ToClientMessage;

/**
 * メッセージと応答データのマッピング定義
 */
export interface MessageResponseMap {
  GET_SETTINGS: { settings: AppSettings; autoState: AutoState; liveStreamers: StreamInfo[] };
  SAVE_SETTINGS: { success: boolean; settings: AppSettings; userScriptsStatus: UserScriptsStatusResponse };
  CHECK_USER_SCRIPTS_STATUS: UserScriptsStatusResponse;
  GET_LIVE_STREAMERS: { liveStreamers: StreamInfo[] };
  START_AUTO_MODE: { success: boolean; autoState: AutoState };
  STOP_AUTO_MODE: { success: boolean; autoState: AutoState };
  SKIP_NEXT: { success: boolean; autoState: AutoState };
  DETECTED_SUB_ONLY_LOCK: { success: boolean };
  DETECTED_OFFLINE: { success: boolean };
  SELECT_STREAMER: { success: boolean; autoState: AutoState };
  GET_AUTO_STATE: { autoState: AutoState; settings: AppSettings; liveStreamers: StreamInfo[] };
  OPEN_OPTIONS: { success: boolean };
  UPDATE_STREAMERS_FROM_DOM: { success: boolean; count: number };
  AUTO_STATE_UPDATE: void;
  SCRAPE_LIVE_STREAMERS_REQUEST: void;
  NAVIGATE_TO_CHANNEL_REPLACE: { success: boolean; skipped?: boolean };
}

/**
 * 送信メッセージ型から対応するレスポンス型を導出するユーティリティ型
 */
export type MessageResponseType<M extends ExtensionMessage> =
  M['type'] extends keyof MessageResponseMap ? MessageResponseMap[M['type']] : unknown;

/**
 * 型ガード: メッセージオブジェクトが ExtensionMessage の基本構造を持つか判定
 */
export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  return 'type' in msg && typeof (msg as { type: unknown }).type === 'string';
}

/**
 * 型ガード: クライアント向け（ブロードキャスト等）メッセージであるか判定
 */
export function isToClientMessage(msg: unknown): msg is ToClientMessage {
  if (!isExtensionMessage(msg)) return false;
  return (
    msg.type === 'AUTO_STATE_UPDATE' ||
    msg.type === 'SCRAPE_LIVE_STREAMERS_REQUEST' ||
    msg.type === 'NAVIGATE_TO_CHANNEL_REPLACE'
  );
}
