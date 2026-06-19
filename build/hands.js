// Manages which hands are enabled during autoplay.
// Lets the user disable a hand so they can focus on the other one, then re-enable it.
// Kept free of any DOM/audio references so the logic can be unit tested.

// Create the default state: both hands enabled (true = will play)
function createHandState() {
    return { Left: true, Right: true };
}

// Set a specific hand on or off. Unknown hands are ignored.
function setHandEnabled(state, hand, enabled) {
    if (hand === "Left" || hand === "Right") {
        state[hand] = !!enabled;
    }
    return state;
}

// Flip a hand between on and off. Unknown hands are ignored.
function toggleHandState(state, hand) {
    if (hand === "Left" || hand === "Right") {
        state[hand] = !state[hand];
    }
    return state;
}

// Is the given hand currently enabled?
// Notes with an unknown/missing hand always play so nothing is silently dropped.
function isHandEnabled(state, hand) {
    if (hand !== "Left" && hand !== "Right") return true;
    return state[hand] !== false;
}

// Should a scheduled note be heard/shown, based on its hand?
function isNoteAudible(note, state) {
    return isHandEnabled(state, note ? note.hand : null);
}

// Is at least one hand still enabled? Used to warn when everything is muted.
function anyHandEnabled(state) {
    return isHandEnabled(state, "Left") || isHandEnabled(state, "Right");
}

// Export code for tests
if (typeof module !== "undefined") {
    module.exports = {
        createHandState,
        setHandEnabled,
        toggleHandState,
        isHandEnabled,
        isNoteAudible,
        anyHandEnabled
    };
}
