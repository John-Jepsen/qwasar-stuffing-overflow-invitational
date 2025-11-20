const canvas = document.getElementById('tetris');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

const BLOCK_SIZE = 30;
const ROWS = 20;
const COLS = 10;

let score = 0;
let gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Tetromino shapes
const SHAPES = [
    [[1, 1, 1, 1]], // I
    [[1, 1], [1, 1]], // O
    [[0, 1, 0], [1, 1, 1]], // T
    [[1, 0, 0], [1, 1, 1]], // L
    [[0, 0, 1], [1, 1, 1]], // J
    [[0, 1, 1], [1, 1, 0]], // S
    [[1, 1, 0], [0, 1, 1]]  // Z
];

const COLORS = ['#ff6b35', '#f7931e', '#fdc400', '#c1272d', '#8b4513', '#d2691e', '#cd853f'];

// Load block textures (students will replace these)
const blockImages = {};
const TEXTURE_NAMES = ['turkey', 'pumpkin', 'leaf', 'pie', 'corn', 'acorn', 'cranberry'];

function loadTextures() {
    TEXTURE_NAMES.forEach((name, i) => {
        const img = new Image();
        img.src = `assets/squares/${name}.png`;
        img.onerror = () => {
            // Fallback to colored squares if image not found
            console.log(`Texture ${name}.png not found, using color fallback`);
        };
        blockImages[i + 1] = img;
    });
}

// Sound effects (students will replace these)
const sounds = {
    lineClear: new Audio('sounds/alert.mp3'),
    gameOver: new Audio('sounds/sad.mp3'),
    move: new Audio('sounds/swoosh.mp3')
};

// Handle missing sounds gracefully
Object.keys(sounds).forEach(key => {
    sounds[key].onerror = () => {
        console.log(`Sound ${key} not found`);
    };
});

// Current piece
let currentPiece = {
    shape: [],
    color: 0,
    x: 0,
    y: 0
};

function newPiece() {
    const shapeIndex = Math.floor(Math.random() * SHAPES.length);
    currentPiece = {
        shape: SHAPES[shapeIndex],
        color: shapeIndex + 1,
        x: Math.floor(COLS / 2) - 1,
        y: 0
    };
    
    if (collision()) {
        // Game over
        alert('Game Over! Score: ' + score);
        gameBoard = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
        score = 0;
        scoreElement.textContent = 'Score: ' + score;
        try {
            sounds.gameOver.play();
        } catch (e) {}
    }
}

function collision() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const newX = currentPiece.x + col;
                const newY = currentPiece.y + row;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                if (newY >= 0 && gameBoard[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function merge() {
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const boardY = currentPiece.y + row;
                const boardX = currentPiece.x + col;
                if (boardY >= 0) {
                    gameBoard[boardY][boardX] = currentPiece.color;
                }
            }
        }
    }
}

function rotate() {
    const newShape = currentPiece.shape[0].map((_, i) =>
        currentPiece.shape.map(row => row[i]).reverse()
    );
    const previousShape = currentPiece.shape;
    currentPiece.shape = newShape;
    
    if (collision()) {
        currentPiece.shape = previousShape;
    }
}

function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (gameBoard[row].every(cell => cell !== 0)) {
            gameBoard.splice(row, 1);
            gameBoard.unshift(Array(COLS).fill(0));
            linesCleared++;
            row++; // Check this row again
        }
    }
    
    if (linesCleared > 0) {
        score += linesCleared * 100;
        scoreElement.textContent = 'Score: ' + score;
        
        // STUDENT TODO: Play "Gobble gobble!" sound here
         const gobbleSound = new Audio('sounds/gobble.mp3');
        gobbleSound.play();
        try {
            sounds.lineClear.play();
        } catch (e) {}
    }
}

function moveDown() {
    currentPiece.y++;
    if (collision()) {
        currentPiece.y--;
        merge();
        clearLines();
        newPiece();
    }
}

function moveLeft() {
    currentPiece.x--;
    if (collision()) {
        currentPiece.x++;
    } else {
        try {
            sounds.move.play();
        } catch (e) {}
    }
}

function moveRight() {
    currentPiece.x++;
    if (collision()) {
        currentPiece.x--;
    } else {
        try {
            sounds.move.play();
        } catch (e) {}
    }
}

function hardDrop() {
    while (!collision()) {
        currentPiece.y++;
    }
    currentPiece.y--;
    merge();
    clearLines();
    newPiece();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1a0f0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw board
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (gameBoard[row][col]) {
                const color = gameBoard[row][col];
                const img = blockImages[color];
                
                if (img && img.complete && img.naturalHeight !== 0) {
                    ctx.drawImage(img, col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                } else {
                    // Fallback to colored squares
                    ctx.fillStyle = COLORS[color - 1];
                    ctx.fillRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(col * BLOCK_SIZE, row * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }
    
    // Draw current piece
    for (let row = 0; row < currentPiece.shape.length; row++) {
        for (let col = 0; col < currentPiece.shape[row].length; col++) {
            if (currentPiece.shape[row][col]) {
                const x = (currentPiece.x + col) * BLOCK_SIZE;
                const y = (currentPiece.y + row) * BLOCK_SIZE;
                const img = blockImages[currentPiece.color];
                
                if (img && img.complete && img.naturalHeight !== 0) {
                    ctx.drawImage(img, x, y, BLOCK_SIZE, BLOCK_SIZE);
                } else {
                    ctx.fillStyle = COLORS[currentPiece.color - 1];
                    ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                    ctx.strokeStyle = '#000';
                    ctx.strokeRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
                }
            }
        }
    }
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        moveLeft();
    } else if (e.key === 'ArrowRight') {
        moveRight();
    } else if (e.key === 'ArrowDown') {
        moveDown();
    } else if (e.key === 'ArrowUp') {
        rotate();
    } else if (e.key === ' ') {
        e.preventDefault();
        hardDrop();
    }
    draw();
});

// Game loop
let lastTime = 0;
const DROP_INTERVAL = 1000; // ms

function gameLoop(timestamp) {
    if (timestamp - lastTime > DROP_INTERVAL) {
        moveDown();
        lastTime = timestamp;
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Initialize
loadTextures();
newPiece();
requestAnimationFrame(gameLoop);
