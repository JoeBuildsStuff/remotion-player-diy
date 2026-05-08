# Development History

This summary is based on the commit history and current code shape.

## Initial App Foundation

The project started as a React, TypeScript, and Vite app. Early commits added project setup, ignored generated/editor files, and introduced a README based on the Vite template.

## First Editor Shell

The first product-shaped editor commit introduced the main UI frame:

- Toolbar.
- Inspector.
- Main editing area.
- Transport bar.
- Responsive layout.
- Tooltip-supported icon buttons.

This established the app as an editor prototype rather than a generic Vite app.

## Remotion and Releases

Remotion dependencies were added so the preview/export model could be built around Remotion compositions. Semantic-release was also added for automated releases from conventional commits.

## Selection and Inspector Work

The editor then gained selected clip state and richer inspector behavior:

- `selectedClipId` became shared editor state.
- The preview and timeline could select clips.
- The inspector switched from canvas-level editing to selected-clip editing.
- Clip update behavior moved into the editor context.

## Layout Editing

The next sequence of commits made visual clip editing more capable:

- Clip resizing.
- Alignment controls.
- Canvas fitting.
- Selection styles.
- Timeline layering.
- Rotation controls.
- Crop controls.
- Volume controls.
- Fade controls.

These commits shaped the current direct-manipulation behavior seen in the screenshot: selected clips have a blue outline, resize handles, a rotation handle, and synchronized inspector fields.

## Timeline Editing

Timeline work added the editing behaviors expected in a video tool:

- Multi-track rows.
- Insertable track behavior.
- Trim handles.
- dnd-kit dragging.
- Dragging clips between tracks.
- Split at playhead.
- Track visibility, mute, and delete controls.
- Independent preview and timeline zoom.
- Loop playback.

Timeline and preview selection were refined so the same selected clip drives both surfaces.

## Remotion Sequence Improvements

Premounting was added to Remotion sequences to make playback around clip boundaries smoother. The composition kept Remotion as the single rendering model for preview and export.

## Domain Refactor

The editor was reorganized into domain folders:

- `composition`
- `inspector`
- `model`
- `preview`
- `shell`
- `timeline`
- `toolbar`
- `transport`

This refactor replaced larger single-file editor modules with smaller files aligned to the visible editor surfaces.

## Export Infrastructure

Later commits added the optional server-side export path:

- Source uploads to Blob storage.
- A render dialog with progress.
- A pure render-only composition.
- Remotion server rendering through a Vercel Sandbox flow.
- Export quality controls.
- Cleanup for old uploaded sources, rendered outputs, and snapshot cache entries.

Export is important to the project, but it is not required to understand the editor UI. The core app remains a browser-based composition editor that can import, arrange, inspect, and preview content before export.
