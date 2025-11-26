// STUDENT TODO: Adjust these values to tune the gameplay
const CONFIG = {
    // Runner physics
    gravity: 0.6,           // How fast the turkey falls (higher = faster fall)
    jumpStrength: -12,      // How high the turkey jumps (more negative = higher)
    maxAirJumps: 1,         // Extra jumps while airborne (1 = double jump)
    crouchHeight: 28,       // Height while sliding/crouching
    
    // Game speed
    gameSpeed: 4.5,         // How fast obstacles move (higher = faster game)
    speedIncrease: 0.0007,  // How much speed increases over time
    dashSpeedBoost: 1.4,    // Speed multiplier during dash
    dashFrames: 28,         // How long a dash lasts (frames)
    dashCooldown: 160,      // Frames between dashes
    
    // Obstacle settings
    obstacleFrequency: 120, // Frames between obstacles (lower = more frequent)
    minObstacleGap: 80,     // Minimum frames between obstacles
    obstacleHeights: [0, 40, 80], // Adds variety to jump/crouch timing
    
    // Scoring
    scoreIncrement: 1,      // Points per frame survived
    obstaclePoints: 10,     // Bonus points for passing an obstacle
    
    // Power-ups
    powerUpFrequency: {     // Range of frames between power-up spawns
        min: 420,
        max: 720
    },
    invincibleFrames: 240,  // Frames of invincibility from shield/dash
    slowMoFrames: 180,      // Frames of slow-mo effect
    slowMoFactor: 0.6,      // Speed multiplier during slow-mo
    powerUpBonus: 150       // Score bonus from feast power-up
};

// STUDENT TODO: Customize obstacles with Thanksgiving themes
const OBSTACLES = [
    {
        type: 'gravy',
        width: 40,
        height: 30,
        color: '#8B4513',
        image: 'assets/gravy.png'
    },
    {
        type: 'pumpkin',
        width: 50,
        height: 50,
        color: '#FF8C00',
        image: 'assets/pumpkin.png'
    },
    {
        type: 'pie',
        width: 45,
        height: 35,
        color: '#D2691E',
        image: 'assets/pie.png'
    },
    {
        type: 'leaf',
        width: 60,
        height: 30,
        color: '#4CAF50',
        image: 'assets/leaf.png',
        floating: true // Floats off the ground so crouch/double-jump matters
    }
];
