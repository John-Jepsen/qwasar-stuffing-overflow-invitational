// STUDENT TODO: Adjust these values for gameplay tuning
const CONFIG = {
    minAngle: 10,        // Minimum launch angle (degrees)
    maxAngle: 80,        // Maximum launch angle (degrees)
    minPower: 5,         // Minimum launch power
    maxPower: 25,        // Maximum launch power
    gravity: 0.3,        // Gravity strength
    targetDistance: 400, // Distance to target
    turkeySpeed: 0.5     // Speed at which turkey approaches catapult
};

let angle = 45;
let power = 15;
let projectile = null;
let targets = [];
let score = 0;
let launches = 0;
let gameState = 'aiming'; // 'aiming', 'flying', or 'gameOver'
let turkeyAttacking = false;
let catapultDestroyed = false;
let catapultDebris = [];

// Projectile and target images (students will replace these)
let pumpkinImg;
let targetImgs = {};
let hammerImg;
let hammerSwingAngle = 0;
let hammerStrikePos = null;

// Sky elements
let clouds = [];
let moonX = 650;
let moonY = 120;

// Prop plane
let planeX = -200;
let planeY = 180;
let planeSpeed = 1.5;

// Audio system
let audioContext;
let musicStarted = false;
let musicMuted = false;
let currentNoteIndex = 0;
let noteStartTime = 0;

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

        targetImgs.babyTurkey = loadImage('assets/baby-turkey.png',
            () => console.log('Baby turkey loaded'),
            () => { console.log('Baby turkey image not found, using shape'); targetImgs.babyTurkey = null; }
        );

        hammerImg = loadImage('assets/hammer.png',
            () => console.log('Hammer loaded'),
            () => { console.log('Hammer image not found, using shape'); hammerImg = null; }
        );
    } catch (e) {
        console.log('Error loading images:', e);
    }
}

// Old MacDonald melody - note frequencies and durations
const melody = [
    // Old Mac-Don-ald had a farm
    { freq: 523.25, duration: 0.4 }, // C (Old)
    { freq: 523.25, duration: 0.4 }, // C (Mac)
    { freq: 523.25, duration: 0.4 }, // C (Don)
    { freq: 392.00, duration: 0.4 }, // G (ald)
    { freq: 440.00, duration: 0.4 }, // A (had)
    { freq: 440.00, duration: 0.4 }, // A (a)
    { freq: 392.00, duration: 0.8 }, // G (farm)
    // E-I-E-I-O
    { freq: 659.25, duration: 0.4 }, // E (E)
    { freq: 659.25, duration: 0.4 }, // E (I)
    { freq: 659.25, duration: 0.4 }, // E (E)
    { freq: 587.33, duration: 0.4 }, // D (I)
    { freq: 523.25, duration: 0.8 }, // C (O)
    // And on that farm he had a cow
    { freq: 392.00, duration: 0.4 }, // G (And)
    { freq: 392.00, duration: 0.4 }, // G (on)
    { freq: 392.00, duration: 0.4 }, // G (that)
    { freq: 523.25, duration: 0.4 }, // C (farm)
    { freq: 587.33, duration: 0.4 }, // D (he)
    { freq: 587.33, duration: 0.4 }, // D (had)
    { freq: 523.25, duration: 0.4 }, // C (a)
    { freq: 587.33, duration: 0.4 }, // D (cow)
    // E-I-E-I-O
    { freq: 659.25, duration: 0.4 }, // E (E)
    { freq: 659.25, duration: 0.4 }, // E (I)
    { freq: 659.25, duration: 0.4 }, // E (E)
    { freq: 587.33, duration: 0.4 }, // D (I)
    { freq: 523.25, duration: 1.2 }  // C (O) - longer
];

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playNote(frequency, duration) {
    if (!audioContext || musicMuted) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Use square wave for more MIDI-like sound
    oscillator.type = 'square';
    oscillator.frequency.value = frequency;

    // Envelope for more musical sound
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.05, now + duration * 0.7); // Sustain
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Release

    oscillator.start(now);
    oscillator.stop(now + duration);
}

function updateMusic() {
    if (!musicStarted) return;

    const currentTime = millis() / 1000;

    if (currentTime - noteStartTime >= melody[currentNoteIndex].duration) {
        // Play next note
        currentNoteIndex = (currentNoteIndex + 1) % melody.length;
        if (!musicMuted) {
            playNote(melody[currentNoteIndex].freq, melody[currentNoteIndex].duration);
        }
        noteStartTime = currentTime;
    }
}

function setup() {
    createCanvas(800, 600);

    // Initialize audio on first user interaction
    initAudio();

    // Create targets at different distances
    targets = [
        { x: 400, y: height - 100, w: 80, h: 65, type: 'turkey', hit: false, attacking: true },
        { x: 600, y: height - 170, w: 180, h: 180, type: 'barn', hit: false, attacking: false },
        // Baby turkeys positioned near the barn with unique jump phases
        { x: 480, y: height - 100, w: 35, h: 45, type: 'babyTurkey', hit: false, attacking: false, baseX: 480, baseY: height - 100, jumpPhase: 0, jumpSpeed: 0.25 },
        { x: 520, y: height - 95, w: 35, h: 45, type: 'babyTurkey', hit: false, attacking: false, baseX: 520, baseY: height - 95, jumpPhase: 1.5, jumpSpeed: 0.3 },
        { x: 680, y: height - 98, w: 35, h: 45, type: 'babyTurkey', hit: false, attacking: false, baseX: 680, baseY: height - 98, jumpPhase: 3.0, jumpSpeed: 0.28 },
        { x: 640, y: height - 92, w: 35, h: 45, type: 'babyTurkey', hit: false, attacking: false, baseX: 640, baseY: height - 92, jumpPhase: 4.2, jumpSpeed: 0.22 }
    ];

    // Create wispy clouds at different positions
    clouds = [
        { x: 100, y: 80, width: 120, height: 40, speed: 0.15, opacity: 40 },
        { x: 300, y: 150, width: 150, height: 50, speed: 0.1, opacity: 35 },
        { x: 500, y: 60, width: 100, height: 35, speed: 0.2, opacity: 45 },
        { x: 650, y: 180, width: 130, height: 45, speed: 0.12, opacity: 38 },
        { x: 200, y: 220, width: 110, height: 38, speed: 0.18, opacity: 42 }
    ];
}

