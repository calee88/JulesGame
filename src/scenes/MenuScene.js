import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';

// ============================================================================
// MENU SCENE
// ============================================================================
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('menu-scene');
    }

    create() {
        const { width, height } = this.scale;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x07071a);

        // Dot grid background
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a38, 1);
        for (let x = 0; x < width; x += 42) {
            for (let y = 0; y < height; y += 42) {
                bg.fillCircle(x, y, 1);
            }
        }

        // Title
        this.add.text(width / 2, height * 0.10, '구슬왕', {
            fontSize: '56px', fill: '#00ffaa', fontFamily: 'Arial', fontStyle: 'bold',
            stroke: '#005533', strokeThickness: 4,
        }).setOrigin(0.5);

        this.add.text(width / 2, height * 0.10 + 60, 'MARBLE KING', {
            fontSize: '20px', fill: '#44aaff', fontFamily: 'Arial', fontStyle: 'bold',
            letterSpacing: 6,
        }).setOrigin(0.5);

        // ── SURVIVAL MODE (featured button) ──────────────────────────────────
        const survY = height * 0.30;

        // Glow ring
        const glowGfx = this.add.graphics();
        glowGfx.lineStyle(8, 0x00ffaa, 0.18);
        glowGfx.strokeRoundedRect(width / 2 - 215, survY - 40, 430, 80, 12);

        const survBtn = this.add.rectangle(width / 2, survY, 420, 70, 0x005533)
            .setInteractive({ useHandCursor: true })
            .on('pointerover', () => survBtn.setFillStyle(0x008855))
            .on('pointerout',  () => survBtn.setFillStyle(0x005533))
            .on('pointerdown', () => this.scene.start('survival-scene'));

        // Border
        const survBorder = this.add.graphics();
        survBorder.lineStyle(2, 0x00ffaa, 0.9);
        survBorder.strokeRoundedRect(width / 2 - 210, survY - 35, 420, 70, 8);

        this.add.text(width / 2, survY - 8, '⭐  SURVIVAL MODE', {
            fontSize: '26px', fill: '#00ffaa', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5);
        this.add.text(width / 2, survY + 20, 'Marble waves · Upgrades · Boss waves', {
            fontSize: '14px', fill: '#55bb88', fontFamily: 'Arial',
        }).setOrigin(0.5);

        // Pulsing glow tween
        this.tweens.add({
            targets: glowGfx, alpha: 0.3, duration: 1200, yoyo: true, repeat: -1,
        });

        // ── Divider ───────────────────────────────────────────────────────────
        const divY = height * 0.42;
        const divGfx = this.add.graphics();
        divGfx.lineStyle(1, 0x334455, 0.8);
        divGfx.lineBetween(width * 0.15, divY, width * 0.85, divY);
        this.add.text(width / 2, divY, '  DUNGEON MAPS  ', {
            fontSize: '12px', fill: '#446688', fontFamily: 'Arial',
            backgroundColor: '#07071a', padding: { x: 6, y: 2 },
        }).setOrigin(0.5);

        // ── Map buttons ───────────────────────────────────────────────────────
        const btnStartY = height * 0.48;
        const btnSpacing = 68;

        GAME_CONFIG.AVAILABLE_MAPS.forEach((mapInfo, index) => {
            const btnY = btnStartY + index * btnSpacing;

            const btn = this.add.rectangle(width / 2, btnY, 400, 54, 0x1e2040)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => btn.setFillStyle(0x2e3060))
                .on('pointerout',  () => btn.setFillStyle(0x1e2040))
                .on('pointerdown', () => this.scene.start('game-scene', { mapFile: mapInfo.file }));

            this.add.text(width / 2, btnY, mapInfo.name, {
                fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial',
            }).setOrigin(0.5);
        });
    }
}
