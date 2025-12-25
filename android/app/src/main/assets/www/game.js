// Ported from: https://github.com/ourcade/infinite-runner-template-phaser3/blob/master/src/scenes/Game.ts
// Adapted for Vanilla JS + Programmatic Assets

// ============================================================================
// GAME CONSTANTS
// ============================================================================
const GAME_CONFIG = {
    // Player
    PLAYER_SPEED: 200,
    PLAYER_START_X_RATIO: 0.5,
    PLAYER_COLOR: 0x00d4ff,
    PLAYER_SIZE: 32,

    // Enemy
    ENEMY_SPEED: 150,
    ENEMY_SPAWN_INTERVAL: 1500,
    ENEMY_COLOR: 0xff0000,
    ENEMY_SIZE: 32,
    ENEMY_SPAWN_MARGIN: 100,
    ENEMY_STOP_DISTANCE_MIN: 150,
    ENEMY_STOP_DISTANCE_MAX: 250,
    ENEMY_FIRE_RATE: 1000,
    ENEMY_CAST_TIME: 500,
    ENEMY_BULLET_SPEED: 400,
    ENEMY_BULLET_COLOR: 0xff6600,

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

    // Zone Flash
    ZONE_FLASH_DURATION: 200,
    ZONE_FLASH_ALPHA: 0.3,
    ATTACK_FLASH_COLOR: 0xff0000,
    DODGE_FLASH_COLOR: 0x00ff00,

    // Mode
    MODE_SCALE_DURATION: 100,
    MODE_SCALE_MAX: 1.5
};

// ============================================================================
// GAME SCENE
// ============================================================================
class GameScene extends Phaser.Scene {
    constructor() {
        super('game-scene');
        this.initializeState();
    }

    /**
     * Initialize all instance variables
     */
    initializeState() {
        // Game State
        this.score = 0;
        this.spawnTimer = 0;
        this.lastFired = 0;
        this.isDodging = false;

        // Mode System
        this.modes = ['PISTOL', 'SHIELD', 'SWORD'];
        this.currentModeIndex = 0;

        // Targeting System
        this.targetedEnemy = null;
        this.targetIndicator = null;

        // Cast Indicators
        this.castIndicators = null;

        // Swipe Detection State
        this.swipeStartY = 0;
        this.swipeStartedInBottomQuarter = false;
        this.swipeStartedAboveThreshold = false;
        this.isSwipeGesture = false;

        // Game Objects
        this.player = null;
        this.enemies = null;
        this.bullets = null;
        this.enemyBullets = null;
        this.background = null;

        // UI Elements
        this.scoreLabel = null;
        this.modeText = null;
        this.zoneAttack = null;
        this.zoneDodge = null;
    }

    /**
     * Preload: Generate procedural assets
     */
    preload() {
        this.generateBackground();
        this.generatePlayer();
        this.generateEnemy();
        this.generateBullet();
        this.generateEnemyBullet();
    }

    generateBackground() {
        const bg = this.make.graphics({ x: 0, y: 0, add: false });
        bg.fillStyle(GAME_CONFIG.BACKGROUND_COLOR);
        bg.fillRect(0, 0, GAME_CONFIG.BACKGROUND_SIZE, GAME_CONFIG.BACKGROUND_SIZE);
        bg.lineStyle(1, GAME_CONFIG.BACKGROUND_GRID_COLOR, 0.5);
        bg.strokeRect(0, 0, GAME_CONFIG.BACKGROUND_SIZE, GAME_CONFIG.BACKGROUND_SIZE);
        bg.generateTexture('background', GAME_CONFIG.BACKGROUND_SIZE, GAME_CONFIG.BACKGROUND_SIZE);
    }

    generatePlayer() {
        const p = this.make.graphics({ x: 0, y: 0, add: false });
        p.fillStyle(GAME_CONFIG.PLAYER_COLOR);
        p.fillRect(0, 0, GAME_CONFIG.PLAYER_SIZE, GAME_CONFIG.PLAYER_SIZE);
        p.generateTexture('player', GAME_CONFIG.PLAYER_SIZE, GAME_CONFIG.PLAYER_SIZE);
    }

    generateEnemy() {
        const e = this.make.graphics({ x: 0, y: 0, add: false });
        e.fillStyle(GAME_CONFIG.ENEMY_COLOR);
        e.fillRect(0, 0, GAME_CONFIG.ENEMY_SIZE, GAME_CONFIG.ENEMY_SIZE);
        e.generateTexture('enemy', GAME_CONFIG.ENEMY_SIZE, GAME_CONFIG.ENEMY_SIZE);
    }

