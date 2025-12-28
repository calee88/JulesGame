import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * Enemy System
 * Handles enemy AI, movement, dodging, and shooting
 */
export default class EnemySystem {
    constructor(scene, enemies, player, bullets, enemyBullets) {
        this.scene = scene;
        this.enemies = enemies;
        this.player = player;
        this.bullets = bullets;
        this.enemyBullets = enemyBullets;
    }

    /**
     * Update enemy aggro state based on player distance
     */
    updateAggro() {
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

    /**
     * Update enemy dodging behavior
     */
    updateDodging(time) {
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
}
