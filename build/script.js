// This is the main script for the piano, buttons and autoplay functionality

// Audio setup
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeAudio = {};
const audioBuffers = {};
const masterGain = audioContext.createGain();
const compressor = audioContext.createDynamicsCompressor();
masterGain.connect(compressor);
compressor.connect(audioContext.destination);

// Set initial volume from slider
masterGain.gain.value = document.getElementById("volume").value;

// Listen if volume input has changed
document.getElementById("volume").addEventListener("input", (e) => {
    masterGain.gain.value = e.target.value;
});

// Preset music
let musicLibrary = [];
const musicSelect = document.getElementById("musicSelect");

// Timeline set up
let totalDuration = 0;
let isScrubbingTimeline = false;
let rewindInterval, forwardInterval;

// Octave set up
let baseOctave = 4;
let octaveChange = 0;
const MAXOCTAVE = 7;
const MINOCTAVE = 2;

// Range inputs
const timeline = document.getElementById("timeline");
const tempo = document.getElementById("tempo");
const tempoVal = document.getElementById("tempoVal");
const volume = document.getElementById("volume");
document.addEventListener("DOMContentLoaded", () => {
    const uiScale = document.getElementById("ui-scale");
    if (uiScale) {
        const settings = loadSettings();
        uiScale.value = settings.uiScale || 1;
        updateRangeFill(uiScale);
        uiScale.addEventListener("input", () => updateRangeFill(uiScale));
    }
});

// Falling notes
let isPaused = false, tempoScale = 1, lastFrameTime = null, globalTime = 0;
let activeNotes = [];
let scheduledNotes = []; // Full schedule for lookahead spawning
const LOOKAHEAD = 3000; // Window to spawn upcoming notes
const previewLayer = document.getElementById("note-overlay");

// Which hands are enabled (lets the user focus on one hand at a time)
const handState = createHandState();

// Countdown
let countdownSeconds = 0;
let countdownInterval = null;
let countdownPaused = false;

// Extend piano
const toggleExtended = document.getElementById('toggleExtended');
const keysGroup = document.getElementById('keys');
const pianoCard = document.querySelector('.piano-card');

// Widths of ranges in px
const WIDTHSTANDARD = 1168;  // C2–B5
const WIDTHEXTENDED = 2047; // C1–B7
const OFFSETC2 = 210;

// Piano control inputs
let activePiano = document.getElementById("piano-standard");
let octaveControls = document.getElementById("octave-controls");

// Toggle inputs
const toggleLabels = document.getElementById("toggle-labels");

// Wakelock
let wakeLock = null;
let pauseWakeLockTimer = null;
const PAUSE_WAKELOCK_TIMEOUT = 2 * 60 * 1000; // 2 minutes

// --- Wake lock helpers ---
// Only returns true if music is actively playing
function isPlaying() {
    return scheduledNotes.length > 0 && !isPaused && globalTime < totalDuration;
}

async function enableWakeLock() {
    if (!isPlaying()) {
        console.log('[WakeLock] enableWakeLock skipped, not playing');
        return;
    }
    try {
        if (!wakeLock || wakeLock.released) {
            wakeLock = await navigator.wakeLock.request("screen");
            console.log('[WakeLock] Acquired');
        } else {
            console.log('[WakeLock] Already active, skipped');
        }
    } catch (err) {
        console.error("Wake Lock error:", err);
    }
}

function disableWakeLock() {
    clearTimeout(pauseWakeLockTimer);
    pauseWakeLockTimer = null;
    if (wakeLock && !wakeLock.released) {
        wakeLock.release();
        wakeLock = null;
        console.log('[WakeLock] Released');
    }
}

function startPauseWakeLockTimer() {
    // Only start timer if music is mid-piece (not finished)
    if (scheduledNotes.length === 0 || globalTime >= totalDuration) {
        console.log('[WakeLock] No timer started — music not mid-piece');
        return;
    }
    clearTimeout(pauseWakeLockTimer);
    pauseWakeLockTimer = setTimeout(() => {
        console.log('[WakeLock] Pause timer fired — releasing');
        disableWakeLock();
    }, PAUSE_WAKELOCK_TIMEOUT);
    console.log('[WakeLock] Pause timer started');
}

