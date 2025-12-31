import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';
import AssetGenerator from '../systems/AssetGenerator.js';
import PathfindingSystem from '../systems/PathfindingSystem.js';
import PlayerSystem from '../systems/PlayerSystem.js';
import EnemySystem from '../systems/EnemySystem.js';
import InputSystem from '../systems/InputSystem.js';
import DungeonGenerator from '../systems/DungeonGenerator.js';

// ============================================================================
// GAME SCENE
// ============================================================================
export default class GameScene extends Phaser.Scene {
    constructor() {
        super('game-scene');
        this.selectedMapFile = GAME_CONFIG.MAP_FILE; // Default map
    }

    /**
     * Init: Called when scene starts, receives data from previous scene
     */
    init(data) {
        if (data && data.mapFile) {
            this.selectedMapFile = data.mapFile;
        }
        this.initializeState();
    }

    /**
     * Initialize all instance variables
     */
    initializeState() {
        // Game State
        this.score = 0;
        this.lastFired = 0;
        this.isDodging = false;

        // Targeting System
        this.targetedEnemy = null;
        this.targetIndicator = null;

        // Cast Indicators
        this.castIndicators = null;

        // Map System
        this.mapData = null;
        this.walls = null;

        // Win Condition
        this.totalEnemies = 0;
        this.enemiesKilled = 0;

        // Game Objects
        this.player = null;
        this.enemies = null;
        this.bullets = null;
        this.enemyBullets = null;
        this.background = null;

        // UI Elements
        this.scoreLabel = null;

        // Debug visualization
        this.debugGraphics = null;
        this.debugDistanceText = null;

        // Systems
        this.pathfinding = null;
        this.playerSystem = null;
        this.enemySystem = null;
        this.inputSystem = null;
    }

    /**
     * Preload: Generate procedural assets
     */
    preload() {
        AssetGenerator.generateAssets(this);

        // Load map data (use selected map from menu)
        // Add timestamp to prevent caching issues
        const cacheBuster = `?v=${Date.now()}`;
        this.load.json('mapData', this.selectedMapFile + cacheBuster);
    }

    /**
     * Create: Initialize game objects and setup
     */
    create() {
        const { width, height } = this.scale;

        // Load map data
        this.mapData = this.cache.json.get('mapData');

        // Generate dungeon if seed is present
        if (this.mapData.seed !== undefined) {
            const dungeon = DungeonGenerator.generate(
                this.mapData.seed,
                this.mapData.width,
                this.mapData.height
            );

            // Merge generated dungeon data into mapData
            this.mapData.walls = dungeon.walls;
            this.mapData.enemies = dungeon.enemies;
            this.mapData.playerStart = dungeon.playerStart;
        }

        // Set world bounds to map size
        this.physics.world.setBounds(0, 0, this.mapData.width, this.mapData.height);

        this.setupBackground();
        this.createMap();
        this.setupPlayer();
        this.setupCamera();
        this.setupGroups();
        this.setupTargetIndicator();

        // Initialize systems
        this.pathfinding = new PathfindingSystem(this, this.mapData);
        this.playerSystem = new PlayerSystem(this, this.player, this.pathfinding);
        this.enemySystem = new EnemySystem(this, this.enemies, this.player, this.bullets, this.enemyBullets, this.pathfinding);
        this.inputSystem = new InputSystem(this);

        this.drawPathfindingGrid();
        this.spawnAllEnemies();
        this.setupUI(width, height);
        this.setupInputZones(width, height);
        this.setupCollisions();
        this.setupResize();
    }

    setupBackground() {
        // Create floor covering the entire map
        this.background = this.add.tileSprite(
            0, 0,
            this.mapData.width,
            this.mapData.height,
            'floor'
        ).setOrigin(0);
    }

