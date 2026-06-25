# MSIX packaging + Store certification (Tauri build)

Tauri's Windows build produces an `.msi` and an NSIS `.exe`, but the Microsoft Store
listing for this app is an **MSIX/appx** (built automatically by electron-builder for the
Electron version). This folder bridges that gap: it wraps the self-contained Tauri exe in
an MSIX using the **same Store identity** as the existing listing, so it's submission-ready
and can be checked locally with the Windows App Certification Kit (WACK).

The Tauri exe is self-contained — Tauri embeds the `build/` frontend into the binary — so the
MSIX payload is just `piano-teacher.exe` + the Store logo assets (already generated in
`../icons/` by `npm run tauri icon`).

## Files
- `AppxManifest.xml` — packaged full-trust desktop app manifest; identity matches `package.json`'s `appx` block.
- `pack.ps1` — stages the payload and runs `MakeAppx`; `-TestSign` also self-signs for local testing.

## 1. Build + package — one command
```powershell
npm run build-store      # builds arm64 + x64, packs each, bundles into dist\*.msixbundle
```
This produces **`dist\PianoTeacher_<version>.msixbundle`** — a single **unsigned** multi-arch
bundle you upload to Partner Center (the Store re-signs it with your publisher identity). The
per-arch MSIX it's built from are left in `dist\packages\`. Equivalent to running:
```powershell
npm run tauri:clean                                   # clears dist
npm run tauri:build:arm64 ; npm run tauri:pack:arm64  # -> dist\packages\...arm64.msix
npm run tauri:build:x64   ; npm run tauri:pack:x64    # -> dist\packages\...x64.msix
npm run tauri:bundle                                  # -> dist\*.msixbundle
```
`pack.ps1`/`bundle.ps1` can also be called directly (e.g. `./src-tauri/msix/pack.ps1 -Arch x64`).

## 2. Test locally with WACK (the cert pre-check)
WACK is the *Windows App Certification Kit* — install it via the **Visual Studio Installer**
(Individual components → "Windows App Certification Kit") or the **Windows SDK installer**.

To install the package locally, it must be signed by a trusted cert whose subject matches the
manifest `Publisher`. `pack.ps1 -TestSign` handles signing with a throwaway cert:

```powershell
./src-tauri/msix/pack.ps1 -TestSign         # packs + self-signs
```

Then, in an **elevated (admin) PowerShell**, trust the cert and install (the script prints the
exact commands with the right thumbprint), e.g.:
```powershell
Export-Certificate -Cert Cert:\CurrentUser\My\<thumbprint> -FilePath $env:TEMP\pt-test.cer
Import-Certificate -FilePath $env:TEMP\pt-test.cer -CertStoreLocation Cert:\LocalMachine\TrustedPeople
Add-AppxPackage -Path "dist\PianoTeacher_1.3.0.0_arm64.msix"
```

Run WACK against the installed app:
- **GUI:** launch *Windows App Cert Kit* → **Validate Store App** → select *Piano Teacher by
  Callum-OP* → it runs the suite and writes an HTML/XML report.
- **CLI:** `& "C:\Program Files (x86)\Windows Kits\10\App Certification Kit\appcert.exe" reset`
  then `appcert.exe test -apptype windowsstoreapp -packagefullname <PFN> -reportoutputpath report.xml`
  (get `<PFN>` from `Get-AppxPackage *PianoTeacher* | % PackageFullName`).

## Known things WACK / the Store may flag
- **WebView2 dependency.** The app relies on the Evergreen WebView2 Runtime (preinstalled on
  Win11 / most Win10). WACK won't fail on this, but if you want to guarantee it on older Win10,
  either declare a dependency on the WebView2 Runtime framework package or bundle the fixed
  runtime. Left on Evergreen for now.
- **Architecture.** Both **arm64** and **x64** MSIX packages are produced; submit both to the
  one Store listing. The host is Windows-on-ARM, so x64 is a cross-compile:
  `rustup target add x86_64-pc-windows-msvc`, then
  `npm run tauri:build -- --target x86_64-pc-windows-msvc --no-bundle`, then `pack.ps1 -Arch x64`.
- **Build environment (this machine).** An AV/proxy intercepts TLS, which breaks Node's and
  cargo's default certificate checks. Set `NODE_OPTIONS=--use-system-ca` for `npm install`, and
  `CARGO_HTTP_CHECK_REVOKE=false` for cargo downloads (or add `[http]` / `check-revoke = false`
  to `~/.cargo/config.toml` to make it permanent).
- **runFullTrust** is a restricted capability — normal and expected for a packaged desktop app;
  the Store allows it.

WACK is a **local pre-check**, not the final word — Microsoft's own review during submission is
the real gate. But it catches the great majority of certification blockers up front.
