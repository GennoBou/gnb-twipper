<script lang="ts">
  import { onMount } from "svelte";
  import type { AppSettings, AutoState, StreamInfo } from "../types";
  import { Play, Square, SkipForward, Settings, Radio, ChevronDown, ChevronRight, Lock } from "@lucide/svelte";
  import { i18n } from "../i18n.svelte";

  function formatWatchTime(seconds?: number): string {
    if (!seconds || seconds <= 0) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  let props = $props<{
    autoState?: AutoState;
    settings?: AppSettings;
    liveStreamers?: StreamInfo[];
    onToggleAuto?: () => void;
    onSkip?: () => void;
    onSelectChannel?: (channel: string) => void;
    onOpenOptions?: () => void;
  }>();

  let autoState = $state<AutoState>({
    isActive: false,
    timeRemainingSeconds: 0,
    totalDurationSeconds: 180,
    currentChannel: "",
  });

  let settings = $state<AppSettings>({
    rotationTimeMinutes: 3,
    autoStartOnLogin: true,
    language: "ja",
    customCss: "",
    customJs: "",
    customCssEnabled: false,
    customJsEnabled: false,
  });

  let liveStreamers = $state<StreamInfo[]>([]);
  let isOpen = $state(false);
  let isStreamersOpen = $state(false); // Default hidden (collapsed accordion)

  function toggleStreamersAccordion(e: MouseEvent) {
    e.stopPropagation();
    isStreamersOpen = !isStreamersOpen;
  }

  $effect(() => {
    if (props.autoState) autoState = props.autoState;
  });
  $effect(() => {
    if (props.settings) {
      if (props.settings.language && i18n.lang !== props.settings.language) {
        i18n.lang = props.settings.language;
      }
      settings = props.settings;
    }
  });
  $effect(() => {
    if (props.liveStreamers) liveStreamers = props.liveStreamers;
  });

  onMount(() => {
    const messageListener = (msg: any) => {
      try {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id && msg.type === "AUTO_STATE_UPDATE") {
          if (msg.autoState) autoState = msg.autoState;
          if (msg.settings) {
            if (msg.settings.language && i18n.lang !== msg.settings.language) {
              i18n.lang = msg.settings.language;
            }
            settings = msg.settings;
          }
          if (msg.liveStreamers) liveStreamers = msg.liveStreamers;
        }
      } catch (e) {
        // Context invalidated
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(messageListener);
    }
    return () => {
      try {
        if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
          chrome.runtime.onMessage.removeListener(messageListener);
        }
      } catch (e) {}
    };
  });

  let formattedTime = $derived(() => {
    const mins = Math.floor(autoState.timeRemainingSeconds / 60);
    const secs = autoState.timeRemainingSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  });

  let progressPercentage = $derived(() => {
    if (autoState.totalDurationSeconds <= 0) return 0;
    const elapsed = autoState.totalDurationSeconds - autoState.timeRemainingSeconds;
    return Math.min(100, Math.max(0, (elapsed / autoState.totalDurationSeconds) * 100));
  });

  function toggleMenu(e?: MouseEvent) {
    if (e) e.stopPropagation();
    isOpen = !isOpen;
  }

  function closeMenu() {
    isOpen = false;
  }

  // Handle outside click
  function handleWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (isOpen && !target.closest(".gnb-trigger-wrapper")) {
      closeMenu();
    }
  }

  function handleSelect(channel: string) {
    props.onSelectChannel?.(channel);
    closeMenu();
  }
</script>

<svelte:window onclick={handleWindowClick} />

