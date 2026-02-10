// Map note letters
const noteOffsets = {
    C:0, Cs:1, D:2, Ds:3, E:4, F:5, Fs:6,
    G:7, Gs:8, A:9, As:10, B:11
};

// Split a note string into letter, octave, and pitch
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

// Split input into note segments and delay segments
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

// Order segments with their following delays
function order(segments) {
    const ordered = [];
    let i = 0;
    while (i < segments.length) {
        const seg = segments[i];
        if (seg.type === 'notes') {
            const next = segments[i + 1];
            const delayAfter = next && next.type === 'delay' ? next.text : '';
            ordered.push({ type: 'segment', notesText: seg.text.trim(), delayAfter });
            i += delayAfter ? 2 : 1;
        } else if (seg.type === 'delay') {
            ordered.push({ type: 'segment', notesText: '', delayAfter: seg.text });
            i += 1;
        } else {
            i += 1;
        }
    }
    return ordered;
}

// Align two segments by index
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

// Check if a pitch is a white key
function isWhiteKey(pitch) {
    const offset = pitch % 12;
    return [0,2,4,5,7,9,11].includes(offset);
}

// Count white keys between two pitches
function whiteKeyDistance(p1, p2) {
    let count = 0;
    for (let p = p1 + 1; p <= p2; p++) {
        if (isWhiteKey(p)) count++;
    }
    return count;
}

// Calculate span of a note cluster in white keys
function calculateSpan(cluster) {
    if (cluster.length < 2) return 0;
    return whiteKeyDistance(cluster[0].pitch, cluster[cluster.length - 1].pitch);
}

// Balance clusters to keep them within hand span limits
function balanceClusters(leftCluster, rightCluster) {
    const HAND_LIMIT = 8;

    let leftSpan = calculateSpan(leftCluster);
    let rightSpan = calculateSpan(rightCluster);

    // Move notes from left to right if left is too wide
    while (leftSpan > HAND_LIMIT && leftCluster.length > 1) {
        const donate = leftCluster.pop();
        rightCluster.unshift(donate);
        leftSpan = calculateSpan(leftCluster);
        rightSpan = calculateSpan(rightCluster);
        if (rightSpan > HAND_LIMIT) break;
    }

    // Move notes from right to left if right is too wide
    while (rightSpan > HAND_LIMIT && rightCluster.length > 1) {
        const donate = rightCluster.shift();
        leftCluster.push(donate);
        leftSpan = calculateSpan(leftCluster);
        rightSpan = calculateSpan(rightCluster);
        if (leftSpan > HAND_LIMIT) break;
    }

    return { leftCluster, rightCluster };
}

// Check the context to determine if notes should be split or grouped
function shouldSplitNotes(notes, prevLeftPitch, prevRightPitch, nextLeftPitch, nextRightPitch) {
    if (notes.length <= 1) return false;
    
    const span = whiteKeyDistance(notes[0].pitch, notes[notes.length - 1].pitch);
    const MAX_ONE_HAND_SPAN = 8;
    
    // Must split if span is too large
    if (span > MAX_ONE_HAND_SPAN) return true;
    
    // If comfortable for one hand, check context
    if (span <= 5) {
        // Look at previous and next notes to see if splitting makes more sense
        const lowestPitch = notes[0].pitch;
        const highestPitch = notes[notes.length - 1].pitch;
        const C4 = parseNote("C4").pitch;
        
        // If we have context from both sides, use it
        if (prevLeftPitch != null && prevRightPitch != null && 
            nextLeftPitch != null && nextRightPitch != null) {
            
            // Check if there's a clear left/right pattern in context
            const prevLeftLow = prevLeftPitch < C4;
            const prevRightHigh = prevRightPitch >= C4;
            const nextLeftLow = nextLeftPitch < C4;
            const nextRightHigh = nextRightPitch >= C4;
            
            // If context suggests alternating hands, consider splitting
            if (prevLeftLow && prevRightHigh && nextLeftLow && nextRightHigh) {
                // Check if current notes span both territories
                if (lowestPitch < C4 && highestPitch >= C4) {
                    return true;
                }
            }
        }
        
        // Don't split if comfortable for one hand and no strong context
        return false;
    }
    
    // For medium spans (6-8), be more likely to split if crossing C4
    const C4 = parseNote("C4").pitch;
    const crossesMiddle = notes[0].pitch < C4 && notes[notes.length - 1].pitch >= C4;
    
    return crossesMiddle;
}

