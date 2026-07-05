# Changelog

## v3.0.17

- 在线结果文案中文化：结束后显示“黑棋胜 / 白棋胜 / 平局”。
- 增加“再来一局”确认流程，在线房间需要双方确认后重新开始。
- 在线等待状态统一为“等待对方加入”，创建房间后提示更明确。
- 优化手机端按钮、房间号输入框、在线操作按钮的触屏尺寸与圆角。
- 强化复制房间号反馈：复制成功后按钮显示“已复制 ✓”，状态栏提示可发给对方加入。

## v3.0.15

- 新增 `version.json`，页面启动时通过时间戳请求检查线上版本。
- 新增自动刷新机制：检测到线上版本变化时自动重新加载，用户继续使用原 GitHub Pages 地址。
- 增加基础 no-cache meta 标签，并统一版本号与静态资源缓存参数为 v3.0.15。

## v3.0.14
- 首页取消单独的“加入房间”入口按钮，避免与房间号区域内的“加入房间”重复。
- 房间号输入区默认显示，输入房间号后直接点击区域内按钮加入。
- 版本号统一更新为 v3.0.14。

## v3.0.13

- 首页“在线联机”流程合并：主按钮改为“创建房间”，点击后直接创建并进入在线房间。
- 新增首页“加入房间”按钮，仅在需要输入房间号时展开加入区域。
- 加入区域移除重复的“创建房间”按钮，避免创建/加入入口混在一起。
- 版本号统一更新为 v3.0.14。

## v3.0.14 - Empty room delete

- 点击“离开房间”时，会先移除当前玩家席位。
- 如果对方席位为空或已离线，则立即删除整个 Firebase 房间节点。
- 不加入定时兜底清理逻辑，避免后台自动误删仍在使用的房间。
- 保留 v3.0.11 创建房间修复、中文按钮、手机版棋子放大、在线落子显示、虚影和版本号修复。

## v3.0.14 - Mobile stone size adjustment

- Enlarges stone rendering on mobile phones for better visibility and touch feedback.
- Keeps v3.0.8 runtime version-label fix and online hover-preview behavior.

## v3.0.14 - Runtime version label fix

- Fixes the in-game online room label that was still rendered from APP_VERSION as v3.0.0.
- Keeps v3.0.7 hover preview behavior.

## v3.0.14 - Online hover preview fix

- Disables hover preview stones when the online player is not allowed to move.
- Keeps hover preview only for the active local role during online multiplayer.
- Updates visible version labels and cache-busting query strings to v3.0.14.

## v3.0.14 - Version display fix

- Fixes visible page version labels and browser title to show Release v3.0.14.
- Keeps all v3.0.5 online board render fixes.
- Updates cache-busting query strings to v3.0.14.

## v3.0.5 - Online board render fix

- Fixes online stones not rendering while move count increases.
- Adds Firebase Realtime Database object-style board normalization, because sparse arrays with null cells can be returned as keyed objects.
- Keeps cache-busting query strings updated to v3.0.5.


## v3.0.4 - Online move submit fix

- Fixed online move submission after a successful join.
- Replaced the move transaction with a server-read + validated-update flow to avoid Firebase local-null transaction aborts.
- Kept turn, identity, occupied-cell, and game-status validation before each move update.


## v3.0.3 - Join Room Transaction Fix

- Replaces the join-room transaction with an explicit read-then-update flow to avoid Firebase returning a local null during transaction startup.
- Fixes the case where Firebase Console shows the room exists but the second browser still receives "Room not found."
- Updates script cache-busting query strings to v3.0.3.

# Changelog

## v3.0.17

- 在线结果文案中文化：结束后显示“黑棋胜 / 白棋胜 / 平局”。
- 增加“再来一局”确认流程，在线房间需要双方确认后重新开始。
- 在线等待状态统一为“等待对方加入”，创建房间后提示更明确。
- 优化手机端按钮、房间号输入框、在线操作按钮的触屏尺寸与圆角。
- 强化复制房间号反馈：复制成功后按钮显示“已复制 ✓”，状态栏提示可发给对方加入。

All notable changes to this project will be documented in this file.

This project uses local release-candidate backups before new development begins. See [docs/versioning.md](docs/versioning.md) for the versioning and backup rules.

## [v3.0.14] - 2026-07-05

### Added

- Added Online Multiplayer mode using Firebase Realtime Database.
- Added room-code based Create Room and Join Room flows.
- Added real-time board, turn, last-move, winner, restart vote, and online status synchronization.
- Added refresh reconnect support through localStorage and Firebase onDisconnect presence.

### Changed

- Updated GitHub Pages asset references with `?v=3.0.13` cache-busting query strings.
- Disabled undo in Online Multiplayer with an explanatory message.

## [v2.1.2] - 2026-07-04

### Changed

- Rebalanced stone size for desktop and mobile.
- Slightly reduced desktop stones.
- Slightly enlarged mobile stones.
- Increased move sound feedback volume.

## [v2.1.1] - 2026-07-04

### Changed

- Reduced mobile stone size to prevent overlap.
- Preserved touch hit area for usability.

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

## v3.0.2
- Fixed Join Room lookup fallback: supports rooms stored as `rooms/{ROOM_CODE}` and rooms stored under generated keys with `roomId`, `roomCode`, `code`, or `id` fields.
- Added clearer diagnostics showing Firebase path and rooms visible to the browser.
- Saves the actual database room key after joining, so realtime watching and presence use the same Firebase path.