const {
    parseNote,
    separateNotesAndDelays,
    order,
    alignSegments,
    isWhiteKey,
    whiteKeyDistance,
    calculateSpan,
    balanceClusters,
    shouldSplitNotes,
    findBestSplitPoint,
    splitNotes,
    getAveragePitch
} = require('./sort-notes.js');

//------------------------
// parseNote

test('parseNote parses letter, octave and pitch', () => {
    expect(parseNote('C4')).toEqual({ note: 'C4', pitch: 48 });
    expect(parseNote('Cs4')).toEqual({ note: 'Cs4', pitch: 49 });
    expect(parseNote('B2')).toEqual({ note: 'B2', pitch: 35 });
});

test('parseNote trims whitespace', () => {
    expect(parseNote('  A3 ')).toEqual({ note: 'A3', pitch: 45 });
});

test('parseNote rejects invalid notes', () => {
    expect(parseNote('H4')).toBeNull();   // no H note
    expect(parseNote('C')).toBeNull();    // missing octave
    expect(parseNote('')).toBeNull();
    expect(parseNote('Db4')).toBeNull();  // flats not supported, only sharps
});

//------------------------
// White key helpers

test('isWhiteKey identifies white vs black keys across an octave', () => {
    const whites = [0, 2, 4, 5, 7, 9, 11];   // C D E F G A B
    for (let p = 0; p < 12; p++) {
        expect(isWhiteKey(p)).toBe(whites.includes(p));
    }
});

test('whiteKeyDistance counts white keys between two pitches', () => {
    expect(whiteKeyDistance(48, 60)).toBe(7); // C4 -> C5 = 7 white keys
    expect(whiteKeyDistance(48, 48)).toBe(0);
});

test('calculateSpan measures the white key distance of a cluster', () => {
    expect(calculateSpan([{ pitch: 48 }, { pitch: 60 }])).toBe(7);
    expect(calculateSpan([{ pitch: 48 }])).toBe(0); // single note has no span
    expect(calculateSpan([])).toBe(0);
});

//------------------------
// Segment parsing

test('separateNotesAndDelays splits notes from underscore delays', () => {
    expect(separateNotesAndDelays('C4__E4')).toEqual([
        { type: 'notes', text: 'C4' },
        { type: 'delay', text: '__' },
        { type: 'notes', text: 'E4' }
    ]);
});

test('order pairs each note segment with the delay that follows it', () => {
    const ordered = order(separateNotesAndDelays('C4__E4'));
    expect(ordered).toEqual([
        { type: 'segment', notesText: 'C4', delayAfter: '__' },
        { type: 'segment', notesText: 'E4', delayAfter: '' }
    ]);
});

test('order keeps a leading delay as its own segment', () => {
    const ordered = order(separateNotesAndDelays('__C4'));
    expect(ordered[0]).toEqual({ type: 'segment', notesText: '', delayAfter: '__' });
});

test('alignSegments pads the shorter list to match the longer one', () => {
    const [a, b] = alignSegments(
        [{ type: 'segment', notesText: 'C4', delayAfter: '' }],
        []
    );
    expect(a.length).toBe(1);
    expect(b.length).toBe(1);
    expect(b[0]).toEqual({ type: 'segment', notesText: '', delayAfter: '' });
});

//------------------------
// Balancing & splitting

test('balanceClusters leaves clusters within the hand limit unchanged', () => {
    const left = [{ note: 'C4', pitch: 48 }, { note: 'E4', pitch: 52 }];
    const right = [{ note: 'C5', pitch: 60 }];
    const { leftCluster, rightCluster } = balanceClusters(left, right);
    expect(leftCluster.length).toBe(2);
    expect(rightCluster.length).toBe(1);
});

test('balanceClusters moves a note off a hand that spans too far', () => {
    const left = [{ note: 'C2', pitch: 24 }, { note: 'C4', pitch: 48 }];
    const { leftCluster, rightCluster } = balanceClusters(left, []);
    expect(leftCluster.length).toBe(1);
    expect(rightCluster[0].note).toBe('C4');
});

test('shouldSplitNotes returns false for a single note', () => {
    expect(shouldSplitNotes([{ pitch: 48 }])).toBe(false);
});

test('shouldSplitNotes splits a chord that spans more than one hand', () => {
    const notes = [parseNote('C2'), parseNote('C5')];
    expect(shouldSplitNotes(notes)).toBe(true);
});

test('findBestSplitPoint returns an index inside the cluster', () => {
    const notes = [parseNote('C2'), parseNote('C5')];
    const idx = findBestSplitPoint(notes);
    expect(idx).toBeGreaterThan(0);
    expect(idx).toBeLessThan(notes.length);
});

test('splitNotes assigns a low single note to the left and a high one to the right', () => {
    expect(splitNotes('C3', '')).toEqual({ left: 'C3', right: '' });
    expect(splitNotes('', 'C5')).toEqual({ left: '', right: 'C5' });
});

test('splitNotes splits a wide chord across both hands without crossing', () => {
    const { left, right } = splitNotes('C2+C5', '');
    expect(left).toBe('C2');
    expect(right).toBe('C5');
});

test('splitNotes returns empty hands for empty input', () => {
    expect(splitNotes('', '')).toEqual({ left: '', right: '' });
});

//------------------------
// getAveragePitch

test('getAveragePitch averages the pitches of a chord', () => {
    expect(getAveragePitch('C4+C5')).toBe(54); // (48 + 60) / 2
    expect(getAveragePitch('C4')).toBe(48);
});

test('getAveragePitch returns null when there are no valid notes', () => {
    expect(getAveragePitch('')).toBeNull();
    expect(getAveragePitch('___')).toBeNull();
});
