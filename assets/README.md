# Power-Up Assets for Space Shooter

## Overview
This folder contains the power-up image assets for your space shooter game.

## Power-Up Types

### 1. Health Power-Up (`powerup_health.png`)
- **Design**: Green medical cross with healing aura
- **Effect**: Restores player health when collected
- **Color**: Bright green (#00ff88) with white cross symbol
- **Visual**: Circular background with medical cross and sparkle effects

### 2. Firepower Power-Up (`powerup_firepower.png`)
- **Design**: Orange diamond with weapon arrows
- **Effect**: Increases player shooting power (single → double → triple shot)
- **Color**: Orange (#ff8800) with white arrow symbols
- **Visual**: Diamond shape with bidirectional arrows and energy sparks

## How to Generate PNG Files

1. Open `powerup-generator.html` in your web browser
2. Adjust the size slider to your preferred power-up size (recommended: 64px)
3. Click "Generate Power-Ups" to create the images
4. Right-click on each canvas preview
5. Select "Save image as..." from the context menu
6. Save as:
   - `powerup_health.png` for the health power-up
   - `powerup_firepower.png` for the firepower power-up

## File Structure
```
assets/
├── powerup_health.png     (Health power-up image)
├── powerup_firepower.png  (Firepower power-up image)
├── powerup-generator.html (Tool to generate the PNG files)
└── README.md             (This file)
```

## Game Integration
The game will automatically load these PNG files when they exist in the assets folder. If the PNG files are not found, the game will use fallback canvas-drawn power-ups with the same visual design.

## Customization
You can create your own power-up designs by:
1. Creating PNG files with the same filenames
2. Using 64x64 pixel resolution (or your preferred size)
3. Using transparent backgrounds for best results
4. Including glow effects for better visual appeal

## Technical Notes
- The game supports any power-up size, but 64x64 pixels works well
- PNG format with transparency is recommended
- The images will be rotated in-game for visual effect
- Glow effects are added programmatically in the game code