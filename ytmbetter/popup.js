// popup.js — YTM Enhancer

const QUALITIES = [
  { id: 'auto',   label: 'Auto'  },
  { id: 'hd2160', label: '4K'    },
  { id: 'hd1440', label: '1440p' },
  { id: 'hd1080', label: '1080p' },
  { id: 'hd720',  label: '720p'  },
  { id: 'large',  label: '480p'  },
  { id: 'medium', label: '360p'  },
];

const ACCENT_COLORS = [
  { value: '#ff4e4e', label: 'Red',    glow: 'rgba(255,78,78,0.35)'   },
  { value: '#4aa0ff', label: 'Blue',   glow: 'rgba(74,160,255,0.35)'  },
  { value: '#a78bfa', label: 'Purple', glow: 'rgba(167,139,250,0.35)' },
  { value: '#34d399', label: 'Green',  glow: 'rgba(52,211,153,0.35)'  },
  { value: '#fb923c', label: 'Orange', glow: 'rgba(251,146,60,0.35)'  },
  { value: '#f472b6', label: 'Pink',   glow: 'rgba(244,114,182,0.35)' },
];

// ── State ─────────────────────────────────────────────────────────────────────
let currentQuality  = 'auto';
let currentAccent   = '#ff4e4e';
let panelCollapsed  = false;

// ── Apply accent to popup UI ───────────────────────────────────────────────────
function applyAccent(color) {
  document.documentElement.style.setProperty('--accent', color);
  // Update glow variables
  const match = ACCENT_COLORS.find(c => c.value === color);
  if (match) {
    document.documentElement.style.setProperty('--accent-dim',  `color-mix(in srgb, ${color} 15%, transparent)`);
    document.documentElement.style.setProperty('--accent-glow', match.glow);
  }
  currentAccent = color;
}

// ── Build quality pills ────────────────────────────────────────────────────────
function buildQualities() {
  const grid = document.getElementById('quality-grid');
  if (!grid) return;
  grid.innerHTML = '';

  QUALITIES.forEach(q => {
    const pill = document.createElement('button');
    pill.className = 'q-pill' + (currentQuality === q.id ? ' selected' : '');
    pill.textContent = q.label;
    pill.addEventListener('click', () => {
      currentQuality = q.id;
      chrome.storage.local.set({ ytme_quality: q.id });
      sendMessage({ type: 'SET_QUALITY', value: q.id });
      grid.querySelectorAll('.q-pill').forEach(p => p.classList.remove('selected'));
      pill.classList.add('selected');
    });
    grid.appendChild(pill);
  });
}

// ── Build color swatches ───────────────────────────────────────────────────────
function buildColors() {
  const grid = document.getElementById('color-grid');
  if (!grid) return;
  grid.innerHTML = '';

  ACCENT_COLORS.forEach(c => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch' + (currentAccent === c.value ? ' selected' : '');
    swatch.style.background = c.value;
    swatch.style.boxShadow  = `0 3px 10px ${c.glow}`;
    swatch.title = c.label;

    swatch.addEventListener('click', () => {
      currentAccent = c.value;
      chrome.storage.local.set({ ytme_accent: c.value });
      sendMessage({ type: 'SET_ACCENT', value: c.value });
      applyAccent(c.value);
      grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });

    grid.appendChild(swatch);
  });
}

// ── Panel toggle ───────────────────────────────────────────────────────────────
const panelToggle = document.getElementById('panel-toggle');
if (panelToggle) {
  panelToggle.addEventListener('change', () => {
    panelCollapsed = panelToggle.checked;
    chrome.storage.local.set({ ytme_collapsed: panelCollapsed });
    sendMessage({ type: 'TOGGLE_PANEL' });
  });
}



// ── Status indicator ──────────────────────────────────────────────────────────
function setStatus(active) {
  const dot  = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (!dot || !text) return;

  if (active) {
    dot.style.background  = '#34d399';
    dot.style.boxShadow   = '0 0 8px rgba(52,211,153,0.6)';
    text.textContent = 'Active on this tab';
  } else {
    dot.style.background  = 'rgba(255,255,255,0.2)';
    dot.style.boxShadow   = 'none';
    dot.style.animation   = 'none';
    text.textContent = 'Not on YouTube Music';
  }
}

// ── Send message to content script ────────────────────────────────────────────
function sendMessage(msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, msg).catch(() => setStatus(false));
  });
}

// ── Load saved settings & initialise ─────────────────────────────────────────
chrome.storage.local.get(['ytme_quality', 'ytme_accent', 'ytme_collapsed'], data => {
  if (data.ytme_quality)  currentQuality  = data.ytme_quality;
  if (data.ytme_accent)   currentAccent   = data.ytme_accent;
  if (data.ytme_collapsed) panelCollapsed = data.ytme_collapsed;

  applyAccent(currentAccent);
  buildQualities();
  buildColors();

  if (panelToggle) panelToggle.checked = panelCollapsed;

  // Check if content script is alive
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs[0]) { setStatus(false); return; }
    chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATE' })
      .then(resp => {
        if (resp) {
          setStatus(true);
          // Sync live state
          if (resp.quality) {
            currentQuality = resp.quality;
            buildQualities();
          }
          if (resp.collapsed !== undefined) {
            panelCollapsed = resp.collapsed;
            if (panelToggle) panelToggle.checked = panelCollapsed;
          }
        } else {
          setStatus(false);
        }
      })
      .catch(() => setStatus(false));
  });
});
