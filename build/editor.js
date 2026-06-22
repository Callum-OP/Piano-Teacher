// Custom Music Editor — a piano-roll view over the app's note-string format.
// The pure model/serialisation/edit ops are DOM-free and unit-tested; the
// rendering and wiring below only run in the browser (guarded with null checks).
//
// Model: notes carry an absolute onset time (in underscore "units", 1 unit = 75ms):
//   grid = { notes: [ { time, note, hand } ], totalUnits }
// Playback aligns the two hands by absolute time (cumulative underscores), so an
// absolute-time model round-trips note onsets exactly — unlike pairing by token index.

// In Node (tests) pull helpers from utils; in the browser they are already globals.
if (typeof module !== "undefined" && typeof require === "function") {
    var { normalise, translateNote, transformNote, noteToPitch, pitchToNoteName } = require("./utils.js");
}

// =====================================================================
// Pure model
// =====================================================================

// Canonical note name from a raw token (handles ^v octaves, #, case): "c#4" -> "Cs4"
function canonicalNote(tok) {
    return transformNote(translateNote(tok.replace(/_/g, "")));
}

// Order a chord's notes low -> high
function sortNotes(arr) {
    return arr.sort((a, b) => (noteToPitch(a) || 0) - (noteToPitch(b) || 0));
}

// Parse one hand's note string into onsets. `units` (underscores, min 1) advances time.
function parseHandToNotes(str, hand) {
    let T = 0;
    const notes = [];
    const entries = normalise(str || "").split(",").map(e => e.trim()).filter(Boolean);
    for (const entry of entries) {
        const units = Math.max(1, (entry.match(/_/g) || []).length);
        if (!/^_+$/.test(entry)) {
            entry.split("+").map(t => t.replace(/_/g, "")).filter(Boolean)
                .forEach(tok => notes.push({ time: T, note: canonicalNote(tok), hand, len: units }));
        }
        T += units;
    }
    return { notes, endsAt: T };
}

// Build the grid from the two hand strings
function musicToGrid(left, right) {
    const L = parseHandToNotes(left, "left");
    const R = parseHandToNotes(right, "right");
    return { notes: L.notes.concat(R.notes), totalUnits: Math.max(L.endsAt, R.endsAt, 1) };
}

// Serialise one hand's onsets back to a string. For each onset the underscores are
// the gap to the next onset (absorbing rests); the last onset uses its own length.
function handString(handNotes) {
    if (!handNotes.length) return "";
    const byTime = new Map();
    handNotes.forEach(n => {
        if (!byTime.has(n.time)) byTime.set(n.time, { notes: [], len: 1 });
        const e = byTime.get(n.time);
        e.notes.push(n.note);
        e.len = Math.max(e.len, n.len || 1);
    });
    const times = [...byTime.keys()].sort((a, b) => a - b);
    let str = "";
    if (times[0] > 0) str += "_".repeat(times[0]); // leading rest
    for (let i = 0; i < times.length; i++) {
        const t = times[i];
        const e = byTime.get(t);
        const chord = sortNotes(e.notes.slice()).join("+");
        const nextT = (i + 1 < times.length) ? times[i + 1] : (t + e.len); // last onset extends by its length
        str += chord + "_".repeat(Math.max(1, nextT - t));
    }
    return str;
}

function gridTotalUnits(grid) {
    return grid.notes.reduce((m, n) => Math.max(m, n.time + (n.len || 1)), 1);
}

// Serialise the grid back to { left, right } (compatible with autoPlay())
function gridToMusic(grid) {
    return {
        left: handString(grid.notes.filter(n => n.hand === "left")),
        right: handString(grid.notes.filter(n => n.hand === "right"))
    };
}

// --- Edit operations (mutate and return the grid; no DOM) ---
function hasNote(grid, time, note, hand) {
    return grid.notes.some(n => n.time === time && n.note === note && n.hand === hand);
}

