const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverElement = document.getElementById('gameOver');

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
    velocityY: 0,
    grounded: false,
    image: null
};

// Ground position
const groundY = canvas.height - 80;
turkey.y = groundY - turkey.height;

// Obstacles array
let obstacles = [];
let nextObstacleFrame = CONFIG.obstacleFrequency;

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

// Initialize game
function init() {
    gameRunning = true;
    score = 0;
    frameCount = 0;
    currentSpeed = CONFIG.gameSpeed;
    obstacles = [];
    turkey.y = groundY - turkey.height;
    turkey.velocityY = 0;
    turkey.grounded = true;
    gameOverElement.style.display = 'none';
    nextObstacleFrame = CONFIG.obstacleFrequency;
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
                // Puddle shape
                ctx.beginPath();
                ctx.ellipse(obs.x + obs.width/2, obs.y + obs.height/2, 
                           obs.width/2, obs.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (obs.type === 'pumpkin') {
                // Circle pumpkin
                ctx.beginPath();
                ctx.arc(obs.x + obs.width/2, obs.y + obs.height/2, 
                       obs.width/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#000';
                ctx.fillRect(obs.x + obs.width/2 - 3, obs.y + 5, 6, 8);
            } else if (obs.type === 'pie') {
                // Triangle pie slice
                ctx.beginPath();
                ctx.moveTo(obs.x + obs.width/2, obs.y);
                ctx.lineTo(obs.x, obs.y + obs.height);
                ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
                ctx.closePath();
                ctx.fill();
            }
        }
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
    } else {
        turkey.grounded = false;
    }
}

// Spawn obstacles
function spawnObstacle() {
    if (frameCount >= nextObstacleFrame) {
        const obstacleTemplate = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
        
        const obstacle = {
            x: canvas.width,
            y: groundY - obstacleTemplate.height,
            width: obstacleTemplate.width,
            height: obstacleTemplate.height,
            type: obstacleTemplate.type,
            image: obstacleTemplate.loadedImage,
            passed: false
        };
        
        obstacles.push(obstacle);
        nextObstacleFrame = frameCount + Math.max(
            CONFIG.minObstacleGap,
            CONFIG.obstacleFrequency - Math.floor(score / 500)
        );
    }
}

// Update obstacles
function updateObstacles() {
    obstacles.forEach(obs => {
        obs.x -= currentSpeed;
        
        // Award points for passing obstacle
        if (!obs.passed && obs.x + obs.width < turkey.x) {
            obs.passed = true;
            score += CONFIG.obstaclePoints;
        }
    });
    
    // Remove off-screen obstacles
    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}

// Check collisions
function checkCollisions() {
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
    updateObstacles();
    
    // Increase speed over time
    currentSpeed += CONFIG.speedIncrease;
    
    // Update score (STUDENT TODO: Confirm score increases)
    score += CONFIG.scoreIncrement;
    scoreElement.textContent = 'Score: ' + Math.floor(score);
    
    // Check collisions
    if (checkCollisions()) {
        gameOver();
        return;
    }
    
    // Draw
    drawGround();
    drawObstacles();
    drawTurkey();
    
    requestAnimationFrame(gameLoop);
}

// Jump control
function jump() {
    if (turkey.grounded && gameRunning) {
        turkey.velocityY = CONFIG.jumpStrength;
        turkey.grounded = false;
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        
        if (!gameRunning) {
            init();
            gameLoop();
        } else {
            jump();
        }
    }
});

// Start game
loadImages();
setTimeout(() => {
    // Give images time to load
    scoreElement.textContent = 'Press SPACEBAR to start!';
}, 100);
