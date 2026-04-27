# jx Tools for After Effects

A panel I built for my own workflow that ended up saving enough time I figured I'd share it. It automates repetitive tasks, cutting 10 clicks to one. The panel is open source, so you can inspect how I built it.

---

## KNOWN BUGS & ERRORS

**V1.1.0:**
- Beat detection not working as expected
- Update tool not working (only for updating to pre-release)
- Easing not working

**V1.1.1 (pre-release)**
- Beat detection not loading audio
- Update tool not working (only for updating to pre-release)
- Easing not working

---

## What it does

**Layers**
- Precompose selected layers individually in one go, each into its own comp, trimmed to the exact in/out point
- Toggle frame blending (Frame Mix or Pixel Motion) across multiple layers at once
- Enable motion blur on selected layers with comp-level blur switched on automatically
- Trim the comp duration to the work area, shifting all keyframes so the timeline starts at zero
- Auto-Label Layers: colors layers by type and renames them — footage as `Clip_001`, text as `Text_001`, shapes as `Shape_001`, adjustment layers as `Adj_001`. Label colors are configurable per type in Settings
- Center Anchor: moves each layer's anchor point to comp center while keeping the layer visually in place

**Animation**
- Word-by-Word: splits a text layer by word, staggers in-points and fades in opacity per word (offset in ms, adjustable)
- Detect Beats: analyses the audio layer in your comp and places comp markers at every detected beat automatically. Falls back to a manual BPM input if no audio layer is found
- Snap Keys to Markers: snaps selected keyframes to the nearest comp marker

**FX**
- Echo Trail: duplicates a layer N times shifted earlier in time with decreasing opacity
- Loop Duplicate: duplicates selected layers N times, each copy placed directly after the last

**Audio**
- Automatically add beats to your audios

**Colour**
- Load any .ffx preset and apply it to a new adjustment layer at the top of your comp
- Quick Presets page: save a collection of your go-to .ffx files and apply any of them with a single click, no file browsing each time

**Keyframes**
- Fit Keys to Clip: stretches selected keyframes to span the full layer duration without touching graph shapes or easing
- Reverse Keyframes: reverses all keyframes on selected layers, swapping in/out interpolation too
- Custom easing editor: a bezier graph you drag by hand, with twelve presets (Linear, Ease, In, Out, In/Out, Smooth, Snap, Pop, Film, Heavy, Sharp, Settle). Apply the curve to all keyframes on selected layers in one click. Save curves you use often to a personal library

**Other**
- Auto-updates: checks GitHub on load and shows a banner when a new version is out. Downloads and installs with a real progress bar, then prompts you to restart AE. Settings and saved curves are backed up before install and restored automatically. Works in locked-down studio environments via a shell-level fallback
- Option to include pre-releases in update checks
- Four accent colour themes
- Dark UI that doesn't fight with AE's own interface

---

## Install

**[Installer for Mac & Windows.zip](https://github.com/user-attachments/files/27140882/Install.Mac.Windows.zip)**

Run `install.bat` on Windows or `install.command` on macOS. It fetches and installs the latest release automatically — you'll be asked whether you want the latest stable or a pre-release if one is available.

---

Tested on After Effects 2026, Windows 11 and macOS Tahoe 26.4.1.

Questions or suggestions → [jx@jxffx.com](mailto:jx@jxffx.com)
