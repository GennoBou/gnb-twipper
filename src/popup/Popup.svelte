<script lang="ts">
  import { onMount } from 'svelte';
  import type { AppSettings, AutoState, StreamInfo } from '../types';
  import { Play, Square, SkipForward, Settings, Radio, ExternalLink } from '@lucide/svelte';

  let autoState = $state<AutoState>({
    isActive: false,
    timeRemainingSeconds: 0,
    totalDurationSeconds: 180,
    currentChannel: '',
  });

  let settings = $state<AppSettings>({
    rotationTimeMinutes: 3,
    autoStartOnLogin: true,
    language: 'ja',
    customCss: '',
    customJs: '',
    customCssEnabled: true,
    customJsEnabled: true,
  });

  let liveStreamers = $state<StreamInfo[]>([]);

  onMount(() => {
    chrome.runtime.sendMessage({ type: 'GET_AUTO_STATE' }, (res) => {
      if (res) {
        if (res.autoState) autoState = res.autoState;
        if (res.settings) settings = res.settings;
        if (res.liveStreamers) liveStreamers = res.liveStreamers;
      }
    });

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === 'AUTO_STATE_UPDATE') {
        if (msg.autoState) autoState = msg.autoState;
        if (msg.settings) settings = msg.settings;
        if (msg.liveStreamers) liveStreamers = msg.liveStreamers;
      }
    });
  });

  function toggleAuto() {
    if (autoState.isActive) {
      chrome.runtime.sendMessage({ type: 'STOP_AUTO_MODE' });
    } else {
      chrome.runtime.sendMessage({ type: 'START_AUTO_MODE' });
    }
  }

  function skipNext() {
    chrome.runtime.sendMessage({ type: 'SKIP_NEXT' });
  }

  function selectStreamer(channel: string) {
    chrome.runtime.sendMessage({ type: 'SELECT_STREAMER', channel });
  }

  function openOptions() {
    chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
  }

  function openTwitch() {
    chrome.tabs.create({ url: 'https://www.twitch.tv' });
  }
</script>

<div class="popup-container">
  <!-- Header -->
  <header class="header">
    <div class="title">
      <span class="logo-text">gnb-twview</span>
      <span class="version">v0.2.0</span>
    </div>
    <button class="btn-icon" onclick={openOptions} title="詳細設定">
      <Settings size={16} />
    </button>
  </header>

  <!-- Auto Control Section -->
  <section class="control-section">
    <button class="btn-main {autoState.isActive ? 'active' : ''}" onclick={toggleAuto}>
      {#if autoState.isActive}
        <Square size={16} />
        <span>オート巡回停止</span>
      {:else}
        <Play size={16} />
        <span>オート巡回開始</span>
      {/if}
    </button>

    <button class="btn-secondary" onclick={skipNext} title="次の配信へ">
      <SkipForward size={16} />
      <span>スキップ</span>
    </button>
  </section>

  <!-- Status Bar -->
  {#if autoState.isActive}
    <div class="status-bar">
      <span>残り時間:</span>
      <span class="time-highlight">
        {Math.floor(autoState.timeRemainingSeconds / 60)}分 {autoState.timeRemainingSeconds % 60}秒
      </span>
    </div>
  {/if}

  <!-- Streamers List -->
  <section class="streamers-section">
    <div class="section-title">
      <span class="icon-live"><Radio size={14} /></span>
      <span>ライブ中のフォロー配信者 ({liveStreamers.length}名)</span>
    </div>

    <div class="streamers-list">
      {#if liveStreamers.length === 0}
        <div class="empty-msg">
          ライブ中のチャンネルがありません。<br />
          <button class="btn-link" onclick={openTwitch}>
            Twitch を開く <ExternalLink size={12} />
          </button>
        </div>
      {:else}
        {#each liveStreamers as streamer}
          <button
            class="streamer-item {autoState.currentChannel.toLowerCase() === streamer.user_login.toLowerCase() ? 'active' : ''}"
            onclick={() => selectStreamer(streamer.user_login)}
          >
            {#if streamer.profile_image_url}
              <img src={streamer.profile_image_url} alt={streamer.user_name} class="avatar" />
            {/if}
            <div class="streamer-info">
              <div class="name">{streamer.user_name}</div>
              <div class="game">{streamer.game_name || streamer.title}</div>
            </div>
            {#if streamer.viewer_count}
              <div class="viewers">👥 {streamer.viewer_count.toLocaleString()}</div>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </section>
</div>

<style>
  .popup-container {
    width: 320px;
    background: #0f172a;
    color: #f8fafc;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    padding: 12px;
    box-sizing: border-box;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #1e293b;
  }

  .logo-text {
    font-weight: 800;
    font-size: 16px;
    background: linear-gradient(135deg, #a855f7, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .version {
    font-size: 10px;
    color: #64748b;
    margin-left: 6px;
  }

  .control-section {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .btn-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #2563eb;
    color: #ffffff;
    border: none;
    padding: 8px 12px;
    border-radius: 6px;
    font-weight: 700;
    cursor: pointer;
  }

  .btn-main.active {
    background: #dc2626;
  }

  .btn-secondary {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid #334155;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
  }

  .status-bar {
    background: #1e293b;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    border: 1px solid #334155;
  }

  .time-highlight {
    color: #38bdf8;
    font-weight: 700;
    font-family: monospace;
  }

  .streamers-section {
    margin-top: 8px;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 8px;
  }

  .icon-live {
    display: inline-flex;
    align-items: center;
    color: #ef4444;
  }

  .streamers-list {
    max-height: 240px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .streamer-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid transparent;
    padding: 6px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
  }

  .streamer-item:hover {
    background: #334155;
  }

  .streamer-item.active {
    border-color: #9333ea;
    background: #2e1065;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }

  .streamer-info {
    flex: 1;
    overflow: hidden;
  }

  .name {
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .game {
    font-size: 10px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .viewers {
    font-size: 10px;
    color: #cbd5e1;
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 4px;
  }

  .btn-icon:hover {
    color: #ffffff;
  }

  .empty-msg {
    text-align: center;
    padding: 16px;
    font-size: 12px;
    color: #94a3b8;
  }

  .btn-link {
    background: transparent;
    border: none;
    color: #38bdf8;
    cursor: pointer;
    margin-top: 6px;
    text-decoration: underline;
  }
</style>
