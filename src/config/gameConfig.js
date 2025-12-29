// ============================================================================
// GAME CONSTANTS
// ============================================================================
export const GAME_CONFIG = {
    // Player
    PLAYER_SPEED: 200,
    PLAYER_START_X_RATIO: 0.5,
    PLAYER_COLOR: 0x00d4ff,
    PLAYER_SIZE: 32,
    PLAYER_ORBITAL_RANGE: 200,
    PLAYER_ORBITAL_EXIT_BUFFER: 30,   // Extra distance before exiting orbital mode (hysteresis)
    PLAYER_ORBITAL_SPEED: 180,
    PLAYER_ORBITAL_ANGULAR_SPEED: 1.5, // radians per second

    // Enemy
    ENEMY_SPEED: 150,
    ENEMY_SPAWN_INTERVAL: 1500,
    ENEMY_COLOR: 0xff0000,
    ENEMY_SIZE: 32,
    ENEMY_SPAWN_MARGIN: 100,
    ENEMY_STOP_DISTANCE_MIN: 150,
    ENEMY_STOP_DISTANCE_MAX: 250,
    ENEMY_RESUME_BUFFER: 50,              // Extra distance needed to resume chasing after stopping
    ENEMY_FIRE_RATE: 1000,
    ENEMY_CAST_TIME: 500,
    ENEMY_BULLET_SPEED: 400,
    ENEMY_BULLET_COLOR: 0xff6600,
    ENEMY_DODGE_COOLDOWN: 3000,
    ENEMY_DODGE_DURATION: 300,
    ENEMY_DODGE_SPEED: 400,
    ENEMY_DODGE_DISTANCE: 100,
    ENEMY_BULLET_DETECTION_RANGE: 200,

    // Bullet
    BULLET_SPEED: 600,
    BULLET_FIRE_RATE: 300,
    BULLET_OFFSET_X: 20,
    BULLET_COLOR: 0xffff00,
    BULLET_WIDTH: 16,
    BULLET_HEIGHT: 8,

    // Dodge
    DODGE_DURATION: 500,
    DODGE_ALPHA: 0.5,

    // UI Layout (as ratio of screen height)
    ATTACK_ZONE_Y: 0.625,
    DODGE_ZONE_Y: 0.875,
    ZONE_HEIGHT_RATIO: 0.25,
    BOTTOM_QUARTER_THRESHOLD: 0.75,

    // Swipe Detection
    SWIPE_MIN_DISTANCE: 20,

    // Cleanup
    OFFSCREEN_MARGIN: 100,

    // Camera
    CAMERA_FOLLOW_OFFSET_X_RATIO: 0,
    CAMERA_LERP: 0.1,

    // Game Over
    GAME_OVER_OVERLAY_ALPHA: 0.3,
    GAME_OVER_OVERLAY_FADE: 1000,
    GAME_OVER_PLAYER_ALPHA: 0.5,
    GAME_OVER_COLOR: 0xff0000,

    // Scoring
    POINTS_PER_KILL: 10, // Points awarded per enemy killed

    // Graphics
    BACKGROUND_SIZE: 64,
    BACKGROUND_COLOR: 0x1a1a2e,
    BACKGROUND_GRID_COLOR: 0x0f3460,
    FLOOR_COLOR: 0x2a2a3e,
    WALL_COLOR: 0x4a4a6e,

    // Map
    MAP_FILE: 'map1.json',
    AVAILABLE_MAPS: [
        { file: 'map1.json', name: 'Level 1' },
        { file: 'debug_map.json', name: 'Debug (1 enemy, no walls)' }
    ],
    GRID_SIZE: 32, // Size of pathfinding grid cells
    ENEMY_AGGRO_RANGE: 400, // Distance at which enemies activate chase/dodge/shoot
    ENEMY_PATROL_SPEED: 80,

    // Auto-walk
    PLAYER_AUTO_WALK_SPEED: 180,
    PLAYER_ARRIVAL_THRESHOLD: 16, // Distance to consider "arrived" - must be smaller than GRID_SIZE

    // Zone Flash
    ZONE_FLASH_DURATION: 200,
    ZONE_FLASH_ALPHA: 0.3,
    ATTACK_FLASH_COLOR: 0xff0000,
    DODGE_FLASH_COLOR: 0x00ff00,

    // Mode
    MODE_SCALE_DURATION: 100,
    MODE_SCALE_MAX: 1.5
};
