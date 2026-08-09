<script lang="ts">
  import { onMount } from "svelte";
  import { slide } from "svelte/transition";
  import type { AppSettings, StreamInfo } from "../types";
  import { Settings, Save, Check, Code, Globe, Clock, Play, UserX, Plus, Trash2, CheckCircle2 } from "@lucide/svelte";

  const placeholderCssText = "/* 例: nav { display: none !important; } */";
  const placeholderJsText = "// 例: console.log('gnb-twipper custom script injected');";

  let settings = $state<AppSettings>({
    rotationTimeMinutes: 3,
    autoStartOnLogin: true,
    language: "ja",
    customCss: "",
    customJs: "",
    customCssEnabled: false,
    customJsEnabled: false,
    excludedChannels: [],
  });

  let isSaved = $state(false);
  let newExcludedInput = $state("");
  let liveStreamers = $state<StreamInfo[]>([]);

  onMount(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn("[gnb-twipper] GET_SETTINGS lastError:", chrome.runtime.lastError.message);
        return;
      }
      if (res && res.settings) {
        settings = { excludedChannels: [], ...res.settings };
      }
      if (res && res.liveStreamers) {
        liveStreamers = res.liveStreamers;
      }
    });
  });

  function saveSettings() {
    chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings }, () => {
      if (chrome.runtime.lastError) return;
      isSaved = true;
      setTimeout(() => {
        isSaved = false;
      }, 2000);
    });
  }

  function extractUsername(input: string): string {
    const trimmed = input.trim();
    if (!trimmed) return "";
    try {
      if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        const url = new URL(trimmed);
        const path = url.pathname.replace(/^\/+|\/+$/g, "");
        return path.split("/")[0].toLowerCase();
      }
      if (trimmed.includes("twitch.tv/")) {
        const parts = trimmed.split("twitch.tv/");
        return parts[1]
          .replace(/^\/+|\/+$/g, "")
          .split("/")[0]
          .toLowerCase();
      }
    } catch (e) {}
    return trimmed.replace(/^@/, "").toLowerCase();
  }

  let extractedUser = $derived(extractUsername(newExcludedInput));
  let isFollowingExtracted = $derived(extractedUser ? liveStreamers.some((s) => s.user_login.toLowerCase() === extractedUser) : false);

  function addExcludedChannel() {
    const userLogin = extractUsername(newExcludedInput);
    if (!userLogin) return;

    if (!settings.excludedChannels) {
      settings.excludedChannels = [];
    }

    const exists = settings.excludedChannels.some((item) => item.user_login.toLowerCase() === userLogin);
    if (exists) {
      return;
    }

    const matchedStreamer = liveStreamers.find((s) => s.user_login.toLowerCase() === userLogin);

    settings.excludedChannels = [
      ...settings.excludedChannels,
      {
        user_login: userLogin,
        user_name: matchedStreamer ? matchedStreamer.user_name : userLogin,
        enabled: true,
        addedAt: Date.now(),
      },
    ];

    newExcludedInput = "";
    saveSettings();
  }

  function removeExcludedChannel(userLogin: string) {
    if (!settings.excludedChannels) return;
    settings.excludedChannels = settings.excludedChannels.filter((item) => item.user_login.toLowerCase() !== userLogin.toLowerCase());
    saveSettings();
  }

  function toggleExcludedChannel(userLogin: string) {
    if (!settings.excludedChannels) return;
    settings.excludedChannels = settings.excludedChannels.map((item) => {
      if (item.user_login.toLowerCase() === userLogin.toLowerCase()) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    });
    saveSettings();
  }
</script>

