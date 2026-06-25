# Demo Video

https://github.com/user-attachments/assets/e3545791-7b0c-4742-944d-777b0df4bf59


# Versions
The Google Play Store mobile app version: https://play.google.com/store/apps/details?id=io.github.callumop.pianoteacher
The Microsoft Store desktop app version: https://apps.microsoft.com/detail/9ngq60108m5s?hl=en-GB&gl=GB
The Itch.io web app version: https://callum-op.itch.io/piano-teacher
The development web app version: https://callum-op.github.io/Piano-Teacher/ 

Version number can be found:
android/app/build.gradle
package.json

# How to run
To set up dependencies, assuming you have node installed, use: npm install 

To run locally on localhost:3000 you can use a command like: python -m http.server 3000 or npx http-server . 

Alternatively to build and run locally as a desktop app use: npm run tauri:dev (Tauri, needs the Rust toolchain)

To build the desktop app and package it for the Microsoft Store as MSIX (both arm64 and x64) in one command:
npm run build-store
This outputs dist/PianoTeacher_<version>.msixbundle — a single multi-architecture bundle (arm64 + x64). The individual per-arch MSIX are in dist/packages/. See src-tauri/msix/README.md for details. (It runs: clean dist, build arm64, build x64, pack each into an MSIX, then combine them into one .msixbundle.)

If you want to build for android you'll need something like Android Studio, can sync changes with: npx cap sync android

To run tests use: npm test

If you have a touchscreen on a large screened device you can play the piano on screen.
There is an autoplay feature that will visually show how to play sheet music.
Select from a list of preset music or upload a MIDI file, then click to start autoplay.
Use the search boxes above the preset and saved music lists to filter them; matching pieces appear in a clickable list (press Enter to pick the first match).
Enable "Limit Notes to Piano Size" in settings to automatically discard notes outside the current piano's range when loading a preset, saved piece, or MIDI file (useful on a smaller piano).
Enable "Show Music Editor" in settings to reveal the "Editor Mode" button (top-right above the piano). In the editor (beta) the area above the real piano becomes an editable note grid aligned to the keys. Pick a Tool: Left/Right places a note above a key (or tap an existing note to move it to that hand), Erase removes a note; set a note Length too. Drag a note to move it, drag its top edge to change its length, and scroll to scrub/preview (time runs upward, the start nearest the keys). It's touch-friendly. Use "Load music" to pull in the current inputs, the piano's normal Play button to apply your edits and hear them, and "Done editing" to finish.
Alternatively enter the notes directly into the input in letter format (A1, Fs3, etc), using _ for rests and + to play several notes at once.
Use the Left/Right hand toggle buttons to silence a hand during autoplay so you can focus on one hand at a time, then re-enable it when ready.
Press the spacebar to play/pause autoplay (it won't trigger while you're typing in a field). Click the tempo value (e.g. "1x") to reset the tempo. Dragging the tempo slider lands exactly where you release it; only a click/tap near the middle snaps to 1x.

Sites I found with MIDI files include: 
https://onlinesequencer.net/
https://flat.io/search/
https://midifind.com/
https://www.midiworld.com/
https://bitmidi.com/
https://musescore.com/

# Future Development
Below are the future features and current issues relating to the app in order of priority (highest in list being highest priority)

## Top features to consider
--- Expand Music Editor ---
Export the edited/saved music back out as a MIDI file.
Could also make it easier to use and understand.

--- UI Improvements ---
Get play buttons to shrink if the screen width gets too cramped so that they stay on the same level, or reduce padding or margin.
Make piano bigger? Piano scale bar setting? or just have the piano be max possible size, no blank space.
Give the autoplay editor and buttons a faded look if no music has been started?
Reduce distance between piano and playback controls, so there is more space on screen if you want to have both on screen during autoplay.

## Features to consider
--- Bigger Preset List ---
Add more classical music pieces to the preset list.

--- Import/Export Saved Music List ---
Option to export the saved music list and import it to the app on another device, so that lists of music can be shared either across devices or to other people.
Would also be cool to have saved music shared across devices but that would require somewhere to host and store the data or some other way to automatically sync saved music, and would likely also need a login, meaning it would be more hassle than it is worth.

--- Save Current Music & Progress ---
If you exit the app and had a music piece open/paused, it would be good to save what music was last open as well as exactly where the user was in the timeline bar, so then the user can start exactly where they were when they left.

--- Customisation ---
Such as light/dark mode, colour theme selection?

--- Save Tempo ---
When saving a music piece, save the last tempo setting used for it and restore it on load. Could achieve this by adding preferred tempo option when saving.

--- Select Specific MIDI Tracks? ---
Allow users to see all the tracks within a MIDI file they upload and choose which tracks will and won't play. As some will have unneccessary background noise and instruments. Would likely need to a new section that gives the user complete freedom and control over the MIDI file they uploaded.

--- Piano Audio Options ---
There are several different types of pianos and each sound slightly different, maybe giving different options to choose from in the settings will allow users to choose one they will be familiar with. Will require collecting the necessary audio files.

## Top issues
None atm

## Minor issues
--- App Size ---
The desktop version of the app on Microsoft Store is around 300mb with the appxbundle being 277mb, maybe try to find ways to decrease that since the mobile version is around 30mb or less in comparison. 
Electron requires a lot of space to work, Tauri 2.0 uses the OS WebView like Capacitor does, it may be worth changing to it instead of Electron in the future (Tauri could also be used for mobile as well as meaning I only need one wrapper), although it means retesting and possibly rewriting code to get it to work. Also I'm familiar with Electron and Capacitor, I have no idea what Tauri is like or what its actually capable of (and that goes for any other alternative wrapper too).

--- Sort Notes Feature ---
Resorting notes is not always perfect, some notes would be better suited to the closer hand than what the chosen hand is through the resort function. This is fundamentally a hard problem, the current sort function works well so far but to properly improve it so that it is perfect may require a complete rewrite of the sort logic with the risk of only just making it worse. (The sort core is now a pure, unit-tested `resortBlocks(left, right)` with characterisation tests pinning its output. A bug was fixed in `findBestSplitPoint` so wide chords split nearer middle C instead of leaving one hand over-wide. A global dynamic-programming rewrite was trialled behind those tests and found to be worse — it dumps melodies onto one hand and can cross hands — so it was discarded, confirming the "rewrite risks making it worse" concern.)
Another limitation as to why this feature is not always perfect is when music pieces have more notes and are wider than possible to be played, it may be worth having it be able to sort a third hand of background notes so that it can still accurately show how to play the rest.

--- Note Rests ---
When playing several notes at once in autoplay the underscores are not considered separate for each note, meaning several notes pressed at once will all be held down for the same length, could make it possible to have one note last longer than another. This isn't a quick and easy fix, as it is a fundamental limitation of the note format the app uses.