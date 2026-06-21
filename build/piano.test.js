const { normalise, translateNote, transformNote, formatTime, durationToUnderscores, midiToNoteName, isValidMusicInput, snapTempo, isInteractiveElement, isPointerDrag, musicMatchesQuery, filterMusic, noteToPitch, limitNotesToRange } = require('./utils.js');
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
test('transformNote should produce consistent output for the same note regardless of input case', () => {
    expect(transformNote("cs4")).toBe(transformNote("Cs4"));
    expect(transformNote("CS4")).toBe(transformNote("cs4"));
    expect(transformNote("as3")).toBe(transformNote("As3"));
});

test('translateNote output should be compatible with transformNote', () => {
    // Notes that go through translateNote then transformNote should be stable
    const translated = translateNote("^C");
    const transformed = transformNote(translated);
    expect(transformed).toBe(translated); // Should already be in correct format
});

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

// snapTempo()
test('snapTempo snaps values near 1 to exactly 1', () => {
    expect(snapTempo(1)).toBe(1);
    expect(snapTempo(0.9)).toBe(1);
    expect(snapTempo(1.1)).toBe(1);
    expect(snapTempo("1.05")).toBe(1); // string input from the slider
});

test('snapTempo leaves values outside the threshold unchanged', () => {
    expect(snapTempo(0.8)).toBe(0.8);
    expect(snapTempo(1.2)).toBe(1.2);
    expect(snapTempo(0)).toBe(0);
    expect(snapTempo(2)).toBe(2);
});

test('snapTempo respects a custom target and threshold', () => {
    expect(snapTempo(1.45, 1.5, 0.1)).toBe(1.5);
    expect(snapTempo(1.3, 1.5, 0.1)).toBe(1.3);
});

test('snapTempo falls back to the target for non-numeric input', () => {
    expect(snapTempo("abc")).toBe(1);
    expect(snapTempo(NaN)).toBe(1);
});

// isInteractiveElement()
test('isInteractiveElement detects form controls and links', () => {
    expect(isInteractiveElement(document.createElement('input'))).toBe(true);
    expect(isInteractiveElement(document.createElement('textarea'))).toBe(true);
    expect(isInteractiveElement(document.createElement('select'))).toBe(true);
    expect(isInteractiveElement(document.createElement('button'))).toBe(true);
    expect(isInteractiveElement(document.createElement('a'))).toBe(true);
});

test('isInteractiveElement returns false for non-interactive elements and null', () => {
    expect(isInteractiveElement(document.createElement('div'))).toBe(false);
    expect(isInteractiveElement(document.createElement('span'))).toBe(false);
    expect(isInteractiveElement(null)).toBe(false);
});

test('isInteractiveElement detects contentEditable elements', () => {
    const div = document.createElement('div');
    div.isContentEditable = true;
    expect(isInteractiveElement(div)).toBe(true);
});

// isPointerDrag()
test('isPointerDrag is false for a tap (little/no movement)', () => {
    expect(isPointerDrag(100, 100)).toBe(false);
    expect(isPointerDrag(100, 103)).toBe(false); // within the 4px threshold
});

test('isPointerDrag is true once movement passes the threshold', () => {
    expect(isPointerDrag(100, 105)).toBe(true);
    expect(isPointerDrag(100, 80)).toBe(true);
});

test('isPointerDrag respects a custom threshold', () => {
    expect(isPointerDrag(100, 108, 10)).toBe(false);
    expect(isPointerDrag(100, 112, 10)).toBe(true);
});

test('isPointerDrag is false when a start position was never recorded', () => {
    expect(isPointerDrag(null, 120)).toBe(false);
    expect(isPointerDrag(100, null)).toBe(false);
});

// musicMatchesQuery() / filterMusic()
const SAMPLE_LIBRARY = [
    { title: 'Moonlight Sonata', composer: 'Beethoven', left: 'C3', right: 'C4' },
    { title: 'Fur Elise', composer: 'Beethoven', left: 'A3', right: 'A4' },
    { title: 'Clair de Lune', composer: 'Debussy', left: 'D3', right: 'D4' },
    { title: 'Gymnopedie', composer: 'Satie' }
];

test('musicMatchesQuery matches on title, case-insensitively', () => {
    expect(musicMatchesQuery(SAMPLE_LIBRARY[0], 'moonlight')).toBe(true);
    expect(musicMatchesQuery(SAMPLE_LIBRARY[0], 'SONATA')).toBe(true);
    expect(musicMatchesQuery(SAMPLE_LIBRARY[0], 'elise')).toBe(false);
});

