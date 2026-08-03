// DOM smoke test for the Export MIDI button: drives the current note inputs through
// the click handler and reads the downloaded blob straight back with the app's own
// parseMIDI, proving the wiring produces a real, readable MIDI file (not just that
// the encoder works in isolation). See the "verify UI actually works" note.
const { exportCurrentMusicAsMidi, TICKS_PER_UNIT } = require('./midi-export.js');
const { parseMIDI } = require('./midi-upload.js');

let captured;

beforeEach(() => {
    captured = null;
    document.body.innerHTML =
        '<textarea id="noteInputLeft"></textarea><textarea id="noteInputRight"></textarea><a id="sink"></a>';
    window.alert = jest.fn();
    window.URL.createObjectURL = jest.fn((blob) => { captured = blob; return 'blob:mock'; });
    window.URL.revokeObjectURL = jest.fn();
    // Stop the download anchor's click from hitting jsdom's unimplemented navigation.
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

test('exporting the current inputs produces a MIDI file with both hands', async () => {
    document.getElementById('noteInputRight').value = 'C4__';
    document.getElementById('noteInputLeft').value = 'C2__';

    exportCurrentMusicAsMidi();

    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(captured).toBeTruthy();

    const buf = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsArrayBuffer(captured);
    });
    const midi = parseMIDI(buf);
    expect(midi.tracks.length).toBe(2);
    // right hand C4 (60) in track 0, left hand C2 (36) in track 1
    expect(midi.tracks[0].events.some(e => e.type === 'on' && e.pitch === 60)).toBe(true);
    expect(midi.tracks[1].events.some(e => e.type === 'on' && e.pitch === 36)).toBe(true);
});

test('exporting with no notes warns and downloads nothing', () => {
    exportCurrentMusicAsMidi();
    expect(window.alert).toHaveBeenCalledWith('No music to export. Load a piece or enter some notes first.');
    expect(window.URL.createObjectURL).not.toHaveBeenCalled();
});
