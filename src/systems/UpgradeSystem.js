// ============================================================================
// UPGRADE SYSTEM — Level-up card selection
// ============================================================================
import Phaser from 'phaser';

// All available upgrades; each `apply` mutates scene.playerUpgrades
const ALL_UPGRADES = [
    {
        id: 'bounces',
        name: 'Extra Bounce',
        desc: 'Marble bounces +2 extra times before disappearing',
        color: 0x4488ff,
        apply: (scene) => { scene.playerUpgrades.maxBounces += 2; },
    },
    {
        id: 'size',
        name: 'Big Marble',
        desc: 'Marble radius +25%  (easier to hit enemies)',
        color: 0x44dd88,
        apply: (scene) => {
            scene.playerUpgrades.marbleRadius = Math.min(
                Math.round(scene.playerUpgrades.marbleRadius * 1.25), 30
            );
        },
    },
    {
        id: 'speed',
        name: 'Fast Shot',
        desc: 'Marble launch speed +25%',
        color: 0xffee00,
        apply: (scene) => {
            scene.playerUpgrades.marbleSpeed = Math.round(scene.playerUpgrades.marbleSpeed * 1.25);
        },
    },
    {
        id: 'chain',
        name: 'Chain Reaction',
        desc: 'Destroying a marble explodes nearby enemies (+50 px radius)',
        color: 0xff6600,
        apply: (scene) => { scene.playerUpgrades.chainRadius += 50; },
    },
    {
        id: 'cooldown',
        name: 'Quick Reload',
        desc: 'Fire cooldown reduced by 30%',
        color: 0xcc44ff,
        apply: (scene) => {
            scene.playerUpgrades.fireCooldown = Math.max(
                300, Math.round(scene.playerUpgrades.fireCooldown * 0.70)
            );
        },
    },
    {
        id: 'multishot',
        name: 'Split Shot',
        desc: 'Fire 2 extra marbles at spread angles',
        color: 0xff4444,
        apply: (scene) => {
            scene.playerUpgrades.multiShot = Math.min(
                (scene.playerUpgrades.multiShot ?? 1) + 2, 7
            );
        },
    },
    {
        id: 'bounces2',
        name: 'Rubber Core',
        desc: 'Marble bounces +3 extra times',
        color: 0x2266cc,
        apply: (scene) => { scene.playerUpgrades.maxBounces += 3; },
    },
    {
        id: 'size2',
        name: 'Giant Marble',
        desc: 'Marble radius +35%',
        color: 0x22bb66,
        apply: (scene) => {
            scene.playerUpgrades.marbleRadius = Math.min(
                Math.round(scene.playerUpgrades.marbleRadius * 1.35), 30
            );
        },
    },
];

export class UpgradeSystem {
    constructor(scene) {
        this.scene = scene;
        this.pool = [...ALL_UPGRADES];
    }

    showLevelUp() {
        const scene = this.scene;
        scene.isLevelingUp = true;

        const W = scene.scale.width;
        const H = scene.scale.height;
        const uiObjs = [];

        const cleanup = () => {
            uiObjs.forEach(o => { if (o?.active) o.destroy(); });
            scene.isLevelingUp = false;
        };

        // Dark overlay
        const overlay = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.82).setDepth(20);
        uiObjs.push(overlay);

        // Title
        uiObjs.push(
            scene.add.text(W / 2, 65, 'LEVEL UP!', {
                fontSize: '42px', color: '#ffee00', fontFamily: 'Arial', fontStyle: 'bold',
                stroke: '#886600', strokeThickness: 4,
            }).setOrigin(0.5).setDepth(21)
        );
        uiObjs.push(
            scene.add.text(W / 2, 118, `Level ${scene.level}  —  Choose an upgrade`, {
                fontSize: '17px', color: '#aaaaaa', fontFamily: 'Arial',
            }).setOrigin(0.5).setDepth(21)
        );

        // Pick 3 upgrades (non-repeating pool; refill when exhausted)
        if (this.pool.length < 3) this.pool = [...ALL_UPGRADES];
        const shuffled = Phaser.Utils.Array.Shuffle([...this.pool]);
        const choices = shuffled.slice(0, 3);

        const cardW = W - 60;
        const cardH = 112;
        const startY = 195;
        const gap = 128;

        choices.forEach((upg, i) => {
            const cx = W / 2;
            const cy = startY + i * gap;

            // Card background
            const card = scene.add.rectangle(cx, cy, cardW, cardH, upg.color, 0.15)
                .setDepth(21)
                .setInteractive({ useHandCursor: true });
            uiObjs.push(card);

            // Card border
            const border = scene.add.rectangle(cx, cy, cardW, cardH, 0, 0)
                .setStrokeStyle(2, upg.color, 1)
                .setDepth(21);
            uiObjs.push(border);

            // Name
            uiObjs.push(
                scene.add.text(cx - cardW / 2 + 18, cy - 22, upg.name, {
                    fontSize: '22px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
                }).setOrigin(0, 0.5).setDepth(22)
            );

            // Description
            uiObjs.push(
                scene.add.text(cx - cardW / 2 + 18, cy + 16, upg.desc, {
                    fontSize: '15px', color: '#cccccc', fontFamily: 'Arial',
                    wordWrap: { width: cardW - 36 },
                }).setOrigin(0, 0.5).setDepth(22)
            );

            card.on('pointerover', () => card.setFillStyle(upg.color, 0.40));
            card.on('pointerout',  () => card.setFillStyle(upg.color, 0.15));
            card.on('pointerdown', () => {
                upg.apply(scene);
                cleanup();
            });
        });
    }
}
