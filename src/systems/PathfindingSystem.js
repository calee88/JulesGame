import EasyStar from 'easystarjs';
import { GAME_CONFIG } from '../config/gameConfig.js';

/**
 * Pathfinding System using EasyStar.js
 * Handles grid creation, pathfinding, and line-of-sight checks
 */
export default class PathfindingSystem {
    constructor(scene, mapData) {
        this.scene = scene;
        this.mapData = mapData;
        this.grid = null;
        this.easystar = null;

        this.createPathfindingGrid();
    }

    /**
     * Create pathfinding grid using EasyStar.js
     */
    createPathfindingGrid() {
        const gridWidth = Math.ceil(this.mapData.width / GAME_CONFIG.GRID_SIZE);
        const gridHeight = Math.ceil(this.mapData.height / GAME_CONFIG.GRID_SIZE);

        // Initialize grid with all walkable cells
        this.grid = [];
        for (let y = 0; y < gridHeight; y++) {
            this.grid[y] = [];
            for (let x = 0; x < gridWidth; x++) {
                this.grid[y][x] = 0; // 0 = walkable, 1 = blocked
            }
        }

        // Mark wall cells as blocked
        // IMPORTANT: Use the actual visual tile bounds, not the raw wall dimensions
        // Visual walls are created using 64x64 tiles in createMap(), so we must match that
        this.mapData.walls.forEach(wall => {
            // Calculate actual visual tile bounds (same logic as createMap)
            const tilesX = Math.ceil(wall.width / 64);
            const tilesY = Math.ceil(wall.height / 64);
            const actualWidth = tilesX * 64;
            const actualHeight = tilesY * 64;

            // Calculate which grid cells this wall overlaps using actual visual bounds
            const startX = Math.floor(wall.x / GAME_CONFIG.GRID_SIZE);
            const startY = Math.floor(wall.y / GAME_CONFIG.GRID_SIZE);
            const endX = Math.floor((wall.x + actualWidth - 1) / GAME_CONFIG.GRID_SIZE) + 1;
            const endY = Math.floor((wall.y + actualHeight - 1) / GAME_CONFIG.GRID_SIZE) + 1;

            for (let y = startY; y < endY && y < gridHeight; y++) {
                for (let x = startX; x < endX && x < gridWidth; x++) {
                    this.grid[y][x] = 1;
                }
            }
        });

        // Add buffer zone around walls for player collision radius
        // Player has 32px size (16px radius), so expand walls by 1 grid cell in pathfinding
        // This creates a "configuration space" that accounts for player size
        this.expandWallsForPlayerSize(gridWidth, gridHeight);

        // Initialize EasyStar pathfinder
        this.easystar = new EasyStar.js();
        this.easystar.setGrid(this.grid);
        this.easystar.setAcceptableTiles([0]); // 0 is walkable
        this.easystar.enableDiagonals();
        this.easystar.disableCornerCutting(); // Prevent paths from cutting through wall corners
    }

    /**
     * Expand walls by one grid cell to account for player collision size
     * This prevents paths from getting too close to walls where the player would collide
     */
    expandWallsForPlayerSize(gridWidth, gridHeight) {
        // Create a copy of the current grid to avoid modifying while iterating
        const originalGrid = this.grid.map(row => [...row]);

        // For each blocked cell, mark adjacent cells as blocked too
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                if (originalGrid[y][x] === 1) {
                    // Mark 8 adjacent cells (including diagonals) as blocked
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                                this.grid[ny][nx] = 1;
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Pathfinding using EasyStar.js (async)
     */
    findPath(startX, startY, goalX, goalY, callback) {
        if (!this.easystar || !this.grid || this.grid.length === 0) {
            callback(null);
            return;
        }

        // Convert world coordinates to grid coordinates
        const startGridX = Math.floor(startX / GAME_CONFIG.GRID_SIZE);
        const startGridY = Math.floor(startY / GAME_CONFIG.GRID_SIZE);
        let goalGridX = Math.floor(goalX / GAME_CONFIG.GRID_SIZE);
        let goalGridY = Math.floor(goalY / GAME_CONFIG.GRID_SIZE);

        const gridHeight = this.grid.length;
        const gridWidth = this.grid[0].length;

        // Check if start is valid
        if (startGridX < 0 || startGridX >= gridWidth || startGridY < 0 || startGridY >= gridHeight) {
            callback(null);
            return;
        }

        // Check if goal is valid
        if (goalGridX < 0 || goalGridX >= gridWidth || goalGridY < 0 || goalGridY >= gridHeight) {
            callback(null);
            return;
        }

        // If goal is blocked, try to find nearest walkable cell
        if (this.grid[goalGridY][goalGridX] === 1) {
            let bestDist = Infinity;
            let bestX = goalGridX;
            let bestY = goalGridY;

            for (let dy = -3; dy <= 3; dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const nx = goalGridX + dx;
                    const ny = goalGridY + dy;
                    if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                        if (this.grid[ny][nx] === 0) {
                            const dist = Math.abs(dx) + Math.abs(dy);
                            if (dist < bestDist) {
                                bestDist = dist;
                                bestX = nx;
                                bestY = ny;
                            }
                        }
                    }
                }
            }

            if (bestDist === Infinity) {
                callback(null);
                return;
            }

            goalGridX = bestX;
            goalGridY = bestY;
        }

        // Use EasyStar to find path
        this.easystar.findPath(startGridX, startGridY, goalGridX, goalGridY, (path) => {
            if (path === null || path.length === 0) {
                callback(null);
                return;
            }

            // Smooth the path to remove unnecessary waypoints
            const smoothedPath = this.smoothPath(path);

            // Convert grid path to world coordinates
            const worldPath = smoothedPath.map(node => ({
                x: node.x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2,
                y: node.y * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2
            }));

            callback(worldPath);
        });

        // Calculate the path (EasyStar requires this to be called)
        this.easystar.calculate();
    }

