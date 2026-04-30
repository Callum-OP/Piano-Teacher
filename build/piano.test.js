const { normalise, translateNote, transformNote, formatTime, durationToUnderscores, midiToNoteName, isValidMusicInput } = require('./utils.js');
const { calculateSpan, isWhiteKey, balanceClusters } = require('./sort-notes.js');

//------------------------
// Utilities

// normalise()
test('normalise should convert spaces to underscores and uppercase', () => {
    expect(normalise("a,b,c")).toBe("A,B,C");
});

test('normalise should handle empty or null input gracefully', () => {
    expect(normalise("")).toBe("");
    expect(normalise(null)).toBe("");
});

// translateNote()
test('translateNote should correctly handle octave shifts', () => {
    expect(translateNote("^C")).toBe("C5");
    expect(translateNote("vC")).toBe("C3");
});

test('translateNote should handle multiple octave shifts', () => {
    expect(translateNote("^^C")).toBe("C6");
    expect(translateNote("vvC")).toBe("C2");
});

test('translateNote should handle sharps', () => {
    expect(translateNote("C#4")).toBe("Cs4");
    expect(translateNote("Fs3")).toBe("Fs3");
});

test('translateNote should return note with octave if digit already present', () => {
    expect(translateNote("A4")).toBe("A4");
    expect(translateNote("B2")).toBe("B2");
});

test('transformNote should keep s lowercase but uppercase everything else', () => {
    expect(transformNote("as2")).toBe("As2");
    expect(transformNote("C#")).toBe("C#");
    expect(transformNote("cs4")).toBe("Cs4");
    expect(transformNote("FS3")).toBe("Fs3");
});

// formatTime()
test('formatTime should format milliseconds into m:ss', () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(1000)).toBe("0:01");
    expect(formatTime(60000)).toBe("1:00");
    expect(formatTime(90000)).toBe("1:30");
    expect(formatTime(3600000)).toBe("60:00");
});

// midiToNoteName
test('midiToNoteName should convert MIDI number to note name', () => {
    expect(midiToNoteName(60)).toBe("C4");  // Middle C
    expect(midiToNoteName(61)).toBe("Cs4"); // C#4
    expect(midiToNoteName(69)).toBe("A4");
    expect(midiToNoteName(48)).toBe("C3");
    expect(midiToNoteName(0)).toBe("C-1");
});

// durationToUnderscores
test('durationToUnderscores should return correct number of underscores', () => {
    const tpq = 480;
    const uspq = 500000;
    expect(durationToUnderscores(480, tpq, uspq)).toBe("_______"); // 7
});

test('durationToUnderscores should return at least 1 underscore', () => {
    expect(durationToUnderscores(1, 480, 500000)).toBe("_"); // 1
});

// isValidMusicInput()
test('isValidMusicInput should reject empty inputs', () => {
    expect(isValidMusicInput("", "")).toBe(false);
});

test('isValidMusicInput should reject inputs with no valid notes', () => {
    expect(isValidMusicInput("___", "123")).toBe(false);
    expect(isValidMusicInput("", "___")).toBe(false);
});

test('isValidMusicInput should accept valid note inputs', () => {
    expect(isValidMusicInput("A4", "")).toBe(true);
    expect(isValidMusicInput("", "C4_E4")).toBe(true);
    expect(isValidMusicInput("A4", "C4")).toBe(true);
});

test('isValidMusicInput should accept if only one hand has notes', () => {
    expect(isValidMusicInput("C4_E4_G4", "")).toBe(true);
    expect(isValidMusicInput("", "A3_C4")).toBe(true);
});

//------------------------
// Main Script

// LOOKAHEAD
test('should identify notes that need to be spawned', () => {
    const globalTime = 1000;
    const LOOKAHEAD = 3000;
    const note = { scheduledStart: 3500, spawned: false };
    const shouldSpawn = note.scheduledStart <= (globalTime + LOOKAHEAD);
    expect(shouldSpawn).toBe(true);
});

test('should not spawn notes outside lookahead window', () => {
    const globalTime = 1000;
    const LOOKAHEAD = 3000;
    const note = { scheduledStart: 5000, spawned: false };
    const shouldSpawn = note.scheduledStart <= (globalTime + LOOKAHEAD);
    expect(shouldSpawn).toBe(false);
});

//------------------------
// Sort Notes

test('calculateSpan should correctly measure white key distance', () => {
    const cluster = [
        { note: 'C4', pitch: 48 },
        { note: 'C5', pitch: 60 }
    ];
    expect(calculateSpan(cluster)).toBe(7);
});

test('isWhiteKey should identify white vs black keys', () => {
    expect(isWhiteKey(0)).toBe(true);  // C
    expect(isWhiteKey(1)).toBe(false); // C#
    expect(isWhiteKey(2)).toBe(true);  // D
    expect(isWhiteKey(3)).toBe(false); // D#
    expect(isWhiteKey(4)).toBe(true);  // E
});

test('balanceClusters should move notes to right hand if left hand span exceeds limit', () => {
    const leftHand = [
        { note: 'C2', pitch: 24 },
        { note: 'C4', pitch: 48 }
    ];
    const rightHand = [];
    const { leftCluster, rightCluster } = balanceClusters(leftHand, rightHand);
    expect(leftCluster.length).toBe(1);
    expect(rightCluster[0].note).toBe('C4');
});