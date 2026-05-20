// Settings management
const SETTINGS_KEY = "pianoTeacherSettings";

const defaultSettings = {
    showLabels: true,
    autoSort: true,
    limitMidi: false,
    enableGlow: true,
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

    // Apply Glow effect globally to document body
    const toggleGlow = document.getElementById("toggle-glow");
    if (toggleGlow) toggleGlow.checked = settings.enableGlow;
    // Add the 'no-glow' class if enableGlow is false
    document.body.classList.toggle("no-glow", !settings.enableGlow);
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
        "toggle-glow": "enableGlow",
    };

    Object.entries(toggleMap).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener("change", () => {
            const settings = loadSettings();
            settings[key] = el.checked;
            saveSettings(settings);

            // Apply immediately
            if (key === "showLabels") {
                const piano = document.getElementById("piano");
                if (piano) piano.classList.toggle("hide-labels", !el.checked);
            }
            
            // Update glow state immediately on switch change
            if (key === "enableGlow") {
                document.body.classList.toggle("no-glow", !el.checked);
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", initSettings);

if (typeof module !== "undefined") {
    module.exports = { loadSettings, saveSettings, applySettings };
}