// ============================================================================
// MARBLE SYSTEM — Physics, spawning, collisions, particles
// ============================================================================
import { SURVIVAL_CONFIG as CFG } from '../config/survivalConfig.js';

export class MarbleSystem {
    constructor(scene) {
        this.scene = scene;
        this.cx = scene.cx;
        this.cy = scene.cy;
        this.arenaBounds = scene.arenaBounds;

        // References to scene's shared marble arrays
        this.playerMarbles = scene.playerMarbles;
        this.enemyMarbles = scene.enemyMarbles;

        // Simple particle system (no external dependency)
        this.particleGfx = scene.add.graphics().setDepth(5);
        this.particles = [];

        // Pre-generate all marble textures
        this._generateAllTextures();
    }

    // -------------------------------------------------------------------------
    // TEXTURE GENERATION
    // -------------------------------------------------------------------------

    _generateAllTextures() {
        this._generateMarbleTexture(
            'marble_player',
            CFG.PLAYER_MARBLE_RADIUS,
            CFG.PLAYER_MARBLE_COLOR,
            CFG.PLAYER_MARBLE_STROKE
        );
        for (const [type, props] of Object.entries(CFG.MARBLE_TYPES)) {
            this._generateMarbleTexture(`marble_${type}`, props.radius, props.color, props.stroke);
        }
    }

    _generateMarbleTexture(key, radius, fillColor, strokeColor) {
        if (this.scene.textures.exists(key)) return;
        const size = radius * 2;
        const r = radius;
        const gfx = this.scene.make.graphics({ x: 0, y: 0, add: false });

        // Body
        gfx.fillStyle(fillColor, 1);
        gfx.fillCircle(r, r, r - 1);

        // Shiny highlight
        gfx.fillStyle(0xffffff, 0.38);
        gfx.fillCircle(r - Math.floor(r * 0.28), r - Math.floor(r * 0.28), Math.floor(r * 0.32));

        // Border
        gfx.lineStyle(2, strokeColor, 1);
        gfx.strokeCircle(r, r, r - 1);

        gfx.generateTexture(key, size, size);
        gfx.destroy();
    }

    // Generate a sized variant for the player marble when radius changes
    _playerTextureKey(radius) {
        const key = `marble_player_r${radius}`;
        this._generateMarbleTexture(key, radius, CFG.PLAYER_MARBLE_COLOR, CFG.PLAYER_MARBLE_STROKE);
        return key;
    }

    // -------------------------------------------------------------------------
    // FIRING & SPAWNING
    // -------------------------------------------------------------------------

    firePlayerMarble(fromX, fromY, velX, velY) {
        const scene = this.scene;
        const r = scene.playerUpgrades.marbleRadius;
        const texKey = this._playerTextureKey(r);

        const marble = scene.physics.add.image(fromX, fromY, texKey);
        marble.body.setCircle(r);
        marble.body.setVelocity(velX, velY);
        marble.setDepth(4);

        marble.marbleRadius = r;
        marble.bouncesLeft = scene.playerUpgrades.maxBounces;
        marble.isPlayer = true;
        marble.marbleType = 'player';

        this.playerMarbles.push(marble);
        return marble;
    }

    spawnEnemyMarble(type, speedMult = 1) {
        const scene = this.scene;
        const props = CFG.MARBLE_TYPES[type];
        if (!props) return null;

        // Spawn from a random point on one of the four arena walls
        const { left, right, top, bottom } = this.arenaBounds;
        const r = props.radius;
        let x, y;
        const edge = Math.floor(Math.random() * 4);
        switch (edge) {
            case 0: x = left  + r + Math.random() * (right - left - r * 2); y = top    + r; break;
            case 1: x = left  + r + Math.random() * (right - left - r * 2); y = bottom - r; break;
            case 2: x = left  + r; y = top + r + Math.random() * (bottom - top - r * 2); break;
            default:x = right - r; y = top + r + Math.random() * (bottom - top - r * 2); break;
        }

        // Head toward center with a small random spread
        const angle = Math.atan2(this.cy - y, this.cx - x) + (Math.random() - 0.5) * 0.4;
        const speed = props.speed * speedMult;

        const marble = scene.physics.add.image(x, y, `marble_${type}`);
        marble.body.setCircle(props.radius);
        marble.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        marble.setDepth(3);

        marble.marbleRadius = props.radius;
        marble.marbleType = type;
        marble.hp = props.hp;
        marble.maxHp = props.hp;
        marble.speed = speed;
        marble.xpValue = props.xp;
        marble.damageValue = props.damage;
        marble.isPlayer = false;

        this.enemyMarbles.push(marble);
        return marble;
    }

