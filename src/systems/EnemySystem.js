import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * Enemy System
 * Handles enemy AI, movement, dodging, and shooting
 */
export default class EnemySystem {
    constructor(scene, enemies, player, bullets, enemyBullets, pathfinding) {
        this.scene = scene;
        this.enemies = enemies;
        this.player = player;
        this.bullets = bullets;
        this.enemyBullets = enemyBullets;
        this.pathfinding = pathfinding;
    }

    /**
     * Update enemy aggro state based on player distance
     */
    updateAggro() {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active) {
                // Test mode enemies never aggro
                if (enemy.testMode) {
                    enemy.isAggro = false;
                    return;
                }

                const distance = Phaser.Math.Distance.Between(
                    enemy.x, enemy.y,
                    this.player.x, this.player.y
                );

                // Activate aggro if player is within range
                enemy.isAggro = distance <= GAME_CONFIG.ENEMY_AGGRO_RANGE;
            }
        });
    }

    /**
     * Update enemy dodging behavior
     */
    updateDodging(time) {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active) {
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

                            // Choose best dodge direction based on wall clearance and player position
                            const dodgeOffset = this.chooseDodgeDirection(enemy.x, enemy.y, bulletAngle);
                            const dodgeAngle = bulletAngle + dodgeOffset;
                            enemy.dodgeTargetX = enemy.x + Math.cos(dodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
                            enemy.dodgeTargetY = enemy.y + Math.sin(dodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
                        }
                    }
                }
            }
        });
    }

    /**
     * Update enemy movement (chase, patrol, dodge)
     */
    updateMovement() {
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
                } else if (enemy.isCasting) {
                    // Stop moving while casting
                    enemy.setVelocity(0, 0);
                } else if (enemy.isAggro && this.player.active) {
                    // Aggro: Chase player
                    const distance = Phaser.Math.Distance.Between(
                        enemy.x, enemy.y,
                        this.player.x, this.player.y
                    );

                    // Check if fire rate cooldown has passed
                    const canFire = (this.scene.time.now - enemy.lastFired) > GAME_CONFIG.ENEMY_FIRE_RATE;

                    // Use hysteresis to prevent oscillation at stopDistance boundary
                    // But only apply buffer while waiting for cooldown
                    if (enemy.isInShootingRange) {
                        // If cooldown ready but out of stopDistance, resume chasing immediately
                        if (canFire && distance > enemy.stopDistance) {
                            enemy.isInShootingRange = false;
                            const angle = Phaser.Math.Angle.Between(
                                enemy.x, enemy.y,
                                this.player.x, this.player.y
                            );
                            enemy.setVelocity(
                                Math.cos(angle) * GAME_CONFIG.ENEMY_SPEED,
                                Math.sin(angle) * GAME_CONFIG.ENEMY_SPEED
                            );
                        }
                        // If still in cooldown, use buffer to prevent oscillation
                        else if (distance > enemy.stopDistance + GAME_CONFIG.ENEMY_RESUME_BUFFER) {
                            enemy.isInShootingRange = false;
                            const angle = Phaser.Math.Angle.Between(
                                enemy.x, enemy.y,
                                this.player.x, this.player.y
                            );
                            enemy.setVelocity(
                                Math.cos(angle) * GAME_CONFIG.ENEMY_SPEED,
                                Math.sin(angle) * GAME_CONFIG.ENEMY_SPEED
                            );
                        } else {
                            // Stay stopped in shooting range
                            enemy.setVelocity(0, 0);
                        }
                    } else {
                        // Not in shooting range - chase until reaching stopDistance
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
                            // Reached shooting range
                            enemy.isInShootingRange = true;
                            enemy.setVelocity(0, 0);
                        }
                    }
                } else if (enemy.testMode) {
                    // Test mode: stay stationary (don't patrol)
                    enemy.setVelocity(0, 0);
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

    /**
     * Update enemy shooting behavior
     */
    updateShooting(time) {
        this.enemies.children.each(enemy => {
            if (enemy.active && this.player.active && enemy.isAggro) {
                // Cancel cast if dodging
                if (enemy.isDodging && enemy.isCasting) {
                    enemy.isCasting = false;
                    enemy.castIndicator.setVisible(false);
                }

                // Don't shoot while dodging
                if (enemy.isDodging) return;

                // If already casting, finish the cast regardless of distance
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
                    // Only start casting when within stop distance
                    const distance = Phaser.Math.Distance.Between(
                        enemy.x, enemy.y,
                        this.player.x, this.player.y
                    );

                    if (distance <= enemy.stopDistance) {
                        // Start casting if ready to fire
                        if (time - enemy.lastFired > GAME_CONFIG.ENEMY_FIRE_RATE) {
                            enemy.isCasting = true;
                            enemy.castStartTime = time;
                            enemy.castIndicator.setPosition(enemy.x, enemy.y);
                            enemy.castIndicator.setVisible(true);
                        }
                    }
                }
            }
        });
    }

    /**
     * Choose dodge direction based on wall clearance and bullet avoidance
     * Returns angle offset: Math.PI/2 (left) or -Math.PI/2 (right) relative to bullet direction
     * Picks the direction with more clearance and better bullet avoidance
     */
    chooseDodgeDirection(enemyX, enemyY, bulletAngle) {
        // The two perpendicular directions relative to bullet
        const leftDodgeAngle = bulletAngle + Math.PI / 2;
        const rightDodgeAngle = bulletAngle - Math.PI / 2;

        // Sample points along each dodge direction to check clearance
        const sampleCount = 8; // Check 8 points in each direction
        const sampleDistance = GAME_CONFIG.ENEMY_DODGE_DISTANCE / sampleCount;

        let leftClearCount = 0;
        let rightClearCount = 0;

        // Check left dodge direction
        for (let i = 1; i <= sampleCount; i++) {
            const x = enemyX + Math.cos(leftDodgeAngle) * (sampleDistance * i);
            const y = enemyY + Math.sin(leftDodgeAngle) * (sampleDistance * i);

            if (this.pathfinding.isPointBlocked(x, y)) {
                break; // Stop counting when we hit a wall
            }
            leftClearCount++;
        }

        // Check right dodge direction
        for (let i = 1; i <= sampleCount; i++) {
            const x = enemyX + Math.cos(rightDodgeAngle) * (sampleDistance * i);
            const y = enemyY + Math.sin(rightDodgeAngle) * (sampleDistance * i);

            if (this.pathfinding.isPointBlocked(x, y)) {
                break; // Stop counting when we hit a wall
            }
            rightClearCount++;
        }

        // If both directions are blocked, try to dodge backwards (opposite of bullet)
        if (leftClearCount === 0 && rightClearCount === 0) {
            const backwardAngle = bulletAngle + Math.PI; // 180 degrees from bullet
            const backwardX = enemyX + Math.cos(backwardAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
            const backwardY = enemyY + Math.sin(backwardAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;

            // If backward is clear, use it (return as left offset for implementation simplicity)
            if (!this.pathfinding.isPointBlocked(backwardX, backwardY)) {
                return Math.PI; // Dodge backward
            }

            // Last resort: stay put (dodge in place with minimal movement)
            return 0;
        }

        // If both directions are equally clear, prefer the one that moves away from player
        // (to create more distance and dodging space)
        if (leftClearCount === rightClearCount && this.player.active) {
            const angleToPlayer = Phaser.Math.Angle.Between(
                enemyX, enemyY,
                this.player.x, this.player.y
            );

            const leftTargetX = enemyX + Math.cos(leftDodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
            const leftTargetY = enemyY + Math.sin(leftDodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
            const rightTargetX = enemyX + Math.cos(rightDodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;
            const rightTargetY = enemyY + Math.sin(rightDodgeAngle) * GAME_CONFIG.ENEMY_DODGE_DISTANCE;

            const leftDistToPlayer = Phaser.Math.Distance.Between(leftTargetX, leftTargetY, this.player.x, this.player.y);
            const rightDistToPlayer = Phaser.Math.Distance.Between(rightTargetX, rightTargetY, this.player.x, this.player.y);

            // Choose direction that increases distance from player
            return leftDistToPlayer > rightDistToPlayer ? Math.PI / 2 : -Math.PI / 2;
        }

        // Choose direction with more clearance
        return leftClearCount > rightClearCount ? Math.PI / 2 : -Math.PI / 2;
    }
}
