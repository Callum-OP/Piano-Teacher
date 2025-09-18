const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Function to play an audi file
function playNote(filePath) {
fetch(filePath)
.then(res => {
if (!res.ok) throw new Error(`HTTP ${res.status}`);
return res.arrayBuffer();
})
.then(buf => audioContext.decodeAudioData(buf))
.then(decoded => {
const src = audioContext.createBufferSource();
src.buffer = decoded;
src.connect(audioContext.destination);
src.start(0);
})
.catch(err => console.error("Error playing file:", err));
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
    const down = (e) => {
        e.preventDefault();
        key.classList.add("active");
        playNote("sounds/" + noteName + ".ogg");
        setTimeout(() => key.classList.remove("active"), 200);
    };
    key.addEventListener("mousedown", down);
    key.addEventListener("touchstart", down, { passive: false });
    });
}