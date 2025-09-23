const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeNotes = {};

function autoPlay() {
    const inputLeft = document.getElementById("noteInputLeft").value;
    playNotesFromInput(inputLeft);
    const inputRight = document.getElementById("noteInputRight").value;
    playNotesFromInput(inputRight);
}

// Function to ensure that input is what is expected
function normalise(input) {
    // Change spaces into underscores and change to uppercase
    let normalised = input.replace(/ /g, "_");
    normalised = normalised.toUpperCase();
    // Ensure notes match expected values
    const notes = normalised.match(/([\^v]*[A-G](?:#|s)?\d*_*(?:\+[\^v]*[A-G](?:#|s)?\d*_*)*)/g);
    // Add comma before letter if not already there
    return notes ? notes.join(",") : "";
}

// Function to do a tutorial demo of sheet music
function playNotesFromInput(input) {
    // Only play if there is input
    if (!input || typeof input !== "string" || input.trim() === "") {
        return;
    }
    // Normalise input and split by commas
    const entries = normalise(input).split(",").map(n => n.trim());
    let timeOffset = 0;
    // Entries could be several notes at same time, eg: A1+B2+C2
    entries.forEach(entry => {
        // Translate notes into desired input
       const notes = entry.split("+").map(n => translateNote(n));
        // Times delay by how many underscores there are
        const underscoreCount = (entry.match(/_/g) || []).length;
        let delay = underscoreCount > 0 ? 400 * underscoreCount : 200;
        setTimeout(() => {
            // Notes are the note letter and octave, eg: A1
            notes.forEach(note => {
                // Play note
                if(note.match(/[A-G]/g) || [].length != 0) {
                    const filePath = `./sounds/${note.toLowerCase()}.ogg`;
                    playNote(filePath, note);
                    highlightKey(note, delay / 1.3);
                    // Stop note if it has no underscore, else wait
                    if(underscoreCount == 0) {
                        setTimeout(() => stopNote(note), 50);
                    } else {
                        setTimeout(() => stopNote(note), delay / 2);
                    }
                }
            });
        }, timeOffset);

        timeOffset += delay;
    });
}

// Function to translate notes into the expected format I need
function translateNote(input) {
    let baseOctave = 4;
    let note = input.toUpperCase()

    // Count ^ and v symbols
    let upCount = (note.match(/\^/g) || []).length;
    let downCount = (note.match(/v/g) || []).length;
    downCount += (note.match(/V/g) || []).length;

    // Remove those symbols from note name
    note = note.replace(/\^/g, "");
    note = note.replace(/v/g, "")
    note = note.replace(/V/g, "")
    // Remove underscores
    note = note.replace(/_/g, "");
    // Convert # symbol to s
    note = note.replace("#", "s");

    // Adjust octave so it is the correct number
    const finalOctave = baseOctave + upCount - downCount;

    // If there is a number
    if(/\d/.test(note)) {
        return note;
    } else {
        return note + finalOctave;
    }
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
        note.gain.gain.setTargetAtTime(0, audioContext.currentTime, 0.7); // Slight fade out
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