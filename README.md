# jx Tools for after effects

jx Tools is an after effects panel built for editors. It puts layer controls, easing curves, project file management, automations, colour presets, beat detection, and animation utilities in one panel.

Current stable: **2.0.1** · [Download installer](https://github.com/williamm0/Extension/releases/tag/INSTALLER)

<img width="2500" height="1080" alt="jxtoolsv2" src="https://github.com/user-attachments/assets/39929d9e-0a3f-478c-bd47-9e4b091e4482" />

## Quick start

1. Download the macOS or Windows installer from [Releases](https://github.com/williamm0/Extension/releases/tag/INSTALLER).
2. Install jx Tools.
3. Open after effects.
4. Open the panel from the after effects Window menu.
5. Turn on the sections and tools you want from Settings.

## Tested on

- after effects 2026
- Windows 11
- macOS Tahoe

## Project files

Drag in an image, video, audio file, or a direct media link and the extension handles the rest. Imported media gets copied into a project folder, keeping things organized without extra Finder or Explorer work. You can also search local files by name and pull them in from inside the panel. Automations can trigger automatically on import if you want them to.

## Layers

- Precompose selected layers individually, each trimmed to its own in and out points.
- Toggle Frame Mix or Pixel Motion frame blending across a selection.
- Enable motion blur on selected layers and the active comp at once.
- Trim the comp to the work area and shift everything back to zero.
- Auto-label layers by type using configurable label colours.
- Center anchors while keeping layers visually in place.
- Create a null from a selection and parent the layers to it.
- Sequence layers end to end with an optional gap between them.
- Save selected layer setups as reusable stacks in the Layer Library and restore them on any project.

## Animation

- **Word by Word** splits a text layer by word and staggers the timing.
- **Beat Detection** scans audio and places beat markers, with separate options for bass and treble hits.
- Snap selected keyframes to the nearest comp markers.
- Import automation can mark beats automatically when audio is brought in.

## FX

- **Echo Trail** duplicates layers earlier in time with fading opacity for a motion trail effect.
- **Loop Duplicate** repeats layers directly after the previous copy.

## Colour

- Load `.ffx` presets onto a new adjustment layer in one click.
- Save quick preset groups and apply them later without hunting through folders.

## Curves and Graph Editor

- Draw custom easing curves directly in the panel's built-in graph editor.
- Fit keyframes to a clip without breaking the graph shape.
- Reverse keyframes and keep interpolation intact.
- Describe a curve in plain words, like “slam in”, “slow fast”, or “mid deep”, and the local model generates it.
- Save generated or hand-drawn curves as cards and organize them into menus.
- Suggestion chips rotate every launch so you keep discovering useful phrases.
- Import Flow and JerryFlow graph libraries when they're found on disk.

## Automations

Automations run after files come in through the project import flow. Everything is off by default, so you choose what runs.

Built-in rules:

- Mark beats for added audio
- Auto-label imported media
- Fit comp to added video
- Clean imported filenames
- Open new footage in the viewer
- Group media into a proxy folder
- Match comp length to video duration
- Add a start marker on import

You can also build and delete your own rules from inside the panel.

## Notes

A notes tab for edit reminders, timestamps, ideas, and anything else worth keeping close to the project. Notes are saved locally inside the panel.

## Settings

- Custom themes with preset colours and a full OS colour picker.
- Custom fonts, including a dyslexia-friendly option.
- Panel backgrounds: None, Grid, Aurora, Noise, or a custom uploaded image.
- Profile name, avatar upload, and crop.
- Simple mode for a quieter interface.
- Control which sections are visible, reorder them, and collapse them.
- Per-tool visibility for more advanced setups.
- Developer page with diagnostics, logs, storage repair, smoke tests, update checks, and maintenance tools.
- Auto-update checks with an installer fallback and snooze.
- Editing timer in the footer.

## Install

macOS and Windows installer:

https://github.com/williamm0/Extension/releases/tag/INSTALLER

## Support

Questions or bugs: jx@jxffx.com
