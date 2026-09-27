import { describe, it, expect, beforeEach } from 'vitest';
import { Window } from 'happy-dom';
import {
  findLeftSideNav,
  getFollowedCardLinks,
  scrapeLiveStreamersFromDOM,
} from './dom-scraper';

describe('src/content/dom-scraper.ts', () => {
  let domWindow: Window;
  let document: Document;

  beforeEach(() => {
    domWindow = new Window();
    document = domWindow.document as unknown as Document;
  });

  describe('findLeftSideNav', () => {
    it('data-a-target="side-nav-bar" 要素が存在する場合はそれを返す', () => {
      const sideNav = document.createElement('nav');
      sideNav.setAttribute('data-a-target', 'side-nav-bar');
      document.body.appendChild(sideNav);

      expect(findLeftSideNav(document)).toBe(sideNav);
    });

    it('右側チャットパネル（right-column / chat-room）内部の nav は除外される', () => {
      const rightCol = document.createElement('div');
      rightCol.setAttribute('data-a-target', 'right-column');
      const chatNav = document.createElement('nav');
      rightCol.appendChild(chatNav);
      document.body.appendChild(rightCol);

      expect(findLeftSideNav(document)).toBeNull();
    });
  });

  describe('getFollowedCardLinks', () => {
    it('フォロー中セクションの aria-label コンテナ内の a タグのみを返す', () => {
      const sideNav = document.createElement('nav');
      sideNav.setAttribute('data-a-target', 'side-nav-bar');

      const followedSection = document.createElement('div');
      followedSection.setAttribute('aria-label', 'フォローしているチャンネル');

      const link1 = document.createElement('a');
      link1.href = '/streamer_one';
      followedSection.appendChild(link1);

      const link2 = document.createElement('a');
      link2.href = '/streamer_two';
      followedSection.appendChild(link2);

      sideNav.appendChild(followedSection);

      const recommendedSection = document.createElement('div');
      recommendedSection.setAttribute('aria-label', 'おすすめのチャンネル');
      const recLink = document.createElement('a');
      recLink.href = '/rec_user';
      recommendedSection.appendChild(recLink);
      sideNav.appendChild(recommendedSection);

      document.body.appendChild(sideNav);

      const links = getFollowedCardLinks(sideNav);
      expect(links.length).toBe(2);
      expect(links).toContain(link1);
      expect(links).toContain(link2);
      expect(links).not.toContain(recLink);
    });
  });

  describe('scrapeLiveStreamersFromDOM', () => {
    it('DOMからライブ配信者を抽出して重複を排除して返す', () => {
      const sideNav = document.createElement('nav');
      sideNav.setAttribute('data-a-target', 'side-nav-bar');

      const followedSection = document.createElement('div');
      followedSection.setAttribute('aria-label', 'フォローしているチャンネル');

      // 配信者 1
      const a1 = document.createElement('a');
      a1.href = '/streamer_one';
      const title1 = document.createElement('span');
      title1.setAttribute('data-a-target', 'side-nav-title');
      title1.textContent = '配信者1';
      a1.appendChild(title1);
      followedSection.appendChild(a1);

      // 配信者 1 (重複リンク)
      const a1Dup = document.createElement('a');
      a1Dup.href = '/streamer_one';
      followedSection.appendChild(a1Dup);

      // オフライン配信者
      const aOffline = document.createElement('a');
      aOffline.href = '/streamer_offline';
      const offlineText = document.createElement('span');
      offlineText.textContent = 'オフライン';
      aOffline.appendChild(offlineText);
      followedSection.appendChild(aOffline);

      sideNav.appendChild(followedSection);
      document.body.appendChild(sideNav);

      const streamers = scrapeLiveStreamersFromDOM(document);
      expect(streamers.length).toBe(1);
      expect(streamers[0].user_login).toBe('streamer_one');
      expect(streamers[0].user_name).toBe('配信者1');
    });
  });
});
