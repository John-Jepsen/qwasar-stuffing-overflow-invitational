const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');
const statusElement = document.getElementById('status');

// Game state
let gameRunning = false;
let score = 0;
let frameCount = 0;
let currentSpeed = CONFIG.gameSpeed;

// Turkey player
const turkey = {
    x: 100,
    y: 0,
    width: 50,
    height: 50,
    standingHeight: 50,
    velocityY: 0,
    grounded: false,
    crouching: false,
    image: null
};

// Ground position
const groundY = canvas.height - 80;
turkey.y = groundY - turkey.height;

// Obstacles and power-ups
let obstacles = [];
let powerUps = [];
let nextObstacleFrame = CONFIG.obstacleFrequency;
let nextPowerUpFrame = CONFIG.powerUpFrequency.min;

const state = {
    invincibleUntil: 0,
    slowUntil: 0,
    dashUntil: 0,
    dashCooldownUntil: 0,
    jumpsLeft: CONFIG.maxAirJumps
};

function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function updateStatusLabel(message) {
    if (!statusElement) return;
    if (message) {
        statusElement.textContent = message;
        return;
    }
    const effects = [];
    if (state.invincibleUntil > frameCount) effects.push('shield');
    if (state.dashUntil > frameCount) effects.push('dash');
    if (state.slowUntil > frameCount) effects.push('slow-mo');
    statusElement.textContent = effects.length
        ? `Power: ${effects.join(' | ')}`
        : 'Grab glowing orbs for power-ups!';
}

// Load images
function loadImages() {
    // Load turkey runner sprite
    turkey.image = new Image();
    turkey.image.src = 'assets/turkey_runner.png';
    turkey.image.onerror = () => {
        console.log('Turkey image not found, using fallback shape');
        turkey.image = null;
    };
    
    // Load obstacle images
    OBSTACLES.forEach(obs => {
        const img = new Image();
        img.src = obs.image;
        img.onerror = () => {
            console.log(`${obs.type} image not found, using fallback shape`);
        };
        obs.loadedImage = img;
    });
}

function resetState() {
    state.invincibleUntil = 0;
    state.slowUntil = 0;
    state.dashUntil = 0;
    state.dashCooldownUntil = 0;
    state.jumpsLeft = CONFIG.maxAirJumps;
    turkey.crouching = false;
    turkey.height = turkey.standingHeight;
}

// Initialize game
function init() {
    gameRunning = true;
    score = 0;
    frameCount = 0;
    currentSpeed = CONFIG.gameSpeed;
    obstacles = [];
    powerUps = [];
    turkey.y = groundY - turkey.height;
    turkey.velocityY = 0;
    turkey.grounded = true;
    gameOverElement.style.display = 'none';
    nextObstacleFrame = CONFIG.obstacleFrequency;
    nextPowerUpFrame = CONFIG.powerUpFrequency.min;
    resetState();
    updateStatusLabel('Run! Power-ups ahead.');
}

function getEffectiveSpeed() {
    let speed = currentSpeed;
    if (state.slowUntil > frameCount) {
        speed *= CONFIG.slowMoFactor;
    }
    if (state.dashUntil > frameCount) {
        speed *= CONFIG.dashSpeedBoost;
    }
    return speed;
}

function setCrouch(isCrouching) {
    if (isCrouching && !turkey.crouching) {
        turkey.crouching = true;
        const delta = turkey.height - CONFIG.crouchHeight;
        turkey.height = CONFIG.crouchHeight;
        turkey.y += delta;
    } else if (!isCrouching && turkey.crouching) {
        const delta = turkey.standingHeight - turkey.height;
        turkey.height = turkey.standingHeight;
        turkey.y -= delta;
        turkey.crouching = false;
    }
}

// Draw turkey
function drawTurkey() {
    if (turkey.image && turkey.image.complete && turkey.image.naturalHeight !== 0) {
        ctx.drawImage(turkey.image, turkey.x, turkey.y, turkey.width, turkey.height);
    } else {
        // Fallback: simple turkey shape
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(turkey.x, turkey.y, turkey.width, turkey.height);
        
        // Body
        ctx.fillStyle = '#A0522D';
        ctx.beginPath();
        ctx.ellipse(turkey.x + turkey.width/2, turkey.y + turkey.height/2, 
                   turkey.width/2.5, turkey.height/2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(turkey.x + turkey.width - 10, turkey.y + 15, 10, 0, Math.PI * 2);
        ctx.fill();
        
        // Beak
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.moveTo(turkey.x + turkey.width - 5, turkey.y + 15);
        ctx.lineTo(turkey.x + turkey.width + 5, turkey.y + 15);
        ctx.lineTo(turkey.x + turkey.width, turkey.y + 18);
        ctx.fill();
    }
}

// Draw ground
function drawGround() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    
    // Grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, groundY, canvas.width, 5);
}