// Handle returning to app
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
        if (isPlaying()) {
            enableWakeLock();
        } else if (isPaused && scheduledNotes.length > 0 && globalTime < totalDuration) {
            // Only restart timer if wake lock is still active
            // If 2 minute timer already fired, leave wake lock off
            if (wakeLock && !wakeLock.released) {
                startPauseWakeLockTimer();
            } else {
                console.log('[WakeLock] Returned while paused but wake lock already released — leaving off');
            }
        } else {
            disableWakeLock();
        }
    } else {
        clearTimeout(pauseWakeLockTimer);
        pauseWakeLockTimer = null;
        console.log('[WakeLock] App hidden — pause timer cleared');
    }
});

// --- Music library select ---
// Set up default music to choose from
fetch('./music.json')
    .then(r => r.json())
    .then(data => { musicLibrary = data; initMusicSelect(); })
    .catch(err => console.error("Error loading music:", err));

// Set up the preset dropdown: render all options, then wire the change handler
// and the search box (both attached once).
function initMusicSelect() {
    renderMusicOptions(""); // Full dropdown stays available for browsing

    // Populate the note inputs when a preset is chosen from the dropdown
    musicSelect.addEventListener("change", (e) => {
        const selected = musicLibrary[e.target.value];
        if (selected) loadPresetIntoInputs(selected);
    });

    // Live search: show a clickable results list as the user types
    const search = document.getElementById("presetSearch");
    const results = document.getElementById("presetResults");
    if (search && results) {
        search.addEventListener("input", () => renderPresetResults(search.value));
        // Enter selects the first match
        search.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const first = results.querySelector(".search-result");
                if (first) first.click();
            }
        });
        // Hide the list when clicking elsewhere
        document.addEventListener("click", (e) => {
            if (e.target !== search && !results.contains(e.target)) results.hidden = true;
        });
    }
}

// Load a preset's notes into the input fields
function loadPresetIntoInputs(piece) {
    document.getElementById("noteInputLeft").value = piece.left || "";
    document.getElementById("noteInputRight").value = piece.right || "";
    maybeLimitToPianoSize();
}

// --- Limit notes to piano size ---
// Pitch range of the piano that is currently shown (accounts for extended mode
// and octave shifts, since both are reflected in each key's data-note).
function getPianoPitchRange() {
    if (!activePiano) return null;
    const pitches = [...activePiano.querySelectorAll('[data-note]')]
        .map(k => noteToPitch(k.dataset.note))
        .filter(p => p != null);
    if (!pitches.length) return null;
    return { min: Math.min(...pitches), max: Math.max(...pitches) };
}

// Trim both hands' inputs to the current piano range
function applyPianoLimit() {
    const range = getPianoPitchRange();
    if (!range) return;
    const leftEl = document.getElementById("noteInputLeft");
    const rightEl = document.getElementById("noteInputRight");
    if (leftEl) leftEl.value = limitNotesToRange(leftEl.value, range.min, range.max);
    if (rightEl) rightEl.value = limitNotesToRange(rightEl.value, range.min, range.max);
}

// Apply the limit only when the setting is enabled (called after music is loaded)
function maybeLimitToPianoSize() {
    const toggle = document.getElementById("limit-piano");
    if (toggle && toggle.checked) applyPianoLimit();
}

// Render the live search results for the preset list
function renderPresetResults(query) {
    const results = document.getElementById("presetResults");
    if (!results) return;
    const q = (query || "").trim();
    results.innerHTML = "";

    if (!q) { results.hidden = true; return; }

    // Keep the original library index so selection loads the right piece
    const matches = [];
    musicLibrary.forEach((music, index) => {
        if (musicMatchesQuery(music, q)) matches.push({ music, index });
    });

    if (matches.length === 0) {
        const none = document.createElement("div");
        none.className = "no-results";
        none.textContent = "No matches";
        results.appendChild(none);
        results.hidden = false;
        return;
    }

    matches.slice(0, 50).forEach(({ music, index }) => {
        const item = makeSearchResultItem(music.title, music.composer);
        item.addEventListener("click", () => {
            loadPresetIntoInputs(music);
            musicSelect.value = index;
            results.hidden = true;
        });
        results.appendChild(item);
    });
    results.hidden = false;
}

// Build one result row (title + composer) using textContent to avoid HTML injection
function makeSearchResultItem(title, composer) {
    const item = document.createElement("div");
    item.className = "search-result";
    item.setAttribute("role", "option");
    const titleSpan = document.createElement("span");
    titleSpan.textContent = title || "(untitled)";
    item.appendChild(titleSpan);
    if (composer) {
        const comp = document.createElement("span");
        comp.className = "composer";
        comp.textContent = " — " + composer;
        item.appendChild(comp);
    }
    return item;
}

