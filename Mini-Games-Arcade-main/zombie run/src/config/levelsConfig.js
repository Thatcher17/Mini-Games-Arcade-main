// Level configuration - easily modify platforms and enemies for each level
// Platform format: [x, y, width, height, isMoving, moveStart, moveEnd]
// Enemy format: [x, y, type]

export const LEVELS = {
    1: {
        name: 'Tutorial Level',
        platforms: [
            [200, 600, 400, 20, false],
            [150, 360, 450, 20, false],
            [500, 300, 450, 20, false],
            [600, 150, 300, 20, false],
        ],
        enemies: [
            [400, 450, 'goblin'],
            [700, 370, 'goblin'],
        ],
        weapon: 'knife',
    },
    2: {
        name: 'Moving Platforms Level',
        platforms: [
            [200, 500, 250, 20, false],
            [550, 450, 250, 20, true, 400, 600],
            [150, 350, 300, 20, false],
            [600, 300, 280, 20, true, 400, 700],
            [100, 150, 400, 20, false],
        ],
        enemies: [
            [400, 400, 'goblin'],
            [650, 320, 'orc'],
            [300, 200, 'goblin'],
        ],
        weapon: 'knife',
    },
    3: {
        name: 'Challenging Level',
        platforms: [
            [150, 520, 200, 20, false],
            [450, 480, 200, 20, true, 300, 500],
            [750, 440, 150, 20, false],
            [200, 340, 280, 20, false],
            [550, 300, 250, 20, true, 400, 750],
            [150, 150, 700, 20, false],
        ],
        enemies: [
            [300, 400, 'orc'],
            [600, 350, 'goblin'],
            [400, 200, 'orc'],
            [800, 250, 'goblin'],
        ],
        weapon: 'gun',
    },
    4: {
        name: 'Very Challenging Level',
        platforms: [
            [100, 520, 150, 20, false],
            [350, 480, 200, 20, true, 250, 450],
            [700, 440, 200, 20, false],
            [150, 340, 350, 20, true, 100, 500],
            [600, 300, 300, 20, false],
            [200, 180, 550, 20, false],
        ],
        enemies: [
            [300, 380, 'orc'],
            [700, 340, 'orc'],
            [400, 220, 'orc'],
            [600, 180, 'orc'],
        ],
        weapon: 'gun',
    },
    5: {
        name: 'Boss Level',
        platforms: [],
        enemies: 'boss', // Special handling for boss level
        weapon: 'gun',
    },
};

export default LEVELS;
