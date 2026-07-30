(function () {
  'use strict';

  // ─── STATE ───────────────────────────────────────────────────────────────────
  const STATE = {
    panelCollapsed: false,
    quality: 'auto',
    accentColor: '#ff4e4e',
  };

  const QUALITY_MAP = [
    { id: 'auto',   label: 'Auto',   badge: 'Auto' },
    { id: 'hd2160', label: '4K',     badge: '4K'   },
    { id: 'hd1440', label: '1440p',  badge: '1440' },
    { id: 'hd1080', label: '1080p',  badge: '1080' },
    { id: 'hd720',  label: '720p',   badge: '720'  },
    { id: 'large',  label: '480p',   badge: '480'  },
    { id: 'medium', label: '360p',   badge: '360'  },
  ];

  // ─── STORAGE ─────────────────────────────────────────────────────────────────
  function loadSettings(cb) {
    try {
      chrome.storage.local.get(['ytme_quality', 'ytme_accent'], data => {
        if (data.ytme_quality) STATE.quality      = data.ytme_quality;
        if (data.ytme_accent)  STATE.accentColor  = data.ytme_accent;
        cb && cb();
      });
    } catch (e) { cb && cb(); }
  }

  function saveSettings() {
    try {
      chrome.storage.local.set({
        ytme_quality: STATE.quality,
        ytme_accent:  STATE.accentColor,
      });
    } catch (e) {}
  }

  // ─── STYLES ──────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('ytme-styles')) return;
    const s = document.createElement('style');
    s.id = 'ytme-styles';
    s.textContent = `
      /* ── Player Expansion (Active when body has class) ── */
      body.ytme-panel-collapsed ytmusic-player-page {
        --ytmusic-player-page-side-panel-width: 0px !important;
      }
      body.ytme-panel-collapsed #player-content,
      body.ytme-panel-collapsed .main-panel,
      body.ytme-panel-collapsed #player,
      body.ytme-panel-collapsed #song-video,
      body.ytme-panel-collapsed ytmusic-player #song-video {
        width: 100% !important;
        max-width: 100% !important;
        flex: 1 1 100% !important;
      }
      body.ytme-panel-collapsed ytmusic-player {
        max-width: 100vw !important;
      }

      /* ── Spotify-Style Bottom Bar Layout ──────────────────────── */
      ytmusic-player-bar {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      
      /* Song Info (Thumbnail, Title) -> Move to Left */
      ytmusic-player-bar > .middle-controls {
        order: 1 !important;
        flex: 1 1 30% !important;
        justify-content: flex-start !important;
        margin: 0 !important;
 	margin-left: 12px !important; 
        max-width: none !important;
      }
      /* Give song title more breathing room */
      ytmusic-player-bar .title,
      ytmusic-player-bar .byline {
        max-width: 100% !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }

      /* Playback Controls (Play/Pause, Prev, Next) -> Move to Center */
      ytmusic-player-bar > .left-controls {
        order: 2 !important;
        flex: 1 1 40% !important;
        justify-content: center !important;
        margin: 0 !important;
      }
      
      /* Volume & Extra Buttons -> Keep on Right */
      ytmusic-player-bar > .right-controls,
      ytmusic-player-bar > .right-controls-buttons {
        order: 3 !important;
        flex: 1 1 30% !important;
        justify-content: flex-end !important;
        margin: 0 !important;
      }

      /* ── Shared button base ─────────────────── */
      .ytme-btn {
        background: transparent;
        border: none;
        color: rgba(255,255,255,0.65);
        cursor: pointer;
        padding: 0 10px;
        height: 34px;
        border-radius: 17px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11.5px;
        font-weight: 600;
        font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
        letter-spacing: 0.3px;
        transition: color .18s, background .18s;
        margin-left: 2px;
        white-space: nowrap;
      }
      .ytme-btn:hover {
        color: #fff;
        background: rgba(255,255,255,0.1);
      }
      .ytme-btn.active {
        color: var(--ytme-accent, #ff4e4e);
        background: rgba(255, 78, 78, 0.12);
      }
      .ytme-btn svg {
        width: 18px; height: 18px;
        fill: currentColor; flex-shrink: 0;
      }

      /* ── Quality Dropdown ────────────────────── */
      #ytme-quality-dropdown {
        position: fixed;
        background: rgba(22, 22, 22, 0.96);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 14px;
        padding: 6px;
        min-width: 150px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset;
        z-index: 99999;
        display: none;
        flex-direction: column;
        gap: 2px;
        transform-origin: bottom center;
        animation: ytme-pop .16s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      #ytme-quality-dropdown.open { display: flex; }

      @keyframes ytme-pop {
        from { opacity: 0; transform: scale(0.9) translateY(6px); }
        to   { opacity: 1; transform: scale(1)   translateY(0);   }
      }

      .ytme-q-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.7px;
        text-transform: uppercase;
        color: rgba(255,255,255,0.3);
        padding: 4px 10px 6px;
        font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
      }

      .ytme-q-option {
        padding: 8px 10px;
        border-radius: 9px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        font-family: 'YouTube Sans', Roboto, Arial, sans-serif;
        color: rgba(255,255,255,0.7);
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        transition: background .12s, color .12s;
      }
      .ytme-q-option:hover {
        background: rgba(255,255,255,0.07);
        color: #fff;
      }
      .ytme-q-option.selected {
        color: var(--ytme-accent, #ff4e4e);
        background: color-mix(in srgb, var(--ytme-accent, #ff4e4e) 10%, transparent);
      }
      .ytme-q-check { font-size: 11px; opacity: 0; }
      .ytme-q-option.selected .ytme-q-check { opacity: 1; }
    `;
    document.head.appendChild(s);
    applyAccentColor(STATE.accentColor);
  }

  function applyAccentColor(color) {
    STATE.accentColor = color;
    document.documentElement.style.setProperty('--ytme-accent', color);
  }

  // ─── PLAYER API ──────────────────────────────────────────────────────────────
  function getPlayerAPI() {
    return (
      document.querySelector('ytmusic-player .html5-video-player') ||
      document.querySelector('#c4-player') ||
      document.querySelector('.html5-video-player')
    );
  }

  // ─── PANEL TOGGLE ────────────────────────────────────────────────────────────
  // IMPORTANT: always scope lookups to ytmusic-player-page so we never
  // accidentally hide navigation elements on other pages.
  function getPlayerPage() {
    return document.querySelector('ytmusic-player-page');
  }

  function findPanels() {
    const page = getPlayerPage();
    if (!page) return [];

    // Safely grab only specific known right-side elements
    return [
      page.querySelector('ytmusic-tab-bar'),
      page.querySelector('ytmusic-tab-renderer'),
      page.querySelector('ytmusic-queue-panel-renderer'),
      page.querySelector('#right-panel'),
      page.querySelector('.right-panel'),
      page.querySelector('#side-panel'),
      page.querySelector('#right-content')
    ].filter(el => el !== null);
  }

  function togglePanel(forceState) {
    if (!getPlayerPage()) return; // only operate on player page
    const panels = findPanels();
    if (panels.length === 0) return;

    STATE.panelCollapsed = forceState !== undefined ? forceState : !STATE.panelCollapsed;

    if (STATE.panelCollapsed) {
      document.body.classList.add('ytme-panel-collapsed');
      // Hide all found right-side panels
      panels.forEach(panel => {
        panel._ytmeOrigDisplay = panel.style.display;
        panel.style.setProperty('display', 'none', 'important');
      });
    } else {
      document.body.classList.remove('ytme-panel-collapsed');
      // Restore panels
      panels.forEach(panel => {
        panel.style.display = panel._ytmeOrigDisplay ?? '';
      });
    }

    updatePanelBtn();
    [50, 250, 520].forEach(ms => setTimeout(() => window.dispatchEvent(new Event('resize')), ms));
  }

  function updatePanelBtn() {
    const btn = document.getElementById('ytme-panel-btn');
    if (!btn) return;
    const span = btn.querySelector('span');
    const path = btn.querySelector('svg path');
    btn.classList.toggle('active', STATE.panelCollapsed);
    btn.title = STATE.panelCollapsed ? 'Show Side Panel (Alt+P)' : 'Hide Side Panel (Alt+P)';
    if (span) span.textContent = STATE.panelCollapsed ? 'Show' : 'Hide';
    if (path) path.setAttribute('d', STATE.panelCollapsed
      ? 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z'
      : 'M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z'
    );
  }

  // ─── QUALITY SELECTOR ────────────────────────────────────────────────────────
  let qualityDropdownOpen = false;

  function setQuality(qualityId) {
    STATE.quality = qualityId;
    saveSettings();
    updateQualityBtn();
    closeQualityDropdown();

    const api = getPlayerAPI();
    if (!api) return;

    if (qualityId === 'auto') {
      api.setPlaybackQualityRange && api.setPlaybackQualityRange('tiny', 'highres');
    } else {
      api.setPlaybackQualityRange && api.setPlaybackQualityRange(qualityId, qualityId);
    }
  }

  function updateQualityBtn() {
    const btn = document.getElementById('ytme-quality-btn');
    if (!btn) return;
    const q    = QUALITY_MAP.find(x => x.id === STATE.quality) || QUALITY_MAP[0];
    const span = btn.querySelector('span');
    if (span) span.textContent = q.badge;
    btn.classList.toggle('active', STATE.quality !== 'auto');
  }

  function openQualityDropdown() {
    const dropdown = document.getElementById('ytme-quality-dropdown');
    const btn      = document.getElementById('ytme-quality-btn');
    if (!dropdown || !btn) return;

    const api = getPlayerAPI();
    let availableIds = null;
    if (api && api.getAvailableQualityLevels) availableIds = api.getAvailableQualityLevels();

    dropdown.innerHTML = `<div class="ytme-q-label">Quality</div>`;

    QUALITY_MAP.forEach(q => {
      if (availableIds && q.id !== 'auto' && !availableIds.includes(q.id)) return;
      const item = document.createElement('div');
      item.className = 'ytme-q-option' + (STATE.quality === q.id ? ' selected' : '');
      item.innerHTML = `<span>${q.label}</span><span class="ytme-q-check">✓</span>`;
      item.addEventListener('click', e => { e.stopPropagation(); setQuality(q.id); });
      dropdown.appendChild(item);
    });

    const rect = btn.getBoundingClientRect();
    dropdown.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
    dropdown.style.left   = Math.max(8, rect.left - 20) + 'px';
    dropdown.classList.add('open');
    qualityDropdownOpen = true;
  }

  function closeQualityDropdown() {
    const dd = document.getElementById('ytme-quality-dropdown');
    if (dd) dd.classList.remove('open');
    qualityDropdownOpen = false;
  }

  function toggleQualityDropdown() {
    qualityDropdownOpen ? closeQualityDropdown() : openQualityDropdown();
  }

  // ─── BUILD BUTTONS ───────────────────────────────────────────────────────────
  function buildPanelBtn() {
    const btn = document.createElement('button');
    btn.id        = 'ytme-panel-btn';
    btn.className = 'ytme-btn';
    btn.title     = 'Hide Side Panel (Alt+P)';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
      <span>Hide</span>`;
    btn.addEventListener('click', () => togglePanel());
    return btn;
  }

  function buildQualityBtn() {
    const btn = document.createElement('button');
    btn.id        = 'ytme-quality-btn';
    btn.className = 'ytme-btn';
    btn.title     = 'Video Quality (Alt+Q)';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24"><path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z"/></svg>
      <span>Auto</span>`;
    btn.addEventListener('click', e => { e.stopPropagation(); toggleQualityDropdown(); });
    return btn;
  }

  function buildDropdown() {
    if (document.getElementById('ytme-quality-dropdown')) return;
    const el = document.createElement('div');
    el.id = 'ytme-quality-dropdown';
    document.body.appendChild(el);
    document.addEventListener('click', e => {
      if (!e.target.closest('#ytme-quality-dropdown') && !e.target.closest('#ytme-quality-btn')) {
        closeQualityDropdown();
      }
    });
  }

  // ─── INJECT ──────────────────────────────────────────────────────────────────
  function injectButtons() {
    buildDropdown();
    const rightControls = document.querySelector('.right-controls-buttons');
    if (!rightControls) return;

    if (!document.getElementById('ytme-quality-btn')) rightControls.appendChild(buildQualityBtn());
    if (!document.getElementById('ytme-panel-btn'))   rightControls.appendChild(buildPanelBtn());

    updateQualityBtn();
    updatePanelBtn();
    
    // Move the YTM native Song/Video toggle into the bottom bar
    const avToggle = document.querySelector('ytmusic-av-toggle');
    if (avToggle && avToggle.parentElement !== rightControls) {
      avToggle.style.margin = '0 8px 0 0';
      avToggle.style.transform = 'scale(0.85)'; // Scale it down slightly so it fits beautifully
      avToggle.style.position = 'relative'; // Remove any absolute positioning YTM gives it
      avToggle.style.top = 'auto';
      avToggle.style.left = 'auto';
      rightControls.insertBefore(avToggle, rightControls.firstChild);
    }
  }

  // ─── KEYBOARD SHORTCUTS ──────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (!e.altKey) return;
    const k = e.key.toUpperCase();
    if (k === 'P') { e.preventDefault(); togglePanel(); }
    if (k === 'Q') { e.preventDefault(); toggleQualityDropdown(); }
  });

  // ─── POPUP MESSAGES ──────────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'SET_QUALITY')  setQuality(msg.value);
    if (msg.type === 'SET_ACCENT')  { applyAccentColor(msg.value); saveSettings(); }
    if (msg.type === 'TOGGLE_PANEL') togglePanel(msg.value);
    if (msg.type === 'GET_STATE')    sendResponse({ quality: STATE.quality, accent: STATE.accentColor, collapsed: STATE.panelCollapsed });
  });

  // ─── INIT ────────────────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    injectButtons();

    // Debounce so rapid DOM mutations (SPA navigation) don't cause flickering
    let observerTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(observerTimer);
      observerTimer = setTimeout(() => {
        // Re-inject buttons if they disappeared (e.g. after SPA navigation)
        if (!document.getElementById('ytme-panel-btn')) injectButtons();

        // Re-apply hidden state only if we're on the player page
        if (STATE.panelCollapsed && getPlayerPage()) {
          const panels = findPanels();
          panels.forEach(panel => {
            if (panel.style.display !== 'none') {
              panel.style.setProperty('display', 'none', 'important');
            }
          });
        }
      }, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  loadSettings(() => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  });

})();