const defaultSettings = {
  fontSize: "1",
  fontFamily: "'Verdana', sans-serif",
  theme: "y2k"
};

function loadSettings() {
  const saved = localStorage.getItem("appSettings");
  return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
}

function applySettings() {
  const settings = loadSettings();
  const root = document.documentElement;
  
  root.style.setProperty("--font-scale", settings.fontSize);
  root.style.setProperty("--font-family", settings.fontFamily);

  const themeLink = document.getElementById("theme-link");
  if (themeLink) {
    themeLink.href = `css/${settings.theme}.css`;
  }
}

function updateSetting(key, value) {
  const settings = loadSettings();
  settings[key] = value;
  localStorage.setItem("appSettings", JSON.stringify(settings));
  applySettings();
}

function resetSettings() {
  localStorage.removeItem("appSettings");
  applySettings();
  syncInputs();
}

function syncInputs() {
  const settings = loadSettings();
  const fs = document.getElementById("setting-fontSize");
  const ff = document.getElementById("setting-fontFamily");
  const th = document.getElementById("setting-theme");
  
  if(fs) fs.value = settings.fontSize;
  if(ff) ff.value = settings.fontFamily;
  if(th) th.value = settings.theme;
}

// Apply immediately on load
applySettings();

// Sync inputs when modal is opened
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-bs-target="#settingsModal"]')) {
    // Wait a bit for modal to be inserted into DOM if it's dynamic, 
    // but since it's in navbar.html which is loaded via JS, we might need a small delay
    setTimeout(syncInputs, 100);
  }
});

// Expose globally
window.updateSetting = updateSetting;
window.resetSettings = resetSettings;