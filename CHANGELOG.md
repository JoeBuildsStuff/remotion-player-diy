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
