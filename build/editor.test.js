const {
    parseHandToNotes, musicToGrid, gridToMusic, gridTotalUnits,
    hasNote, toggleNote, noteAt, setNoteLen, moveNote, changeNoteHand,
    insertColumn, deleteColumn, pitchRangeToRows, isBlackPitch, pianoLayout, keyAtX
} = require('./editor.js');

// Compare a grid's notes regardless of order
function noteKeys(grid) {
    return grid.notes.map(n => `${n.time}:${n.hand}:${n.note}`).sort();
}

//------------------------
// Parsing

test('parseHandToNotes places notes at cumulative unit times', () => {
    const { notes, endsAt } = parseHandToNotes('C4__E4__', 'right');
    expect(notes).toEqual([
        { time: 0, note: 'C4', hand: 'right', len: 2 },
        { time: 2, note: 'E4', hand: 'right', len: 2 }
    ]);
    expect(endsAt).toBe(4);
});

test('parseHandToNotes handles chords and rests', () => {
    const { notes, endsAt } = parseHandToNotes('C4+E4__,__,G4', 'left');
    expect(notes).toEqual([
        { time: 0, note: 'C4', hand: 'left', len: 2 },
        { time: 0, note: 'E4', hand: 'left', len: 2 },
        { time: 4, note: 'G4', hand: 'left', len: 1 }
    ]);
    expect(endsAt).toBe(5);
});

test('parseHandToNotes canonicalises note spelling', () => {
    expect(parseHandToNotes('c#4', 'right').notes[0].note).toBe('Cs4');
    expect(parseHandToNotes('AS5', 'right').notes[0].note).toBe('As5');
});

test('parseHandToNotes preserves a leading rest', () => {
    const { notes } = parseHandToNotes('__C4', 'right');
    expect(notes).toEqual([{ time: 2, note: 'C4', hand: 'right', len: 1 }]);
});

//------------------------
// Grid build + serialise

test('musicToGrid combines both hands and reports total length', () => {
    const g = musicToGrid('C4__', 'G4__E4__');
    expect(noteKeys(g)).toEqual(['0:left:C4', '0:right:G4', '2:right:E4']);
    expect(g.totalUnits).toBe(4);
});

test('gridToMusic uses each note\'s length for its trailing underscores', () => {
    const grid = {
        notes: [
            { time: 0, note: 'C4', hand: 'left', len: 2 },
            { time: 0, note: 'G4', hand: 'right', len: 2 },
            { time: 2, note: 'E4', hand: 'right', len: 2 }
        ]
    };
    expect(gridToMusic(grid)).toEqual({ left: 'C4__', right: 'G4__E4__' });
});

test('a note\'s length controls how many underscores it gets', () => {
    expect(gridToMusic({ notes: [{ time: 0, note: 'C4', hand: 'right', len: 4 }] }).right).toBe('C4____');
    expect(gridToMusic({ notes: [{ time: 0, note: 'C4', hand: 'right', len: 1 }] }).right).toBe('C4_');
});

test('round-trip preserves note onsets exactly (even with uneven hands)', () => {
    const cases = [
        { left: 'C4__', right: 'G4__E4__' },
        { left: 'C4+E4__,__,G4', right: 'C3____' },
        { left: '', right: 'C4_D4_E4' },
        { left: '__C4', right: 'C5__' }
    ];
    for (const c of cases) {
        const g1 = musicToGrid(c.left, c.right);
        const m = gridToMusic(g1);
        const g2 = musicToGrid(m.left, m.right);
        expect(noteKeys(g2)).toEqual(noteKeys(g1)); // onsets/hands identical
        // and serialising is idempotent from here on
        expect(gridToMusic(g2)).toEqual(m);
    }
});

test('gridToMusic of an empty grid is two empty strings', () => {
    expect(gridToMusic({ notes: [], totalUnits: 1 })).toEqual({ left: '', right: '' });
});

//------------------------
// Edit operations

test('toggleNote adds then removes a note', () => {
    const g = { notes: [], totalUnits: 1 };
    toggleNote(g, 0, 'C4', 'right');
    expect(hasNote(g, 0, 'C4', 'right')).toBe(true);
    expect(g.notes.length).toBe(1);
    toggleNote(g, 0, 'C4', 'right');
    expect(hasNote(g, 0, 'C4', 'right')).toBe(false);
    expect(g.notes.length).toBe(0);
});

test('toggleNote extends totalUnits by the new note\'s length', () => {
    const g = { notes: [], totalUnits: 1 };
    toggleNote(g, 5, 'C4', 'right'); // default length 2
    expect(g.totalUnits).toBe(7); // 5 + 2
});

test('noteAt finds a note whose span covers the time', () => {
    const g = { notes: [{ time: 2, note: 'C4', hand: 'right', len: 3 }] };
    expect(noteAt(g, 2, 'C4', 'right')).toBeTruthy(); // onset
    expect(noteAt(g, 4, 'C4', 'right')).toBeTruthy(); // inside span [2,5)
    expect(noteAt(g, 5, 'C4', 'right')).toBeFalsy();  // just past the end
    expect(noteAt(g, 2, 'C4', 'left')).toBeFalsy();   // wrong hand
});

test('setNoteLen on the last note sets its trailing length and clamps to >= 1', () => {
    const g = { notes: [{ time: 0, note: 'C4', hand: 'right', len: 2 }] };
    setNoteLen(g, g.notes[0], 5);
    expect(g.notes[0].len).toBe(5);
    expect(gridToMusic(g).right).toBe('C4_____');
    setNoteLen(g, g.notes[0], 0);
    expect(g.notes[0].len).toBe(1);
});