function toggleNote(grid, time, note, hand, len = 2) {
    const h = (hand === "left" || hand === "Left") ? "left" : "right";
    const i = grid.notes.findIndex(n => n.time === time && n.note === note && n.hand === h);
    if (i >= 0) grid.notes.splice(i, 1);
    else grid.notes.push({ time, note, hand: h, len: Math.max(1, len | 0) });
    grid.totalUnits = gridTotalUnits(grid);
    return grid;
}

// Find a note in the given hand on the given key whose span [time, time+len) covers `time`
function noteAt(grid, time, note, hand) {
    return grid.notes.find(n =>
        n.note === note && n.hand === hand && time >= n.time && time < n.time + (n.len || 1));
}

// Set a note's length (units, >= 1). For a note that has later notes in its hand,
// "length" is the spacing to the next one, so we ripple the rest of that hand by
// the change (which is what turns into underscores in the output). The last note
// in a hand just stores its trailing length.
function setNoteLen(grid, note, len) {
    if (!note) return grid;
    const newLen = Math.max(1, len | 0);
    let nextOnset = Infinity;
    grid.notes.forEach(n => {
        if (n.hand === note.hand && n.time > note.time && n.time < nextOnset) nextOnset = n.time;
    });
    const curEff = (nextOnset === Infinity) ? (note.len || 1) : (nextOnset - note.time);
    const delta = newLen - curEff;
    note.len = newLen;
    if (nextOnset !== Infinity && delta !== 0) {
        grid.notes.forEach(n => { if (n.hand === note.hand && n.time > note.time) n.time += delta; });
    }
    grid.totalUnits = gridTotalUnits(grid);
    return grid;
}

// Move a note to a new time / key / hand (mutates the note object in place)
function moveNote(grid, note, time, name, hand) {
    if (!note) return grid;
    note.time = Math.max(0, time | 0);
    if (name) note.note = name;
    if (hand) note.hand = (hand === "left" || hand === "Left") ? "left" : "right";
    grid.totalUnits = gridTotalUnits(grid);
    return grid;
}

// Flip a note (at a given time) to the other hand
function changeNoteHand(grid, time, note) {
    grid.notes.forEach(n => {
        if (n.time === time && n.note === note) n.hand = (n.hand === "left" ? "right" : "left");
    });
    return grid;
}

// Insert empty time before atTime (shifts later notes right)
function insertColumn(grid, atTime, count = 1) {
    grid.notes.forEach(n => { if (n.time >= atTime) n.time += count; });
    grid.totalUnits = gridTotalUnits(grid);
    return grid;
}

// Remove the time slice at atTime (drops notes there, pulls later notes left)
function deleteColumn(grid, atTime) {
    grid.notes = grid.notes.filter(n => n.time !== atTime);
    grid.notes.forEach(n => { if (n.time > atTime) n.time -= 1; });
    grid.totalUnits = gridTotalUnits(grid);
    return grid;
}

// Ordered note names for grid rows, highest pitch first (top row)
function pitchRangeToRows(minPitch, maxPitch) {
    const rows = [];
    for (let p = maxPitch; p >= minPitch; p--) rows.push(pitchToNoteName(p));
    return rows;
}

function isBlackPitch(p) {
    const s = ((p % 12) + 12) % 12;
    return s === 1 || s === 3 || s === 6 || s === 8 || s === 10;
}

// Build the app's piano keyboard geometry for a pitch range. White keys are
// `whiteW` wide and laid out left-to-right; black keys are narrower and centred
// on the boundary between their two white neighbours — matching the #piano SVG
// (whiteW 30 reproduces its exact x positions: C2=0, Cs2=21, D2=30, ...).
function pianoLayout(minPitch, maxPitch, whiteW = 30) {
    const blackW = Math.round(whiteW * 0.6);
    const whiteX = {};
    const keys = [];
    let wi = 0;
    for (let p = minPitch; p <= maxPitch; p++) {
        if (!isBlackPitch(p)) {
            whiteX[p] = wi * whiteW;
            keys.push({ pitch: p, note: pitchToNoteName(p), x: wi * whiteW, width: whiteW, black: false });
            wi++;
        }
    }
    const width = wi * whiteW;
    for (let p = minPitch; p <= maxPitch; p++) {
        if (isBlackPitch(p)) {
            const lx = whiteX[p - 1] != null ? whiteX[p - 1] : -whiteW; // left white neighbour
            keys.push({ pitch: p, note: pitchToNoteName(p), x: lx + whiteW - blackW / 2, width: blackW, black: true });
        }
    }
    return { keys, width, whiteW, blackW };
}