// Rebuild the preset options, optionally filtered by a search query.
// Option values stay as the original musicLibrary index so the change handler keeps working.
function renderMusicOptions(query) {
    musicSelect.innerHTML = '<option value="">-- Select music --</option>';

    // Group matching pieces by composer
    const grouped = {};
    musicLibrary.forEach((music, index) => {
        if (!musicMatchesQuery(music, query)) return;
        if (!grouped[music.composer]) grouped[music.composer] = [];
        grouped[music.composer].push({ music, index });
    });

    Object.entries(grouped).forEach(([composer, pieces]) => {
        const group = document.createElement("optgroup");
        group.label = composer;
        pieces.forEach(({ music, index }) => {
            const option = document.createElement("option");
            option.value = index;
            option.textContent = music.title;
            group.appendChild(option);
        });
        musicSelect.appendChild(group);
    });
}

// --- Audio play/stop ---
// Play an audio file
async function playNote(filePath, noteName) {
    const key = noteName.toLowerCase();
    
    // Load and cache if note not already loaded
    if (!audioBuffers[key]) {
        const res = await fetch(filePath);
        const buf = await res.arrayBuffer();
        audioBuffers[key] = await audioContext.decodeAudioData(buf);
    }

    if (activeAudio[noteName]) stopNote(noteName);

    const src = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    src.buffer = audioBuffers[key];
    src.connect(gain);
    gain.connect(masterGain);
    src.start(audioContext.currentTime);
    activeAudio[noteName] = { src, gain };
}
// Stop a note being played
function stopNote(noteName) {
    const note = activeAudio[noteName];
    if (note) {
        try {
            note.gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.7);
            // Stop this sound in 2 seconds
            note.src.stop(audioContext.currentTime + 2);
        } catch (e) {}
        delete activeAudio[noteName];
    }
}

// Store active highlight timeouts per key
const highlightTimeouts = {};

// Highlight keys on the html keyboard piano
function highlightKey(noteName, duration, hand) {
    const key = getKeyElement(noteName);
    if (!key) return;

    // Clear any existing timeout for this key so it doesn't remove the new highlight
    if (highlightTimeouts[noteName]) {
        clearTimeout(highlightTimeouts[noteName]);
        delete highlightTimeouts[noteName];
    }

    key.classList.add("active");
    const handClass = hand === "Right" ? "right-hand" : "left-hand";
    key.classList.add(handClass);

    highlightTimeouts[noteName] = setTimeout(() => {
        key.classList.remove("active", handClass);
        delete highlightTimeouts[noteName];
    }, duration);
}

// --- Falling note animation ---
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
function createNoteDiv(noteName, delay, hand) {
    // Get html items
    const rects = getRects(noteName);
    if (!rects) return null;
    const { keyRect, previewRect } = rects;

    const noteDiv = document.createElement("div");
    noteDiv.className = "falling-note"; // This is for css to detect the class
    noteDiv.style.width = `${keyRect.width}px`; // Set width to width of key
    noteDiv.style.left = `${keyRect.left - previewRect.left}px`;
    noteDiv.style.height = `${delay / 8}px`; // Set height to length of note
    noteDiv.style.setProperty("--target-top", `${keyRect.top}px`);
    noteDiv.style.animationDuration = "9s"; // Lasts for 9 seconds
    if (hand == "Right") {noteDiv.style.background = "var(--highlight)";} // Gold if on right hand
    else {noteDiv.style.background = "var(--highlightAlt)";} // Blue if on left hand
    previewLayer.appendChild(noteDiv);
    noteDiv.style.transform = "translateY(-100%)"; // Shift note upward by its full height

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
function playNotesFromInput(rawInput, hand) {
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
                noteName, audioTriggered: false, spawned: false, delay, hand
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

    if (!isPaused) {
        globalTime += delta * tempoScale;

        // Stop updating if reached the end of music piece
        if (globalTime >= totalDuration && totalDuration > 0) {
            globalTime = totalDuration;
            isPaused = true; // Stop timeline from continuing
        }
    }

    updateTimelineDisplay(); // Update the timeline bar

    // Lookahead and create DOM elements only for upcoming notes
    for (let i = 0; i < scheduledNotes.length; i++) {
        const sn = scheduledNotes[i];
        // Skip notes whose hand is currently disabled (stays unspawned so it can return if re-enabled)
        if (!sn.spawned && isHandEnabled(handState, sn.hand) && sn.scheduledStart <= globalTime + LOOKAHEAD) {
            const el = createNoteDiv(sn.noteName, sn.delay, sn.hand);
            if (!el) continue;
            const targetTop = calcTargetTop(sn.noteName);
            sn.el = el;
            sn.targetTop = targetTop;
            sn.audioTriggered = false;
            sn.spawned = true;
            activeNotes.push(sn);
        }
    }
    const updates = [];
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
            highlightKey(n.noteName, n.delay, n.hand);
            setTimeout(() => stopNote(n.noteName), 400);
            n.audioTriggered = true;
        }
        // Remove note when unneeded
        if (elapsed >= n.duration) {
            if (n.el) n.el.remove(); // Null check
            activeNotes.splice(i, 1);
            continue;
        }
        
        // Get position updates
        if (n.el) {
            const progress = elapsed / n.duration;
            const y = n.startTop + (n.targetTop - n.startTop) * progress;
            updates.push({ el: n.el, y });
        }
    }

    // Update positions
    updates.forEach(({ el, y }) => {
        if (el) { // Null check
            el.style.top = y + "px";
        }
    });

    requestAnimationFrame(tick);
    checkIfFinished();
}

