// This script is for sorting notes that are improperly ordered into the correct hands

// Map note letters
const noteOffsets = {
    C:0, Cs:1, D:2, Ds:3, E:4, F:5, Fs:6,
    G:7, Gs:8, A:9, As:10, B:11
};

// Split notes into letter and number
function parseNote(note) {
    const match = note.trim().match(/^([A-G]s?)(\d+)$/);
    if (!match) return null;
    const [, letter, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    const offset = noteOffsets[letter];
    if (offset == null || Number.isNaN(octave)) return null;
    // Pitch number
    const pitch = octave * 12 + offset;
    return { note: `${letter}${octave}`, pitch };
}

// Sort notes and delays
// Returns an array such as: [{type:'notes', text:'B3+Gs3+B4'}, {type:'delay', text:'__________'}]
function separateNotesAndDelays(block) {
    const parts = block.split(/(_+)/);
    const segments = [];
    for (let i = 0; i < parts.length; i++) {
        const text = parts[i];
        if (text === "") continue;
        const isDelay = /^_+$/.test(text);
        segments.push({ type: isDelay ? 'delay' : 'notes', text });
    }
    return segments;
}

// Ensure both token sequences (notes/delays) align by index 
function alignSegments(left, right) {
    const maxLen = Math.max(left.length, right.length);
    const padDelay = { type: 'delay', text: '' };
    const padNotes = { type: 'notes', text: '' };
    const outA = [];
    const outB = [];
    for (let i = 0; i < maxLen; i++) {
        const a = left[i] || (right[i] ? (right[i].type === 'delay' ? padDelay : padNotes) : padNotes);
        const b = right[i] || (left[i] ? (left[i].type === 'delay' ? padDelay : padNotes) : padNotes);
        // If mismatched types at same index, try to correct:
        if (a.type !== b.type) {
        // Prefer keeping the existing type from A, and convert B to same type with empty text
        const fixedB = { type: a.type, text: '' };
        outA.push(a);
        outB.push(fixedB);
        } else {
        outA.push(a);
        outB.push(b);
        }
    }
    return [outA, outB];
}

// Merge the notes and sort by pitch, then split into left/right; ignoring invalid notes
function splitNotes(leftNotesText, rightNotesText) {
    const raw = (leftNotesText ? leftNotesText.trim() : '') +
                (leftNotesText && rightNotesText ? '+' : '') +
                (rightNotesText ? rightNotesText.trim() : '');

    if (!raw) return { left: '', right: '' };

    const notes = raw
        .split('+')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(parseNote)
        .filter(n => n);

    if (notes.length === 0) {
        return { left: '', right: '' };
    }

    // Sort by true pitch
    notes.sort((a, b) => a.pitch - b.pitch);

    // Split in two
    const half = Math.ceil(notes.length / 2);
    const left = notes.slice(0, half).map(n => n.note).join('+');
    const right = notes.slice(half).map(n => n.note).join('+');
    return { left, right };   
}

// Choose the delay to output at this index: prefer the longer run of underscores
function chooseDelay(delayA, delayB) {
    const a = delayA || '';
    const b = delayB || '';
    return a.length >= b.length ? a : b;
    }

// Main function for sorting notes into proper hands
function resortNotes() {
    let leftBlock = document.getElementById("noteInputLeft").value || '';
    let rightBlock = document.getElementById("noteInputRight").value || '';

    if (!/[A-Za-z]/.test(leftBlock)) {
            leftBlock = "";
    }
    if (!/[A-Za-z]/.test(rightBlock)) {
            rightBlock = "";
    }

    const tokensLeft = separateNotesAndDelays(leftBlock);
    const tokensRight = separateNotesAndDelays(rightBlock);

    const [A, B] = alignSegments(tokensLeft, tokensRight);

    const outLeft = [];
    const outRight = [];

    for (let i = 0; i < A.length; i++) {
        const a = A[i];
        const b = B[i];

        if (a.type === 'delay' && b.type === 'delay') {
        const delay = chooseDelay(a.text, b.text);
        outLeft.push(delay);
        outRight.push(delay);
        } else if (a.type === 'notes' && b.type === 'notes') {
        const { left, right } = splitNotes(a.text, b.text);
        if (left) outLeft.push(left);
        if (right) outRight.push(right);
        // If both empty, push nothing
        } else {
        const delay = chooseDelay(a.type === 'delay' ? a.text : '', b.type === 'delay' ? b.text : '');
        outLeft.push(delay);
        outRight.push(delay);
        }
    }

    const leftOut = outLeft.join('');
    const rightOut = outRight.join('');

    document.getElementById("noteInputLeft").value = leftOut || '(empty)';
    document.getElementById("noteInputRight").value = rightOut || '(empty)';
}
