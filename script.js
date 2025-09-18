const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeNotes = {};

// Function to do a tutorial demo of sheet music
function playNotesFromInput() {
    const input = document.getElementById("noteInput").value;
    const notes = input.split(",").map(n => n.trim().toUpperCase());
    let delay = 0;
    let timeOffset = 0;
    notes.forEach((note, index) => {
        // Times delay by how many underscores there are, also remove all underscores.
        if(note.includes("_")) {delay = 900 * (note.match(/_/g) || []).length; note = note.replace(/_/g, "");} 
        else {delay = 600;}
        setTimeout(() => {
            const filePath = `./sounds/${note.toLowerCase()}.ogg`;
            highlightKey(note, delay);
            playNote(filePath, note);
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