    /**
     * Smooth a grid path by removing unnecessary waypoints
     * Uses line-of-sight checks to skip intermediate points
     */
    smoothPath(path) {
        if (!path || path.length <= 2) return path;

        const smoothed = [path[0]]; // Always keep start
        let current = 0;

        while (current < path.length - 1) {
            // Try to find the furthest point we can reach directly
            let furthest = current + 1;

            for (let i = path.length - 1; i > current + 1; i--) {
                if (this.hasLineOfSight(path[current], path[i])) {
                    furthest = i;
                    break;
                }
            }

            smoothed.push(path[furthest]);
            current = furthest;
        }

        return smoothed;
    }

    /**
     * Check if there's a clear line of sight between two grid points
     * Uses Bresenham's line algorithm to check all cells along the path
     */
    hasLineOfSight(from, to) {
        let x0 = from.x;
        let y0 = from.y;
        const x1 = to.x;
        const y1 = to.y;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            // Check if current cell is blocked
            if (y0 >= 0 && y0 < this.grid.length &&
                x0 >= 0 && x0 < this.grid[0].length) {
                if (this.grid[y0][x0] === 1) {
                    return false; // Hit a wall
                }
            } else {
                return false; // Out of bounds
            }

            // Reached destination
            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return true;
    }

    /**
     * Check if a point is blocked (inside wall or world bounds)
     */
    isPointBlocked(x, y) {
        // Check world bounds
        if (x < 0 || x > this.mapData.width || y < 0 || y > this.mapData.height) {
            return true;
        }

        // Convert to grid coordinates
        const gridX = Math.floor(x / GAME_CONFIG.GRID_SIZE);
        const gridY = Math.floor(y / GAME_CONFIG.GRID_SIZE);

        // Check if this grid cell is blocked
        if (gridY >= 0 && gridY < this.grid.length &&
            gridX >= 0 && gridX < this.grid[0].length) {
            return this.grid[gridY][gridX] === 1;
        }

        return false;
    }

    /**
     * Draw the pathfinding grid to visualize blocked cells
     */
    drawPathfindingGrid(graphics, depth = 50) {
        graphics.setDepth(depth); // Below path but above floor

        const gridWidth = this.grid[0].length;
        const gridHeight = this.grid.length;

        // Draw each grid cell
        for (let y = 0; y < gridHeight; y++) {
            for (let x = 0; x < gridWidth; x++) {
                const worldX = x * GAME_CONFIG.GRID_SIZE;
                const worldY = y * GAME_CONFIG.GRID_SIZE;

                if (this.grid[y][x] === 1) {
                    // Blocked cell - draw semi-transparent red
                    graphics.fillStyle(0xff0000, 0.3);
                    graphics.fillRect(worldX, worldY, GAME_CONFIG.GRID_SIZE, GAME_CONFIG.GRID_SIZE);
                }

                // Draw grid lines
                graphics.lineStyle(1, 0xffffff, 0.1);
                graphics.strokeRect(worldX, worldY, GAME_CONFIG.GRID_SIZE, GAME_CONFIG.GRID_SIZE);
            }

        }

        // Add Y-coordinate labels in a fixed legend (camera-relative)
        // Create a legend showing grid Y-coordinates
        const legendX = 10;
        let legendY = 10;

        this.scene.add.text(legendX, legendY, 'Grid Y-coordinates:', {
            fontSize: '14px',
            fill: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 4, y: 2 }
        }).setScrollFactor(0).setDepth(1000);

        legendY += 20;

        // Show every 64px (2 grid cells) for readability
        for (let y = 0; y <= gridHeight; y += 2) {
            const worldY = y * GAME_CONFIG.GRID_SIZE;
            const label = this.scene.add.text(legendX, legendY, `y=${worldY}`, {
                fontSize: '11px',
                fill: '#ffff00',
                backgroundColor: '#000000',
                padding: { x: 3, y: 1 }
            });
            label.setScrollFactor(0); // Fixed to camera
            label.setDepth(1000);
            legendY += 15;

            // Stop after showing enough to be useful
            if (legendY > 400) break;
        }
    }
}
