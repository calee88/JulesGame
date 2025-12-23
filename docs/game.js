const config = {
    type: Phaser.AUTO,
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
    scene: {
        preload: preload,
        create: create,
        update: update,
        resize: resize
    }
};

const game = new Phaser.Game(config);

let player;
let cursors;
let bullets;
let enemies;
let lastFired = 0;
let score = 0;
let scoreText;
let isDodging = false;
let gameSpeed = 5;
let zoneAttack, zoneDodge, zoneSwipe;
let graphics;
let width, height;

// Mode Management
const MODES = ['PISTOL', 'SHIELD', 'SWORD']; // Extended for future
let currentModeIndex = 0; // 0: Pistol
let modeText;

function preload() {
    // We are using simple graphics, so no assets to preload yet.
    // In a real build, we would load images here.
}

function create() {
    width = this.scale.width;
    height = this.scale.height;

    // --- Background Grid Effect ---
    // A simple grid to show movement
    this.grid = this.add.grid(width / 2, height / 2, width, height, 50, 50, 0x1a1a2e, 1, 0x0f3460, 0.5);

    // --- Player Setup ---
    // A simple blue square for the player
    player = this.add.rectangle(100, height / 2, 50, 50, 0x00d4ff);
    this.physics.add.existing(player);
    player.body.setCollideWorldBounds(true);
    player.body.setImmovable(true);

    // --- Groups ---
    bullets = this.physics.add.group({
        classType: Phaser.GameObjects.Rectangle,
        maxSize: 30,
        runChildUpdate: true
    });

    enemies = this.physics.add.group();

    // --- Inputs (The Invisible Zones) ---
    createInputZones(this);

    // --- UI ---
    scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '32px', fill: '#fff' });
    modeText = this.add.text(width / 2, 50, 'MODE: PISTOL', { fontSize: '24px', fill: '#00ff00' }).setOrigin(0.5);

    // --- Game Loop Timer for Spawning Enemies ---
    this.time.addEvent({
        delay: 1500,
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });

    // --- Collision Physics ---
    this.physics.add.overlap(bullets, enemies, bulletHitEnemy, null, this);
    this.physics.add.overlap(player, enemies, enemyHitPlayer, null, this);

    // Handle resize
    this.scale.on('resize', resize, this);
}

function createInputZones(scene) {
    // Zone A: Top 50% (Swipe Area) - For now, we just track clicks here for testing
    // Zone B: Button 1 (Attack) - Top of bottom half (50% -> 75%)
    // Zone C: Button 2 (Dodge) - Bottom (75% -> 100%)

    let zoneHeight = height * 0.25; // 1/4 of screen

    // Visual indicators (optional, for debugging/feedback)
    graphics = scene.add.graphics();
    drawZoneLines(scene);

    // Attack Zone (Button 1)
    // Area: y from 50% to 75%
    zoneAttack = scene.add.zone(width/2, height * 0.625, width, zoneHeight).setOrigin(0.5).setInteractive();
    zoneAttack.on('pointerdown', () => {
        fireBullet(scene);
        flashZone(scene, height * 0.5, zoneHeight, 0xff0000);
    });

    // Dodge Zone (Button 2)
    // Area: y from 75% to 100%
    zoneDodge = scene.add.zone(width/2, height * 0.875, width, zoneHeight).setOrigin(0.5).setInteractive();
    zoneDodge.on('pointerdown', () => {
        performDodge(scene);
        flashZone(scene, height * 0.75, zoneHeight, 0x00ff00);
    });

    // Top Area (Swipe/Misc)
    // Area: y from 0 to 50%
    zoneSwipe = scene.add.zone(width/2, height * 0.25, width, height * 0.5).setOrigin(0.5).setInteractive();

    // Swipe Detection
    let startY = 0;
    zoneSwipe.on('pointerdown', (pointer) => {
        startY = pointer.y;
    });

    zoneSwipe.on('pointerup', (pointer) => {
        let endY = pointer.y;
        let diff = endY - startY;

        if (Math.abs(diff) > 50) { // Minimum swipe distance
            if (diff > 0) {
                // Swipe Down
                changeMode(scene, -1);
            } else {
                // Swipe Up
                changeMode(scene, 1);
            }
        }
    });
}

function changeMode(scene, direction) {
    // direction: 1 (Next), -1 (Prev)
    currentModeIndex = (currentModeIndex + direction + MODES.length) % MODES.length;
    let newMode = MODES[currentModeIndex];

    modeText.setText('MODE: ' + newMode);

    // Visual feedback for mode switch
    scene.tweens.add({
        targets: modeText,
        scale: 1.5,
        duration: 100,
        yoyo: true
    });

    console.log("Switched to mode:", newMode);
}