    createMap() {
        // Create walls group with physics
        this.walls = this.physics.add.staticGroup();

        // Create wall objects from map data
        this.mapData.walls.forEach(wallData => {
            // Calculate how many tiles we need
            const tilesX = Math.ceil(wallData.width / 64);
            const tilesY = Math.ceil(wallData.height / 64);

            // Create tiles to fill the wall area
            for (let x = 0; x < tilesX; x++) {
                for (let y = 0; y < tilesY; y++) {
                    const wall = this.walls.create(
                        wallData.x + x * 64 + 32,
                        wallData.y + y * 64 + 32,
                        'wall'
                    );
                }
            }
        });
    }

    setupPlayer() {
        // Use map data for player start position
        const startX = this.mapData.playerStart.x;
        const startY = this.mapData.playerStart.y;

        this.player = this.physics.add.sprite(startX, startY, 'player');
        this.player.setCollideWorldBounds(true);
    }

    setupCamera() {
        // Set camera bounds to map size
        this.cameras.main.setBounds(0, 0, this.mapData.width, this.mapData.height);

        // Follow player with smooth lerp
        this.cameras.main.startFollow(
            this.player,
            true,
            GAME_CONFIG.CAMERA_LERP,
            GAME_CONFIG.CAMERA_LERP,
            0,
            0
        );
    }

    setupGroups() {
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
    }

    setupTargetIndicator() {
        // Create a red circle graphic to indicate the targeted enemy
        this.targetIndicator = this.add.graphics();
        this.targetIndicator.lineStyle(3, 0xff0000, 1);
        this.targetIndicator.strokeCircle(0, 0, 20);
        this.targetIndicator.setVisible(false);

        // Create a group to hold cast indicators
        this.castIndicators = this.add.group();
    }

    drawPathfindingGrid() {
        const graphics = this.add.graphics();
        this.pathfinding.drawPathfindingGrid(graphics);
    }

    /**
     * Spawn all enemies from map data
     */
    spawnAllEnemies() {
        this.totalEnemies = this.mapData.enemies.length;
        this.enemiesKilled = 0;

        this.mapData.enemies.forEach(enemyData => {
            const enemy = this.enemies.create(enemyData.x, enemyData.y, 'enemy');

            // Give each enemy a random stop distance and firing/casting state
            enemy.stopDistance = Phaser.Math.Between(
                GAME_CONFIG.ENEMY_STOP_DISTANCE_MIN,
                GAME_CONFIG.ENEMY_STOP_DISTANCE_MAX
            );
            enemy.lastFired = 0;
            enemy.isCasting = false;
            enemy.castStartTime = 0;

            // Dodge state
            enemy.isDodging = false;
            enemy.dodgeStartTime = 0;
            enemy.lastDodged = 0;
            enemy.dodgeTargetX = 0;
            enemy.dodgeTargetY = 0;

            // Patrol state
            enemy.isAggro = false;
            enemy.patrolPoints = enemyData.patrol || [{ x: enemyData.x, y: enemyData.y }];
            enemy.currentPatrolIndex = 0;

            // Test mode (enemy doesn't aggro or shoot, only dodges)
            enemy.testMode = enemyData.testMode || false;

            // Shooting range state (for hysteresis)
            enemy.isInShootingRange = false;

            // Create cast indicator for this enemy
            const castIndicator = this.add.graphics();
            castIndicator.lineStyle(3, 0xffff00, 1);
            castIndicator.strokeCircle(0, 0, 24);
            castIndicator.setVisible(false);
            enemy.castIndicator = castIndicator;
            this.castIndicators.add(castIndicator);
        });
    }

