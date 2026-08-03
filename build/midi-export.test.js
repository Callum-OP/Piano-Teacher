const { encodeMidi, noteNameToMidi, writeVarLen, TICKS_PER_UNIT, MIDI_TEMPO_USPQ } = require('./midi-export.js');
const { parseMIDI } = require('./midi-upload.js');
const { musicToGrid } = require('./editor.js');
const { durationToUnderscores } = require('./utils.js');

// Pair note on/off events from a parsed track into { pitch, start, dur } (in ticks).
function collectNotes(track) {
    const active = {};
    const notes = [];
    track.events.forEach(ev => {
        if (ev.type === 'on') (active[ev.pitch] = active[ev.pitch] || []).push(ev.time);
        else if (ev.type === 'off' && active[ev.pitch] && active[ev.pitch].length) {
            const start = active[ev.pitch].shift();
            notes.push({ pitch: ev.pitch, start, dur: ev.time - start });
        }
    });
    return notes.sort((a, b) => a.start - b.start || a.pitch - b.pitch);
}

// Encode the two hand strings and parse the bytes straight back.
function roundTrip(left, right) {
    const bytes = encodeMidi(musicToGrid(left, right));
    return parseMIDI(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}

//------------------------
// noteNameToMidi

test('noteNameToMidi maps app note names to MIDI numbers (C4 = 60)', () => {
    expect(noteNameToMidi('C4')).toBe(60);
    expect(noteNameToMidi('Cs4')).toBe(61);
    expect(noteNameToMidi('C#4')).toBe(61);
    expect(noteNameToMidi('A4')).toBe(69);
    expect(noteNameToMidi('C2')).toBe(36);
});

test('noteNameToMidi returns null for junk', () => {
    expect(noteNameToMidi('H4')).toBeNull();
    expect(noteNameToMidi('')).toBeNull();
    expect(noteNameToMidi(null)).toBeNull();
});

//------------------------
// writeVarLen (MIDI variable-length quantities)

test('writeVarLen encodes values per the MIDI spec', () => {
    expect(writeVarLen(0)).toEqual([0x00]);
    expect(writeVarLen(127)).toEqual([0x7f]);
    expect(writeVarLen(128)).toEqual([0x81, 0x00]);
    expect(writeVarLen(480)).toEqual([0x83, 0x60]);
    expect(writeVarLen(0x200000)).toEqual([0x81, 0x80, 0x80, 0x00]);
});

//------------------------
// encodeMidi round-trip through parseMIDI

test('encodeMidi produces a file parseMIDI can read, with the right header', () => {
    const midi = roundTrip('E4__', 'C4__');
    expect(midi.division).toBe(480);
    expect(midi.tempo).toBe(MIDI_TEMPO_USPQ);
    expect(midi.tracks.length).toBe(2);
});

test('encodeMidi puts the right hand in track 0 and the left in track 1', () => {
    // midi-upload maps track0 -> right, track1 -> left, so preserve that here.
    const midi = roundTrip('C2', 'C4');
    expect(collectNotes(midi.tracks[0]).map(n => n.pitch)).toEqual([60]); // right = C4
    expect(collectNotes(midi.tracks[1]).map(n => n.pitch)).toEqual([36]); // left  = C2
});

test('a note lasts its length in units and the duration round-trips to underscores', () => {
    const midi = roundTrip('', 'C4__'); // right hand, length 2 units
    const notes = collectNotes(midi.tracks[0]);
    expect(notes).toEqual([{ pitch: 60, start: 0, dur: 2 * TICKS_PER_UNIT }]);
    // Re-importing would reconstruct the same 2 underscores of duration.
    expect(durationToUnderscores(notes[0].dur, midi.division, midi.tempo)).toBe('__');
});

test('sequential notes land at successive unit onsets', () => {
    const midi = roundTrip('', 'C4_D4_'); // C4 at unit 0, D4 at unit 1, each 1 unit long
    expect(collectNotes(midi.tracks[0])).toEqual([
        { pitch: 60, start: 0, dur: TICKS_PER_UNIT },
        { pitch: 62, start: TICKS_PER_UNIT, dur: TICKS_PER_UNIT }
    ]);
});

test('a leading rest offsets the onset', () => {
    const midi = roundTrip('', '__C4_'); // two units of rest, then C4
    expect(collectNotes(midi.tracks[0])).toEqual([
        { pitch: 60, start: 2 * TICKS_PER_UNIT, dur: TICKS_PER_UNIT }
    ]);
});

test('a chord emits every note at the same onset', () => {
    const midi = roundTrip('', 'C4+E4+G4__');
    expect(collectNotes(midi.tracks[0])).toEqual([
        { pitch: 60, start: 0, dur: 2 * TICKS_PER_UNIT },
        { pitch: 64, start: 0, dur: 2 * TICKS_PER_UNIT },
        { pitch: 67, start: 0, dur: 2 * TICKS_PER_UNIT }
    ]);
});

test('an empty hand yields an empty track (no note events)', () => {
    const midi = roundTrip('', 'C4_');
    expect(collectNotes(midi.tracks[1])).toEqual([]); // left empty
    expect(collectNotes(midi.tracks[0]).length).toBe(1);
});
