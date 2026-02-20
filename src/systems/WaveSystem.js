// ============================================================================
// WAVE SYSTEM — Enemy wave spawning and progression
// ============================================================================
import { SURVIVAL_CONFIG as CFG } from '../config/survivalConfig.js';

export class WaveSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentWave = 0;

        this.spawnQueue = [];
        this.spawnTimer = 0;
        this.isSpawning = false;

        this.waveCleared = false;
        this.isResting = false;
        this.restTimer = 0;
    }

    startNextWave() {
        this.currentWave++;
        this.isResting = false;
        this.waveCleared = false;

        const count = CFG.BASE_WAVE_ENEMIES + (this.currentWave - 1) * CFG.ENEMIES_PER_WAVE_INCREASE;
        const isBossWave = this.currentWave % 5 === 0;
        const speedMult = 1 + (this.currentWave - 1) * 0.08;

        this.spawnQueue = [];
        for (let i = 0; i < count; i++) {
            this.spawnQueue.push({ type: this._pickEnemyType(), speedMult });
        }
        if (isBossWave) {
            this.spawnQueue.push({ type: 'boss', speedMult: speedMult * 0.8 });
        }

        // Shuffle so enemy types are interleaved
        for (let i = this.spawnQueue.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
        }

        this.spawnTimer = 800; // short pause before first enemy spawns
        this.isSpawning = true;

        this.scene.waveText.setText(`WAVE ${this.currentWave}`);
        this._announce(
            isBossWave ? `⚠ BOSS WAVE ${this.currentWave}!` : `WAVE ${this.currentWave}`,
            isBossWave ? '#ff4400' : '#ffffff'
        );
    }

    update(time, delta) {
        // Waiting between waves
        if (this.isResting) {
            this.restTimer -= delta;
            if (this.restTimer <= 0) this.startNextWave();
            return;
        }

        // Spawning enemies
        if (this.isSpawning) {
            this.spawnTimer -= delta;
            if (this.spawnTimer <= 0) {
                if (this.spawnQueue.length > 0) {
                    const entry = this.spawnQueue.shift();
                    this.scene.marbleSystem.spawnEnemyMarble(entry.type, entry.speedMult);
                    this.spawnTimer = CFG.SPAWN_INTERVAL;
                } else {
                    this.isSpawning = false;
                }
            }
        }

        // Detect wave cleared (all enemies gone, spawning finished)
        if (!this.waveCleared && !this.isSpawning && this.scene.enemyMarbles.length === 0) {
            this.waveCleared = true;
            this.isResting = true;
            this.restTimer = CFG.WAVE_REST_DURATION;
            this._announce('WAVE CLEAR!', '#00ff88');
        }
    }

    // -------------------------------------------------------------------------
    // HELPERS
    // -------------------------------------------------------------------------

    _pickEnemyType() {
        const wave = this.currentWave;
        if (wave < 3) return 'normal';
        const r = Math.random();
        if (wave >= 7 && r < 0.15) return 'heavy';
        if (wave >= 4 && r < 0.30) return 'fast';
        return 'normal';
    }

    _announce(text, color) {
        const W = this.scene.scale.width;
        const H = this.scene.scale.height;
        const t = this.scene.add.text(W / 2, H * 0.38, text, {
            fontSize: '32px',
            color,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 5,
        }).setOrigin(0.5).setDepth(15).setAlpha(0);

        this.scene.tweens.add({
            targets: t,
            alpha: 1,
            duration: 250,
            hold: 1400,
            yoyo: true,
            onComplete: () => t.destroy(),
        });
    }
}
