# Current Limitations

This file documents the current app honestly so user-facing docs do not imply finished features that are only partially wired.

## Placeholder Toolbar Controls

These controls are visible but do not currently perform a full action:

- Rectangle tool.
- Dedicated image, video, and audio tool buttons.
- Undo.
- Redo.
- Save.

Media import currently works through drag-and-drop and the import media button.

## Placeholder Transport Controls

These controls are visible but not fully wired:

- Snap toggle.
- Global volume button.
- Fullscreen button.

Timeline zoom, split, delete selected item, seek, play/pause, jump to start/end, and loop are wired.

## Project Persistence

The editor state is currently in React state. There is no durable project save/load format wired to the Save button.

Imported media uses local object URLs for browser preview. Server-renderable media also needs uploaded `remoteSrc` values, but project persistence is separate from that upload state.

## Undo and Redo

Undo and redo buttons exist in the toolbar, but there is no history stack yet.

## Shape Tools

The clip model supports media and text clips. The rectangle button is present in the toolbar, but shape clip creation is not implemented in the current `ClipType` union.

## Captions

The video clip inspector has a Captions section placeholder. Caption import, editing, timing, and rendering are not implemented yet.

## Source File Metadata

The media clip Source section currently displays a placeholder file size value. File size should be connected to imported file metadata if it needs to be accurate.

## Export Requirements

The editor can be used for local editing and preview without export setup. Rendering a final video depends on the server-side render path and its environment configuration.