    setupUI(width, height) {
        this.scoreLabel = this.add.text(10, 10, 'Score: 0', {
            fontSize: '32px',
            fill: '#fff'
        }).setScrollFactor(0);

        this.inputSystem.setupModeText(width);

        // Debug visualization (only for debug map with no walls)
        if (this.mapData.walls.length === 0) {
            this.debugGraphics = this.add.graphics();
            this.debugGraphics.setDepth(200);

            this.debugDistanceText = this.add.text(width / 2, 100, 'Distance: --', {
                fontSize: '24px',
                fill: '#ffff00',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5)
            .setScrollFactor(0);

            this.playerSystem.setupDebugVisualization(this.debugGraphics, this.debugDistanceText);
        }
    }

    setupInputZones(width, height) {
        this.inputSystem.setupInputZones(
            width,
            height,
            () => this.fireBullet(),
            () => this.performDodge()
        );
    }

    setupCollisions() {
        this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemyHitPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.handleEnemyBulletHitPlayer, null, this);

        // Add wall collisions
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls);
        this.physics.add.collider(this.bullets, this.walls, (bullet, wall) => bullet.destroy());
        this.physics.add.collider(this.enemyBullets, this.walls, (bullet, wall) => bullet.destroy());
    }

    setupResize() {
        this.scale.on('resize', this.resize, this);
    }

    /**
     * Update: Main game loop
     */
    update(time, delta) {
        this.playerSystem.update(time, delta, this.enemies);
        this.enemySystem.updateAggro();
        this.enemySystem.updateDodging(time);
        this.enemySystem.updateMovement();
        this.enemySystem.updateShooting(time);
        this.updateTargeting();
        this.cleanupBullets();
        this.playerSystem.drawPath(); // Visual debugging
    }

    /**
     * Cleanup bullets that are out of bounds
     */
    cleanupBullets() {
        if (!this.mapData) return;

        // Remove bullets outside world bounds
        this.bullets.children.each(bullet => {
            if (bullet.active) {
                if (bullet.x < 0 || bullet.x > this.mapData.width ||
                    bullet.y < 0 || bullet.y > this.mapData.height) {
                    bullet.destroy();
                }
            }
        });

        this.enemyBullets.children.each(bullet => {
            if (bullet.active) {
                if (bullet.x < 0 || bullet.x > this.mapData.width ||
                    bullet.y < 0 || bullet.y > this.mapData.height) {
                    bullet.destroy();
                }
            }
        });
    }

    updateTargeting() {
        if (!this.player.active) {
            this.targetedEnemy = null;
            this.targetIndicator.setVisible(false);
            return;
        }

        // Find the closest enemy within range
        let closestEnemy = null;
        let closestDistance = Infinity;

        this.enemies.children.each(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    enemy.x, enemy.y
                );

                // Only target enemies within MAX_TARGET_RANGE
                if (distance < closestDistance && distance <= GAME_CONFIG.MAX_TARGET_RANGE) {
                    closestDistance = distance;
                    closestEnemy = enemy;
                }
            }
        });

        // Update target and indicator
        this.targetedEnemy = closestEnemy;

        if (this.targetedEnemy) {
            this.targetIndicator.setPosition(this.targetedEnemy.x, this.targetedEnemy.y);
            this.targetIndicator.setVisible(true);
        } else {
            this.targetIndicator.setVisible(false);
        }
    }

    /**
     * Fire a bullet from the player
     */
    fireBullet() {
        if (!this.player.active) return;

        const now = this.time.now;
        if (now - this.lastFired < GAME_CONFIG.BULLET_FIRE_RATE) return;
        this.lastFired = now;

        const bullet = this.bullets.create(
            this.player.x + GAME_CONFIG.BULLET_OFFSET_X,
            this.player.y,
            'bullet'
        );

        // Aim at the targeted enemy, or shoot right if no target
        if (this.targetedEnemy && this.targetedEnemy.active) {
            const angle = Phaser.Math.Angle.Between(
                bullet.x, bullet.y,
                this.targetedEnemy.x, this.targetedEnemy.y
            );

            bullet.setVelocity(
                Math.cos(angle) * GAME_CONFIG.BULLET_SPEED,
                Math.sin(angle) * GAME_CONFIG.BULLET_SPEED
            );
        } else {
            // No target, shoot straight right
            bullet.setVelocityX(GAME_CONFIG.BULLET_SPEED);
        }
    }

    /**
     * Perform dodge action
     */
    performDodge() {
        if (this.isDodging) return;

        this.isDodging = true;
        this.player.alpha = GAME_CONFIG.DODGE_ALPHA;

        this.time.delayedCall(GAME_CONFIG.DODGE_DURATION, () => {
            this.isDodging = false;
            this.player.alpha = 1;
        });
    }

    /**
     * Handle bullet hitting enemy
     */
    handleBulletHitEnemy(bullet, enemy) {
        bullet.destroy();
        if (enemy.castIndicator) {
            enemy.castIndicator.destroy();
        }
        enemy.destroy();
        this.score += GAME_CONFIG.POINTS_PER_KILL;
        this.enemiesKilled++;
        this.scoreLabel.setText('Score: ' + this.score);

        // Check win condition
        if (this.enemiesKilled >= this.totalEnemies) {
            this.handleVictory();
        }
    }

    /**
     * Handle victory (all enemies killed)
     */
    handleVictory() {
        this.physics.pause();
        this.inputSystem.disableZones();
        this.showVictoryUI();
        this.setupRestart();
    }

    showVictoryUI() {
        this.scoreLabel.setText('VICTORY!\nAll Enemies Defeated\nScore: ' + this.score + '\n\nTap to Restart');
        this.scoreLabel.setOrigin(0.5);
        this.scoreLabel.setX(this.scale.width / 2);
        this.scoreLabel.setY(this.scale.height / 2);
        this.scoreLabel.setStyle({
            fontSize: '32px',
            fill: '#00ff00',
            align: 'center',
            backgroundColor: '#000000',
            padding: { x: 20, y: 20 }
        });
    }

    /**
     * Handle enemy hitting player (Game Over)
     */
    handleEnemyHitPlayer(player, enemy) {
        if (this.isDodging) return;

        this.physics.pause();
        this.inputSystem.disableZones();
        this.showGameOverEffects(player);
        this.showGameOverUI();
        this.setupRestart();
    }

    /**
     * Handle enemy bullet hitting player (Game Over)
     */
    handleEnemyBulletHitPlayer(player, bullet) {
        if (this.isDodging) {
            // Bullet passes through when dodging
            return;
        }

        bullet.destroy();
        this.physics.pause();
        this.inputSystem.disableZones();
        this.showGameOverEffects(player);
        this.showGameOverUI();
        this.setupRestart();
    }

    showGameOverEffects(player) {
        player.setTintFill(GAME_CONFIG.GAME_OVER_COLOR);
        player.setAlpha(GAME_CONFIG.GAME_OVER_PLAYER_ALPHA);

        const overlay = this.add.rectangle(
            this.scale.width / 2,
            this.scale.height / 2,
            this.scale.width,
            this.scale.height,
            GAME_CONFIG.GAME_OVER_COLOR,
            GAME_CONFIG.GAME_OVER_OVERLAY_ALPHA
        ).setScrollFactor(0);

        this.tweens.add({
            targets: overlay,
            alpha: 0,
            duration: GAME_CONFIG.GAME_OVER_OVERLAY_FADE,
            ease: 'Power2'
        });
    }

    showGameOverUI() {
        this.scoreLabel.setText('GAME OVER\nScore: ' + this.score + '\n\nTap to Restart');
        this.scoreLabel.setOrigin(0.5);
        this.scoreLabel.setX(this.scale.width / 2);
        this.scoreLabel.setY(this.scale.height / 2);
        this.scoreLabel.setStyle({
            fontSize: '32px',
            fill: '#ff0000',
            align: 'center',
            backgroundColor: '#000000',
            padding: { x: 20, y: 20 }
        });
    }

    setupRestart() {
        // Wait for a fresh tap: pointerdown followed by pointerup
        // This prevents restart from an ongoing touch that started before game over
        this.input.once('pointerdown', () => {
            this.input.once('pointerup', () => {
                this.scene.restart();
            });
        });
    }

    /**
     * Handle window resize
     */
    resize(gameSize) {
        const { width, height } = gameSize;

        this.cameras.main.setViewport(0, 0, width, height);

        // Update UI positions
        if (this.scoreLabel) {
            this.scoreLabel.setPosition(10, 10);
        }

        this.inputSystem.resize(width, height);
    }
}