// Find the best split point for a set of notes
function findBestSplitPoint(notes, prevLeftPitch, prevRightPitch) {
    if (notes.length <= 1) return 0;
    
    const C4 = parseNote("C4").pitch;
    let maxGap = -1;
    let gapIndex = Math.floor(notes.length / 2);
    
    // Look for the largest gap, preferring splits near C4
    for (let i = 0; i < notes.length - 1; i++) {
        const gap = whiteKeyDistance(notes[i].pitch, notes[i+1].pitch);
        const avgPitch = (notes[i].pitch + notes[i+1].pitch) / 2;
        const distanceFromC4 = Math.abs(avgPitch - C4);
        
        // Bonus for splits near C4
        const adjustedGap = gap + (distanceFromC4 < 6 ? 2 : 0);
        
        if (adjustedGap > maxGap) {
            maxGap = gap;
            gapIndex = i + 1;
        }
    }
    
    // Use previous context to refine split point
    if (prevLeftPitch != null && prevRightPitch != null) {
        // Find split that best continues previous hand assignments
        let bestScore = -1000;
        let bestIndex = gapIndex;
        
        for (let i = 1; i < notes.length; i++) {
            const leftNotes = notes.slice(0, i);
            const rightNotes = notes.slice(i);
            
            const leftAvg = leftNotes.reduce((s, n) => s + n.pitch, 0) / leftNotes.length;
            const rightAvg = rightNotes.reduce((s, n) => s + n.pitch, 0) / rightNotes.length;
            
            // Score based on continuity with previous notes
            const leftContinuity = -Math.abs(leftAvg - prevLeftPitch);
            const rightContinuity = -Math.abs(rightAvg - prevRightPitch);
            const score = leftContinuity + rightContinuity;
            
            if (score > bestScore) {
                bestScore = score;
                bestIndex = i;
            }
        }
        
        gapIndex = bestIndex;
    }
    
    return gapIndex;
}

// Split notes into left and right hands with context awareness
function splitNotes(leftNotesText, rightNotesText, context = {}) {
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

    // Single note - assign based on position and context
    if (notes.length === 1) {
        const single = notes[0];
        const C4 = parseNote("C4").pitch;
        
        // Use context if available
        if (context.prevLeftPitch != null && context.prevRightPitch != null) {
            const distToLeft = Math.abs(single.pitch - context.prevLeftPitch);
            const distToRight = Math.abs(single.pitch - context.prevRightPitch);
            
            if (distToLeft < distToRight) {
                return { left: single.note, right: '' };
            } else {
                return { left: '', right: single.note };
            }
        }
        
        // Default to C4 split
        return single.pitch < C4
            ? { left: single.note, right: '' }
            : { left: '', right: single.note };
    }

    // Check if we should split or keep together
    const shouldSplit = shouldSplitNotes(
        notes, 
        context.prevLeftPitch, 
        context.prevRightPitch,
        context.nextLeftPitch,
        context.nextRightPitch
    );

    // If keeping together, decide which hand
    if (!shouldSplit) {
        const joined = notes.map(n => n.note).join('+');
        const C4 = parseNote("C4").pitch;
        const centroid = notes.reduce((sum, n) => sum + n.pitch, 0) / notes.length;
        
        // Use context to decide hand
        if (context.prevLeftPitch != null && context.prevRightPitch != null) {
            const distToLeft = Math.abs(centroid - context.prevLeftPitch);
            const distToRight = Math.abs(centroid - context.prevRightPitch);
            
            if (distToLeft < distToRight) {
                return { left: joined, right: '' };
            } else {
                return { left: '', right: joined };
            }
        }
        
        return centroid < C4 ? { left: joined, right: '' } : { left: '', right: joined };
    }

    // Split the notes
    const splitIndex = findBestSplitPoint(notes, context.prevLeftPitch, context.prevRightPitch);
    let { leftCluster, rightCluster } = balanceClusters(
        notes.slice(0, splitIndex), 
        notes.slice(splitIndex)
    );

    // Ensure no hand crossing (left should never be right of right)
    if (leftCluster.length > 0 && rightCluster.length > 0) {
        const leftMax = leftCluster[leftCluster.length - 1].pitch;
        const rightMin = rightCluster[0].pitch;
        
        if (leftMax > rightMin) {
            // Fix the crossing by moving notes
            while (leftCluster.length > 0 && leftCluster[leftCluster.length - 1].pitch > rightMin) {
                rightCluster.unshift(leftCluster.pop());
            }
        }
    }

    const left = leftCluster.map(n => n.note).join('+');
    const right = rightCluster.map(n => n.note).join('+');
    return { left, right };
}

