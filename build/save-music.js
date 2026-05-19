// Save custom music
function saveCustomMusic() {
    const title = document.getElementById("customMusicTitle").value.trim();
    if (!title) {
        alert("Please enter a title before saving.");
        return;
    }
    const composer = document.getElementById("customMusicComposer").value.trim() || "My Music";
    const left = document.getElementById("noteInputLeft").value.trim();
    const right = document.getElementById("noteInputRight").value.trim();
    if (!left && !right) {
        alert("No music to save.");
        return;
    }

    let saved = JSON.parse(localStorage.getItem("customMusic") || "[]");
    
    // Check for duplicate title
    if (saved.find(m => m.title === title)) {
        if (!confirm(`"${title}" already exists. Overwrite it?`)) return;
    }

    saved = addOrUpdateMusic(saved, title, left, right, composer);
    localStorage.setItem("customMusic", JSON.stringify(saved));
    populateCustomMusicSelect();
    document.getElementById("customMusicTitle").value = "";
    document.getElementById("customMusicComposer").value = "";
}

// Function to sort and update saved music list
function addOrUpdateMusic(saved, title, left, right, composer = "My Music") {
    const index = saved.findIndex(m => m.title === title);
    if (index >= 0) {
        saved[index] = { title, left, right, composer };
    } else {
        saved.push({ title, left, right, composer });
    }
    return saved.sort((a, b) => {
        // Sort by composer first, then title
        if (a.composer < b.composer) return -1;
        if (a.composer > b.composer) return 1;
        return a.title.localeCompare(b.title);
    });
}

// Load selected music into inputs
function loadSelectedCustomMusic() {
    const select = document.getElementById("customMusicSelect");
    const saved = JSON.parse(localStorage.getItem("customMusic") || "[]");
    const selected = saved.find(m => m.title === select.value);
    if (!selected) return;
    // Populate input field
    document.getElementById("noteInputLeft").value = selected.left;
    document.getElementById("noteInputRight").value = selected.right;
    
    // Reset music select dropdown
    const musicSelect = document.getElementById("musicSelect");
    if (musicSelect) musicSelect.selectedIndex = 0;
}

// Delete selected music
function deleteSelectedCustomMusic() {
    const select = document.getElementById("customMusicSelect");
    // Only delete if confirmed and there is music chosen in selection
    if (!select.value) return;
    if (!confirm(`Delete "${select.value}"?`)) return;
    
    let saved = JSON.parse(localStorage.getItem("customMusic") || "[]");
    saved = saved.filter(m => m.title !== select.value);
    localStorage.setItem("customMusic", JSON.stringify(saved));
    populateCustomMusicSelect();
}

// Populate dropdown in alphabetical order
function populateCustomMusicSelect() {
    const select = document.getElementById("customMusicSelect");
    const saved = JSON.parse(localStorage.getItem("customMusic") || "[]");
    select.innerHTML = '<option value="">-- Saved Music --</option>';

    // Group by composer
    const grouped = {};
    saved.forEach(m => {
        const composer = m.composer || "My Music";
        if (!grouped[composer]) grouped[composer] = [];
        grouped[composer].push(m);
    });

    Object.entries(grouped).forEach(([composer, pieces]) => {
        const group = document.createElement("optgroup");
        group.label = composer;
        pieces.forEach(m => {
            const option = document.createElement("option");
            option.value = m.title;
            option.textContent = m.title;
            group.appendChild(option);
        });
        select.appendChild(group);
    });
}

// Load on startup
document.addEventListener("DOMContentLoaded", () => {
    populateCustomMusicSelect();
});