function drawZoneLines(scene) {
    graphics.clear();
    graphics.lineStyle(2, 0xffffff, 0.2);
    // Line at 50%
    graphics.lineBetween(0, height * 0.5, width, height * 0.5);
    // Line at 75%
    graphics.lineBetween(0, height * 0.75, width, height * 0.75);

    // Label text (temporary)
    scene.add.text(width - 100, height * 0.625, 'ATTACK', { fontSize: '16px', fill: '#ffffff50' }).setOrigin(0.5);
    scene.add.text(width - 100, height * 0.875, 'DODGE', { fontSize: '16px', fill: '#ffffff50' }).setOrigin(0.5);
}

function flashZone(scene, y, h, color) {
    let rect = scene.add.rectangle(width/2, y + h/2, width, h, color, 0.3);
    scene.tweens.add({
        targets: rect,
        alpha: 0,
        duration: 200,
        onComplete: () => rect.destroy()
    });
}

function update() {
    // Move grid to simulate running
    this.grid.tilePositionX += gameSpeed;

    // Remove bullets that go off screen
    bullets.children.each(function(b) {
        if (b.active && b.x > width) {
            b.destroy();
        }
    }, this);

    // Remove enemies that go off screen (and maybe penalize?)
    enemies.children.each(function(e) {
        if (e.active && e.x < -50) {
            e.destroy();
        }
    }, this);
}

function fireBullet(scene) {
    // Simple cooldown
    let now = scene.time.now;
    if (now - lastFired < 300) return;
    lastFired = now;

    // Create a bullet (Yellow square)
    let bullet = scene.add.rectangle(player.x + 30, player.y, 20, 10, 0xffff00);
    scene.physics.add.existing(bullet);
    bullet.body.setVelocityX(600);
    bullets.add(bullet);
}

function performDodge(scene) {
    if (isDodging) return;
    isDodging = true;

    // Visual feedback: Transparency
    player.alpha = 0.5;

    // Logic: Invulnerable (we handle this in collision callback)

    scene.time.delayedCall(500, () => {
        isDodging = false;
        player.alpha = 1;
    });
}

function spawnEnemy() {
    let yPos = Phaser.Math.Between(50, height * 0.5); // Spawn in the top half (gameplay area)

    // Keep enemy spawn within reasonable gameplay bounds (not too low, into buttons)
    // Gameplay area is technically top 50%, but let's give it some padding.
    yPos = Phaser.Math.Clamp(yPos, 50, (height * 0.5) - 50);

    let enemy = this.add.rectangle(width + 50, yPos, 40, 40, 0xff0000);
    this.physics.add.existing(enemy);
    enemy.body.setVelocityX(-200 - (score * 5)); // Get faster as score increases
    enemies.add(enemy);
}

function bulletHitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.destroy();
    score += 10;
    scoreText.setText('Score: ' + score);
}

function enemyHitPlayer(player, enemy) {
    if (isDodging) {
        // Successful dodge!
        // Maybe slow time or bonus points?
        return;
    }

    // Game Over Logic
    this.physics.pause();
    player.fillColor = 0x555555;
    scoreText.setText('GAME OVER\nTap to Restart');
    scoreText.setAlign('center');
    scoreText.setOrigin(0.5);
    scoreText.setPosition(width/2, height/2);

    // Restart on tap
    this.input.once('pointerdown', () => {
        this.scene.restart();
        score = 0;
        isDodging = false;
    });
}

function resize(gameSize) {
    width = gameSize.width;
    height = gameSize.height;

    this.cameras.resize(width, height);
    this.grid.setSize(width, height);

    // Reposition UI if needed
    // Recreate zones to match new height
    // (Simplest way is just to update their coordinates, but recreating is safer for prototype)
    if (zoneAttack) zoneAttack.destroy();
    if (zoneDodge) zoneDodge.destroy();
    if (zoneSwipe) zoneSwipe.destroy();
    drawZoneLines(this);

    // Re-bind zones
    let zoneHeight = height * 0.25;
    zoneAttack = this.add.zone(width/2, height * 0.625, width, zoneHeight).setOrigin(0.5).setInteractive();
    zoneAttack.on('pointerdown', () => { fireBullet(this); flashZone(this, height * 0.5, zoneHeight, 0xff0000); });

    zoneDodge = this.add.zone(width/2, height * 0.875, width, zoneHeight).setOrigin(0.5).setInteractive();
    zoneDodge.on('pointerdown', () => { performDodge(this); flashZone(this, height * 0.75, zoneHeight, 0x00ff00); });

    zoneSwipe = this.add.zone(width/2, height * 0.25, width, height * 0.5).setOrigin(0.5).setInteractive();
}