// Get average pitch of a note string
function getAveragePitch(noteText) {
    if (!noteText) return null;
    const notes = noteText.split('+').map(parseNote).filter(n => n);
    if (notes.length === 0) return null;
    return notes.reduce((sum, n) => sum + n.pitch, 0) / notes.length;
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

    const [A, B] = alignSegments(leftOrdered, rightOrdered);

    const outLeft = [];
    const outRight = [];

    // Track context
    let prevLeftPitch = null;
    let prevRightPitch = null;

    for (let i = 0; i < A.length; i++) {
        const a = A[i];
        const b = B[i];

        // Look ahead for context
        const nextA = A[i + 1];
        const nextB = B[i + 1];
        const nextLeftPitch = nextA ? getAveragePitch(nextA.notesText) : null;
        const nextRightPitch = nextB ? getAveragePitch(nextB.notesText) : null;

        // Split notes with context
        let { left, right } = splitNotes(a.notesText, b.notesText, {
            prevLeftPitch,
            prevRightPitch,
            nextLeftPitch,
            nextRightPitch
        });

        // Ensure no hand crossing in output
        if (left && right) {
            const leftNotes = left.split('+').map(parseNote).filter(n => n);
            const rightNotes = right.split('+').map(parseNote).filter(n => n);
            
            if (leftNotes.length > 0 && rightNotes.length > 0) {
                const leftMax = Math.max(...leftNotes.map(n => n.pitch));
                const rightMin = Math.min(...rightNotes.map(n => n.pitch));
                
                // If left hand is playing above right hand, reassign
                if (leftMax > rightMin) {
                    const allNotes = [...leftNotes, ...rightNotes].sort((a, b) => a.pitch - b.pitch);
                    const C4 = parseNote("C4").pitch;
                    const splitPoint = allNotes.findIndex(n => n.pitch >= C4);
                    
                    if (splitPoint > 0 && splitPoint < allNotes.length) {
                        left = allNotes.slice(0, splitPoint).map(n => n.note).join('+');
                        right = allNotes.slice(splitPoint).map(n => n.note).join('+');
                    } else {
                        // Put all on appropriate side
                        const avg = allNotes.reduce((s, n) => s + n.pitch, 0) / allNotes.length;
                        if (avg < C4) {
                            left = allNotes.map(n => n.note).join('+');
                            right = '';
                        } else {
                            left = '';
                            right = allNotes.map(n => n.note).join('+');
                        }
                    }
                }
            }
        }

        // Output notes
        if (left) {
            outLeft.push(left);
            prevLeftPitch = getAveragePitch(left);
        }
        if (right) {
            outRight.push(right);
            prevRightPitch = getAveragePitch(right);
        }

        // Handle delays
        const delay = (a.delayAfter && b.delayAfter)
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