// --- Button controls ---

// Play button state helpers
function setButtonToRestart() {
    const btn = document.querySelector("#pause");
    const btnIcon = document.querySelector("#pause i");
    if (!btnIcon || !btn) return;
    btnIcon.classList.remove("bi-pause-fill", "bi-play-fill");
    btnIcon.classList.add("bi-arrow-counterclockwise"); // Show restart symbol
    btn.setAttribute("onclick", "restartPlay()");
}
function setButtonToPlay() {
    const btn = document.querySelector("#pause");
    const btnIcon = document.querySelector("#pause i");
    if (!btnIcon || !btn) return;
    btnIcon.classList.remove("bi-pause-fill", "bi-arrow-counterclockwise");
    btnIcon.classList.add("bi-play-fill"); // Show play symbol
    btn.setAttribute("onclick", "togglePause()");
}
function setButtonToPause() {
    const btn = document.querySelector("#pause");
    const btnIcon = document.querySelector("#pause i");
    if (!btnIcon || !btn) return;
    btnIcon.classList.remove("bi-play-fill", "bi-arrow-counterclockwise");
    btnIcon.classList.add("bi-pause-fill"); // Show pause symbol
    btn.setAttribute("onclick", "togglePause()");
}
// Restart autoplay from beginning
function restartPlay() {
    autoPlay();
}

// Mute
let isMuted = false;
let volumeBeforeMute = 1;
function toggleMute() {
    const muteIcon = document.querySelector("#mute i");
    const volumeSlider = document.getElementById("volume");
    if (!isMuted) {
        // Mute
        volumeBeforeMute = masterGain.gain.value;
        masterGain.gain.value = 0;
        volumeSlider.value = 0;
        updateRangeFill(volumeSlider);
        muteIcon.classList.remove("bi-volume-up");
        muteIcon.classList.add("bi-volume-mute");
        isMuted = true;
    } else {
        // Unmute
        masterGain.gain.value = volumeBeforeMute;
        volumeSlider.value = volumeBeforeMute;
        updateRangeFill(volumeSlider);
        muteIcon.classList.remove("bi-volume-mute");
        muteIcon.classList.add("bi-volume-up");
        isMuted = false;
    }
}

// --- "No music loaded" message ---
let noMusicMsgTimer = null;
// Briefly show a toast telling the user to load some music first
function showNoMusicMessage() {
    const msg = document.getElementById("no-music-msg");
    if (!msg) return;
    msg.classList.add("show");
    clearTimeout(noMusicMsgTimer);
    noMusicMsgTimer = setTimeout(() => msg.classList.remove("show"), 3000);
}

// Entry point for the "Start autoplay" button: validate first, warn if empty,
// and only jump to the autoplay view when there is actually music to play.
function startAutoplay() {
    // If the music editor is open, apply its edits and close it first
    if (typeof applyAndExitEditMode === "function") applyAndExitEditMode();
    const left = document.getElementById("noteInputLeft").value.trim();
    const right = document.getElementById("noteInputRight").value.trim();
    if (!isValidMusicInput(left, right)) {
        showNoMusicMessage();
        return;
    }
    autoPlay();
    location.href = '#autoplay-section';
}