function draw() {
    // Update background music
    updateMusic();

    // Handle continuous input when keys are held down
    if (gameState === 'aiming' && !catapultDestroyed) {
        // Adjust angle
        if (keyIsDown(UP_ARROW)) {
            angle = constrain(angle + 1, CONFIG.minAngle, CONFIG.maxAngle);
        }
        if (keyIsDown(DOWN_ARROW)) {
            angle = constrain(angle - 1, CONFIG.minAngle, CONFIG.maxAngle);
        }

        // Adjust power
        if (keyIsDown(RIGHT_ARROW)) {
            power = constrain(power + 0.25, CONFIG.minPower, CONFIG.maxPower);
        }
        if (keyIsDown(LEFT_ARROW)) {
            power = constrain(power - 0.25, CONFIG.minPower, CONFIG.maxPower);
        }
    }

    // Twilight sky gradient
    for (let y = 0; y < height - 90; y++) {
        // Gradient from deep purple-orange at top to warm orange at bottom
        let inter = map(y, 0, height - 90, 0, 1);
        let c = lerpColor(color(120, 80, 140), color(255, 140, 80), inter);
        stroke(c);
        line(0, y, width, y);
    }

    // Draw harvest moon
    drawHarvestMoon();

    // Draw and update clouds
    drawClouds();
    updateClouds();

    // Draw and update prop plane
    drawPropPlane();
    updatePropPlane();

    // Ground
    fill(101, 67, 33);
    noStroke();
    rect(0, height - 80, width, 80);
    fill(34, 139, 34);
    rect(0, height - 90, width, 10);

    // Draw catapult or debris
    if (catapultDestroyed) {
        drawCatapultDebris();
        updateCatapultDebris();

        // Draw stuck hammer after destruction
        if (hammerStrikePos) {
            push();
            translate(hammerStrikePos.x, hammerStrikePos.y);
            rotate(radians(-90)); // Hammer embedded in ground

            if (hammerImg && hammerImg.width > 0) {
                imageMode(CENTER);
                image(hammerImg, 0, -25, 40, 40);
            } else {
                // Draw hammer handle
                fill(140, 100, 60, 200);
                stroke(180, 150, 120, 220);
                strokeWeight(2);
                rect(-5, -45, 10, 40, 3);

                // Hammer head
                fill(120, 120, 140, 200);
                stroke(180, 180, 200, 220);
                strokeWeight(2);
                rect(-15, -60, 30, 18, 3);
            }
            pop();
        }
    } else {
        drawCatapult();
    }

    // Draw targets
    drawTargets();

    // Update turkey attack
    if (gameState !== 'gameOver') {
        updateTurkeyAttack();
    }

    // Update and draw projectile
    if (gameState === 'flying' && projectile) {
        updateProjectile();
        drawProjectile();
    }

    // Draw UI
    drawUI();

    // Instructions with glass panel
    if (gameState === 'aiming' || gameState === 'flying') {
        drawGlassPanel(width/2 - 320, 20, 640, 40, 20);
        draw3DText('SPACE to launch | UP/DOWN for angle | LEFT/RIGHT for power', width/2, 45, 18, color(255, 255, 255), color(150, 150, 150), 2);
    }

    // Music indicator
    if (musicStarted) {
        // Small glass panel for music note
        drawGlassPanel(width - 55, 10, 45, 45, 10);

        // Animated music note
        let bounce = sin(frameCount * 0.1) * 3;
        textSize(24);
        textAlign(CENTER);

        if (musicMuted) {
            // Muted - show note with slash
            fill(150, 150, 150);
            text('♪', width - 32, 40 + bounce);
            stroke(255, 100, 100);
            strokeWeight(3);
            line(width - 45, 18, width - 20, 50);
        } else {
            // Playing - show bouncing note
            fill(255, 255, 100);
            text('♪', width - 32, 40 + bounce);
        }

        // Hint text
        fill(255, 255, 255, 150);
        noStroke();
        textSize(10);
        text('M', width - 32, 55);
    } else if (gameState === 'aiming') {
        // Show "Press any key for music" hint
        fill(255, 255, 255, 100 + sin(frameCount * 0.05) * 50);
        noStroke();
        textAlign(RIGHT);
        textSize(12);
        text('Press any key for music', width - 10, height - 100);
    }
}

function drawHarvestMoon() {
    push();

    // Moon glow (largest)
    fill(255, 180, 80, 30);
    noStroke();
    ellipse(moonX, moonY, 130, 130);

    // Medium glow
    fill(255, 200, 100, 40);
    ellipse(moonX, moonY, 110, 110);

    // Inner glow
    fill(255, 210, 120, 60);
    ellipse(moonX, moonY, 95, 95);

    // Main moon body - harvest orange
    fill(255, 180, 80, 220);
    stroke(255, 220, 150, 180);
    strokeWeight(2);
    ellipse(moonX, moonY, 80, 80);

    // Moon highlights for glass effect
    fill(255, 230, 180, 150);
    noStroke();
    ellipse(moonX - 15, moonY - 15, 30, 30);

    fill(255, 240, 200, 100);
    ellipse(moonX - 10, moonY - 10, 20, 20);

    // Moon craters (darker spots)
    fill(220, 150, 60, 80);
    ellipse(moonX + 10, moonY + 5, 12, 12);
    ellipse(moonX - 5, moonY + 15, 8, 8);
    ellipse(moonX + 20, moonY - 10, 10, 10);
    ellipse(moonX - 18, moonY + 8, 7, 7);

    // Subtle texture
    fill(240, 180, 100, 40);
    ellipse(moonX + 5, moonY - 8, 15, 15);
    ellipse(moonX - 12, moonY - 5, 12, 12);

    pop();
}

