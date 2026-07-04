# GOMOKU

A lightweight Gomoku game built with HTML, CSS and JavaScript.

Created by Binbin. Built with AI collaboration.

## Project Screenshot

![GOMOKU project screenshot](assets/project-screenshot.png)

## Features

- Modern home screen with `Start Game`, `Rules`, and `About`
- 15 x 15 Gomoku board
- Two-player local play
- Black moves first
- Move validation for occupied intersections
- Win detection in horizontal, vertical, and diagonal directions
- Hover preview before placing a stone
- Animated last-move highlight
- Undo
- Restart confirmation dialog
- Winner and draw dialogs without `alert`
- Local Web Audio sound effects with a sound toggle
- Top match bar with wins, moves, timer, and current turn
- Responsive layout for desktop and tablet
- Offline-first static project with no CDN and no external runtime dependency

## Run Locally

No installation is required.

1. Download or clone this repository.
2. Open the project folder.
3. Double-click `index.html`.

## Project Structure

```text
Gomoku/
├── assets/
│   ├── favicon.svg
│   └── project-screenshot.png
├── index.html
├── style.css
├── script.js
├── README.md
└── LICENSE
```

## GitHub Pages Deployment

This is a static website, so it can be deployed directly with GitHub Pages.

1. Push the project to a GitHub repository.
2. Open `Settings` -> `Pages`.
3. Set `Source` to `Deploy from a branch`.
4. Select the branch that contains `index.html`.
5. Keep the folder as `/root`.
6. Save and wait for GitHub Pages to publish the site.

## Version History

| Version | Date | Notes |
| --- | --- | --- |
| 1.0.0 | 2026-07-04 | Final release with polished UI, favicon, logo, rules diagram, About dialog, local sounds, undo, timer, and complete README. |
| 1.0 Preview | 2026-07-04 | Initial playable two-player Gomoku implementation. |

## Roadmap

No new features are planned for v1.0.0. Future major versions may explore:

- v2: move record export, richer move animations, multi-game history
- v3: AI opponent and difficulty levels
- v4: online rooms and leaderboard

## Release Notes

### v1.0.0

- Added a simple modern GOMOKU logo.
- Added a local SVG favicon.
- Refined the About dialog into a centered project introduction.
- Added a child-friendly Rules dialog with a CSS-drawn five-in-a-row demo board.
- Polished the home screen and in-game branding.
- Kept the game fully offline and dependency-free.
- Cleaned modal rendering to use DOM nodes instead of HTML string injection.
- Completed final static and browser smoke checks.

## License

This project is released under the MIT License. See [LICENSE](LICENSE) for details.
