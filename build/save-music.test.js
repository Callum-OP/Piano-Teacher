const { addOrUpdateMusic, sanitizeMusicList, mergeCustomMusic } = require('./save-music.js');

//------------------------
// Custom saved music list

test('addOrUpdateMusic adds a new piece', () => {
    const saved = addOrUpdateMusic([], 'Song', 'C4', 'D4', 'Bach');
    expect(saved).toEqual([{ title: 'Song', left: 'C4', right: 'D4', composer: 'Bach' }]);
});

test('addOrUpdateMusic defaults the composer to "My Music"', () => {
    const saved = addOrUpdateMusic([], 'Untitled', 'C4', 'D4');
    expect(saved[0].composer).toBe('My Music');
});

test('addOrUpdateMusic overwrites a piece with the same title and composer', () => {
    let saved = [{ title: 'Song', left: 'old', right: 'old', composer: 'Bach' }];
    saved = addOrUpdateMusic(saved, 'Song', 'new', 'newer', 'Bach');
    expect(saved.length).toBe(1);
    expect(saved[0]).toEqual({ title: 'Song', left: 'new', right: 'newer', composer: 'Bach' });
});

test('addOrUpdateMusic keeps pieces with the same title but a different composer', () => {
    let saved = [{ title: 'Song', left: 'a', right: 'b', composer: 'Bach' }];
    saved = addOrUpdateMusic(saved, 'Song', 'c', 'd', 'Mozart');
    expect(saved.length).toBe(2);
});

test('addOrUpdateMusic sorts by composer, then by title', () => {
    let saved = [];
    saved = addOrUpdateMusic(saved, 'Zebra', 'l', 'r', 'Bach');
    saved = addOrUpdateMusic(saved, 'Apple', 'l', 'r', 'Bach');
    saved = addOrUpdateMusic(saved, 'Song', 'l', 'r', 'Albeniz');
    expect(saved.map(m => `${m.composer}/${m.title}`)).toEqual([
        'Albeniz/Song',
        'Bach/Apple',
        'Bach/Zebra'
    ]);
});

//------------------------
// Import / export of the saved list

test('sanitizeMusicList accepts a bare array and fills defaults', () => {
    const clean = sanitizeMusicList([{ title: 'Song', left: 'C4' }]);
    expect(clean).toEqual([{ title: 'Song', left: 'C4', right: '', composer: 'My Music' }]);
});

test('sanitizeMusicList accepts the export envelope { music: [...] }', () => {
    const clean = sanitizeMusicList({ app: 'piano-teacher', music: [{ title: 'A', left: 'C4', right: 'D4', composer: 'Bach' }] });
    expect(clean).toEqual([{ title: 'A', left: 'C4', right: 'D4', composer: 'Bach' }]);
});

test('sanitizeMusicList drops entries without a usable title and trims fields', () => {
    const clean = sanitizeMusicList([{ left: 'C4' }, { title: '   ' }, { title: '  Song  ', composer: '  Bach  ' }]);
    expect(clean).toEqual([{ title: 'Song', left: '', right: '', composer: 'Bach' }]);
});

test('sanitizeMusicList returns [] for non-list junk', () => {
    expect(sanitizeMusicList(null)).toEqual([]);
    expect(sanitizeMusicList('nope')).toEqual([]);
    expect(sanitizeMusicList({ notmusic: 1 })).toEqual([]);
});

test('mergeCustomMusic adds only pieces not already present', () => {
    const current = [{ title: 'Song', left: 'a', right: 'b', composer: 'Bach' }];
    const incoming = [
        { title: 'Song', left: 'x', right: 'y', composer: 'Bach' }, // duplicate: skipped, not overwritten
        { title: 'New', left: 'c', right: 'd', composer: 'Bach' }
    ];
    const { list, added } = mergeCustomMusic(current, incoming);
    expect(added).toBe(1);
    expect(list.find(m => m.title === 'Song').left).toBe('a'); // original kept
    expect(list.find(m => m.title === 'New')).toBeTruthy();
});

test('mergeCustomMusic dedupes within the incoming list too', () => {
    const incoming = [
        { title: 'Dup', left: 'a', right: 'b', composer: 'Bach' },
        { title: 'Dup', left: 'c', right: 'd', composer: 'Bach' }
    ];
    const { list, added } = mergeCustomMusic([], incoming);
    expect(added).toBe(1);
    expect(list.length).toBe(1);
});
