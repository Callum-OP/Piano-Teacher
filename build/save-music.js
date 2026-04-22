// Save custom music
function saveCustomMusic() {
    const title = document.getElementById("customMusicTitle").value.trim();
    if (!title) {
        alert("Please enter a title before saving.");
        return;
    }
    const left = document.getElementById("noteInputLeft").value.trim();
    const right = document.getElementById("noteInputRight").value.trim();
    if (!left && !right) {
        alert("No music to save.");
        return;
    }

    const saved = JSON.parse(localStorage.getItem("customMusic") || "[]");
    
    // Check for duplicate title
    if (saved.find(m => m.title === title)) {
        if (!confirm(`"${title}" already exists. Overwrite it?`)) return;
        const index = saved.findIndex(m => m.title === title);
        saved[index] = { title, left, right };
    } else {
        saved.push({ title, left, right });
    }

    // Sort alphabetically
    saved.sort((a, b) => a.title.localeCompare(b.title));
    localStorage.setItem("customMusic", JSON.stringify(saved));
    populateCustomMusicSelect();
    document.getElementById("customMusicTitle").value = "";
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
    saved.forEach(m => {
        const option = document.createElement("option");
        option.value = m.title;
        option.textContent = m.title;
        select.appendChild(option);
    });
}

// Load on startup
document.addEventListener("DOMContentLoaded", () => {
    populateCustomMusicSelect();
});