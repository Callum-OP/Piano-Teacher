# How to run
Visit the site on https://callum-op.github.io/Piano-Teacher/ 
If you have a touchscreen on a large screened device you can play the piano on screen.
There is an autoplay feature that will visually show how to play sheet music.
Select from a list of preset music or upload a MIDI file, alternatively enter the notes directly into the input in letter format (A1, As3+B4, etc), then click to start autoplay.

Sites I found with MIDI files include: 
https://flat.io/search/
https://midifind.com/
https://www.midiworld.com/
https://bitmidi.com/
https://musescore.com/

## Features to consider
Show clearly the notes about to be played above the piano using letters.
When playing several notes at once in autoplay the underscores are not considered seperate for each note. Could make it possible to have one note last longer than another.
Improve ability to determine left or right hand based on notes in MIDI files.
Show clearly which notes are the left and which are the right hand. (Use different colours).
Give the autoplay editor a faded look if no music has been started.

## Issues
May make a popping sound when it has just began playing audio.
Pressing the same note again in autoplay is quicker than playing a different note.
High memory usage when playing music with lots of notes.
The colours and layout on dark mode on mobile do not look quite right compared to the intended look.
Due to how audio now works it won't play correctly if the animation does not complete, so if the user switches windows or tabs the audio will stop.
Notes may be too close together and it is hard to tell then if the note is held down or pressed several times.