<div class="options-layout">
  <header class="header">
    <div class="logo">
      <svg class="options-logo-icon" width="28" height="28" viewBox="-27.5 -33 512 512">
        <path
          fill="#882dfd"
          d="M 22.15,206 C 22.07,154.28 22.17,102.55 22.43,50.83 25.29,29.05 42.47,18.48 63.54,20.17 165.86,20.13 268.18,20.12 370.5,20.13 c 9.72,0.44 21.04,-0.99 30.43,1.57 14.49,5.29 22.38,15.61 23.69,30.98 0.21,109.25 0.25,218.51 0.12,327.76 1.21,22.59 -9.86,39.97 -33.41,42.24 -108.93,0.2 -217.85,0.25 -326.78,0.12 C 41.92,424.05 25.81,413.42 22.46,390.25 22.17,328.84 22.06,267.42 22.15,206 Z"
        />
        <path
          fill="#ffffff"
          d="m 45.02,88 c -0.03,98.14 0.02,196.27 0.13,294.41 -0.58,16.06 10,15.07 22.36,14.93 102.99,0.02 205.99,0.03 308.98,0 9.23,-0.66 22.31,3.03 25.06,-9.17 0.25,-4.22 0.36,-8.45 0.35,-12.69 0.01,-96.32 0.01,-192.64 0.01,-288.96 0.06,-0.56 -0.14,-1.01 -0.58,-1.35 C 283.05,84.87 164.77,84.8 46.48,84.96 44.66,84.83 45.09,86.84 45.02,88 Z"
        />
        <path fill="none" stroke="#882dfd" stroke-width="33.6" d="m 217.46,326.24 a 88.1,90.4 0 0 1 -81.4,-55.8 88.1,90.4 0 0 1 19.1,-98.5 88.1,90.4 0 0 1 96,-19.6 88.1,90.4 0 0 1 54.4,83.5" />
        <path fill="#882dfd" d="m 205.07,254.57 -0.31,128.34 66.96,-51.84 0.44,51.67 73.83,-66.7 -74.41,-62.44 -0.04,52.18 z" />
      </svg>
      <h1>gnb-twipper 設定</h1>
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
    <section class="card">
      <h2>巡回タイマー設定</h2>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={settings.autoStartOnLogin} />
          <Play size={16} /> 起動時にオートモードを自動開始する
        </label>
      </div>

      <div class="form-group">
        <label for="rotationTime">巡回切り替え時間 (分):</label>
        <input id="rotationTime" type="number" min="1" max="60" bind:value={settings.rotationTimeMinutes} class="input-number" />
        <p class="help-text">オートモード時に、次の配信者に切り替わるまでのタイマー時間です。</p>
      </div>
    </section>

    <section class="card">
      <h2>巡回除外設定</h2>
      <p class="help-text">自動巡回（ローテーション）でスキップしたい配信者を登録・管理します。（例: AmazonMusic, AmazonMusicDE 等）</p>

      <div class="add-exclusion-form">
        <div class="input-wrapper">
          <input type="text" bind:value={newExcludedInput} placeholder="Twitch URLまたはユーザー名を入力 (例: amazonmusic)" class="input-text" onkeydown={(e) => e.key === "Enter" && addExcludedChannel()} />
          {#if extractedUser}
            <div class="extracted-preview">
              <span class="user-id">@{extractedUser}</span>
              {#if isFollowingExtracted}
                <span class="badge badge-success"><CheckCircle2 size={12} /> フォロー中</span>
              {/if}
            </div>
          {/if}
        </div>
        <button class="btn-add" onclick={addExcludedChannel} disabled={!extractedUser}>
          <Plus size={16} />
          <span>追加</span>
        </button>
      </div>

      <div class="exclusion-list">
        {#if !settings.excludedChannels || settings.excludedChannels.length === 0}
          <div class="empty-exclusion">登録された除外対象はありません</div>
        {:else}
          {#each settings.excludedChannels as item}
            {@const isFollowing = liveStreamers.some((s) => s.user_login.toLowerCase() === item.user_login.toLowerCase())}
            <div class="exclusion-item {item.enabled ? 'enabled' : 'disabled'}">
              <label class="item-checkbox-label" title={item.enabled ? "除外有効 (スキップされます)" : "除外無効 (巡回されます)"}>
                <input type="checkbox" checked={item.enabled} onchange={() => toggleExcludedChannel(item.user_login)} />
              </label>
              <div class="item-info">
                <span class="item-name">{item.user_name || item.user_login}</span>
                <span class="item-id">({item.user_login})</span>
                {#if isFollowing}
                  <span class="badge badge-success-sm">フォロー中</span>
                {/if}
              </div>
              <button class="btn-delete" onclick={() => removeExcludedChannel(item.user_login)} title="除外リストから削除">
                <Trash2 size={15} />
              </button>
            </div>
          {/each}
        {/if}
      </div>
    </section>

    <section class="card">
      <h2>カスタムインジェクション (CSS / JS)</h2>
      <p class="help-text">Twitch Web ページ上に自動適用される独自の CSS および JavaScript ロジックを構成します。</p>

      <div class="editor-block">
        <div class="editor-header">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={settings.customCssEnabled} />
            カスタム CSS を有効化
          </label>
        </div>
        {#if settings.customCssEnabled}
          <div transition:slide={{ duration: 220 }}>
            <textarea bind:value={settings.customCss} placeholder={placeholderCssText} class="code-editor"></textarea>
          </div>
        {/if}
      </div>

      <div class="editor-block">
        <div class="editor-header">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={settings.customJsEnabled} />
            カスタム JS を有効化
          </label>
        </div>
        {#if settings.customJsEnabled}
          <div transition:slide={{ duration: 220 }}>
            <textarea bind:value={settings.customJs} placeholder={placeholderJsText} class="code-editor"></textarea>
          </div>
        {/if}
      </div>
    </section>

    <section class="card">
      <h2>言語設定</h2>
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
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
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

  .input-number,
  .select-input {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 14px;
    outline: none;
  }

  .input-number:focus,
  .select-input:focus {
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

  .add-exclusion-form {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .input-text {
    width: 100%;
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid #475569;
    border-radius: 6px;
    padding: 8px 12px;
    font-size: 13px;
    box-sizing: border-box;
    outline: none;
  }

  .input-text:focus {
    border-color: #9333ea;
  }

  .extracted-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    padding-left: 2px;
  }

  .user-id {
    color: #a78bfa;
    font-family: monospace;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
  }

  .badge-success {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .badge-success-sm {
    background: rgba(34, 197, 94, 0.15);
    color: #4ade80;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 4px;
  }

  .btn-add {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #7c3aed;
    color: #ffffff;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 600;
    font-size: 13px;
    cursor: pointer;
    align-self: flex-start;
    height: 37px;
    transition: background 0.15s ease;
  }

  .btn-add:hover:not(:disabled) {
    background: #6d28d9;
  }

  .btn-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .exclusion-list {
    background: #0f172a;
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 6px;
    max-height: 220px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .empty-exclusion {
    text-align: center;
    padding: 16px;
    font-size: 12px;
    color: #64748b;
  }

  .exclusion-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #1e293b;
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    transition: background 0.15s ease;
  }

  .exclusion-item.disabled {
    opacity: 0.6;
    background: #182232;
  }

  .item-checkbox-label {
    margin: 0;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .item-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
  }

  .item-name {
    font-weight: 600;
    color: #f1f5f9;
  }

  .item-id {
    font-size: 11px;
    color: #94a3b8;
    font-family: monospace;
  }

  .btn-delete {
    background: transparent;
    border: none;
    color: #ef4444;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.8;
    transition:
      opacity 0.15s ease,
      background 0.15s ease;
  }

  .btn-delete:hover {
    opacity: 1;
    background: rgba(239, 68, 68, 0.15);
  }
</style>
