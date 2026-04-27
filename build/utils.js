// --- Input normalisation & translation ---
// Ensure that input is what is expected
function normalise(input) {
    if (!input) return "";
    let normalised = input.replace(/ /g, "_").toUpperCase(); // Change spaces into underscores and change to uppercase
    const tokens = normalised.match(/([\^v]*[A-G](?:#|S)?\d*_*(?:\+[\^v]*[A-G](?:#|S)?\d*_*)*|_+)/g); // Ensure notes match expected values
    return tokens ? tokens.join(",") : ""; // Add comma before letter if not already there
}

// Translate notes into the expected format I need
function translateNote(input) {
    let baseOctave = 4;
    let note = input.toUpperCase();
    // Count ^ and v symbols
    let upCount = (note.match(/\^/g) || []).length;
    let downCount = (note.match(/V/g) || []).length;
    // Remove these symbols from note name
    note = note.replace(/\^/g, "");
    note = note.replace(/V/g, "");
    note = note.replace(/_/g, "");
    note = note.replace("#", "s");
    note = note.replace("S", "s");
    const finalOctave = baseOctave + upCount - downCount;
    return /\d/.test(note) ? note : note + finalOctave;
}

// Translate into notes by making all letters uppercase apart from s
// Removes case sensitivity issues when entering sheet music
function transformNote(str) {
    return str.split("").map(c => (c.toLowerCase() === "s" ? "s" : c.toUpperCase())).join("");
}

// --- Timeline bar feature ---
// Format time
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// --- MIDI uploading ---
// Translate note holds into underscores
function durationToUnderscores(ticks, tpq, uspq) {
    const msPerQuarter = uspq / 1000;
    const msPerUnderscore = 75;
    const scale = msPerQuarter / msPerUnderscore;
    const quarters = ticks / tpq;
    return "_".repeat(Math.max(1, Math.round(quarters * scale)));
}

// Translate midi notes to the expected note name (A1, Fs3, etc)
function midiToNoteName(midi) {
    const names = ["C","Cs","D","Ds","E","F","Fs","G","Gs","A","As","B"];
    const name = names[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return name + octave;
}


// Export code for tests
if (typeof module !== 'undefined') {
    module.exports = { normalise, translateNote, transformNote, formatTime, durationToUnderscores, midiToNoteName };
}