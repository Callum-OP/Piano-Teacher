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

Alternatively to build locally as a desktop app use: npm run build
Or:
npx electron-builder --win appx 
npx electron-builder --win --x64
For store app bundle:
npm run build-store

If you want to build for android you'll need something like Android Studio and can sync changes with: npx cap sync android

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
--- Custom Music Editor ---
An in-page piano-roll editor now exists, enabled via the "Show Music Editor" setting: press "Editor Mode" and the area above the real piano becomes an editable grid aligned to the keys. You can pick a hand, set note length, click to add/remove notes, drag notes to move them, drag a note's top edge to change its length, right-click a note to switch its hand, scroll to scrub/preview, and Play. Useful for cleaning up imported music or composing from scratch. Remaining work:
Export the edited/saved music back out as a MIDI file.
Could also make it easier to use and understand.

--- UI Improvements ---
Get play buttons to shrink if the screen width gets too cramped so that they stay on the same level, or reduce padding or margin.
Make piano bigger? Piano scale bar setting? or just have the piano be max possible size, no blank space.
Give the autoplay editor and buttons a faded look if no music has been started?
Reduce distance between piano and playback controls, so there is more space on screen if you want to have both on screen during autoplay.

--- Save Current Music & Progress ---
If you exit the app and had a music piece open/paused, it would be good to save what music was last open as well as exactly where the user was in the timeline bar, so then the user can start exactly where they were when they left.

--- Decrease App Size ---
The desktop version of the app on Microsoft Store is around 300mb with the appxbundle being 277mb, maybe try to find ways to decrease that since the mobile version is around 30mb or less in comparison. 
Electron requires a lot of space to work, Tauri 2.0 uses the OS WebView like Capacitor does, it may be worth changing to it instead of Electron in the future (Tauri could also be used for mobile as well as meaning I only need one wrapper), although it means retesting and possibly rewriting code to get it to work.

## Features to consider
--- Import/Export Saved Music List ---
Option to export the saved music list and import it to the app on another device, so that lists of music can be shared either across devices or to other people.

--- Bigger Preset List ---
Add more classical music pieces to the preset list.

--- Improved Performance Mode ---
Added performance mode, could enhance it further by getting it to change how the app plays animations. The app will likely still struggle if every key was being pressed at once repeatedly.

--- Customisation ---
Such as light/dark mode, colour theme selection?

--- Save Tempo ---
When saving a music piece, save the last tempo setting used for it and restore it on load. Could achieve this by adding preferred tempo option when saving.

--- Select Specific MIDI Tracks? ---
Allow users to see all the tracks within a MIDI file they upload and choose which tracks will and won't play. As some will have unneccessary background noise and instruments. Would likely need to a new section that gives the user complete freedom and control over the MIDI file they uploaded.

--- Better Rests ---
When playing several notes at once in autoplay the underscores are not considered separate for each note, meaning several notes pressed at once will all be held down for the same length, could make it possible to have one note last longer than another. This isn't a quick and easy fix, as it is a fundamental limitation of the note format the app uses.

--- Piano Audio Options ---
There are several different types of pianos and each sound slightly different, maybe giving different options to choose from in the settings will allow users to choose one they will be familiar with. Will require collecting the necessary audio files.

## Top issues
--- Audio being overloaded ---
On music pieces with 10s of notes being played over and over consistently, eventually the audio will become overloaded and begin crackling/cutting out. Seems to especially happen when the same key is hit over and over several times in less than a second. This happens even in performance mode.

## Minor issues
--- Sort Notes Feature ---
Resorting notes is not always perfect, some notes would be better suited to the closer hand than what the chosen hand is through the resort function. This is fundamentally a hard problem, the current sort function works well so far but to properly improve it so that it is perfect may require a complete rewrite of the sort logic with the risk of only just making it worse.
Another limitation as to why this feature is not always perfect is when music pieces have more notes and are wider than possible to be played, it may worth having it be able to sort a third hand of background notes so that it can still accurately show how to play the rest.