// --- Disable / enable a hand during autoplay ---
// Toggle a hand on or off. Works live: turning a hand off silences it and clears
// its falling notes immediately; turning it back on lets upcoming notes return.
function toggleHand(hand) {
    if (hand !== "Left" && hand !== "Right") return;
    toggleHandState(handState, hand);

    // If the hand was just disabled, clear its currently falling/sounding notes
    if (!isHandEnabled(handState, hand)) {
        for (let i = activeNotes.length - 1; i >= 0; i--) {
            const n = activeNotes[i];
            if (n.hand === hand) {
                if (n.el) n.el.remove();
                // Reset so the note can re-spawn if the hand is turned back on while it's still upcoming
                n.spawned = false;
                n.el = null;
                n.audioTriggered = false;
                stopNote(n.noteName);
                activeNotes.splice(i, 1);
            }
        }
    }
    updateHandButtonUI(hand);
}

// Keep a hand toggle button's label and styling in sync with the state
function updateHandButtonUI(hand) {
    const btn = document.getElementById(hand === "Left" ? "toggle-left-hand" : "toggle-right-hand");
    if (!btn) return;
    const enabled = isHandEnabled(handState, hand);
    btn.classList.toggle("active", enabled);
    btn.setAttribute("aria-pressed", enabled ? "true" : "false");
    const text = btn.querySelector(".hand-toggle-text");
    if (text) text.textContent = `${hand} hand ${enabled ? "on" : "off"}`;
}

// Pause falling notes as well as countdown
function togglePause() {
    // If the music editor is open, apply its edits and close it first
    if (typeof applyAndExitEditMode === "function") applyAndExitEditMode();
    // If nothing is playing, start autoplay
    if (scheduledNotes.length === 0) {
        const left = document.getElementById("noteInputLeft").value.trim();
        const right = document.getElementById("noteInputRight").value.trim();
        if (!isValidMusicInput(left, right)) { showNoMusicMessage(); return; } // Warn if no music loaded
        autoPlay();
        return;
    }

    // Prevent toggling if music has finished
    if (globalTime >= totalDuration) return;

    isPaused = !isPaused; // Pause autoplay
    togglePauseCountdown(); // Pause countdown

    if (isPaused) {
        // Start timer to release wake lock after 2 minutes of being paused
        startPauseWakeLockTimer();
        setButtonToPlay();
    } else {
        // Resumed, so cancel timer and re-enable wake lock
        clearTimeout(pauseWakeLockTimer);
        pauseWakeLockTimer = null;
        enableWakeLock();
        setButtonToPause();
    }
}
// Change tempo, making autoplay quicker or slower
function setTempo(scale) { tempoScale = Number(scale); }

// Stop button functionality
let holdTimer = null;
let holdDuration = 1000; // Time required to hold in milliseconds (1 second)
let startTime = null;
function startHold() {
    // Prevent duplicate triggers
    if (holdTimer) return; 
    
    startTime = performance.now();
    
    function animateHold(currentTime) {
        if (!startTime) return;
        
        const elapsedTime = currentTime - startTime;
        const progressPercent = Math.min((elapsedTime / holdDuration) * 100, 100);
        
        // Update the progress bar width
        const progressBar = document.getElementById('stop-progress');
        if (progressBar) {
        progressBar.style.width = `${progressPercent}%`;
        }
        
        if (elapsedTime >= holdDuration) {
            executeStop();
            cancelHold();
        } else {
            holdTimer = requestAnimationFrame(animateHold);
        }
    }
  
    holdTimer = requestAnimationFrame(animateHold);
}
function cancelHold() {
    // Cancel the animation frame loop
    if (holdTimer) {
        cancelAnimationFrame(holdTimer);
        holdTimer = null;
    }
    startTime = null;
    
    // Reset the progress bar back to 0 immediately
    const progressBar = document.getElementById('stop-progress');
    if (progressBar) {
        progressBar.style.width = '0%';
    }
}
function executeStop() {
    cancelHold(); // Reset visual bar
    stopAll(); // Execute your original stop logic
    console.log("Playback completely stopped via long-press.");
}

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

    // Hide timeline
    const timelineContainer = document.querySelector(".timeline-container");
    if (timelineContainer) timelineContainer.style.display = "none";
    
    // Reset timeline values
    const timeline = document.getElementById("timeline");
    if (timeline) {
        timeline.value = 0;
        updateRangeFill(timeline);
    }

    // Reset button to play
    setButtonToPlay();

    updateTimelineDisplay();
}

