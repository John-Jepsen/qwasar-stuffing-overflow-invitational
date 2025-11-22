// STUDENT TODO: Adjust these values for gameplay tuning
const CONFIG = {
    minAngle: 10,        // Minimum launch angle (degrees)
    maxAngle: 80,        // Maximum launch angle (degrees)
    minPower: 5,         // Minimum launch power
    maxPower: 25,        // Maximum launch power
    gravity: 0.3,        // Gravity strength
    targetDistance: 400  // Distance to target
};

let angle = 45;
let power = 15;
let projectile = null;
let targets = [];
let score = 0;
let launches = 0;
let gameState = 'aiming'; // 'aiming' or 'flying'

// Projectile and target images (students will replace these)
let pumpkinImg;
let targetImgs = {};

// Stars for space background
let stars = [];

function preload() {
    // Try to load images, fall back to shapes if not found
    try {
        pumpkinImg = loadImage('assets/pumpkin.png', 
            () => console.log('Pumpkin loaded'),
            () => { console.log('Pumpkin image not found, using circle'); pumpkinImg = null; }
        );
        
        targetImgs.turkey = loadImage('assets/turkey.png',
            () => console.log('Turkey loaded'),
            () => { console.log('Turkey image not found, using shape'); targetImgs.turkey = null; }
        );
        
        targetImgs.barn = loadImage('assets/barn.png',
            () => console.log('Barn loaded'),
            () => { console.log('Barn image not found, using shape'); targetImgs.barn = null; }
        );
    } catch (e) {
        console.log('Error loading images:', e);
    }
}

function setup() {
    createCanvas(800, 600);

    // Create stars for space background
    for (let i = 0; i < 200; i++) {
        stars.push({
            x: random(width),
            y: random(height - 100), // Don't put stars below the ground
            size: random(1, 3),
            brightness: random(150, 255)
        });
    }

    // Create targets at different distances
    targets = [
        {
            x: 400,
            y: height - 100,
            w: 60,
            h: 80,
            type: 'turkey',
            hit: false,
            // Turkey movement properties
            baseY: height - 100,
            velocityY: 0,
            velocityX: 0,
            isJumping: false,
            direction: 1,
            speed: 0.5,
            jumpTimer: 0,
            nextJumpTime: random(120, 240) // Random time until next jump (2-4 seconds at 60fps)
        },
        { x: 550, y: height - 120, w: 100, h: 100, type: 'barn', hit: false }
    ];
}

function draw() {
    // Space background (dark blue to black gradient)
    for (let i = 0; i < height - 80; i++) {
        let inter = map(i, 0, height - 80, 0, 1);
        let c = lerpColor(color(10, 10, 40), color(0, 0, 0), inter);
        stroke(c);
        line(0, i, width, i);
    }

    // Draw stars
    noStroke();
    for (let star of stars) {
        fill(255, 255, 255, star.brightness);
        ellipse(star.x, star.y, star.size, star.size);
    }

    // Ground
    fill(101, 67, 33);
    rect(0, height - 80, width, 80);
    fill(34, 139, 34);
    rect(0, height - 90, width, 10);
    
    // Draw catapult base
    drawCatapult();

    // Update and draw targets
    updateTargets();
    drawTargets();
    
    // Update and draw projectile
    if (gameState === 'flying' && projectile) {
        updateProjectile();
        drawProjectile();
    }
    
    // Draw UI
    drawUI();
    
    // Instructions
    if (gameState === 'aiming') {
        fill(255);
        stroke(0);
        strokeWeight(3);
        textAlign(CENTER);
        textSize(18);
        text('SPACE to launch | UP/DOWN for angle | LEFT/RIGHT for power', width/2, 40);
    }
}

function drawCatapult() {
    push();
    translate(100, height - 90);
    
    // Base
    fill(101, 67, 33);
    rect(-30, 0, 60, 40);
    
    // Arm
    push();
    rotate(-radians(angle));
    stroke(101, 67, 33);
    strokeWeight(8);
    line(0, 0, 0, -80);
    
    // Bucket
    fill(139, 69, 19);
    ellipse(0, -80, 20, 20);
    pop();
    
    pop();
}

function updateTargets() {
    for (let target of targets) {
        if (target.hit || target.type !== 'turkey') continue;

        // Horizontal movement when not jumping
        if (!target.isJumping) {
            target.x += target.direction * target.speed;

            // Reverse direction at boundaries
            if (target.x > 650 || target.x < 300) {
                target.direction *= -1;
            }
        }

        // Jump timing
        target.jumpTimer++;

        // Start jump randomly
        if (!target.isJumping && target.jumpTimer >= target.nextJumpTime) {
            target.isJumping = true;
            target.velocityY = -14; // Jump strength - high enough to clear barn but stay on screen

            // Random jump direction: forward or backward
            let jumpDirection = random() > 0.5 ? 1 : -1;
            target.velocityX = jumpDirection * 5; // Horizontal jump speed

            target.jumpTimer = 0;
            target.nextJumpTime = random(90, 180); // Next jump in 1.5-3 seconds
        }

        // Apply physics when jumping
        if (target.isJumping) {
            target.velocityY += 0.4; // Gravity
            target.y += target.velocityY;
            target.x += target.velocityX; // Move horizontally during jump

            // Keep turkey within screen boundaries
            if (target.x < 50) {
                target.x = 50;
                target.velocityX = 0;
            }
            if (target.x > width - 50) {
                target.x = width - 50;
                target.velocityX = 0;
            }

            // Land back on ground
            if (target.y >= target.baseY) {
                target.y = target.baseY;
                target.velocityY = 0;
                target.velocityX = 0;
                target.isJumping = false;
            }
        }
    }
}

