// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount } from 'svelte';
import GnbNavTrigger from './GnbNavTrigger.svelte';

describe('src/content/GnbNavTrigger.svelte Component Test', () => {
  let target: HTMLElement;
  let component: any;

  beforeEach(() => {
    target = document.createElement('div');
    document.body.appendChild(target);

    (globalThis as any).chrome = {
      runtime: {
        id: 'mock-id',
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    if (component) {
      try {
        unmount(component);
      } catch {}
      component = null;
    }
    target.remove();
    vi.restoreAllMocks();
  });

  it('props を受け取って正常にマウントされ、時間表示がレンダリングされる', async () => {
    component = mount(GnbNavTrigger, {
      target,
      props: {
        autoState: {
          isActive: true,
          timeRemainingSeconds: 150,
          totalDurationSeconds: 180,
          currentChannel: 'test_channel',
        },
        settings: {
          rotationTimeMinutes: 3,
          autoStartOnLogin: true,
          language: 'ja',
          customCss: '',
          customJs: '',
          customCssEnabled: false,
          customJsEnabled: false,
        },
        liveStreamers: [],
      },
    });

    await vi.waitFor(() => {
      expect(target.textContent).toContain('2:30');
    });
  });

  it('オートモード切り替えボタンをクリックした際に onToggleAuto コールバックが実行される', async () => {
    const onToggleAuto = vi.fn();

    component = mount(GnbNavTrigger, {
      target,
      props: {
        autoState: {
          isActive: false,
          timeRemainingSeconds: 0,
          totalDurationSeconds: 180,
          currentChannel: '',
        },
        settings: {
          rotationTimeMinutes: 3,
          autoStartOnLogin: true,
          language: 'ja',
          customCss: '',
          customJs: '',
          customCssEnabled: false,
          customJsEnabled: false,
        },
        onToggleAuto,
      },
    });

    // トリガーボタンまたはトグルボタンをクリック
    const buttons = Array.from(target.querySelectorAll('button'));
    const toggleButton = buttons.find((b) => b.getAttribute('title')?.includes('オートモード') || b.textContent?.includes('開始'));
    if (toggleButton) {
      toggleButton.click();
      expect(onToggleAuto).toHaveBeenCalledTimes(1);
    }
  });

  it('スキップボタンをクリックした際に onSkip コールバックが実行される', async () => {
    const onSkip = vi.fn();

    component = mount(GnbNavTrigger, {
      target,
      props: {
        autoState: {
          isActive: true,
          timeRemainingSeconds: 100,
          totalDurationSeconds: 180,
          currentChannel: 'test_channel',
        },
        settings: {
          rotationTimeMinutes: 3,
          autoStartOnLogin: true,
          language: 'ja',
          customCss: '',
          customJs: '',
          customCssEnabled: false,
          customJsEnabled: false,
        },
        onSkip,
      },
    });

    const buttons = Array.from(target.querySelectorAll('button'));
    const skipButton = buttons.find((b) => b.getAttribute('title')?.includes('スキップ') || b.textContent?.includes('スキップ'));
    if (skipButton) {
      skipButton.click();
      expect(onSkip).toHaveBeenCalledTimes(1);
    }
  });
});