function drawClouds() {
    for (let cloud of clouds) {
        push();

        // Add subtle vertical drift
        let verticalDrift = sin(frameCount * 0.01 + cloud.x * 0.01) * 3;

        // Draw wispy cloud with multiple ellipses for organic shape
        // Outer glow
        fill(255, 255, 255, cloud.opacity * 0.4);
        noStroke();
        ellipse(cloud.x, cloud.y + verticalDrift, cloud.width * 1.2, cloud.height * 1.2);

        // Main cloud body (multiple ellipses)
        fill(255, 255, 255, cloud.opacity);
        stroke(255, 255, 255, cloud.opacity * 1.5);
        strokeWeight(1);

        // Left puff
        ellipse(cloud.x - cloud.width * 0.25, cloud.y + verticalDrift, cloud.width * 0.5, cloud.height * 0.8);

        // Center puff (largest)
        ellipse(cloud.x, cloud.y + verticalDrift, cloud.width * 0.6, cloud.height);

        // Right puff
        ellipse(cloud.x + cloud.width * 0.25, cloud.y + verticalDrift, cloud.width * 0.5, cloud.height * 0.7);

        // Extra small puffs for wispy effect
        ellipse(cloud.x - cloud.width * 0.4, cloud.y + cloud.height * 0.2 + verticalDrift, cloud.width * 0.3, cloud.height * 0.5);
        ellipse(cloud.x + cloud.width * 0.4, cloud.y - cloud.height * 0.1 + verticalDrift, cloud.width * 0.35, cloud.height * 0.6);

        // Highlights on cloud
        fill(255, 255, 255, cloud.opacity * 1.8);
        noStroke();
        ellipse(cloud.x - cloud.width * 0.15, cloud.y - cloud.height * 0.2 + verticalDrift, cloud.width * 0.25, cloud.height * 0.4);

        pop();
    }
}

function updateClouds() {
    for (let cloud of clouds) {
        // Move clouds slowly to the right
        cloud.x += cloud.speed;

        // Wrap around when cloud goes off screen
        if (cloud.x - cloud.width > width) {
            cloud.x = -cloud.width;
        }
    }
}

function drawPropPlane() {
    push();

    // Propeller rotation
    let propAngle = frameCount * 0.5;

    // Plane body
    fill(220, 50, 50, 220);
    stroke(255, 100, 100, 240);
    strokeWeight(2);
    ellipse(planeX, planeY, 60, 20);

    // Cockpit window
    fill(100, 150, 200, 180);
    stroke(150, 200, 255, 200);
    strokeWeight(1.5);
    ellipse(planeX + 10, planeY - 3, 15, 10);

    // Wings
    fill(220, 50, 50, 200);
    stroke(255, 100, 100, 220);
    strokeWeight(2);
    rect(planeX - 15, planeY - 25, 30, 8, 3);
    rect(planeX - 10, planeY + 17, 20, 6, 2);

    // Tail
    fill(220, 50, 50, 200);
    stroke(255, 100, 100, 220);
    triangle(planeX - 35, planeY - 15, planeX - 30, planeY, planeX - 35, planeY);
    triangle(planeX - 35, planeY, planeX - 30, planeY, planeX - 35, planeY + 10);

    // Propeller
    push();
    translate(planeX + 30, planeY);
    rotate(propAngle);
    strokeWeight(3);
    stroke(100, 100, 100, 200);
    line(-15, 0, 15, 0);
    line(0, -15, 0, 15);
    pop();

    // Propeller center
    fill(80, 80, 80, 220);
    stroke(120, 120, 120, 240);
    strokeWeight(1.5);
    ellipse(planeX + 30, planeY, 8, 8);

    // Banner rope
    stroke(100, 80, 60, 200);
    strokeWeight(2);
    line(planeX - 25, planeY + 5, planeX - 100, planeY + 15);
    line(planeX - 25, planeY - 5, planeX - 100, planeY - 5);

    // Banner
    fill(255, 255, 240, 230);
    stroke(200, 200, 180, 240);
    strokeWeight(2);
    rect(planeX - 320, planeY - 5, 220, 30, 3);

    // Banner text
    fill(200, 50, 50);
    noStroke();
    textSize(18);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text("Qwasar Holidays 2025", planeX - 210, planeY + 10);

    pop();
}

function updatePropPlane() {
    planeX += planeSpeed;

    // Reset plane when it goes off screen
    if (planeX > width + 350) {
        planeX = -200;
    }
}

