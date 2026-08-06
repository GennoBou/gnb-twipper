export interface StreamInfo {
  user_login: string;
  user_name: string;
  game_name?: string;
  title?: string;
  viewer_count?: number;
  profile_image_url?: string;
  started_at?: string;
}

export interface AppSettings {
  rotationTimeMinutes: number; // 回転時間（分）
  autoStartOnLogin: boolean;   // 起動時にオートモードを自動開始するか
  language: 'ja' | 'en';       // UI言語
  customCss: string;           // カスタムインジェクションCSS
  customJs: string;            // カスタムインジェクションJS
  customCssEnabled: boolean;
  customJsEnabled: boolean;
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
  | { type: 'OPEN_OPTIONS' };
