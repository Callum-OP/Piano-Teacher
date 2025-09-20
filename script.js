const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeNotes = {};

function autoPlay() {
    const inputLeft = document.getElementById("noteInputLeft").value;
    playNotesFromInput(inputLeft);
    const inputRight = document.getElementById("noteInputRight").value;
    playNotesFromInput(inputRight);
}

// Function to do a tutorial demo of sheet music
function playNotesFromInput(input) {
    // Split by commas
    const entries = input.split(",").map(n => n.trim().toUpperCase());
    let timeOffset = 0;
    // Entries could be several notes at same time, eg: A1+B2+C2
    entries.forEach(entry => {
        const notes = entry.split("+").map(n => n.replace(/_/g, "").toUpperCase());
        // Times delay by how many underscores there are
        const underscoreCount = (entry.match(/_/g) || []).length;
        const delay = underscoreCount > 0 ? 400 * underscoreCount : 200;
        setTimeout(() => {
            // Notes are the note letter and octave, eg: A1
            notes.forEach(note => {
                // If note has underscores remove them
                if (note.includes("_")) {
                    note = note.replace(/_/g, "");
                }
                // Play note
                const filePath = `./sounds/${note.toLowerCase()}.ogg`;
                playNote(filePath, note);
                highlightKey(note, delay / 1.3);
                // Stop note if it has no underscore, else wait
                if(underscoreCount == 0) {
                    setTimeout(() => stopNote(note), 50);
                } else {
                    setTimeout(() => stopNote(note), delay / 2);
                }
            });
        }, timeOffset);

        timeOffset += delay;
    });
}

// Function to highlight keys on the html keyboard piano
function highlightKey(noteName, duration) {
    const key = document.querySelector(`[data-note="${transformNote(noteName)}"]`);
    if (key) {
        key.classList.add("active");
        setTimeout(() => {
            key.classList.remove("active");
        }, duration);
    }
}

// Function to translate into notes by making all letters uppercase apart from s
// Removes case sensitivity issues when entering sheet music
function transformNote(str) {
  return str
    .split("")
    .map(char => {
      if (char.toLowerCase() === "s") return "s";
      return char.toUpperCase();
    })
    .join("");
}

// Function to play an audio file
function playNote(filePath, noteName) {
    // Decodes audio file
    fetch(filePath)
        .then(res => res.arrayBuffer())
        .then(buf => audioContext.decodeAudioData(buf))
        .then(decoded => {
            // The gain node controls the volume, can be used to mute the audio
            const gain = audioContext.createGain();
            // Source node for decrypting audio
            const src = audioContext.createBufferSource();
            src.buffer = decoded;
            src.connect(gain);
            gain.connect(audioContext.destination);
            // Starts playing
            src.start(0);

            activeNotes[noteName] = { src, gain }; // Used to modify or stop the note later
        })
        .catch(err => console.error("Error playing file:", err));
}

// Function to stop a note being played
function stopNote(noteName) {
    const note = activeNotes[noteName];
    if (note) {
        note.gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.8); // Slight fade out
        delete activeNotes[noteName];
    }
}

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

// Toggle button for labels on the piano
document.getElementById("toggle-labels").addEventListener("change", function () {
    const piano = document.getElementById("piano");
    if (this.checked) {
        piano.classList.remove("hide-labels");
    } else {
        piano.classList.add("hide-labels");
    }
});