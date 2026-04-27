# jx Tools for After Effects

A panel I built for my own workflow that ended up saving enough time I figured I'd share it. It handles the repetitive stuff, the things that take 10 clicks when they should take one.

Its open source so you can always look into how i made it :)

---

## What it does

**Layers**
- Precompose selected layers individually in one go, each into its own comp, trimmed to the exact in/out point
- Toggle frame blending (Frame Mix or Pixel Motion) across multiple layers at once
- Enable motion blur on selected layers with comp-level blur switched on automatically
- Trim the comp duration to the work area, shifting all keyframes so the timeline starts at zero

**Colour**
- Load any `.ffx` preset file and apply it to a new adjustment layer at the top of your comp
- Quick Presets page: save a collection of your go-to `.ffx` files and apply any of them with a single click, no file browsing each time waiting for the effects page to load.

**Keyframes**
- Fit Keys to Clip: stretches selected keyframes to span the full layer duration without touching graph shapes or easing
- Custom easing editor: a bezier graph you can drag by hand, with five presets (Linear, Ease, In, Out, In/Out). Apply whatever curve you've drawn to all keyframes across selected layers in one click. Save curves you use often to a personal library

**Other**
- Auto-updates: checks GitHub on load and shows a banner when a new version is out. Falls back to a shell-level check if your network restricts the panel's browser, so it works in locked-down studio environments too
- Four accent colour themes
- Dark UI that doesn't fight with AE's own interface

---

## Install

Do NOT install via releases unless you are familiar with the process.

**[→ Download installer here](https://github.com/user-attachments/files/27121510/install.zip)**

Run `install.bat` on Windows or `install.command` on macOS (READ BELOW). It installs the newest version of the extension automatically into your after effects, without you needing to doing anything.

---

**macOS installing**

The `.command` file needs execute permission before it'll run.

1. Open Terminal — `Cmd + Space`, type Terminal, hit Enter
2. Type `chmod +x ` (with a space after the x)
3. Drag your `install.command` file into the Terminal window. The path fills in automatically
4. Press Enter
5. Double-click the `install.command` file to run it

---

Tested on After Effects 2026. Windows and macOS.

Running into any problems? Feel free to reach out to me by email: jx@jxffx.com
