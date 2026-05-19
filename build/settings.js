// Settings management
const SETTINGS_KEY = "pianoTeacherSettings";

const defaultSettings = {
    showLabels: true,
    autoSort: true,
    limitMidi: true,
};

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
    const limitMidi = document.getElementById("limitMidi");
    if (limitMidi) limitMidi.checked = settings.limitMidi;
}

function toggleSettings() {
    const panel = document.getElementById("settings-panel");
    if (!panel) return;
    const isVisible = panel.style.display !== "none";
    panel.style.display = isVisible ? "none" : "block";
}

function initSettings() {
    const settings = loadSettings();
    applySettings(settings);

    // Listen for changes on each toggle
    const toggleMap = {
        "toggle-labels": "showLabels",
        "auto-sort": "autoSort",
        "limitMidi": "limitMidi",
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
        });
    });
}

document.addEventListener("DOMContentLoaded", initSettings);

if (typeof module !== "undefined") {
    module.exports = { loadSettings, saveSettings, applySettings };
}