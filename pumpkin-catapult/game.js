// STUDENT TODO: Adjust these values for gameplay tuning
const CONFIG = {
    minAngle: 10,        // Minimum launch angle (degrees)
    maxAngle: 80,        // Maximum launch angle (degrees)
    minPower: 5,         // Minimum launch power
    maxPower: 25,        // Maximum launch power
    gravity: 0.3,        // Gravity strength
    targetDistance: 400  // Distance to target
};

// Optional sprite set toggle (use alt art without changing gameplay)
const SPRITE_SET = 'default'; // set to 'contrib-0bitbybit' to try 0bitbybit's alt sprites
const PUMPKIN_SPRITE = SPRITE_SET === 'contrib-0bitbybit'
    ? 'assets/contrib-0bitbybit/pumpkin.png'
    : 'assets/pumpkin.png';
const TURKEY_SPRITE = SPRITE_SET === 'contrib-0bitbybit'
    ? 'assets/contrib-0bitbybit/turkey.png'
    : 'assets/turkey.png';

let angle = 45;
let power = 15;
let projectile = null;
let targets = [];
let score = 0;
let launches = 0;
let maxLaunches = 15; // Maximum number of projectiles allowed
let gameState = 'aiming'; // 'aiming' or 'flying'
let wind = 0; // Wind speed (negative = left, positive = right)
let floatingTexts = []; // Score popups when hitting targets
let level = 1; // Current level (1, 2, or 3)
let explosions = []; // Explosion particles for barn hits

// Projectile and target images (students will replace these)
let pumpkinImg;
let targetImgs = {};
let backgroundImg;

