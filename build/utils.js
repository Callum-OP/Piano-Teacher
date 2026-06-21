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

// Ensure the input is a valid music note in letter notation
function isValidMusicInput(left, right) {
    if (!left && !right) return false;
    const hasValidNote = /[A-Ga-g]/.test(left) || /[A-Ga-g]/.test(right);
    return hasValidNote;
}

// --- Music search / filtering ---
// True if a music piece matches a search query (by title or composer).
// An empty query matches everything.
function musicMatchesQuery(music, query) {
    const q = (query || "").trim().toLowerCase();
    if (!q) return true;
    if (!music) return false;
    const title = (music.title || "").toLowerCase();
    const composer = (music.composer || "").toLowerCase();
    return title.includes(q) || composer.includes(q);
}

// Filter a list of music pieces by a search query.
function filterMusic(list, query) {
    return (list || []).filter(m => musicMatchesQuery(m, query));
}

// --- Limit notes to piano size ---
// Convert an absolute note name (e.g. "C4", "Cs4", "C#4") to a pitch number
// using octave*12 + semitone offset (matches sort-notes' parseNote: C4 = 48).
function noteToPitch(name) {
    if (name == null) return null;
    const m = String(name).trim().match(/^([A-G])(s|#)?(\d+)$/i);
    if (!m) return null;
    const offsets = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    let semitone = offsets[m[1].toUpperCase()];
    if (m[2]) semitone += 1; // sharp
    return parseInt(m[3], 10) * 12 + semitone;
}

// Remove notes that fall outside [minPitch, maxPitch] from a note-input string,
// keeping timing/rests. Notes in a chord are filtered individually; if a whole
// chord is dropped but it had a duration, it becomes a rest of the same length.
function limitNotesToRange(input, minPitch, maxPitch) {
    if (!input) return "";
    const entries = normalise(input).split(",").map(e => e.trim()).filter(Boolean);
    const out = [];
    for (const entry of entries) {
        const tail = "_".repeat((entry.match(/_/g) || []).length); // duration
        if (/^_+$/.test(entry)) { out.push(entry); continue; }     // pure rest

        const kept = entry.split("+")
            .map(tok => tok.replace(/_/g, ""))
            .filter(Boolean)
            .filter(tok => {
                const p = noteToPitch(translateNote(tok));
                return p != null && p >= minPitch && p <= maxPitch;
            })
            .map(tok => transformNote(tok)); // canonical form (e.g. AS5 -> As5)

        if (kept.length > 0) {
            out.push(kept.join("+") + tail);
        } else if (tail) {
            out.push(tail); // all notes dropped, but preserve the beat as a rest
        }
        // all dropped with no duration -> remove the entry entirely
    }
    return out.join(",");
}

// --- Keyboard shortcuts ---
// True if the element is something the user is typing into or operating, so global
// shortcuts (e.g. spacebar to play/pause) should not hijack the key press.
function isInteractiveElement(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    return ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName);
}

// --- Tempo control ---
// Snap a tempo value to the target (1x) when it's within threshold, so the
// slider "sticks" to 1x near the middle and you must drag further to leave it.
function snapTempo(value, target = 1, threshold = 0.15) {
    const v = Number(value);
    if (Number.isNaN(v)) return target;
    return Math.abs(v - target) <= threshold ? target : v;
}

// True if the pointer moved far enough to count as a drag rather than a tap/click.
// Used so the tempo slider only snaps to 1x on a tap, never on a drag-release.
function isPointerDrag(startX, currentX, threshold = 4) {
    if (startX == null || currentX == null) return false;
    return Math.abs(currentX - startX) > threshold;
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
    module.exports = { normalise, translateNote, transformNote, formatTime, durationToUnderscores, midiToNoteName, isValidMusicInput, snapTempo, isInteractiveElement, isPointerDrag, musicMatchesQuery, filterMusic, noteToPitch, limitNotesToRange };
}