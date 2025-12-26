# Game Development Documentation

## Project Overview

**Genre**: Portrait-oriented mobile bullet hell / action shooter
**Engine**: Phaser 3 (v3.60.0)
**Target Platform**: Mobile (Android) with PC browser support
**Orientation**: Portrait (720px fixed width, dynamic height based on aspect ratio)

---

## Unique Features to Preserve

These are the core mechanics that make this game distinctive. **Keep these intact** during refactoring:

### 1. **Reactive Enemy AI (★ SPECIAL)**
- Enemies **detect incoming bullets** within 200px range
- Calculate if bullet is heading toward them (within 45° cone)
- **Dodge perpendicular** to bullet trajectory
- **No cooldown** - can dodge continuously when detecting threats
- Cannot dodge while casting (strategic window for player)

**Why it's special**: Most mobile shooters have passive enemies. This creates dynamic cat-and-mouse gameplay.

### 2. **Cast Time System with Telegraph**
- Enemies show **yellow circle indicator** during 500ms cast time before shooting
- Gives player clear visual warning to dodge
- Cast is **cancelled** if enemy starts dodging
- Similar to WoW/RPG casting mechanics in a shooter context

**Why it's special**: Adds strategic depth - you can interrupt enemy attacks by forcing them to dodge.

### 3. **Auto-Targeting with Manual Shooting**
- Automatically targets **closest enemy** (red circle indicator)
- Bullets **home in** on targeted enemy
- Player controls **when** to shoot, not where

**Why it's special**: Perfect for mobile - removes need for aim controls while keeping player agency.

### 4. **Mode Switching via Gesture**
- Swipe **up** from bottom quarter: cycle mode forward
- Swipe **down** from top: cycle mode backward
- Three modes: PISTOL, SHIELD, SWORD (only PISTOL implemented currently)
- Visual feedback: mode text scales on change

**Why it's special**: Intuitive gesture-based UI instead of buttons.

### 5. **Zone-Based Touch Controls**
- Screen divided into zones:
  - **Bottom 25%**: Swipe zone for mode switching
  - **Middle 25%**: Attack zone (tap to shoot)
  - **Lower-middle 25%**: Dodge zone (tap to dodge)
- All triggers on `pointerup` to prevent accidental activation
- Swipe detection prevents zone actions during gestures

**Why it's special**: Touch-friendly, doesn't obscure screen with virtual joysticks.

---

## Core Game Mechanics

### Player Mechanics
- **Movement**: Continuous right at 200px/s (auto-runner)
- **Shooting**: 300ms fire rate, bullets at 600px/s
- **Dodge**: 500ms duration, 50% alpha (semi-transparent), player invincible during dodge
- **Position**: Centered on screen (50% x, 50% y)

### Enemy Mechanics
- **Spawning**: Every 1500ms at random Y position off-screen right
- **Movement**:
  - Approach player at 150px/s
  - Stop at random distance (150-250px)
  - Dodge at 400px/s when detecting bullets
- **Shooting**:
  - 1000ms cooldown between shots
  - 500ms cast time with yellow indicator
  - Bullets at 400px/s
- **Stop Distance**: Randomized per enemy (150-250px) for variety

### Dodge System (Player vs Enemy)
| Feature | Player | Enemy |
|---------|--------|-------|
| Trigger | Manual (zone tap) | Automatic (bullet detection) |
| Visual | Semi-transparent (alpha 0.5) | Position change |
| Speed | Normal | Fast (400px/s) |
| Duration | 500ms | 300ms |
| Cooldown | None | None |
| During Cast | Can dodge | Cancels cast |

---

## Technical Architecture

### Scale System (FIT Mode)
**Critical for mobile compatibility:**

```javascript
// Portrait: Dynamic height to eliminate black bars
if (height > width) {
    width: 720 (fixed)
    height: 720 * (screenHeight / screenWidth)
}
// Landscape (PC): Fixed portrait ratio
else {
    width: 720
    height: 1280
}
```

**Why FIT mode**: Everything scales proportionally, consistent coordinates across devices, no camera zoom needed.

### Configuration System
All magic numbers centralized in `GAME_CONFIG` object. **Always use config constants**, never hardcode values.

Example:
```javascript
const GAME_CONFIG = {
    ENEMY_DODGE_SPEED: 400,  // ✓ Good
    ENEMY_CAST_TIME: 500,
    // ...
}

// ✗ Bad: enemy.speed = 400
// ✓ Good: enemy.speed = GAME_CONFIG.ENEMY_DODGE_SPEED
```

### Smart Cache Busting
- Git pre-commit hook at `.git/hooks/pre-commit`
- Auto-updates `game.js?v=TIMESTAMP` in `index.html`
- Shareable via `scripts/setup-hooks.sh`
- Only triggers when `game.js` changes

