// Map note letters
const noteOffsets = {
    C:0, Cs:1, D:2, Ds:3, E:4, F:5, Fs:6,
    G:7, Gs:8, A:9, As:10, B:11
};

// Split notes into letters and numbers
function parseNote(note) {
    const match = note.trim().match(/^([A-G]s?)(\d+)$/);
    if (!match) return null;
    const [, letter, octaveStr] = match;
    const octave = parseInt(octaveStr, 10);
    const offset = noteOffsets[letter];
    if (offset == null || Number.isNaN(octave)) return null;
    const pitch = octave * 12 + offset;
    return { note: `${letter}${octave}`, pitch };
}

// Split notes/delays into segments
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

// Build ordered segments storing the type, note text and delays
function order(segments) {
    const ordered = [];
    let i = 0;
    while (i < segments.length) {
        const seg = segments[i];
        // Store following delay if present
        if (seg.type === 'notes') {
            const next = segments[i + 1];
            const delayAfter = next && next.type === 'delay' ? next.text : '';
            ordered.push({ type: 'segment', notesText: seg.text.trim(), delayAfter });
            i += delayAfter ? 2 : 1;
        // Store leading delay
        } else if (seg.type === 'delay') {
            ordered.push({ type: 'segment', notesText: '', delayAfter: seg.text });
            i += 1;
        // Skip
        } else {
            i += 1;
        }
    }
    return ordered;
}

// Group only notes that are close together
function groupCloseSegments(orderedSegments, tolerance = 2) {
    const out = [];
    for (let i = 0; i < orderedSegments.length; i++) {
        const curr = orderedSegments[i];
        const next = orderedSegments[i + 1];
        if (
            next &&
            curr.notesText &&
            curr.delayAfter &&
            curr.delayAfter.length <= tolerance &&
            next.notesText
        ) {
            // Combine notes for splitting
            out.push({
                type: 'segment',
                notesText: `${curr.notesText}+${next.notesText}`,
                delayAfter: next.delayAfter,
                grouped: true,
                closeDelay: curr.delayAfter
            });
            i += 1;
        } else {
            out.push(curr);
        }
    }
    return out;
}

// Align ordered segment streams by index (keeps timing order)
function alignSegments(leftSegments, rightSegments) {
    const maxLen = Math.max(leftSegments.length, rightSegments.length);
    const outA = [];
    const outB = [];
    for (let i = 0; i < maxLen; i++) {
        outA.push(leftSegments[i] || { type: 'segment', notesText: '', delayAfter: '' });
        outB.push(rightSegments[i] || { type: 'segment', notesText: '', delayAfter: '' });
    }
    return [outA, outB];
}

// Split combined notes into left/right
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

    if (notes.length === 0) return { left: '', right: '' };

    notes.sort((a, b) => a.pitch - b.pitch);

    // Assign hand based on position on piano (Middle C as divider)
    if (notes.length === 1) {
        const single = notes[0];
        const threshold = parseNote("C4").pitch;
        return single.pitch < threshold
        ? { left: single.note, right: '' }
        : { left: '', right: single.note };
    }

    // Split by largest gap split
    let maxGap = -1;
    let splitIndex = Math.floor(notes.length / 2);
    for (let i = 0; i < notes.length - 1; i++) {
        const gap = notes[i + 1].pitch - notes[i].pitch;
        if (gap > maxGap) {
        maxGap = gap;
        splitIndex = i + 1;
        }
    }
    const left = notes.slice(0, splitIndex).map(n => n.note).join('+');
    const right = notes.slice(splitIndex).map(n => n.note).join('+');
    return { left, right };
}

// Main function for sorting notes into proper hands
function resortNotes() {
    let leftBlock = document.getElementById("noteInputLeft").value || '';
    let rightBlock = document.getElementById("noteInputRight").value || '';

    if (!/[A-Za-z]/.test(leftBlock)) leftBlock = "";
    if (!/[A-Za-z]/.test(rightBlock)) rightBlock = "";

    // Build ordered segments and group only immediate pairs — no multi-chain collapsing
    const leftOrdered = order(separateNotesAndDelays(leftBlock));
    const rightOrdered = order(separateNotesAndDelays(rightBlock));

    const leftGrouped = groupCloseSegments(leftOrdered, 2);
    const rightGrouped = groupCloseSegments(rightOrdered, 2);

    const [A, B] = alignSegments(leftGrouped, rightGrouped);

    const outLeft = [];
    const outRight = [];

    for (let i = 0; i < A.length; i++) {
        const a = A[i];
        const b = B[i];

        // Split notes into hands
        const { left, right } = splitNotes(a.notesText, b.notesText);
        if (left) outLeft.push(left);
        if (right) outRight.push(right);

        // Add delay
        const delay =
        (a.delayAfter && b.delayAfter)
            ? (a.delayAfter.length >= b.delayAfter.length ? a.delayAfter : b.delayAfter)
            : (a.delayAfter || b.delayAfter || '');
        if (delay) {
            outLeft.push(delay);
            outRight.push(delay);
        }
    }

    const leftOut = outLeft.join('');
    const rightOut = outRight.join('');

    document.getElementById("noteInputLeft").value = leftOut || '';
    document.getElementById("noteInputRight").value = rightOut || '';
}
