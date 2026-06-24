const { resortBlocks } = require('./sort-notes.js');

// CHARACTERISATION (golden-master) TESTS.
// These pin the CURRENT output of the hand-sort so any change to the algorithm is
// visible as a diff. They do NOT assert "correctness" (hand assignment is subjective)
// — they're a regression net. When you intentionally improve the sort, eyeball each
// changed case and update the expected value only if the new split is genuinely better.
//
// Inputs are underscore-separated (the format the MIDI importer feeds to resortNotes).

const CASES = [
    {
        name: 'wide chord splits low->left, high->right',
        left: '', right: 'C3+E3+G3+C5+E5',
        expect: { left: 'C3+E3+G3', right: 'C5+E5' }
    },
    {
        name: 'merged scale splits around middle C',
        left: '', right: 'C3_D3_E3_F3_G3_A3_B3_C4_D4_E4',
        expect: { left: 'C3_D3_E3_F3_G3_A3_B3___', right: '_______C4_D4_E4' }
    },
    {
        name: 'arpeggio low->high',
        left: '', right: 'C3_G3_C4_E4_G4_C5',
        expect: { left: 'C3_G3____', right: '__C4_E4_G4_C5' }
    },
    {
        name: 'span wider than one hand is balanced across both',
        left: '', right: 'C2+G2+C3+G3+C4+G4',
        expect: { left: 'C2+G2+C3', right: 'G3+C4+G4' }
    },
    {
        name: 'already-split hands are left alone',
        left: 'C3_E3_G3', right: 'C5_E5_G5',
        expect: { left: 'C3_E3_G3', right: 'C5_E5_G5' }
    },
    {
        name: 'single low note goes left',
        left: '', right: 'A2',
        expect: { left: 'A2', right: '' }
    },
    {
        name: 'single high note goes right',
        left: '', right: 'C6',
        expect: { left: '', right: 'C6' }
    },
    {
        name: 'hand crossing is corrected (low->left, high->right)',
        left: 'G4_A4', right: 'C3_D3',
        expect: { left: 'C3_D3', right: 'G4_A4' }
    },
    {
        name: 'melody crossing the middle',
        left: '', right: 'A3_B3_C4_D4_C4_B3_A3',
        expect: { left: 'A3_B3___C4_B3_A3', right: '__C4_D4___' }
    },
    {
        name: 'chord with a held gap then another chord',
        left: '', right: 'C3+C4+C5____E3+E4',
        expect: { left: 'C3____E3', right: 'C4+C5____E4' }
    },
    {
        name: 'leaping melody splits by register',
        left: '', right: 'C2_E4_C3_E4_C2',
        expect: { left: 'C2__C3__C2', right: '_E4__E4_' }
    },
    {
        name: 'sharps in a chord',
        left: '', right: 'Cs3+Ds3+Fs5',
        expect: { left: 'Cs3+Ds3', right: 'Fs5' }
    },
    // --- wide-chord splits after the findBestSplitPoint bonus fix (split near middle C) ---
    {
        name: 'wide chord splits near middle C (no over-wide hand)',
        left: '', right: 'C3+E3+G3+B3+D4+F4',
        expect: { left: 'C3+E3+G3', right: 'B3+D4+F4' }
    },
    {
        name: 'octave pairs split one per hand',
        left: '', right: 'C3+Fs3+C4+Fs4',
        expect: { left: 'C3+Fs3', right: 'C4+Fs4' }
    },
    {
        name: 'six-note chord balanced across hands',
        left: '', right: 'B2+D3+F3+A3+C4+E4',
        expect: { left: 'B2+D3+F3', right: 'A3+C4+E4' }
    },
    {
        name: 'full octave chord splits in two',
        left: '', right: 'C3+D3+E3+F3+G3+A3+B3+C4',
        expect: { left: 'C3+D3+E3+F3+G3', right: 'A3+B3+C4' }
    }
];

describe('resortBlocks characterisation', () => {
    for (const c of CASES) {
        test(c.name, () => {
            expect(resortBlocks(c.left, c.right)).toEqual(c.expect);
        });
    }
});