function drawTargets() {
    for (let target of targets) {
        if (target.hit) {
            continue; // Don't draw hit targets
        }
        
        push();
        
        const img = targetImgs[target.type];
        
        if (img && img.width > 0) {
            // Draw image if loaded
            imageMode(CENTER);
            image(img, target.x, target.y, target.w, target.h);
        } else {
            // Fallback shapes
            if (target.type === 'turkey') {
                // Simple turkey shape
                fill(139, 69, 19);
                ellipse(target.x, target.y, target.w * 0.8, target.h * 0.8);
                fill(165, 42, 42);
                triangle(target.x - 20, target.y - 20, 
                        target.x - 30, target.y - 30, 
                        target.x - 15, target.y - 30);
                fill(255, 200, 0);
                triangle(target.x - 10, target.y, target.x, target.y + 10, target.x - 5, target.y);
            } else if (target.type === 'barn') {
                // Simple barn shape
                fill(165, 42, 42);
                rectMode(CENTER);
                rect(target.x, target.y, target.w, target.h);
                fill(139, 69, 19);
                triangle(target.x - target.w/2, target.y - target.h/2,
                        target.x + target.w/2, target.y - target.h/2,
                        target.x, target.y - target.h/2 - 30);
            }
        }
        
        pop();
    }
}

function drawProjectile() {
    if (!projectile) return;
    
    push();
    
    if (pumpkinImg && pumpkinImg.width > 0) {
        imageMode(CENTER);
        image(pumpkinImg, projectile.x, projectile.y, 40, 40);
    } else {
        // Fallback: orange circle
        fill(255, 140, 0);
        stroke(255, 100, 0);
        strokeWeight(2);
        ellipse(projectile.x, projectile.y, 30, 30);
    }
    
    pop();
}

function updateProjectile() {
    if (!projectile) return;
    
    // Apply gravity
    projectile.vy += CONFIG.gravity;
    
    // Update position
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    
    // Check collision with targets
    for (let target of targets) {
        if (target.hit) continue;
        
        if (abs(projectile.x - target.x) < target.w/2 + 15 &&
            abs(projectile.y - target.y) < target.h/2 + 15) {
            target.hit = true;
            score += 100;
            console.log('Hit!');
        }
    }
    
    // Check if projectile is off screen or hit ground
    if (projectile.y > height - 90 || projectile.x > width || projectile.x < 0) {
        gameState = 'aiming';
        projectile = null;
        launches++;
    }
}

function drawUI() {
    // Score and stats
    fill(255);
    stroke(0);
    strokeWeight(3);
    textAlign(LEFT);
    textSize(20);
    text(`Score: ${score}`, 20, 30);
    text(`Launches: ${launches}`, 20, 60);
    
    if (gameState === 'aiming') {
        text(`Angle: ${angle}°`, 20, 90);
        text(`Power: ${power}`, 20, 120);
    }
    
    // Check if all targets hit
    if (targets.every(t => t.hit)) {
        fill(255, 215, 0);
        stroke(0);
        strokeWeight(5);
        textAlign(CENTER);
        textSize(48);
        text('🎉 ALL TARGETS HIT! 🎉', width/2, height/2);
        textSize(24);
        text(`Score: ${score} | Launches: ${launches}`, width/2, height/2 + 50);
        text('Refresh to play again!', width/2, height/2 + 90);
    }
}

function launchProjectile() {
    const launchAngle = radians(angle);
    
    projectile = {
        x: 100,
        y: height - 90,
        vx: cos(-launchAngle) * power,
        vy: sin(-launchAngle) * power
    };
    
    gameState = 'flying';
}

function keyPressed() {
    if (gameState === 'aiming') {
        // Adjust angle
        if (keyCode === UP_ARROW) {
            angle = constrain(angle + 2, CONFIG.minAngle, CONFIG.maxAngle);
        } else if (keyCode === DOWN_ARROW) {
            angle = constrain(angle - 2, CONFIG.minAngle, CONFIG.maxAngle);
        }
        
        // Adjust power
        if (keyCode === RIGHT_ARROW) {
            power = constrain(power + 0.5, CONFIG.minPower, CONFIG.maxPower);
        } else if (keyCode === LEFT_ARROW) {
            power = constrain(power - 0.5, CONFIG.minPower, CONFIG.maxPower);
        }
        
        // Launch
        if (key === ' ') {
            launchProjectile();
        }
    }
}
