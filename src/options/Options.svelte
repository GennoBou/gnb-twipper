<script lang="ts">
  import { onMount } from 'svelte';
  import { slide } from 'svelte/transition';
  import type { AppSettings } from '../types';
  import { Settings, Save, Check, Code, Globe, Clock, Play } from '@lucide/svelte';

  const placeholderCssText = "/* 例: nav { display: none !important; } */";
  const placeholderJsText = "// 例: console.log('gnb-twview custom script injected');";

  let settings = $state<AppSettings>({
    rotationTimeMinutes: 3,
    autoStartOnLogin: true,
    language: 'ja',
    customCss: '',
    customJs: '',
    customCssEnabled: true,
    customJsEnabled: true,
  });

  let isSaved = $state(false);

  onMount(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (res) => {
      if (res && res.settings) {
        settings = res.settings;
      }
    });
  });

  function saveSettings() {
    chrome.runtime.sendMessage({ type: 'SAVE_SETTINGS', settings }, () => {
      isSaved = true;
      setTimeout(() => {
        isSaved = false;
      }, 2000);
    });
  }
</script>

<div class="options-layout">
  <header class="header">
    <div class="logo">
      <svg class="options-logo-icon" width="28" height="28" viewBox="-27.5 -33 512 512">
        <path fill="#882dfd" d="M 22.15,206 C 22.07,154.28 22.17,102.55 22.43,50.83 25.29,29.05 42.47,18.48 63.54,20.17 165.86,20.13 268.18,20.12 370.5,20.13 c 9.72,0.44 21.04,-0.99 30.43,1.57 14.49,5.29 22.38,15.61 23.69,30.98 0.21,109.25 0.25,218.51 0.12,327.76 1.21,22.59 -9.86,39.97 -33.41,42.24 -108.93,0.2 -217.85,0.25 -326.78,0.12 C 41.92,424.05 25.81,413.42 22.46,390.25 22.17,328.84 22.06,267.42 22.15,206 Z" />
        <path fill="#ffffff" d="m 45.02,88 c -0.03,98.14 0.02,196.27 0.13,294.41 -0.58,16.06 10,15.07 22.36,14.93 102.99,0.02 205.99,0.03 308.98,0 9.23,-0.66 22.31,3.03 25.06,-9.17 0.25,-4.22 0.36,-8.45 0.35,-12.69 0.01,-96.32 0.01,-192.64 0.01,-288.96 0.06,-0.56 -0.14,-1.01 -0.58,-1.35 C 283.05,84.87 164.77,84.8 46.48,84.96 44.66,84.83 45.09,86.84 45.02,88 Z" />
        <path fill="none" stroke="#882dfd" stroke-width="33.6" d="m 217.46,326.24 a 88.1,90.4 0 0 1 -81.4,-55.8 88.1,90.4 0 0 1 19.1,-98.5 88.1,90.4 0 0 1 96,-19.6 88.1,90.4 0 0 1 54.4,83.5" />
        <path fill="#882dfd" d="m 205.07,254.57 -0.31,128.34 66.96,-51.84 0.44,51.67 73.83,-66.7 -74.41,-62.44 -0.04,52.18 z" />
      </svg>
      <h1>gnb-twview 設定</h1>
    </div>
    <button class="btn-save" onclick={saveSettings}>
      {#if isSaved}
        <Check size={18} />
        <span>保存完了</span>
      {:else}
        <Save size={18} />
        <span>設定を保存</span>
      {/if}
    </button>
  </header>

  <main class="content">
    <!-- General Settings -->
    <section class="card">
      <h2><Clock size={18} /> 巡回タイマー設定</h2>
      
      <div class="form-group">
        <label for="rotationTime">巡回切り替え時間 (分):</label>
        <input
          id="rotationTime"
          type="number"
          min="1"
          max="60"
          bind:value={settings.rotationTimeMinutes}
          class="input-number"
        />
        <p class="help-text">オートモード時に、次の配信者に切り替わるまでのタイマー時間です。</p>
      </div>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={settings.autoStartOnLogin} />
          <Play size={16} /> 起動時にオートモードを自動開始する
        </label>
      </div>
    </section>

    <!-- Custom Injections -->
    <section class="card">
      <h2><Code size={18} /> カスタムインジェクション (CSS / JS)</h2>
      <p class="help-text">Twitch Web ページ上に自動適用される独自の CSS および JavaScript ロジックを構成します。</p>

      <!-- Custom CSS -->
      <div class="editor-block">
        <div class="editor-header">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={settings.customCssEnabled} />
            カスタム CSS を有効化
          </label>
        </div>
        {#if settings.customCssEnabled}
          <div transition:slide={{ duration: 220 }}>
            <textarea
              bind:value={settings.customCss}
              placeholder={placeholderCssText}
              class="code-editor"
            ></textarea>
          </div>
        {/if}
      </div>

      <!-- Custom JS -->
      <div class="editor-block">
        <div class="editor-header">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={settings.customJsEnabled} />
            カスタム JS を有効化
          </label>
        </div>
        {#if settings.customJsEnabled}
          <div transition:slide={{ duration: 220 }}>
            <textarea
              bind:value={settings.customJs}
              placeholder={placeholderJsText}
              class="code-editor"
            ></textarea>
          </div>
        {/if}
      </div>
    </section>

    <!-- Language Settings (Moved to bottom as lower priority) -->
    <section class="card">
      <h2><Globe size={18} /> 言語設定</h2>
      <div class="form-group">
        <label for="language">表示言語 (Language):</label>
        <select id="language" bind:value={settings.language} class="select-input">
          <option value="ja">日本語 (Japanese)</option>
          <option value="en">English</option>
        </select>
      </div>
    </section>
  </main>
</div>

<style>
  .options-layout {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 16px;
    margin-bottom: 24px;
    border-bottom: 1px solid #334155;
  }

  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h1 {
    font-size: 22px;
    font-weight: 800;
    margin: 0;
    background: linear-gradient(135deg, #a855f7, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .btn-save {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #2563eb;
    color: #ffffff;
    border: none;
    padding: 10px 20px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn-save:hover {
    background: #1d4ed8;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 20px;
  }

  h2 {
    font-size: 16px;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    color: #f1f5f9;
  }

  .form-group {
    margin-bottom: 16px;
  }

  label {
    display: block;
    font-weight: 600;
    font-size: 13px;
    margin-bottom: 6px;
    color: #cbd5e1;
  }

  .input-number, .select-input {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 14px;
    outline: none;
  }

  .input-number:focus, .select-input:focus {
    border-color: #9333ea;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
  }

  .help-text {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
    margin-bottom: 12px;
  }

  .editor-block {
    margin-bottom: 16px;
  }

  .editor-header {
    margin-bottom: 8px;
  }

  .code-editor {
    width: 100%;
    height: 120px;
    background: #0f172a;
    color: #38bdf8;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 10px;
    font-family: monospace;
    font-size: 13px;
    box-sizing: border-box;
    outline: none;
    resize: vertical;
  }

  .code-editor:focus {
    border-color: #9333ea;
  }
</style>
