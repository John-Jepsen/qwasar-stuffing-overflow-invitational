# 🎃 Pumpkin Catapult Physics Game

Launch pumpkins from a catapult to hit Thanksgiving-themed targets across 3 challenging levels!

## Game Features
- **3 Progressive Levels** - Increasing difficulty with more targets and faster speeds
- **Multiple Target Types**:
  - 🏠 Barns - Stationary ground targets (50 points, explode when hit)
  - 🦃 Walking Turkeys - Ground targets that move left/right (70-130 points based on size)
  - 🦃 Flying Turkeys - Aerial targets moving in 2D (70-130 points based on size, fall when hit)
- **Dynamic Gameplay**:
  - Random wind affecting projectile trajectory
  - Variable turkey sizes (small = more points, harder to hit)
  - Targets placed at random positions and heights each game
  - Explosion effects on barn hits
  - Falling turkey animations
- **Visual Effects**:
  - Score popups showing points earned
  - Particle explosions
  - Animated wind indicators
  - Custom background image support

## Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- A local web server (Python 3, Node.js http-server, or VS Code Live Server extension)

## Installation & Setup

1. **Clone or download this repository**

2. **Start a local web server**:
   
   ```bash
   cd pumpkin-catapult
   python3 -m http.server 8000
   ```

3. **Open your browser** and navigate to:
   - `http://localhost:8000`

## How to Play

### Controls
- **UP/DOWN Arrow Keys**: Adjust launch angle (10° - 80°)
- **LEFT/RIGHT Arrow Keys**: Adjust launch power
- **SPACEBAR**: Launch the pumpkin (or advance to next level)
- **R Key**: Restart game from Level 1

### Game Objective
Progress through 3 levels by hitting all targets with limited pumpkins (15 per level):

**Level 1:**
- 3 stationary barns (50 pts each)
- 2 walking turkeys (70-130 pts based on size)
- 5 flying turkeys (70-130 pts based on size)
- Normal speed

**Level 2:**
- 4 stationary barns
- 3 walking turkeys  
- 6 flying turkeys
- 20% faster movement

**Level 3:**
- 5 stationary barns
- 4 walking turkeys
- 7 flying turkeys
- 44% faster movement

### Scoring System
- **Small Turkeys** 🦃 (smallest): 130 points
- **Medium Turkeys** 🦃: 100 points
- **Large Turkeys** 🦃 (biggest): 70 points
- **Barns** 🏠: 50 points

**Strategy Tips:**
- Account for wind when aiming (shown in top-left)
- Small turkeys are harder to hit but worth more points
- Flying turkeys move in 2D, walking turkeys only move left/right
- Barns are stationary but positioned randomly each game
- Score carries over between levels

## Customization

### Adjust Gameplay Physics
Edit the `CONFIG` object at the top of `game.js`:

```javascript
const CONFIG = {
    minAngle: 10,        // Minimum launch angle (degrees)
    maxAngle: 80,        // Maximum launch angle (degrees)
    minPower: 5,         // Minimum launch power
    maxPower: 25,        // Maximum launch power
    gravity: 0.3,        // Gravity strength
    targetDistance: 400  // Reference distance
};
```

### Add Custom Background
Place a `background.png` image in the `assets/` folder to replace the default sky/ground background.

### Modify Level Difficulty
In the `generateRandomTargets()` function, adjust:
- Target counts per level
- Speed factor multiplier (currently 1.2x per level)
- Target placement ranges

## File Structure
```
pumpkin-catapult/
├── index.html          # Main game page
├── game.js             # Game logic, physics, and levels
├── README.md           # This file
└── assets/             # Game assets
    ├── background.png  # Background image (optional)
    ├── pumpkin.png     # Projectile sprite (falls back to emoji)
    ├── turkey.png      # Target sprite (falls back to emoji)
    └── barn.png        # Target sprite (falls back to emoji)
```

**Note:** The game uses emoji fallbacks (🎃🦃🏠) if images are not found, so images are optional.

## Technical Details

### Features Implemented
- ✅ Restart functionality (R key)
- ✅ Random target positioning with platforms
- ✅ Moving targets (flying and walking)
- ✅ Wind system affecting projectiles
- ✅ 3-level progression system
- ✅ Variable turkey sizes with different point values
- ✅ Floating score indicators
- ✅ Explosion particle effects on barn hits
- ✅ Falling turkey animations
- ✅ Direction-based turkey sprite flipping
- ✅ Custom background image support
- ✅ Limited projectiles per level (15)
- ✅ Level completion and game over screens

### Physics System
- Gravity-based projectile motion
- Wind affecting horizontal velocity
- Collision detection with variable-sized targets
- Boundary checking for moving targets

## Troubleshooting
- **Game won't start?** Ensure you're using a local web server, not opening file directly
- **Physics feels wrong?** Adjust gravity and power values in CONFIG
- **Targets too hard to hit?** Increase collision detection radius in `updateProjectile()` function
- **Targets moving too fast/slow?** Adjust the `speedFactor` multiplier in `generateRandomTargets()`
- **Wind too strong?** Modify wind range in `restartGame()` function (currently -0.3 to 0.3)

## Credits
Built with [p5.js](https://p5js.org/) - A JavaScript library for creative coding

Have fun launching pumpkins! 🎃🦃
