# Development Scripts

## Git Hooks Setup

This project uses git hooks to automate version management for cache-busting.

### Installation

After cloning the repository, run:

```bash
./scripts/install-hooks.sh
```

### What the hooks do

**pre-commit hook:**
- Automatically updates the version number in `index.html` when `game.js` is modified
- Uses a timestamp to ensure unique versions for proper cache-busting
- No manual version management needed!

### Manual Hook Installation

If you prefer to install manually:

```bash
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```