    generateBullet() {
        const b = this.make.graphics({ x: 0, y: 0, add: false });
        b.fillStyle(GAME_CONFIG.BULLET_COLOR);
        b.fillRect(0, 0, GAME_CONFIG.BULLET_WIDTH, GAME_CONFIG.BULLET_HEIGHT);
        b.generateTexture('bullet', GAME_CONFIG.BULLET_WIDTH, GAME_CONFIG.BULLET_HEIGHT);
    }

    generateEnemyBullet() {
        const eb = this.make.graphics({ x: 0, y: 0, add: false });
        eb.fillStyle(GAME_CONFIG.ENEMY_BULLET_COLOR);
        eb.fillCircle(6, 6, 6);
        eb.generateTexture('enemyBullet', 12, 12);
    }

    /**
     * Create: Initialize game objects and setup
     */
    create() {
        const { width, height } = this.scale;

        this.setupBackground(width, height);
        this.setupPlayer(width, height);
        this.setupCamera(width);
        this.setupGroups();
        this.setupTargetIndicator();
        this.setupUI(width, height);
        this.setupInputZones(width, height);
        this.setupCollisions();
        this.setupResize();
    }

    setupBackground(width, height) {
        this.background = this.add.tileSprite(0, 0, width, height, 'background')
            .setOrigin(0)
            .setScrollFactor(0);
    }

    setupPlayer(width, height) {
        const startX = width * GAME_CONFIG.PLAYER_START_X_RATIO;
        const startY = height / 2;

        this.player = this.physics.add.sprite(startX, startY, 'player');
        this.player.setCollideWorldBounds(false);
        this.player.setVelocityX(GAME_CONFIG.PLAYER_SPEED);
    }

