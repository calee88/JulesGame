import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * Player System
 * Handles player movement, auto-walk, and orbital mechanics
 */
export default class PlayerSystem {
    constructor(scene, player, pathfinding) {
        this.scene = scene;
        this.player = player;
        this.pathfinding = pathfinding;

        // Auto-walk System
        this.playerDestination = null;
        this.playerPath = null;
        this.currentPathIndex = 0;
        this.pathGraphics = null;

        // Orbital Movement System
        this.isOrbiting = false;
        this.orbitalDirection = 1; // 1 for clockwise, -1 for counterclockwise
        this.wasOrbitalBlocked = false; // Track wall contact state for edge detection

        // Debug
        this.debugGraphics = null;
        this.debugDistanceText = null;
        this.debugLogCounter = 0;

        this.setupPathVisualization();
    }

    setupPathVisualization() {
        // Create graphics object for path visualization
        this.pathGraphics = this.scene.add.graphics();
        this.pathGraphics.setDepth(100); // Draw on top of most things
    }

    setupDebugVisualization(graphics, distanceText) {
        this.debugGraphics = graphics;
        this.debugDistanceText = distanceText;
    }

    /**
     * Auto-walk player to nearest enemy with orbital movement
     */
    update(time, delta, enemies) {
        if (!this.player.active) return;

        // Find nearest enemy
        let nearestEnemy = null;
        let nearestDistance = Infinity;

        enemies.children.each(enemy => {
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
            this.isOrbiting = false;
            return;
        }

        // Check if we should orbit or approach
        // Use hysteresis to prevent oscillation at orbital boundary
        const isDebugMap = this.scene.mapData.walls.length === 0;
        const orbitExitDistance = GAME_CONFIG.PLAYER_ORBITAL_RANGE + GAME_CONFIG.PLAYER_ORBITAL_EXIT_BUFFER;

        // Enter orbit at ORBITAL_RANGE, exit only when beyond ORBITAL_RANGE + buffer
        const shouldOrbit = nearestDistance <= GAME_CONFIG.PLAYER_ORBITAL_RANGE ||
                           (this.isOrbiting && nearestDistance <= orbitExitDistance);

        if (shouldOrbit) {
            this.updateOrbitalMovement(nearestEnemy, isDebugMap);
        } else {
            this.updateApproachMovement(nearestEnemy);
        }
    }

    /**
     * Update orbital movement around enemy
     */
    updateOrbitalMovement(enemy, isDebugMap) {
        // Enter orbital mode
        if (!this.isOrbiting) {
            this.isOrbiting = true;
            // If no walls (debug map), use fixed direction; otherwise choose based on clearance
            if (isDebugMap) {
                this.orbitalDirection = 1; // Fixed counterclockwise for debug
            } else {
                // Choose direction with more clearance (longer to hit wall)
                this.orbitalDirection = this.chooseOrbitalDirection(
                    this.player.x, this.player.y,
                    enemy.x, enemy.y
                );
            }
        }

        // Calculate current distance to enemy
        const currentDistance = Phaser.Math.Distance.Between(
            this.player.x, this.player.y,
            enemy.x, enemy.y
        );

        // Current angle from enemy to player (based on actual position)
        const currentAngle = Phaser.Math.Angle.Between(
            enemy.x, enemy.y,
            this.player.x, this.player.y
        );

        // Tangential direction (perpendicular to radial, based on orbital direction)
        const tangentAngle = currentAngle + (this.orbitalDirection * Math.PI / 2);

        // Calculate tangential velocity components
        const tangentVelX = Math.cos(tangentAngle) * GAME_CONFIG.PLAYER_ORBITAL_SPEED;
        const tangentVelY = Math.sin(tangentAngle) * GAME_CONFIG.PLAYER_ORBITAL_SPEED;

        // Check if the wall is blocking our tangential movement direction
        // Only reverse if the wall blocks the direction we're trying to orbit
        const blocked = this.player.body.blocked;
        const movingLeft = tangentVelX < -10;
        const movingRight = tangentVelX > 10;
        const movingUp = tangentVelY < -10;
        const movingDown = tangentVelY > 10;

        const tangentBlocked = (movingLeft && blocked.left) ||
                               (movingRight && blocked.right) ||
                               (movingUp && blocked.up) ||
                               (movingDown && blocked.down);

        // Only reverse direction when tangential movement is blocked (edge detection)
        if (tangentBlocked && !this.wasOrbitalBlocked) {
            this.orbitalDirection *= -1;
            console.log('>>> WALL BLOCKED ORBIT! Reversed to', this.orbitalDirection);
        }
        this.wasOrbitalBlocked = tangentBlocked;

        // Radial correction: push outward if too close, inward if too far
        // This provides the centripetal acceleration needed for circular motion
        const distanceError = GAME_CONFIG.PLAYER_ORBITAL_RANGE - currentDistance;
        const radialSpeed = distanceError * 2; // Proportional correction
        const radialVelX = Math.cos(currentAngle) * radialSpeed;
        const radialVelY = Math.sin(currentAngle) * radialSpeed;

        // Recalculate tangent velocity with potentially reversed direction
        const newTangentAngle = currentAngle + (this.orbitalDirection * Math.PI / 2);
        const newTangentVelX = Math.cos(newTangentAngle) * GAME_CONFIG.PLAYER_ORBITAL_SPEED;
        const newTangentVelY = Math.sin(newTangentAngle) * GAME_CONFIG.PLAYER_ORBITAL_SPEED;

        this.player.setVelocity(
            newTangentVelX + radialVelX,
            newTangentVelY + radialVelY
        );

        // Debug visualization
        if (this.debugGraphics && isDebugMap) {
            this.debugGraphics.clear();
            // Draw line from player to enemy
            this.debugGraphics.lineStyle(2, 0x00ff00, 1);
            this.debugGraphics.beginPath();
            this.debugGraphics.moveTo(this.player.x, this.player.y);
            this.debugGraphics.lineTo(enemy.x, enemy.y);
            this.debugGraphics.strokePath();

            // Draw orbital range circle around enemy
            this.debugGraphics.lineStyle(1, 0xffff00, 0.5);
            this.debugGraphics.strokeCircle(enemy.x, enemy.y, GAME_CONFIG.PLAYER_ORBITAL_RANGE);

            // Update distance text
            this.debugDistanceText.setText(`Distance: ${currentDistance.toFixed(1)}`);

            // Log to console periodically (every 60 frames ~ 1 second)
            this.debugLogCounter++;
            if (this.debugLogCounter >= 60) {
                console.log(`Orbital Distance: ${currentDistance.toFixed(1)} | Target: ${GAME_CONFIG.PLAYER_ORBITAL_RANGE}`);
                this.debugLogCounter = 0;
            }
        }

        // Clear any pathfinding data
        this.playerPath = null;
        this.playerDestination = null;
    }

    /**
     * Update approach movement toward enemy
     */
    updateApproachMovement(enemy) {
        // Exit orbital mode and approach enemy
        this.isOrbiting = false;

        // Use pathfinding to approach enemy
        // Check if we need a new path
        if (!this.playerPath || !this.playerDestination ||
            Phaser.Math.Distance.Between(
                this.playerDestination.x, this.playerDestination.y,
                enemy.x, enemy.y
            ) > GAME_CONFIG.PLAYER_ARRIVAL_THRESHOLD * 3) {

            // Set new destination and find path asynchronously
            this.playerDestination = { x: enemy.x, y: enemy.y };
            this.pathfinding.findPath(
                this.player.x, this.player.y,
                this.playerDestination.x, this.playerDestination.y,
                (path) => {
                    this.playerPath = path;
                    // Skip first waypoint - it's the grid cell center where we started,
                    // and the player has likely moved past it by now (async callback)
                    this.currentPathIndex = (path && path.length > 1) ? 1 : 0;
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
            // BUT only skip if we have line-of-sight to prevent skipping through walls
            const skipCurrentWaypoint = this.currentPathIndex < this.playerPath.length - 1 &&
                (() => {
                    const nextTarget = this.playerPath[this.currentPathIndex + 1];
                    const distanceToNext = Phaser.Math.Distance.Between(
                        this.player.x, this.player.y,
                        nextTarget.x, nextTarget.y
                    );
                    // Only skip if closer AND we have clear line-of-sight to next waypoint
                    if (distanceToNext < distance) {
                        const playerGridX = Math.floor(this.player.x / GAME_CONFIG.GRID_SIZE);
                        const playerGridY = Math.floor(this.player.y / GAME_CONFIG.GRID_SIZE);
                        const nextGridX = Math.floor(nextTarget.x / GAME_CONFIG.GRID_SIZE);
                        const nextGridY = Math.floor(nextTarget.y / GAME_CONFIG.GRID_SIZE);
                        return this.pathfinding.hasLineOfSight(
                            { x: playerGridX, y: playerGridY },
                            { x: nextGridX, y: nextGridY }
                        );
                    }
                    return false;
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
                enemy.x, enemy.y
            );

            this.player.setVelocity(
                Math.cos(angle) * GAME_CONFIG.PLAYER_AUTO_WALK_SPEED,
                Math.sin(angle) * GAME_CONFIG.PLAYER_AUTO_WALK_SPEED
            );
        }
    }

    /**
     * Choose orbital direction based on wall detection
     * Returns 1 for clockwise, -1 for counterclockwise
     * Picks the direction with more clearance (longer to hit wall)
     */
    chooseOrbitalDirection(playerX, playerY, targetX, targetY) {
        // Calculate current angle from target to player
        const currentAngle = Phaser.Math.Angle.Between(targetX, targetY, playerX, playerY);

        // Sample points along the orbital path to see how far we can go in each direction
        const sampleCount = 16; // Check 16 points (half circle in each direction)
        const angleStep = Math.PI / sampleCount; // Small angular steps

        let clockwiseClearCount = 0;
        let counterclockwiseClearCount = 0;

        // Check clockwise direction (negative angle)
        for (let i = 1; i <= sampleCount; i++) {
            const angle = currentAngle - (angleStep * i);
            const x = targetX + Math.cos(angle) * GAME_CONFIG.PLAYER_ORBITAL_RANGE;
            const y = targetY + Math.sin(angle) * GAME_CONFIG.PLAYER_ORBITAL_RANGE;

            if (this.pathfinding.isPointBlocked(x, y)) {
                break; // Stop counting when we hit a wall
            }
            clockwiseClearCount++;
        }

        // Check counterclockwise direction (positive angle)
        for (let i = 1; i <= sampleCount; i++) {
            const angle = currentAngle + (angleStep * i);
            const x = targetX + Math.cos(angle) * GAME_CONFIG.PLAYER_ORBITAL_RANGE;
            const y = targetY + Math.sin(angle) * GAME_CONFIG.PLAYER_ORBITAL_RANGE;

            if (this.pathfinding.isPointBlocked(x, y)) {
                break; // Stop counting when we hit a wall
            }
            counterclockwiseClearCount++;
        }

        // If both directions are equally clear, choose randomly
        if (clockwiseClearCount === counterclockwiseClearCount) {
            return Math.random() < 0.5 ? 1 : -1;
        }

        // Choose direction with more clearance (longer to hit wall)
        // Clockwise = -1, Counterclockwise = 1
        return clockwiseClearCount > counterclockwiseClearCount ? -1 : 1;
    }

    /**
     * Draw the path for debugging
     */
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
}