function preload() {
    // Try to load images, fall back to shapes if not found
    try {
        backgroundImg = loadImage('assets/background.png',
            () => console.log('Background loaded'),
            () => { console.log('Background image not found, using gradient'); backgroundImg = null; }
        );
        
        pumpkinImg = loadImage(PUMPKIN_SPRITE, 
            () => console.log('Pumpkin loaded'),
            () => { console.log('Pumpkin image not found, using circle'); pumpkinImg = null; }
        );
        
        targetImgs.turkey = loadImage(TURKEY_SPRITE,
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
    restartGame();
}

function restartGame() {
    // Reset all game state
    angle = 45;
    power = 15;
    projectile = null;
    score = 0;
    launches = 0;
    gameState = 'aiming';
    floatingTexts = [];
    explosions = [];
    level = 1; // Start at level 1
    
    // Random wind (-0.3 to 0.3)
    wind = (Math.random() - 0.5) * 0.6;
    
    // Create targets at random distances and heights
    targets = generateRandomTargets();
}

function generateRandomTargets() {
    const newTargets = [];
    
    // Level configuration
    // Level 1: 3 barns, 2 walking, 5 flying, speed factor 1.0
    // Level 2: 4 barns, 3 walking, 6 flying, speed factor 1.2
    // Level 3: 5 barns, 4 walking, 7 flying, speed factor 1.44 (1.2^2)
    const numBarns = 3 + (level - 1);
    const numWalkingTurkeys = 2 + (level - 1);
    const numFlyingTurkeys = 5 + (level - 1);
    const speedFactor = Math.pow(1.2, level - 1);
    
    // Create 3 barns first
    for (let i = 0; i < numBarns; i++) {
        const type = 'barn';
        
        let x, y, w, h, vx, vy, platformHeight, flying;
        
        if (type === 'turkey') {
            // Turkeys fly in the air - spread across wider area
            x = 200 + i * 60 + Math.random() * 40;
            y = 80 + Math.random() * 280; // Flying height (80-360)
            
            // Random turkey size: small (hard to hit), medium, or large (easy to hit)
            const sizes = [
                { scale: 0.5, points: 130, w: 30, h: 40 },   // Small
                { scale: 1.0, points: 100, w: 60, h: 80 },   // Medium
                { scale: 1.5, points: 70, w: 90, h: 120 }    // Large
            ];
            const sizeData = sizes[Math.floor(Math.random() * sizes.length)];
            w = sizeData.w;
            h = sizeData.h;
            
            // Flying motion with horizontal and vertical movement
            vx = (Math.random() - 0.5) * 4;
            if (Math.abs(vx) < 1) vx = vx < 0 ? -1.5 : 1.5;
            
            // Gentle up/down motion
            vy = (Math.random() - 0.5) * 1.5;
            
            platformHeight = 0;
            flying = true;
            
            newTargets.push({ 
                x, 
                y, 
                w, 
                h, 
                type, 
                hit: false,
                platformHeight,
                vx, // horizontal velocity
                vy, // vertical velocity (for flying)
                flying,
                points: sizeData.points, // Points for this turkey size
                minX: 150,
                maxX: 850,
                minY: 50, // flight boundaries
                maxY: 400
            });
        } else {
            // Barns stay on platforms - keep them away from catapult (after x=250)
            w = 100;
            h = 100;
            x = 250 + i * 150 + Math.random() * 50;
            platformHeight = Math.floor(Math.random() * 4) * 40; // 0, 40, 80, or 120
            y = height - 90 - platformHeight - h/2;
            
            vx = 0; // Barns don't move
            vy = 0;
            flying = false;
            
            newTargets.push({ 
                x, 
                y, 
                w, 
                h, 
                type, 
                hit: false,
                platformHeight,
                vx, // horizontal velocity
                vy, // vertical velocity (for flying)
                flying,
                points: 50, // Barns are worth 50 points
                minX: 250, // barns stay away from catapult
                maxX: 850,
                minY: 50, // flight boundaries
                maxY: 400
            });
        }
    }
    
    // Create 2 walking turkeys
    for (let i = 0; i < numWalkingTurkeys; i++) {
        const type = 'turkey';
        
        let x, y, w, h, vx, vy, platformHeight, flying;
        
        // Random turkey size
        const sizes = [
            { scale: 0.5, points: 130, w: 30, h: 40 },   // Small
            { scale: 1.0, points: 100, w: 60, h: 80 },   // Medium
            { scale: 1.5, points: 70, w: 90, h: 120 }    // Large
        ];
        const sizeData = sizes[Math.floor(Math.random() * sizes.length)];
        w = sizeData.w;
        h = sizeData.h;
        
        // Walking turkeys on ground
        x = 300 + i * 200 + Math.random() * 50;
        platformHeight = 0; // On ground
        y = height - 90 - h/2;
        
        // Walk horizontally (with speed factor)
        vx = (Math.random() - 0.5) * 5 * speedFactor;
        if (Math.abs(vx) < 1 * speedFactor) vx = vx < 0 ? -1.5 * speedFactor : 1.5 * speedFactor;
        vy = 0;
        flying = false;
        
        newTargets.push({ 
            x, 
            y, 
            w, 
            h, 
            type, 
            hit: false,
            platformHeight,
            vx, // horizontal velocity
            vy, // vertical velocity
            flying,
            points: sizeData.points, // Points for this turkey size
            minX: 250,
            maxX: 850,
            minY: 50,
            maxY: 400
        });
    }
    
    // Create 5 flying turkeys
    for (let i = 0; i < numFlyingTurkeys; i++) {
        const type = 'turkey';
        
        let x, y, w, h, vx, vy, platformHeight, flying;
        
        // Turkeys fly in the air - spread across wider area
        x = 200 + i * 100 + Math.random() * 50;
        y = 80 + Math.random() * 280; // Flying height (80-360)
        
        // Random turkey size: small (hard to hit), medium, or large (easy to hit)
        const sizes = [
            { scale: 0.5, points: 130, w: 30, h: 40 },   // Small
            { scale: 1.0, points: 100, w: 60, h: 80 },   // Medium
            { scale: 1.5, points: 70, w: 90, h: 120 }    // Large
        ];
        const sizeData = sizes[Math.floor(Math.random() * sizes.length)];
        w = sizeData.w;
        h = sizeData.h;
        
        // Flying motion with horizontal and vertical movement (with speed factor)
        vx = (Math.random() - 0.5) * 4 * speedFactor;
        if (Math.abs(vx) < 1 * speedFactor) vx = vx < 0 ? -1.5 * speedFactor : 1.5 * speedFactor;
        
        // Gentle up/down motion (with speed factor)
        vy = (Math.random() - 0.5) * 1.5 * speedFactor;
        
        platformHeight = 0;
        flying = true;
        
        newTargets.push({ 
            x, 
            y, 
            w, 
            h, 
            type, 
            hit: false,
            platformHeight,
            vx, // horizontal velocity
            vy, // vertical velocity (for flying)
            flying,
            points: sizeData.points, // Points for this turkey size
            minX: 150,
            maxX: 850,
            minY: 50, // flight boundaries
            maxY: 400
        });
    }
    
    return newTargets;
}

function draw() {
    // Background
    if (backgroundImg && backgroundImg.width > 0) {
        image(backgroundImg, 0, 0, width, height);
    } else {
        // Fallback: Sky and ground
        background(135, 206, 235);
        
        // Ground
        fill(101, 67, 33);
        rect(0, height - 80, width, 80);
        fill(34, 139, 34);
        rect(0, height - 90, width, 10);
    }
    
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
    
    // Update and draw explosions
    updateExplosions();
    drawExplosions();
    
    // Update and draw floating score texts
    updateFloatingTexts();
    drawFloatingTexts();
    
    // Draw UI
    drawUI();
    
    // Instructions at bottom
    if (gameState === 'aiming') {
        fill(255);
        stroke(0);
        strokeWeight(3);
        textAlign(CENTER);
        textSize(18);
        text('SPACE to launch | UP/DOWN for angle | LEFT/RIGHT for power | R to restart', width/2, height - 20);
    }
    
    // Visual wind indicator in sky
    drawWindIndicator();
}

function drawWindIndicator() {
    if (Math.abs(wind) < 0.01) return;
    
    push();
    translate(width - 100, 80);
    
    // Wind particles/lines
    stroke(255, 255, 255, 150);
    strokeWeight(2);
    noFill();
    
    const windStrength = Math.abs(wind) * 100;
    const direction = wind > 0 ? 1 : -1;
    
    for (let i = 0; i < 3; i++) {
        const offset = (frameCount * 2 + i * 20) % 60;
        const x = direction * offset;
        line(x - 20, i * 15, x, i * 15);
        // Arrow head
        line(x, i * 15, x - direction * 5, i * 15 - 3);
        line(x, i * 15, x - direction * 5, i * 15 + 3);
    }
    
    pop();
}

function createExplosion(x, y) {
    // Create 20 particles for explosion
    for (let i = 0; i < 20; i++) {
        const angle = random(TWO_PI);
        const speed = random(2, 6);
        explosions.push({
            x: x,
            y: y,
            vx: cos(angle) * speed,
            vy: sin(angle) * speed,
            alpha: 255,
            size: random(4, 10),
            color: random(['#FF4500', '#FF6347', '#FFA500', '#FFD700'])
        });
    }
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const particle = explosions[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2; // Gravity
        particle.alpha -= 8;
        
        // Remove when faded
        if (particle.alpha <= 0) {
            explosions.splice(i, 1);
        }
    }
}

function drawExplosions() {
    for (let particle of explosions) {
        push();
        noStroke();
        fill(particle.color + Math.floor(particle.alpha).toString(16).padStart(2, '0'));
        ellipse(particle.x, particle.y, particle.size);
        pop();
    }
}

function updateFloatingTexts() {
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        floatingTexts[i].y += floatingTexts[i].vy;
        floatingTexts[i].alpha -= 5;
        
        // Remove when faded out
        if (floatingTexts[i].alpha <= 0) {
            floatingTexts.splice(i, 1);
        }
    }
}

function drawFloatingTexts() {
    for (let ft of floatingTexts) {
        push();
        fill(255, 215, 0, ft.alpha);
        stroke(0, 0, 0, ft.alpha);
        strokeWeight(3);
        textAlign(CENTER);
        textSize(32);
        text(ft.text, ft.x, ft.y);
        pop();
    }
}

function drawCatapult() {
    push();
    translate(100, height - 90);
    
    // Base
    fill(101, 67, 33);
    stroke(0);
    strokeWeight(3);
    rect(-30, 0, 60, 40);
    
    // Arm
    push();
    rotate(-radians(angle));
    stroke(0);
    strokeWeight(10);
    line(0, 0, 0, -80);
    
    // Bucket
    fill(139, 69, 19);
    stroke(0);
    strokeWeight(3);
    ellipse(0, -80, 20, 20);
    pop();
    
    pop();
}

function updateTargets() {
    for (let target of targets) {
        // Hit turkeys fall off the screen
        if (target.hit && target.type === 'turkey') {
            target.vy += 0.5; // Apply gravity
            target.y += target.vy;
            target.x += target.vx * 0.5; // Slow horizontal movement
            
            // Mark as fully fallen when off screen
            if (target.y > height) {
                target.offScreen = true;
            }
            continue;
        }
        
        if (target.hit) continue;
        
        // Move target horizontally
        target.x += target.vx;
        
        // Bounce off horizontal boundaries
        if (target.x < target.minX || target.x > target.maxX) {
            target.vx *= -1;
            target.x = constrain(target.x, target.minX, target.maxX);
        }
        
        // If flying (turkey), also move vertically
        if (target.flying) {
            target.y += target.vy;
            
            // Bounce off vertical boundaries
            if (target.y < target.minY || target.y > target.maxY) {
                target.vy *= -1;
                target.y = constrain(target.y, target.minY, target.maxY);
            }
        }
    }
}

function drawTargets() {
    for (let target of targets) {
        // Skip hit barns and turkeys that fell off screen
        if ((target.hit && target.type === 'barn') || target.offScreen) {
            continue;
        }
        
        push();
        
        // Draw platform if target is elevated (and not flying)
        if (target.platformHeight > 0 && !target.flying) {
            fill(139, 90, 43);
            stroke(101, 67, 33);
            strokeWeight(2);
            const platformWidth = target.w + 30;
            const platformY = height - 90 - target.platformHeight;
            rect(target.x - platformWidth/2, platformY, platformWidth, target.platformHeight);
            
            // Platform top
            fill(160, 110, 60);
            rect(target.x - platformWidth/2, platformY - 5, platformWidth, 5);
        }
        
        // Use emojis for targets
        textAlign(CENTER, CENTER);
        if (target.type === 'turkey') {
            textSize(target.h * 0.8);
            // Flip turkey based on movement direction
            push();
            translate(target.x, target.y);
            if (target.vx > 0) {
                scale(-1, 1); // Flip horizontally when moving right
            }
            text('🦃', 0, 0);
            pop();
        } else if (target.type === 'barn') {
            textSize(target.h * 0.8);
            text('🏠', target.x, target.y);
        }
        
        pop();
    }
}

function drawProjectile() {
    if (!projectile) return;
    
    push();
    
    // Use pumpkin emoji
    textAlign(CENTER, CENTER);
    textSize(40);
    text('🎃', projectile.x, projectile.y);
    
    pop();
}

function updateProjectile() {
    if (!projectile) return;
    
    // Apply gravity
    projectile.vy += CONFIG.gravity;
    
    // Apply wind to horizontal velocity
    projectile.vx += wind;
    
    // Update position
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    
    // Check collision with targets
    for (let target of targets) {
        if (target.hit) continue;
        
        if (abs(projectile.x - target.x) < target.w/2 + 15 &&
            abs(projectile.y - target.y) < target.h/2 + 15) {
            target.hit = true;
            score += target.points;
            console.log(`Hit ${target.type}! +${target.points} points`);
            
            // Create floating score text
            floatingTexts.push({
                text: `${target.points}$`,
                x: target.x,
                y: target.y,
                alpha: 255,
                vy: -2 // Float upward
            });
            
            // Create explosion for barn
            if (target.type === 'barn') {
                createExplosion(target.x, target.y);
            }
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
    text(`Level: ${level}`, 20, 30);
    text(`Score: ${score}`, 20, 60);
    text(`Pumpkins: ${maxLaunches - launches}/${maxLaunches}`, 20, 90);
    
    if (gameState === 'aiming') {
        text(`Angle: ${angle}°`, 20, 120);
        text(`Power: ${power}`, 20, 150);
        
        // Wind indicator
        const windDir = wind > 0 ? '→' : wind < 0 ? '←' : '•';
        const windStr = `Wind: ${windDir} ${Math.abs(wind).toFixed(2)}`;
        text(windStr, 20, 180);
    }
    
    // Check if all targets hit
    if (targets.every(t => t.hit)) {
        fill(255, 215, 0);
        stroke(0);
        strokeWeight(5);
        textAlign(CENTER);
        textSize(48);
        if (level < 3) {
            text('🎉 LEVEL COMPLETE! 🎉', width/2, height/2);
            textSize(24);
            text(`Score: ${score} | Launches: ${launches}`, width/2, height/2 + 50);
            text('Press SPACE for next level | R to restart', width/2, height/2 + 90);
        } else {
            text('🏆 ALL LEVELS COMPLETE! 🏆', width/2, height/2);
            textSize(24);
            text(`Final Score: ${score} | Total Launches: ${launches}`, width/2, height/2 + 50);
            text('Press R to play again!', width/2, height/2 + 90);
        }
    }
    // Check if out of projectiles
    else if (launches >= maxLaunches && gameState === 'aiming') {
        fill(255, 100, 100);
        stroke(0);
        strokeWeight(5);
        textAlign(CENTER);
        textSize(48);
        text('GAME OVER!', width/2, height/2);
        textSize(24);
        const targetsHit = targets.filter(t => t.hit).length;
        text(`Score: ${score} | Targets Hit: ${targetsHit}/${targets.length}`, width/2, height/2 + 50);
        text('Press R to try again!', width/2, height/2 + 90);
    }
}

function launchProjectile() {
    // Check if player has projectiles left
    if (launches >= maxLaunches) {
        return;
    }
    
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
    // Restart game
    if (key === 'r' || key === 'R') {
        restartGame();
        return;
    }
    
    // Advance to next level when all targets hit
    if (key === ' ' && targets.every(t => t.hit) && level < 3) {
        level++;
        launches = 0;
        floatingTexts = [];
        explosions = [];
        wind = (Math.random() - 0.5) * 0.6;
        targets = generateRandomTargets();
        gameState = 'aiming';
        return;
    }
    
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
