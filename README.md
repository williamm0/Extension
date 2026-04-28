# jx Tools for After Effects

A panel I built for my own workflow that ended up saving enough time I figured I'd share it. It automates repetitive tasks, cutting 10 clicks to one. The panel is open source, so you can inspect how I built it.

---
## KNOWN BUGS & ERRORS

- Updater stuck at 0%
- Theme color wheel not working 

If you experience any bugs, reach out to me by email: [jx@jxffx.com](mailto:jx@jxffx.com)

---

## What it does

**Layers**
- Precompose selected layers individually in one go, each into its own comp, trimmed to the exact in/out point
- Toggle frame blending (Frame Mix or Pixel Motion) across multiple layers at once
- Enable motion blur on selected layers with comp-level blur switched on automatically
- Trim the comp duration to the work area, shifting all keyframes so the timeline starts at zero
- Auto-Label Layers: colors layers by type and renames them — footage as `Clip_001`, text as `Text_001`, shapes as `Shape_001`, adjustment layers as `Adj_001`. Label colors are configurable per type in Settings
- Center Anchor: moves each layer's anchor point to comp center while keeping the layer visually in place
- Null from Selection: creates a null at comp center and parents all selected layers to it
- Sequence Layers: places selected layers end-to-end in time with an optional gap between each
- Null from Selection: creates a null at comp center, spans the time range of your selection, and parents all selected layers to it

**Animation**
- Word-by-Word: splits a text layer by word, staggers in-points and fades in opacity per word (offset in ms, adjustable)
- Beat Detection — two modes:
  - **Beat Marking**: analyses the audio layer in your comp, detects tempo via autocorrelation, and places comp markers at every beat. Sensitivity slider controls how strict the beat threshold is. Shows detected BPM and marker count
  - **Frequency**: places markers separately for bass (20–250 Hz) and treble (4k+ Hz) hits. Each band has an independent threshold slider and minimum gap control. Markers are labeled in the AE timeline so you can tell them apart
- Snap Keys to Markers: snaps selected keyframes to the nearest comp marker

**FX**
- Echo Trail: duplicates a layer N times shifted earlier in time with decreasing opacity
- Loop Duplicate: duplicates selected layers N times, each copy placed directly after the last

**Colour**
- Load any .ffx preset and apply it to a new adjustment layer at the top of your comp
- Quick Presets page: save a collection of your go-to .ffx files and apply any of them with a single click

**Keyframes**
- Fit Keys to Clip: stretches selected keyframes to span the full layer duration without touching graph shapes or easing
- Reverse Keyframes: reverses all keyframes on selected layers, swapping in/out interpolation too
- Custom easing editor: a bezier graph you drag by hand, with twelve presets. Apply the curve to all keyframes on selected layers in one click. Save curves to a personal library

**Settings**
- Color wheel: a 5th swatch next to the presets opens a full OS color picker; any hex color gets applied with derived soft/mid variants
- Font selector: System / Mono / Serif in settings, applied via --font-ui CSS variable
- Greeting: time-based ("good morning", "afternoon", "working late"…) with your name shown in the header; set your name in settings
- Developer page: new </> icon in the header shows session action count, a live log of the last 30 tool calls with timestamps and ok/fail status, and a dump of all jx_* localStorage keys. Also has a "Clear All" button
- Advanced section toggle: below the section checkboxes in settings, an "Advanced ›" expandable shows per-item checkboxes for every individual button/tool in the panel
- Configurable label colors per layer type
- Panel Sections: show or hide any section, if you never use FX tools or the easing editor, hide them
- Auto-updates: checks GitHub on load, downloads and installs with a progress bar, backs up and restores your settings automatically. Option to include pre-releases

---

## Install

**[→ Download the installer here](https://github.com/user-attachments/files/27140882/Install.Mac.Windows.zip)**

Run `install.bat` on Windows or `install.command` on macOS. It fetches and installs the latest release automatically — you'll be asked whether you want the latest stable or a pre-release if one is available.

---

**macOS:** the `.command` file needs execute permission before it'll run.

1. Open Terminal
2. Type `chmod +x ` (with a space after the x)
3. Drag `install.command` into the Terminal window — the path fills in automatically
4. Press Enter
5. Double-click the file to run it

---

Tested on After Effects 2026, Windows 11 and macOS Tahoe 26.4.1.

Questions or suggestions → [jx@jxffx.com](mailto:jx@jxffx.com)
