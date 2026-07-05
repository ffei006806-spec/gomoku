# Versioning Strategy

The first release candidate is preserved as `v1.0.0-rc`. The current development target is `v3.0.9`.

## Version Names

Use semantic versioning for stable releases:

```text
vMAJOR.MINOR.PATCH
```

Examples:

- `v1.0.0`: first stable release
- `v1.0.1`: patch release for bug fixes only
- `v1.1.0`: minor release for compatible feature additions
- `v2.0.0`: major release with breaking changes or a large product shift

Use suffixes for pre-release builds:

```text
vMAJOR.MINOR.PATCH-rc
vMAJOR.MINOR.PATCH-rc.1
vMAJOR.MINOR.PATCH-beta.1
```

Preserved release candidate:

```text
v1.0.0-rc
```

Current version:

```text
v3.0.9
```

## Release Candidate Rule

`v1.0.0-rc` is a frozen candidate for the first stable release. Future work should not directly overwrite this state.

Before any new development begins:

1. Create a backup zip of the current project.
2. Record the reason for the new work in `CHANGELOG.md`.
3. Make changes only after the backup exists.
4. Run checks before marking a new version.

For v2.1.0 development, a pre-development backup was created in `backups/Gomoku-v2.0.0-before-mobile-adaptation.zip`.

For v3.0.9 development, a pre-development backup was created in `backups/Gomoku_v2.1.2_before_v3.0.9.zip`.

## Local Backup Zip Rule

Create backups in a dedicated folder:

```text
backups/
```

Recommended naming:

```text
Gomoku-v1.0.0-rc.zip
Gomoku-v1.0.1-before-mobile-fix.zip
Gomoku-v1.1.0-before-ai-experiment.zip
```

Do not overwrite an existing backup zip. If a name already exists, add a timestamp:

```text
Gomoku-v1.0.0-rc-20260704-1945.zip
```

Suggested PowerShell backup command from the project root:

```powershell
New-Item -ItemType Directory -Force backups
$stamp = Get-Date -Format "yyyyMMdd-HHmm"
Compress-Archive -Path index.html,style.css,script.js,README.md,CHANGELOG.md,LICENSE,assets,docs -DestinationPath "backups/Gomoku-v1.0.0-rc-$stamp.zip" -CompressionLevel Optimal
```

## Git Initialization

The current folder contains a `.git` directory name, but Git does not recognize it as a valid repository. If you want to initialize Git for this project, use the bundled or system Git from the project root.

Commands:

```powershell
git init
git add index.html style.css script.js README.md CHANGELOG.md LICENSE assets docs
git commit -m "chore: preserve v1.0.0-rc"
git tag v1.0.0-rc
```

If `git` is not available in your terminal, use the bundled Git path available in this environment:

```powershell
& "C:\Users\binbin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe" init
& "C:\Users\binbin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe" add index.html style.css script.js README.md CHANGELOG.md LICENSE assets docs
& "C:\Users\binbin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe" commit -m "chore: preserve v1.0.0-rc"
& "C:\Users\binbin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe" tag v1.0.0-rc
```

## Development Flow

Use this sequence for future work:

```text
1. Backup current version as zip.
2. Update CHANGELOG.md with an Unreleased section.
3. Implement the requested change.
4. Run local checks.
5. Commit changes.
6. Tag only when a version is intentionally released.
```

Recommended changelog section for future work:

```markdown
## [Unreleased]

### Added

### Changed

### Fixed
```
