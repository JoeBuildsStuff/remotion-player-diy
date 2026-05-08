# App Overview

Remotion Player DIY is a browser-based video editor prototype built with React, Vite, TypeScript, Remotion Player, Tailwind CSS, and shared UI primitives from `src/components/ui`.

The app lets a user import media, arrange clips on a multi-track timeline, preview the result in a Remotion-powered canvas, adjust selected clip properties in an inspector, and start a server-side video render when export infrastructure is configured.

## Primary Screen

The app is a single full-screen editor. The screenshot in the project discussion shows the intended working shape:

- A top toolbar with selection, text, import, export, zoom, and project information controls.
- A central preview canvas showing the current Remotion composition.
- Selection handles around the active clip for moving, resizing, and rotating directly on the canvas.
- A right inspector panel for source, timing, layout, fill, crop, video, audio, text, and export settings.
- A transport bar for split/delete, playback controls, loop, fullscreen playback, and timeline zoom.
- A bottom timeline with tracks, a ruler, selected clips, trim handles, a playhead, and type-colored clip bars.

## What Users Can Do Today

- Drop or import video, image, and audio files.
- Add text clips from the toolbar.
- Preview clips with Remotion Player.
- Select clips from the preview or timeline.
- Drag selected visual clips on the preview canvas.
- Resize and rotate selected visual clips from canvas handles.
- Change clip timing, source trim, position, dimensions, rotation, opacity, corner radius, crop, playback rate, audio volume, mute state, and fade settings.
- Edit text clip content, font, weight, size, line height, letter spacing, alignment, direction, fill color, stroke, background color, background radius, background padding, and fades.
- Move clips along the timeline and between tracks.
- Trim clips from the start or end of the timeline item.
- Split a selected clip at the playhead.
- Delete the selected clip from the transport bar or with Delete/Backspace.
- Play the current composition in fullscreen from the transport bar.
- Toggle track visibility, mute tracks, and delete tracks.
- Change canvas size using social/common presets or custom dimensions.
- Change export resolution scale, quality, and audio bitrate.

## Content Model

The editor represents every item as a `Clip`.

Clip types:

- `video`
- `audio`
- `image`
- `text`

All clips share timing and layout fields such as `startFrame`, `durationInFrames`, `trackIndex`, `x`, `y`, `width`, `height`, `rotation`, `opacity`, and fade settings. Media clips also carry source metadata, imported source file size, and upload state. Text clips add typography, stroke, and background fields.

## Design Direction

The UI is intentionally closer to a compact editing tool than a marketing page. It uses dark editor chrome, dense controls, icon buttons, accordions, timelines, sliders, grouped buttons, and numeric inputs.

Editor clip color is token-driven: video and default selection use the blue editor selection tokens, audio uses matching purple editor tokens, and image clips use matching teal editor tokens. Timeline clip bars and selection rings should stay aligned with those tokens.

Code changes should keep using the shared primitives in `src/components/ui` and semantic design-token classes such as `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`, and `bg-secondary`.
