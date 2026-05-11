## [1.3.3](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.3.2...v1.3.3) (2026-05-11)


### Bug Fixes

* memoize preview player input props ([b6af8fc](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/b6af8fc880fef59dc3225e24895103e4b2104e89))

## [1.3.2](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.3.1...v1.3.2) (2026-05-11)


### Bug Fixes

* normalize render scale to codec-safe dimensions ([abd52f7](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/abd52f76963470bddcd29d366251f8a4eaac2aec))

## [1.3.1](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.3.0...v1.3.1) (2026-05-11)


### Bug Fixes

* adjust empty state UI in preview component for better alignment and spacing ([93f5a76](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/93f5a76b93adb377afeed896eb0259041de2d8bf))

# [1.3.0](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.2.0...v1.3.0) (2026-05-11)


### Features

* add pluggable self-hosted storage backends ([d136c31](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/d136c319ad478b18bb2e6e44f7efc3c7e8d54587))
* Enhance media handling in preview component with file input and improved empty state UI. Update icons for share functionality and adjust background styles for better visual consistency. ([87f67a5](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/87f67a57b397eeef42ff60e582b8ec695abf4434))
* Update media handling in CanvasInspector and MediaInspector components. Rename "Clips" section to "Media" and enhance empty state UI with improved messaging and icons. Add functionality to trigger media input from MediaInspector. ([489d9f4](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/489d9f4f4a97e2f3977e04b5270a26376b0dacc3))

# [1.2.0](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.1.0...v1.2.0) (2026-05-10)


### Features

* Update index.html with SEO metadata and favicon, replace Clapperboard icon with Film in inspector, and adjust logo size for improved UI consistency. ([9915e06](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/9915e060d51e834d8393ae1bdfaa8c2b3af198c1))

# [1.1.0](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.0.3...v1.1.0) (2026-05-10)


### Features

* Integrate color picker component in inspector controls for enhanced color selection. Refactor ColorInput to utilize Popover and ColorPicker for improved UI and user experience. ([5eb6a57](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/5eb6a5769866905519c794cf4a96e5ba8b4d883b))

## [1.0.3](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.0.2...v1.0.3) (2026-05-10)


### Bug Fixes

* Adjust styles in inspector controls for improved UI consistency. Modify AccordionTrigger and AccordionContent padding and height for better alignment and visual appeal. ([75e9161](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/75e91617ef29dbe32eadb2ed6ad4a6008ead863f))

## [1.0.2](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.0.1...v1.0.2) (2026-05-10)


### Bug Fixes

* Refactor inspector components to enhance UI and functionality. Introduce accordion sections for better organization in CanvasInspector and ClipInspector. Implement media file input handling in CanvasInspector. Update Sidebar structure in Inspector for improved layout. Adjust button styles in TransportBar for consistency. ([53c47ae](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/53c47aed5f59a794d749f2ed9f0fc4b069c38dcb))

## [1.0.1](https://github.com/JoeBuildsStuff/remotion-player-diy/compare/v1.0.0...v1.0.1) (2026-05-10)


### Bug Fixes

* Enhance build metadata integration by adding version, commit SHA, branch, and build time to the Dockerfile and Vite configuration. Update README to reflect new project info display in the settings menu. Modify GitHub Actions workflow to pass build args for metadata during image publishing. ([39fa960](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/39fa960f5791f1cb58542b6b8881c91e59ae7999))

# 1.0.0 (2026-05-10)


### Bug Fixes

* **docker:** include src/, public/, tsconfigs, remotion.config.ts in runtime image ([d47e117](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/d47e117bbe5d66960d094c71c40416324e9107fd))
* **docker:** install Chromium runtime libs for headless shell ([2823e75](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/2823e756ad3074a1aa50a2bd900c8c70c78902ff))
* show self-hosted copy in render dialog when VITE_DEPLOY_MODE=selfhost ([fb5852d](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/fb5852d5dfa726d2fa16fb6458e9f7d971bd1b2c))


### Performance Improvements

* **render:** align with canonical Remotion Docker recommendations ([ba8b602](https://github.com/JoeBuildsStuff/remotion-player-diy/commit/ba8b602fbbe5983609f78f763e8c395522f29ca4))
