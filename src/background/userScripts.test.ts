import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getUserScriptsApi,
  syncCustomUserScript,
  checkUserScriptsStatus,
} from './userScripts';
import type { AppSettings } from '../types';

describe('src/background/userScripts.ts', () => {
  const originalChrome = (globalThis as any).chrome;
  const originalBrowser = (globalThis as any).browser;

  const sampleSettings: AppSettings = {
    rotationTimeMinutes: 3,
    autoStartOnLogin: true,
    language: 'ja',
    customCss: '',
    customJs: 'console.log("custom script test");',
    customCssEnabled: false,
    customJsEnabled: true,
  };

  afterEach(() => {
    (globalThis as any).chrome = originalChrome;
    (globalThis as any).browser = originalBrowser;
    vi.restoreAllMocks();
  });

  describe('getUserScriptsApi', () => {
    it('chrome.userScripts が存在する場合はそれを返す', () => {
      const mockApi = { getScripts: vi.fn(), register: vi.fn(), unregister: vi.fn() };
      (globalThis as any).chrome = { userScripts: mockApi };
      (globalThis as any).browser = undefined;

      expect(getUserScriptsApi()).toBe(mockApi);
    });

    it('chrome になく browser.userScripts が存在する場合はそれを返す', () => {
      const mockBrowserApi = { getScripts: vi.fn() };
      (globalThis as any).chrome = {};
      (globalThis as any).browser = { userScripts: mockBrowserApi };

      expect(getUserScriptsApi()).toBe(mockBrowserApi);
    });

    it('どちらも存在しない場合は null を返す', () => {
      (globalThis as any).chrome = {};
      (globalThis as any).browser = {};

      expect(getUserScriptsApi()).toBeNull();
    });
  });

  describe('checkUserScriptsStatus', () => {
    it('userScripts API が存在しない場合は allowed: false を返す', async () => {
      (globalThis as any).chrome = {};
      (globalThis as any).browser = undefined;

      const status = await checkUserScriptsStatus();
      expect(status).toEqual({ allowed: false, error: 'API unavailable' });
    });

    it('getScripts が正常に完了した場合は allowed: true を返す', async () => {
      const mockGetScripts = vi.fn(() => Promise.resolve([]));
      (globalThis as any).chrome = {
        userScripts: { getScripts: mockGetScripts },
      };

      const status = await checkUserScriptsStatus();
      expect(status).toEqual({ allowed: true });
      expect(mockGetScripts).toHaveBeenCalledTimes(1);
    });

    it('getScripts が例外をスローした場合（デベロッパーモード無効時等）は allowed: false とエラーメッセージを返す', async () => {
      const mockGetScripts = vi.fn(() => Promise.reject(new Error('User scripts requires developer mode')));
      (globalThis as any).chrome = {
        userScripts: { getScripts: mockGetScripts },
      };

      const status = await checkUserScriptsStatus();
      expect(status.allowed).toBe(false);
      expect(status.error).toContain('developer mode');
    });
  });

  describe('syncCustomUserScript', () => {
    it('API が存在しない場合は allowed: false を返す', async () => {
      (globalThis as any).chrome = {};
      const result = await syncCustomUserScript(sampleSettings);
      expect(result).toEqual({ allowed: false, error: 'API unavailable' });
    });

    it('customJsEnabled が true の場合、既存スクリプトを登録解除してから新しいスクリプトを登録する', async () => {
      const mockUnregister = vi.fn((..._args: any[]) => Promise.resolve());
      const mockRegister = vi.fn((_scripts: any[]) => Promise.resolve());
      const mockGetScripts = vi.fn((..._args: any[]) => Promise.resolve([{ id: 'gnb-twipper-custom-script' }]));

      (globalThis as any).chrome = {
        userScripts: {
          getScripts: mockGetScripts,
          unregister: mockUnregister,
          register: mockRegister,
        },
      };

      const result = await syncCustomUserScript(sampleSettings);
      expect(result).toEqual({ allowed: true });
      expect(mockUnregister).toHaveBeenCalledWith({ ids: ['gnb-twipper-custom-script'] });
      expect(mockRegister).toHaveBeenCalledTimes(1);

      const registeredScripts = mockRegister.mock.calls[0][0];
      expect(registeredScripts[0].id).toBe('gnb-twipper-custom-script');
      expect(registeredScripts[0].js[0].code).toBe(sampleSettings.customJs);
    });

    it('customJsEnabled が false の場合は unregister のみ実行され register は呼ばれない', async () => {
      const mockUnregister = vi.fn((..._args: any[]) => Promise.resolve());
      const mockRegister = vi.fn((_scripts: any[]) => Promise.resolve());
      const mockGetScripts = vi.fn((..._args: any[]) => Promise.resolve([{ id: 'gnb-twipper-custom-script' }]));

      (globalThis as any).chrome = {
        userScripts: {
          getScripts: mockGetScripts,
          unregister: mockUnregister,
          register: mockRegister,
        },
      };

      const disabledSettings: AppSettings = { ...sampleSettings, customJsEnabled: false };
      const result = await syncCustomUserScript(disabledSettings);

      expect(result).toEqual({ allowed: true });
      expect(mockUnregister).toHaveBeenCalledTimes(1);
      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('register 実行時に例外が発生した場合は allowed: false とエラーメッセージを返す', async () => {
      const mockGetScripts = vi.fn((..._args: any[]) => Promise.resolve([]));
      const mockRegister = vi.fn((_scripts: any[]) => Promise.reject(new Error('Syntax error in user script')));

      (globalThis as any).chrome = {
        userScripts: {
          getScripts: mockGetScripts,
          register: mockRegister,
        },
      };

      const result = await syncCustomUserScript(sampleSettings);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Syntax error in user script');
    });
  });
});