// Draw obstacles
function drawObstacles() {
    obstacles.forEach(obs => {
        const obstacleData = OBSTACLES.find(o => o.type === obs.type);
        
        if (obs.image && obs.image.complete && obs.image.naturalHeight !== 0) {
            ctx.drawImage(obs.image, obs.x, obs.y, obs.width, obs.height);
        } else {
            // Fallback shapes
            ctx.fillStyle = obstacleData.color;
            
            if (obs.type === 'gravy') {
                ctx.beginPath();
                ctx.ellipse(obs.x + obs.width/2, obs.y + obs.height/2, 
                           obs.width/2, obs.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (obs.type === 'pumpkin') {
                ctx.beginPath();
                ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, 
                       obs.width/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.fillRect(obs.x + obs.width/2 - 3, obs.y + 5, 6, 8);
            } else if (obs.type === 'pie') {
                ctx.beginPath();
                ctx.moveTo(obs.x + obs.width/2, obs.y);
                ctx.lineTo(obs.x, obs.y + obs.height);
                ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
                ctx.closePath();
                ctx.fill();
            } else {
                // Leaf or unknown: simple rounded rect
                ctx.beginPath();
                const radius = 6;
                ctx.moveTo(obs.x + radius, obs.y);
                ctx.lineTo(obs.x + obs.width - radius, obs.y);
                ctx.quadraticCurveTo(obs.x + obs.width, obs.y, obs.x + obs.width, obs.y + radius);
                ctx.lineTo(obs.x + obs.width, obs.y + obs.height - radius);
                ctx.quadraticCurveTo(obs.x + obs.width, obs.y + obs.height, obs.x + obs.width - radius, obs.y + obs.height);
                ctx.lineTo(obs.x + radius, obs.y + obs.height);
                ctx.quadraticCurveTo(obs.x, obs.y + obs.height, obs.x, obs.y + obs.height - radius);
                ctx.lineTo(obs.x, obs.y + radius);
                ctx.quadraticCurveTo(obs.x, obs.y, obs.x + radius, obs.y);
                ctx.fill();
            }
        }
    });
}

function drawPowerUps() {
    powerUps.forEach(pu => {
        ctx.fillStyle = pu.color;
        ctx.beginPath();
        ctx.arc(pu.x + pu.size / 2, pu.y + pu.size / 2, pu.size / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow outline
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

// Update turkey physics
function updateTurkey() {
    // Apply gravity
    if (!turkey.grounded) {
        turkey.velocityY += CONFIG.gravity;
    }
    
    // Update position
    turkey.y += turkey.velocityY;
    
    // Ground collision
    if (turkey.y >= groundY - turkey.height) {
        turkey.y = groundY - turkey.height;
        turkey.velocityY = 0;
        turkey.grounded = true;
        state.jumpsLeft = CONFIG.maxAirJumps;
    } else {
        turkey.grounded = false;
    }
}

// Spawn obstacles
function spawnObstacle() {
    if (frameCount >= nextObstacleFrame) {
        const obstacleTemplate = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
        
        const randomHeight = obstacleTemplate.floating
            ? randomInRange(40, 140)
            : CONFIG.obstacleHeights[Math.floor(Math.random() * CONFIG.obstacleHeights.length)];
        const obstacle = {
            x: canvas.width,
            y: Math.max(20, groundY - obstacleTemplate.height - randomHeight),
            width: obstacleTemplate.width,
            height: obstacleTemplate.height,
            type: obstacleTemplate.type,
            image: obstacleTemplate.loadedImage,
            passed: false
        };
        
        obstacles.push(obstacle);
        nextObstacleFrame = frameCount + Math.max(
            CONFIG.minObstacleGap,
            CONFIG.obstacleFrequency - Math.floor(score / 400)
        );
    }
}

// Update obstacles
function updateObstacles() {
    const speed = getEffectiveSpeed();
    obstacles.forEach(obs => {
        obs.x -= speed;
        
        // Award points for passing obstacle
        if (!obs.passed && obs.x + obs.width < turkey.x) {
            obs.passed = true;
            score += CONFIG.obstaclePoints;
        }
    });
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}

function spawnPowerUp() {
    if (frameCount < nextPowerUpFrame) return;
    const types = [
        { type: 'shield', color: '#4DB6FF' },
        { type: 'slow', color: '#FFD54F' },
        { type: 'feast', color: '#ADFF2F' }
    ];
    const pick = types[Math.floor(Math.random() * types.length)];
    const size = 26;
    const heightOffset = randomInRange(30, 140);
    const powerUp = {
        ...pick,
        x: canvas.width,
        y: Math.max(20, groundY - heightOffset),
        size
    };
    powerUps.push(powerUp);
    nextPowerUpFrame = frameCount + randomInRange(CONFIG.powerUpFrequency.min, CONFIG.powerUpFrequency.max);
}

function updatePowerUps() {
    const speed = getEffectiveSpeed() * 0.85;
    powerUps.forEach(pu => {
        pu.x -= speed;
    });
    powerUps = powerUps.filter(pu => pu.x + pu.size > 0);
}

function applyPowerUp(type) {
    if (type === 'shield') {
        state.invincibleUntil = frameCount + CONFIG.invincibleFrames;
        updateStatusLabel('Shield up!');
    } else if (type === 'slow') {
        state.slowUntil = frameCount + CONFIG.slowMoFrames;
        updateStatusLabel('Slow-mo!');
    } else if (type === 'feast') {
        score += CONFIG.powerUpBonus;
        state.jumpsLeft = CONFIG.maxAirJumps;
        updateStatusLabel('Feast bonus!');
    }
}

function collectPowerUps() {
    powerUps = powerUps.filter(pu => {
        const collides = turkey.x < pu.x + pu.size &&
            turkey.x + turkey.width > pu.x &&
            turkey.y < pu.y + pu.size &&
            turkey.y + turkey.height > pu.y;
        if (collides) {
            applyPowerUp(pu.type);
        }
        return !collides;
    });
}

function startDash() {
    if (!gameRunning) return;
    if (frameCount < state.dashCooldownUntil) return;
    state.dashUntil = frameCount + CONFIG.dashFrames;
    state.invincibleUntil = Math.max(state.invincibleUntil, frameCount + CONFIG.dashFrames);
    state.dashCooldownUntil = frameCount + CONFIG.dashCooldown;
    updateStatusLabel('Dash burst!');
}

// Check collisions
function checkCollisions() {
    if (state.invincibleUntil > frameCount) return false;
    for (let obs of obstacles) {
        if (turkey.x < obs.x + obs.width &&
            turkey.x + turkey.width > obs.x &&
            turkey.y < obs.y + obs.height &&
            turkey.y + turkey.height > obs.y) {
            return true;
        }
    }
    return false;
}

// Game over
function gameOver() {
    gameRunning = false;
    gameOverElement.style.display = 'block';
    updateStatusLabel('Press Space/W/Up to try again');
}

function drawSky() {
    ctx.fillStyle = '#B3E5FC';
    ctx.fillRect(0, 0, canvas.width, groundY);
    
    // Simple parallax clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (let i = 0; i < 4; i++) {
        const offset = (frameCount * 0.2 + i * 200) % (canvas.width + 200);
        const x = canvas.width - offset;
        const y = 40 + (i % 2) * 30;
        ctx.beginPath();
        ctx.ellipse(x, y, 50, 20, 0, 0, Math.PI * 2);
        ctx.ellipse(x + 25, y + 5, 40, 20, 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Update
    frameCount++;
    updateTurkey();
    spawnObstacle();
    spawnPowerUp();
    updateObstacles();
    updatePowerUps();
    collectPowerUps();
    
    // Increase speed over time
    currentSpeed += CONFIG.speedIncrease;
    
    // Update score
    score += CONFIG.scoreIncrement;
    scoreElement.textContent = 'Score: ' + Math.floor(score);
    updateStatusLabel();
    
    // Check collisions
    if (checkCollisions()) {
        gameOver();
        return;
    }
    
    // Draw
    drawSky();
    drawGround();
    drawPowerUps();
    drawObstacles();
    drawTurkey();
    
    requestAnimationFrame(gameLoop);
}

// Jump control
function jump() {
    if (!gameRunning) return;
    if (turkey.grounded || state.jumpsLeft > 0) {
        turkey.velocityY = CONFIG.jumpStrength;
        if (!turkey.grounded) {
            state.jumpsLeft -= 1;
        }
        turkey.grounded = false;
        setCrouch(false);
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (['Space', 'KeyW', 'ArrowUp'].includes(e.code)) {
        e.preventDefault();
        
        if (!gameRunning) {
            init();
            gameLoop();
        } else {
            jump();
        }
    }
    if (['KeyS', 'ArrowDown'].includes(e.code)) {
        setCrouch(true);
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        startDash();
    }
});

document.addEventListener('keyup', (e) => {
    if (['KeyS', 'ArrowDown'].includes(e.code)) {
        setCrouch(false);
    }
});

// Start game
loadImages();
setTimeout(() => {
    // Give images time to load
    scoreElement.textContent = 'Press SPACEBAR to start!';
    updateStatusLabel('Space/W/Up = jump (double). S/Down = slide. Shift = dash.');
}, 100);
