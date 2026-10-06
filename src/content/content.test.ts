import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import {
  extractUserLoginFromHref,
  isOfflineChannel,
  extractUserNameFromAria,
  extractUserName,
  cleanText,
  parseViewerCount,
  parseStreamerFromLink,
} from './streamer-parser';

const domWindow = new Window();
(globalThis as any).window = domWindow;
(globalThis as any).document = domWindow.document;
const document = domWindow.document;

function createAnchor(href?: string): any {
  const a = document.createElement('a');
  if (href) a.href = href;
  return a;
}

function createImg(src?: string, alt?: string): any {
  const img = document.createElement('img');
  if (src) img.src = src;
  if (alt) img.alt = alt;
  return img;
}

describe('src/content/content.ts DOM Parsing Helpers', () => {
  describe('extractUserLoginFromHref', () => {
    it('正常な配信者の相対・絶対URLから user_login を小文字で抽出する', () => {
      expect(extractUserLoginFromHref('/fps_test_user')).toBe('fps_test_user');
      expect(extractUserLoginFromHref('https://www.twitch.tv/StreamerName')).toBe('streamername');
    });

    it('システム予約パスやルートパスの場合は null を返す', () => {
      expect(extractUserLoginFromHref(null)).toBeNull();
      expect(extractUserLoginFromHref('/')).toBeNull();
      expect(extractUserLoginFromHref('/directory')).toBeNull();
      expect(extractUserLoginFromHref('/directory/game/Valorant')).toBeNull();
      expect(extractUserLoginFromHref('/settings/profile')).toBeNull();
      expect(extractUserLoginFromHref('/subscriptions')).toBeNull();
      expect(extractUserLoginFromHref('/p/test')).toBeNull();
    });

    it('ドットを含むユーザ名（無効なユーザ名）の場合は null を返す', () => {
      expect(extractUserLoginFromHref('/file.js')).toBeNull();
    });
  });

  describe('isOfflineChannel', () => {
    it('オフラインを示すCSSクラスを持つアバターが存在する場合は true を返す', () => {
      const a = createAnchor();
      const avatar = document.createElement('div');
      avatar.className = 'side-nav-card__avatar--offline';
      a.appendChild(avatar);

      expect(isOfflineChannel(a)).toBe(true);
    });

    it('テキストに「オフライン」または「Offline」が含まれる場合は true を返す', () => {
      const a1 = createAnchor();
      a1.textContent = 'User 1 オフライン';
      expect(isOfflineChannel(a1)).toBe(true);

      const a2 = createAnchor();
      a2.textContent = 'User 2 Offline';
      expect(isOfflineChannel(a2)).toBe(true);
    });

    it('ライブ状態の場合は false を返す', () => {
      const a = createAnchor();
      a.textContent = 'User 3 1.2千人';
      expect(isOfflineChannel(a)).toBe(false);
    });
  });

  describe('extractUserNameFromAria', () => {
    it('"表示名 (login_id)" パターンから表示名を抽出する', () => {
      expect(extractUserNameFromAria('配信者太郎 (streamer_taro)')).toBe('配信者太郎');
    });

    it('改行区切りテキストから先頭行の表示名を抽出する', () => {
      expect(extractUserNameFromAria('配信者花子\nライブ中')).toBe('配信者花子');
    });

    it('詳細情報やアクセシビリティ指示等のテキストは cleanText により除去される', () => {
      expect(extractUserNameFromAria('詳細情報')).toBe('');
    });
  });

  describe('cleanText', () => {
    it('null または undefined が渡された場合に空文字列を返す', () => {
      expect(cleanText(null)).toBe('');
      expect(cleanText(undefined)).toBe('');
    });

    it('空文字列が渡された場合に空文字列を返す', () => {
      expect(cleanText('')).toBe('');
    });

    it('空白のみの文字列（スペース、タブ、改行）が渡された場合に空文字列を返す', () => {
      expect(cleanText('   ')).toBe('');
      expect(cleanText('\t\n  ')).toBe('');
    });

    it('除外キーワードを含む文字列が渡された場合に空文字列を返す', () => {
      expect(cleanText('詳細情報')).toBe('');
      expect(cleanText('詳細')).toBe('');
      expect(cleanText('Press right arrow to view')).toBe('');
      expect(cleanText('ボタンを押すと再生')).toBe('');
    });

    it('前後に余分な空白が含まれる正常文字列をトリムして返す', () => {
      expect(cleanText('  streamer_abc  ')).toBe('streamer_abc');
      expect(cleanText('\n  配信者名 \t ')).toBe('配信者名');
    });

    it('通常の文字列をそのまま返す', () => {
      expect(cleanText('TwitchStreamer123')).toBe('TwitchStreamer123');
    });
  });

  describe('extractUserName', () => {
    it('サイドナビタイトル要素から優先的にユーザー名を取得する', () => {
      const a = createAnchor();
      const titleSpan = document.createElement('span');
      titleSpan.setAttribute('data-a-target', 'side-nav-title');
      titleSpan.textContent = '表示名A';
      a.appendChild(titleSpan);

      expect(extractUserName(a, null, 'user_a')).toBe('表示名A');
    });

    it('タイトル要素がない場合、aria-label や img alt からフォールバック取得する', () => {
      const a = createAnchor();
      a.setAttribute('aria-label', '表示名B (user_b)');

      const img = createImg(undefined, '表示名B');

      expect(extractUserName(a, img, 'user_b')).toBe('表示名B');
    });

    it('すべて存在しない場合、userLogin を最終フォールバックとして返す', () => {
      const a = createAnchor();
      expect(extractUserName(a, null, 'fallback_user')).toBe('fallback_user');
    });
  });

  describe('parseViewerCount', () => {
    it('通常の数字表現を正しい数値にパースする', () => {
      expect(parseViewerCount('150')).toBe(150);
      expect(parseViewerCount('1,234 視聴者')).toBe(1234);
    });

    it('「万」単位の日本語表記を計算してパースする', () => {
      expect(parseViewerCount('1.2万人')).toBe(12000);
      expect(parseViewerCount('2万')).toBe(20000);
    });

    it('「k」/「K」単位の英語表記を計算してパースする', () => {
      expect(parseViewerCount('3.5k viewers')).toBe(3500);
      expect(parseViewerCount('10K')).toBe(10000);
    });

    it('数値が含まれない場合は 0 を返す', () => {
      expect(parseViewerCount('')).toBe(0);
      expect(parseViewerCount('なし')).toBe(0);
    });
  });

  describe('parseStreamerFromLink (統合動作検証)', () => {
    it('ライブ配信者の HTMLAnchorElement から StreamInfo を正常に生成する', () => {
      const a = createAnchor('https://www.twitch.tv/test_streamer');

      const img = createImg('https://example.com/avatar.jpg', 'テスト配信者');
      a.appendChild(img);

      const title = document.createElement('span');
      title.setAttribute('data-a-target', 'side-nav-title');
      title.textContent = 'テスト配信者';
      a.appendChild(title);

      const game = document.createElement('span');
      game.setAttribute('data-a-target', 'side-nav-game-title');
      game.textContent = 'Just Chatting';
      a.appendChild(game);

      const recap = document.createElement('span');
      recap.setAttribute('data-a-target', 'side-nav-live-recap');
      recap.textContent = '2.5万人';
      a.appendChild(recap);

      const result = parseStreamerFromLink(a);
      expect(result).toEqual({
        user_login: 'test_streamer',
        user_name: 'テスト配信者',
        game_name: 'Just Chatting',
        profile_image_url: 'https://example.com/avatar.jpg',
        viewer_count: 25000,
      });
    });

    it('オフライン配信者の要素の場合は null を返す', () => {
      const a = createAnchor('/offline_user');
      a.textContent = 'オフライン';

      expect(parseStreamerFromLink(a)).toBeNull();
    });
  });
});