function createCatapultDebris() {
    catapultDebris = [];
    const baseX = 100;
    const baseY = height - 90;

    // Create impact particles
    for (let i = 0; i < 15; i++) {
        catapultDebris.push({
            x: baseX + random(-20, 20),
            y: baseY + random(-30, 10),
            vx: random(-8, 8),
            vy: random(-12, -4),
            rotation: random(0, TWO_PI),
            rotationSpeed: random(-0.8, 0.8),
            size: random(3, 8),
            life: 1.0,
            type: 'particle'
        });
    }

    // Create multiple debris pieces with random properties
    // Wheels
    for (let i = 0; i < 2; i++) {
        catapultDebris.push({
            x: baseX + (i === 0 ? -20 : 20),
            y: baseY + 45,
            vx: random(-5, 5),
            vy: random(-8, -3),
            rotation: 0,
            rotationSpeed: random(-0.3, 0.3),
            size: 25,
            type: 'wheel'
        });
    }

    // Base platform pieces
    for (let i = 0; i < 3; i++) {
        catapultDebris.push({
            x: baseX + random(-30, 30),
            y: baseY + 30,
            vx: random(-6, 6),
            vy: random(-10, -4),
            rotation: random(0, TWO_PI),
            rotationSpeed: random(-0.4, 0.4),
            w: random(20, 40),
            h: random(10, 20),
            type: 'plank'
        });
    }

    // Support beams
    for (let i = 0; i < 2; i++) {
        catapultDebris.push({
            x: baseX + (i === 0 ? -25 : 25),
            y: baseY - 10,
            vx: random(-4, 4),
            vy: random(-12, -6),
            rotation: random(0, TWO_PI),
            rotationSpeed: random(-0.5, 0.5),
            w: 12,
            h: 50,
            type: 'beam'
        });
    }

    // Arm pieces
    catapultDebris.push({
        x: baseX,
        y: baseY - 50,
        vx: random(-3, 3),
        vy: random(-15, -8),
        rotation: -radians(angle),
        rotationSpeed: random(-0.6, 0.6),
        w: 12,
        h: 60,
        type: 'arm'
    });

    // Spoon/bucket
    catapultDebris.push({
        x: baseX,
        y: baseY - 80,
        vx: random(-7, 7),
        vy: random(-18, -10),
        rotation: 0,
        rotationSpeed: random(-0.8, 0.8),
        size: 28,
        type: 'spoon'
    });

    catapultDestroyed = true;
}

function updateCatapultDebris() {
    for (let piece of catapultDebris) {
        // Apply gravity
        piece.vy += 0.5;

        // Update position
        piece.x += piece.vx;
        piece.y += piece.vy;

        // Update rotation
        piece.rotation += piece.rotationSpeed;

        // Fade particles
        if (piece.type === 'particle') {
            piece.life -= 0.02;
            piece.vx *= 0.98;
            piece.vy *= 0.98;
        } else {
            // Bounce off ground for solid pieces
            if (piece.y > height - 90) {
                piece.y = height - 90;
                piece.vy *= -0.4; // Bounce with energy loss
                piece.vx *= 0.8; // Friction
                piece.rotationSpeed *= 0.7;
            }

            // Slow down over time
            piece.vx *= 0.99;
        }
    }

    // Remove dead particles
    catapultDebris = catapultDebris.filter(p => p.type !== 'particle' || p.life > 0);
}

function drawCatapultDebris() {
    for (let piece of catapultDebris) {
        push();
        translate(piece.x, piece.y);
        rotate(piece.rotation);

        if (piece.type === 'particle') {
            // Impact particles with fade
            let alpha = piece.life * 255;

            // Glow
            fill(255, 200, 100, alpha * 0.5);
            noStroke();
            ellipse(0, 0, piece.size * 2, piece.size * 2);

            // Particle
            fill(255, 220, 150, alpha);
            stroke(255, 240, 200, alpha);
            strokeWeight(1);
            ellipse(0, 0, piece.size, piece.size);
        } else if (piece.type === 'wheel') {
            // Glow
            fill(120, 100, 80, 60);
            noStroke();
            ellipse(0, 0, piece.size + 8, piece.size + 8);

            // Wheel
            fill(100, 80, 60, 180);
            stroke(150, 130, 110, 200);
            strokeWeight(2);
            ellipse(0, 0, piece.size, piece.size);

            // Highlight
            fill(180, 160, 140, 120);
            noStroke();
            ellipse(-5, -5, 8, 8);
        } else if (piece.type === 'plank' || piece.type === 'beam' || piece.type === 'arm') {
            // Glow
            fill(150, 120, 90, 60);
            noStroke();
            rect(-piece.w/2 - 2, -piece.h/2 - 2, piece.w + 4, piece.h + 4, 3);

            // Wood piece
            fill(120, 90, 60, 170);
            stroke(180, 150, 120, 200);
            strokeWeight(2);
            rect(-piece.w/2, -piece.h/2, piece.w, piece.h, 3);

            // Highlight
            fill(200, 170, 140, 90);
            noStroke();
            rect(-piece.w/2 + 2, -piece.h/2 + 2, piece.w * 0.4, piece.h * 0.5);
        } else if (piece.type === 'spoon') {
            // Glow
            fill(180, 120, 60, 80);
            noStroke();
            ellipse(0, 0, piece.size + 10, piece.size + 8);

            // Spoon
            fill(160, 100, 40, 200);
            stroke(200, 150, 100, 220);
            strokeWeight(2);
            ellipse(0, 0, piece.size, piece.size * 0.8);

            // Highlight
            fill(220, 180, 140, 140);
            noStroke();
            ellipse(-6, -6, 10, 8);
        }

        pop();
    }
}

function drawGlassPanel(x, y, w, h, cornerRadius = 15) {
    push();

    // Shadow/depth layer
    fill(0, 0, 0, 40);
    noStroke();
    rect(x + 4, y + 4, w, h, cornerRadius);

    // Main glass panel with gradient effect
    fill(255, 255, 255, 30);
    stroke(255, 255, 255, 100);
    strokeWeight(2);
    rect(x, y, w, h, cornerRadius);

    // Top highlight for glass effect
    fill(255, 255, 255, 60);
    noStroke();
    rect(x + 2, y + 2, w - 4, h * 0.4, cornerRadius);

    // Bottom darker area
    fill(0, 0, 0, 20);
    rect(x + 2, y + h * 0.6, w - 4, h * 0.4 - 2, cornerRadius);

    // Inner glow
    stroke(255, 255, 255, 150);
    strokeWeight(1);
    noFill();
    rect(x + 3, y + 3, w - 6, h - 6, cornerRadius - 3);

    pop();
}

function draw3DText(txt, x, y, size, mainColor, shadowColor, depth = 3) {
    textSize(size);
    textAlign(CENTER);

    // Draw shadow layers for depth
    for (let i = depth; i > 0; i--) {
        fill(shadowColor);
        noStroke();
        text(txt, x + i, y + i);
    }

    // Draw main text with outline
    strokeWeight(size * 0.1);
    stroke(0);
    fill(mainColor);
    text(txt, x, y);
}

