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
Alternatively to build locally as a desktop app use: npx electron-builder --win appx 
If you want to build for android use: npm run build:samsung 
Then to sync: npx cap sync android

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

## Features to consider
--- Better Rests ---
When playing several notes at once in autoplay the underscores are not considered seperate for each note, meaning several notes pressed at once will all be held down for the same length, could make it possible to have one note last longer than another.

--- Graphics ---
Show clearly the notes about to be played by placing the actual notes in letter notation onto the falling notes suring autoplay.
Give the autoplay editor a faded look if no music has been started?
Customisation? Such as dark mode, text size and colour theme selection.

--- Save custom music selections ---
Saving entered music notes into music.json and saving it to device? Could be limited to native apps only.

## Top Issues
--- Mobile display ---
The latest operating system update for androids (One UI 7.0) causes issues with display as it overlays buttons over apps instead of creating space, this causes the phone screen buttons to overlay with buttons on the app meaning a section of the screen can not be used properly.

--- Wakelock stays enabled ---
The screen should turn off automatically once a music piece has ended or 5 minutes after it has paused, while this previously worked, it no longer seems to be the case.

## Minor Issues
--- Dark mode ---
The colours and layout on dark mode specifically on the web on some mobile browsers does not look right compared to the intended look.

--- Audio ---
If the user switches windows or tabs the audio and animation will stop playing. (Maybe it should automatically pause and resume instead? Alternatively see if it is possible for at least the audio to play when away from tab).

--- Performance ---
Older devices (10 years or more, will struggle to run the app as intended).
Add an option to run the app in a simplified performance enhancing mode (Removing the fancy visuals and focusing on running the app at the bare minimum requirements)?
Tried using canvas but not much difference to performance, if anything worse.
Look for any chance to optimise, focusing on tick() animation loop in JS, creating/removing note divs and Audio processing.

--- Sort Notes Feature ---
Resorting notes is not always perfect, some notes would be better suited to the closer hand than what the chosen hand is through the resort function.
