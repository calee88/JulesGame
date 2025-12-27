# Game Development Documentation

## Project Overview

**Genre**: Portrait-oriented mobile action RPG / auto-battler (Torchlight-style)
**Engine**: Phaser 3 (v3.60.0)
**Target Platform**: Mobile (Android) with PC browser support
**Orientation**: Portrait (720px fixed width, dynamic height based on aspect ratio)
**Game Style**: Bounded map with auto-navigation, tactical combat, and reactive enemy AI

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

### 5. **Hybrid Touch Controls**
- **Visible FIRE button**: Circular button overlay (top-right area) for shooting
  - Red button with border and label
  - Visual feedback on press (alpha change)
  - Preserves auto-targeting system
- **Dodge zone**: Bottom 25% of screen (tap to dodge)
  - Flash feedback on activation
- **Swipe gestures**: Mode switching via up/down swipes

**Why it's special**: Balance between traditional button UI and gesture-based controls.

### 6. **Auto-Navigation with A* Pathfinding**
- Player automatically walks toward nearest enemy
- Uses A* algorithm to navigate around walls and obstacles
- Recalculates path when enemy moves or new target selected
- Grid-based pathfinding (32px cells) with diagonal movement
- Smooth movement along waypoints with arrival threshold

**Why it's special**: Intelligent navigation frees player to focus on combat timing.

---

## Core Game Mechanics

### Map System
- **Size**: 3000x2000px bounded world
- **Format**: JSON-based map data (`map1.json`)
- **Components**:
  - Player spawn point
  - Enemy spawn points with patrol routes
  - Wall obstacles (collision-enabled)
- **Rendering**: Tiled floor texture with procedural wall tiles
- **Camera**: Bounded to map edges, smooth following

### Player Mechanics
- **Movement**: Auto-walk to nearest enemy at 180px/s
  - Uses A* pathfinding to navigate around walls
  - Recalculates path when target changes
  - Arrival threshold: 50px
- **Shooting**: 300ms fire rate, bullets at 600px/s
  - Manual trigger via FIRE button
  - Auto-aims at targeted enemy
- **Dodge**: 500ms duration, 50% alpha (semi-transparent), player invincible during dodge
  - Activated via bottom screen zone
- **Collision**: Blocked by walls, world bounds enabled

### Enemy Mechanics
- **Spawning**: Pre-placed at map load (no dynamic spawning)
  - Initial map has 6 enemies
  - Each enemy has patrol route defined in map data
- **AI States**:
  - **Patrol** (default): Move between waypoints at 80px/s
  - **Aggro** (player within 400px): Full chase/dodge/shoot behavior
- **Aggro Movement**:
  - Approach player at 150px/s
  - Stop at random distance (150-250px)
  - Dodge at 400px/s when detecting bullets (reactive AI)
- **Shooting** (only when aggro):
  - 1000ms cooldown between shots
  - 500ms cast time with yellow indicator
  - Bullets at 400px/s
- **Stop Distance**: Randomized per enemy (150-250px) for variety

### Win Condition
- **Victory**: Kill all enemies on the map
- **Tracking**: Counts enemies killed vs total spawned
- **UI**: Green victory screen with score and restart option

### Dodge System (Player vs Enemy)
| Feature | Player | Enemy |
|---------|--------|-------|
| Trigger | Manual (zone tap) | Automatic (bullet detection) |
| Visual | Semi-transparent (alpha 0.5) | Position change |
| Speed | 180px/s (auto-walk) | Fast (400px/s) |
| Duration | 500ms | 300ms |
| Cooldown | None | None |
| During Cast | Can dodge | Cancels cast |
| Active When | Always | Only when aggro |

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
    GRID_SIZE: 32,           // Pathfinding grid cell size
    ENEMY_AGGRO_RANGE: 400,  // Distance to activate enemy AI
    // ...
}

