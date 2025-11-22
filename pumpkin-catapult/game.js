// STUDENT TODO: Adjust these values for gameplay tuning
const CONFIG = {
    minAngle: 10,        // Minimum launch angle (degrees)
    maxAngle: 80,        // Maximum launch angle (degrees)
    laserSpeed: 25,      // Laser projectile speed
    // Turkey flight parameters
    turkeyMinY: 80,              // Top sky boundary
    turkeyMaxY: 350,             // Bottom sky boundary
    turkeyMinX: 150,             // Left boundary
    turkeyMaxX: 750,             // Right boundary
    turkeyImpulseMin: 30,        // Min frames between direction changes
    turkeyImpulseMax: 100,       // Max frames between direction changes
    turkeyMaxSpeed: 4,           // Maximum flight speed
    turkeyDrag: 0.98             // Velocity dampening (0.98 = 2% slowdown per frame)
};

let angle = 45;
let projectiles = [];    // Array of active lasers
let targets = [];
let score = 0;
let shots = 0;
let shootCooldown = 0;   // Frames until next shot allowed

// Projectile and target images (students will replace these)
let pumpkinImg;
let targetImgs = {};

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

    // Create targets - turkey flies in the sky
    targets = [
        {
            x: 400,
            y: 200,
            w: 60,
            h: 80,
            type: 'turkey',
            hit: false,
            // Erratic flight properties
            vx: random(-2, 2),                  // Horizontal velocity
            vy: random(-2, 2),                  // Vertical velocity
            impulseTimer: random(CONFIG.turkeyImpulseMin, CONFIG.turkeyImpulseMax) // Frames until next direction change
        },
        { x: 550, y: height - 120, w: 100, h: 100, type: 'barn', hit: false }
    ];
}

function draw() {
    // Sky and ground
    background(135, 206, 235);

    // Ground
    fill(101, 67, 33);
    rect(0, height - 80, width, 80);
    fill(34, 139, 34);
    rect(0, height - 90, width, 10);

    // Handle continuous key input
    handleContinuousInput();

    // Draw shooter character
    drawShooter();

    // Update target positions (turkey flying)
    updateTargets();

    // Draw targets
    drawTargets();

    // Update and draw all projectiles (lasers)
    updateProjectiles();
    drawProjectiles();

    // Draw UI
    drawUI();

    // Instructions
    fill(255);
    stroke(0);
    strokeWeight(3);
    textAlign(CENTER);
    textSize(18);
    text('Hold SPACE to rapid-fire | Hold UP/DOWN to aim', width/2, 40);
}

function handleContinuousInput() {
    // Decrement shoot cooldown
    if (shootCooldown > 0) {
        shootCooldown--;
    }

    // Continuous angle adjustment (works in any state)
    if (keyIsDown(UP_ARROW)) {
        angle = constrain(angle + 2, CONFIG.minAngle, CONFIG.maxAngle);
    }
    if (keyIsDown(DOWN_ARROW)) {
        angle = constrain(angle - 2, CONFIG.minAngle, CONFIG.maxAngle);
    }

    // Continuous shooting with cooldown (10 frames = ~6 shots/second at 60fps)
    // Allow shooting even while previous laser is in flight
    if (keyIsDown(32) && shootCooldown === 0) { // 32 is spacebar
        shootLaser();
        shootCooldown = 10; // Cooldown between shots
    }
}

