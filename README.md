# Demo Video

https://github.com/user-attachments/assets/e3545791-7b0c-4742-944d-777b0df4bf59


# Versions
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
Alternatively enter the notes directly into the input in letter format (A1, Fs3, etc), using _ for rests and + to play several notes at once.

Sites I found with MIDI files include: 
https://onlinesequencer.net/
https://flat.io/search/
https://midifind.com/
https://www.midiworld.com/
https://bitmidi.com/
https://musescore.com/

## Top features to consider
--- Decrease Size Of App ---
The desktop version of the app on Microsoft Store is 300mb, maybe try to find ways to decrease that since the mobile version is only 30mb in comparison. Tauri 2.0 uses the OS WebView like Capacitor does, it may be worth changing to it instead of Electron in the future (Tauri could also be used for mobile as well as meaning I only need one wrapper), although it means retesting and possibly rewriting code to get it to work.

One possible issue for the store is that the two builds are combined making the app bigger than it needs to be.
Will try using appx bundle, it should reduce only select the one version that is correct for that computer and therefore half the size of the Microsoft Store app.

## Features to consider
--- Better Rests ---
When playing several notes at once in autoplay the underscores are not considered separate for each note, meaning several notes pressed at once will all be held down for the same length, could make it possible to have one note last longer than another.

--- Graphics ---
Give the autoplay editor a faded look if no music has been started?
Customisation? Such as dark mode, text size and colour theme selection.

--- Toggle Input Data? ---
A toggle/option that only enters midi input within current piano size? If piano is smaller and there are notes not within that size then could discard them from the input.

--- Select Specific MIDI Tracks? ---
Allow users to see the tracks within a MIDI file they upload and choose which tracks will and won't play.

--- Preset Music Search Bar ---
As the preset library grows, being able to type search for a specific music piece or composer and filter is more useful than searching manually. Something to consider if the library ever gets too big.

--- Save Tempo ---
When saving a music piece, save the last tempo setting used for it and restore it on load.

## Top issues
None so far

## Minor issues
--- Dark mode ---
The colours and layout on dark mode specifically on the web on some mobile browsers does not look right compared to the intended look.

--- Audio ---
If the user switches windows or tabs the audio and animation will stop playing. (Maybe it should automatically pause and resume instead? Alternatively see if it is possible for at least the audio to play when away from tab).

--- Performance ---
Older devices (10 years or more, will struggle to run the app as intended).
Add an option to run the app in a simplified performance enhancing mode (Removing the fancy visuals and focusing on running the app at the bare minimum requirements)?
Look for any chance to optimise, focusing on tick() animation loop in JS, creating/removing note divs and Audio processing.

--- Sort Notes Feature ---
Resorting notes is not always perfect, some notes would be better suited to the closer hand than what the chosen hand is through the resort function.

## Recent resolved issues
--- Wakelock Inconsistency ---
The wakelock was still not always working as intended and keeping the screen awake when it should be closed. I'll need to retest it thouroughly and only allow it to keep the screen awake when it is playing audio, and ideally for only a minute or two if paused part way through, otherwise it should never keep the screen awake.

Added detailed tests to find issues with wake lock. 
After the 2 minute pause timer fires and releases the wake lock, returning to the app no longer incorrectly restarts the timer.
Is playing was false when starting autoplay as enable wakelock was being called too early, now works correctly.

--- Falling Notes Misplacement ---
When not extended, and after loading a saved music piece, falling notes land one key to the right of the key that lights up, this continues to happen if you change music piece but only for the first few notes in that music piece/saved music, the rest of it would be fine? It is the falling notes that are incorrect. Only seems to happen on mobile currently. Changed how noteDiv.style.left is set in create note div by copying how it is set in the update code (which works) which has seemingly now resolved this issue.