function drawCatapult() {
    push();
    translate(100, height - 90);

    // Wheels with glass effect
    // Wheel glow
    fill(120, 100, 80, 60);
    noStroke();
    ellipse(-20, 45, 32, 32);
    ellipse(20, 45, 32, 32);

    fill(100, 80, 60, 180);
    stroke(150, 130, 110, 200);
    strokeWeight(2);
    ellipse(-20, 45, 25, 25);
    ellipse(20, 45, 25, 25);

    // Wheel highlights
    fill(180, 160, 140, 120);
    noStroke();
    ellipse(-23, 42, 8, 8);
    ellipse(17, 42, 8, 8);

    // Wheel spokes
    stroke(100, 80, 60, 220);
    strokeWeight(1.5);
    for (let i = 0; i < 4; i++) {
        let angle_rad = radians(i * 45);
        line(-20, 45, -20 + cos(angle_rad) * 10, 45 + sin(angle_rad) * 10);
        line(20, 45, 20 + cos(angle_rad) * 10, 45 + sin(angle_rad) * 10);
    }

    // Base platform with glass effect
    fill(120, 90, 60, 150);
    stroke(180, 150, 120, 200);
    strokeWeight(2);
    rect(-35, 20, 70, 25, 5);

    // Highlight on platform
    fill(200, 170, 140, 100);
    noStroke();
    rect(-33, 22, 66, 8, 3);

    // Support beams (left and right) with glass
    fill(120, 90, 60, 160);
    stroke(180, 150, 120, 200);
    strokeWeight(2);
    // Left support
    beginShape();
    vertex(-30, 20);
    vertex(-25, -30);
    vertex(-18, -30);
    vertex(-23, 20);
    endShape(CLOSE);
    // Highlight left
    fill(200, 170, 140, 80);
    noStroke();
    triangle(-28, 15, -24, -25, -20, -25);

    // Right support
    fill(120, 90, 60, 160);
    stroke(180, 150, 120, 200);
    strokeWeight(2);
    beginShape();
    vertex(30, 20);
    vertex(25, -30);
    vertex(18, -30);
    vertex(23, 20);
    endShape(CLOSE);
    // Highlight right
    fill(200, 170, 140, 80);
    noStroke();
    triangle(28, 15, 24, -25, 20, -25);

    // Cross beam at top
    fill(100, 70, 45, 170);
    stroke(160, 130, 100, 200);
    strokeWeight(2);
    rect(-28, -35, 56, 8, 3);

    // Highlight on cross beam
    fill(180, 150, 120, 90);
    noStroke();
    rect(-26, -33, 52, 3, 2);

    // Pivot point with metallic glass look
    // Glow
    fill(150, 150, 150, 80);
    noStroke();
    ellipse(0, -30, 18, 18);

    fill(120, 120, 140, 200);
    stroke(200, 200, 220, 220);
    strokeWeight(2);
    ellipse(0, -30, 12, 12);

    // Metallic highlight
    fill(220, 220, 240, 150);
    noStroke();
    ellipse(-2, -32, 5, 5);

    // Rotating arm
    push();
    rotate(-radians(angle));

    // Main arm beam with glass
    fill(120, 90, 60, 170);
    stroke(180, 150, 120, 200);
    strokeWeight(2);
    rect(-6, -90, 12, 95, 3);

    // Highlight on arm
    fill(200, 170, 140, 90);
    noStroke();
    rect(-4, -88, 4, 90);

    // Rope/rope texture on arm
    stroke(180, 150, 120, 180);
    strokeWeight(1.5);
    for (let i = 0; i < 5; i++) {
        line(-6, -20 - i * 15, 6, -20 - i * 15);
    }

    // Bucket/Spoon at end with glass effect
    // Glow
    fill(180, 120, 60, 80);
    noStroke();
    ellipse(0, -95, 35, 32);

    fill(160, 100, 40, 200);
    stroke(200, 150, 100, 220);
    strokeWeight(2);
    // Spoon bowl
    ellipse(0, -95, 28, 24);
    arc(0, -95, 28, 24, 0, PI);

    // Highlight on spoon
    fill(220, 180, 140, 140);
    noStroke();
    ellipse(-5, -98, 10, 8);

    // Spoon handle connector
    fill(160, 100, 40, 200);
    stroke(200, 150, 100, 220);
    strokeWeight(2);
    rect(-3, -90, 6, 10);

    pop();

    // Counterweight with glass effect
    push();
    rotate(-radians(angle));

    // Glow
    fill(120, 120, 120, 60);
    noStroke();
    rect(-10, 3, 20, 24);

    fill(100, 100, 120, 200);
    stroke(180, 180, 200, 220);
    strokeWeight(2);
    rect(-8, 5, 16, 20, 3);

    // Highlight
    fill(200, 200, 220, 120);
    noStroke();
    rect(-6, 7, 6, 6);

    pop();

    pop();
}