test('musicMatchesQuery matches on composer', () => {
    expect(musicMatchesQuery(SAMPLE_LIBRARY[1], 'beethoven')).toBe(true);
    expect(musicMatchesQuery(SAMPLE_LIBRARY[1], 'debussy')).toBe(false);
});

test('musicMatchesQuery treats an empty or whitespace query as match-all', () => {
    expect(musicMatchesQuery(SAMPLE_LIBRARY[0], '')).toBe(true);
    expect(musicMatchesQuery(SAMPLE_LIBRARY[0], '   ')).toBe(true);
    expect(musicMatchesQuery(SAMPLE_LIBRARY[0], undefined)).toBe(true);
});

test('musicMatchesQuery handles missing fields without throwing', () => {
    expect(musicMatchesQuery(SAMPLE_LIBRARY[3], 'satie')).toBe(true);   // no left/right
    expect(musicMatchesQuery(SAMPLE_LIBRARY[3], 'beethoven')).toBe(false);
    expect(musicMatchesQuery(null, 'x')).toBe(false);
    expect(musicMatchesQuery({}, 'x')).toBe(false);
});

test('filterMusic returns only matching pieces', () => {
    const beethoven = filterMusic(SAMPLE_LIBRARY, 'beethoven');
    expect(beethoven.map(m => m.title)).toEqual(['Moonlight Sonata', 'Fur Elise']);
});

test('filterMusic returns everything for an empty query and copes with no list', () => {
    expect(filterMusic(SAMPLE_LIBRARY, '').length).toBe(4);
    expect(filterMusic(undefined, 'x')).toEqual([]);
});

// noteToPitch()
test('noteToPitch converts note names to pitches (C4 = 48)', () => {
    expect(noteToPitch('C4')).toBe(48);
    expect(noteToPitch('C2')).toBe(24);
    expect(noteToPitch('B5')).toBe(71);
    expect(noteToPitch('Cs4')).toBe(49);
    expect(noteToPitch('C#4')).toBe(49); // sharp either spelling
});

test('noteToPitch returns null for invalid names', () => {
    expect(noteToPitch('H4')).toBeNull();
    expect(noteToPitch('C')).toBeNull();
    expect(noteToPitch('')).toBeNull();
    expect(noteToPitch(null)).toBeNull();
});

// limitNotesToRange() — using the standard piano range C2(24)..B5(71)
const LO = 24, HI = 71;

test('limitNotesToRange keeps notes inside the range', () => {
    expect(limitNotesToRange('C4', LO, HI)).toBe('C4');
    expect(limitNotesToRange('C2,B5', LO, HI)).toBe('C2,B5'); // edges inclusive
});

test('limitNotesToRange drops notes below or above the range', () => {
    expect(limitNotesToRange('C1', LO, HI)).toBe('');  // C1 = 12, too low
    expect(limitNotesToRange('C7', LO, HI)).toBe('');  // C7 = 84, too high
});

test('limitNotesToRange filters individual notes inside a chord', () => {
    expect(limitNotesToRange('C1+C4', LO, HI)).toBe('C4');
    expect(limitNotesToRange('C4+C7', LO, HI)).toBe('C4');
    expect(limitNotesToRange('C2+C4+C5', LO, HI)).toBe('C2+C4+C5');
});

test('limitNotesToRange preserves duration when a whole chord is dropped', () => {
    expect(limitNotesToRange('C1__', LO, HI)).toBe('__');           // becomes a rest
    expect(limitNotesToRange('C4__,C7__', LO, HI)).toBe('C4__,__');
});

test('limitNotesToRange preserves rests and note durations', () => {
    expect(limitNotesToRange('C4,__,E4', LO, HI)).toBe('C4,__,E4');
    expect(limitNotesToRange('C4__', LO, HI)).toBe('C4__');
});

test('limitNotesToRange handles sharps at the range edges', () => {
    expect(limitNotesToRange('As5', LO, HI)).toBe('As5'); // 70, in range
    expect(limitNotesToRange('Cs6', LO, HI)).toBe('');    // 73, out of range
});

test('limitNotesToRange widens with an extended range C1(12)..B7(95)', () => {
    expect(limitNotesToRange('C1+C7', 12, 95)).toBe('C1+C7');
});

test('limitNotesToRange returns empty string for empty input', () => {
    expect(limitNotesToRange('', LO, HI)).toBe('');
    expect(limitNotesToRange(null, LO, HI)).toBe('');
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