    setupCamera(width) {
        const offsetX = width * GAME_CONFIG.CAMERA_FOLLOW_OFFSET_X_RATIO;
        this.cameras.main.startFollow(
            this.player,
            true,
            GAME_CONFIG.CAMERA_LERP,
            GAME_CONFIG.CAMERA_LERP,
            offsetX,
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

    setupUI(width, height) {
        this.scoreLabel = this.add.text(10, 10, 'Score: 0', {
            fontSize: '32px',
            fill: '#fff'
        }).setScrollFactor(0);

        this.modeText = this.add.text(width / 2, 50, 'MODE: PISTOL', {
            fontSize: '32px',
            fill: '#00ff00'
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
    }

    setupInputZones(width, height) {
        this.createSwipeDetection(height);
        this.createAttackZone(width, height);
        this.createDodgeZone(width, height);
    }

    setupCollisions() {
        this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemyHitPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.handleEnemyBulletHitPlayer, null, this);
    }

    setupResize() {
        this.scale.on('resize', this.resize, this);
    }

    /**
     * Update: Main game loop
     */
    update(time, delta) {
        this.updateBackground();
        this.updateEnemySpawning(delta);
        this.updateEnemyMovement();
        this.updateEnemyShooting(time);
        this.updateTargeting();
        this.cleanupOffscreenObjects();
    }

    updateBackground() {
        this.background.tilePositionX = this.cameras.main.scrollX;
    }

    updateEnemySpawning(delta) {
        this.spawnTimer += delta;
        if (this.spawnTimer > GAME_CONFIG.ENEMY_SPAWN_INTERVAL) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }
    }

    updateEnemyMovement() {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    this.player.x, this.player.y
                );

                // Only move if farther than stop distance
                if (distance > enemy.stopDistance) {
                    const angle = Phaser.Math.Angle.Between(
                        enemy.x, enemy.y,
                        this.player.x, this.player.y
                    );

                    enemy.setVelocity(
                        Math.cos(angle) * GAME_CONFIG.ENEMY_SPEED,
                        Math.sin(angle) * GAME_CONFIG.ENEMY_SPEED
                    );
                } else {
                    // Stop moving when close enough
                    enemy.setVelocity(0, 0);
                }
            }
        });
    }

    updateEnemyShooting(time) {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    this.player.x, this.player.y
                );

                // Handle shooting with cast time when within stop distance
                if (distance <= enemy.stopDistance) {
                    if (enemy.isCasting) {
                        // Check if cast is complete
                        if (time - enemy.castStartTime >= GAME_CONFIG.ENEMY_CAST_TIME) {
                            // Fire the bullet
                            const angle = Phaser.Math.Angle.Between(
                                enemy.x, enemy.y,
                                this.player.x, this.player.y
                            );

                            const bullet = this.enemyBullets.create(enemy.x, enemy.y, 'enemyBullet');
                            bullet.setVelocity(
                                Math.cos(angle) * GAME_CONFIG.ENEMY_BULLET_SPEED,
                                Math.sin(angle) * GAME_CONFIG.ENEMY_BULLET_SPEED
                            );

                            // Reset cast state
                            enemy.isCasting = false;
                            enemy.lastFired = time;
                            enemy.castIndicator.setVisible(false);
                        } else {
                            // Update cast indicator position
                            enemy.castIndicator.setPosition(enemy.x, enemy.y);
                        }
                    } else {
                        // Start casting if ready to fire
                        if (time - enemy.lastFired > GAME_CONFIG.ENEMY_FIRE_RATE) {
                            enemy.isCasting = true;
                            enemy.castStartTime = time;
                            enemy.castIndicator.setPosition(enemy.x, enemy.y);
                            enemy.castIndicator.setVisible(true);
                        }
                    }
                } else {
                    // Cancel cast if moving away
                    if (enemy.isCasting) {
                        enemy.isCasting = false;
                        enemy.castIndicator.setVisible(false);
                    }
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

        // Find the closest enemy
        let closestEnemy = null;
        let closestDistance = Infinity;

        this.enemies.children.each(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    enemy.x, enemy.y
                );

                if (distance < closestDistance) {
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

    cleanupOffscreenObjects() {
        const cam = this.cameras.main;
        const killLine = cam.scrollX + this.scale.width + GAME_CONFIG.OFFSCREEN_MARGIN;
        const trailLine = cam.scrollX - GAME_CONFIG.OFFSCREEN_MARGIN;

        this.bullets.children.each(bullet => {
            if (bullet.active && bullet.x > killLine) {
                bullet.destroy();
            }
        });

        this.enemyBullets.children.each(bullet => {
            if (bullet.active && (bullet.x < trailLine || bullet.x > killLine)) {
                bullet.destroy();
            }
        });

        this.enemies.children.each(enemy => {
            if (enemy.active && enemy.x < trailLine) {
                if (enemy.castIndicator) {
                    enemy.castIndicator.destroy();
                }
                enemy.destroy();
            }
        });
    }

    /**
     * Spawn an enemy off-screen
     */
    spawnEnemy() {
        const cam = this.cameras.main;
        const spawnX = cam.scrollX + cam.width + GAME_CONFIG.ENEMY_SPAWN_MARGIN;
        const spawnY = Phaser.Math.Between(
            GAME_CONFIG.ENEMY_SPAWN_MARGIN,
            cam.height - GAME_CONFIG.ENEMY_SPAWN_MARGIN
        );

        const enemy = this.enemies.create(spawnX, spawnY, 'enemy');

        // Give each enemy a random stop distance and firing/casting state
        enemy.stopDistance = Phaser.Math.Between(
            GAME_CONFIG.ENEMY_STOP_DISTANCE_MIN,
            GAME_CONFIG.ENEMY_STOP_DISTANCE_MAX
        );
        enemy.lastFired = 0;
        enemy.isCasting = false;
        enemy.castStartTime = 0;

        // Create cast indicator for this enemy
        const castIndicator = this.add.graphics();
        castIndicator.lineStyle(3, 0xffff00, 1);
        castIndicator.strokeCircle(0, 0, 24);
        castIndicator.setVisible(false);
        enemy.castIndicator = castIndicator;
        this.castIndicators.add(castIndicator);
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
        this.scoreLabel.setText('Score: ' + this.score);
    }

    /**
     * Handle enemy hitting player (Game Over)
     */
    handleEnemyHitPlayer(player, enemy) {
        if (this.isDodging) return;

        this.physics.pause();

        // Disable input zones to prevent interactions during game over
        if (this.zoneAttack) this.zoneAttack.disableInteractive();
        if (this.zoneDodge) this.zoneDodge.disableInteractive();

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

        // Disable input zones to prevent interactions during game over
        if (this.zoneAttack) this.zoneAttack.disableInteractive();
        if (this.zoneDodge) this.zoneDodge.disableInteractive();

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
     * Create swipe detection
     */
    createSwipeDetection(height) {
        const threshold = height * GAME_CONFIG.BOTTOM_QUARTER_THRESHOLD;

        this.input.on('pointerdown', (pointer) => {
            this.swipeStartY = pointer.y;
            this.swipeStartedInBottomQuarter = pointer.y > threshold;
            this.swipeStartedAboveThreshold = pointer.y <= threshold;
            this.isSwipeGesture = false;
        });

        this.input.on('pointermove', (pointer) => {
            const verticalMovement = Math.abs(pointer.y - this.swipeStartY);
            if (verticalMovement > GAME_CONFIG.SWIPE_MIN_DISTANCE) {
                this.isSwipeGesture = true;
            }
        });

        this.input.on('pointerup', (pointer) => {
            this.handleSwipeUp(pointer, threshold);
            this.handleSwipeDown(pointer, threshold);
        });
    }

    handleSwipeUp(pointer, threshold) {
        if (this.swipeStartedInBottomQuarter && pointer.y <= threshold) {
            this.changeMode(1);
            this.resetSwipeState();
        }
    }

    handleSwipeDown(pointer, threshold) {
        if (this.swipeStartedAboveThreshold && pointer.y > threshold) {
            this.changeMode(-1);
            this.resetSwipeState();
        }
    }

    resetSwipeState() {
        this.swipeStartedInBottomQuarter = false;
        this.swipeStartedAboveThreshold = false;
        this.isSwipeGesture = false;
    }

    /**
     * Create attack zone
     */
    createAttackZone(width, height) {
        const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
        const zoneY = height * GAME_CONFIG.ATTACK_ZONE_Y;

        this.zoneAttack = this.add.zone(width / 2, zoneY, width, zoneHeight)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive();

        this.zoneAttack.on('pointerup', () => {
            if (!this.isSwipeGesture) {
                this.fireBullet();
                this.flashZone(zoneY - zoneHeight / 2, zoneHeight, GAME_CONFIG.ATTACK_FLASH_COLOR);
            }
        });
    }

    /**
     * Create dodge zone
     */
    createDodgeZone(width, height) {
        const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
        const zoneY = height * GAME_CONFIG.DODGE_ZONE_Y;

        this.zoneDodge = this.add.zone(width / 2, zoneY, width, zoneHeight)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive();

        this.zoneDodge.on('pointerup', () => {
            if (!this.isSwipeGesture) {
                this.performDodge();
                this.flashZone(zoneY - zoneHeight / 2, zoneHeight, GAME_CONFIG.DODGE_FLASH_COLOR);
            }
        });
    }

    /**
     * Flash zone feedback
     */
    flashZone(y, height, color) {
        const rect = this.add.rectangle(
            this.scale.width / 2,
            y + height / 2,
            this.scale.width,
            height,
            color,
            GAME_CONFIG.ZONE_FLASH_ALPHA
        ).setScrollFactor(0);

        this.tweens.add({
            targets: rect,
            alpha: 0,
            duration: GAME_CONFIG.ZONE_FLASH_DURATION,
            onComplete: () => rect.destroy()
        });
    }

    /**
     * Change mode (cycle through weapon modes)
     */
    changeMode(direction) {
        this.currentModeIndex = (this.currentModeIndex + direction + this.modes.length) % this.modes.length;
        this.modeText.setText('MODE: ' + this.modes[this.currentModeIndex]);

        this.tweens.add({
            targets: this.modeText,
            scale: GAME_CONFIG.MODE_SCALE_MAX,
            duration: GAME_CONFIG.MODE_SCALE_DURATION,
            yoyo: true
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

        if (this.modeText) {
            this.modeText.setPosition(width / 2, 50);
        }

        if (this.zoneAttack) {
            const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
            this.zoneAttack.setSize(width, zoneHeight)
                .setPosition(width / 2, height * GAME_CONFIG.ATTACK_ZONE_Y);
            this.zoneDodge.setSize(width, zoneHeight)
                .setPosition(width / 2, height * GAME_CONFIG.DODGE_ZONE_Y);
        }

        if (this.background) {
            this.background.setSize(width, height);
        }
    }
}

// ============================================================================
// GAME CONFIGURATION
// ============================================================================

// FIT mode with fixed width, dynamic height to match screen aspect ratio
function getScaleConfig() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const targetWidth = 720;

    // Check if screen is portrait or landscape
    if (height > width) {
        // Portrait screen: dynamic height to match aspect ratio (no black bars)
        const aspectRatio = height / width;
        const targetHeight = Math.round(targetWidth * aspectRatio);

        return {
            mode: Phaser.Scale.FIT,
            width: targetWidth,
            height: targetHeight,
            autoCenter: Phaser.Scale.CENTER_BOTH
        };
    } else {
        // Landscape screen (PC): fixed portrait ratio (with black bars)
        return {
            mode: Phaser.Scale.FIT,
            width: targetWidth,
            height: 1280,
            autoCenter: Phaser.Scale.CENTER_BOTH
        };
    }
}

const scaleConfig = getScaleConfig();

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: scaleConfig.mode,
        parent: 'game-container',
        width: scaleConfig.width,
        height: scaleConfig.height,
        autoCenter: scaleConfig.autoCenter
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    backgroundColor: '#1a1a2e',
    scene: GameScene
};

const game = new Phaser.Game(config);