// Which key is at an x position? Black keys sit on top, so test them first.
function keyAtX(layout, x) {
    for (const k of layout.keys) if (k.black && x >= k.x && x < k.x + k.width) return k;
    for (const k of layout.keys) if (!k.black && x >= k.x && x < k.x + k.width) return k;
    return null;
}

// =====================================================================
// Browser rendering & wiring (guarded; verified via jsdom smoke test)
// =====================================================================
const EDITOR = { grid: { notes: [], totalUnits: 1 }, hand: "right", tool: "right", lastHand: "right", editing: false, lastScrubTime: null, defaultLen: 2, drag: null };
const UNIT_PX = 18;   // vertical pixels per time unit
const PAD_UNITS = 6;  // extra blank time at the top to click into
const RESIZE_EDGE = 7; // px from a note's top edge that starts a length-resize drag

// Default length for newly placed notes (units), via the toolbar +/- buttons
function changeDefaultLen(delta) {
    EDITOR.defaultLen = Math.max(1, (EDITOR.defaultLen || 2) + delta);
    const el = document.getElementById("editor-len-val");
    if (el) el.textContent = EDITOR.defaultLen;
}

function getEditorRange() {
    if (typeof getPianoPitchRange === "function") {
        const r = getPianoPitchRange();
        if (r) return r;
    }
    return { min: 24, max: 71 }; // fallback: standard C2..B5
}

// Live key geometry from the REAL piano, so the grid lines up with the actual keys
function liveKeyLayout(hostRect) {
    const keys = [];
    const piano = (typeof activePiano !== "undefined" && activePiano)
        ? activePiano : document.getElementById("piano-standard");
    if (!piano) return { keys };
    piano.querySelectorAll("[data-note]").forEach(el => {
        const r = el.getBoundingClientRect();
        keys.push({
            note: el.dataset.note, x: r.left - hostRect.left, width: r.width,
            black: el.classList.contains("black-key")
        });
    });
    return { keys };
}

function loadCurrentIntoEditor() {
    const leftEl = document.getElementById("noteInputLeft");
    const rightEl = document.getElementById("noteInputRight");
    EDITOR.grid = musicToGrid(leftEl ? leftEl.value : "", rightEl ? rightEl.value : "");
    renderEditorOverlay(false); // jump to the start (bottom)
}

function applyEditorToInputs() {
    const { left, right } = gridToMusic(EDITOR.grid);
    const leftEl = document.getElementById("noteInputLeft");
    const rightEl = document.getElementById("noteInputRight");
    if (leftEl) leftEl.value = left;
    if (rightEl) rightEl.value = right;
    const musicSelect = document.getElementById("musicSelect");
    if (musicSelect) musicSelect.selectedIndex = 0;
}

function clearEditor() {
    EDITOR.grid = { notes: [], totalUnits: 1 };
    renderEditorOverlay(false);
}

// Tool selector: "left"/"right" act like a pen for that hand (tap empty = add,
// tap a note = set it to that hand); "erase" deletes the tapped note. Touch-friendly.
function setEditorTool(tool) {
    EDITOR.tool = (tool === "erase") ? "erase" : (tool === "left" || tool === "Left") ? "left" : "right";
    if (EDITOR.tool !== "erase") {
        EDITOR.hand = EDITOR.tool;     // new notes go to the pen's hand
        EDITOR.lastHand = EDITOR.tool; // remember it for toggling out of Erase
    }
    ["left", "right", "erase"].forEach(t => {
        const btn = document.getElementById("editor-tool-" + t);
        if (btn) btn.classList.toggle("active", EDITOR.tool === t);
    });
}

