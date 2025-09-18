const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeNotes = {};

// Function to play an audio file
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
            src.start(0);

            activeNotes[noteName] = { src, gain };
        })
        .catch(err => console.error("Error playing file:", err));
}

// Function to stop a note being played
function stopNote(noteName) {
    const note = activeNotes[noteName];
    if (note) {
        note.gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.8); // Slight fade
        delete activeNotes[noteName];
    }
}

// Get note based on key pressed and play audio
document.addEventListener("click", () => {
audioContext.resume().then(() => playIowa("C4", "mf"));
});

// Wire up the SVG keys
const piano = document.getElementById("piano");
if (piano) {
    piano.querySelectorAll("[data-note]").forEach(key => {
        const noteName = key.getAttribute("data-note");

        const start = (e) => {
            e.preventDefault();
            key.classList.add("active");
            playNote("sounds/" + noteName + ".ogg", noteName);
        };

        const stop = () => {
            key.classList.remove("active");
            stopNote(noteName);
        };

        key.addEventListener("mousedown", start);
        key.addEventListener("mouseup", stop);
        key.addEventListener("mouseleave", stop);
        key.addEventListener("touchstart", start, { passive: false });
        key.addEventListener("touchend", stop);
    });
}

// Toggle button for labels on the piano
document.getElementById("toggle-labels").addEventListener("change", function () {
    const piano = document.getElementById("piano");
    if (this.checked) {
        piano.classList.remove("hide-labels");
    } else {
        piano.classList.add("hide-labels");
    }
});