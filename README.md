# jx Tools for After Effects

jx Tools is a compact After Effects panel for editors who want fewer clicks, faster setup, reusable curves, project imports, automation rules, and a cleaner v2 workflow.

## Version

Current stable: 2.0.1

## Status

No known blocking bugs after the latest debug pass. The current release includes the v2 UI, project media import workflow, system file search, notes, automations, profile controls, custom backgrounds, custom fonts, and the curve description model.

If you find a bug, email jx@jxffx.com.

## What is new in v2.0.1

- Real panel backgrounds now use a visible background layer, so grid, aurora, noise, and custom images appear behind the UI.
- Custom background upload works in CEP and browser preview, with image compression for safer localStorage use.
- Settings and the main panel are visually closer, with the old compact jx feel mixed with cleaner v2 spacing.
- Notes tab added for project reminders, timestamps, ideas, and edit notes saved locally.
- Automations expanded with more built-in rules, all disabled by default until the user enables them.
- Curve description suggestions now change every launch from a larger relevant editing phrase pool.
- Curve description model supports simple terms and editor phrases like zoom in, zoom out, slam in, slam out, mid deep, fast slow, and slow fast.
- Profile picture upload and crop flow now works more reliably in preview and CEP contexts.
- v2 version labels are synced across client, manifest, host, docs, and product notes.

## Project Files

- Drag image, video, audio, or a direct media link into the panel.
- Imported media is copied into a project-associated jx project files folder.
- Search local media files by name and add them without opening Finder manually.
- Imported items can trigger optional automation rules.

## Layers

- Precompose selected layers individually, trimmed to their in and out points.
- Toggle Frame Mix or Pixel Motion frame blending across selections.
- Enable motion blur on selected layers and the active comp.
- Trim comp to work area and shift timeline timing back to zero.
- Auto-label layers by type with configurable label colors.
- Center anchors while keeping layers visually in place.
- Create a null from selection and parent selected layers.
- Sequence layers end to end with an optional gap.
- Save selected layers as reusable stacks in Layer Library and restore them later.

## Animation

- Word by Word splits text by word and staggers timing.
- Beat Detection can mark beat markers or frequency markers for bass and treble hits.
- Snap selected keyframes to nearest comp markers.
- Optional import automation can mark beats when audio files are added.

## FX

- Echo Trail duplicates layers earlier in time with fading opacity.
- Loop Duplicate repeats layers directly after the previous copy.

## Colour

- Load .ffx presets onto a new adjustment layer.
- Save quick preset groups and apply them later with one click.

## Keyframes and Graphs

- Fit keys to clip without destroying graph shapes.
- Reverse keyframes and preserve interpolation behavior.
- Drag custom easing curves in the built-in graph editor.
- Generate curves from descriptions using the local curve description model.
- Save generated or hand-drawn curves as custom graph cards.
- Organize saved curves into graph menus.
- Import Flow and JerryFlow graph libraries when found on disk.

## Curve Description Model

- Uses a local generated model pack under client/js/curve-ai.
- Supports short editor terms, emotion words, physics descriptions, and mixed phrases.
- Suggestion chips rotate every panel launch from a larger pool of relevant edit prompts.
- The UI avoids model description clutter and focuses on the generated curve result.

## Automations

Automations run after files are imported through the jx project import flow. Built-in rules are disabled by default and can be enabled from the Automations page.

Included rules:

- Mark beats for added audio.
- Auto-label imported media.
- Fit comp to added video.
- Clean imported filenames.
- Open new videos or images in the footage viewer.
- Group imported media into a proxy folder.
- Match comp length to video duration.
- Add a start marker for imports.
- Create custom deletable rules from the panel.

## Notes

The Notes tab stores local edit notes, timestamps, reminders, and ideas directly inside the panel storage for quick access during a project.

## Settings

- Custom themes with preset colors and an OS color picker.
- Custom fonts and a dyslexia friendly option.
- Custom panel backgrounds with None, Grid, Aurora, Noise, and Custom Image options.
- Profile name, avatar upload, avatar crop, and footer identity.
- Simple mode for a calmer v2 interface.
- Section visibility, section reorder, collapsible sections, and advanced per-tool visibility.
- Developer page with diagnostics, logs, exports, smoke tests, storage repair, update checks, and advanced maintenance tools.
- Auto-update checks with installer fallback and snooze options.
- Editing timer in the footer.

## Install

MacOS and Windows installer:
https://github.com/williamm0/jxtools/releases/latest

## Tested

Tested on After Effects 2026, Windows 11, and macOS Tahoe 26.4.1.

Questions or suggestions: jx@jxffx.com
