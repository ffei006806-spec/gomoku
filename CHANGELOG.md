# Changelog

All notable changes to this project will be documented in this file.

This project uses local release-candidate backups before new development begins. See [docs/versioning.md](docs/versioning.md) for the versioning and backup rules.

## [v2.1.0] - 2026-07-04

### Added

- Added mobile and tablet responsive layout.
- Improved touch interaction for mobile browsers.

### Changed

- Optimized board scaling and compact UI.
- Preserved AI mode and local two-player mode.

## [v2.0.0] - 2026-07-04

### Added

- Added Play with AI mode.
- Added mode selection on the home screen: Local Two Player and Play with AI.
- Added AI move delay between 300 and 600 ms.
- Added basic AI scoring for immediate wins, blocking wins, fours, open threes, nearby stones, and center preference.
- Added AI-mode undo behavior that removes the AI move and the previous human move.

### Changed

- Updated project documentation for v2.0.0.
- Updated UI copy to describe local two-player and AI modes.
- Improved stone visual clarity with sharper edges and more restrained shadows.

### Fixed

- Fixed board coordinate alignment by keeping grid lines, stars, cells, stones, previews, and last-move highlights on the same 15 x 15 intersection system.
- Fixed formal stone rendering so black and white stones remain crisp, opaque, and visually separated from the board grid.
- Confirmed star points at row/col 4/4, 4/12, 8/8, 12/4, and 12/12.

## [v1.0.0-rc] - 2026-07-04

Release Candidate for the local two-player Gomoku game.

### Added

- Static HTML/CSS/JavaScript Gomoku game.
- 15 x 15 board with black-first local two-player rules.
- Win detection for horizontal, vertical, and diagonal five-in-a-row.
- Undo, restart confirmation, winner dialog, sound toggle, local sound effects, timer, move count, and win counts.
- Responsive desktop, tablet, and mobile layouts.
- Mobile touch improvements and disabled double-tap zoom behavior for local play.
- Shared board coordinate system for grid lines, stars, cells, stones, hover preview, and last-move highlight.
- Local SVG favicon, project logo, About dialog, Rules dialog, README, and MIT license.

### Fixed

- Corrected stone placement so stones land exactly on board intersections.
- Fixed disabled board cells so they do not lose their intersection-centered transform after a move.
- Verified corner, edge, center, star-point, preview, and last-move alignment on desktop and mobile viewports.

### Status

- This version is marked as `v1.0.0-rc`.
- Treat this as the current Release Candidate.
- Do not overwrite this state directly; create a backup zip before future development starts.
