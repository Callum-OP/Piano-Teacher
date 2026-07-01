# Piano Teacher

An interactive way to learn piano using a visual piano interface. Load a preset piece or a MIDI file, then watch autoplay light up the keys to show you exactly how it's played.

## Demo

https://github.com/user-attachments/assets/e3545791-7b0c-4742-944d-777b0df4bf59

## Download

Piano Teacher is available across desktop, mobile, and the web:

| Platform | Where to get it |
| --- | --- |
| Android (Google Play) | https://play.google.com/store/apps/details?id=io.github.callumop.pianoteacher |
| Windows (Microsoft Store) | https://apps.microsoft.com/detail/9ngq60108m5s?hl=en-GB&gl=GB |
| Web (Itch.io) | https://callum-op.itch.io/piano-teacher |
| Web (development build) | https://callum-op.github.io/Piano-Teacher/ |

> The version number can be found in `android/app/build.gradle` and `package.json`.

## Features

- **Visual autoplay** — select a preset piece or upload a MIDI file, then click to start autoplay and see how the music is played on the keys.
- **On-screen piano** — on a large touchscreen device you can play the piano directly on screen.
- **Search and filter** — use the search boxes above the preset and saved music lists to filter them. Matching pieces appear in a clickable list; press **Enter** to pick the first match.
- **Limit notes to piano size** — enable *Limit Notes to Piano Size* in settings to automatically discard notes outside the current piano's range when loading a preset, saved piece, or MIDI file (useful on a smaller piano).
- **Hand isolation** — use the Left/Right hand toggle buttons to silence a hand during autoplay so you can focus on one hand at a time, then re-enable it when ready.
- **Playback control** — press the **spacebar** to play/pause autoplay (it won't trigger while you're typing in a field). Click the tempo value (e.g. `1x`) to reset the tempo. Dragging the tempo slider lands exactly where you release it; only a click/tap near the middle snaps to `1x`.

### Music Editor (beta)

Enable *Show Music Editor* in settings to reveal the **Editor Mode** button (top-right, above the piano). In the editor, the area above the real piano becomes an editable note grid aligned to the keys:

- Pick a **Tool** — *Left*/*Right* places a note above a key (or tap an existing note to move it to that hand), *Erase* removes a note; set a note **Length** too.
- **Drag** a note to move it, drag its **top edge** to change its length, and **scroll** to scrub/preview (time runs upward, the start nearest the keys). It's touch-friendly.
- Use **Load music** to pull in the current inputs, the piano's normal **Play** button to apply your edits and hear them, and **Done editing** to finish.

Alternatively, enter notes directly into the input in letter format (`A1`, `Fs3`, etc.), using `_` for rests and `+` to play several notes at once.

## Getting started

Assuming you have [Node.js](https://nodejs.org/) installed, set up dependencies with:

```bash
npm install
```

### Run in the browser

Serve the app locally on `localhost:3000` with either:

```bash
npx http-server .
# or
python -m http.server 3000
```

### Run as a desktop app (Tauri)

Requires the [Rust toolchain](https://www.rust-lang.org/tools/install).

```bash
npm run tauri:dev
```

### Build for the Microsoft Store (MSIX)

Build and package the desktop app for the Microsoft Store as MSIX (both arm64 and x64) in one command:

```bash
npm run build-store
```

This outputs `dist/PianoTeacher_<version>.msixbundle` — a single multi-architecture bundle (arm64 + x64). The individual per-architecture MSIX files are in `dist/packages/`. See [`src-tauri/msix/README.md`](src-tauri/msix/README.md) for details.

> The command runs: clean `dist`, build arm64, build x64, pack each into an MSIX, then combine them into one `.msixbundle`.

### Build for Android

You'll need something like [Android Studio](https://developer.android.com/studio). Sync changes with:

```bash
npx cap sync android
```

### Run tests

```bash
npm test
```

## Finding MIDI files

Sites with MIDI files you can upload include:

- https://onlinesequencer.net/
- https://flat.io/search/
- https://midifind.com/
- https://www.midiworld.com/
- https://bitmidi.com/
- https://musescore.com/

## Roadmap

Planned features and known issues, in order of priority (highest first).

### Top features to consider

**Expand Music Editor**
- Export the edited/saved music back out as a MIDI file.
- Make it easier to use and understand.

**UI improvements**
- Shrink the play buttons if the screen width gets too cramped so they stay on the same level, or reduce padding/margin.
- Make the piano bigger — a piano scale bar setting, or just have the piano be the max possible size with no blank space.
- Give the autoplay editor and buttons a faded look if no music has been started.
- Reduce the distance between the piano and playback controls, so there's more space on screen when you want both visible during autoplay.

### Features to consider

**Bigger preset list**
- Add more classical music pieces to the preset list.

**Import/export saved music list**
- Option to export the saved music list and import it to the app on another device, so lists can be shared across devices or with other people.
- Sharing saved music across devices automatically would require somewhere to host and store the data (or another sync mechanism) and likely a login — more hassle than it's worth for now.

**Save current music & progress**
- If you exit the app with a piece open/paused, save which piece was last open and exactly where you were in the timeline, so you can resume exactly where you left off.

**Customisation**
- Light/dark mode and colour theme selection.

**Save tempo**
- When saving a piece, save the last tempo setting used for it and restore it on load — for example, via a preferred-tempo option when saving.

**Select specific MIDI tracks**
- Let users see all the tracks within an uploaded MIDI file and choose which ones play, since some contain unnecessary background noise or instruments. This would likely need a new section giving the user full control over the uploaded MIDI file.

**Piano audio options**
- Different piano types each sound slightly different; offering a choice in settings would let users pick one they're familiar with. Requires collecting the necessary audio files.

### Top issues

None at the moment.

### Minor issues

**Sort Notes feature**
- Resorting notes isn't always perfect — some notes would suit the closer hand better than the chosen one. This is fundamentally a hard problem; the current sort works well so far, but making it perfect may require a complete rewrite of the sort logic, at the risk of making it worse.
- Another limitation: when pieces have more notes and are wider than can physically be played, it may be worth sorting a third hand of background notes so the rest can still be shown accurately.

**Note rests**
- When playing several notes at once in autoplay, the underscores aren't considered separately for each note, so notes pressed together are all held for the same length. Allowing one note to last longer than another isn't a quick fix — it's a fundamental limitation of the note format the app uses.
