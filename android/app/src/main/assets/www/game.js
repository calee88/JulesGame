// Ported from: https://github.com/ourcade/infinite-runner-template-phaser3/blob/master/src/scenes/Game.ts
// Adapted for Vanilla JS + Programmatic Assets

class GameScene extends Phaser.Scene {
    constructor() {
        super('game-scene');

        // State
        this.score = 0;
        this.scoreLabel = null;
        this.player = null;
        this.cursors = null;

        // Groups
        this.enemies = null;
        this.bullets = null;

        // World Constants
        this.gameSpeed = 5; // not used directly if we use velocity
        this.spawnTimer = 0;
        this.lastFired = 0;

        // Mode
        this.modes = ['PISTOL', 'SHIELD', 'SWORD'];
        this.currentModeIndex = 0;
        this.modeText = null;

        // One-handed controls
        this.zoneAttack = null;
        this.zoneDodge = null;
        this.zoneSwipe = null;
        this.isDodging = false;
    }

    preload() {
        // --- Generate Assets Programmatically (No external files needed) ---

        // 1. Background (Tile)
        let bg = this.make.graphics({ x: 0, y: 0, add: false });
        bg.fillStyle(0x1a1a2e);
        bg.fillRect(0, 0, 64, 64); // Dark Blue Tile
        bg.lineStyle(1, 0x0f3460, 0.5);
        bg.strokeRect(0, 0, 64, 64); // Grid line
        bg.generateTexture('background', 64, 64);

        // 2. Player
        let p = this.make.graphics({ x: 0, y: 0, add: false });
        p.fillStyle(0x00d4ff); // Cyan
        p.fillRect(0, 0, 32, 32);
        p.generateTexture('player', 32, 32);

        // 3. Enemy
        let e = this.make.graphics({ x: 0, y: 0, add: false });
        e.fillStyle(0xff0000); // Red
        e.fillRect(0, 0, 32, 32);
        e.generateTexture('enemy', 32, 32);

        // 4. Bullet
        let b = this.make.graphics({ x: 0, y: 0, add: false });
        b.fillStyle(0xffff00); // Yellow
        b.fillRect(0, 0, 16, 8);
        b.generateTexture('bullet', 16, 8);
    }

    create() {
        const width = this.scale.width;
        const height = this.scale.height;

        // 1. Background (Scrolling TileSprite)
        // We make it huge so it covers the initial area, but we'll scroll it manually or stick it to camera
        this.background = this.add.tileSprite(0, 0, width, height, 'background')
            .setOrigin(0)
            .setScrollFactor(0); // Fix to camera

        // 2. Player (Moving Right)
        this.player = this.physics.add.sprite(width * 0.2, height / 2, 'player');
        this.player.setCollideWorldBounds(false); // Let it run forever
        this.player.setVelocityX(200); // CONSTANT FORWARD SPEED

        // 3. Camera (Follow Player)
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1, -width * 0.3, 0); // Offset to keep player on left
        // No Bounds! Infinite world.

        // 4. Object Groups
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group();

        // 5. UI (Fixed to Camera)
        this.scoreLabel = this.add.text(10, 10, 'Score: 0', { fontSize: '24px', fill: '#fff' })
            .setScrollFactor(0);
        this.modeText = this.add.text(width / 2, 50, 'MODE: PISTOL', { fontSize: '24px', fill: '#00ff00' })
            .setOrigin(0.5)
            .setScrollFactor(0);

        // 6. Controls (Zones)
        this.createInputZones(width, height);

