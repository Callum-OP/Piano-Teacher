// --- Audio setup ---
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeAudio = {};

// --- Music library select ---
// Set up default music to choose from
let musicLibrary = [];
const musicSelect = document.getElementById("musicSelect");
fetch('./music.json')
    .then(r => r.json())
    .then(data => { musicLibrary = data; populateMusicSelect(musicLibrary); })
    .catch(err => console.error("Error loading music:", err));
// Populate inputs if default music selected
function populateMusicSelect(list) {
    list.forEach((music, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${music.title} – ${music.composer}`;
        musicSelect.appendChild(option);
    });
    musicSelect.addEventListener("change", (e) => {
        const selected = list[e.target.value];
        if (selected) {
        document.getElementById("noteInputLeft").value = selected.left || "";
        document.getElementById("noteInputRight").value = selected.right || "";
        }
    });
}

// --- Input normalisation & translation ---
// Ensure that input is what is expected
function normalise(input) {
    if (!input) return "";
    // Change spaces into underscores and change to uppercase
    let normalised = input.replace(/ /g, "_").toUpperCase();
    // Ensure notes match expected values
    const tokens = normalised.match(/([\^v]*[A-G](?:#|S)?\d*_*(?:\+[\^v]*[A-G](?:#|S)?\d*_*)*|_+)/g);
    // Add comma before letter if not already there
    return tokens ? tokens.join(",") : "";
}
// Translate notes into the expected format I need
function translateNote(input) {
    let baseOctave = 4;
    let note = input.toUpperCase();
    // Count ^ and v symbols
    let upCount = (note.match(/\^/g) || []).length;
    let downCount = (note.match(/v/g) || []).length;

    // Remove these symbols from note name
    note = note.replace(/\^/g, ""); // Remove ^
    note = note.replace(/v/g, "") // Remove v
    note = note.replace(/_/g, ""); // Remove underscores
    note = note.replace("#", "s"); // Convert # symbol to s
    const finalOctave = baseOctave + upCount - downCount;
    return /\d/.test(note) ? note : note + finalOctave;
}
// Translate into notes by making all letters uppercase apart from s
// Removes case sensitivity issues when entering sheet music
function transformNote(str) {
    return str.split("").map(c => (c.toLowerCase() === "s" ? "s" : c.toUpperCase())).join("");
}

// --- Audio play/stop ---
// Play an audio file
function playNote(filePath, noteName) {
    fetch(filePath)
        .then(res => res.arrayBuffer())
        .then(buf => audioContext.decodeAudioData(buf))
        .then(decoded => {
        const gain = audioContext.createGain();
        const src = audioContext.createBufferSource();
        src.buffer = decoded;
        src.connect(gain);
        gain.connect(audioContext.destination);
        const now = audioContext.currentTime;
        src.start(now);
        activeAudio[noteName] = { src, gain };
        })
        .catch(err => console.error("Error playing file:", err));
}
// Stop a note being played
function stopNote(noteName) {
    const note = activeAudio[noteName];
    if (note) {
        note.gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.7);
        delete activeAudio[noteName];
    }
}
// Highlight keys on the html keyboard piano
function highlightKey(noteName, duration = 200) {
    const key = getKeyElement(noteName);
    if (!key) return;
    key.classList.add("active");
    setTimeout(() => key.classList.remove("active"), duration);
}

// --- Falling note animation ---
let isPaused = false, tempoScale = 1, lastFrameTime = null, globalTime = 0;
let activeNotes = [];
let scheduledNotes = []; // full schedule for lookahead spawning
const LOOKAHEAD = 5000; // ms window to spawn upcoming notes
const previewLayer = document.getElementById("note-overlay");
// Get html items for piano keys
function getRects(noteName) {
    const key = getKeyElement(noteName);
    if (!key || !previewLayer) return null;
    return {
        keyRect: key.getBoundingClientRect(),
        previewRect: previewLayer.getBoundingClientRect()
    };
}
// Create the html element for falling notes
function createNoteDiv(noteName, delay) {
    // Get html items
    const rects = getRects(noteName);
    if (!rects) return null;
    const { keyRect, previewRect } = rects;

    const noteDiv = document.createElement("div");
    noteDiv.className = "falling-note"; // This is for css to detect the class
    noteDiv.style.width = `${keyRect.width}px`; // Set width to width of key
    noteDiv.style.left = `${keyRect.left}px`; // Relative to viewport
    noteDiv.style.height = `${10 + delay / 10}px`; // Set height to length of note
    noteDiv.style.setProperty("--target-top", `${keyRect.top}px`);
    noteDiv.style.animationDuration = "9s"; // Lasts for 9 seconds
    previewLayer.appendChild(noteDiv);
    noteDiv.style.transform = "translateY(-100%)"; // Shift note upward by its full height
    noteDiv.style.top = "-2000px"; // Start above piano

    return noteDiv;
}
// Calculate where falling notes end
function calcTargetTop(noteName) {
    const rects = getRects(noteName);
    if (!rects) return 0;
    const { keyRect, previewRect } = rects;
    return keyRect.top - previewRect.top;
}
// Get key from note
function getKeyElement(noteName) {
  if (!activePiano) return null;
  return activePiano.querySelector(`[data-note="${transformNote(noteName)}"]`);
}

// --- Play notes from input ---
// Play sheet music automatically
function playNotesFromInput(rawInput) {
    // Hide hero section
    document.querySelector('.hero').classList.add('hidden');
    // Don't play if there is no input
    if (!rawInput || typeof rawInput !== "string" || rawInput.trim() === "") {
        document.querySelector('.hero').classList.remove('hidden'); // Show hero section again if no input
        return;
    }
    // Count down from 5 seconds
    startCountdown();
    // Normalise input and split by commas
    const entries = normalise(rawInput).split(",").map(n => n.trim()).filter(Boolean);
    let timeOffset = 0;
    const BASEDURATION = 9000;
    // Entries could be several notes at same time, eg: A1+B2+C2
    for (const entry of entries) {
        // Times delay by how many underscores there are 
        const underscoreCount = (entry.match(/_/g) || []).length;
        const delay = underscoreCount > 0 ? 75 * underscoreCount : 50;
        if (/^_+$/.test(entry)) { timeOffset += delay; continue; } // If entry is just underscores, treat as delay

        // Translate notes into desired input
        const chordNotes = entry.split("+").map(n => translateNote(n));
        // Notes are the note letter and octave, eg: A1
        for (const noteName of chordNotes) {
            // Push into full schedule;
            scheduledNotes.push({
                el: null, scheduledStart: timeOffset, duration: BASEDURATION,
                startTop: -window.innerHeight, targetTop: null, noteHeight: 20,
                noteName, audioTriggered: false, spawned: false, delay
            });
        }
        timeOffset += delay;
    }
    isPaused = false; lastFrameTime = null; globalTime = 0; // Reset everything
    requestAnimationFrame(tick); // Begin animation and audio playing
}

// --- Animation loop ---
function tick(ts) {
    if (!lastFrameTime) lastFrameTime = ts;
    const delta = ts - lastFrameTime;
    lastFrameTime = ts;

    if (!isPaused) globalTime += delta * tempoScale;

    // Lookahead and create DOM elements only for upcoming notes
    for (let i = 0; i < scheduledNotes.length; i++) {
        const sn = scheduledNotes[i];
        if (!sn.spawned && sn.scheduledStart <= globalTime + LOOKAHEAD) {
            const el = createNoteDiv(sn.noteName, sn.delay);
            if (!el) continue;
            const targetTop = calcTargetTop(sn.noteName);
            sn.el = el;
            sn.targetTop = targetTop;
            sn.audioTriggered = false;
            sn.spawned = true;
            activeNotes.push(sn);
        }
    }
    for (let i = 0; i < activeNotes.length; i++) {
        const n = activeNotes[i];
        const elapsed = globalTime - n.scheduledStart;
        // Skip until note's time
        if (elapsed < 0) {
            n.audioTriggered = false;
            if (n.el.parentNode !== previewLayer) previewLayer.appendChild(n.el);
            continue;
        }
        // Play note
        if (!n.audioTriggered && elapsed >= n.duration) {
            const filePath = `./sounds/${n.noteName.toLowerCase()}.ogg`;
            playNote(filePath, n.noteName);
            highlightKey(n.noteName, 200);
            setTimeout(() => stopNote(n.noteName), 400);
            n.audioTriggered = true;
        }
        // Remove note when unneeded
        if (elapsed >= n.duration) {
            n.el.remove();
            activeNotes.splice(i, 1);
            i--;
            continue;
        }
        // Update position
        const progress = elapsed / n.duration;
        const y = n.startTop + (n.targetTop - n.startTop) * progress;
        n.el.style.top = y + "px";
    }

    requestAnimationFrame(tick);
    checkIfFinished();
}

// --- Button controls ---
// Pause falling notes as well as countdown
function togglePause() { 
    isPaused = !isPaused; // Pause autoplay
    togglePauseCountdown(); // Pause countdown

    // Get pause button and change symbol based on state
    const btnIcon = document.querySelector("#pause i");
    if (!isPaused) {
        btnIcon.classList.remove("bi-play-fill");
        btnIcon.classList.add("bi-pause-fill"); // Show pause symbol
        enableWakeLock(); // Keep screen open
    } else {
        btnIcon.classList.remove("bi-pause-fill");
        btnIcon.classList.add("bi-play-fill"); // Show play symbol
        disableWakeLock(); // No longer need to keep screen open
    }
}
// Change tempo, making autoplay quicker or slower
function setTempo(scale) { tempoScale = Number(scale); }
// Stop audio and any falling notes as well as countdown and reset hero
function stopAll() {
    disableWakeLock(); // No longer need to keep screen open
    activeNotes.forEach(n => n.el && n.el.remove());
    activeNotes.length = 0;
    scheduledNotes.length = 0;
    isPaused = false; globalTime = 0; lastFrameTime = null;
    resetCountdown();
    const hero = document.querySelector(".hero");
    hero.classList.remove("hidden");
}
// Begin autoplay
// Calls the play notes from input functions twice (left hand and right hand)
function autoPlay() {
    enableWakeLock(); // Keep screen open
    stopAll(); // End previous run
    if (audioContext.state === "suspended") audioContext.resume();
    activeNotes = [];
    scheduledNotes = [];
    // Play sheet music
    playNotesFromInput(document.getElementById("noteInputLeft").value);
    playNotesFromInput(document.getElementById("noteInputRight").value);
    // Change pause button symbol
    const btnIcon = document.querySelector("#pause i");
    btnIcon.classList.remove("bi-play-fill");
    btnIcon.classList.add("bi-pause-fill"); // Show pause symbol
}
// Tempo slider
const tempo = document.getElementById("tempo");
const tempoVal = document.getElementById("tempoVal");
if (tempo && tempoVal) {
  tempo.oninput = () => {
    setTempo(tempo.value);
    tempoVal.textContent = `${tempo.value}x`;
  };
}
// Rewind or fast Forward
function rewind() {
    globalTime = Math.max(0, globalTime - 2000); // Jump back 2s
    // Reset audio triggers for notes that are now in the future
    for (let i = 0; i < activeNotes.length; i++) {
        const n = activeNotes[i];
        const elapsed = globalTime - n.scheduledStart;
        if (elapsed < 0) {
            n.audioTriggered = false;
            if (n.el && n.el.parentNode !== previewLayer) previewLayer.appendChild(n.el);
        }
    }
    // Allow re-spawn of notes that were jumped back into by clearing spawned flags
    for (let i = 0; i < scheduledNotes.length; i++) {
        const sn = scheduledNotes[i];
        // If the note should still be visible after rewind, ensure it can spawn again
        if (globalTime < sn.scheduledStart + sn.duration) {
            // If it was removed earlier, mark for re-spawn
            if (!sn.el || !document.body.contains(sn.el)) {
                sn.spawned = false;
                sn.el = null;
            }
            // If it was spawned and still needed, make sure it's in activeNotes
            const isActive = activeNotes.includes(sn);
            const elapsed = globalTime - sn.scheduledStart;
            if (sn.spawned && elapsed < sn.duration && !isActive) {
                activeNotes.push(sn);
                if (sn.el && sn.el.parentNode !== previewLayer) previewLayer.appendChild(sn.el);
                sn.audioTriggered = false;
            }
        }
    }
}
function fastForward() {
    globalTime += 2000; // Jump forward 2s
    // Remove any notes that are now past their window
    for (let i = 0; i < activeNotes.length; i++) {
        const n = activeNotes[i];
        const elapsed = globalTime - n.scheduledStart;
        if (elapsed >= n.duration) {
            if (n.el) n.el.remove();
            activeNotes.splice(i, 1);
            i--;
        }
    }
    // Prevent spawning notes that are entirely behind the new playhead
    for (let i = 0; i < scheduledNotes.length; i++) {
        const sn = scheduledNotes[i];
        if (globalTime >= sn.scheduledStart + sn.duration) {
            // If already spawned, ensure it's cleaned up
            if (sn.el && document.body.contains(sn.el)) {
                sn.el.remove();
            }
            sn.spawned = true; // Mark as spawned so tick won't try to spawn it
        }
    }
}
let rewindInterval, forwardInterval;
function startRewind() {
    rewindInterval = setInterval(() => rewind(), 200);
}
function stopRewind() {
    clearInterval(rewindInterval);
}
function startForward() {
    forwardInterval = setInterval(() => fastForward(), 200);
}
function stopForward() {
    clearInterval(forwardInterval);
}

// Attach in JS instead of inline onclick:
document.getElementById("rewind").addEventListener("mousedown", startRewind);
document.getElementById("rewind").addEventListener("mouseup", stopRewind);
document.getElementById("forward").addEventListener("mousedown", startForward);
document.getElementById("forward").addEventListener("mouseup", stopForward);

// --- Wire up SVG keys for manual play ---
// Wire up the SVG keys
const piano = document.getElementById("piano");
if (piano) {
    piano.querySelectorAll("[data-note]").forEach(key => {
        const noteName = key.getAttribute("data-note");
        // Play a note
        const start = (e) => {
            e.preventDefault();
            key.classList.add("active");
            playNote("./sounds/" + noteName.toLowerCase() + ".ogg", noteName);
        };
        // Stop a note
        const stop = () => {
            key.classList.remove("active");
            stopNote(noteName);
        };
        // Call function depending on event detected
        key.addEventListener("mousedown", start);
        key.addEventListener("mouseup", stop);
        key.addEventListener("mouseleave", stop);
        key.addEventListener("touchstart", start, { passive: false });
        key.addEventListener("touchend", stop);
    });
}

// --- Toggle labels on/off ---
const toggleLabels = document.getElementById("toggle-labels");
// Toggle button for labels on the piano
if (toggleLabels) {
  toggleLabels.addEventListener("change", function () {
    if (this.checked) {
      piano.classList.remove("hide-labels");
    } else {
      piano.classList.add("hide-labels");
    }
  });
}

// --- Clear/reset autoplay ---
function clearAutoPlay() {
    // Reset dropdown
    const musicSelect = document.getElementById("musicSelect");
    if (musicSelect) musicSelect.selectedIndex = 0;
    // Reset text inputs
    document.getElementById("noteInputLeft").value = "";
    document.getElementById("noteInputRight").value = "";
    // Reset file input
    const midiFile = document.getElementById("midiFile");
    if (midiFile) midiFile.value = "";   // Clears any chosen filename

    // Remove any preview notes still falling
    if (previewLayer) previewLayer.innerHTML = "";
    // Stop any currently playing audio
    stopAll();
    for (let note in activeAudio) {
        stopNote(note);
    }
    activeNotes.length = 0;
    
    // Reset hero section
    const hero = document.querySelector(".hero");
    hero.classList.remove("hidden");
    // Reset countdown
    const countdown = document.getElementById("countdown");
    if (countdown) countdown.style.display = "none";
}

// --- Countdown overlay before autoplay ---
let countdownSeconds = 0;
let countdownInterval = null;
let countdownPaused = false;
// Count down from 5 
function startCountdown() {
    const countdown = document.getElementById("countdown");
    // Kill any old countdown first
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    countdownSeconds = 5; // Begin countdown
    countdownPaused = false;
    // Update countdown html text
    countdown.style.display = "block";
    countdown.textContent = `Starting in ${countdownSeconds}...`;

     // Keep counting down until 0
    countdownInterval = setInterval(() => {
        if (countdownPaused) return;
            countdownSeconds--;
        if (countdownSeconds > 0) {
            countdown.textContent = `Starting in ${countdownSeconds}...`;
        } else {
            clearInterval(countdownInterval);
            countdownInterval = null;
            countdown.style.display = "none";
        }
    }, 1000);
}

// Pause countdown
function togglePauseCountdown() {
    countdownPaused = !countdownPaused;
}
// Reset countdown
function resetCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = null;
    countdownSeconds = 0;
    countdownPaused = false;
    const countdown = document.getElementById("countdown");
    if (countdown) countdown.style.display = "none";
}

// --- Check if autoplay is over ---
function checkIfFinished() {
    // All notes are finished if every note has elapsed past its duration
    const allDone = activeNotes.every(n => globalTime > n.scheduledStart + n.duration);
    if (allDone && !isPaused) {
        const hero = document.querySelector(".hero");
        hero.classList.remove("hidden");
        // Change pause button symbol
        const btnIcon = document.querySelector("#pause i");
        btnIcon.classList.remove("bi-pause-fill");
        btnIcon.classList.add("bi-play-fill"); // Show play symbol
        disableWakeLock(); // No longer need to keep screen open
    }
}

// --- Update tempo live ---
function updateTempoFill() {
    const min = parseFloat(tempo.min);
    const max = parseFloat(tempo.max);
    const val = parseFloat(tempo.value);

    const percent = ((val - min) / (max - min)) * 100;

    tempo.style.background = `linear-gradient(to right,
        var(--accent-2) 0%,
        var(--accent-2) ${percent}%,
        #fff ${percent}%,
        #fff 100%)`;
}
tempo.addEventListener("input", updateTempoFill);
updateTempoFill();

// --- Extend piano ---
const toggleExtended = document.getElementById('toggleExtended');
const keysGroup = document.getElementById('keys');
const pianoCard = document.querySelector('.piano-card');

// Widths of ranges in px
const WIDTHSTANDARD = 1168;  // C2–B5
const WIDTHEXTENDED = 2047; // C1–B7

const OFFSETC2 = 210;

// Toggle visibility of extended-only elements
let activePiano = document.getElementById("piano-standard");
// Change which piano is showing depending on extended toggle button
function showExtendedPiano(isExtended) {
    document.getElementById("piano-standard").style.display = isExtended ? "none" : "inline";
    document.getElementById("piano-extended").style.display = isExtended ? "inline" : "none";
    activePiano = document.getElementById(isExtended ? "piano-extended" : "piano-standard");
}
// Make changes to piano size or falling notes
function updatePiano() {
    const isExtended = toggleExtended.checked;
    showExtendedPiano(isExtended);
    updateNotePositions();
    updateNoteTargets();
}
// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    updatePiano();
});
// Toggle handler
toggleExtended.addEventListener('change', () => {
    updatePiano();
});
// Re‑scale on window resize
let resizeTO;
window.addEventListener('resize', () => {
    clearTimeout(resizeTO);
    resizeTO = setTimeout(() => {
        const isExtended = toggleExtended.checked;
        updatePiano();
    }, 100);
});

// --- Update falling notes size ---
// Calculate width for all active notes based on current key rects
function updateNotePositions() {
    activeNotes.forEach(n => {
        const rects = getRects(n.noteName);
        if (!rects) return;
        const { keyRect, previewRect } = rects;
        n.el.style.width = `${keyRect.width}px`;
        n.el.style.left  = `${keyRect.left - previewRect.left}px`;
    });
}
// Calculate targetTop after layout changes
function updateNoteTargets() {
    activeNotes.forEach(n => {
        n.targetTop = calcTargetTop(n.noteName);
    });
}

// --- Keep device screen from entering sleep mode while piano is running ---
let wakeLock = null;
async function enableWakeLock() {
  try {
    wakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    console.error("Wake Lock error:", err);
  }
}
function disableWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

// --- AudioContext resume on first click ---
document.body.addEventListener("click", () => {
    if (audioContext.state === "suspended") {
        audioContext.resume().then(() => {
        console.log("AudioContext resumed");
        });
    }
}, { once: true });
