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
    GRID_SIZE: 32, // Size of pathfinding grid cells
    ENEMY_AGGRO_RANGE: 400, // Distance at which enemies activate chase/dodge/shoot
    ENEMY_PATROL_SPEED: 80,

    // Auto-walk
    PLAYER_AUTO_WALK_SPEED: 180,
    PLAYER_ARRIVAL_THRESHOLD: 50, // Distance to consider "arrived" at destination

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

        // Map System
        this.mapData = null;
        this.walls = null;
        this.pathfindingGrid = null;
        this.easystar = null;

        // Auto-walk System
        this.playerDestination = null;
        this.playerPath = null;
        this.currentPathIndex = 0;
        this.lastPlayerPosition = { x: 0, y: 0 };
        this.stuckCheckTimer = 0;
        this.stuckCheckInterval = 1000; // Check every 1000ms (less aggressive)
        this.pathGraphics = null; // Visual debugging for path

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
        this.generateWall();
        this.generateFloor();

        // Load map data
        this.load.json('mapData', GAME_CONFIG.MAP_FILE);
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

    generateWall() {
        const w = this.make.graphics({ x: 0, y: 0, add: false });
        w.fillStyle(GAME_CONFIG.WALL_COLOR);
        w.fillRect(0, 0, 64, 64);
        w.lineStyle(2, 0x6a6a8e, 1);
        w.strokeRect(0, 0, 64, 64);
        w.generateTexture('wall', 64, 64);
    }

    generateFloor() {
        const f = this.make.graphics({ x: 0, y: 0, add: false });
        f.fillStyle(GAME_CONFIG.FLOOR_COLOR);
        f.fillRect(0, 0, 64, 64);
        f.lineStyle(1, GAME_CONFIG.BACKGROUND_GRID_COLOR, 0.3);
        f.strokeRect(0, 0, 64, 64);
        f.generateTexture('floor', 64, 64);
    }

    /**
     * Create: Initialize game objects and setup
     */
    create() {
        const { width, height } = this.scale;

        // Load map data
        this.mapData = this.cache.json.get('mapData');

        // Set world bounds to map size
        this.physics.world.setBounds(0, 0, this.mapData.width, this.mapData.height);

        this.setupBackground(width, height);
        this.createMap();
        this.createPathfindingGrid();
        this.setupPlayer(width, height);
        this.setupCamera(width);
        this.setupGroups();
        this.setupTargetIndicator();
        this.setupPathVisualization();
        this.spawnAllEnemies();
        this.setupUI(width, height);
        this.setupInputZones(width, height);
        this.setupCollisions();
        this.setupResize();
    }

    setupBackground(width, height) {
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

    setupPlayer(width, height) {
        // Use map data for player start position
        const startX = this.mapData.playerStart.x;
        const startY = this.mapData.playerStart.y;

        this.player = this.physics.add.sprite(startX, startY, 'player');
        this.player.setCollideWorldBounds(true);
        // No auto-velocity - player will auto-walk to enemies
    }

    setupCamera(width) {
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

    setupPathVisualization() {
        // Create graphics object for path visualization
        this.pathGraphics = this.add.graphics();
        this.pathGraphics.setDepth(100); // Draw on top of most things

        // Draw the pathfinding grid to visualize blocked cells
        this.drawPathfindingGrid();
    }

    drawPathfindingGrid() {
        const graphics = this.add.graphics();
        graphics.setDepth(50); // Below path but above floor

        const gridWidth = this.pathfindingGrid[0].length;
        const gridHeight = this.pathfindingGrid.length;

        // Draw each grid cell
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const worldX = x * GAME_CONFIG.GRID_SIZE;
                const worldY = y * GAME_CONFIG.GRID_SIZE;

                if (this.pathfindingGrid[y][x] === 1) {
                    // Blocked cell - draw semi-transparent red
                    graphics.fillStyle(0xff0000, 0.3);
                    graphics.fillRect(worldX, worldY, GAME_CONFIG.GRID_SIZE, GAME_CONFIG.GRID_SIZE);
                }

                // Draw grid lines
                graphics.lineStyle(1, 0xffffff, 0.1);
                graphics.strokeRect(worldX, worldY, GAME_CONFIG.GRID_SIZE, GAME_CONFIG.GRID_SIZE);
            }
        }
    }

    drawPath() {
        this.pathGraphics.clear();

        if (!this.playerPath || this.playerPath.length === 0) {
            return;
        }

        // Draw the path as a series of lines
        this.pathGraphics.lineStyle(3, 0x00ff00, 0.5);

        // Start from player position
        this.pathGraphics.beginPath();
        this.pathGraphics.moveTo(this.player.x, this.player.y);

        // Draw lines to each waypoint
        for (let i = this.currentPathIndex; i < this.playerPath.length; i++) {
            const waypoint = this.playerPath[i];
            this.pathGraphics.lineTo(waypoint.x, waypoint.y);
        }

        this.pathGraphics.strokePath();

        // Draw circles at waypoints
        for (let i = this.currentPathIndex; i < this.playerPath.length; i++) {
            const waypoint = this.playerPath[i];

            // Current target is larger and different color
            if (i === this.currentPathIndex) {
                this.pathGraphics.fillStyle(0xffff00, 0.8);
                this.pathGraphics.fillCircle(waypoint.x, waypoint.y, 8);
            } else {
                this.pathGraphics.fillStyle(0x00ff00, 0.6);
                this.pathGraphics.fillCircle(waypoint.x, waypoint.y, 4);
            }
        }
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
     * Create pathfinding grid using EasyStar.js
     */
    createPathfindingGrid() {
        const gridWidth = Math.ceil(this.mapData.width / GAME_CONFIG.GRID_SIZE);
        const gridHeight = Math.ceil(this.mapData.height / GAME_CONFIG.GRID_SIZE);

        // Initialize grid with all walkable cells
        this.pathfindingGrid = [];
        for (let y = 0; y < gridHeight; y++) {
            this.pathfindingGrid[y] = [];
            for (let x = 0; x < gridWidth; x++) {
                this.pathfindingGrid[y][x] = 0; // 0 = walkable, 1 = blocked
            }
        }

        // Mark wall cells as blocked
        // IMPORTANT: Use the actual visual tile bounds, not the raw wall dimensions
        // Visual walls are created using 64x64 tiles in createMap(), so we must match that
        this.mapData.walls.forEach(wall => {
            // Calculate actual visual tile bounds (same logic as createMap)
            const tilesX = Math.ceil(wall.width / 64);
            const tilesY = Math.ceil(wall.height / 64);
            const actualWidth = tilesX * 64;
            const actualHeight = tilesY * 64;

            // Calculate which grid cells this wall overlaps using actual visual bounds
            const startX = Math.floor(wall.x / GAME_CONFIG.GRID_SIZE);
            const startY = Math.floor(wall.y / GAME_CONFIG.GRID_SIZE);
            const endX = Math.floor((wall.x + actualWidth - 1) / GAME_CONFIG.GRID_SIZE) + 1;
            const endY = Math.floor((wall.y + actualHeight - 1) / GAME_CONFIG.GRID_SIZE) + 1;

            for (let y = startY; y < endY && y < gridHeight; y++) {
                for (let x = startX; x < endX && x < gridWidth; x++) {
                    this.pathfindingGrid[y][x] = 1;
                }
            }
        });

        // Initialize EasyStar pathfinder
        this.easystar = new EasyStar.js();
        this.easystar.setGrid(this.pathfindingGrid);
        this.easystar.setAcceptableTiles([0]); // 0 is walkable
        this.easystar.enableDiagonals();
        this.easystar.disableCornerCutting(); // Prevent paths from cutting through wall corners
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

            // Create cast indicator for this enemy
            const castIndicator = this.add.graphics();
            castIndicator.lineStyle(3, 0xffff00, 1);
            castIndicator.strokeCircle(0, 0, 24);
            castIndicator.setVisible(false);
            enemy.castIndicator = castIndicator;
            this.castIndicators.add(castIndicator);
        });
    }

    /**
     * Pathfinding using EasyStar.js (async)
     */
    findPath(startX, startY, goalX, goalY, callback) {
        if (!this.easystar || !this.pathfindingGrid || this.pathfindingGrid.length === 0) {
            callback(null);
            return;
        }

        // Convert world coordinates to grid coordinates
        const startGridX = Math.floor(startX / GAME_CONFIG.GRID_SIZE);
        const startGridY = Math.floor(startY / GAME_CONFIG.GRID_SIZE);
        let goalGridX = Math.floor(goalX / GAME_CONFIG.GRID_SIZE);
        let goalGridY = Math.floor(goalY / GAME_CONFIG.GRID_SIZE);

        const gridHeight = this.pathfindingGrid.length;
        const gridWidth = this.pathfindingGrid[0].length;

        // Check if start is valid
        if (startGridX < 0 || startGridX >= gridWidth || startGridY < 0 || startGridY >= gridHeight) {
            callback(null);
            return;
        }

        // Check if goal is valid
        if (goalGridX < 0 || goalGridX >= gridWidth || goalGridY < 0 || goalGridY >= gridHeight) {
            callback(null);
            return;
        }

        // If goal is blocked, try to find nearest walkable cell
        if (this.pathfindingGrid[goalGridY][goalGridX] === 1) {
            let bestDist = Infinity;
            let bestX = goalGridX;
            let bestY = goalGridY;

            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const nx = goalGridX + dx;
                    const ny = goalGridY + dy;
                    if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                        if (this.pathfindingGrid[ny][nx] === 0) {
                            const dist = Math.abs(dx) + Math.abs(dy);
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestX = nx;
                                bestY = ny;
                            }
                        }
                    }
                }
            }

            if (bestDist === Infinity) {
                callback(null);
                return;
            }

            goalGridX = bestX;
            goalGridY = bestY;
        }

        // Use EasyStar to find path
        this.easystar.findPath(startGridX, startGridY, goalGridX, goalGridY, (path) => {
            if (path === null || path.length === 0) {
                callback(null);
                return;
            }

            // Smooth the path to remove unnecessary waypoints
            const smoothedPath = this.smoothPath(path);

            // Convert grid path to world coordinates
            const worldPath = smoothedPath.map(node => ({
                x: node.x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2,
                y: node.y * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2
            }));

            callback(worldPath);
        });

        // Calculate the path (EasyStar requires this to be called)
        this.easystar.calculate();
    }

    /**
     * Smooth a grid path by removing unnecessary waypoints
     * Uses line-of-sight checks to skip intermediate points
     */
    smoothPath(path) {
        if (!path || path.length <= 2) return path;

        const smoothed = [path[0]]; // Always keep start
        let current = 0;

        while (current < path.length - 1) {
            // Try to find the furthest point we can reach directly
            let furthest = current + 1;

            for (let i = path.length - 1; i > current + 1; i--) {
                if (this.hasLineOfSight(path[current], path[i])) {
                    furthest = i;
                    break;
                }
            }

            smoothed.push(path[furthest]);
            current = furthest;
        }

        return smoothed;
    }

    /**
     * Check if there's a clear line of sight between two grid points
     * Uses Bresenham's line algorithm to check all cells along the path
     */
    hasLineOfSight(from, to) {
        let x0 = from.x;
        let y0 = from.y;
        const x1 = to.x;
        const y1 = to.y;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            // Check if current cell is blocked
            if (y0 >= 0 && y0 < this.pathfindingGrid.length &&
                x0 >= 0 && x0 < this.pathfindingGrid[0].length) {
                if (this.pathfindingGrid[y0][x0] === 1) {
                    return false; // Hit a wall
                }
            } else {
                return false; // Out of bounds
            }

            // Reached destination
            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return true;
    }

    /**
     * Update: Main game loop
     */
    update(time, delta) {
        this.updatePlayerAutoWalk(time);
        this.updateEnemyAggro();
        this.updateEnemyDodging(time);
        this.updateEnemyMovement();
        this.updateEnemyShooting(time);
        this.updateTargeting();
        this.cleanupBullets();
        this.drawPath(); // Visual debugging
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

    /**
     * Auto-walk player to nearest enemy
     */
    updatePlayerAutoWalk(time) {
        if (!this.player.active) return;

        // Find nearest enemy
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        this.enemies.children.each(enemy => {
            if (enemy.active) {
                const distance = Phaser.Math.Distance.Between(
                    this.player.x, this.player.y,
                    enemy.x, enemy.y
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestEnemy = enemy;
                }
            }
        });

        if (!nearestEnemy) {
            this.player.setVelocity(0, 0);
            return;
        }

        // Stuck detection: Check if player has moved since last check (DISABLED - causing vibration)
        // if (time - this.stuckCheckTimer >= this.stuckCheckInterval) {
        //     const distanceMoved = Phaser.Math.Distance.Between(
        //         this.player.x, this.player.y,
        //         this.lastPlayerPosition.x, this.lastPlayerPosition.y
        //     );

        //     // If player hasn't moved much (threshold), force path recalculation
        //     if (distanceMoved < 30 && this.playerPath) {
        //         this.playerPath = null; // Force recalculation
        //     }

        //     // Update last position and timer
        //     this.lastPlayerPosition.x = this.player.x;
        //     this.lastPlayerPosition.y = this.player.y;
        //     this.stuckCheckTimer = time;
        // }

        // Check if we need a new path
        if (!this.playerPath || !this.playerDestination ||
            Phaser.Math.Distance.Between(
                this.playerDestination.x, this.playerDestination.y,
                nearestEnemy.x, nearestEnemy.y
            ) > GAME_CONFIG.PLAYER_ARRIVAL_THRESHOLD * 3) {

            // Set new destination and find path asynchronously
            this.playerDestination = { x: nearestEnemy.x, y: nearestEnemy.y };
            this.findPath(
                this.player.x, this.player.y,
                this.playerDestination.x, this.playerDestination.y,
                (path) => {
                    this.playerPath = path;
                    this.currentPathIndex = 0;
                }
            );
        }

        // Follow path
        if (this.playerPath && this.playerPath.length > 0) {
            const target = this.playerPath[this.currentPathIndex];
            const distance = Phaser.Math.Distance.Between(
                this.player.x, this.player.y,
                target.x, target.y
            );

            // Check if we've reached the current waypoint OR if we've passed it
            // (which can happen when moving diagonally or when blocked by walls)
            const shouldAdvanceWaypoint = distance < GAME_CONFIG.PLAYER_ARRIVAL_THRESHOLD;

            // Also check if there's a next waypoint and we're closer to it than the current one
            const skipCurrentWaypoint = this.currentPathIndex < this.playerPath.length - 1 &&
                (() => {
                    const nextTarget = this.playerPath[this.currentPathIndex + 1];
                    const distanceToNext = Phaser.Math.Distance.Between(
                        this.player.x, this.player.y,
                        nextTarget.x, nextTarget.y
                    );
                    // Skip if we're closer to the next waypoint (indicates we passed or went around current)
                    return distanceToNext < distance;
                })();

            if (shouldAdvanceWaypoint || skipCurrentWaypoint) {
                this.currentPathIndex++;
                if (this.currentPathIndex >= this.playerPath.length) {
                    // Reached end of path, recalculate
                    this.playerPath = null;
                }
            } else {
                // Move toward current waypoint
                const angle = Phaser.Math.Angle.Between(
                    this.player.x, this.player.y,
                    target.x, target.y
                );

                this.player.setVelocity(
                    Math.cos(angle) * GAME_CONFIG.PLAYER_AUTO_WALK_SPEED,
                    Math.sin(angle) * GAME_CONFIG.PLAYER_AUTO_WALK_SPEED
                );
            }
        } else {
            // No path yet, move directly toward enemy
            const angle = Phaser.Math.Angle.Between(
                this.player.x, this.player.y,
                nearestEnemy.x, nearestEnemy.y
            );

            this.player.setVelocity(
                Math.cos(angle) * GAME_CONFIG.PLAYER_AUTO_WALK_SPEED,
                Math.sin(angle) * GAME_CONFIG.PLAYER_AUTO_WALK_SPEED
            );
        }
    }

    /**
     * Update enemy aggro state based on player distance
     */
    updateEnemyAggro() {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active) {
                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    this.player.x, this.player.y
                );

                // Activate aggro if player is within range
                enemy.isAggro = distance <= GAME_CONFIG.ENEMY_AGGRO_RANGE;
            }
        });
    }

    updateEnemyDodging(time) {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active && enemy.isAggro) {
                // Check if dodge duration is over
                if (enemy.isDodging) {
                    if (time - enemy.dodgeStartTime >= GAME_CONFIG.ENEMY_DODGE_DURATION) {
                        enemy.isDodging = false;
                    }
                } else {
                    // Detect incoming bullets and dodge if possible
                    if (!enemy.isCasting) {
                        // Check for dangerous bullets
                        let shouldDodge = false;
                        let bulletAngle = 0;

                        this.bullets.children.each(bullet => {
                            if (bullet.active) {
                                const distance = Phaser.Math.Distance.Between(
                                    enemy.x, enemy.y,
                                    bullet.x, bullet.y
                                );

                                // Check if bullet is within detection range
                                if (distance < GAME_CONFIG.ENEMY_BULLET_DETECTION_RANGE) {
                                    // Calculate if bullet is heading toward enemy
                                    const bulletToEnemy = Phaser.Math.Angle.Between(
                                        bullet.x, bullet.y,
                                        enemy.x, enemy.y
                                    );
                                    const bulletDirection = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
                                    const angleDiff = Math.abs(Phaser.Math.Angle.Wrap(bulletToEnemy - bulletDirection));

                                    // If bullet is heading toward enemy (within 45 degrees)
                                    if (angleDiff < Math.PI / 4) {
                                        shouldDodge = true;
                                        bulletAngle = bulletDirection;
                                    }
                                }
                            }
                        });

                        if (shouldDodge) {
                            enemy.isDodging = true;
                            enemy.dodgeStartTime = time;

                            // Dodge perpendicular to bullet direction
                            const dodgeAngle = bulletAngle + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
                            enemy.dodgeTargetX = enemy.x + Math.cos(dodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
                            enemy.dodgeTargetY = enemy.y + Math.sin(dodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
                        }
                    }
                }
            }
        });
    }

    updateEnemyMovement() {
        this.enemies.children.each(enemy => {
            if (enemy.active) {
                // If dodging, move toward dodge target at high speed
                if (enemy.isDodging) {
                    const angle = Phaser.Math.Angle.Between(
                        enemy.x, enemy.y,
                        enemy.dodgeTargetX, enemy.dodgeTargetY
                    );

                    enemy.setVelocity(
                        Math.cos(angle) * GAME_CONFIG.ENEMY_DODGE_SPEED,
                        Math.sin(angle) * GAME_CONFIG.ENEMY_DODGE_SPEED
                    );
                } else if (enemy.isAggro && this.player.active) {
                    // Aggro: Chase player
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
                } else {
                    // Patrol behavior
                    const patrolTarget = enemy.patrolPoints[enemy.currentPatrolIndex];
                    const distance = Phaser.Math.Distance.Between(
                        enemy.x, enemy.y,
                        patrolTarget.x, patrolTarget.y
                    );

                    if (distance < 10) {
                        // Reached patrol point, move to next
                        enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length;
                    } else {
                        // Move toward patrol point
                        const angle = Phaser.Math.Angle.Between(
                            enemy.x, enemy.y,
                            patrolTarget.x, patrolTarget.y
                        );

                        enemy.setVelocity(
                            Math.cos(angle) * GAME_CONFIG.ENEMY_PATROL_SPEED,
                            Math.sin(angle) * GAME_CONFIG.ENEMY_PATROL_SPEED
                        );
                    }
                }
            }
        });
    }

    updateEnemyShooting(time) {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active && enemy.isAggro) {
                // Cancel cast if dodging
                if (enemy.isDodging && enemy.isCasting) {
                    enemy.isCasting = false;
                    enemy.castIndicator.setVisible(false);
                }

                // Don't shoot while dodging
                if (enemy.isDodging) return;

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

        // Disable input zones to prevent interactions during victory
        if (this.zoneAttack) {
            this.zoneAttack.disableInteractive();
        }
        if (this.zoneDodge) {
            this.zoneDodge.disableInteractive();
        }

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

        // Disable input zones to prevent interactions during game over
        if (this.zoneAttack) {
            this.zoneAttack.disableInteractive();
        }
        if (this.zoneDodge) {
            this.zoneDodge.disableInteractive();
        }

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
        if (this.zoneAttack) {
            this.zoneAttack.disableInteractive();
        }
        if (this.zoneDodge) {
            this.zoneDodge.disableInteractive();
        }

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
     * Create attack button (visible button overlay)
     */
    createAttackZone(width, height) {
        const buttonSize = 100;
        const buttonX = width - buttonSize - 20;
        const buttonY = height - buttonSize - 180; // Above dodge zone

        // Create button background
        const buttonBg = this.add.circle(buttonX, buttonY, buttonSize / 2, 0xff0000, 0.3)
            .setScrollFactor(0)
            .setInteractive();

        // Create button border
        const buttonBorder = this.add.graphics();
        buttonBorder.lineStyle(4, 0xff0000, 1);
        buttonBorder.strokeCircle(buttonX, buttonY, buttonSize / 2);
        buttonBorder.setScrollFactor(0);

        // Create button label
        const buttonLabel = this.add.text(buttonX, buttonY, 'FIRE', {
            fontSize: '24px',
            fill: '#fff',
            fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setScrollFactor(0);

        // Store references
        this.zoneAttack = buttonBg;
        this.attackButton = { bg: buttonBg, border: buttonBorder, label: buttonLabel };

        buttonBg.on('pointerdown', () => {
            // Visual feedback
            buttonBg.setAlpha(0.6);
        });

        buttonBg.on('pointerup', () => {
            buttonBg.setAlpha(0.3);
            if (!this.isSwipeGesture) {
                this.fireBullet();
            }
        });

        buttonBg.on('pointerout', () => {
            buttonBg.setAlpha(0.3);
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

        if (this.attackButton) {
            const buttonSize = 100;
            const buttonX = width - buttonSize - 20;
            const buttonY = height - buttonSize - 180;

            this.attackButton.bg.setPosition(buttonX, buttonY);
            this.attackButton.border.clear();
            this.attackButton.border.lineStyle(4, 0xff0000, 1);
            this.attackButton.border.strokeCircle(buttonX, buttonY, buttonSize / 2);
            this.attackButton.label.setPosition(buttonX, buttonY);
        }

        if (this.zoneDodge) {
            const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
            this.zoneDodge.setSize(width, zoneHeight)
                .setPosition(width / 2, height * GAME_CONFIG.DODGE_ZONE_Y);
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
