import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * Asset Generator
 * Handles procedural generation of game assets
 */
export default class AssetGenerator {
    static generateAssets(scene) {
        this.generateBackground(scene);
        this.generatePlayer(scene);
        this.generateEnemy(scene);
        this.generateBullet(scene);
        this.generateEnemyBullet(scene);
        this.generateWall(scene);
        this.generateFloor(scene);
    }

    static generateBackground(scene) {
        const bg = scene.make.graphics({ x: 0, y: 0, add: false });
        bg.fillStyle(GAME_CONFIG.BACKGROUND_COLOR);
        bg.fillRect(0, 0, GAME_CONFIG.BACKGROUND_SIZE, GAME_CONFIG.BACKGROUND_SIZE);
        bg.lineStyle(1, GAME_CONFIG.BACKGROUND_GRID_COLOR, 0.5);
        bg.strokeRect(0, 0, GAME_CONFIG.BACKGROUND_SIZE, GAME_CONFIG.BACKGROUND_SIZE);
        bg.generateTexture('background', GAME_CONFIG.BACKGROUND_SIZE, GAME_CONFIG.BACKGROUND_SIZE);
    }

    static generatePlayer(scene) {
        const p = scene.make.graphics({ x: 0, y: 0, add: false });
        p.fillStyle(GAME_CONFIG.PLAYER_COLOR);
        p.fillRect(0, 0, GAME_CONFIG.PLAYER_SIZE, GAME_CONFIG.PLAYER_SIZE);
        p.generateTexture('player', GAME_CONFIG.PLAYER_SIZE, GAME_CONFIG.PLAYER_SIZE);
    }

    static generateEnemy(scene) {
        const e = scene.make.graphics({ x: 0, y: 0, add: false });
        e.fillStyle(GAME_CONFIG.ENEMY_COLOR);
        e.fillRect(0, 0, GAME_CONFIG.ENEMY_SIZE, GAME_CONFIG.ENEMY_SIZE);
        e.generateTexture('enemy', GAME_CONFIG.ENEMY_SIZE, GAME_CONFIG.ENEMY_SIZE);
    }

    static generateBullet(scene) {
        const b = scene.make.graphics({ x: 0, y: 0, add: false });
        b.fillStyle(GAME_CONFIG.BULLET_COLOR);
        b.fillRect(0, 0, GAME_CONFIG.BULLET_WIDTH, GAME_CONFIG.BULLET_HEIGHT);
        b.generateTexture('bullet', GAME_CONFIG.BULLET_WIDTH, GAME_CONFIG.BULLET_HEIGHT);
    }

    static generateEnemyBullet(scene) {
        const eb = scene.make.graphics({ x: 0, y: 0, add: false });
        eb.fillStyle(GAME_CONFIG.ENEMY_BULLET_COLOR);
        eb.fillCircle(6, 6, 6);
        eb.generateTexture('enemyBullet', 12, 12);
    }

    static generateWall(scene) {
        const w = scene.make.graphics({ x: 0, y: 0, add: false });
        w.fillStyle(GAME_CONFIG.WALL_COLOR);
        w.fillRect(0, 0, 64, 64);
        w.lineStyle(2, 0x6a6a8e, 1);
        w.strokeRect(0, 0, 64, 64);
        w.generateTexture('wall', 64, 64);
    }

    static generateFloor(scene) {
        const f = scene.make.graphics({ x: 0, y: 0, add: false });
        f.fillStyle(GAME_CONFIG.FLOOR_COLOR);
        f.fillRect(0, 0, 64, 64);
        f.lineStyle(1, GAME_CONFIG.BACKGROUND_GRID_COLOR, 0.3);
        f.strokeRect(0, 0, 64, 64);
        f.generateTexture('floor', 64, 64);
    }
}