test('setNoteLen on a non-last note ripples its hand so length becomes real spacing', () => {
    const g = {
        notes: [
            { time: 0, note: 'C4', hand: 'right', len: 2 },
            { time: 2, note: 'D4', hand: 'right', len: 2 },
            { time: 2, note: 'G3', hand: 'left', len: 2 } // other hand: must stay put
        ]
    };
    expect(gridToMusic(g).right).toBe('C4__D4__');
    setNoteLen(g, g.notes[0], 4); // C4's gap was 2; make it 4
    expect(g.notes[1].time).toBe(4); // D4 pushed later by 2
    expect(g.notes[2].time).toBe(2); // left hand unaffected
    expect(gridToMusic(g).right).toBe('C4____D4__'); // C4 now has 4 underscores
});

test('moveNote relocates a note in time, pitch and hand', () => {
    const g = { notes: [{ time: 0, note: 'C4', hand: 'right', len: 2 }] };
    moveNote(g, g.notes[0], 3, 'E4', 'left');
    expect(g.notes[0]).toMatchObject({ time: 3, note: 'E4', hand: 'left', len: 2 });
});

test('toggleNote keeps left and right independent at the same cell', () => {
    const g = { notes: [], totalUnits: 1 };
    toggleNote(g, 0, 'C4', 'right');
    toggleNote(g, 0, 'C4', 'left');
    expect(g.notes.length).toBe(2);
});

test('changeNoteHand flips a note to the other hand', () => {
    const g = { notes: [{ time: 0, note: 'C4', hand: 'left' }], totalUnits: 1 };
    changeNoteHand(g, 0, 'C4');
    expect(g.notes[0].hand).toBe('right');
});

test('insertColumn shifts later notes right and grows the grid', () => {
    const g = { notes: [{ time: 2, note: 'C4', hand: 'right' }], totalUnits: 3 };
    insertColumn(g, 1, 1);
    expect(g.notes[0].time).toBe(3);
    expect(g.totalUnits).toBe(4);
});

test('deleteColumn drops notes at that time and pulls later notes left', () => {
    const g = {
        notes: [
            { time: 0, note: 'C4', hand: 'right' },
            { time: 2, note: 'E4', hand: 'right' }
        ],
        totalUnits: 3
    };
    deleteColumn(g, 0);
    expect(noteKeys(g)).toEqual(['1:right:E4']);
    expect(g.totalUnits).toBe(2);
});

test('gridTotalUnits derives length from the latest note', () => {
    expect(gridTotalUnits({ notes: [{ time: 4, note: 'C4', hand: 'right' }] })).toBe(5);
    expect(gridTotalUnits({ notes: [] })).toBe(1);
});

//------------------------
// Rows

test('pitchRangeToRows lists note names high pitch first', () => {
    expect(pitchRangeToRows(24, 26)).toEqual(['D2', 'Cs2', 'C2']);
});

test('pitchRangeToRows spans the whole inclusive range', () => {
    const rows = pitchRangeToRows(24, 71); // C2..B5
    expect(rows.length).toBe(48);
    expect(rows[0]).toBe('B5');
    expect(rows[rows.length - 1]).toBe('C2');
});

//------------------------
// Keyboard geometry

test('isBlackPitch identifies sharps', () => {
    expect(isBlackPitch(25)).toBe(true);  // Cs
    expect(isBlackPitch(24)).toBe(false); // C
    expect(isBlackPitch(30)).toBe(true);  // Fs
    expect(isBlackPitch(29)).toBe(false); // F
});

test('pianoLayout reproduces the #piano key positions at whiteW 30', () => {
    const { keys, width } = pianoLayout(24, 71, 30); // C2..B5
    const at = note => keys.find(k => k.note === note);
    expect(at('C2')).toMatchObject({ x: 0, width: 30, black: false });
    expect(at('Cs2')).toMatchObject({ x: 21, width: 18, black: true });
    expect(at('D2')).toMatchObject({ x: 30, black: false });
    expect(at('Fs2')).toMatchObject({ x: 111, black: true });
    expect(at('C3')).toMatchObject({ x: 210 });
    expect(width).toBe(840); // 28 white keys * 30
});

test('pianoLayout has 7 white and 5 black keys per octave', () => {
    const { keys } = pianoLayout(24, 35, 30); // C2..B2
    expect(keys.filter(k => !k.black).length).toBe(7);
    expect(keys.filter(k => k.black).length).toBe(5);
});

test('keyAtX works on a layout built from live key rects (edit-mode shape)', () => {
    // Mirrors what liveKeyLayout() produces from the real piano's getBoundingClientRect
    const layout = {
        keys: [
            { note: 'C4', x: 0, width: 30, black: false },
            { note: 'D4', x: 30, width: 30, black: false },
            { note: 'Cs4', x: 21, width: 18, black: true }
        ]
    };
    expect(keyAtX(layout, 5).note).toBe('C4');
    expect(keyAtX(layout, 25).note).toBe('Cs4'); // black overlaps, wins
    expect(keyAtX(layout, 45).note).toBe('D4');
});

test('keyAtX prefers black keys where they overlap white keys', () => {
    const layout = pianoLayout(24, 71, 30);
    expect(keyAtX(layout, 10).note).toBe('C2');   // left part of C2
    expect(keyAtX(layout, 25).note).toBe('Cs2');  // over the black key
    expect(keyAtX(layout, 35).note).toBe('Cs2');  // black overlaps D2's left edge
    expect(keyAtX(layout, 45).note).toBe('D2');   // white gap between black keys
    expect(keyAtX(layout, 9000)).toBeNull();      // past the keyboard
});