function drawShooter() {
    push();
    translate(100, height - 90);

    // Person's body (simple stick figure)
    stroke(50);
    strokeWeight(4);
    fill(100, 150, 200); // Blue shirt

    // Head
    fill(255, 220, 177); // Skin tone
    ellipse(0, -60, 25, 25);

    // Body
    stroke(100, 150, 200);
    strokeWeight(6);
    line(0, -48, 0, -10);

    // Legs
    line(0, -10, -10, 20);
    line(0, -10, 10, 20);

    // Arms and laser gun
    push();
    rotate(-radians(angle));

    // Arm holding gun
    stroke(255, 220, 177);
    strokeWeight(4);
    line(0, -40, 0, -70);

    // Laser gun
    fill(70, 70, 70);
    stroke(40);
    strokeWeight(2);
    rect(-5, -80, 10, 20);

    // Gun barrel
    fill(50);
    rect(-3, -85, 6, 10);

    // Glowing tip
    fill(0, 255, 0);
    noStroke();
    ellipse(0, -85, 6, 6);

    pop();
    pop();
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

function drawProjectiles() {
    for (let projectile of projectiles) {
        push();

        // Draw laser beam with glow effect
        // Outer glow
        stroke(0, 255, 0, 80);
        strokeWeight(12);
        line(projectile.x, projectile.y, projectile.x - projectile.vx * 2, projectile.y - projectile.vy * 2);

        // Middle glow
        stroke(0, 255, 0, 150);
        strokeWeight(6);
        line(projectile.x, projectile.y, projectile.x - projectile.vx * 2, projectile.y - projectile.vy * 2);

        // Core beam
        stroke(150, 255, 150);
        strokeWeight(3);
        line(projectile.x, projectile.y, projectile.x - projectile.vx * 2, projectile.y - projectile.vy * 2);

        // Leading bright point
        fill(255, 255, 255);
        noStroke();
        ellipse(projectile.x, projectile.y, 8, 8);

        pop();
    }
}

function updateProjectiles() {
    // Update all projectiles and remove off-screen ones
    for (let i = projectiles.length - 1; i >= 0; i--) {
        let projectile = projectiles[i];

        // Laser travels in straight line (no gravity)
        projectile.x += projectile.vx;
        projectile.y += projectile.vy;

        // Check collision with targets
        let hitTarget = false;
        for (let target of targets) {
            if (target.hit) continue;

            if (abs(projectile.x - target.x) < target.w/2 + 15 &&
                abs(projectile.y - target.y) < target.h/2 + 15) {
                target.hit = true;
                score += 100;
                console.log('Hit!');
                hitTarget = true;
                break;
            }
        }

        // Remove laser if it hit a target or went off screen
        if (hitTarget || projectile.y < 0 || projectile.y > height || projectile.x > width || projectile.x < 0) {
            projectiles.splice(i, 1);
        }
    }
}

function updateTargets() {
    for (let target of targets) {
        // Skip non-turkeys and hit targets
        if (target.type !== 'turkey' || target.hit) continue;

        // ERRATIC ZIGZAG FLIGHT BEHAVIOR

        // Apply drag (gradual slowdown)
        target.vx *= CONFIG.turkeyDrag;
        target.vy *= CONFIG.turkeyDrag;

        // Add small random jitter each frame for erratic movement
        target.vx += random(-0.3, 0.3);
        target.vy += random(-0.3, 0.3);

        // Countdown to next impulse (sudden direction change)
        target.impulseTimer--;

        if (target.impulseTimer <= 0) {
            // Apply random impulse for sudden direction change
            target.vx += random(-3, 3);
            target.vy += random(-3, 3);

            // Reset impulse timer
            target.impulseTimer = random(CONFIG.turkeyImpulseMin, CONFIG.turkeyImpulseMax);
        }

        // Clamp velocity to max speed
        let speed = sqrt(target.vx * target.vx + target.vy * target.vy);
        if (speed > CONFIG.turkeyMaxSpeed) {
            target.vx = (target.vx / speed) * CONFIG.turkeyMaxSpeed;
            target.vy = (target.vy / speed) * CONFIG.turkeyMaxSpeed;
        }

        // Update position
        target.x += target.vx;
        target.y += target.vy;

        // Bounce off boundaries (reverses direction)
        if (target.x < CONFIG.turkeyMinX) {
            target.x = CONFIG.turkeyMinX;
            target.vx = abs(target.vx); // Force rightward
        } else if (target.x > CONFIG.turkeyMaxX) {
            target.x = CONFIG.turkeyMaxX;
            target.vx = -abs(target.vx); // Force leftward
        }

        if (target.y < CONFIG.turkeyMinY) {
            target.y = CONFIG.turkeyMinY;
            target.vy = abs(target.vy); // Force downward
        } else if (target.y > CONFIG.turkeyMaxY) {
            target.y = CONFIG.turkeyMaxY;
            target.vy = -abs(target.vy); // Force upward
        }
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
    text(`Shots: ${shots}`, 20, 60);
    text(`Angle: ${angle}°`, 20, 90);

    // Check if all targets hit
    if (targets.every(t => t.hit)) {
        fill(255, 215, 0);
        stroke(0);
        strokeWeight(5);
        textAlign(CENTER);
        textSize(48);
        text('🎉 ALL TARGETS HIT! 🎉', width/2, height/2);
        textSize(24);
        text(`Score: ${score} | Shots: ${shots}`, width/2, height/2 + 50);
        text('Refresh to play again!', width/2, height/2 + 90);
    }
}

function shootLaser() {
    const launchAngle = radians(angle);

    // Add new laser to the array
    projectiles.push({
        x: 100,
        y: height - 90,
        vx: cos(-launchAngle) * CONFIG.laserSpeed,
        vy: sin(-launchAngle) * CONFIG.laserSpeed
    });

    shots++;
}

function keyPressed() {
    // Key handling now done in handleContinuousInput() for smooth continuous input
    // This function is kept for compatibility but is no longer the primary input method
    return false; // Prevent default browser behavior
}
