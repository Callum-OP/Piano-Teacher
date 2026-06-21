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
    
    // Check for duplicate title AND composer combination
    if (saved.find(m => m.title === title && (m.composer || "My Music") === composer)) {
        if (!confirm(`"${title}" by ${composer} already exists. Overwrite it?`)) return;
    }

    saved = addOrUpdateMusic(saved, title, left, right, composer);
    localStorage.setItem("customMusic", JSON.stringify(saved));
    populateCustomMusicSelect();
    document.getElementById("customMusicTitle").value = "";
    document.getElementById("customMusicComposer").value = "";
}

// Function to sort and update saved music list
function addOrUpdateMusic(saved, title, left, right, composer = "My Music") {
    // Look for existing item with matching title AND composer
    const index = saved.findIndex(m => m.title === title && (m.composer || "My Music") === composer);
    if (index >= 0) {
        saved[index] = { title, left, right, composer };
    } else {
        saved.push({ title, left, right, composer });
    }
    return saved.sort((a, b) => {
        // Sort by composer first, then title
        const compA = a.composer || "My Music";
        const compB = b.composer || "My Music";
        if (compA < compB) return -1;
        if (compA > compB) return 1;
        return a.title.localeCompare(b.title);
    });
}

// Load selected music into inputs
function loadSelectedCustomMusic() {
    const select = document.getElementById("customMusicSelect");
    if (!select.value) return;

    // Split the compound value back into composer and title
    const [composer, title] = select.value.split("|");
    const saved = JSON.parse(localStorage.getItem("customMusic") || "[]");
    
    const selected = saved.find(m => m.title === title && (m.composer || "My Music") === composer);
    if (!selected) return;

    // Populate input fields
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
    
    const [composer, title] = select.value.split("|");
    if (!confirm(`Delete "${title}" by ${composer}?`)) return;
    
    let saved = JSON.parse(localStorage.getItem("customMusic") || "[]");
    // Filter out ONLY the specific track matching both title and composer
    saved = saved.filter(m => !(m.title === title && (m.composer || "My Music") === composer));
    
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
            option.value = `${composer}|${m.title}`;
            option.textContent = m.title;
            group.appendChild(option);
        });
        select.appendChild(group);
    });
}

// Render the live search results for the saved music list
function renderSavedResults(query) {
    const results = document.getElementById("savedResults");
    if (!results) return;
    const q = (query || "").trim();
    results.innerHTML = "";

    if (!q) { results.hidden = true; return; }

    const all = JSON.parse(localStorage.getItem("customMusic") || "[]");
    const matches = (typeof filterMusic === "function") ? filterMusic(all, q) : all;

    if (matches.length === 0) {
        const none = document.createElement("div");
        none.className = "no-results";
        none.textContent = "No matches";
        results.appendChild(none);
        results.hidden = false;
        return;
    }

    matches.slice(0, 50).forEach(m => {
        const composer = m.composer || "My Music";
        // Reuse the result-row builder defined in script.js
        const item = (typeof makeSearchResultItem === "function")
            ? makeSearchResultItem(m.title, composer)
            : Object.assign(document.createElement("div"), { className: "search-result", textContent: m.title });
        item.addEventListener("click", () => {
            document.getElementById("noteInputLeft").value = m.left || "";
            document.getElementById("noteInputRight").value = m.right || "";
            const select = document.getElementById("customMusicSelect");
            if (select) select.value = `${composer}|${m.title}`;
            const musicSelect = document.getElementById("musicSelect");
            if (musicSelect) musicSelect.selectedIndex = 0;
            results.hidden = true;
        });
        results.appendChild(item);
    });
    results.hidden = false;
}

// Load on startup
document.addEventListener("DOMContentLoaded", () => {
    populateCustomMusicSelect();

    // Live search: show a clickable results list as the user types
    const search = document.getElementById("savedSearch");
    const results = document.getElementById("savedResults");
    if (search && results) {
        search.addEventListener("input", () => renderSavedResults(search.value));
        search.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                const first = results.querySelector(".search-result");
                if (first) first.click();
            }
        });
        document.addEventListener("click", (e) => {
            if (e.target !== search && !results.contains(e.target)) results.hidden = true;
        });
    }
});

// Export code for tests
if (typeof module !== "undefined") {
    module.exports = { addOrUpdateMusic };
}