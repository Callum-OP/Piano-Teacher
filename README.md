# Demo Video

https://github.com/user-attachments/assets/e3545791-7b0c-4742-944d-777b0df4bf59


# Versions
The Microsoft Store desktop app version: https://apps.microsoft.com/detail/9ngq60108m5s?hl=en-GB&gl=GB
The Itch.io web app version: https://callum-op.itch.io/piano-teacher
The development web app version: https://callum-op.github.io/Piano-Teacher/ 

# How to run
To run locally on localhost:3000 you can use a command like: python -m http.server 3000
Alternatively to run locally as a desktop app use: npx electron-builder --win appx
Assuming you have node, electron and the other dependencies in package.json installed, use: npm install

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
Saving entered music notes into music.json? Maybe make it downloadable and then can be entered later to access saved music pieces in the preset list.

## Issues
--- Timeline bar ---
On mobile the css is a bit wide.

--- Dark mode ---
The colours and layout on dark mode on some mobile browsers does not look right compared to the intended look.

--- Audio ---
If the user switches windows or tabs the audio and animation will stop playing. (Maybe it should automatically pause and resume instead? Alternatively see if it is possible for at least the audio to play when away from tab)

--- Performance ---
Older devices (10 years or more, expecially mobile will struggle to run the app as intended, either reduce lag or add an option to run the app in a simplified performance enhancing mode). Might be able to use canvas instead, which may give better performance.

--- Sort Notes Feature ---
Resorting notes is not always perfect, some notes would be better suited to the closer hand than what the chosen hand is through the resort function.