function drawHammer(turkeyX, turkeyY) {
    push();
    translate(turkeyX + 20, turkeyY - 10);

    // Animate hammer swing - faster when closer to catapult
    let distanceToCatapult = turkeyX - 100;
    let swingSpeed = map(distanceToCatapult, 300, 150, 0.15, 0.4); // Speed up as it approaches
    let swingAmount = map(distanceToCatapult, 300, 150, 30, 60); // Bigger swings when close
    let swingOffset = sin(frameCount * swingSpeed) * swingAmount;
    rotate(radians(swingOffset - 45));

    if (hammerImg && hammerImg.width > 0) {
        // Draw hammer image
        imageMode(CENTER);
        image(hammerImg, 0, -25, 40, 40);
    } else {
        // Fallback: draw hammer shape with glass effect
        // Handle glow
        fill(150, 150, 150, 60);
        noStroke();
        rect(-5, -45, 15, 40, 3);
        ellipse(2, -50, 30, 20);

        // Handle
        fill(140, 100, 60, 200);
        stroke(180, 150, 120, 220);
        strokeWeight(2);
        rect(-5, -45, 10, 40, 3);

        // Handle highlight
        fill(200, 170, 140, 100);
        noStroke();
        rect(-3, -43, 3, 35);

        // Hammer head
        fill(120, 120, 140, 200);
        stroke(180, 180, 200, 220);
        strokeWeight(2);
        rect(-15, -60, 30, 18, 3);

        // Metallic highlight
        fill(220, 220, 240, 150);
        noStroke();
        rect(-12, -58, 12, 6);

        // Claw end
        fill(100, 100, 120, 200);
        stroke(160, 160, 180, 220);
        strokeWeight(2);
        triangle(-15, -42, -20, -50, -15, -50);
        triangle(15, -42, 20, -50, 15, -50);
    }

    pop();
}

