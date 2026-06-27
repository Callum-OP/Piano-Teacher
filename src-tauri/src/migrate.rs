//! One-time recovery of saved music from the old Electron build.
//!
//! The Electron version loaded `build/index.html` via `loadFile`, so its origin was
//! `file://` and it stored `localStorage` (key `customMusic`) in Chromium's LevelDB.
//! The Tauri build runs in WebView2 at `http://tauri.localhost` — a different origin,
//! so that data is invisible to it (orphaned, not deleted). Both ship under the same
//! MSIX package identity and therefore share the per-user package folder, so we can
//! read the old LevelDB here and hand the value back to the frontend, which re-stores
//! it under the new origin. See `src-tauri/msix` and the project notes for context.

use std::fs;
use std::path::{Path, PathBuf};

use rusty_leveldb::{LdbIterator, Options, DB};

/// MSIX package family name is `<Name>_<publisher-hash>`. The hash is stable for our
/// identity, but we match by this prefix so we never depend on the exact value.
const PKG_PREFIX: &str = "Callum-OP.PianoTeacherbyCallum-OP";

/// Locate the old Electron `Local Storage\leveldb` directory, if it still exists.
fn legacy_leveldb_dir() -> Option<PathBuf> {
    let local = std::env::var_os("LOCALAPPDATA")?;
    let packages = Path::new(&local).join("Packages");
    let pkg = fs::read_dir(&packages)
        .ok()?
        .flatten()
        .find(|e| e.file_name().to_string_lossy().starts_with(PKG_PREFIX))?;
    let dir = pkg
        .path()
        .join("LocalCache")
        .join("Roaming")
        .join("piano-teacher")
        .join("Local Storage")
        .join("leveldb");
    dir.is_dir().then_some(dir)
}

/// Copy the leveldb files into a throwaway dir before opening, because opening a DB
/// replays its write-ahead log and may compact — we must never mutate the user's
/// original data, and a copy also lets the migration be retried safely.
fn copy_db_to_temp(src: &Path) -> std::io::Result<PathBuf> {
    let tmp = std::env::temp_dir().join("pt-legacy-ls");
    let _ = fs::remove_dir_all(&tmp); // start clean each run
    fs::create_dir_all(&tmp)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            fs::copy(entry.path(), tmp.join(entry.file_name()))?;
        }
    }
    Ok(tmp)
}

fn contains(haystack: &[u8], needle: &[u8]) -> bool {
    haystack.windows(needle.len()).any(|w| w == needle)
}

/// Decode a Chromium Local Storage value: the first byte is an encoding marker
/// (0 = UTF-16LE, 1 = Latin-1) and the rest is the payload.
fn decode_value(v: &[u8]) -> Option<String> {
    match v.split_first()? {
        (0, rest) => {
            let units: Vec<u16> = rest
                .chunks_exact(2)
                .map(|c| u16::from_le_bytes([c[0], c[1]]))
                .collect();
            String::from_utf16(&units).ok()
        }
        (1, rest) => Some(rest.iter().map(|&b| b as char).collect()),
        _ => None,
    }
}

/// Scan the DB for the `customMusic` entry (its key ends with the script key, under
/// the old `file://` origin) and return the decoded JSON string.
fn read_custom_music(db_dir: &Path) -> Option<String> {
    let opt = Options {
        create_if_missing: false,
        ..Default::default()
    };
    let mut db = DB::open(db_dir, opt).ok()?;
    let mut it = db.new_iter().ok()?;
    let (mut key, mut val) = (Vec::new(), Vec::new());
    while it.advance() {
        it.current(&mut key, &mut val);
        if contains(&key, b"customMusic") {
            return decode_value(&val);
        }
    }
    None
}

/// Returns the legacy `customMusic` JSON string if it can be recovered, else `null`.
/// Safe to call repeatedly; it only ever reads a throwaway copy of the old data.
#[tauri::command]
pub fn legacy_custom_music() -> Option<String> {
    let dir = legacy_leveldb_dir()?;
    let tmp = copy_db_to_temp(&dir).ok()?;
    let result = read_custom_music(&tmp);
    let _ = fs::remove_dir_all(&tmp);
    result
}
