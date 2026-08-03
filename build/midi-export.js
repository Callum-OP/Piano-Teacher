// Export the current music back out as a Standard MIDI File — the inverse of
// parseMIDI in midi-upload.js. The app's note-string format is turned into a grid
// (absolute onsets in 75ms "units" via musicToGrid), then into note on/off events.
//
// Timing: 1 unit = 75ms. We pin one tick to a fixed real-time slice so playback and
// an in-app re-upload both reproduce the original underscore counts exactly:
//   DIVISION 480 ticks/quarter, TICKS_PER_UNIT 40  -> 12 units per quarter
//   TEMPO 900000 us/quarter                        -> 900ms/quarter = 75ms/unit
// (durationToUnderscores(ticks, 480, 900000) == ticks / 40 == units.)

// In Node (tests) pull the helpers from their modules; in the browser they're globals.
if (typeof module !== "undefined" && typeof require === "function") {
    var { noteToPitch } = require("./utils.js");
    var { musicToGrid } = require("./editor.js");
}

const MIDI_DIVISION = 480;
const TICKS_PER_UNIT = 40;
const MIDI_TEMPO_USPQ = 900000;

// App note name (e.g. "Cs4", C4 = pitch 48) -> MIDI note number (C4 = 60). The app's
// pitch scheme is 12 below MIDI (see midiToNoteName). Returns null for junk names.
function noteNameToMidi(name) {
    const p = noteToPitch(name);
    return p == null ? null : p + 12;
}

// Variable-length quantity: 7 bits per byte, big-endian, high bit set on all but the last.
function writeVarLen(value) {
    const bytes = [value & 0x7f];
    value = Math.floor(value / 128);
    while (value > 0) {
        bytes.unshift((value & 0x7f) | 0x80);
        value = Math.floor(value / 128);
    }
    return bytes;
}

// One hand's notes -> a tick-sorted list of note on/off events. A note sounds for its
// own length (>= 1 unit). At equal ticks, note-offs come before note-ons.
function handToTrackEvents(notes) {
    const events = [];
    (notes || []).forEach(n => {
        const midi = noteNameToMidi(n.note);
        if (midi == null) return;
        const start = n.time * TICKS_PER_UNIT;
        const end = (n.time + Math.max(1, n.len || 1)) * TICKS_PER_UNIT;
        events.push({ tick: start, on: true, pitch: midi });
        events.push({ tick: end, on: false, pitch: midi });
    });
    events.sort((a, b) => (a.tick - b.tick) || ((a.on ? 1 : 0) - (b.on ? 1 : 0)));
    return events;
}

// Encode one MTrk body: optional tempo meta at tick 0, the delta-timed events, End of Track.
function encodeTrack(events, tempo) {
    const bytes = [];
    if (tempo != null) {
        bytes.push(0x00, 0xff, 0x51, 0x03, (tempo >> 16) & 0xff, (tempo >> 8) & 0xff, tempo & 0xff);
    }
    let last = 0;
    for (const ev of events) {
        writeVarLen(ev.tick - last).forEach(b => bytes.push(b));
        last = ev.tick;
        if (ev.on) bytes.push(0x90, ev.pitch, 64); // note on, channel 0, velocity 64
        else bytes.push(0x80, ev.pitch, 0);         // note off, channel 0
    }
    bytes.push(0x00, 0xff, 0x2f, 0x00); // End of Track
    return bytes;
}

// Wrap a chunk id + body into a MIDI chunk (id, 4-byte big-endian length, body).
function midiChunk(id, body) {
    const len = body.length;
    return [
        id.charCodeAt(0), id.charCodeAt(1), id.charCodeAt(2), id.charCodeAt(3),
        (len >>> 24) & 0xff, (len >>> 16) & 0xff, (len >>> 8) & 0xff, len & 0xff,
        ...body
    ];
}

// Grid ({ notes: [{ time, note, hand, len }] }) -> a format-1 MIDI file as bytes.
// Two tracks: track 0 = right hand (carries the tempo), track 1 = left hand — matching
// midi-upload's track0=right / track1=left assumption so a re-import keeps the hands.
function encodeMidi(grid) {
    const notes = (grid && grid.notes) || [];
    const right = notes.filter(n => n.hand === "right");
    const left = notes.filter(n => n.hand === "left");
    const header = [0, 1, 0, 2, (MIDI_DIVISION >> 8) & 0xff, MIDI_DIVISION & 0xff]; // format 1, 2 tracks
    const bytes = [
        ...midiChunk("MThd", header),
        ...midiChunk("MTrk", encodeTrack(handToTrackEvents(right), MIDI_TEMPO_USPQ)),
        ...midiChunk("MTrk", encodeTrack(handToTrackEvents(left)))
    ];
    return Uint8Array.from(bytes);
}

// Build a MIDI file from the current Left/Right note inputs and download it.
function exportCurrentMusicAsMidi() {
    const leftEl = document.getElementById("noteInputLeft");
    const rightEl = document.getElementById("noteInputRight");
    const left = leftEl ? leftEl.value.trim() : "";
    const right = rightEl ? rightEl.value.trim() : "";
    if (!left && !right) { alert("No music to export. Load a piece or enter some notes first."); return; }

    const bytes = encodeMidi(musicToGrid(left, right));
    const blob = new Blob([bytes], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "piano-teacher.mid";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

// Export pure functions for tests
if (typeof module !== "undefined") {
    module.exports = { noteNameToMidi, writeVarLen, encodeMidi, exportCurrentMusicAsMidi, MIDI_DIVISION, TICKS_PER_UNIT, MIDI_TEMPO_USPQ };
}