        // 7. Collisions
        this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletHitEnemy, null, this);
        this.physics.add.overlap(this.player, this.enemies, this.handleEnemyHitPlayer, null, this);

        // Handle resize
        this.scale.on('resize', this.resize, this);
    }

    update(time, delta) {
        // --- 1. Scroll Background ---
        // Since background is ScrollFactor 0, it stays on screen.
        // We animate its tilePosition to match camera movement.
        this.background.tilePositionX = this.cameras.main.scrollX;

        // --- 2. Spawn Enemies ---
        // Logic: Spawn ahead of the camera view
        this.spawnTimer += delta;
        if (this.spawnTimer > 1500) {
            this.spawnEnemy();
            this.spawnTimer = 0;
        }

        // --- 3. Update Enemy Movement (Track Player) ---
        this.enemies.children.each(e => {
            if (e.active && this.player.active) {
                // Calculate direction to player
                const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
                const speed = 150; // Enemy speed

                // Set velocity toward player
                e.setVelocity(
                    Math.cos(angle) * speed,
                    Math.sin(angle) * speed
                );
            }
        });

        // --- 4. Cleanup ---
        // Destroy bullets that flew too far (relative to player)
        const killLine = this.cameras.main.scrollX + this.scale.width + 100;
        const trailLine = this.cameras.main.scrollX - 100;

        this.bullets.children.each(b => {
            if (b.active && b.x > killLine) b.destroy();
        });

        // Destroy enemies that player passed
        this.enemies.children.each(e => {
            if (e.active && e.x < trailLine) e.destroy();
        });

        // --- 5. Infinite Teleport (Floating Point Precision Guard) ---
        // If we go too far, teleport back?
        // For a simple prototype, Number.MAX_SAFE_INTEGER is huge, so 200px/s will run for millions of years.
        // We don't strictly need to wrap the world unless physics gets jittery.
        // The original tutorial wrapped because it reused static assets (houses).
        // Since we spawn new enemies, we can just keep going.
    }

    spawnEnemy() {
        const cam = this.cameras.main;
        const spawnX = cam.scrollX + cam.width + 100; // Just off-screen right
        const spawnY = Phaser.Math.Between(100, cam.height - 100);

        // Enemy will track player position
        let enemy = this.enemies.create(spawnX, spawnY, 'enemy');
        // Velocity will be set in update() to track player
    }

    fireBullet() {
        if (!this.player.active) return;

        const now = this.time.now;
        if (now - this.lastFired < 300) return;
        this.lastFired = now;

        // Spawn bullet at player position
        let b = this.bullets.create(this.player.x + 20, this.player.y, 'bullet');
        // Bullet must move faster than player!
        // Player = 200. Bullet = 600.
        b.setVelocityX(600);
    }

    performDodge() {
        if (this.isDodging) return;
        this.isDodging = true;
        this.player.alpha = 0.5;

        // Simple timer for dodge duration
        this.time.delayedCall(500, () => {
            this.isDodging = false;
            this.player.alpha = 1;
        });
    }

    handleBulletHitEnemy(bullet, enemy) {
        bullet.destroy();
        enemy.destroy();
        this.score += 10;
        this.scoreLabel.setText('Score: ' + this.score);
    }

    handleEnemyHitPlayer(player, enemy) {
        if (this.isDodging) return;

        // Game Over
        this.physics.pause();
        player.setTint(0x555555);
        this.scoreLabel.setText('GAME OVER\nTap to Restart');
        this.scoreLabel.setX(this.cameras.main.scrollX + this.scale.width/2 - 100); // Center relative to cam
        this.scoreLabel.setY(this.scale.height/2);

        // Restart on touch up (consistent with other button behavior)
        this.input.once('pointerup', () => {
            this.scene.restart();
        });
    }

    createInputZones(width, height) {
        // We use scrollFactor(0) for Zones so they stick to the screen!
        let zoneHeight = height * 0.25;

        // Swipe Detection (Global) - Bidirectional mode switching
        let swipeStartY = 0;
        let swipeStartedInBottomQuarter = false;
        let swipeStartedAboveThreshold = false;
        let isSwipeGesture = false;
        const bottomQuarterThreshold = height * 0.75; // Bottom 25% of screen

        // Attack (Bottom Upper) - Trigger on touch up if no swipe
        this.zoneAttack = this.add.zone(width/2, height * 0.625, width, zoneHeight)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive();

        this.zoneAttack.on('pointerup', () => {
            if (!isSwipeGesture) {
                this.fireBullet();
                this.flashZone(height * 0.5, zoneHeight, 0xff0000);
            }
        });

        this.input.on('pointerdown', (pointer) => {
            swipeStartY = pointer.y;
            swipeStartedInBottomQuarter = pointer.y > bottomQuarterThreshold;
            swipeStartedAboveThreshold = pointer.y <= bottomQuarterThreshold;
            isSwipeGesture = false; // Reset
        });

        this.input.on('pointermove', (pointer) => {
            // Detect if user is performing a swipe (moved vertically)
            const verticalMovement = Math.abs(pointer.y - swipeStartY);
            if (verticalMovement > 20) {
                isSwipeGesture = true;
            }
        });

        this.input.on('pointerup', (pointer) => {
            // Swipe UP: Start in bottom quarter, end above it
            if (swipeStartedInBottomQuarter && pointer.y <= bottomQuarterThreshold) {
                this.changeMode(1); // Cycle mode forward
                swipeStartedInBottomQuarter = false;
                swipeStartedAboveThreshold = false;
                isSwipeGesture = false;
                return;
            }

            // Swipe DOWN: Start above threshold, end in bottom quarter
            if (swipeStartedAboveThreshold && pointer.y > bottomQuarterThreshold) {
                this.changeMode(-1); // Cycle mode backward
                swipeStartedInBottomQuarter = false;
                swipeStartedAboveThreshold = false;
                isSwipeGesture = false;
                return;
            }
        });

        // Dodge (Bottom Lower) - Trigger on touch up if no swipe
        this.zoneDodge = this.add.zone(width/2, height * 0.875, width, zoneHeight)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive();

        this.zoneDodge.on('pointerup', () => {
            if (!isSwipeGesture) {
                this.performDodge();
                this.flashZone(height * 0.75, zoneHeight, 0x00ff00);
            }
        });
    }

    flashZone(y, h, color) {
        let r = this.add.rectangle(this.scale.width/2, y + h/2, this.scale.width, h, color, 0.3)
            .setScrollFactor(0);
        this.tweens.add({
            targets: r,
            alpha: 0,
            duration: 200,
            onComplete: () => r.destroy()
        });
    }

    changeMode(dir) {
        this.currentModeIndex = (this.currentModeIndex + dir + this.modes.length) % this.modes.length;
        this.modeText.setText('MODE: ' + this.modes[this.currentModeIndex]);
        this.tweens.add({ targets: this.modeText, scale: 1.5, duration: 100, yoyo: true });
    }

    resize(gameSize) {
        const width = gameSize.width;
        const height = gameSize.height;
        this.cameras.main.setViewport(0, 0, width, height);
        // Re-position UI elements?
        // For prototype, simple reload is safer, but let's just update zones
        if (this.zoneAttack) {
            this.zoneAttack.setSize(width, height * 0.25).setPosition(width/2, height * 0.625);
            this.zoneDodge.setSize(width, height * 0.25).setPosition(width/2, height * 0.875);
        }
        if (this.background) this.background.setSize(width, height);
    }
}

const config = {
    type: Phaser.CANVAS, // Canvas for stability
    scale: {
        mode: Phaser.Scale.RESIZE,
        parent: 'game-container',
        width: '100%',
        height: '100%'
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