<div class="gnb-trigger-wrapper">
  <!-- Trigger Button inside Twitch Header -->
  <button class="gnb-trigger-btn {autoState.isActive ? 'active' : ''}" onclick={(e) => toggleMenu(e)} title="gnb-twipper 巡回コントロール">
    <span class="btn-text">GNB ▾</span>
  </button>

  <!-- Quick Skip Button & Timer Badge (AUTOモード時のみ表示) -->
  {#if autoState.isActive}
    {#if !autoState.isStandby}
      <button class="gnb-quick-skip-btn" onclick={() => props.onSkip?.()} title={i18n.t("titleSkip")}>
        <span>Skip</span>
        <SkipForward size={14} />
      </button>

      <div class="gnb-timer-text" title={i18n.t("timeRemaining")}>
        <span class="live-dot"></span>
        <span class="timer-mini">{formattedTime()}</span>
      </div>
    {:else}
      <div class="gnb-standby-badge" title={liveStreamers.length === 1 ? i18n.t("standbySingle") : i18n.t("standbyNone")}>
        <span class="standby-dot"></span>
        <span class="standby-text">{liveStreamers.length === 1 ? i18n.t("standbySingle") : i18n.t("standbyNone")}</span>
      </div>
    {/if}
  {/if}

  <!-- Dropdown Popover Menu -->
  {#if isOpen}
    <div class="gnb-dropdown-menu">
      <!-- Header -->
      <div class="menu-header">
        <div class="menu-title">
          <svg class="gnb-logo-icon-menu" width="18" height="18" viewBox="-27.5 -33 512 512">
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
          <span class="logo-text">gnb-twipper</span>
        </div>
        <button
          class="btn-icon"
          onclick={(e) => {
            e.stopPropagation();
            props.onOpenOptions?.();
            closeMenu();
          }}
          title={i18n.t("detailSettings")}
        >
          <Settings size={15} />
        </button>
      </div>

      <!-- Controls Section -->
      <div class="menu-controls">
        <button class="btn-action {autoState.isActive ? 'btn-stop' : 'btn-start'}" onclick={() => props.onToggleAuto?.()}>
          {#if autoState.isActive}
            <Square size={14} />
            <span>{i18n.t("autoStop")}</span>
          {:else}
            <Play size={14} />
            <span>{i18n.t("autoStart")}</span>
          {/if}
        </button>

        <button class="btn-action btn-skip" onclick={() => props.onSkip?.()} title={i18n.t("titleSkip")}>
          <SkipForward size={14} />
          <span>{i18n.t("popupSkip")}</span>
        </button>
      </div>

      <!-- Accordion Header for Streamers List -->
      <button class="streamers-header-accordion" onclick={toggleStreamersAccordion} title="ユーザーリストの開閉">
        <div class="accordion-title-group">
          <span class="icon-live"><Radio size={13} /></span>
          <span>{i18n.t("targetCount", { count: liveStreamers.length })}</span>
        </div>
        <span class="chevron-icon">
          {#if isStreamersOpen}
            <ChevronDown size={14} />
          {:else}
            <ChevronRight size={14} />
          {/if}
        </span>
      </button>

      {#if isStreamersOpen}
        <div class="streamers-list">
          {#if liveStreamers.length === 0}
            <div class="empty-text">{i18n.t("noLiveChannels")}</div>
          {:else}
            {#each liveStreamers as streamer}
              <button class="streamer-row {autoState.currentChannel.toLowerCase() === streamer.user_login.toLowerCase() ? 'active' : ''}" onclick={() => handleSelect(streamer.user_login)}>
                {#if streamer.profile_image_url}
                  <img src={streamer.profile_image_url} alt={streamer.user_name} class="avatar" />
                {/if}
                <div class="streamer-details">
                  <div class="streamer-name-row">
                    <span class="streamer-name">{streamer.user_name}</span>
                    {#if streamer.is_sub_only}
                      <span class="sub-only-badge" title="サブスクライバー限定配信"><Lock size={10} /> 限定</span>
                    {/if}
                  </div>
                  <div class="streamer-game">{streamer.game_name || streamer.title || streamer.user_login}</div>
                </div>
                <div class="watch-time-badge" title={i18n.t("watchTimeTooltip")}>
                  ⏱️ {formatWatchTime(streamer.watch_time_seconds)}
                </div>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
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
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      Roboto,
      sans-serif;
  }

  .gnb-trigger-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 2.6rem;
    padding: 0 10px;
    border-radius: 6px;
    box-sizing: border-box;
    background: var(--gnb-gradient-btn, linear-gradient(135deg, #7c3aed, #4f46e5));
    color: #ffffff;
    border: none;
    font-weight: 800;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(124, 58, 237, 0.35);
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .gnb-trigger-btn:hover {
    background: var(--gnb-gradient-btn-hover, linear-gradient(135deg, #6d28d9, #4338ca));
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(124, 58, 237, 0.5);
  }

  .gnb-trigger-btn.active {
    background: var(--gnb-gradient-active, linear-gradient(135deg, #2563eb, #7c3aed));
  }

  .live-dot {
    width: 6px;
    height: 6px;
    background: var(--gnb-color-success, #22c55e);
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.95);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
    100% {
      transform: scale(0.95);
      opacity: 0.8;
    }
  }

  .timer-mini {
    font-family: monospace;
    font-size: 1.4rem;
    color: #e0e7ff;
  }

  /* Dropdown Menu */
  .gnb-dropdown-menu {
    position: absolute;
    top: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    background: var(--gnb-bg-main, #0f172a);
    color: var(--gnb-text-main, #f8fafc);
    border: 1px solid var(--gnb-border-subtle, #334155);
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
    border-bottom: 1px solid var(--gnb-border-divider, #1e293b);
    margin-bottom: 10px;
  }

  .logo-text {
    font-weight: 800;
    font-size: 14px;
    background: var(--gnb-gradient-logo, linear-gradient(135deg, #a855f7, #6366f1));
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
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
    background: var(--gnb-bg-card, #1e293b);
    color: var(--gnb-text-main, #f1f5f9);
    border: 1px solid var(--gnb-border-subtle, #334155);
  }

  .btn-skip:hover {
    background: var(--gnb-bg-hover, #334155);
  }

  .streamers-header-accordion {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    color: var(--gnb-text-sub, #cbd5e1);
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid rgba(51, 65, 85, 0.6);
    padding: 6px 8px;
    border-radius: 6px;
    cursor: pointer;
    margin-bottom: 6px;
    transition:
      background 0.15s ease,
      border-color 0.15s ease;
  }

  .streamers-header-accordion:hover {
    background: rgba(51, 65, 85, 0.8);
    border-color: var(--gnb-border-active, #7c3aed);
  }

  .accordion-title-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .chevron-icon {
    display: inline-flex;
    align-items: center;
    color: var(--gnb-text-muted, #94a3b8);
  }

  .icon-live {
    display: inline-flex;
    align-items: center;
    color: var(--gnb-color-live, #ef4444);
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
    background: var(--gnb-bg-card, #1e293b);
    color: var(--gnb-text-main, #f1f5f9);
    border: 1px solid transparent;
    padding: 5px 8px;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s ease;
  }

  .streamer-row:hover {
    background: var(--gnb-bg-hover, #334155);
  }

  .streamer-row.active {
    border-color: var(--gnb-border-active, #7c3aed);
    background: var(--gnb-bg-active, #2e1065);
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
    color: var(--gnb-text-muted, #94a3b8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .watch-time-badge {
    font-size: 11px;
    color: var(--gnb-color-timer, #38bdf8);
    font-family: monospace;
    font-weight: 600;
    white-space: nowrap;
  }

  .btn-icon {
    background: transparent;
    border: none;
    color: var(--gnb-text-muted, #94a3b8);
    cursor: pointer;
    padding: 2px;
  }

  .btn-icon:hover {
    color: var(--gnb-text-main, #ffffff);
  }

  .empty-text {
    font-size: 11px;
    color: var(--gnb-text-dim, #64748b);
    text-align: center;
    padding: 12px 0;
  }

  .gnb-trigger-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .gnb-quick-skip-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 2.6rem;
    padding: 0 10px;
    border-radius: 6px;
    box-sizing: border-box;
    background: var(--gnb-gradient-btn, linear-gradient(135deg, #7c3aed, #4f46e5));
    color: #ffffff;
    border: none;
    font-weight: 700;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(124, 58, 237, 0.35);
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .gnb-quick-skip-btn:hover {
    background: var(--gnb-gradient-btn-hover, linear-gradient(135deg, #6d28d9, #4338ca));
    transform: translateY(-1px);
    box-shadow: 0 4px 10px rgba(124, 58, 237, 0.5);
  }

  .gnb-quick-skip-btn:active {
    transform: translateY(0);
  }

  .gnb-timer-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 2.6rem;
    padding: 0 6px;
    background: transparent;
    border: none;
    box-shadow: none;
    color: var(--gnb-color-timer, #38bdf8);
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
    line-height: 1;
    white-space: nowrap;
    user-select: none;
  }

  .streamer-name-row {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .sub-only-badge {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: rgba(168, 85, 247, 0.2);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.4);
    border-radius: 4px;
    padding: 1px 4px;
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
  }

  .gnb-standby-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 2.6rem;
    padding: 0 8px;
    background: rgba(234, 179, 8, 0.15);
    border: 1px solid rgba(234, 179, 8, 0.35);
    border-radius: 6px;
    box-sizing: border-box;
    user-select: none;
    white-space: nowrap;
  }

  .standby-dot {
    width: 6px;
    height: 6px;
    background: #eab308;
    border-radius: 50%;
    animation: pulse-yellow 2s infinite;
  }

  @keyframes pulse-yellow {
    0% {
      transform: scale(0.95);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.3);
      opacity: 1;
    }
    100% {
      transform: scale(0.95);
      opacity: 0.8;
    }
  }

  .standby-text {
    font-size: 11px;
    font-weight: 700;
    color: #fde047;
    line-height: 1;
  }
</style>
