// This script is responsible for translating MIDI files into the expected input for the app

// --- Toggle auto sort ---
const toggleSort = document.getElementById("auto-sort");

// Translate midi notes to the expected note name (A1, Fs3, etc)
function midiToNoteName(midi) {
    const names = ["C","Cs","D","Ds","E","F","Fs","G","Gs","A","As","B"];
    const name = names[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return name + octave;
}

// Translate note holds into underscores
function durationToUnderscores(ticks, tpq, scale=10) {
    const quarters = ticks / tpq;
    return "_".repeat(Math.max(1, Math.round(quarters * scale)));
}

// Read the midi file and put it into a simpler structure
function parseMIDI(arrayBuffer) {
    const data = new DataView(arrayBuffer);
    let pos = 0;
    // Read characters as string
    function readStr(n) {
        let s = "";
        for (let i=0;i<n;i++) s += String.fromCharCode(data.getUint8(pos++));
        return s;
    }
    // Read bytes as integer
    function readInt(n) {
        let v=0;
        for (let i=0;i<n;i++) v = (v<<8) + data.getUint8(pos++);
        return v;
    }
    // Read variable length for delta time
    function readVarLen() {
        let v=0, b;
        do {
            b = data.getUint8(pos++);
            v = (v<<7) + (b & 0x7f);
        } while (b & 0x80);
            return v;
    }

    // Read header of midi
    if (readStr(4)!=="MThd") throw "Not a MIDI file";
        readInt(4);
        readInt(2);
        const trackNum = readInt(2); // Number of tracks
        const division = readInt(2); // Ticks per quarter note
        const tracks = [];

        // Read each track
        for (let t=0;t<trackNum;t++) {
        if (readStr(4)!=="MTrk") throw "Missing track";
        const len = readInt(4);
        const end = pos+len;
        let time=0;
        const events=[];
        let runningStatus=null;
        while (pos<end) {
            time += readVarLen(); // Add delta time
            // Handle running status
            let status = data.getUint8(pos);
            if (status<0x80) {
            status = runningStatus;
            } else {
            pos++;
            runningStatus=status;
            }
            // Note on/off events
            if ((status & 0xf0)===0x90 || (status & 0xf0)===0x80) {
            const pitch = data.getUint8(pos++);
            const vel = data.getUint8(pos++);
            const type = (status & 0xf0)===0x90 && vel>0 ? "on":"off";
            events.push({time, pitch, vel, type, channel: status&0x0f});
            } else {
                // Skip other event types
                if (status===0xff) { pos++; const l=readVarLen(); pos+=l; }
                else if ((status & 0xf0)===0xc0 || (status & 0xf0)===0xd0) pos++;
                else { pos+=2; }
            }
        }
        tracks.push({events});
    }
    return {division, tracks};
}

// Get user input, read it and get the note strings
document.getElementById("midiFile").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Read file into ArrayBuffer
    const buf = await file.arrayBuffer();
    const midi = parseMIDI(buf);

    const allNotes = [];

    // Only use first two tracks assuming 0 = right, 1 = left
    midi.tracks.slice(0, 2).forEach((track, tIndex) => {
        const hand = (tIndex === 0) ? "right" : "left";
        const active = {};
        track.events.forEach(ev => {
            if (ev.type === "on") {
                if (active[ev.pitch] == null) {
                    active[ev.pitch] = ev.time;
                }
            } else if (ev.type === "off" && active[ev.pitch] != null) {
                const dur = ev.time - active[ev.pitch];
                if (dur > 0) {
                    allNotes.push({ start: active[ev.pitch], dur, pitch: ev.pitch, hand });
                }
                delete active[ev.pitch];
            }
        });
    });

    // Build a timeline of all note start/end times
    const tpq = midi.division;
    const times = new Set();
    allNotes.forEach(n => {
        times.add(n.start);
        times.add(n.start + n.dur);
    });
    const timeline = Array.from(times).sort((a,b)=>a-b);
    let rightStr = "", leftStr = "";

    // Walk through each slice of time and build a text output
    for (let i=0; i<timeline.length-1; i++) {
        const t0 = timeline[i], t1 = timeline[i+1];
        const sliceDur = t1 - t0;

        if (toggleSort && toggleSort.checked) {
            // Combine both hands into the right hand output
            const combinedNew = allNotes.filter(n => n.start === t0);
            const combinedChord = combinedNew.length ? combinedNew.map(n=>midiToNoteName(n.pitch)).sort().join("+") : "";
            const underscores = durationToUnderscores(sliceDur, tpq);
            
            if (combinedChord) {
                rightStr += combinedChord + underscores;
            } else {
                rightStr += underscores;
            }
            leftStr = ""; // Keep left empty for merged view
        } else {
            // Separate tracks
            const rightNew = allNotes.filter(n => n.hand==="right" && n.start === t0);
            const leftNew  = allNotes.filter(n => n.hand==="left"  && n.start === t0);
            
            const rightChord = rightNew.length ? rightNew.map(n=>midiToNoteName(n.pitch)).sort().join("+") : "";
            const leftChord  = leftNew.length  ? leftNew.map(n=>midiToNoteName(n.pitch)).sort().join("+") : "";
            const underscores = durationToUnderscores(sliceDur, tpq);

            if (rightChord) {
                rightStr += rightChord + underscores;
            } else {
                rightStr += underscores;
            }
            if (leftChord) {
                leftStr += leftChord + underscores;
            } else {
                leftStr += underscores;
            }
        }
    }

    // Add the output to the note input area in html
    document.getElementById("noteInputRight").value = rightStr;
    document.getElementById("noteInputLeft").value  = leftStr;

    if (toggleSort && toggleSort.checked) {
        // Call resortNotes() to split them properly
        if (typeof resortNotes === 'function') {
            resortNotes();
        }
    }
    
    // Reset music select dropdown box
    const musicSelect = document.getElementById("musicSelect");
    if (musicSelect) {
        musicSelect.selectedIndex = 0;
    }
});