// Erase button toggles: tap once to erase, tap again to return to the last hand tool
function toggleEraseTool() {
    setEditorTool(EDITOR.tool === "erase" ? (EDITOR.lastHand || "right") : "erase");
}

// Back-compat alias
function setEditorHand(hand) { setEditorTool(hand === "left" || hand === "Left" ? "left" : "right"); }

// Place a note (default length) or remove the one under the cell. Used by the
// click/tap path and the smoke test.
function editorToggleCell(time, noteName) {
    if (!noteName || time < 0) return;
    const existing = noteAt(EDITOR.grid, time, noteName, EDITOR.hand);
    if (existing) {
        EDITOR.grid.notes.splice(EDITOR.grid.notes.indexOf(existing), 1);
        EDITOR.grid.totalUnits = gridTotalUnits(EDITOR.grid);
    } else {
        toggleNote(EDITOR.grid, time, noteName, EDITOR.hand, EDITOR.defaultLen);
    }
    renderEditorOverlay(true);
}

// Find the grid note backing a rendered note element
function findNoteByEl(el) {
    if (!el) return null;
    const time = parseInt(el.dataset.time, 10);
    return EDITOR.grid.notes.find(n => n.time === time && n.note === el.dataset.note && n.hand === el.dataset.hand);
}

// Render the editable note grid directly above the real piano, aligned to its keys.
// Time 0 sits at the bottom (next to the keys); later notes are higher up.
function renderEditorOverlay(preserveScroll) {
    const host = document.getElementById("editor-overlay");
    if (!host) return;
    if (!EDITOR.editing) { host.innerHTML = ""; return; }

    const prevScroll = host.scrollTop;
    const total = Math.max(EDITOR.grid.totalUnits, 1) + PAD_UNITS;
    const contentH = total * UNIT_PX;

    host.innerHTML = "";
    const content = document.createElement("div");
    content.className = "editor-content";
    content.style.height = contentH + "px";
    host.appendChild(content);

    const hostRect = host.getBoundingClientRect();
    // A note's drawn length is the spacing to the next note in its hand (legato),
    // so the bar height matches the underscores it serialises to. The last note
    // in a hand uses its own stored length.
    const onsetsByHand = { left: [], right: [] };
    EDITOR.grid.notes.forEach(n => onsetsByHand[n.hand] && onsetsByHand[n.hand].push(n.time));
    onsetsByHand.left.sort((a, b) => a - b);
    onsetsByHand.right.sort((a, b) => a - b);
    const effLen = (n) => {
        const next = onsetsByHand[n.hand].find(t => t > n.time);
        return (next != null) ? (next - n.time) : Math.max(1, n.len || 1);
    };
    // Draw notes over their real keys (white-key notes first, black on top)
    const draw = (n) => {
        const rects = (typeof getRects === "function") ? getRects(n.note) : null;
        if (!rects || !rects.keyRect) return; // out of range / no key
        const k = rects.keyRect;
        const len = effLen(n);
        const div = document.createElement("div");
        div.className = "editor-note " + (n.hand === "right" ? "right" : "left");
        div.style.left = (k.left - hostRect.left) + "px";
        div.style.width = k.width + "px";
        div.style.top = (contentH - (n.time + len) * UNIT_PX) + "px";
        div.style.height = (len * UNIT_PX - 2) + "px";
        div.dataset.time = n.time;
        div.dataset.note = n.note;
        div.dataset.hand = n.hand;
        content.appendChild(div);
    };
    EDITOR.grid.notes.filter(n => !/s/.test(n.note)).forEach(draw);
    EDITOR.grid.notes.filter(n => /s/.test(n.note)).forEach(draw);

    host.scrollTop = preserveScroll ? prevScroll : host.scrollHeight; // start at bottom on load
}