function drawTargets() {
    for (let target of targets) {
        if (target.hit) {
            continue; // Don't draw hit targets
        }

        // Update baby turkey jumping animation
        if (target.type === 'babyTurkey') {
            // Frantic jumping with sine wave
            let jumpHeight = abs(sin(frameCount * target.jumpSpeed + target.jumpPhase)) * 20 + 5;
            target.y = target.baseY - jumpHeight;

            // Add horizontal wobble for extra frantic movement
            let wobble = sin(frameCount * target.jumpSpeed * 2 + target.jumpPhase) * 3;
            target.x = target.baseX + wobble;
        }

        push();

        const img = targetImgs[target.type];

        if (img && img.width > 0) {
            // Draw image if loaded
            imageMode(CENTER);
            image(img, target.x, target.y, target.w, target.h);

            // Draw hammer if this is the attacking turkey
            if (target.attacking && target.type === 'turkey' && !catapultDestroyed) {
                drawHammer(target.x, target.y);
            }
        } else {
            // Fallback shapes with glass effects
            if (target.type === 'turkey') {
                // Turkey with glass effect
                // Glow
                fill(180, 120, 80, 60);
                noStroke();
                ellipse(target.x, target.y, target.w * 1.0, target.h * 1.0);

                // Body
                fill(160, 100, 60, 200);
                stroke(200, 150, 100, 220);
                strokeWeight(2);
                ellipse(target.x, target.y, target.w * 0.8, target.h * 0.8);

                // Highlight
                fill(220, 180, 140, 120);
                noStroke();
                ellipse(target.x - 10, target.y - 15, 15, 12);

                // Feathers
                fill(200, 80, 80, 200);
                stroke(240, 120, 120, 220);
                strokeWeight(2);
                triangle(target.x - 20, target.y - 20,
                        target.x - 30, target.y - 30,
                        target.x - 15, target.y - 30);

                // Beak
                fill(255, 220, 100, 220);
                stroke(255, 240, 180, 240);
                strokeWeight(1.5);
                triangle(target.x - 10, target.y, target.x, target.y + 10, target.x - 5, target.y);

                // Draw hammer if this is the attacking turkey
                if (target.attacking && !catapultDestroyed) {
                    drawHammer(target.x, target.y);
                }
            } else if (target.type === 'barn') {
                // Classic two-story red barn with glass effect
                rectMode(CENTER);

                // Glow
                fill(200, 80, 80, 40);
                noStroke();
                rect(target.x, target.y, target.w + 15, target.h + 15, 8);

                // Foundation/base
                fill(100, 80, 70, 180);
                stroke(140, 120, 110, 200);
                strokeWeight(2);
                rect(target.x, target.y + target.h/2 - 10, target.w + 10, 20, 3);

                // First floor - classic red barn
                fill(180, 40, 40, 200);
                stroke(220, 80, 80, 220);
                strokeWeight(3);
                rect(target.x, target.y + 15, target.w, target.h * 0.5, 5);

                // First floor highlight
                fill(240, 120, 120, 100);
                noStroke();
                rect(target.x - target.w/3, target.y + 5, target.w * 0.3, target.h * 0.25, 3);

                // Barn doors (large double doors)
                fill(120, 80, 60, 200);
                stroke(160, 120, 100, 220);
                strokeWeight(2);
                rect(target.x - 15, target.y + 25, 25, 40, 3);
                rect(target.x + 15, target.y + 25, 25, 40, 3);

                // Door handles
                fill(180, 180, 200, 220);
                noStroke();
                ellipse(target.x - 5, target.y + 25, 4, 4);
                ellipse(target.x + 5, target.y + 25, 4, 4);

                // Second floor
                fill(180, 40, 40, 200);
                stroke(220, 80, 80, 220);
                strokeWeight(3);
                rect(target.x, target.y - 35, target.w * 0.85, target.h * 0.35, 5);

                // Second floor highlight
                fill(240, 120, 120, 100);
                noStroke();
                rect(target.x - target.w/4, target.y - 40, target.w * 0.25, target.h * 0.15, 3);

                // Hayloft door (second floor opening)
                fill(60, 50, 40, 200);
                stroke(100, 90, 80, 220);
                strokeWeight(2);
                rect(target.x, target.y - 35, 30, 25, 3);

                // Hayloft door highlight
                fill(100, 90, 80, 80);
                noStroke();
                rect(target.x - 8, target.y - 42, 10, 8);

                // Windows on second floor
                fill(150, 200, 255, 150);
                stroke(200, 220, 255, 200);
                strokeWeight(1.5);
                rect(target.x - 40, target.y - 35, 15, 12, 2);
                rect(target.x + 40, target.y - 35, 15, 12, 2);

                // Window panes
                stroke(180, 200, 230, 180);
                strokeWeight(1);
                line(target.x - 40, target.y - 41, target.x - 40, target.y - 29);
                line(target.x + 40, target.y - 41, target.x + 40, target.y - 29);
                line(target.x - 47.5, target.y - 35, target.x - 32.5, target.y - 35);
                line(target.x + 32.5, target.y - 35, target.x + 47.5, target.y - 35);

                // Roof - classic barn peaked roof
                fill(140, 80, 50, 200);
                stroke(180, 120, 90, 220);
                strokeWeight(3);
                triangle(target.x - target.w/2 - 5, target.y - target.h/2 - 5,
                        target.x + target.w/2 + 5, target.y - target.h/2 - 5,
                        target.x, target.y - target.h/2 - 50);

                // Roof highlight
                fill(200, 150, 110, 120);
                noStroke();
                triangle(target.x - target.w/3, target.y - target.h/2 - 5,
                        target.x + target.w/3, target.y - target.h/2 - 5,
                        target.x, target.y - target.h/2 - 40);

                // Roof shingles lines
                stroke(120, 70, 40, 150);
                strokeWeight(1.5);
                for (let i = 0; i < 5; i++) {
                    let yPos = target.y - target.h/2 - 10 - i * 8;
                    let xWidth = (target.w/2 + 5) * (1 - i/6);
                    line(target.x - xWidth, yPos, target.x + xWidth, yPos);
                }

                // Cupola (small ventilation structure on top)
                fill(180, 40, 40, 200);
                stroke(220, 80, 80, 220);
                strokeWeight(2);
                rect(target.x, target.y - target.h/2 - 55, 20, 12, 2);

                // Cupola roof
                fill(140, 80, 50, 200);
                stroke(180, 120, 90, 220);
                strokeWeight(1.5);
                triangle(target.x - 12, target.y - target.h/2 - 49,
                        target.x + 12, target.y - target.h/2 - 49,
                        target.x, target.y - target.h/2 - 60);

                // Weather vane on top
                stroke(180, 180, 200, 220);
                strokeWeight(2);
                line(target.x, target.y - target.h/2 - 60, target.x, target.y - target.h/2 - 70);

                // Vane arrow
                stroke(180, 180, 200, 220);
                strokeWeight(1.5);
                line(target.x - 8, target.y - target.h/2 - 70, target.x + 8, target.y - target.h/2 - 70);
                // Arrow point
                line(target.x + 8, target.y - target.h/2 - 70, target.x + 5, target.y - target.h/2 - 72);
                line(target.x + 8, target.y - target.h/2 - 70, target.x + 5, target.y - target.h/2 - 68);

                // X-pattern on barn doors (classic detail)
                stroke(140, 100, 80, 200);
                strokeWeight(2);
                line(target.x - 25, target.y + 10, target.x - 5, target.y + 40);
                line(target.x - 25, target.y + 40, target.x - 5, target.y + 10);
                line(target.x + 5, target.y + 10, target.x + 25, target.y + 40);
                line(target.x + 5, target.y + 40, target.x + 25, target.y + 10);

                rectMode(CORNER); // Reset mode
            } else if (target.type === 'babyTurkey') {
                // Baby turkey with glass effect and squash/stretch animation
                // Calculate squash and stretch based on jump velocity
                let jumpProgress = sin(frameCount * target.jumpSpeed + target.jumpPhase);
                let squashFactor = 1 + (jumpProgress * 0.15); // Stretch when going up, squash when landing
                let stretchFactor = 1 - (jumpProgress * 0.1);

                // Glow
                fill(200, 140, 100, 60);
                noStroke();
                ellipse(target.x, target.y, target.w * 1.1 * stretchFactor, target.h * 1.1 * squashFactor);

                // Body with squash and stretch
                fill(180, 120, 80, 200);
                stroke(220, 160, 120, 220);
                strokeWeight(1.5);
                ellipse(target.x, target.y, target.w * 0.8 * stretchFactor, target.h * 0.8 * squashFactor);

                // Highlight
                fill(240, 200, 160, 120);
                noStroke();
                ellipse(target.x - 5, target.y - 8 * squashFactor, 8 * stretchFactor, 6 * squashFactor);

                // Feathers - bob with motion
                fill(220, 120, 120, 200);
                stroke(255, 160, 160, 220);
                strokeWeight(1.5);
                let featherBob = jumpProgress * 3;
                triangle(target.x - 12, target.y - 12 * squashFactor + featherBob,
                        target.x - 18, target.y - 18 * squashFactor + featherBob,
                        target.x - 10, target.y - 18 * squashFactor + featherBob);

                // Beak
                fill(255, 220, 100, 220);
                stroke(255, 240, 180, 240);
                strokeWeight(1);
                triangle(target.x - 6, target.y, target.x, target.y + 6 * squashFactor, target.x - 3, target.y);

                // Add little motion lines when jumping fast
                if (abs(jumpProgress) > 0.7) {
                    stroke(255, 255, 255, 100);
                    strokeWeight(1);
                    line(target.x - 15, target.y + 5, target.x - 18, target.y + 8);
                    line(target.x + 15, target.y + 5, target.x + 18, target.y + 8);
                    line(target.x - 12, target.y + 10, target.x - 15, target.y + 14);
                    line(target.x + 12, target.y + 10, target.x + 15, target.y + 14);
                }
            }
        }

        pop();
    }
}

function drawProjectile() {
    if (!projectile) return;

    push();

    if (pumpkinImg && pumpkinImg.width > 0) {
        // Add glow around pumpkin image
        fill(255, 180, 100, 80);
        noStroke();
        ellipse(projectile.x, projectile.y, 50, 50);

        imageMode(CENTER);
        tint(255, 255, 255, 240);
        image(pumpkinImg, projectile.x, projectile.y, 40, 40);
        noTint();
    } else {
        // Fallback: glassy orange circle with glow
        // Outer glow
        fill(255, 180, 100, 60);
        noStroke();
        ellipse(projectile.x, projectile.y, 45, 45);

        // Glass effect
        fill(255, 160, 80, 200);
        stroke(255, 200, 150, 150);
        strokeWeight(2);
        ellipse(projectile.x, projectile.y, 30, 30);

        // Highlight
        fill(255, 220, 180, 180);
        noStroke();
        ellipse(projectile.x - 5, projectile.y - 5, 12, 12);
    }

    pop();
}

