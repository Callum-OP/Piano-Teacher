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

// Check if a note is for a white key
function isWhiteKey(pitch) {
    const offset = pitch % 12;
    return [0,2,4,5,7,9,11].includes(offset);
}

// Count white keys
function whiteKeyDistance(p1, p2) {
    let count = 0;
    for (let p = p1 + 1; p <= p2; p++) {
        if (isWhiteKey(p)) count++;
    }
    return count;
}

// Balance each hand so that none are too long (over 8 keys wide)
function balanceClusters(leftCluster, rightCluster) {
    const HAND_LIMIT = 8;

    // Measure span in white keys
    const span = cluster => {
        if (cluster.length < 2) return 0;
        return whiteKeyDistance(cluster[0].pitch, cluster[cluster.length - 1].pitch);
    };

    let leftSpan = span(leftCluster);
    let rightSpan = span(rightCluster);

    // While left is too wide, move furthest notes to right
    while (leftSpan > HAND_LIMIT) {
        const donate = leftCluster.pop(); // Note on left that is most right
        rightCluster.unshift(donate); // Move to right
        leftSpan = span(leftCluster);
        rightSpan = span(rightCluster);
        if (rightSpan > HAND_LIMIT) break;
    }
    // While right is too wide, move furthest notes to left
    while (rightSpan > HAND_LIMIT) {
        const donate = rightCluster.shift(); // Note on right that is most left
        leftCluster.push(donate); // Move to left
        leftSpan = span(leftCluster);
        rightSpan = span(rightCluster);
        if (leftSpan > HAND_LIMIT) break;
    }

    return { leftCluster, rightCluster };
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

    // Keep clusters of notes together on same hand
    const HAND_SPAN = 8;
    const span = whiteKeyDistance(notes[0].pitch, notes[notes.length - 1].pitch);
    if (span <= HAND_SPAN) {
        const joined = notes.map(n => n.note).join('+');
        const C4 = parseNote("C4").pitch;
        const centroid = notes.reduce((sum, n) => sum + n.pitch, 0) / notes.length;
        return centroid < C4 ? { left: joined, right: '' } : { left: '', right: joined };
    }

    // Find largest gap
    let maxGap = -1;
    let gapIndex = Math.floor(notes.length / 2);
    for (let i = 0; i < notes.length - 1; i++) {
        const gap = whiteKeyDistance(notes[i].pitch, notes[i+1].pitch);
        if (gap > maxGap) {
            maxGap = gap;
            gapIndex = i + 1;
        }
    }
    // Balance each cluster
    let { leftCluster, rightCluster } = balanceClusters(notes.slice(0, gapIndex), notes.slice(gapIndex));

    // If one side is a single note and the other is a cluster, keep the cluster intact
    if (leftCluster.length === 1 && rightCluster.length > 1) {
        return { left: leftCluster[0].note, right: rightCluster.map(n => n.note).join('+') };
    }
    if (rightCluster.length === 1 && leftCluster.length > 1) {
        return { left: leftCluster.map(n => n.note).join('+'), right: rightCluster[0].note };
    }

    const left = leftCluster.map(n => n.note).join('+');
    const right = rightCluster.map(n => n.note).join('+');
    return { left, right };
}

// Main function for sorting notes into proper hands
function resortNotes() {
    let leftBlock = document.getElementById("noteInputLeft").value || '';
    let rightBlock = document.getElementById("noteInputRight").value || '';

    if (!/[A-Za-z]/.test(leftBlock)) leftBlock = "";
    if (!/[A-Za-z]/.test(rightBlock)) rightBlock = "";

    // Build ordered segments
    const leftOrdered = order(separateNotesAndDelays(leftBlock));
    const rightOrdered = order(separateNotesAndDelays(rightBlock));
    // Group only immediate pairs of notes
    const leftGrouped = groupCloseSegments(leftOrdered, 2);
    const rightGrouped = groupCloseSegments(rightOrdered, 2);

    const [A, B] = alignSegments(leftGrouped, rightGrouped);

    const outLeft = [];
    const outRight = [];

    // Track last notes assigned
    let lastLeft = [];
    let lastRight = [];


    for (let i = 0; i < A.length; i++) {
        const a = A[i];
        const b = B[i];

        let { left, right } = splitNotes(a.notesText, b.notesText);

        // Reuse last hand assignment for repeated notes
        const currentNotes = (a.notesText + (b.notesText ? '+' + b.notesText : ''))
            .split('+').map(s => s.trim()).filter(Boolean);

        currentNotes.forEach(n => {
            if (lastLeft.includes(n)) {
                left = (left ? left + '+' : '') + n;
                right = right.split('+').filter(x => x && x !== n).join('+');
            } else if (lastRight.includes(n)) {
                right = (right ? right + '+' : '') + n;
                left = left.split('+').filter(x => x && x !== n).join('+');
            }
        });

        // Split notes into hands
        if (left) {
            outLeft.push(left);
            lastLeft = left.split('+');
            lastRight = [];
        }
        if (right) {
            outRight.push(right);
            lastRight = right.split('+');
            lastLeft = [];
        }

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
