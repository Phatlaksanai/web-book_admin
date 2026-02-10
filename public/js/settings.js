const defaultSettings = {
  fontSize: '1',
  theme: 'modern',
  fontFamily: "'Inter', sans-serif",
  musicUrl: ''
};

// 1. Get settings from localStorage or use defaults
function getSettings() {
  try {
    const saved = localStorage.getItem('cyberLibrarySettings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch (e) {
    return defaultSettings;
  }
}

// 2. Apply all settings on page load
function applySettings() {
  const settings = getSettings();
  
  // Apply theme
  const themeLink = document.getElementById('theme-link');
  if (themeLink) {
    themeLink.href = `css/${settings.theme}.css`;
  }
  
  // Apply font size and family
  document.documentElement.style.setProperty('--font-size-multiplier', settings.fontSize);
  document.body.style.fontFamily = settings.fontFamily;

  // Update UI controls in the modal
  const fontSizeInput = document.getElementById('setting-fontSize');
  if (fontSizeInput) fontSizeInput.value = settings.fontSize;
  
  const themeSelect = document.getElementById('setting-theme');
  if (themeSelect) themeSelect.value = settings.theme;

  const fontSelect = document.getElementById('setting-fontFamily');
  if (fontSelect) fontSelect.value = settings.fontFamily;

  // Apply music
  const musicUrlInput = document.getElementById('setting-musicUrl');
  if (musicUrlInput) {
    musicUrlInput.value = settings.musicUrl;
    playMusic(settings.musicUrl);
  }
}

// 3. Update a single setting and save to localStorage
function updateSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem('cyberLibrarySettings', JSON.stringify(settings));
  
  // Apply the single setting immediately
  if (key === 'theme') {
    const themeLink = document.getElementById('theme-link');
    if (themeLink) themeLink.href = `css/${value}.css`;
  } else if (key === 'fontSize') {
    document.documentElement.style.setProperty('--font-size-multiplier', value);
  } else if (key === 'fontFamily') {
    document.body.style.fontFamily = value;
  }
  // Music is handled by its own onchange event calling playMusic directly
}

// 4. Reset to default settings
function resetSettings() {
  localStorage.removeItem('cyberLibrarySettings');
  window.location.reload();
}

// 5. Music Player Logic
function playMusic(url) {
  const container = document.getElementById('musicPlayerContainer');
  if (!container) return;

  container.innerHTML = ''; // Clear previous player

  if (!url || typeof url !== 'string' || !url.trim()) {
    return; // Stop playing if URL is empty
  }

  let embedUrl = '';
  let isSpotify = false;

  // YouTube URL detection
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) {
    const videoIdMatch = url.match(/(?:v=|\/|embed\/|youtu.be\/)([a-zA-Z0-9_-]{11})/);
    if (videoIdMatch && videoIdMatch[1]) {
      const videoId = videoIdMatch[1];
      embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&autohide=1&modestbranding=1&iv_load_policy=3&disablekb=1`;
    }
  }
  // Spotify URL detection
  else if (url.includes('open.spotify.com/track/')) {
    const trackIdMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    if (trackIdMatch && trackIdMatch[1]) {
      const trackId = trackIdMatch[1];
      embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
      isSpotify = true;
    }
  }

  if (embedUrl) {
    const iframe = document.createElement('iframe');
    iframe.style.border = '0';
    iframe.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    iframe.loading = 'lazy';
    iframe.src = embedUrl;
    
    if (isSpotify) {
      // For Spotify, we need to show the player as per their terms.
      container.style.position = 'fixed';
      container.style.bottom = '10px';
      container.style.right = '10px';
      container.style.left = 'auto';
      container.style.width = '300px';
      container.style.height = '80px'; // Compact view
      container.style.zIndex = '1050';
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
      iframe.width = "100%";
      iframe.height = "100%";
    } else {
      // For YouTube, show as mini player
      container.style.position = 'fixed';
      container.style.bottom = '20px';
      container.style.left = '20px';
      container.style.width = '240px';
      container.style.height = '135px';
      container.style.zIndex = '1050';
      container.style.opacity = '0.8';
      container.style.pointerEvents = 'auto';
      container.style.borderRadius = '12px';
      container.style.overflow = 'hidden';
      container.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2)';
      container.style.transition = 'all 0.3s ease';
      
      // Hover effects
      container.onmouseenter = () => {
        container.style.opacity = '1';
        container.style.transform = 'scale(1.05)';
      };
      container.onmouseleave = () => {
        container.style.opacity = '0.8';
        container.style.transform = 'scale(1)';
      };
    }

    container.appendChild(iframe);
  }
}

// Run applySettings when the DOM is ready
document.addEventListener('DOMContentLoaded', applySettings);