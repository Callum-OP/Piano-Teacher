# Tauri desktop wrapper (experimental)

This is the [Tauri 2](https://v2.tauri.app/) desktop wrapper. It **replaces** the previous
Electron desktop build (Electron was removed on this branch; it still exists on `main` /
earlier history if you ever need it). The Capacitor (Android) setup is untouched.

Why: Tauri uses the OS WebView (WebView2 on Windows) instead of bundling Chromium, so the
installer is typically **~10–20 MB instead of Electron's ~300 MB**. Tauri 2 can also target
Android/iOS, so it could eventually replace both wrappers with one toolchain.

The frontend is the **existing static `build/` folder** (`frontendDist: "../build"`) — there's
no build step, and the web app needs no native glue (it uses no Electron/Capacitor APIs at
runtime; the old `window.env.isPackaged` bridge was never used).

## Prerequisites (one-time, on your machine)
1. **Rust** via [rustup](https://rustup.rs/).
2. **Windows build tools**: the *Desktop development with C++* workload (MSVC) from Visual
   Studio Build Tools, and **WebView2** (preinstalled on Windows 10/11).
3. `npm install` (pulls in `@tauri-apps/cli`).

## First run — generate the app icons
The config references `src-tauri/icons/*`, which don't exist yet. Generate them from a square
PNG (the repo has one in `assets/`):

```
npm run tauri icon assets/icon-only.png
```

This populates `src-tauri/icons/` (ico/icns/png set).

## Develop / build
```
npm run tauri:dev      # launches the app in a dev window (hot-reloads the static files)
npm run tauri:build    # produces an installer + exe in src-tauri/target/release/bundle/
```

## Notes & things to check
- **Windows = WebView2 (Chromium)** → very high compatibility with the current Electron build
  (also Chromium). Audio, the falling-note transforms, etc. should behave the same.
- **Audio autoplay:** the old Electron build set `autoplay-policy=no-user-gesture-required`. The
  web app already resumes the `AudioContext` on the first click, so this should be fine; if audio
  ever won't start, pass a WebView2 arg (`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS`) or wire an
  equivalent window option.
- **External privacy-policy link** (`target="_blank"`): in a WebView this may open in-window or be
  blocked. If so, intercept external-link clicks and call the bundled `opener` plugin — guard it
  with `if (window.__TAURI__)` so the shared frontend still works under Electron/Capacitor/web.
- **macOS / iOS would use WKWebView (WebKit), not Chromium** — so if you later unify mobile or add
  a Mac build, re-test rendering there (`backdrop-filter`, Web Audio) before relying on it.
- This scaffold has **not been built or tested** (no Rust toolchain in the dev environment where it
  was written) — run `npm run tauri:dev` to validate.
