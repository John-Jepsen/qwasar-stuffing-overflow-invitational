let maze;
let player;
let gameState = 'playing'; // 'playing', 'won', 'lost', 'escaped'
let startTime;
let remainingTime;
let currentLevel = 0;
let cellSize = MAZE_CONFIG.cellSize;
// STUDENT TODO: Add turkey sprite image
let turkeyImg;
let stuffingTexture;
let activeDirection = null;
let lastMoveTime = 0;
let lastKeyPressTime = 0;
const HOLD_DELAY = 100;   // ms before repeating starts
const REPEAT_RATE = 100;  // ms between repeats

function preload() {
    // Load stuffing background
    try {
        stuffingTexture = loadImage('assets/stuffing.png',
            () => console.log('Stuffing background loaded'),
            () => { 
                console.log('Stuffing background not found, using solid color'); 
                stuffingTexture = null; 
            }
        );
    } catch (e) {
        console.log('Error loading stuffing background:', e);
        stuffingTexture = null;
    }

    // Try to load turkey sprite
    try {
        turkeyImg = loadImage('assets/turkey.png',
            () => console.log('Turkey sprite loaded'),
            () => { 
                console.log('Turkey sprite not found, using fallback shape'); 
                turkeyImg = null; 
            }
        );
    } catch (e) {
        console.log('Error loading turkey sprite:', e);
        turkeyImg = null;
    }
}

function setup() {
    gameState = "playing"
    currentLevel = 0;
    let canvas = createCanvas(
        MAZE_CONFIG.cols * MAZE_CONFIG.cellSize + 200,
        MAZE_CONFIG.rows * MAZE_CONFIG.cellSize + 100
    );
    canvas.parent('game-container');
    
    start_level(0)
    
    textFont('Arial');
}

function start_level(n)
{
    // Generate maze
    let rows = MAZE_CONFIG.rows + n * 5;
    let cols = MAZE_CONFIG.cols + n * 5;

    cellSize = 500 / rows;

    maze = new Maze(rows, cols);
    
    // Initialize player at start (top-left)
    player = {
        row: 0,
        col: 0,
        targetRow: rows - 1,
        targetCol: cols - 1
    };
    
    // Start timer
    startTime = millis();
    remainingTime = MAZE_CONFIG.timeLimit;
}

function draw() {
    background(240, 230, 210);
    
    // Update timer
    if (gameState === 'playing') {
        remainingTime = MAZE_CONFIG.timeLimit - floor((millis() - startTime) / 1000);
        
        if (remainingTime <= 0) {
            remainingTime = 0;
            gameState = 'lost';
        }
    }

    // Handle held movement with repeat
    if (gameState === 'playing') {
        handleHeldMovement();
        if (player.row === player.targetRow && player.col === player.targetCol) {
            gameState = 'won';
        }
    }
    
    // Center maze on canvas
    let offsetX = 50;
    let offsetY = 50;
    
    push();
    translate(offsetX, offsetY);

    // Draw maze background (single stuffing texture across full maze)
    let mazeWidth = maze.cols * cellSize;
    let mazeHeight = maze.rows * cellSize;
    noStroke();
    if (stuffingTexture && stuffingTexture.width > 0) {
        imageMode(CORNER);
        image(stuffingTexture, 0, 0, mazeWidth, mazeHeight);
    } else {
        fill(210, 180, 140);
        rect(0, 0, mazeWidth, mazeHeight);
    }
    
    // Draw maze
    drawMaze();
    
    // Draw goal
    drawGoal();
    
    // Draw player
    drawPlayer();
    
    pop();
    
    // Draw HUD
    drawHUD(offsetX, offsetY);
    
    // Draw game over messages
    if (gameState === 'won') {
        activeDirection = null; // Stop movement repeat when finishing a level
        currentLevel += 1;
        if (currentLevel >= 4)
        {
            gameState = 'escaped'
            drawWinMessage();
        }
        else
        {
            gameState = 'playing';
            start_level(currentLevel);
        }
    } else if (gameState === 'escaped') {
        drawWinMessage();
    } else if (gameState === 'lost') {
        drawLoseMessage();
    }
}

function drawMaze() {
    // First pass: draw all thick (now dark) wall bases for continuity
    stroke(100, 50, 10); // Dark brown, thick
    strokeWeight(7);
    for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
            let cell = maze.grid[r][c];
            let x = c * cellSize;
            let y = r * cellSize;
            if (cell.walls.top) {
                line(x, y, x + cellSize, y);
            }
            if (cell.walls.right) {
                line(x + cellSize, y, x + cellSize, y + cellSize);
            }
            if (cell.walls.bottom) {
                line(x, y + cellSize, x + cellSize, y + cellSize);
            }
            if (cell.walls.left) {
                line(x, y, x, y + cellSize);
            }
        }
    }

    // Second pass: draw all thin (now green) wall tops
    stroke(190, 210, 170); // Soft green, thin
    strokeWeight(3);
    for (let r = 0; r < maze.rows; r++) {
        for (let c = 0; c < maze.cols; c++) {
            let cell = maze.grid[r][c];
            let x = c * cellSize;
            let y = r * cellSize;
            if (cell.walls.top) {
                line(x, y, x + cellSize, y);
            }
            if (cell.walls.right) {
                line(x + cellSize, y, x + cellSize, y + cellSize);
            }
            if (cell.walls.bottom) {
                line(x, y + cellSize, x + cellSize, y + cellSize);
            }
            if (cell.walls.left) {
                line(x, y, x, y + cellSize);
            }
        }
    }
}

