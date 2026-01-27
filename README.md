# Demo Video

https://github.com/user-attachments/assets/e3545791-7b0c-4742-944d-777b0df4bf59


# How to run
Visit the site on https://callum-op.github.io/Piano-Teacher/ 
alternatively use the version on itch.io on https://callum-op.itch.io/piano-teacher

To run locally on localhost:3000 you can use a command like: python -m http.server 3000
Alternatively to run locally as a desktop app use: npx electron-builder --win appx
Assuming you have electron installed: npm install electron

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
--- Timeline/Progress Bar ---
A bar that shows where it is within the timeline of the current music piece, maybe with an option to click onto a part of the timeline to skip to there.

--- Better Rests ---
When playing several notes at once in autoplay the underscores are not considered seperate for each note, meaning several notes pressed at once will all be held down for the same length, could make it possible to have one note last longer than another.

--- Graphics ---
Show clearly the notes about to be played by placing the actual notes in letter notation onto the falling notes suring autoplay.
Give the autoplay editor a faded look if no music has been started?
Customisation? Such as dark mode, text size and colour theme selection.

--- Save custom music selections ---
Saving entered music notes into music.json? Maybe make it downloadable and then can be entered later to access saved music pieces in the preset list.

## Issues
--- Dark mode ---
The colours and layout on dark mode on some mobile browsers does not look right compared to the intended look.

--- Audio ---
If the user switches windows or tabs the audio and animation will stop playing. (Maybe it should automatically pause and resume instead? Alternatively see if it is possible for at least the audio to play when away from tab)

--- Performance ---
Older devices (10 years or more, expecially mobile will struggle to run the app as intended, either reduce lag or add an option to run the app in a simplified performance enhancing mode). Might be able to use canvas instead, which may give better performance.

--- Sort Notes Feature ---
Resorting notes into left and right hands works when only one hand has the notes, but it starts to not work so well at sorting notes when both hands have notes, it seems like the right hand get ignored.
Another issue with sorting is pressing the button again and again results in additional delays/underscores being added.
