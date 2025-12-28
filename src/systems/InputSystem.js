import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * Input System
 * Handles swipe detection, attack/dodge zones, and mode switching
 */
export default class InputSystem {
    constructor(scene) {
        this.scene = scene;

        // Swipe Detection State
        this.swipeStartY = 0;
        this.swipeStartedInBottomQuarter = false;
        this.swipeStartedAboveThreshold = false;
        this.isSwipeGesture = false;

        // Mode System
        this.modes = ['PISTOL', 'SHIELD', 'SWORD'];
        this.currentModeIndex = 0;

        // UI Elements
        this.zoneAttack = null;
        this.zoneDodge = null;
        this.modeText = null;
    }

    setupInputZones(width, height, onAttack, onDodge) {
        this.createSwipeDetection(height);
        this.createAttackZone(width, height, onAttack);
        this.createDodgeZone(width, height, onDodge);
    }

    setupModeText(width) {
        this.modeText = this.scene.add.text(width / 2, 50, 'MODE: PISTOL', {
            fontSize: '32px',
            fill: '#00ff00'
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
    }

    /**
     * Create swipe detection
     */
    createSwipeDetection(height) {
        const threshold = height * GAME_CONFIG.BOTTOM_QUARTER_THRESHOLD;

        this.scene.input.on('pointerdown', (pointer) => {
            this.swipeStartY = pointer.y;
            this.swipeStartedInBottomQuarter = pointer.y > threshold;
            this.swipeStartedAboveThreshold = pointer.y <= threshold;
            this.isSwipeGesture = false;
        });

        this.scene.input.on('pointermove', (pointer) => {
            const verticalMovement = Math.abs(pointer.y - this.swipeStartY);
            if (verticalMovement > GAME_CONFIG.SWIPE_MIN_DISTANCE) {
                this.isSwipeGesture = true;
            }
        });

        this.scene.input.on('pointerup', (pointer) => {
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
     * Create attack zone (invisible zone from 1/2 to 3/4 of screen height)
     */
    createAttackZone(width, height, onAttack) {
        const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
        const zoneY = height * GAME_CONFIG.ATTACK_ZONE_Y;

        this.zoneAttack = this.scene.add.zone(width / 2, zoneY, width, zoneHeight)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive();

        this.zoneAttack.on('pointerup', () => {
            if (!this.isSwipeGesture) {
                onAttack();
                this.flashZone(zoneY - zoneHeight / 2, zoneHeight, GAME_CONFIG.ATTACK_FLASH_COLOR);
            }
        });
    }

    /**
     * Create dodge zone
     */
    createDodgeZone(width, height, onDodge) {
        const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
        const zoneY = height * GAME_CONFIG.DODGE_ZONE_Y;

        this.zoneDodge = this.scene.add.zone(width / 2, zoneY, width, zoneHeight)
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setInteractive();

        this.zoneDodge.on('pointerup', () => {
            if (!this.isSwipeGesture) {
                onDodge();
                this.flashZone(zoneY - zoneHeight / 2, zoneHeight, GAME_CONFIG.DODGE_FLASH_COLOR);
            }
        });
    }

    /**
     * Flash zone feedback
     */
    flashZone(y, height, color) {
        const rect = this.scene.add.rectangle(
            this.scene.scale.width / 2,
            y + height / 2,
            this.scene.scale.width,
            height,
            color,
            GAME_CONFIG.ZONE_FLASH_ALPHA
        ).setScrollFactor(0);

        this.scene.tweens.add({
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

        this.scene.tweens.add({
            targets: this.modeText,
            scale: GAME_CONFIG.MODE_SCALE_MAX,
            duration: GAME_CONFIG.MODE_SCALE_DURATION,
            yoyo: true
        });
    }

    /**
     * Disable input zones (for game over/victory)
     */
    disableZones() {
        if (this.zoneAttack) {
            this.zoneAttack.disableInteractive();
        }
        if (this.zoneDodge) {
            this.zoneDodge.disableInteractive();
        }
    }

    /**
     * Update input zones on resize
     */
    resize(width, height) {
        if (this.modeText) {
            this.modeText.setPosition(width / 2, 50);
        }

        if (this.zoneAttack) {
            const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
            this.zoneAttack.setSize(width, zoneHeight)
                .setPosition(width / 2, height * GAME_CONFIG.ATTACK_ZONE_Y);
        }

        if (this.zoneDodge) {
            const zoneHeight = height * GAME_CONFIG.ZONE_HEIGHT_RATIO;
            this.zoneDodge.setSize(width, zoneHeight)
                .setPosition(width / 2, height * GAME_CONFIG.DODGE_ZONE_Y);
        }
    }
}
