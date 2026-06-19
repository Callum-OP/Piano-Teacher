const {
    createHandState,
    setHandEnabled,
    toggleHandState,
    isHandEnabled,
    isNoteAudible,
    anyHandEnabled
} = require('./hands.js');

//------------------------
// Disable Hand feature

test('createHandState starts with both hands enabled', () => {
    expect(createHandState()).toEqual({ Left: true, Right: true });
});

test('createHandState returns a fresh object each call', () => {
    const a = createHandState();
    const b = createHandState();
    a.Left = false;
    expect(b.Left).toBe(true);
});

test('toggleHandState flips the given hand and leaves the other alone', () => {
    const s = createHandState();
    toggleHandState(s, 'Left');
    expect(s.Left).toBe(false);
    expect(s.Right).toBe(true);
    toggleHandState(s, 'Left');
    expect(s.Left).toBe(true);
});

test('toggleHandState ignores unknown hands', () => {
    const s = createHandState();
    toggleHandState(s, 'Foot');
    expect(s).toEqual({ Left: true, Right: true });
});

test('setHandEnabled sets an explicit value and coerces to boolean', () => {
    const s = createHandState();
    setHandEnabled(s, 'Right', false);
    expect(s.Right).toBe(false);
    setHandEnabled(s, 'Right', 1);
    expect(s.Right).toBe(true);
});

test('isHandEnabled reflects the current state', () => {
    const s = createHandState();
    expect(isHandEnabled(s, 'Left')).toBe(true);
    setHandEnabled(s, 'Left', false);
    expect(isHandEnabled(s, 'Left')).toBe(false);
});

test('isHandEnabled returns true for unknown/missing hands so notes are never silently dropped', () => {
    const s = createHandState();
    expect(isHandEnabled(s, null)).toBe(true);
    expect(isHandEnabled(s, undefined)).toBe(true);
    expect(isHandEnabled(s, 'Both')).toBe(true);
});

test('isNoteAudible uses the note\'s hand', () => {
    const s = createHandState();
    setHandEnabled(s, 'Left', false);
    expect(isNoteAudible({ hand: 'Left' }, s)).toBe(false);
    expect(isNoteAudible({ hand: 'Right' }, s)).toBe(true);
    expect(isNoteAudible({}, s)).toBe(true);      // unknown hand still plays
    expect(isNoteAudible(null, s)).toBe(true);    // missing note still plays
});

test('anyHandEnabled detects when both hands are off', () => {
    const s = createHandState();
    expect(anyHandEnabled(s)).toBe(true);
    setHandEnabled(s, 'Left', false);
    expect(anyHandEnabled(s)).toBe(true);
    setHandEnabled(s, 'Right', false);
    expect(anyHandEnabled(s)).toBe(false);
});
