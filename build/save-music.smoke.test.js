// DOM smoke test for the saved-music import path: drives a real file through
// FileReader -> merge -> localStorage -> the visible dropdown, so we know the
// wiring works, not just the pure helpers. See the "verify UI actually works" note.
const { importCustomMusicFile } = require('./save-music.js');

beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<select id="customMusicSelect"><option value="">-- Saved Music --</option></select>';
    window.alert = jest.fn();
});

function fileOf(obj) {
    return new Blob([JSON.stringify(obj)], { type: 'application/json' });
}

test('importing an exported file merges new pieces and shows them in the dropdown', async () => {
    localStorage.setItem('customMusic', JSON.stringify([
        { title: 'Existing', left: 'C4', right: '', composer: 'Me' }
    ]));

    await importCustomMusicFile(fileOf({
        app: 'piano-teacher', type: 'custom-music', version: 1,
        music: [{ title: 'New Song', left: 'C4', right: 'E4', composer: 'Bach' }]
    }));

    // Stored: original kept + imported added
    const saved = JSON.parse(localStorage.getItem('customMusic'));
    expect(saved.map(m => m.title).sort()).toEqual(['Existing', 'New Song']);

    // Visible: the imported piece appears in the real dropdown
    const options = [...document.querySelectorAll('#customMusicSelect option')].map(o => o.textContent);
    expect(options).toContain('New Song');
    expect(window.alert).toHaveBeenCalledWith('Imported 1 piece.');
});

test('importing a file whose pieces are all already saved changes nothing', async () => {
    const existing = [{ title: 'Same', left: 'C4', right: '', composer: 'Me' }];
    localStorage.setItem('customMusic', JSON.stringify(existing));

    await importCustomMusicFile(fileOf({ music: existing }));

    expect(JSON.parse(localStorage.getItem('customMusic'))).toEqual(existing);
    expect(window.alert).toHaveBeenCalledWith('Every piece in that file is already in your list.');
});

test('importing an invalid file warns and leaves the list untouched', async () => {
    localStorage.setItem('customMusic', JSON.stringify([{ title: 'Keep', left: 'C4', right: '', composer: 'Me' }]));

    await importCustomMusicFile(new Blob(['not json at all'], { type: 'application/json' }));

    expect(JSON.parse(localStorage.getItem('customMusic'))).toEqual([{ title: 'Keep', left: 'C4', right: '', composer: 'Me' }]);
    expect(window.alert).toHaveBeenCalledWith("Could not read this file. It doesn't look like an exported music list.");
});
