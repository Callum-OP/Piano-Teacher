// Settings management
const SETTINGS_KEY = "pianoTeacherSettings";

const defaultSettings = {
    showLabels: true,
    autoSort: true,
    limitMidi: false,
    limitToPianoSize: false,
    enableGlow: true,
    uiScale: 1.0,
    highContrast: false,
    performanceMode: false
};

// Get and set settings
function loadSettings() {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    return { ...defaultSettings, ...saved };
}
function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings(settings) {
    // Labels
    const piano = document.getElementById("piano");
    const toggleLabels = document.getElementById("toggle-labels");
    if (toggleLabels) toggleLabels.checked = settings.showLabels;
    if (piano) piano.classList.toggle("hide-labels", !settings.showLabels);

    // Auto sort
    const autoSort = document.getElementById("auto-sort");
    if (autoSort) autoSort.checked = settings.autoSort;

    // Limit MIDI
    const limitMidi = document.getElementById("limit-midi");
    if (limitMidi) limitMidi.checked = settings.limitMidi;

    // Limit notes to piano size
    const limitPiano = document.getElementById("limit-piano");
    if (limitPiano) limitPiano.checked = settings.limitToPianoSize;

    // Handle UI Scale Application
    const uiScaleSlider = document.getElementById("ui-scale");
    if (uiScaleSlider) {
        uiScaleSlider.value = settings.uiScale || 1.0;
        document.documentElement.style.setProperty('--ui-scale-factor', uiScaleSlider.value);
        updateRangeFill(uiScaleSlider); 
    }

    // Toggle high contrast mode
    const toggleHC = document.getElementById("toggle-high-contrast");
    if (toggleHC) toggleHC.checked = settings.highContrast;
    document.body.classList.toggle("high-contrast", settings.highContrast);

    // Toggle performance mode
    const togglePerf = document.getElementById("toggle-performance");
    if (togglePerf) togglePerf.checked = settings.performanceMode;
    document.body.classList.toggle("performance-mode", settings.performanceMode);

    // Glow Overrides
    const toggleGlow = document.getElementById("toggle-glow");
    const glowContainer = toggleGlow ? toggleGlow.closest('.form-check') || toggleGlow.parentElement : null;

    if (settings.performanceMode || settings.highContrast) {
        // Force glow off visually
        document.body.classList.add("no-glow");
        if (toggleGlow) toggleGlow.checked = false;
        if (glowContainer) glowContainer.style.display = "none";
    } else {
        // Restore saved glow preference
        if (toggleGlow) toggleGlow.checked = settings.enableGlow;
        document.body.classList.toggle("no-glow", !settings.enableGlow);
        if (glowContainer) glowContainer.style.display = "block";
    }
}

// Change setting to the default that was set when the app first started
function resetSettings() {
    if (!confirm("Reset all settings to defaults?")) return;
    saveSettings(defaultSettings);
    applySettings(defaultSettings);
}

// Show settings panel or not
function toggleSettings() {
    const panel = document.getElementById("settings-panel");
    if (!panel) return;
    const isVisible = panel.style.display !== "none";
    panel.style.display = isVisible ? "none" : "block";
}

function initSettings() {
    const settings = loadSettings();
    applySettings(settings);

    const toggleMap = {
        "toggle-labels": "showLabels",
        "auto-sort": "autoSort",
        "limit-midi": "limitMidi",
        "limit-piano": "limitToPianoSize",
        "toggle-glow": "enableGlow",
        "toggle-high-contrast": "highContrast",
        "toggle-performance": "performanceMode"
    };

    Object.entries(toggleMap).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", () => {
            const currentSettings = loadSettings();
            currentSettings[key] = el.checked;

            if (key === "showLabels") {
                const piano = document.getElementById("piano");
                if (piano) piano.classList.toggle("hide-labels", !el.checked);
            }

            if (key === "enableGlow") {
                document.body.classList.toggle("no-glow", !el.checked);
            }

            if (key === "highContrast") {
                document.body.classList.toggle("high-contrast", el.checked);
            }

            if (key === "performanceMode") {
                document.body.classList.toggle("performance-mode", el.checked);
            }

            // After updating settings, re-apply them
            saveSettings(currentSettings);
            applySettings(currentSettings);
        });
    });

    // Add listener loop for range slider input
    const uiScaleSlider = document.getElementById("ui-scale");
    if (uiScaleSlider) {
        uiScaleSlider.addEventListener("input", () => {
            const currentSettings = loadSettings();
            currentSettings.uiScale = parseFloat(uiScaleSlider.value);
            saveSettings(currentSettings);
            
            document.documentElement.style.setProperty('--ui-scale-factor', uiScaleSlider.value);
        });
    }
}

document.addEventListener("DOMContentLoaded", initSettings);

if (typeof module !== "undefined") {
    module.exports = { loadSettings, saveSettings, applySettings };
}