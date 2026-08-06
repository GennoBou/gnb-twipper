<script lang="ts">
  import type { AppSettings, AutoState, StreamInfo } from '../types';
  import { Play, Square, SkipForward, Settings, User } from '@lucide/svelte';

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

  function handleChannelChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    if (target.value) {
      onSelectChannel(target.value);
    }
  }
</script>

<div class="gnb-twview-navbar">
  <!-- Left: Branding & Auto Control -->
  <div class="nav-section left">
    <div class="brand">
      <span class="logo">GNB</span>
    </div>

    <button
      class="btn-toggle-auto {autoState.isActive ? 'active' : ''}"
      onclick={onToggleAuto}
      title={autoState.isActive ? 'オートモード停止' : 'オートモード開始'}
    >
      {#if autoState.isActive}
        <Square size={14} class="icon" />
        <span>AUTO 停止</span>
      {:else}
        <Play size={14} class="icon" />
        <span>AUTO 開始</span>
      {/if}
    </button>

    <button class="btn-icon" onclick={onSkip} title="スキップ (次の配信者へ)">
      <SkipForward size={14} />
    </button>

    {#if autoState.isActive}
      <div class="timer-badge">
        <span class="timer-text">{formattedTime()}</span>
        <div class="progress-bar" style="width: {progressPercentage()}%;"></div>
      </div>
    {/if}
  </div>

  <!-- Center: Streamer Selector -->
  <div class="nav-section center">
    <div class="select-wrapper">
      <User size={14} class="select-icon" />
      <select class="streamer-select" value={autoState.currentChannel} onchange={handleChannelChange}>
        <option value="" disabled>-- 配信者を選択 ({liveStreamers.length}名配信中) --</option>
        {#each liveStreamers as streamer}
          <option value={streamer.user_login}>
            {streamer.user_name} ({streamer.user_login}) {streamer.game_name ? `- ${streamer.game_name}` : ''}
          </option>
        {/each}
      </select>
    </div>
  </div>

  <!-- Right: Settings & Status -->
  <div class="nav-section right">
    <button class="btn-icon" onclick={onOpenOptions} title="設定を開く">
      <Settings size={16} />
    </button>
  </div>
</div>

<style>
  .gnb-twview-navbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: #0f172a;
    color: #f8fafc;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    z-index: 999999;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    border-bottom: 1px solid #1e293b;
  }

  .nav-section {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .brand {
    font-weight: 800;
    letter-spacing: 0.5px;
    color: #9333ea;
    background: linear-gradient(135deg, #a855f7, #6366f1);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    padding-right: 4px;
  }

  .btn-toggle-auto {
    display: flex;
    align-items: center;
    gap: 4px;
    background: #2563eb;
    color: #ffffff;
    border: none;
    padding: 4px 10px;
    border-radius: 4px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .btn-toggle-auto:hover {
    background: #1d4ed8;
  }

  .btn-toggle-auto.active {
    background: #dc2626;
  }

  .btn-toggle-auto.active:hover {
    background: #b91c1c;
  }

  .btn-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: #1e293b;
    color: #cbd5e1;
    border: 1px solid #334155;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .btn-icon:hover {
    background: #334155;
    color: #ffffff;
  }

  .timer-badge {
    position: relative;
    background: #1e293b;
    padding: 3px 8px;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #334155;
  }

  .timer-text {
    position: relative;
    z-index: 2;
    font-family: monospace;
    font-weight: 700;
    color: #38bdf8;
  }

  .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    background: rgba(56, 189, 248, 0.25);
    z-index: 1;
    transition: width 1s linear;
  }

  .select-wrapper {
    display: flex;
    align-items: center;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 4px;
    padding: 0 6px;
  }

  .streamer-select {
    background: transparent;
    color: #f1f5f9;
    border: none;
    padding: 4px 6px;
    font-size: 12px;
    outline: none;
    cursor: pointer;
    max-width: 260px;
  }

  .streamer-select option {
    background: #0f172a;
    color: #f1f5f9;
  }
</style>
