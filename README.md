# jx Tools for After Effects

A panel I built for my own workflow that ended up saving enough time I figured I'd share it. It automates repetitive tasks, cutting 10 clicks to one.
The panel is open source, so you can inspect how I built it.

---
## What it does
**Layers**
- Precompose selected layers individually in one go, each into its own comp, trimmed to the exact in/out point
- Toggle frame blending (Frame Mix or Pixel Motion) across multiple layers at once
- Enable motion blur on selected layers with comp-level blur switched on automatically
- Trim the comp duration to the work area, shifting all keyframes so the timeline starts at zero
- Word-by-Word: splits a text layer by word, staggers in-points and fade-in opacity per word (offset in ms, adjustable)
- Auto-Label Layers: colors layers by type (footage/text/effects), renames footage as Clip_001, Clip_002, etc. Label colors are configurable per type in Settings
- Loop Duplicate: duplicates selected layers N times, each copy placed directly after the last
- Center Anchor: moves each layer's anchor point to comp center while keeping the layer visually in place
- Echo Trail: duplicates a layer N times shifted earlier in time with decreasing opacity (ghosting effect)

**Colour**
- Load any .ffx preset file and apply it to a new adjustment layer at the top of your comp
- Quick Presets page: save a collection of your go-to .ffx files and apply any of them with a single click, no file browsing each time waiting for the effects page to load.

**Keyframes**
- Fit Keys to Clip: stretches selected keyframes to span the full layer duration without touching graph shapes or easing
- Custom easing editor: a bezier graph you can drag by hand, with five presets (Linear, Ease, In, Out, In/Out). Apply whatever curve you've drawn to all keyframes across selected layers in one click. Save curves you use often to a personal library
- Reverse Keyframes: reverses all keyframes on selected layers, swapping in/out interpolation too
- Snap Keys to Markers: snaps selected keyframes to the nearest comp marker

**Markers & Timing**
- Add Beat Markers: places comp markers at regular BPM intervals from an optional offset

**Other**
- Auto-updates: checks GitHub on load and shows a banner when a new version is out. It also checks for updates at the shell level, working in locked-down studio environments.
- Four accent colour themes
- Dark UI that doesn't fight with AE's own interface
---
## Install
Do NOT install via releases unless you are familiar with the process.
**[→ Download the installer here](https://github.com/user-attachments/files/27121510/install.zip)**
Run install.bat on Windows or install.command on macOS. It installs the newest version of the extension automatically into your After-Effects, without you needing to doing anything.
---
**macOS installing**
The .command file needs execute permission before it'll run.
1. Open Terminal
2. Type `chmod +x ` (with a space after the x)
3. Drag your install.command file into the Terminal window. The path fills in automatically
4. Press Enter
5. Double-click the install.command file to run it
---
Tested on After Effects 2026. Windows 11 and macOS Tahoe 26.4.1.
Running into any problems or have suggestions? Reach out to me at jx@jxffx.com.
