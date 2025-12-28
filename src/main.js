import Phaser from 'phaser';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';

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
    scene: [MenuScene, GameScene]
};

const game = new Phaser.Game(config);
