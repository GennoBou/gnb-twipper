<script lang="ts">
  import type { AppSettings, AutoState, StreamInfo } from '../types';
  import { Play, Square, SkipForward, Settings, User, Radio, ExternalLink } from '@lucide/svelte';

  let {
    autoState = $bindable<AutoState>({
      isActive: false,
      timeRemainingSeconds: 0,
      totalDurationSeconds: 180,
      currentChannel: '',
    }),
    settings = $bindable<AppSettings>({
      rotationTimeMinutes: 3,
      autoStartOnLogin: true,
      language: 'ja',
      customCss: '',
      customJs: '',
      customCssEnabled: true,
      customJsEnabled: true,
    }),
    liveStreamers = $bindable<StreamInfo[]>([]),
    onToggleAuto = () => {},
    onSkip = () => {},
    onSelectChannel = (_channel: string) => {},
    onOpenOptions = () => {},
  } = $props();

  let isOpen = $state(false);

  let formattedTime = $derived(() => {
    const mins = Math.floor(autoState.timeRemainingSeconds / 60);
    const secs = autoState.timeRemainingSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  });

  let progressPercentage = $derived(() => {
    if (autoState.totalDurationSeconds <= 0) return 0;
    const elapsed = autoState.totalDurationSeconds - autoState.timeRemainingSeconds;
    return Math.min(100, Math.max(0, (elapsed / autoState.totalDurationSeconds) * 100));
  });

  function toggleMenu() {
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }

  // Handle outside click
  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (isOpen && !target.closest('.gnb-trigger-wrapper')) {
      closeMenu();
    }
  }

  function handleSelect(channel: string) {
    onSelectChannel(channel);
    closeMenu();
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="gnb-trigger-wrapper">
  <!-- Trigger Button inside Twitch Header -->
  <button
    class="gnb-trigger-btn {autoState.isActive ? 'active' : ''}"
    onclick={toggleMenu}
    title="gnb-twview 巡回コントロール"
  >
    <span class="btn-text">GNB</span>
    {#if autoState.isActive}
      <span class="live-dot"></span>
      <span class="timer-mini">{formattedTime()}</span>
    {/if}
  </button>

  <!-- Dropdown Popover Menu -->
  {#if isOpen}
    <div class="gnb-dropdown-menu">
      <!-- Header -->
      <div class="menu-header">
        <div class="menu-title">
          <span class="logo-text">gnb-twview</span>
          <span class="status-badge">{autoState.isActive ? 'AUTO 動作中' : '停止中'}</span>
        </div>
        <button class="btn-icon" onclick={onOpenOptions} title="詳細設定">
          <Settings size={15} />
        </button>
      </div>

      <!-- Controls Section -->
      <div class="menu-controls">
        <button class="btn-action {autoState.isActive ? 'btn-stop' : 'btn-start'}" onclick={onToggleAuto}>
          {#if autoState.isActive}
            <Square size={14} />
            <span>AUTO 停止</span>
          {:else}
            <Play size={14} />
            <span>AUTO 開始</span>
          {/if}
        </button>

        <button class="btn-action btn-skip" onclick={onSkip} title="次の配信へスキップ">
          <SkipForward size={14} />
          <span>スキップ</span>
        </button>
      </div>

      <!-- Timer Progress Bar -->
      {#if autoState.isActive}
        <div class="timer-section">
          <div class="timer-info">
            <span>次の巡回まで:</span>
            <span class="timer-val">{formattedTime()}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width: {progressPercentage()}%;"></div>
          </div>
        </div>
      {/if}

      <!-- Streamers List -->
      <div class="streamers-header">
        <span class="icon-live"><Radio size={13} /></span>
        <span>配信中のフォロー ({liveStreamers.length}名)</span>
      </div>

      <div class="streamers-list">
        {#if liveStreamers.length === 0}
          <div class="empty-text">ライブ中のチャンネルはありません</div>
        {:else}
          {#each liveStreamers as streamer}
            <button
              class="streamer-row {autoState.currentChannel.toLowerCase() === streamer.user_login.toLowerCase() ? 'active' : ''}"
              onclick={() => handleSelect(streamer.user_login)}
            >
              {#if streamer.profile_image_url}
                <img src={streamer.profile_image_url} alt={streamer.user_name} class="avatar" />
              {/if}
              <div class="streamer-details">
                <div class="streamer-name">{streamer.user_name}</div>
                <div class="streamer-game">{streamer.game_name || streamer.title || streamer.user_login}</div>
              </div>
              {#if streamer.viewer_count}
                <div class="viewer-count">👥 {streamer.viewer_count.toLocaleString()}</div>
              {/if}
            </button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .gnb-trigger-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    margin-left: 6px;
    z-index: 10000;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .gnb-trigger-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: #ffffff;
    border: none;
    padding: 4px 10px;
    border-radius: 14px;
    font-weight: 800;
    font-size: 11px;
    line-height: 1.4;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(124, 58, 237, 0.35);
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .gnb-trigger-btn:hover {
    background: linear-gradient(135deg, #6d28d9, #4338ca);
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(124, 58, 237, 0.5);
  }

  .gnb-trigger-btn.active {
    background: linear-gradient(135deg, #2563eb, #7c3aed);
  }

  .live-dot {
    width: 6px;
    height: 6px;
    background: #22c55e;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.8; }
  }

  .timer-mini {
    font-family: monospace;
    font-size: 11px;
    color: #e0e7ff;
  }

  /* Dropdown Menu */
  .gnb-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid #334155;
    border-radius: 10px;
    padding: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
    z-index: 999999;
  }

  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid #1e293b;
    margin-bottom: 10px;
  }

  .logo-text {
    font-weight: 800;
    font-size: 14px;
    background: linear-gradient(135deg, #a855f7, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .status-badge {
    font-size: 10px;
    background: #1e293b;
    color: #94a3b8;
    padding: 2px 6px;
    border-radius: 4px;
    margin-left: 6px;
  }

  .menu-controls {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
  }

  .btn-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: none;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn-start {
    background: #2563eb;
    color: #ffffff;
  }

  .btn-start:hover {
    background: #1d4ed8;
  }

  .btn-stop {
    background: #dc2626;
    color: #ffffff;
  }

  .btn-stop:hover {
    background: #b91c1c;
  }

  .btn-skip {
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid #334155;
  }

  .btn-skip:hover {
    background: #334155;
  }

  .timer-section {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 10px;
  }

  .timer-info {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 4px;
  }

  .timer-val {
    font-family: monospace;
    font-weight: 700;
    color: #38bdf8;
  }

  .progress-track {
    height: 4px;
    background: #0f172a;
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #38bdf8;
    transition: width 1s linear;
  }

  .streamers-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #94a3b8;
    margin-bottom: 6px;
  }

  .icon-live {
    display: inline-flex;
    align-items: center;
    color: #ef4444;
  }

  .streamers-list {
    max-height: 200px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .streamer-row {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1e293b;
    color: #f1f5f9;
    border: 1px solid transparent;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
  }

  .streamer-row:hover {
    background: #334155;
  }

  .streamer-row.active {
    border-color: #7c3aed;
    background: #2e1065;
  }

  .avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
  }

  .streamer-details {
    flex: 1;
    overflow: hidden;
  }

  .streamer-name {
    font-size: 11px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .streamer-game {
    font-size: 10px;
    color: #94a3b8;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .viewer-count {
    font-size: 10px;
    color: #cbd5e1;
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    padding: 2px;
  }

  .btn-icon:hover {
    color: #ffffff;
  }

  .empty-text {
    font-size: 11px;
    color: #64748b;
    text-align: center;
    padding: 12px 0;
  }
</style>
