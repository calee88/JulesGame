import Phaser from 'phaser';

/**
 * Procedural Dungeon Generator
 * Creates Torchlight-style dungeons with rooms, corridors, and walls
 */
export default class DungeonGenerator {
    /**
     * Generate a complete dungeon layout from a seed
     * @param {number|string} seed - Seed for random generation
     * @param {number} width - Map width
     * @param {number} height - Map height
     * @returns {Object} Dungeon data with rooms, walls, enemies, playerStart
     */
    static generate(seed, width, height) {
        // Initialize seeded RNG
        const rng = new Phaser.Math.RandomDataGenerator([seed]);

        // Generate dungeon parameters from seed
        const config = this.generateConfig(rng);

        // Generate rooms
        const rooms = this.generateRooms(rng, config, width, height);

        // Connect rooms with corridors
        const corridors = this.connectRooms(rng, rooms);

        // Generate walls (negative space)
        const walls = this.generateWalls(rooms, corridors, width, height);

        // Place enemies in rooms
        const enemies = this.placeEnemies(rng, rooms);

        // Set player start in first room
        const playerStart = {
            x: rooms[0].centerX,
            y: rooms[0].centerY
        };

        return {
            rooms,
            corridors,
            walls,
            enemies,
            playerStart
        };
    }

    /**
     * Generate dungeon configuration from seed
     */
    static generateConfig(rng) {
        return {
            roomCount: rng.between(8, 12),
            minRoomSize: rng.between(250, 350),
            maxRoomSize: rng.between(450, 650),
            corridorWidth: rng.between(128, 192),
            enemiesPerRoom: { min: 1, max: 3 },
            roomPadding: 100 // Minimum space between rooms
        };
    }

    /**
     * Generate rooms that don't overlap
     */
    static generateRooms(rng, config, mapWidth, mapHeight) {
        const rooms = [];
        const maxAttempts = 100;

        for (let i = 0; i < config.roomCount; i++) {
            let room = null;
            let attempts = 0;

            while (attempts < maxAttempts) {
                const width = rng.between(config.minRoomSize, config.maxRoomSize);
                const height = rng.between(config.minRoomSize, config.maxRoomSize);
                const x = rng.between(100, mapWidth - width - 100);
                const y = rng.between(100, mapHeight - height - 100);

                room = {
                    x,
                    y,
                    width,
                    height,
                    centerX: x + width / 2,
                    centerY: y + height / 2
                };

                // Check for overlap with existing rooms
                if (!this.overlapsWithRooms(room, rooms, config.roomPadding)) {
                    break;
                }

                attempts++;
                room = null;
            }

            if (room) {
                rooms.push(room);
            }
        }

        return rooms;
    }

    /**
     * Check if a room overlaps with existing rooms (including padding)
     */
    static overlapsWithRooms(room, existingRooms, padding) {
        for (const existing of existingRooms) {
            const rect1 = {
                left: room.x - padding,
                right: room.x + room.width + padding,
                top: room.y - padding,
                bottom: room.y + room.height + padding
            };

            const rect2 = {
                left: existing.x - padding,
                right: existing.x + existing.width + padding,
                top: existing.y - padding,
                bottom: existing.y + existing.height + padding
            };

            if (rect1.left < rect2.right && rect1.right > rect2.left &&
                rect1.top < rect2.bottom && rect1.bottom > rect2.top) {
                return true;
            }
        }

        return false;
    }

    /**
     * Connect rooms with L-shaped corridors
     */
    static connectRooms(rng, rooms) {
        const corridors = [];

        // Connect each room to the next room
        for (let i = 0; i < rooms.length - 1; i++) {
            const room1 = rooms[i];
            const room2 = rooms[i + 1];

            // Create L-shaped corridor
            const corridor = this.createLCorridor(rng, room1, room2, 128);
            corridors.push(...corridor);
        }

        // Add some random connections for more interconnected dungeon
        const extraConnections = Math.min(3, Math.floor(rooms.length / 3));
        for (let i = 0; i < extraConnections; i++) {
            const room1 = rooms[rng.between(0, rooms.length - 1)];
            const room2 = rooms[rng.between(0, rooms.length - 1)];

            if (room1 !== room2) {
                const corridor = this.createLCorridor(rng, room1, room2, 128);
                corridors.push(...corridor);
            }
        }

        return corridors;
    }