// Begin autoplay
// Calls the play notes from input functions twice (left hand and right hand)
function autoPlay() {
    // If the music editor is open, apply its edits and close it first
    if (typeof applyAndExitEditMode === "function") applyAndExitEditMode();
    // Check if there is notes entered
    const left = document.getElementById("noteInputLeft").value.trim();
    const right = document.getElementById("noteInputRight").value.trim();

    // Check if there is at least one valid note in the input
    if (!isValidMusicInput(left, right)) return;

    stopAll(); // End previous run
    
    if (audioContext.state === "suspended") audioContext.resume();
    activeNotes = [];
    scheduledNotes = [];
    
    // Play sheet music
    playNotesFromInput(document.getElementById("noteInputLeft").value, "Left");
    playNotesFromInput(document.getElementById("noteInputRight").value, "Right");

    // Set up timeline
    totalDuration = calculateTotalDuration();
    updateTimelineDisplay();

    enableWakeLock(); // Keep screen open
    
    // Show timeline
    const timelineContainer = document.querySelector(".timeline-container");
    if (timelineContainer) timelineContainer.style.display = "block";

    // Change to pause button symbol since music is now playing
    setButtonToPause();
}

// Apply the tempo slider value. Only snaps to 1x when `snap` is true (on release),
// so dragging stays free and the value just sticks to 1x once you let go near the middle.
function applyTempoFromSlider(snap = false) {
    let value = Number(tempo.value);
    if (snap) {
        value = snapTempo(value);
        // Reflect the snap back onto the slider so it visibly settles on 1x
        if (Number(tempo.value) !== value) tempo.value = value;
    }
    setTempo(value);
    tempoVal.textContent = `${value}x`;
    updateRangeFill(tempo);
}

// Reset tempo to 1x (used by clicking the tempo value label)
function resetTempo() {
    tempo.value = 1;
    applyTempoFromSlider(true);
}