// Time at a pointer's Y position (continuous=false floors to a unit)
function editorTimeAtY(clientY, round) {
    const host = document.getElementById("editor-overlay");
    const content = host && host.querySelector(".editor-content");
    if (!content) return 0;
    const contentRect = content.getBoundingClientRect();
    const v = (content.offsetHeight - (clientY - contentRect.top)) / UNIT_PX;
    return round ? Math.round(v) : Math.floor(v);
}

// Remove a note from the grid
function editorDeleteNote(note) {
    const i = EDITOR.grid.notes.indexOf(note);
    if (i < 0) return;
    EDITOR.grid.notes.splice(i, 1);
    EDITOR.grid.totalUnits = gridTotalUnits(EDITOR.grid);
    renderEditorOverlay(true);
}

// Set a note to a specific hand (no-op if already that hand)
function editorSetNoteHand(note, hand) {
    if (!note || note.hand === hand) return;
    note.hand = hand;
    renderEditorOverlay(true);
}

// Right-click a note to flip its hand (desktop convenience; mobile uses the Left/Right tools)
function onEditorContextMenu(e) {
    if (!EDITOR.editing) return;
    const noteEl = e.target && e.target.closest ? e.target.closest(".editor-note") : null;
    if (!noteEl) return;
    e.preventDefault();
    const n = findNoteByEl(noteEl);
    if (n) editorSetNoteHand(n, n.hand === "left" ? "right" : "left");
}

// Press: start a drag (move a note, or resize its length from the top edge) when
// a hand tool is active; the Erase tool just taps to delete; empty space taps to add.
function onEditorPointerDown(e) {
    if (!EDITOR.editing) return;
    if (e.button && e.button !== 0) return; // ignore right/middle button
    const host = document.getElementById("editor-overlay");
    if (!host) return;
    const noteEl = e.target && e.target.closest ? e.target.closest(".editor-note") : null;
    if (noteEl) {
        const note = findNoteByEl(noteEl);
        if (EDITOR.tool === "erase") {
            EDITOR.drag = { note, mode: "tap", moved: false, startX: e.clientX, startY: e.clientY };
        } else {
            const rect = noteEl.getBoundingClientRect();
            const nearTop = (e.clientY - rect.top) <= RESIZE_EDGE;
            EDITOR.drag = { note, mode: nearTop ? "resize" : "move", moved: false, startX: e.clientX, startY: e.clientY };
        }
    } else {
        EDITOR.drag = { note: null, mode: "add", moved: false, startX: e.clientX, startY: e.clientY };
    }
    document.addEventListener("pointermove", onEditorPointerMove);
    document.addEventListener("pointerup", onEditorPointerUp);
}

function onEditorPointerMove(e) {
    const d = EDITOR.drag;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.startX) < 3 && Math.abs(e.clientY - d.startY) < 3) return;
    d.moved = true;
    if (!d.note || (d.mode !== "move" && d.mode !== "resize")) return; // only hand tools drag-edit
    const host = document.getElementById("editor-overlay");
    const hostRect = host.getBoundingClientRect();
    if (d.mode === "move") {
        const key = keyAtX(liveKeyLayout(hostRect), e.clientX - hostRect.left);
        moveNote(EDITOR.grid, d.note, Math.max(0, editorTimeAtY(e.clientY, false)), key ? key.note : d.note.note, d.note.hand);
    } else if (d.mode === "resize") {
        setNoteLen(EDITOR.grid, d.note, editorTimeAtY(e.clientY, true) - d.note.time);
    }
    renderEditorOverlay(true);
}