function updateTurkeyAttack() {
    // Find the attacking turkey
    for (let target of targets) {
        if (target.attacking && !target.hit) {
            // Move turkey toward catapult
            target.x -= CONFIG.turkeySpeed;

            // Check if turkey reached the catapult (catapult is at x=100)
            if (target.x <= 150 && !catapultDestroyed) {
                gameState = 'gameOver';
                turkeyAttacking = true;
                hammerStrikePos = { x: 120, y: height - 90 }; // Save hammer position
                createCatapultDebris(); // Destroy the catapult!
                console.log('Turkey attacked the catapult! Game Over!');
            }
        }
    }
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
    // Glass panel for stats
    if (gameState === 'aiming' || gameState === 'flying') {
        drawGlassPanel(10, 10, 180, 120, 15);
    } else {
        drawGlassPanel(10, 10, 180, 80, 15);
    }

    // Score and stats - Left aligned text
    textAlign(LEFT);
    textSize(20);

    // Draw score with 3D effect
    for (let i = 3; i > 0; i--) {
        fill(50, 150, 50);
        noStroke();
        text(`Score: ${score}`, 20 + i, 30 + i);
    }
    strokeWeight(2);
    stroke(255, 255, 255, 150);
    fill(150, 255, 150);
    text(`Score: ${score}`, 20, 30);

    // Draw launches with 3D effect
    for (let i = 3; i > 0; i--) {
        fill(50, 50, 150);
        noStroke();
        text(`Launches: ${launches}`, 20 + i, 60 + i);
    }
    strokeWeight(2);
    stroke(255, 255, 255, 150);
    fill(150, 220, 255);
    text(`Launches: ${launches}`, 20, 60);

    if (gameState === 'aiming' || gameState === 'flying') {
        // Draw angle with 3D effect
        for (let i = 3; i > 0; i--) {
            fill(150, 100, 50);
            noStroke();
            text(`Angle: ${angle}°`, 20 + i, 90 + i);
        }
        strokeWeight(2);
        stroke(255, 255, 255, 150);
        fill(255, 200, 150);
        text(`Angle: ${angle}°`, 20, 90);

        // Draw power with 3D effect
        for (let i = 3; i > 0; i--) {
            fill(150, 50, 50);
            noStroke();
            text(`Power: ${power}`, 20 + i, 120 + i);
        }
        strokeWeight(2);
        stroke(255, 255, 255, 150);
        fill(255, 150, 150);
        text(`Power: ${power}`, 20, 120);
    }

    // Turkey distance warning
    let attackingTurkey = targets.find(t => t.attacking && !t.hit);
    if (attackingTurkey && gameState !== 'gameOver') {
        let distance = Math.floor(attackingTurkey.x - 100);
        drawGlassPanel(width/2 - 300, height - 60, 600, 50, 20);
        draw3DText(`⚠️ TURKEY APPROACHING! Distance: ${distance}px ⚠️`, width/2, height - 30, 24, color(255, 100, 100), color(150, 50, 50), 4);
    }

    // Game Over
    if (gameState === 'gameOver' && turkeyAttacking) {
        // Large glass panel for game over
        drawGlassPanel(width/2 - 350, height/2 - 100, 700, 300, 30);
        draw3DText('🦃 GAME OVER! 🦃', width/2, height/2 - 40, 60, color(255, 150, 150), color(150, 80, 80), 6);
        draw3DText('The turkey destroyed your catapult!', width/2, height/2 + 30, 28, color(255, 200, 200), color(150, 100, 100), 3);
        draw3DText(`Score: ${score} | Launches: ${launches}`, width/2, height/2 + 80, 24, color(255, 230, 180), color(150, 120, 80), 3);
        draw3DText('Refresh to play again!', width/2, height/2 + 120, 20, color(220, 220, 255), color(120, 120, 180), 2);
    }

    // Check if all targets hit (Victory)
    if (targets.every(t => t.hit) && gameState !== 'gameOver') {
        // Large glass panel for victory
        drawGlassPanel(width/2 - 350, height/2 - 80, 700, 240, 30);
        draw3DText('🎉 ALL TARGETS HIT! 🎉', width/2, height/2 - 20, 60, color(255, 240, 150), color(180, 150, 80), 6);
        draw3DText(`Score: ${score} | Launches: ${launches}`, width/2, height/2 + 50, 28, color(180, 255, 180), color(100, 180, 100), 3);
        draw3DText('Refresh to play again!', width/2, height/2 + 100, 24, color(220, 220, 255), color(120, 120, 180), 3);
        gameState = 'gameOver'; // Prevent further input
    }
}

function launchProjectile() {
    const launchAngle = radians(angle);

    projectile = {
        x: 100,
        y: height - 90,
        vx: cos(-launchAngle) * power * 0.75,
        vy: sin(-launchAngle) * power * 0.75
    };

    gameState = 'flying';
}

function keyPressed() {
    // Start music on first key press
    if (!musicStarted) {
        musicStarted = true;
        noteStartTime = millis() / 1000;
        playNote(melody[0].freq, melody[0].duration);
        console.log('Music started!');
    }

    // Toggle music mute with M key
    if (key === 'm' || key === 'M') {
        musicMuted = !musicMuted;
        console.log('Music ' + (musicMuted ? 'muted' : 'unmuted'));
    }

    // Launch with spacebar
    if (gameState === 'aiming' && !catapultDestroyed && key === ' ') {
        launchProjectile();
    }
}