    /**
     * Create an L-shaped corridor between two rooms
     */
    static createLCorridor(rng, room1, room2, width) {
        const corridors = [];

        // Randomly choose to go horizontal-then-vertical or vertical-then-horizontal
        const horizontalFirst = rng.frac() > 0.5;

        if (horizontalFirst) {
            // Horizontal corridor
            corridors.push({
                x: Math.min(room1.centerX, room2.centerX),
                y: room1.centerY - width / 2,
                width: Math.abs(room2.centerX - room1.centerX),
                height: width
            });

            // Vertical corridor
            corridors.push({
                x: room2.centerX - width / 2,
                y: Math.min(room1.centerY, room2.centerY),
                width: width,
                height: Math.abs(room2.centerY - room1.centerY)
            });
        } else {
            // Vertical corridor
            corridors.push({
                x: room1.centerX - width / 2,
                y: Math.min(room1.centerY, room2.centerY),
                width: width,
                height: Math.abs(room2.centerY - room1.centerY)
            });

            // Horizontal corridor
            corridors.push({
                x: Math.min(room1.centerX, room2.centerX),
                y: room2.centerY - width / 2,
                width: Math.abs(room2.centerX - room1.centerX),
                height: width
            });
        }

        return corridors;
    }

    /**
     * Generate walls from negative space
     * Creates walls in grid cells that are not part of rooms or corridors
     */
    static generateWalls(rooms, corridors, mapWidth, mapHeight) {
        const walls = [];
        const tileSize = 64;
        const gridWidth = Math.ceil(mapWidth / tileSize);
        const gridHeight = Math.ceil(mapHeight / tileSize);

        // Create grid to mark walkable areas
        const walkable = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false));

        // Mark rooms as walkable
        rooms.forEach(room => {
            const startX = Math.floor(room.x / tileSize);
            const endX = Math.ceil((room.x + room.width) / tileSize);
            const startY = Math.floor(room.y / tileSize);
            const endY = Math.ceil((room.y + room.height) / tileSize);

            for (let y = startY; y < endY && y < gridHeight; y++) {
                for (let x = startX; x < endX && x < gridWidth; x++) {
                    if (x >= 0 && y >= 0) {
                        walkable[y][x] = true;
                    }
                }
            }
        });

        // Mark corridors as walkable
        corridors.forEach(corridor => {
            const startX = Math.floor(corridor.x / tileSize);
            const endX = Math.ceil((corridor.x + corridor.width) / tileSize);
            const startY = Math.floor(corridor.y / tileSize);
            const endY = Math.ceil((corridor.y + corridor.height) / tileSize);

            for (let y = startY; y < endY && y < gridHeight; y++) {
                for (let x = startX; x < endX && x < gridWidth; x++) {
                    if (x >= 0 && y >= 0 && x < gridWidth && y < gridHeight) {
                        walkable[y][x] = true;
                    }
                }
            }
        });

        // Create wall rectangles from non-walkable tiles
        // Group adjacent wall tiles into larger rectangles for performance
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (!walkable[y][x]) {
                    // Find the extent of this wall region horizontally
                    let width = 1;
                    while (x + width < gridWidth && !walkable[y][x + width]) {
                        width++;
                    }

                    // Find the extent vertically
                    let height = 1;
                    let canExtend = true;
                    while (y + height < gridHeight && canExtend) {
                        for (let wx = 0; wx < width; wx++) {
                            if (walkable[y + height][x + wx]) {
                                canExtend = false;
                                break;
                            }
                        }
                        if (canExtend) height++;
                    }

                    // Create wall rectangle
                    walls.push({
                        x: x * tileSize,
                        y: y * tileSize,
                        width: width * tileSize,
                        height: height * tileSize
                    });

                    // Mark these tiles as processed
                    for (let wy = 0; wy < height; wy++) {
                        for (let wx = 0; wx < width; wx++) {
                            walkable[y + wy][x + wx] = true; // Mark as processed
                        }
                    }
                }
            }
        }

        return walls;
    }

    /**
     * Place enemies in rooms with patrol routes
     */
    static placeEnemies(rng, rooms) {
        const enemies = [];

        // Skip first room (player starts there)
        for (let i = 1; i < rooms.length; i++) {
            const room = rooms[i];
            const enemyCount = rng.between(1, 3);

            for (let j = 0; j < enemyCount; j++) {
                // Place enemy in room
                const x = rng.between(room.x + 50, room.x + room.width - 50);
                const y = rng.between(room.y + 50, room.y + room.height - 50);

                // Create patrol route within room
                const patrol = this.generatePatrolRoute(rng, room, x, y);

                enemies.push({ x, y, patrol });
            }
        }

        return enemies;
    }

    /**
     * Generate a patrol route within a room
     */
    static generatePatrolRoute(rng, room, startX, startY) {
        const patrol = [{ x: startX, y: startY }];

        // Add 1-2 more patrol points
        const pointCount = rng.between(1, 2);
        for (let i = 0; i < pointCount; i++) {
            const x = rng.between(room.x + 50, room.x + room.width - 50);
            const y = rng.between(room.y + 50, room.y + room.height - 50);
            patrol.push({ x, y });
        }

        return patrol;
    }
}