    // -------------------------------------------------------------------------
    // UPDATE (called every frame)
    // -------------------------------------------------------------------------

    update(time, delta) {
        const dt = delta / 1000;

        // -- Player marbles --
        for (let i = this.playerMarbles.length - 1; i >= 0; i--) {
            const pm = this.playerMarbles[i];
            if (!pm?.active) { this.playerMarbles.splice(i, 1); continue; }

            if (this._bounceOffArena(pm, true)) {
                pm.bouncesLeft--;
                this._spawnParticles(pm.x, pm.y, CFG.PLAYER_MARBLE_COLOR, 5);
                if (pm.bouncesLeft <= 0) {
                    this._destroyPlayerMarble(pm, i);
                    continue;
                }
            }

            // Check against all enemies (iterate backward so splicing is safe)
            for (let j = this.enemyMarbles.length - 1; j >= 0; j--) {
                const em = this.enemyMarbles[j];
                if (!em?.active) continue;
                if (this._resolveCircleCollision(pm, pm.marbleRadius, em, em.marbleRadius)) {
                    this._onPlayerHitsEnemy(pm, em, j);
                }
            }
        }

        // -- Enemy marbles --
        for (let i = this.enemyMarbles.length - 1; i >= 0; i--) {
            const em = this.enemyMarbles[i];
            if (!em?.active) { this.enemyMarbles.splice(i, 1); continue; }

            this._bounceOffArena(em, false);
            this._steerToCenter(em, dt);

            const distToCenter = Phaser.Math.Distance.Between(em.x, em.y, this.cx, this.cy);
            if (distToCenter < CFG.BASE_RADIUS + em.marbleRadius) {
                this._onEnemyReachesBase(em, i);
            }
        }

        // -- Enemy-enemy soft separation --
        const ec = this.enemyMarbles.length;
        for (let i = 0; i < ec; i++) {
            for (let j = i + 1; j < ec; j++) {
                const a = this.enemyMarbles[i];
                const b = this.enemyMarbles[j];
                if (!a?.active || !b?.active) continue;
                this._resolveCircleCollision(a, a.marbleRadius, b, b.marbleRadius);
            }
        }

        this._updateParticles(dt);
    }

    // -------------------------------------------------------------------------
    // PHYSICS HELPERS
    // -------------------------------------------------------------------------

    /** Returns true if the marble bounced off the arena boundary. */
    _bounceOffArena(marble, isPlayer) {
        const { left, right, top, bottom } = this.arenaBounds;
        const r = marble.marbleRadius;
        const restitution = isPlayer ? 0.95 : 0.82;
        let bounced = false;

        if (marble.x < left + r) {
            marble.x = left + r;
            marble.body.setVelocityX(Math.abs(marble.body.velocity.x) * restitution);
            bounced = true;
        } else if (marble.x > right - r) {
            marble.x = right - r;
            marble.body.setVelocityX(-Math.abs(marble.body.velocity.x) * restitution);
            bounced = true;
        }

        if (marble.y < top + r) {
            marble.y = top + r;
            marble.body.setVelocityY(Math.abs(marble.body.velocity.y) * restitution);
            bounced = true;
        } else if (marble.y > bottom - r) {
            marble.y = bottom - r;
            marble.body.setVelocityY(-Math.abs(marble.body.velocity.y) * restitution);
            bounced = true;
        }

        return bounced;
    }

    /** Gently pulls enemy marbles toward the base. */
    _steerToCenter(marble, dt) {
        const dx = this.cx - marble.x;
        const dy = this.cy - marble.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) return;

        const nx = dx / dist;
        const ny = dy / dist;
        const accel = 65;

        let vx = marble.body.velocity.x + nx * accel * dt;
        let vy = marble.body.velocity.y + ny * accel * dt;

