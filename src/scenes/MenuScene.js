import Phaser from 'phaser';
import { GAME_CONFIG } from '../config/gameConfig.js';

// ============================================================================
// MENU SCENE - Map Selection
// ============================================================================
export default class MenuScene extends Phaser.Scene {
    constructor() {
        super('menu-scene');
    }

    create() {
        const { width, height } = this.scale;

        // Title
        this.add.text(width / 2, height * 0.2, 'Select Map', {
            fontSize: '48px',
            fill: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Create buttons for each map
        const buttonStartY = height * 0.4;
        const buttonSpacing = 80;

        GAME_CONFIG.AVAILABLE_MAPS.forEach((mapInfo, index) => {
            const buttonY = buttonStartY + (index * buttonSpacing);

            // Button background
            const button = this.add.rectangle(width / 2, buttonY, 400, 60, 0x4a4a6e)
                .setInteractive({ useHandCursor: true })
                .on('pointerover', () => button.setFillStyle(0x6a6a8e))
                .on('pointerout', () => button.setFillStyle(0x4a4a6e))
                .on('pointerdown', () => {
                    this.scene.start('game-scene', { mapFile: mapInfo.file });
                });

            // Button text
            this.add.text(width / 2, buttonY, mapInfo.name, {
                fontSize: '24px',
                fill: '#ffffff',
                fontFamily: 'Arial'
            }).setOrigin(0.5);
        });
    }
}