### GitHub Actions Deployment
- Workflow: `.github/workflows/deploy-github-pages.yml`
- Uses **artifact-based deployment** (no commits to branch)
- Auto-deploys to GitHub Pages from `/www` to `/docs`
- Avoids rebase conflicts

---

## Important Implementation Details

### Collision Detection
- Uses `physics.add.overlap()` for all collisions
- Player dodge: `if (this.isDodging) return;` in all collision handlers
- Enemy bullets **pass through** during dodge (don't destroy)

### Enemy Bullet Detection Algorithm
```javascript
// 1. Check distance (within 200px)
// 2. Get angle from bullet to enemy
// 3. Get bullet's velocity direction
// 4. Calculate angle difference
// 5. If < 45° (π/4), bullet is heading toward enemy
// 6. Dodge perpendicular (±90°) to bullet direction
```

### Input System Quirks
**Swipe Detection**:
- Track `isSwipeGesture` flag on `pointermove`
- Prevents zones from triggering during swipe
- Minimum 20px movement to register as swipe

**Game Over Restart**:
- Requires **fresh tap** (both pointerdown + pointerup after game over)
- Prevents accidental restart from releasing dodge button

**Zone Disable on Game Over**:
- Call `zone.disableInteractive()` when game ends
- Prevents input during game over screen

### Graphics Generation
All assets procedurally generated (no image files):
- Player: 32x32 cyan square
- Enemy: 32x32 red square
- Bullet: 16x8 yellow rectangle
- Enemy Bullet: 12x12 orange circle
- Target Indicator: Red circle outline (20px radius)
- Cast Indicator: Yellow circle outline (24px radius)

---

## Mobile-First Design Decisions

### Portrait Orientation
- **Manifest**: `orientation: "portrait"` in `manifest.json`
- Works best when installed to home screen (PWA)
- Browser rotation lock requires fullscreen API (not implemented)

### Responsive Text/UI
- Fixed pixel positions: `(10, 10)` for score, `(width/2, 50)` for mode
- Fixed 32px font size
- Uses `setScrollFactor(0)` to prevent camera movement affecting UI

### Performance Optimizations
- Cleanup offscreen objects (bullets, enemies) with margin of 100px
- Destroy cast indicators when enemies destroyed
- Physics debug mode disabled in production

---

## Known Behaviors (Not Bugs)

1. **Enemies dodge even when far away**: By design - they react to any bullet within 200px detection range
2. **Cast indicators move with enemies**: Intentional - indicator follows enemy during cast
3. **Player always moves right**: Auto-runner mechanic, not a constraint
4. **Bullets aim at last known position**: Bullets don't track, they're fired at angle toward target at fire time
5. **Dodge has no cooldown**: Design choice for skill-based gameplay

---

## Future Development Notes

### Planned Features (SHIELD, SWORD modes)
Current architecture supports mode switching, but only PISTOL implemented:
- `this.modes = ['PISTOL', 'SHIELD', 'SWORD']`
- `this.currentModeIndex` tracks current mode
- Mode text updates on swipe

### Potential Improvements
- **Enemy variety**: Different enemy types (fast, tanky, etc.)
- **Power-ups**: Temporary buffs
- **Boss fights**: Large enemies with patterns
- **Difficulty scaling**: Increase spawn rate / enemy speed over time
- **Score multipliers**: Combo system for consecutive kills
- **Particle effects**: Visual polish for hits, dodges, deaths

### Architecture Strengths
- **Modular design**: Each system in separate methods
- **Data-driven**: GAME_CONFIG makes balancing easy
- **Mobile-optimized**: Touch controls, portrait orientation
- **No dependencies**: Pure Phaser 3, no additional libraries

---

## Testing Checklist

Before deploying changes:
- [ ] Test on mobile (portrait)
- [ ] Test on PC (landscape)
- [ ] Verify enemy dodge (shoot and observe)
- [ ] Verify cast indicators appear
- [ ] Verify player dodge works (try getting hit during dodge)
- [ ] Verify game over restart (test bottom-quarter tap)
- [ ] Verify mode switching (swipe up/down)
- [ ] Verify auto-targeting (red circle on nearest enemy)
- [ ] Verify cache busting (version parameter updates)

---

## Git Workflow

**Branch naming**: `claude/[feature-name]-[sessionId]`
**Commit style**: Imperative mood, describe what changed
**Push**: Always to feature branch, never directly to main

**Pre-commit hook**:
- Auto-updates version in `index.html` when `game.js` changes
- Located at `.git/hooks/pre-commit`
- Source at `scripts/pre-commit` for sharing

---

## Contact / Inspiration

**Similar games for reference**:
- **Archero**: Auto-aim, dodge-focused
- **Magic Survival**: Bullet hell with auto-targeting
- **Soul Knight**: Bullet hell roguelike

**Unique selling points**:
1. Enemies that dodge your bullets reactively
2. Cast time telegraph system
3. Mobile-optimized gesture controls
4. Simple but deep combat mechanics

---

*Last updated: 2024*
