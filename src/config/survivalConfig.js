// ============================================================================
// SURVIVAL MARBLE MODE — CONFIGURATION
// ============================================================================
export const SURVIVAL_CONFIG = {
    // Arena geometry
    ARENA_RADIUS: 280,
    BASE_RADIUS: 35,

    // Player marble defaults
    PLAYER_MARBLE_RADIUS: 16,
    PLAYER_MARBLE_SPEED: 550,
    PLAYER_MAX_BOUNCES: 4,
    FIRE_COOLDOWN: 1200,        // ms before player can fire again

    // Player marble appearance
    PLAYER_MARBLE_COLOR: 0x00ffaa,
    PLAYER_MARBLE_STROKE: 0x88ffdd,

    // Enemy marble types: { radius, speed, hp, xp, damage, color, stroke }
    MARBLE_TYPES: {
        normal: { radius: 14, speed: 75,  hp: 1,  xp: 10,  damage: 1, color: 0x4488ff, stroke: 0x88ccff },
        fast:   { radius: 10, speed: 145, hp: 1,  xp: 15,  damage: 1, color: 0xffaa00, stroke: 0xffee66 },
        heavy:  { radius: 22, speed: 48,  hp: 3,  xp: 30,  damage: 2, color: 0x888888, stroke: 0xbbbbbb },
        boss:   { radius: 34, speed: 36,  hp: 10, xp: 100, damage: 5, color: 0xff2200, stroke: 0xff7755 },
    },

    // Wave progression
    BASE_WAVE_ENEMIES: 5,
    ENEMIES_PER_WAVE_INCREASE: 3,
    WAVE_REST_DURATION: 3500,   // ms break between waves
    SPAWN_INTERVAL: 900,        // ms between individual enemy spawns

    // Base health (number of enemy hits allowed)
    BASE_MAX_HEALTH: 10,

    // XP required to reach each successive level
    XP_TO_LEVEL: [100, 230, 410, 640, 930, 1280, 1700, 2200, 2800, 3500],
};