// ✗ Bad: enemy.speed = 400
// ✓ Good: enemy.speed = GAME_CONFIG.ENEMY_DODGE_SPEED
```

### Map Data Format
Maps stored as JSON files in `/www/` directory:
```json
{
  "width": 3000,
  "height": 2000,
  "tileSize": 64,
  "playerStart": { "x": 200, "y": 1000 },
  "enemies": [
    {
      "x": 800,
      "y": 500,
      "patrol": [
        { "x": 800, "y": 500 },
        { "x": 1000, "y": 500 }
      ]
    }
  ],
  "walls": [
    { "x": 600, "y": 400, "width": 200, "height": 400 }
  ]
}
```

### A* Pathfinding System
- **Grid**: Map divided into 32x32 cells for pathfinding
- **Algorithm**: A* with Euclidean distance heuristic
- **Movement**: 8-directional (cardinal + diagonal)
- **Diagonal cost**: 1.414 (√2) vs 1.0 for cardinal
- **Obstacle marking**: Walls marked as blocked cells during grid creation
- **Path recalculation**: Triggers when target moves significantly (> arrival threshold)
- **Performance**: Optimized for mobile - grid resolution keeps search space small

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
- Floor: 64x64 dark purple tile with grid lines
- Wall: 64x64 gray-purple tile with border
- Fire Button: Red circle with border and text label

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
- Cleanup bullets outside world bounds
- Destroy cast indicators when enemies destroyed
- Physics debug mode disabled in production
- Static map rendering (no infinite scroll updates)
- Grid-based pathfinding reduces search space
- Path recalculation throttled by arrival threshold
- Wall collisions handled by physics engine (static group)

---

## Known Behaviors (Not Bugs)

1. **Enemies dodge only when aggro**: By design - they only react to bullets when player is within 400px
2. **Cast indicators move with enemies**: Intentional - indicator follows enemy during cast
3. **Player auto-walks to enemies**: Auto-battler mechanic - player automatically navigates to nearest enemy
4. **Bullets aim at last known position**: Bullets don't track, they're fired at angle toward target at fire time
5. **Dodge has no cooldown**: Design choice for skill-based gameplay
6. **Enemies patrol when player far away**: Intentional - enemies are idle/patrolling until player gets close
7. **Path recalculation**: Player may take new paths when enemy moves - this is normal A* behavior
8. **Camera stops at edges**: Bounded camera prevents showing areas outside the map

---

## Future Development Notes

### Planned Features (SHIELD, SWORD modes)
Current architecture supports mode switching, but only PISTOL implemented:
- `this.modes = ['PISTOL', 'SHIELD', 'SWORD']`
- `this.currentModeIndex` tracks current mode
- Mode text updates on swipe

### Potential Improvements
- **Multiple maps**: Create map2.json, map3.json with increasing difficulty
- **Procedural map generation**: Randomly generate maps at runtime
- **Enemy variety**: Different enemy types (fast, tanky, ranged, melee)
- **Power-ups**: Temporary buffs dropped by enemies
- **Boss fights**: Large enemies with complex patterns
- **Loot system**: Item drops and equipment
- **Level progression**: Unlock new maps after completing previous ones
- **Player upgrades**: Permanent stat improvements
- **Particle effects**: Visual polish for hits, dodges, deaths
- **Minimap**: Show full map in corner with player/enemy positions

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
- [ ] **Verify auto-walk**: Player automatically paths to nearest enemy
- [ ] **Verify pathfinding**: Player navigates around walls correctly
- [ ] **Verify FIRE button**: Visible button shoots when pressed
- [ ] **Verify enemy patrol**: Enemies patrol when player far away
- [ ] **Verify enemy aggro**: Enemies activate when player within 400px
- [ ] **Verify enemy dodge**: Enemies dodge bullets when aggro (reactive AI)
- [ ] **Verify cast indicators**: Yellow circles appear before enemy shoots
- [ ] **Verify player dodge**: Invincibility works during dodge
- [ ] **Verify win condition**: Victory screen appears after killing all enemies
- [ ] **Verify game over restart**: Tap to restart works
- [ ] **Verify mode switching**: Swipe up/down still works
- [ ] **Verify auto-targeting**: Red circle on nearest enemy
- [ ] **Verify wall collisions**: Player and enemies blocked by walls
- [ ] **Verify camera bounds**: Camera stops at map edges
- [ ] **Verify cache busting**: Version parameter updates

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
- **Torchlight**: Click-to-move action RPG (inspiration for auto-walk)
- **Diablo**: Top-down ARPG with auto-navigation
- **Archero**: Auto-aim, dodge-focused
- **Magic Survival**: Bullet hell with auto-targeting
- **Soul Knight**: Bullet hell roguelike

**Unique selling points**:
1. **Auto-battler meets bullet hell**: Automatic navigation + manual combat timing
2. **Reactive enemy AI**: Enemies dodge your bullets intelligently
3. **Cast time telegraph system**: Visual warnings before enemy attacks
4. **A* pathfinding**: Intelligent navigation around obstacles
5. **Hybrid control scheme**: Auto-movement + manual shooting/dodging
6. **Bounded maps with victory condition**: Complete stages, not endless survival
7. **Enemy patrol/aggro AI**: Dynamic enemy behavior based on distance

---

*Last updated: January 2025 - Torchlight-style auto-battler redesign*
