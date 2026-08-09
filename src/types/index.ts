export interface StreamInfo {
  user_login: string;
  user_name: string;
  game_name?: string;
  title?: string;
  viewer_count?: number;
  profile_image_url?: string;
  started_at?: string;
  watch_time_seconds?: number;
}

export interface ExcludedChannel {
  user_login: string;     // 小文字ユーザーID (例: 'amazonmusic')
  user_name?: string;     // 表示名
  enabled: boolean;       // 除外ON/OFF (true: 巡回から除外, false: 通常巡回)
  addedAt: number;        // 登録タイムスタンプ
}

export interface AppSettings {
  rotationTimeMinutes: number; // 回転時間（分）
  autoStartOnLogin: boolean;   // 起動時にオートモードを自動開始するか
  language: 'ja' | 'en';       // UI言語
  customCss: string;           // カスタムインジェクションCSS
  customJs: string;            // カスタムインジェクションJS
  customCssEnabled: boolean;
  customJsEnabled: boolean;
  excludedChannels?: ExcludedChannel[]; // 巡回除外対象リスト
}

export interface AutoState {
  isActive: boolean;
  timeRemainingSeconds: number;
  totalDurationSeconds: number;
  currentChannel: string;
  nextChannel?: string;
}

export type ExtensionMessage =
  | { type: 'GET_SETTINGS' }
  | { type: 'SAVE_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'GET_LIVE_STREAMERS' }
  | { type: 'START_AUTO_MODE' }
  | { type: 'STOP_AUTO_MODE' }
  | { type: 'SKIP_NEXT' }
  | { type: 'SELECT_STREAMER'; channel: string }
  | { type: 'GET_AUTO_STATE' }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'EXECUTE_CUSTOM_JS'; code: string }
  | { type: 'UPDATE_STREAMERS_FROM_DOM'; streamers: StreamInfo[] };

