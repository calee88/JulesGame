# Vite + ES6 Modules Setup

This document describes the migration to Vite and ES6 modules for better development experience and code organization.

## Project Structure

```
JulesGame/
├── src/
│   ├── config/
│   │   └── gameConfig.js          # Game constants and configuration
│   ├── scenes/
│   │   ├── MenuScene.js           # Map selection menu
│   │   └── GameScene.js           # Main game scene
│   ├── systems/
│   │   ├── AssetGenerator.js      # Procedural asset generation
│   │   ├── PathfindingSystem.js   # A* pathfinding with EasyStar
│   │   ├── PlayerSystem.js        # Player movement and orbital mechanics
│   │   ├── EnemySystem.js         # Enemy AI, movement, and shooting
│   │   └── InputSystem.js         # Input handling and UI zones
│   └── main.js                    # Entry point
├── public/                        # Static assets
│   ├── easystar-0.4.4.min.js
│   ├── map1.json
│   ├── debug_map.json
│   └── manifest.json
├── index.html                     # HTML entry point
├── vite.config.js                 # Vite configuration
└── package.json                   # Dependencies and scripts
```

## Code Organization

The monolithic `game.js` file has been split into smaller, focused modules:

### Configuration (`src/config/`)
- **gameConfig.js**: All game constants (player stats, enemy behavior, UI layout, etc.)

### Scenes (`src/scenes/`)
- **MenuScene.js**: Map selection menu
- **GameScene.js**: Main game orchestrator that ties all systems together

### Systems (`src/systems/`)
- **AssetGenerator.js**: Generates procedural sprites (player, enemies, bullets, walls)
- **PathfindingSystem.js**:
  - Grid-based A* pathfinding using EasyStar.js
  - Path smoothing and line-of-sight checks
  - Wall collision detection
- **PlayerSystem.js**:
  - Auto-walk navigation with pathfinding
  - Orbital movement around enemies
  - Path visualization (debug)
- **EnemySystem.js**:
  - Aggro detection
  - Chase/patrol behavior
  - Bullet dodging AI
  - Shooting and casting mechanics
- **InputSystem.js**:
  - Swipe gesture detection
  - Attack/dodge zones
  - Mode switching UI

## Development

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```
This will start Vite's dev server with hot module replacement (HMR) at http://localhost:3000

### Build for production
```bash
npm run build
```
Builds the project to the `dist/` folder

### Preview production build
```bash
npm run preview
```
Preview the production build locally

## Benefits of Vite + ES6 Modules

1. **Fast Development**: Vite's instant HMR provides near-instant feedback
2. **Better Code Organization**: Smaller, focused modules are easier to understand and maintain
3. **Modern JavaScript**: Full ES6+ support with proper imports/exports
4. **Optimized Builds**: Vite uses Rollup for production builds with tree-shaking
5. **Type Safety Ready**: Easy to add TypeScript in the future if needed

## Migration Notes

- The original `game.js` is still in `android/app/src/main/assets/www/` for the Android build
- All game logic has been preserved; only the structure has changed
- Static assets (maps, EasyStar library) are in the `public/` directory
- Phaser is now installed as an npm dependency instead of loaded from CDN

## Next Steps

- Consider adding TypeScript for better type safety
- Add unit tests for game systems
- Set up CI/CD for automated builds and deployments
- Optimize bundle size with code splitting if needed
