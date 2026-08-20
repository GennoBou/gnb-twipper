<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { slide } from "svelte/transition";
  import type { AppSettings, StreamInfo } from "../types";
  import { Settings, Save, Check, Code, Globe, Clock, Play, UserX, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "@lucide/svelte";
  import { i18n } from "../i18n.svelte";
  import * as acorn from "acorn";

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
    skipSubOnlyStreams: false,
    allowSubOnlyFreePreview: true,
  });

  let saveState = $state<"idle" | "saving" | "saved">("idle");
  let newExcludedInput = $state("");
  let liveStreamers = $state<StreamInfo[]>([]);
  let isLoaded = $state(false);

  // CSP安全なJS構文チェック関数 (acorn ASTパーサー使用)
  function checkJsSyntax(code: string): { valid: boolean; error?: string } {
    if (!code.trim()) return { valid: true };
    try {
      acorn.parse(code, { ecmaVersion: "latest", sourceType: "module", allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true, allowImportExportEverywhere: true });
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message || String(err) };
    }
  }

  function checkCssSyntax(code: string): { valid: boolean; error?: string } {
    if (!code.trim()) return { valid: true };
    try {
      if (typeof CSSStyleSheet !== "undefined" && typeof CSSStyleSheet.prototype.replaceSync === "function") {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(code);
      }
      return { valid: true };
    } catch (err: any) {
      return { valid: false, error: err.message || String(err) };
    }
  }

  let cssSyntax = $derived(checkCssSyntax(settings.customCss));
  let jsSyntax = $derived(checkJsSyntax(settings.customJs));

  onMount(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn("[gnb-twipper] GET_SETTINGS lastError:", chrome.runtime.lastError.message);
        isLoaded = true;
        return;
      }
      if (res && res.settings) {
        settings = { excludedChannels: [], ...res.settings };
        if (settings.language) {
          i18n.lang = settings.language;
        }
      }
      if (res && res.liveStreamers) {
        liveStreamers = res.liveStreamers;
      }
      // 初期ロード完了後に自動保存のリスナーを有効化
      setTimeout(() => {
        isLoaded = true;
      }, 100);
    });
  });

  // 言語の変更を即時反映
  $effect(() => {
    if (settings.language) {
      i18n.lang = settings.language;
    }
  });

  // デバウンス付き自動保存
  let saveTimer: any = null;
  function triggerAutoSave() {
    if (!isLoaded) return;
    saveState = "saving";
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveSettingsDirectly();
    }, 500);
  }

  function saveSettingsDirectly() {
    if (saveTimer) clearTimeout(saveTimer);
    saveState = "saving";
    chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", settings }, () => {
      if (chrome.runtime.lastError) return;
      saveState = "saved";
      setTimeout(() => {
        if (saveState === "saved") {
          saveState = "idle";
        }
      }, 2000);
    });
  }

  // settings の変更を監視して自動保存
  $effect(() => {
    // 依存関係として settings の主要プロパティを構造購読
    const _ = JSON.stringify(settings);
    if (isLoaded) {
      untrack(() => {
        triggerAutoSave();
      });
    }
  });

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
    saveSettingsDirectly();
  }

  function removeExcludedChannel(userLogin: string) {
    if (!settings.excludedChannels) return;
    settings.excludedChannels = settings.excludedChannels.filter((item) => item.user_login.toLowerCase() !== userLogin.toLowerCase());
    saveSettingsDirectly();
  }

  function toggleExcludedChannel(userLogin: string) {
    if (!settings.excludedChannels) return;
    settings.excludedChannels = settings.excludedChannels.map((item) => {
      if (item.user_login.toLowerCase() === userLogin.toLowerCase()) {
        return { ...item, enabled: !item.enabled };
      }
      return item;
    });
    saveSettingsDirectly();
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
      <h1>{i18n.t("appTitle")}</h1>
    </div>
    <button class="btn-save {saveState}" onclick={saveSettingsDirectly}>
      {#if saveState === "saving"}
        <Loader2 size={18} class="spin-icon" />
        <span>{i18n.t("saving")}</span>
      {:else if saveState === "saved"}
        <Check size={18} />
        <span>{i18n.t("saved")}</span>
      {:else}
        <Save size={18} />
        <span>{i18n.t("saveSettings")}</span>
      {/if}
    </button>
  </header>

  <main class="content">
    <section class="card">
      <h2><Clock size={18} /> {i18n.t("timerSectionTitle")}</h2>

      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={settings.autoStartOnLogin} />
          <Play size={16} /> {i18n.t("autoStartLabel")}
        </label>
        <p class="help-text">{i18n.t("autoStartDesc")}</p>
      </div>

      <div class="form-group">
        <label for="rotationTime">{i18n.t("rotationTimeMinutesLabel")}</label>
        <input id="rotationTime" type="number" min="1" max="60" bind:value={settings.rotationTimeMinutes} class="input-number" />
        <p class="help-text">{i18n.t("rotationTimeDesc")}</p>
      </div>
    </section>

    <section class="card">
      <h2><UserX size={18} /> {i18n.t("excludedChannelsLabel")}</h2>
      <p class="help-text">{i18n.t("excludedChannelsDesc")}</p>

      <!-- Sub-Only Stream Controls -->
      <div class="sub-only-controls">
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={settings.skipSubOnlyStreams} />
            {i18n.t("skipSubOnlyLabel")}
          </label>
          <p class="help-text">{i18n.t("skipSubOnlyDesc")}</p>
        </div>

        {#if settings.skipSubOnlyStreams}
          <div class="form-group checkbox-group sub-option" transition:slide={{ duration: 180 }}>
            <label class="checkbox-label">
              <input type="checkbox" bind:checked={settings.allowSubOnlyFreePreview} />
              {i18n.t("allowSubOnlyFreePreviewLabel")}
            </label>
            <p class="help-text">{i18n.t("allowSubOnlyFreePreviewDesc")}</p>
          </div>
        {/if}
      </div>

      <hr class="section-divider" />

      <div class="add-exclusion-form">
        <div class="input-wrapper">
          <input type="text" bind:value={newExcludedInput} placeholder={i18n.t("addExcludedPlaceholder")} class="input-text" onkeydown={(e) => e.key === "Enter" && addExcludedChannel()} />
          {#if extractedUser}
            <div class="extracted-preview">
              <span class="user-id">@{extractedUser}</span>
              {#if isFollowingExtracted}
                <span class="badge badge-success"><CheckCircle2 size={12} /> {i18n.t("followingBadge")}</span>
              {/if}
            </div>
          {/if}
        </div>
        <button class="btn-add" onclick={addExcludedChannel} disabled={!extractedUser}>
          <Plus size={16} />
          <span>{i18n.t("btnAdd")}</span>
        </button>
      </div>

      <div class="exclusion-list">
        {#if !settings.excludedChannels || settings.excludedChannels.length === 0}
          <div class="empty-exclusion">{i18n.t("noExcludedChannels")}</div>
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
                  <span class="badge badge-success-sm">{i18n.t("followingBadge")}</span>
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
      <h2><Code size={18} /> {i18n.t("customInjectionsTitle")}</h2>
      <p class="help-text">{i18n.t("customInjectionsHelp")}</p>

      <!-- Custom CSS Editor -->
      <div class="editor-block">
        <div class="editor-header">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={settings.customCssEnabled} />
            {i18n.t("customCssLabel")}
          </label>
        </div>
        {#if settings.customCssEnabled}
          <div transition:slide={{ duration: 220 }}>
            <textarea bind:value={settings.customCss} placeholder={placeholderCssText} class="code-editor {cssSyntax.valid ? '' : 'has-error'}"></textarea>
            <div class="checker-status {cssSyntax.valid ? 'valid' : 'invalid'}">
              {#if cssSyntax.valid}
                <span class="status-badge success"><CheckCircle2 size={13} /> {i18n.t("noSyntaxErrors")}</span>
              {:else}
                <span class="status-badge error"><AlertTriangle size={13} /> {i18n.t("syntaxError")} {cssSyntax.error}</span>
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <!-- Custom JS Editor -->
      <div class="editor-block">
        <div class="editor-header">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={settings.customJsEnabled} />
            {i18n.t("customJsLabel")}
          </label>
        </div>
        {#if settings.customJsEnabled}
          <div transition:slide={{ duration: 220 }}>
            <textarea bind:value={settings.customJs} placeholder={placeholderJsText} class="code-editor {jsSyntax.valid ? '' : 'has-error'}"></textarea>
            <div class="checker-status {jsSyntax.valid ? 'valid' : 'invalid'}">
              {#if jsSyntax.valid}
                <span class="status-badge success"><CheckCircle2 size={13} /> {i18n.t("noSyntaxErrors")}</span>
              {:else}
                <span class="status-badge error"><AlertTriangle size={13} /> {i18n.t("syntaxError")} {jsSyntax.error}</span>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </section>

    <section class="card">
      <h2><Globe size={18} /> {i18n.t("languageSectionTitle")}</h2>
      <div class="form-group">
        <label for="language">{i18n.t("languageLabel")}:</label>
        <select id="language" bind:value={settings.language} class="select-input">
          <option value="ja">{i18n.t("langJapanese")}</option>
          <option value="en">{i18n.t("langEnglish")}</option>
        </select>
        <p class="help-text">{i18n.t("languageDesc")}</p>
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
    transition: all 0.15s ease;
  }

  .btn-save:hover {
    background: #1d4ed8;
  }

  .btn-save.saving {
    background: #475569;
  }

  .btn-save.saved {
    background: #16a34a;
  }

  :global(.spin-icon) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
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
    transition: border-color 0.2s ease;
  }

  .code-editor:focus {
    border-color: #9333ea;
  }

  .code-editor.has-error {
    border-color: #ef4444;
  }

  .checker-status {
    margin-top: 4px;
    font-size: 11px;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: monospace;
  }

  .status-badge.success {
    color: #4ade80;
    background: rgba(34, 197, 94, 0.1);
  }

  .status-badge.error {
    color: #f87171;
    background: rgba(239, 68, 68, 0.15);
    word-break: break-all;
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

  .sub-only-controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }

  .sub-option {
    margin-left: 24px;
    padding-left: 12px;
    border-left: 2px solid #6366f1;
  }

  .section-divider {
    border: none;
    border-top: 1px solid #334155;
    margin: 16px 0 20px 0;
  }
</style>