function onEditorPointerUp(e) {
    document.removeEventListener("pointermove", onEditorPointerMove);
    document.removeEventListener("pointerup", onEditorPointerUp);
    const d = EDITOR.drag;
    EDITOR.drag = null;
    if (!d || d.moved) return; // a real drag already mutated the grid
    // A tap, behaviour depends on the current tool
    if (d.note) {
        if (EDITOR.tool === "erase") editorDeleteNote(d.note);
        else editorSetNoteHand(d.note, EDITOR.tool); // Left/Right tool sets the note's hand
    } else if (EDITOR.tool !== "erase") {
        // Empty tap with a hand tool: add a note (deletion is the Erase tool's job)
        const host = document.getElementById("editor-overlay");
        const rect = host.getBoundingClientRect();
        const key = keyAtX(liveKeyLayout(rect), e.clientX - rect.left);
        const time = editorTimeAtY(e.clientY, false);
        if (key && time >= 0 && !noteAt(EDITOR.grid, time, key.note, EDITOR.hand)) {
            toggleNote(EDITOR.grid, time, key.note, EDITOR.hand, EDITOR.defaultLen);
            renderEditorOverlay(true);
        }
    }
}

// Scroll = scrub: play notes as they pass the playhead (the keyboard line)
function onEditorScroll() {
    if (!EDITOR.editing) return;
    const host = document.getElementById("editor-overlay");
    const content = host && host.querySelector(".editor-content");
    if (!content) return;
    const playY = host.scrollTop + host.clientHeight; // playhead = bottom edge
    const time = Math.floor((content.offsetHeight - playY) / UNIT_PX);
    if (time === EDITOR.lastScrubTime || time < 0) return;
    EDITOR.lastScrubTime = time;
    EDITOR.grid.notes.filter(n => n.time === time).forEach(n => {
        if (typeof playNote === "function") playNote(`./sounds/${n.note.toLowerCase()}.ogg`, n.note);
        if (typeof highlightKey === "function") highlightKey(n.note, 200, n.hand === "right" ? "Right" : "Left");
    });
}

// Enter / leave edit mode (a mode of the existing page, not a separate view)
function setEditMode(on) {
    EDITOR.editing = on;
    document.body.classList.toggle("editor-mode", on);
    const btn = document.getElementById("edit-toggle-btn");
    if (btn) btn.textContent = on ? "Done editing" : "Editor Mode";
    if (on) {
        if (typeof stopAll === "function") stopAll(); // stop autoplay + clear falling notes first
        loadCurrentIntoEditor();
    } else {
        applyEditorToInputs(); // keep edits when leaving
        const host = document.getElementById("editor-overlay");
        if (host) host.innerHTML = "";
    }
}
function toggleEditMode() { setEditMode(!EDITOR.editing); }

// Re-align the overlay after the piano changes (octave shift, extend/unextend, resize).
// Called from updatePiano() in script.js so the grid follows the real keys.
function refreshEditorLayout() {
    if (EDITOR.editing) renderEditorOverlay(true);
}

// Apply pending edits and leave edit mode. Called by the existing transport Play
// button so the user doesn't need a separate editor Play.
function applyAndExitEditMode() {
    if (EDITOR.editing) setEditMode(false); // setEditMode(false) writes the edits to the inputs
}

document.addEventListener("DOMContentLoaded", () => {
    setEditorTool("right");
    const lenEl = document.getElementById("editor-len-val");
    if (lenEl) lenEl.textContent = EDITOR.defaultLen;
    const host = document.getElementById("editor-overlay");
    if (host) {
        host.addEventListener("pointerdown", onEditorPointerDown);
        host.addEventListener("contextmenu", onEditorContextMenu);
        host.addEventListener("scroll", onEditorScroll);
    }
    // Resize/octave/extend re-alignment is driven by updatePiano() -> refreshEditorLayout()
});

// Export pure functions for tests
if (typeof module !== "undefined") {
    module.exports = {
        parseHandToNotes, musicToGrid, gridToMusic, gridTotalUnits,
        hasNote, toggleNote, noteAt, setNoteLen, moveNote, changeNoteHand,
        insertColumn, deleteColumn, pitchRangeToRows, isBlackPitch, pianoLayout, keyAtX
    };
}