// Tempo slider: dragging always lands exactly where you release it. Only a
// click/tap near 1x snaps to 1x ("tap near 1 assumes 1, drag to reach the rest").
let tempoPointerStartX = null;
let tempoWasTap = false;
if (tempo && tempoVal) {
  tempo.addEventListener("pointerdown", (e) => {
      tempoPointerStartX = e.clientX;
      tempoWasTap = true; // assume a tap until the pointer actually moves
  });
  tempo.addEventListener("pointermove", (e) => {
      if (isPointerDrag(tempoPointerStartX, e.clientX)) tempoWasTap = false;
  });
  tempo.addEventListener("input", () => applyTempoFromSlider(false));
  tempo.addEventListener("change", () => {
      applyTempoFromSlider(tempoWasTap); // snap only on a tap/click, never on a drag
      tempoWasTap = false;
      tempoPointerStartX = null;
  });
}
// Volume slider
if (volume) {
    volume.addEventListener("input", (e) => {
        masterGain.gain.value = e.target.value;
        updateRangeFill(volume);
        // If user moves slider while muted, unmute
        if (isMuted && e.target.value > 0) {
            isMuted = false;
            const muteIcon = document.querySelector("#mute i");
            muteIcon.classList.remove("bi-volume-mute");
            muteIcon.classList.add("bi-volume-up");
        }
    });
    updateRangeFill(volume); // Initial fill on page load
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
function increaseOctave() {
    // Grab all standard piano labels
    const labels = document.querySelectorAll("#piano-standard .c");

    // Add an octave number to each
    if (baseOctave + 1 < MAXOCTAVE) {
        labels.forEach((label, i) => {
            const match = label.textContent.trim().match(/^([A-G][s#]?)(\d)$/);
            if (match) {
                const [, note, octave] = match;
                label.textContent = note + (parseInt(octave, 10) + 1);
            }
        });
        baseOctave = baseOctave + 1;
        octaveChange = octaveChange + 1;

        // Set button value label
        const button = document.querySelector("#changeOctave");
        button.textContent = baseOctave;

        // Change note data of keys
        updateKeyNotes();
    }
}
function decreaseOctave() {
    // Grab all standard piano labels
    const labels = document.querySelectorAll("#piano-standard .c");

    // Take away an octave number from each
    if (baseOctave - 1 > MINOCTAVE) {
        labels.forEach((label, i) => {
            const match = label.textContent.trim().match(/^([A-G][s#]?)(\d)$/);
            if (match) {
                const [, note, octave] = match;
                label.textContent = note + (parseInt(octave, 10) - 1);
            }
        });
        baseOctave = baseOctave - 1;
        octaveChange = octaveChange - 1;
    }

    // Set button value label
    const button = document.querySelector("#changeOctave");
    button.textContent = baseOctave;

    // Change note data of keys
    updateKeyNotes();
}
// Get up original keys
const keys = document.querySelectorAll(
  "#piano-standard .white-key, #piano-standard .black-key"
);
// Set up base keys using original keys
keys.forEach(key => {
  if (!key.dataset.baseNote) {
    key.dataset.baseNote = key.dataset.note; // e.g. "C2"
  }
});
function updateKeyNotes() {
    keys.forEach(key => {
        const base = key.dataset.baseNote; // The original keys
        const match = base.match(/^([A-G][s#]?)(\d+)$/);
        if (match) {
        const [, noteName, octave] = match;
        let newOctave = parseInt(octave, 10) + octaveChange;
        if (newOctave < 0) newOctave = 0;
        if (newOctave > 7) newOctave = 7;
        key.dataset.note = noteName + newOctave;
        }
    });
    updatePiano();
}

// --- Connect piano keys to allow for manual playing ---
const piano = document.getElementById("piano");
if (piano) {
    piano.querySelectorAll("[data-note]").forEach(key => {
        // Play a note
        const start = (e) => {
            e.preventDefault();
            key.classList.add("active");
            const noteName = key.dataset.note;
            playNote("./sounds/" + noteName.toLowerCase() + ".ogg", noteName);
            highlightKey(noteName.toLowerCase(), 200, "Right");
        };

        // Stop a note
        const stop = () => {
            key.classList.remove("active");
            const noteName = key.dataset.note;
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

    // Hide timeline
    const timelineContainer = document.querySelector(".timeline-container");
    if (timelineContainer) timelineContainer.style.display = "none";
    
    // Reset timeline values
    const timeline = document.getElementById("timeline");
    if (timeline) {
        timeline.value = 0;
        updateRangeFill(timeline);
    }
    updateTimelineDisplay();
}

// --- Countdown overlay before autoplay ---
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
    const allDone = scheduledNotes.length > 0 && scheduledNotes.every(n => globalTime > n.scheduledStart + n.duration);
    if (allDone && !isPaused) {
        const hero = document.querySelector(".hero");
        hero.classList.remove("hidden");
        // Change button to restart symbol since music has finished
        setButtonToRestart();
        disableWakeLock(); // No longer need to keep screen open
    }
}

// --- Update ranges live, such as tempo or timeline ---
function updateRangeFill(range) {
    const min = parseFloat(range.min);
    const max = parseFloat(range.max);
    const val = parseFloat(range.value);

    const percent = ((val - min) / (max - min)) * 100;

    range.style.background = `linear-gradient(to right,
        var(--accent-3) 0%,
        var(--accent-3) ${percent}%,
        #fff ${percent}%,
        #fff 100%)`;
}
updateRangeFill(tempo);

// --- Extend piano ---
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

    // Hide octave controls when extended
    const oc = document.getElementById("octave-controls");
    oc.classList.toggle("d-none", isExtended);

    // Set height of piano svg and card
    if (isExtended) {piano.setAttribute("viewBox", "0 0 844 67");} 
    else {piano.setAttribute("viewBox", "0 0 844 108");}
    
    // Mute audio
    for (let note in activeAudio) {
        stopNote(note);
    }

    // Keep the music editor grid aligned to the (now changed) keys
    if (typeof refreshEditorLayout === "function") refreshEditorLayout();
}
// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    updatePiano();
    
    // Handle timeline events
    if (timeline) {
        updateRangeFill(timeline);

        // Computer mouse
        timeline.addEventListener("mousedown", () => {
            isScrubbingTimeline = true;
        });

        // Touch screen
        timeline.addEventListener("touchstart", (e) => {
            if (scheduledNotes.length === 0) return;
            isScrubbingTimeline = true;
        }, { passive: true });
        
        timeline.addEventListener("input", (e) => {
            updateRangeFill(e.target);

            if (isScrubbingTimeline) {
                const newTime = (e.target.value / 100) * totalDuration;
                globalTime = newTime;

                // If scrubbed back from end, restore play/pause button state
                if (globalTime < totalDuration) {
                    if (isPaused) {
                        setButtonToPlay();
                    } else {
                        setButtonToPause();
                    }
                }
                
                // Reset audio triggers and clean up notes
                activeNotes.forEach(n => {
                    // Mute audio
                    for (let note in activeAudio) {
                        stopNote(note);
                    }
                    const elapsed = globalTime - n.scheduledStart;
                    if (elapsed < 0 || elapsed >= n.duration) {
                        if (n.el) n.el.remove();
                    } else {
                        n.audioTriggered = false;
                    }
                });
                
                // Clear falling notes
                const allNoteDivs = previewLayer.querySelectorAll('.falling-note');
                allNoteDivs.forEach(div => div.remove());

                // Clear active notes
                activeNotes.length = 0;

                // Reset ALL scheduled notes based on new timeline position
                scheduledNotes.forEach(sn => {
                    const elapsed = globalTime - sn.scheduledStart;
                    
                    // If note is in the past
                    if (elapsed >= sn.duration) {
                        // Mark as spawned and remove if exists
                        if (sn.el && document.body.contains(sn.el)) {
                            sn.el.remove();
                        }
                        sn.spawned = true;
                        sn.audioTriggered = true;
                    }
                    // If note is in the future or currently playing
                    else if (elapsed < sn.duration) {
                        // Reset spawn flag so it can play again
                        sn.spawned = false;
                        sn.audioTriggered = false;
                        sn.el = null;
                        
                        // If it should be visible now, add to active notes
                        if (elapsed >= 0 && elapsed < sn.duration) {
                            const existing = activeNotes.find(n => n === sn);
                            if (!existing) {
                                activeNotes.push(sn);
                            }
                        }
                    }
                })
                updateTimelineDisplay();

                if (globalTime >= totalDuration) {
                    isPaused = true;
                    disableWakeLock();
                    // Change button to restart symbol
                    setButtonToRestart();
                }
            }
        });
        
        // Computer mouse
        timeline.addEventListener("mouseup", () => {
            isScrubbingTimeline = false;
            if (globalTime >= totalDuration) {
                isPaused = true;
                disableWakeLock();
                setButtonToRestart();
                return;
            }
            // Ensure animation loop is running
            if (!lastFrameTime) {
                lastFrameTime = null;
                requestAnimationFrame(tick);
            }
        });
        
        timeline.addEventListener("mouseleave", () => {
            isScrubbingTimeline = false;
            // Ensure animation loop is running
            if (!lastFrameTime) {
                lastFrameTime = null;
                requestAnimationFrame(tick);
            }
        });

        // Touch screen
        timeline.addEventListener("touchend", () => {
            isScrubbingTimeline = false;
            if (globalTime >= totalDuration) {
                isPaused = true;
                disableWakeLock();
                setButtonToRestart();
                return;
            }
            // Ensure animation loop is running
            if (!lastFrameTime) {
                lastFrameTime = null;
                requestAnimationFrame(tick);
            }
        }, { passive: true });
        
        timeline.addEventListener("touchcancel", () => {
            isScrubbingTimeline = false;
            // Ensure animation loop is running
            if (!lastFrameTime) {
                lastFrameTime = null;
                requestAnimationFrame(tick);
            }
        }, { passive: true });
    }
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
        if (!n.el) return; // Null check
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
        if (!n.el) return; // Null check
        n.targetTop = calcTargetTop(n.noteName);
    });
}

// --- Timeline bar feature ---
// Calculate total duration
function calculateTotalDuration() {
    if (scheduledNotes.length === 0) return 0;
    const lastEnd = Math.max(...scheduledNotes.map(n => n.scheduledStart + n.duration));
    return lastEnd + 2000; // Add 2000ms buffer to ensure last notes finish playing
}

// Update timeline display
function updateTimelineDisplay() {
    const timeline = document.getElementById("timeline");
    const currentTimeEl = document.getElementById("currentTime");
    const totalTimeEl = document.getElementById("totalTime");
    
    if (!timeline || !currentTimeEl || !totalTimeEl) return;
    
    if (!isScrubbingTimeline && totalDuration > 0) {
        timeline.value = (globalTime / totalDuration) * 100;
        updateRangeFill(timeline);
    }
    
    currentTimeEl.textContent = formatTime(globalTime);
    totalTimeEl.textContent = formatTime(totalDuration);

    // Check if music has finished
    if (globalTime >= totalDuration && totalDuration > 0) {
        isPaused = true;
        disableWakeLock();
        setButtonToRestart();
    }
}

// --- Keyboard shortcuts ---
// Spacebar plays/pauses (or starts) autoplay, unless the user is typing in a field
document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !isInteractiveElement(document.activeElement)) {
        e.preventDefault(); // Stop the page from scrolling
        togglePause();
    }
});

// --- AudioContext resume on first click ---
document.body.addEventListener("click", () => {
    if (audioContext.state === "suspended") {
        audioContext.resume().then(() => {
        console.log("AudioContext resumed");
        });
    }
}, { once: true });