function drawGoal() {
    let x = player.targetCol * cellSize;
    let y = player.targetRow * cellSize;
    
    // Pulsing green goal
    let pulse = sin(millis() / 200) * 20 + 200;
    fill(50, pulse, 50, 150);
    noStroke();
    rect(x + 5, y + 5, cellSize - 10, cellSize - 10);
    
    // Goal text
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(16);
    text('EXIT', x + cellSize / 2, y + cellSize / 2);
}

function drawPlayer() {
    let x = player.col * cellSize + cellSize / 2;
    let y = player.row * cellSize + cellSize / 2;
    let size = cellSize * 0.7 * 2; // Double the size

    if (turkeyImg && turkeyImg.width > 0) {
        // Draw turkey image at 2x size
        imageMode(CENTER);
        image(turkeyImg, x, y, size, size);
    }
}

function drawHUD(offsetX, offsetY) {
    let hudY = offsetY + 500 + 20;
    
    textAlign(LEFT);
    textSize(20);
    fill(51);
    
    // Timer (STUDENT TODO: Confirm countdown timer is visible)
    let timerColor = remainingTime < 10 ? color(220, 20, 60) : color(51);
    fill(timerColor);
    text(`Time: ${remainingTime}s`, offsetX, hudY);
    
    // Position
    fill(51);
    text(`Position: (${player.row}, ${player.col})`, offsetX + 100, hudY);
    
    // Goal
    text(`Goal: (${player.targetRow}, ${player.targetCol})`, offsetX + 250, hudY);

    text(`Level: (${currentLevel + 1}/4)`, offsetX + 400, hudY);
}

function drawWinMessage() {
    push();
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);
    
    fill(255, 215, 0);
    stroke(0);
    strokeWeight(3);
    textAlign(CENTER, CENTER);
    textSize(48);
    text('🎉 YOU ESCAPED! 🎉', width / 2, height / 2 - 40);
    
    textSize(24);
    fill(255);
    let timeSpent = MAZE_CONFIG.timeLimit - remainingTime;
    text(`Time: ${timeSpent} seconds`, width / 2, height / 2 + 20);
    text('Press R to play again', width / 2, height / 2 + 60);
    pop();
}

function drawLoseMessage() {
    push();
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);
    
    fill(220, 20, 60);
    stroke(0);
    strokeWeight(3);
    textAlign(CENTER, CENTER);
    textSize(48);
    text('⏰ TIME\'S UP! ⏰', width / 2, height / 2 - 40);
    
    textSize(24);
    fill(255);
    text('You got caught in the stuffing!', width / 2, height / 2 + 20);
    text('Press R to try again', width / 2, height / 2 + 60);
    pop();
}

function keyPressed() {
    if (gameState !== 'playing') {
        if (key === 'r' || key === 'R') {
            // Restart game
            setup();
        }
        return;
    }
    
    const dir = directionFromKey(key, keyCode);
    if (dir) {
        activeDirection = dir;
        lastKeyPressTime = millis();
        lastMoveTime = millis();
        if (attemptMove(dir) && player.row === player.targetRow && player.col === player.targetCol) {
            gameState = 'won';
        }
    }
}

function keyReleased() {
    const dir = directionFromKey(key, keyCode);
    if (dir && dir === activeDirection) {
        activeDirection = null;
    }
}

function directionFromKey(keyChar, code) {
    if (code === UP_ARROW || keyChar === 'w' || keyChar === 'W') return 'up';
    if (code === DOWN_ARROW || keyChar === 's' || keyChar === 'S') return 'down';
    if (code === LEFT_ARROW || keyChar === 'a' || keyChar === 'A') return 'left';
    if (code === RIGHT_ARROW || keyChar === 'd' || keyChar === 'D') return 'right';
    return null;
}

function attemptMove(direction) {
    if (maze.canMove(player.row, player.col, direction)) {
        if (direction === 'up') player.row--;
        if (direction === 'down') player.row++;
        if (direction === 'left') player.col--;
        if (direction === 'right') player.col++;
        return true;
    }
    return false;
}

function handleHeldMovement() {
    if (!activeDirection) return;
    const now = millis();
    if (now - lastKeyPressTime < HOLD_DELAY) return;
    if (now - lastMoveTime < REPEAT_RATE) return;
    if (attemptMove(activeDirection)) {
        lastMoveTime = now;
    } else {
        // Stop repeating if blocked to avoid unnecessary checks
        lastMoveTime = now;
    }
}
