# Editor Workflows

This document explains how the current editor behaves from a user's point of view.

## Import Media

Users can add media in two ways:

- Drag files onto the preview area.
- Use the toolbar's import media button.

Accepted file categories are video, audio, and image. Importing creates browser object URLs immediately so the editor can preview local files without waiting for upload.

The import flow also probes metadata:

- Images use natural width/height and a default image duration.
- Videos use duration and video dimensions from a temporary media element.
- Audio uses duration from a temporary audio element.

New clips are placed on the first existing track for their type. If no matching track exists, the editor creates the next available track. Within a track, new clips are appended after the last clip.

## Preview and Canvas Editing

The preview area renders the composition with `@remotion/player`.

When clips exist, the preview shows the same Remotion composition model used for rendering. Visual clips can be selected and edited directly:

- Click a clip to select it.
- Drag the selected clip to change `x` and `y`.
- Drag edge/corner handles to resize.
- Drag the rotation handle to change rotation.
- Click empty canvas space to clear selection.

The preview can be zoomed with the top-right toolbar controls. `Fit` resets preview zoom to the fitted canvas size.

## Timeline Editing

The timeline contains a ruler, track headers, clip bars, and a playhead.

Users can:

- Click the timeline to seek.
- Select clips from the timeline.
- Drag clips horizontally to change start time.
- Drag clips vertically to move between tracks.
- Drag trim handles on a clip's start or end.
- Split the selected clip at the current playhead frame.
- Delete the selected clip.
- Toggle track visibility for visual clips.
- Toggle track mute for video and audio clips.
- Delete all clips on a track.
- Zoom the timeline with the transport slider or zoom buttons.

Timeline values are frame-based internally. The UI generally displays timing in seconds.

## Inspector Editing

The right panel switches based on selection.

When no clip is selected, the canvas inspector is shown:

- Canvas preset selection for common social and video sizes.
- Custom width and height.
- Canvas orientation swap.
- Current project duration.
- Clip list.
- Export settings.

When a media clip is selected, the clip inspector is shown:

- Source: file name, duration, and upload/status display.
- Timing: timeline start, clip length, and source trim.
- Layout: alignment, position, dimensions, aspect lock, and rotation.
- Fill: opacity and corner radius.
- Crop: left, top, right, and bottom crop controls.
- Video: playback rate plus video fade in/out for video clips.
- Audio: mute, volume, and audio fade in/out for video and audio clips.
- Captions: visible placeholder for future caption work.

When a text clip is selected, the text inspector is shown:

- Layout: alignment, position, dimensions, aspect lock, and rotation.
- Typography: font, weight, size, line height, letter spacing, text content, alignment, and direction.
- Fill: opacity and text color.
- Stroke: stroke width and color.
- Background: background color, radius, and horizontal padding.
- Fade: text fade in/out.

## Playback

The transport bar controls playback through the Remotion Player ref:

- Jump to start.
- Play or pause.
- Jump to end.
- Toggle looping.
- Display current time and total duration.

Duration is computed from the latest clip end time. Empty projects still render as a minimum one-frame preview internally.

## Export

The editor includes a render dialog and export controls. Export is optional infrastructure: users can edit and preview locally without setting it up.

Export settings currently include:

- Resolution scale.
- Video quality.
- Audio bitrate.

Server-side export details live outside this app workflow document. See the README and `docs/server-side-rendering/` when changing render infrastructure.
