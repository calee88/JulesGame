// ============================================================================
// SURVIVAL GAME SCENE
// "구슬왕 서바이벌" — Defend the base by shooting marbles at incoming waves
//
// Controls:
//   Touch/click anywhere outside the base → aim & fire a marble toward center
//   (Hold to see trajectory, release to fire)
// ============================================================================
import Phaser from 'phaser';
import { SURVIVAL_CONFIG as CFG } from '../config/survivalConfig.js';
import { MarbleSystem } from '../systems/MarbleSystem.js';
import { WaveSystem }   from '../systems/WaveSystem.js';
import { UpgradeSystem } from '../systems/UpgradeSystem.js';

export default class SurvivalGameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'survival-scene' });
    }

    // =========================================================================
    // CREATE
    // =========================================================================

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.cx = W / 2;
        this.cy = H / 2;

        // ---- Game state ----
        this.score = 0;
        this.xp = 0;
        this.level = 1;
        this.xpToNext = CFG.XP_TO_LEVEL[0];
        this.baseHealth = CFG.BASE_MAX_HEALTH;
        this.isGameOver = false;
        this.isLevelingUp = false;

        // Mutable upgrade state — systems read from here
        this.playerUpgrades = {
            marbleRadius: CFG.PLAYER_MARBLE_RADIUS,
            marbleSpeed:  CFG.PLAYER_MARBLE_SPEED,
            maxBounces:   CFG.PLAYER_MAX_BOUNCES,
            fireCooldown: CFG.FIRE_COOLDOWN,
            chainRadius:  0,
            multiShot:    1,
        };

        // Shared marble arrays (both scene and systems use these)
        this.playerMarbles = [];
        this.enemyMarbles  = [];

        // Firing state
        this.canFire  = true;
        this.isAiming = false;

        // ---- Build scene ----
        this._createBackground();
        this._createArena();
        this._createHUD();
        this.aimGfx = this.add.graphics().setDepth(6);

        // ---- Systems ----
        this.marbleSystem  = new MarbleSystem(this);
        this.waveSystem    = new WaveSystem(this);
        this.upgradeSystem = new UpgradeSystem(this);

        // ---- Input ----
        this.input.on('pointerdown', this._onPointerDown, this);
        this.input.on('pointermove', this._onPointerMove, this);
        this.input.on('pointerup',   this._onPointerUp,   this);

        // ---- Kick off the first wave ----
        this.waveSystem.startNextWave();
    }

    // =========================================================================
    // SCENE CONSTRUCTION
    // =========================================================================

    _createBackground() {
        const W = this.scale.width;
        const H = this.scale.height;

        // Deep-space fill
        this.add.rectangle(W / 2, H / 2, W, H, 0x07071a);

        // Subtle dot grid
        const gfx = this.add.graphics().setDepth(0);
        gfx.fillStyle(0x1a1a38, 1);
        for (let x = 0; x < W; x += 42) {
            for (let y = 0; y < H; y += 42) {
                gfx.fillCircle(x, y, 1);
            }
        }
    }

    _createArena() {
        const g = this.add.graphics().setDepth(1);
        const { cx, cy } = this;
        const r = CFG.ARENA_RADIUS;

        // Arena floor
        g.fillStyle(0x1a1a36, 1);
        g.fillCircle(cx, cy, r);

        // Spoke lines
        g.lineStyle(1, 0x282860, 0.45);
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            g.lineBetween(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }

        // Concentric rings
        g.lineStyle(1, 0x282860, 0.35);
        for (let ring = 80; ring < r; ring += 80) {
            g.strokeCircle(cx, cy, ring);
        }

        // Arena border — layered glow
        g.lineStyle(10, 0x1a3380, 0.25); g.strokeCircle(cx, cy, r);
        g.lineStyle(5,  0x3355cc, 0.70); g.strokeCircle(cx, cy, r);
        g.lineStyle(2,  0x88aaff, 1.00); g.strokeCircle(cx, cy, r);

        // --- Base (defended structure) ---
        this.baseGfx = this.add.graphics().setDepth(2);
        this._drawBase();
    }

    _drawBase() {
        const g  = this.baseGfx;
        const { cx, cy } = this;
        const br = CFG.BASE_RADIUS;
        g.clear();

        const healthFrac = this.baseHealth / CFG.BASE_MAX_HEALTH;
        const baseColor  = healthFrac > 0.5 ? 0x00ffaa : healthFrac > 0.25 ? 0xffaa00 : 0xff3300;

        // Outer glow
        g.fillStyle(baseColor, 0.06);
        g.fillCircle(cx, cy, br + 14);
        // Fill
        g.fillStyle(baseColor, 0.18);
        g.fillCircle(cx, cy, br);
        // Border
        g.lineStyle(3, baseColor, 0.9);
        g.strokeCircle(cx, cy, br);

        // Inner triangle
        const tr = br * 0.56;
        const pts = Array.from({ length: 3 }, (_, i) => {
            const a = -Math.PI / 2 + (i / 3) * Math.PI * 2;
            return { x: cx + Math.cos(a) * tr, y: cy + Math.sin(a) * tr };
        });
        g.lineStyle(2, baseColor, 0.80);
        g.strokeTriangle(pts[0].x, pts[0].y, pts[1].x, pts[1].y, pts[2].x, pts[2].y);
    }

    // =========================================================================
    // HUD
    // =========================================================================

    _createHUD() {
        const W = this.scale.width;
        const H = this.scale.height;
        const D = 10; // base depth for HUD elements

        // Wave counter (top-centre)
        this.waveText = this.add.text(W / 2, 16, 'WAVE 1', {
            fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(0.5, 0).setDepth(D);

        // Score (top-left)
        this.scoreText = this.add.text(12, 12, 'Score: 0', {
            fontSize: '18px', color: '#ffff44', fontFamily: 'Arial',
        }).setDepth(D);

        // Level (top-right)
        this.levelText = this.add.text(W - 12, 12, 'LV 1', {
            fontSize: '18px', color: '#44aaff', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(1, 0).setDepth(D);

        // XP bar (near bottom)
        const barW = 220;
        const barY = H - 46;
        this.add.rectangle(W / 2, barY, barW, 10, 0x1a1a44).setDepth(D);
        this.xpBarFill = this.add.rectangle(W / 2 - barW / 2, barY, 0, 10, 0x2266ff)
            .setOrigin(0, 0.5).setDepth(D);
        this.add.text(W / 2, barY - 14, 'XP', {
            fontSize: '11px', color: '#3355aa', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(D);

        // Health icons (bottom row)
        this.healthGfx = this.add.graphics().setDepth(D);
        this._redrawHealth();

        // "Fire ready" indicator (small dot near aim area)
        this.fireReadyDot = this.add.circle(W / 2, H - 24, 6, 0x00ffaa).setDepth(D);
    }

    _redrawHealth() {
        const g = this.healthGfx;
        g.clear();
        const W       = this.scale.width;
        const H       = this.scale.height;
        const total   = CFG.BASE_MAX_HEALTH;
        const spacing = 24;
        const startX  = W / 2 - ((total - 1) * spacing) / 2;
        const y       = H - 22;

        for (let i = 0; i < total; i++) {
            const filled = i < this.baseHealth;
            g.fillStyle(filled ? 0x00ffaa : 0x1f3a30, 1);
            g.fillCircle(startX + i * spacing, y, 8);
            if (filled) {
                g.fillStyle(0xffffff, 0.28);
                g.fillCircle(startX + i * spacing - 3, y - 3, 3);
            }
        }
    }

    // =========================================================================
    // INPUT
    // =========================================================================

    _onPointerDown(pointer) {
        if (this.isGameOver || this.isLevelingUp) return;
        if (!this.canFire) return;
        this.isAiming = true;
        this._drawAimLine(pointer.x, pointer.y);
    }

    _onPointerMove(pointer) {
        if (!this.isAiming) return;
        this._drawAimLine(pointer.x, pointer.y);
    }

    _onPointerUp(pointer) {
        if (!this.isAiming) return;
        this.isAiming = false;
        this.aimGfx.clear();
        if (!this.canFire || this.isGameOver || this.isLevelingUp) return;
        this._fireMarble(pointer.x, pointer.y);
    }

    // -------------------------------------------------------------------------

    _drawAimLine(px, py) {
        const g = this.aimGfx;
        g.clear();

        const dx = px - this.cx;
        const dy = py - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) return;

        const nx = dx / dist;
        const ny = dy / dist;

        const r    = this.playerUpgrades.marbleRadius;
        const sD   = CFG.BASE_RADIUS + r + 4;   // spawn distance from center
        const eD   = CFG.ARENA_RADIUS - r - 4;  // end at arena wall

        const sx = this.cx + nx * sD;
        const sy = this.cy + ny * sD;
        const ex = this.cx + nx * eD;
        const ey = this.cy + ny * eD;

        // Dashed trajectory line
        const totalLen = Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
        const ddx = (ex - sx) / totalLen;
        const ddy = (ey - sy) / totalLen;
        let drawn = 0;
        let dash  = true;
        g.lineStyle(2, 0xffff66, 0.80);
        while (drawn < totalLen) {
            const seg = Math.min(dash ? 14 : 8, totalLen - drawn);
            if (dash) {
                g.lineBetween(
                    sx + ddx * drawn,       sy + ddy * drawn,
                    sx + ddx * (drawn + seg), sy + ddy * (drawn + seg)
                );
            }
            drawn += seg;
            dash = !dash;
        }

        // Marble preview at spawn point
        g.fillStyle(CFG.PLAYER_MARBLE_COLOR, 0.55);
        g.fillCircle(sx, sy, r);
        g.lineStyle(1, CFG.PLAYER_MARBLE_STROKE, 0.8);
        g.strokeCircle(sx, sy, r);

        // Extra lines for multi-shot
        const multi  = this.playerUpgrades.multiShot ?? 1;
        const spread = 0.18;
        const sides  = Math.floor(multi / 2);
        for (let s = 1; s <= sides; s++) {
            for (const sign of [-1, 1]) {
                const ang = Math.atan2(ny, nx) + sign * spread * s;
                const snx = Math.cos(ang);
                const sny = Math.sin(ang);
                g.lineStyle(1, 0xffff66, 0.35);
                g.lineBetween(
                    this.cx + snx * sD, this.cy + sny * sD,
                    this.cx + snx * eD, this.cy + sny * eD
                );
            }
        }
    }

    _fireMarble(px, py) {
        const dx = px - this.cx;
        const dy = py - this.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 8) return;

        const nx  = dx / dist;
        const ny  = dy / dist;
        const upg = this.playerUpgrades;
        const sD  = CFG.BASE_RADIUS + upg.marbleRadius + 4;

        // Main marble
        this.marbleSystem.firePlayerMarble(
            this.cx + nx * sD, this.cy + ny * sD,
            nx * upg.marbleSpeed, ny * upg.marbleSpeed
        );

        // Multi-shot spread marbles
        const multi  = upg.multiShot ?? 1;
        const spread = 0.18;
        const sides  = Math.floor(multi / 2);
        for (let s = 1; s <= sides; s++) {
            for (const sign of [-1, 1]) {
                const ang = Math.atan2(ny, nx) + sign * spread * s;
                const snx = Math.cos(ang);
                const sny = Math.sin(ang);
                this.marbleSystem.firePlayerMarble(
                    this.cx + snx * sD, this.cy + sny * sD,
                    snx * upg.marbleSpeed, sny * upg.marbleSpeed
                );
            }
        }

        // Cooldown
        this.canFire = false;
        this.fireReadyDot.setFillStyle(0x334433);
        this.time.delayedCall(upg.fireCooldown, () => {
            if (!this.isGameOver) {
                this.canFire = true;
                this.fireReadyDot.setFillStyle(0x00ffaa);
            }
        });
    }

    // =========================================================================
    // GAME STATE MUTATIONS
    // =========================================================================

    gainXP(amount) {
        this.xp += amount;
        if (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level++;
            const idx = Math.min(this.level - 1, CFG.XP_TO_LEVEL.length - 1);
            this.xpToNext = CFG.XP_TO_LEVEL[idx];
            this.levelText.setText(`LV ${this.level}`);
            // Delay slightly so any in-flight enemy destruction settles first
            this.time.delayedCall(80, () => this.upgradeSystem.showLevelUp());
        }
    }

    damageBase(amount) {
        this.baseHealth = Math.max(0, this.baseHealth - amount);
        this._drawBase();
        this._redrawHealth();

        // Screen shake (mild)
        this.cameras.main.shake(160, 0.006);

        if (this.baseHealth <= 0) this._triggerGameOver();
    }

    // =========================================================================
    // GAME OVER
    // =========================================================================

    _triggerGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        this.canFire    = false;
        this.aimGfx.clear();

        // Freeze everything
        [...this.playerMarbles, ...this.enemyMarbles].forEach(m => {
            if (m?.active) m.body.setVelocity(0, 0);
        });

        const W = this.scale.width;
        const H = this.scale.height;

        // Fade-in overlay
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
            .setDepth(30);
        this.tweens.add({ targets: overlay, alpha: 0.78, duration: 400 });

        this.add.text(W / 2, H / 2 - 125, 'GAME OVER', {
            fontSize: '52px', color: '#ff2222', fontFamily: 'Arial', fontStyle: 'bold',
            stroke: '#000000', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 - 50, `Wave  ${this.waveSystem.currentWave}`, {
            fontSize: '26px', color: '#aaaaaa', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 + 5, `Score: ${this.score}`, {
            fontSize: '38px', color: '#ffff44', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(31);

        this.add.text(W / 2, H / 2 + 60, `Level ${this.level}`, {
            fontSize: '22px', color: '#44aaff', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(31);

        const restartBtn = this.add.text(W / 2, H / 2 + 148, 'TAP TO PLAY AGAIN', {
            fontSize: '24px', color: '#00ff88', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5).setDepth(31);
        this.tweens.add({ targets: restartBtn, alpha: 0.1, duration: 600, yoyo: true, repeat: -1 });

        const menuBtn = this.add.text(W / 2, H / 2 + 208, 'MAIN MENU', {
            fontSize: '18px', color: '#888888', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(31).setInteractive({ useHandCursor: true });
        menuBtn.on('pointerdown', () => this.scene.start('menu-scene'));

        // Tap anywhere (except menu btn) to restart
        this.input.once('pointerdown', (ptr) => {
            if (Phaser.Math.Distance.Between(ptr.x, ptr.y, menuBtn.x, menuBtn.y) < 70) return;
            this.scene.restart();
        });
    }

    // =========================================================================
    // HUD UPDATE
    // =========================================================================

    _updateHUD() {
        this.scoreText.setText(`Score: ${this.score}`);
        const xpPct = Math.min(this.xp / this.xpToNext, 1);
        this.xpBarFill.width = 220 * xpPct;
    }

    // =========================================================================
    // MAIN LOOP
    // =========================================================================

    update(time, delta) {
        if (this.isGameOver || this.isLevelingUp) return;
        this.marbleSystem.update(time, delta);
        this.waveSystem.update(time, delta);
        this._updateHUD();
    }
}
