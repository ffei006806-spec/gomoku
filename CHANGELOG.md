# Changelog

All notable changes to this project will be documented in this file.

This project uses local release-candidate backups before new development begins. See [docs/versioning.md](docs/versioning.md) for the versioning and backup rules.

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

