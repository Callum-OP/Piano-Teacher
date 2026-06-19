const { addOrUpdateMusic } = require('./save-music.js');

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
