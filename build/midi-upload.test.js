const { parseMIDI } = require('./midi-upload.js');

// Build an ArrayBuffer from a flat list of byte values
function toArrayBuffer(bytes) {
    return new Uint8Array(bytes).buffer;
}

// A minimal, valid type-1 MIDI file:
//   - division (ticks per quarter) = 480
//   - one track with: set-tempo 300000, note-on C4 vel 64, note-off C4 after 480 ticks, end-of-track
const VALID_MIDI = [
    // Header chunk
    0x4D, 0x54, 0x68, 0x64,   // "MThd"
    0x00, 0x00, 0x00, 0x06,   // header length = 6
    0x00, 0x01,               // format 1
    0x00, 0x01,               // 1 track
    0x01, 0xE0,               // division = 480
    // Track chunk
    0x4D, 0x54, 0x72, 0x6B,   // "MTrk"
    0x00, 0x00, 0x00, 0x14,   // track length = 20 bytes
    // --- events (20 bytes) ---
    0x00, 0xFF, 0x51, 0x03, 0x04, 0x93, 0xE0, // delta 0, set tempo = 0x0493E0 (300000)
    0x00, 0x90, 0x3C, 0x40,                   // delta 0, note on,  pitch 60, vel 64
    0x83, 0x60, 0x80, 0x3C, 0x00,             // delta 480, note off, pitch 60, vel 0
    0x00, 0xFF, 0x2F, 0x00                    // delta 0, end of track
];

test('parseMIDI reads the division and tempo from the header/meta events', () => {
    const midi = parseMIDI(toArrayBuffer(VALID_MIDI));
    expect(midi.division).toBe(480);
    expect(midi.tempo).toBe(300000);
});

test('parseMIDI returns one track containing the note on/off events', () => {
    const midi = parseMIDI(toArrayBuffer(VALID_MIDI));
    expect(midi.tracks.length).toBe(1);

    const events = midi.tracks[0].events;
    expect(events.length).toBe(2); // meta events are not pushed, only notes

    expect(events[0]).toMatchObject({ time: 0, pitch: 60, vel: 64, type: 'on' });
    expect(events[1]).toMatchObject({ time: 480, pitch: 60, vel: 0, type: 'off' });
});

test('parseMIDI treats a note-on with zero velocity as a note off', () => {
    const bytes = [
        0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
        0x00, 0x01, 0x00, 0x01, 0x01, 0xE0,
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0D,
        0x00, 0x90, 0x3C, 0x40,       // note on  pitch 60 vel 64
        0x81, 0x70, 0x90, 0x3C, 0x00, // delta 240, note on pitch 60 vel 0 -> counts as off
        0x00, 0xFF, 0x2F, 0x00        // end of track
    ];
    const midi = parseMIDI(toArrayBuffer(bytes));
    const events = midi.tracks[0].events;
    expect(events[0].type).toBe('on');
    expect(events[1].type).toBe('off');
});

test('parseMIDI defaults the tempo to 500000 when no tempo meta is present', () => {
    const bytes = [
        0x4D, 0x54, 0x68, 0x64, 0x00, 0x00, 0x00, 0x06,
        0x00, 0x01, 0x00, 0x01, 0x01, 0xE0,
        0x4D, 0x54, 0x72, 0x6B, 0x00, 0x00, 0x00, 0x0D,
        0x00, 0x90, 0x3C, 0x40,
        0x83, 0x60, 0x80, 0x3C, 0x00,
        0x00, 0xFF, 0x2F, 0x00
    ];
    const midi = parseMIDI(toArrayBuffer(bytes));
    expect(midi.tempo).toBe(500000);
});

test('parseMIDI throws on a file that is not a MIDI file', () => {
    expect(() => parseMIDI(toArrayBuffer([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])))
        .toThrow();
});
