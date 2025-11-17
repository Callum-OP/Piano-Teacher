# Demo Video


https://github.com/user-attachments/assets/f39fad40-3f1e-4631-811e-6a548815874b

# How to run
Visit the site on https://callum-op.github.io/Piano-Teacher/ 
alternatively use the version on itch.io on https://callum-op.itch.io/piano-teacher
If you have a touchscreen on a large screened device you can play the piano on screen.
There is an autoplay feature that will visually show how to play sheet music.
Select from a list of preset music or upload a MIDI file, alternatively enter the notes directly into the input in letter format (A1, As3+B4, etc), then click to start autoplay.
Use _ for rests and + to join several notes.

Sites I found with MIDI files include: 
https://onlinesequencer.net/
https://flat.io/search/
https://midifind.com/
https://www.midiworld.com/
https://bitmidi.com/
https://musescore.com/

## Features to consider
Show clearly the notes about to be played above the piano using letters.
When playing several notes at once in autoplay the underscores are not considered seperate for each note. Could make it possible to have one note last longer than another.
Improve ability to determine left or right hand based on notes in MIDI files (in midi-upload.js).
Give the autoplay editor a faded look if no music has been started?
Saving entered music notes into music.json? Maybe make it downloadable and then can be entered later to access saved music pieces in the preset list.

## Issues
The colours and layout on dark mode on some mobile browsers does not look right compared to the intended look.
If the user switches windows or tabs the audio and animation will stop playing. (Maybe it should automatically pause and resume instead? Alternatively see if it is possible for at least the audio to play when away from tab)
Notes may be too close together making it hard to tell them apart if many notes are played in succession.
If the tempo is changed the highlight on the piano keys will remain the same.

Older devices (10 years or more, expecially mobile will struggle to run the app as intended, either reduce lag or add an option to run the app in a simplified performance enhancing mode). Might be able to use canvas instead, which may give better performance.