        // Clamp speed so marbles don't accelerate forever
        const speed = Math.sqrt(vx * vx + vy * vy);
        const maxSpeed = marble.speed * 1.6;
        if (speed > maxSpeed) {
            vx = (vx / speed) * maxSpeed;
            vy = (vy / speed) * maxSpeed;
        }
        marble.body.setVelocity(vx, vy);
    }

    /**
     * Elastic circle-circle collision.
     * Returns true if a collision occurred and was resolved.
     */
    _resolveCircleCollision(a, ra, b, rb) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = ra + rb;
        if (distSq >= minDist * minDist || distSq === 0) return false;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate overlapping bodies
        const overlap = (minDist - dist) * 0.5;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        // Exchange velocity components along collision normal (equal mass)
        const avx = a.body.velocity.x;
        const avy = a.body.velocity.y;
        const bvx = b.body.velocity.x;
        const bvy = b.body.velocity.y;

        const dotA = avx * nx + avy * ny;
        const dotB = bvx * nx + bvy * ny;
        const diff = dotB - dotA;

        a.body.setVelocity(avx + diff * nx, avy + diff * ny);
        b.body.setVelocity(bvx - diff * nx, bvy - diff * ny);

        return true;
    }

    // -------------------------------------------------------------------------
    // COLLISION OUTCOMES
    // -------------------------------------------------------------------------

    _onPlayerHitsEnemy(pm, em, emIdx) {
        const scene = this.scene;

        // Flash white on hit
        scene.tweens.add({ targets: em, alpha: 0.25, duration: 75, yoyo: true });

        em.hp -= 1;
        if (em.hp > 0) return;

        // Enemy destroyed
        scene.score += em.xpValue;
        scene.gainXP(em.xpValue);
        this._spawnParticles(em.x, em.y, CFG.MARBLE_TYPES[em.marbleType]?.color ?? 0xff0000, 14);

        // Chain-reaction upgrade
        if (scene.playerUpgrades.chainRadius > 0) {
            this._applyChainReaction(em.x, em.y, scene.playerUpgrades.chainRadius);
        }

        em.destroy();
        this.enemyMarbles.splice(emIdx, 1);
    }

    _applyChainReaction(x, y, radius) {
        const scene = this.scene;

        // Visual ring
        const g = scene.add.graphics().setDepth(5);
        g.lineStyle(3, 0xff8800, 0.9);
        g.strokeCircle(x, y, radius);
        scene.tweens.add({ targets: g, alpha: 0, duration: 350, onComplete: () => g.destroy() });

        for (let i = this.enemyMarbles.length - 1; i >= 0; i--) {
            const em = this.enemyMarbles[i];
            if (!em?.active) continue;
            if (Phaser.Math.Distance.Between(x, y, em.x, em.y) < radius) {
                em.hp -= 2;
                this._spawnParticles(em.x, em.y, 0xff8800, 6);
                if (em.hp <= 0) {
                    scene.score += em.xpValue;
                    scene.gainXP(em.xpValue);
                    em.destroy();
                    this.enemyMarbles.splice(i, 1);
                }
            }
        }
    }

    _onEnemyReachesBase(em, emIdx) {
        this.scene.damageBase(em.damageValue);
        this._spawnParticles(em.x, em.y, 0xff3300, 10);
        em.destroy();
        this.enemyMarbles.splice(emIdx, 1);
    }

    _destroyPlayerMarble(marble, idx) {
        this._spawnParticles(marble.x, marble.y, CFG.PLAYER_MARBLE_COLOR, 8);
        marble.destroy();
        this.playerMarbles.splice(idx, 1);
    }

    // -------------------------------------------------------------------------
    // PARTICLES
    // -------------------------------------------------------------------------

    _spawnParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 60 + Math.random() * 150;
            const life = 0.3 + Math.random() * 0.3;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 2 + Math.random() * 3,
                color,
                alpha: 1,
                life,
                maxLife: life,
            });
        }
    }

    _updateParticles(dt) {
        const g = this.particleGfx;
        g.clear();
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.95;
            p.vy *= 0.95;
            p.life -= dt;
            if (p.life <= 0) { this.particles.splice(i, 1); continue; }
            p.alpha = p.life / p.maxLife;
            g.fillStyle(p.color, Math.max(0, p.alpha));
            g.fillCircle(p.x, p.y, p.r);
        }
    }
}
