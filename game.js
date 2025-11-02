// Game Canvas and Context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Sound System
const sounds = {};
let soundEnabled = true;
let menuMusicPlaying = false;
let gameMusicPlaying = false;

// Sound files configuration
const soundFiles = {
    menuMusic: './sounds/menu-music.mp3',
    gameMusic: './sounds/game-music.mp3',
    playerShoot: './sounds/player-shoot.wav',
    enemyShoot: './sounds/enemy-shoot.wav',
    enemyDestroy: './sounds/enemy-destroy.wav',
    bossDestroy: './sounds/boss-destroy.wav',
    meteorDestroy: './sounds/meteor-destroy.wav',
    playerHit: './sounds/player-hit.wav',
    powerUp: './sounds/powerup.wav',
    bulletCollision: './sounds/bullet-collision.wav',
    bossAppear: './sounds/boss-appear.wav',
    levelComplete: './sounds/level-complete.wav',
    gameOver: './sounds/game-over.wav'
};

// Load Sound System
function loadSounds() {
    Object.keys(soundFiles).forEach(soundName => {
        const audio = new Audio();
        
        // Create fallback silence for missing files
        const silenceCanvas = document.createElement('canvas');
        const silenceCtx = silenceCanvas.getContext('2d');
        silenceCanvas.width = 1;
        silenceCanvas.height = 1;
        
        // Try to load the actual sound file
        audio.onerror = () => {
            // If sound file doesn't exist, create a silent audio
            console.log(`Sound file ${soundFiles[soundName]} not found, using silence`);
        };
        
        audio.src = soundFiles[soundName];
        audio.preload = 'auto';
        audio.volume = 0.7;
        
        // Special settings for music tracks
        if (soundName === 'menuMusic' || soundName === 'gameMusic') {
            audio.loop = true;
            audio.volume = 0.3;
        }
        
        sounds[soundName] = audio;
    });
}

// Sound Control Functions
function playSound(soundName, volume = null) {
    if (!soundEnabled || !sounds[soundName]) return;
    
    try {
        const sound = sounds[soundName].cloneNode();
        if (volume !== null) sound.volume = volume;
        sound.play().catch(e => console.log(`Could not play ${soundName}:`, e));
    } catch (e) {
        console.log(`Error playing ${soundName}:`, e);
    }
}

function playMusic(musicName) {
    if (!soundEnabled || !sounds[musicName]) return;
    
    try {
        sounds[musicName].currentTime = 0;
        sounds[musicName].play().catch(e => console.log(`Could not play ${musicName}:`, e));
        
        if (musicName === 'menuMusic') {
            menuMusicPlaying = true;
            gameMusicPlaying = false;
        } else if (musicName === 'gameMusic') {
            gameMusicPlaying = true;
            menuMusicPlaying = false;
        }
    } catch (e) {
        console.log(`Error playing ${musicName}:`, e);
    }
}

function stopMusic(musicName) {
    if (sounds[musicName]) {
        sounds[musicName].pause();
        sounds[musicName].currentTime = 0;
        
        if (musicName === 'menuMusic') {
            menuMusicPlaying = false;
        } else if (musicName === 'gameMusic') {
            gameMusicPlaying = false;
        }
    }
}

function stopAllMusic() {
    stopMusic('menuMusic');
    stopMusic('gameMusic');
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    
    if (!soundEnabled) {
        stopAllMusic();
    } else {
        // Resume appropriate music based on game state
        if (gameState === 'menu' || gameState === 'nameInput' || gameState === 'difficulty') {
            playMusic('menuMusic');
        } else if (gameState === 'playing') {
            playMusic('gameMusic');
        }
    }
    
    updateSoundButton();
    return soundEnabled;
}

function updateSoundButton() {
    const soundButton = document.getElementById('soundToggle');
    if (soundButton) {
        soundButton.textContent = soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        soundButton.className = soundEnabled ? 'sound-btn sound-on' : 'sound-btn sound-off';
    }
}

// Image Assets
const images = {};
let imagesLoaded = 0;
const totalImages = 9;

// Game State
let gameState = 'loading'; // 'loading', 'splash', 'nameInput', 'difficulty', 'menu', 'playing', 'paused', 'gameOver', 'levelComplete'
let score = 0;
let lives = 3;
let gameSpeed = 1;
let currentLevel = 1;
let maxLevel = 5;
let enemiesKilled = 0;
let enemiesNeededForBoss = 10; // Enemies to kill before boss appears
let playerName = '';
let difficulty = 'normal';
let difficultySettings = {
    easy: { speedMultiplier: 0.7, healthMultiplier: 1.5, spawnMultiplier: 0.8, startLives: 5 },
    normal: { speedMultiplier: 1.0, healthMultiplier: 1.0, spawnMultiplier: 1.0, startLives: 3 },
    hard: { speedMultiplier: 1.4, healthMultiplier: 0.7, spawnMultiplier: 1.3, startLives: 2 }
};

// Game Objects
let player = {};
let bullets = [];
let enemies = [];
let meteors = [];
let powerUps = [];
let particles = [];
let stars = [];
let boss = null;

// Input Handling
const keys = {};
const mouse = { x: 0, y: 0, clicked: false };

// Game Settings
const GAME_SETTINGS = {
    PLAYER_SPEED: 5,
    BULLET_SPEED: 8,
    ENEMY_SPEED: 2,
    METEOR_BASE_SPEED: 4,
    METEOR_SPAWN_RATE: 0.015, // Increased from 0.008
    ENEMY_SPAWN_RATE: 0.03, // Increased from 0.02
    POWERUP_SPAWN_RATE: 0.008, // Increased from 0.005
    MAX_ENEMIES: 20, // Increased from 15
    MAX_METEORS: 12 // Increased from 8
};

// Load Images
function loadImages() {
    const imageFiles = [
        { name: 'player', src: './assets/Main Ship-Base-Full-health.png' },
        { name: 'enemy1', src: './assets/enemy_1.png' },
        { name: 'enemy2', src: './assets/enemy_2.png' },
        { name: 'enemy3', src: './assets/enemy_3.png' },
        { name: 'bullet', src: './assets/bullet.png' },
        { name: 'powerup_health', src: './assets/powerup_health.png' },
        { name: 'powerup_firepower', src: './assets/powerup_firepower.png' },
        { name: 'meteor', src: './assets/meteor_2.gif' },
        { name: 'boss', src: './assets/boss_1.png' }
    ];

    // Create simple colored rectangles as fallback images
    imageFiles.forEach(imageFile => {
        const img = new Image();
        
        // Create canvas-based fallback images
        const fallbackCanvas = document.createElement('canvas');
        fallbackCanvas.width = 64;
        fallbackCanvas.height = 64;
        const fallbackCtx = fallbackCanvas.getContext('2d');
        
        // Set colors and shapes based on image type
        switch(imageFile.name) {
            case 'player':
                // Advanced fighter ship
                fallbackCtx.fillStyle = '#0088ff';
                fallbackCtx.fillRect(28, 10, 8, 40); // Main body
                fallbackCtx.fillRect(24, 20, 16, 20); // Center hull
                fallbackCtx.fillStyle = '#00aaff';
                fallbackCtx.fillRect(20, 15, 24, 8); // Wings
                fallbackCtx.fillRect(26, 5, 12, 10); // Cockpit
                fallbackCtx.fillStyle = '#ffffff';
                fallbackCtx.fillRect(30, 7, 4, 6); // Cockpit window
                fallbackCtx.fillStyle = '#ff4400';
                fallbackCtx.fillRect(22, 45, 4, 8); // Left engine
                fallbackCtx.fillRect(38, 45, 4, 8); // Right engine
                // Glow effect
                fallbackCtx.shadowColor = '#0088ff';
                fallbackCtx.shadowBlur = 8;
                break;
                
            case 'enemy1':
                // Advanced Fighter - Red
                fallbackCtx.fillStyle = '#ff0000';
                fallbackCtx.shadowColor = '#ff0000';
                fallbackCtx.shadowBlur = 8;
                // Main body - sleek fighter design
                fallbackCtx.fillRect(26, 15, 12, 35);
                // Cockpit
                fallbackCtx.fillStyle = '#ff4444';
                fallbackCtx.fillRect(28, 12, 8, 8);
                // Wings with weapon pods
                fallbackCtx.fillStyle = '#cc0000';
                fallbackCtx.fillRect(18, 22, 28, 8);
                fallbackCtx.fillRect(20, 18, 6, 16);
                fallbackCtx.fillRect(38, 18, 6, 16);
                // Engine exhausts
                fallbackCtx.fillStyle = '#ffaa00';
                fallbackCtx.fillRect(24, 42, 4, 8);
                fallbackCtx.fillRect(36, 42, 4, 8);
                // Weapon barrels
                fallbackCtx.fillStyle = '#ffffff';
                fallbackCtx.fillRect(22, 36, 2, 6);
                fallbackCtx.fillRect(40, 36, 2, 6);
                break;
                
            case 'enemy2':
                // Heavy Interceptor - Orange
                fallbackCtx.fillStyle = '#ff8800';
                fallbackCtx.shadowColor = '#ff8800';
                fallbackCtx.shadowBlur = 9;
                // Main hull - broader design
                fallbackCtx.fillRect(22, 12, 20, 38);
                // Command section
                fallbackCtx.fillStyle = '#ffaa44';
                fallbackCtx.fillRect(26, 8, 12, 12);
                // Heavy armor plating
                fallbackCtx.fillStyle = '#cc6600';
                fallbackCtx.fillRect(18, 18, 28, 20);
                // Side weapon bays
                fallbackCtx.fillRect(16, 22, 8, 12);
                fallbackCtx.fillRect(40, 22, 8, 12);
                // Engine array
                fallbackCtx.fillStyle = '#ff4400';
                fallbackCtx.fillRect(20, 44, 6, 10);
                fallbackCtx.fillRect(26, 46, 4, 8);
                fallbackCtx.fillRect(34, 46, 4, 8);
                fallbackCtx.fillRect(38, 44, 6, 10);
                // Bridge windows
                fallbackCtx.fillStyle = '#ffffff';
                fallbackCtx.fillRect(28, 10, 8, 4);
                break;
                
            case 'enemy3':
                // Battle Cruiser - Purple
                fallbackCtx.fillStyle = '#8800ff';
                fallbackCtx.shadowColor = '#8800ff';
                fallbackCtx.shadowBlur = 10;
                // Main battleship hull
                fallbackCtx.fillRect(20, 8, 24, 45);
                // Heavy armor sections
                fallbackCtx.fillStyle = '#aa44ff';
                fallbackCtx.fillRect(16, 15, 32, 30);
                // Command tower
                fallbackCtx.fillRect(26, 4, 12, 15);
                // Weapon turrets
                fallbackCtx.fillStyle = '#6600cc';
                fallbackCtx.fillRect(14, 20, 8, 8);
                fallbackCtx.fillRect(42, 20, 8, 8);
                fallbackCtx.fillRect(14, 35, 8, 8);
                fallbackCtx.fillRect(42, 35, 8, 8);
                // Engine exhausts
                fallbackCtx.fillStyle = '#ff00ff';
                fallbackCtx.fillRect(22, 48, 4, 10);
                fallbackCtx.fillRect(28, 50, 8, 8);
                fallbackCtx.fillRect(38, 48, 4, 10);
                // Bridge
                fallbackCtx.fillStyle = '#ffffff';
                fallbackCtx.fillRect(28, 6, 8, 6);
                // Weapon barrels
                fallbackCtx.fillStyle = '#ffaa00';
                fallbackCtx.fillRect(16, 18, 4, 12);
                fallbackCtx.fillRect(44, 18, 4, 12);
                break;
                
            case 'bullet':
                // Plasma bolt
                fallbackCtx.fillStyle = '#ffff00';
                fallbackCtx.shadowColor = '#ffff00';
                fallbackCtx.shadowBlur = 5;
                fallbackCtx.fillRect(30, 20, 4, 20);
                fallbackCtx.fillStyle = '#ffffff';
                fallbackCtx.fillRect(31, 22, 2, 16);
                // Energy trail
                fallbackCtx.fillStyle = '#ffff88';
                fallbackCtx.fillRect(30.5, 18, 3, 4);
                break;
                
            case 'powerup_health':
                // Health power-up - Green cross design
                fallbackCtx.fillStyle = '#00ff88';
                fallbackCtx.shadowColor = '#00ff88';
                fallbackCtx.shadowBlur = 10;
                // Background circle
                fallbackCtx.beginPath();
                fallbackCtx.arc(32, 32, 18, 0, Math.PI * 2);
                fallbackCtx.fill();
                // Inner glow
                fallbackCtx.fillStyle = '#88ffaa';
                fallbackCtx.beginPath();
                fallbackCtx.arc(32, 32, 12, 0, Math.PI * 2);
                fallbackCtx.fill();
                // White cross
                fallbackCtx.fillStyle = '#ffffff';
                fallbackCtx.fillRect(28, 20, 8, 24); // Vertical bar
                fallbackCtx.fillRect(20, 28, 24, 8); // Horizontal bar
                // Center highlight
                fallbackCtx.fillStyle = '#ccffcc';
                fallbackCtx.fillRect(30, 30, 4, 4);
                break;
                
            case 'powerup_firepower':
                // Firepower power-up - Orange diamond with weapon symbols
                fallbackCtx.fillStyle = '#ff8800';
                fallbackCtx.shadowColor = '#ff8800';
                fallbackCtx.shadowBlur = 10;
                // Diamond shape
                fallbackCtx.beginPath();
                fallbackCtx.moveTo(32, 12); // Top
                fallbackCtx.lineTo(50, 32); // Right
                fallbackCtx.lineTo(32, 52); // Bottom
                fallbackCtx.lineTo(14, 32); // Left
                fallbackCtx.closePath();
                fallbackCtx.fill();
                // Inner diamond
                fallbackCtx.fillStyle = '#ffaa44';
                fallbackCtx.beginPath();
                fallbackCtx.moveTo(32, 18);
                fallbackCtx.lineTo(44, 32);
                fallbackCtx.lineTo(32, 46);
                fallbackCtx.lineTo(20, 32);
                fallbackCtx.closePath();
                fallbackCtx.fill();
                // Weapon symbols (double arrows)
                fallbackCtx.fillStyle = '#ffffff';
                fallbackCtx.fillRect(24, 30, 16, 2);
                fallbackCtx.fillRect(24, 34, 16, 2);
                // Arrow tips
                fallbackCtx.beginPath();
                fallbackCtx.moveTo(38, 28);
                fallbackCtx.lineTo(42, 32);
                fallbackCtx.lineTo(38, 36);
                fallbackCtx.fill();
                fallbackCtx.beginPath();
                fallbackCtx.moveTo(26, 28);
                fallbackCtx.lineTo(22, 32);
                fallbackCtx.lineTo(26, 36);
                fallbackCtx.fill();
                break;
                
            case 'meteor':
                // Space debris/asteroid
                fallbackCtx.fillStyle = '#666666';
                fallbackCtx.shadowColor = '#333333';
                fallbackCtx.shadowBlur = 6;
                // Irregular shape
                fallbackCtx.fillRect(15, 15, 34, 34);
                fallbackCtx.fillStyle = '#888888';
                fallbackCtx.fillRect(20, 20, 8, 8);
                fallbackCtx.fillRect(35, 25, 6, 6);
                fallbackCtx.fillRect(25, 35, 10, 8);
                fallbackCtx.fillStyle = '#444444';
                fallbackCtx.fillRect(18, 30, 5, 5);
                fallbackCtx.fillRect(40, 35, 4, 4);
                // Metal debris
                fallbackCtx.fillStyle = '#aaaaaa';
                fallbackCtx.fillRect(22, 18, 3, 3);
                fallbackCtx.fillRect(38, 40, 2, 2);
                break;
                
            case 'boss':
                // Command battleship
                fallbackCtx.fillStyle = '#ff0066';
                fallbackCtx.shadowColor = '#ff0066';
                fallbackCtx.shadowBlur = 10;
                // Main hull
                fallbackCtx.fillRect(16, 8, 32, 48);
                // Heavy armor plating
                fallbackCtx.fillRect(8, 20, 48, 24);
                // Bridge section
                fallbackCtx.fillStyle = '#ff4488';
                fallbackCtx.fillRect(20, 4, 24, 16);
                // Command tower
                fallbackCtx.fillRect(28, 0, 8, 8);
                // Weapon mounts
                fallbackCtx.fillStyle = '#ffaa00';
                fallbackCtx.fillRect(6, 18, 6, 8);
                fallbackCtx.fillRect(52, 18, 6, 8);
                fallbackCtx.fillRect(6, 38, 6, 8);
                fallbackCtx.fillRect(52, 38, 8, 8);
                // Engine array
                fallbackCtx.fillStyle = '#ff0000';
                fallbackCtx.fillRect(12, 50, 8, 8);
                fallbackCtx.fillRect(44, 50, 8, 8);
                fallbackCtx.fillRect(28, 52, 8, 6);
                break;
        }
        
        // Convert canvas to image
        const fallbackImage = new Image();
        fallbackImage.src = fallbackCanvas.toDataURL();
        
        // Store the fallback image immediately
        images[imageFile.name] = fallbackImage;
        
        // Try to load the actual image (but fallback is already ready)
        img.onload = () => {
            images[imageFile.name] = img;
            imageLoaded();
        };
        
        img.onerror = () => {
            // Keep the fallback image
            imageLoaded();
        };
        
        img.src = imageFile.src;
        
        // Also trigger imageLoaded for the fallback
        setTimeout(imageLoaded, 10);
    });
}

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded >= totalImages) {
        gameState = 'splash';
        loadSounds(); // Load sounds after images
        showSplashScreen();
        
        // Start menu music after a short delay
        setTimeout(() => {
            playMusic('menuMusic');
        }, 1000);
    }
}

function updateLoadingScreen() {
    if (gameState === 'loading') {
        document.body.className = 'loading';
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw animated background
        drawStars();
        
        // Loading title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SPACE SHOOTER', canvas.width / 2, canvas.height / 2 - 80);
        
        // Loading text
        ctx.font = '24px Arial';
        ctx.fillStyle = '#00ff88';
        ctx.fillText('Loading Assets...', canvas.width / 2, canvas.height / 2 - 20);
        
        // Progress display
        ctx.font = '18px Arial';
        ctx.fillStyle = '#88ffaa';
        ctx.fillText(`${imagesLoaded}/${totalImages} Assets Loaded`, canvas.width / 2, canvas.height / 2 + 20);
        
        // Progress bar
        const barWidth = 400;
        const barHeight = 25;
        const progress = imagesLoaded / totalImages;
        
        // Progress bar background
        ctx.fillStyle = '#333333';
        ctx.fillRect(canvas.width / 2 - barWidth / 2, canvas.height / 2 + 60, barWidth, barHeight);
        
        // Progress bar border
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 2;
        ctx.strokeRect(canvas.width / 2 - barWidth / 2, canvas.height / 2 + 60, barWidth, barHeight);
        
        // Progress bar fill
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(canvas.width / 2 - barWidth / 2 + 2, canvas.height / 2 + 62, (barWidth - 4) * progress, barHeight - 4);
        
        // Loading animation dots
        const time = Date.now();
        const dots = Math.floor((time / 300) % 4);
        ctx.fillStyle = '#ffffff';
        ctx.font = '20px Arial';
        ctx.fillText('.'.repeat(dots), canvas.width / 2 + 150, canvas.height / 2 + 140);
        
        if (gameState === 'loading') {
            setTimeout(updateLoadingScreen, 100);
        }
    }
}

function showSplashScreen() {
    gameState = 'splash';
    document.body.className = 'splash';
    
    // Hide all overlay menus
    document.getElementById('gameOverlay').style.display = 'none';
    document.getElementById('nameInputMenu').style.display = 'none';
    document.getElementById('difficultyMenu').style.display = 'none';
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('gameOverMenu').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    
    // Start splash screen animation
    updateSplashScreen();
    
    // Automatically proceed to name input after 3 seconds or on click/key press
    setTimeout(() => {
        if (gameState === 'splash') {
            showNameInputMenu();
        }
    }, 3000);
}

function updateSplashScreen() {
    if (gameState === 'splash') {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Animated background stars
        drawStars();
        
        const time = Date.now() / 1000;
        
        // Main title with glow effect
        ctx.save();
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        
        // Pulsing effect for title
        const pulse = 1 + Math.sin(time * 3) * 0.1;
        ctx.scale(pulse, pulse);
        ctx.fillText('SPACE SHOOTER', canvas.width / 2 / pulse, (canvas.height / 2 - 100) / pulse);
        ctx.restore();
        
        // Subtitle
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 24px Arial';
        ctx.fillText('ULTIMATE EDITION', canvas.width / 2, canvas.height / 2 - 40);
        
        // Features list with fade-in effect
        const features = [
            '⚡ Enhanced Firepower System',
            '🛡️ Bullet-on-Bullet Combat',
            '🎵 Dynamic Sound System',
            '🚀 Epic Boss Battles',
            '💎 Power-Up Collection'
        ];
        
        ctx.font = '16px Arial';
        ctx.textAlign = 'left';
        
        const startY = canvas.height / 2 + 20;
        const lineHeight = 25;
        
        features.forEach((feature, index) => {
            const delay = index * 0.3;
            const fadeTime = time - delay;
            
            if (fadeTime > 0) {
                const alpha = Math.min(1, fadeTime * 2);
                ctx.fillStyle = `rgba(136, 255, 170, ${alpha})`;
                
                // Center the features
                const textWidth = ctx.measureText(feature).width;
                ctx.fillText(feature, canvas.width / 2 - textWidth / 2, startY + index * lineHeight);
            }
        });
        
        // "Press any key" message with blinking effect
        if (time > 2) {
            const blink = Math.sin(time * 4) > 0;
            if (blink) {
                ctx.fillStyle = '#ffff00';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('PRESS ANY KEY TO CONTINUE', canvas.width / 2, canvas.height - 60);
            }
        }
        
        // Developer credit
        ctx.fillStyle = '#666666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Powered by HTML5 Canvas & JavaScript', canvas.width / 2, canvas.height - 20);
        
        if (gameState === 'splash') {
            setTimeout(updateSplashScreen, 50);
        }
    }
}

// Menu System Functions
function showNameInputMenu() {
    gameState = 'nameInput';
    document.body.className = '';
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('nameInputMenu').style.display = 'block';
    document.getElementById('difficultyMenu').style.display = 'none';
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('gameOverMenu').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    
    // Focus on input
    setTimeout(() => {
        const input = document.getElementById('playerNameInput');
        input.focus();
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                showDifficultySelect();
            }
        });
    }, 100);
}

function showDifficultySelect() {
    const nameInput = document.getElementById('playerNameInput').value.trim();
    if (!nameInput) {
        alert('Please enter your pilot name!');
        return;
    }
    
    playerName = nameInput;
    document.getElementById('playerName').textContent = playerName;
    
    document.getElementById('nameInputMenu').style.display = 'none';
    document.getElementById('difficultyMenu').style.display = 'block';
}

function setDifficulty(selectedDifficulty) {
    difficulty = selectedDifficulty;
    
    document.getElementById('difficultyDisplay').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    document.getElementById('displayName').textContent = playerName;
    document.getElementById('displayDifficulty').textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
    
    document.getElementById('difficultyMenu').style.display = 'none';
    document.getElementById('startMenu').style.display = 'block';
    gameState = 'menu';
}

function showNameInput() {
    gameState = 'nameInput';
    showNameInputMenu();
}

// Initialize Game
function initGame() {
    // Create player
    player = {
        x: canvas.width / 2,
        y: canvas.height - 80,
        width: 60,  // Increased from 40 to 60
        height: 60, // Increased from 40 to 60
        speed: GAME_SETTINGS.PLAYER_SPEED,
        color: '#00ff00',
        health: 3,
        maxHealth: 3,
        invulnerable: false,
        invulnerabilityTime: 0,
        firepower: 1, // 1 = single shot, 2 = double shot, 3 = triple shot
        maxFirepower: 3
    };

    // Initialize arrays
    bullets = [];
    enemies = [];
    meteors = [];
    powerUps = [];
    particles = [];
    stars = [];
    boss = null;

    // Create background stars
    createStars();

    // Reset game state
    score = 0;
    lives = difficultySettings[difficulty].startLives;
    gameSpeed = difficultySettings[difficulty].speedMultiplier;
    currentLevel = 1;
    enemiesKilled = 0;
    updateUI();
}

// Create background stars
function createStars() {
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 2 + 1,
            opacity: Math.random() * 0.8 + 0.2
        });
    }
}

// Event Listeners
document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    
    // Skip splash screen on any key press
    if (gameState === 'splash') {
        showNameInputMenu();
        return;
    }
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'playing') {
            shoot();
        }
    }
    
    if (e.code === 'KeyP') {
        e.preventDefault();
        if (gameState === 'playing') {
            pauseGame();
        } else if (gameState === 'paused') {
            resumeGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('click', (e) => {
    mouse.clicked = true;
    
    // Skip splash screen on click
    if (gameState === 'splash') {
        showNameInputMenu();
        return;
    }
    
    if (gameState === 'playing') {
        shoot();
    }
    setTimeout(() => mouse.clicked = false, 100);
});

// Game Functions
function startGame() {
    if (gameState === 'loading') return; // Don't start if still loading
    gameState = 'playing';
    document.getElementById('gameOverlay').style.display = 'none';
    
    // Switch to game music
    stopMusic('menuMusic');
    playMusic('gameMusic');
    
    initGame();
    gameLoop();
}

function pauseGame() {
    gameState = 'paused';
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('pauseMenu').style.display = 'block';
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('gameOverMenu').style.display = 'none';
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('gameOverlay').style.display = 'none';
    gameLoop();
}

function gameOver() {
    gameState = 'gameOver';
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('gameOverMenu').style.display = 'block';
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    
    // Stop game music and play game over sound
    stopMusic('gameMusic');
    playSound('gameOver');
    
    // Create explosion effect
    createExplosion(player.x, player.y, '#ff0000', 20);
}

function restartGame() {
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('startMenu').style.display = 'block';
    document.getElementById('gameOverMenu').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    document.getElementById('nameInputMenu').style.display = 'none';
    document.getElementById('difficultyMenu').style.display = 'none';
    gameState = 'menu';
    
    // Switch back to menu music
    stopAllMusic();
    playMusic('menuMusic');
}

// Player Movement
function updatePlayer() {
    if (player.invulnerable) {
        player.invulnerabilityTime--;
        if (player.invulnerabilityTime <= 0) {
            player.invulnerable = false;
        }
    }

    // Movement with WASD or Arrow Keys
    if ((keys['KeyW'] || keys['ArrowUp']) && player.y > 0) {
        player.y -= player.speed;
    }
    if ((keys['KeyS'] || keys['ArrowDown']) && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }
    if ((keys['KeyA'] || keys['ArrowLeft']) && player.x > 0) {
        player.x -= player.speed;
    }
    if ((keys['KeyD'] || keys['ArrowRight']) && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
}

// Shooting
function shoot() {
    const bulletSpeed = GAME_SETTINGS.BULLET_SPEED;
    const bulletWidth = 4;
    const bulletHeight = 10;
    const playerCenterX = player.x + player.width / 2;
    
    switch(player.firepower) {
        case 1: // Single shot (default)
            bullets.push({
                x: playerCenterX - bulletWidth / 2,
                y: player.y,
                width: bulletWidth,
                height: bulletHeight,
                speed: bulletSpeed,
                color: '#ffff00',
                damage: 1,
                isPlayerBullet: true
            });
            break;
            
        case 2: // Double shot
            bullets.push({
                x: playerCenterX - bulletWidth / 2 - 8,
                y: player.y,
                width: bulletWidth,
                height: bulletHeight,
                speed: bulletSpeed,
                color: '#ffff00',
                damage: 1,
                isPlayerBullet: true
            });
            bullets.push({
                x: playerCenterX - bulletWidth / 2 + 8,
                y: player.y,
                width: bulletWidth,
                height: bulletHeight,
                speed: bulletSpeed,
                color: '#ffff00',
                damage: 1,
                isPlayerBullet: true
            });
            break;
            
        case 3: // Triple shot
            bullets.push({
                x: playerCenterX - bulletWidth / 2,
                y: player.y,
                width: bulletWidth,
                height: bulletHeight,
                speed: bulletSpeed,
                color: '#00ffff', // Cyan for max power
                damage: 1,
                isPlayerBullet: true
            });
            bullets.push({
                x: playerCenterX - bulletWidth / 2 - 12,
                y: player.y + 5,
                width: bulletWidth,
                height: bulletHeight,
                speed: bulletSpeed,
                color: '#00ffff',
                damage: 1,
                isPlayerBullet: true
            });
            bullets.push({
                x: playerCenterX - bulletWidth / 2 + 12,
                y: player.y + 5,
                width: bulletWidth,
                height: bulletHeight,
                speed: bulletSpeed,
                color: '#00ffff',
                damage: 1,
                isPlayerBullet: true
            });
            break;
    }
    
    // Play shooting sound
    playSound('playerShoot', 0.4);
}

function shootEnemyBullet(enemy) {
    // Different shooting patterns based on enemy type
    switch(enemy.image) {
        case 'enemy1': // Fast single shot
            bullets.push({
                x: enemy.x + enemy.width / 2 - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 8,
                speed: 5,
                color: '#ff6666',
                damage: 1,
                isPlayerBullet: false
            });
            break;
            
        case 'enemy2': // Twin shots
            bullets.push({
                x: enemy.x + enemy.width / 3 - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 8,
                speed: 4,
                color: '#ff8844',
                damage: 1,
                isPlayerBullet: false
            });
            bullets.push({
                x: enemy.x + (enemy.width * 2/3) - 2,
                y: enemy.y + enemy.height,
                width: 4,
                height: 8,
                speed: 4,
                color: '#ff8844',
                damage: 1,
                isPlayerBullet: false
            });
            break;
            
        case 'enemy3': // Heavy triple shot
            for(let i = -1; i <= 1; i++) {
                bullets.push({
                    x: enemy.x + enemy.width / 2 - 2 + (i * 8),
                    y: enemy.y + enemy.height,
                    width: 5,
                    height: 10,
                    speed: 3,
                    color: '#aa44ff',
                    damage: 2,
                    isPlayerBullet: false
                });
            }
            break;
    }
    
    // Play enemy shooting sound
    playSound('enemyShoot', 0.3);
}

// Update Bullets
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        if (bullet.isBossBullet) {
            // Handle different boss bullet types
            switch(bullet.type) {
                case 'homing':
                    // Homing bullets track the player
                    const dx = (player.x + player.width / 2) - bullet.x;
                    const dy = (player.y + player.height / 2) - bullet.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist > 0) {
                        // Apply homing force
                        bullet.vx += (dx / dist) * bullet.homingStrength;
                        bullet.vy += (dy / dist) * bullet.homingStrength;
                        
                        // Limit maximum speed
                        const currentSpeed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                        if (currentSpeed > bullet.maxSpeed) {
                            bullet.vx = (bullet.vx / currentSpeed) * bullet.maxSpeed;
                            bullet.vy = (bullet.vy / currentSpeed) * bullet.maxSpeed;
                        }
                    }
                    break;
                    
                case 'spiral':
                    // Spiral bullets curve as they move
                    const currentAngle = Math.atan2(bullet.vy, bullet.vx);
                    const newAngle = currentAngle + bullet.spiralRate;
                    const speed = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy);
                    bullet.vx = Math.cos(newAngle) * speed;
                    bullet.vy = Math.sin(newAngle) * speed;
                    break;
                    
                case 'chaos':
                    // Chaos bullets change direction randomly
                    if (bullet.changeDirection) {
                        bullet.directionChangeTimer++;
                        if (bullet.directionChangeTimer > 60) { // Change every 1 second
                            const randomAngle = Math.random() * Math.PI * 2;
                            const randomSpeed = 2 + Math.random() * 4;
                            bullet.vx = Math.cos(randomAngle) * randomSpeed;
                            bullet.vy = Math.sin(randomAngle) * randomSpeed;
                            bullet.directionChangeTimer = 0;
                        }
                    }
                    break;
            }
            
            // Move bullet
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;
            
            // Handle bouncing bullets
            if (bullet.bouncing && bullet.bounceCount < bullet.maxBounces) {
                // Bounce off left/right edges
                if (bullet.x <= 0 || bullet.x >= canvas.width - bullet.width) {
                    bullet.vx *= -1;
                    bullet.bounceCount++;
                    createParticle(bullet.x, bullet.y, bullet.color);
                }
                // Bounce off top/bottom edges
                if (bullet.y <= 0 || bullet.y >= canvas.height - bullet.height) {
                    bullet.vy *= -1;
                    bullet.bounceCount++;
                    createParticle(bullet.x, bullet.y, bullet.color);
                }
            }
            
            // Legacy rocket and bomb behavior (keeping for compatibility)
            if (bullet.isRocket) {
                const dx = player.x + player.width / 2 - bullet.x;
                const dy = player.y + player.height / 2 - bullet.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                    bullet.vx += (dx / dist) * 0.1;
                    bullet.vy += (dy / dist) * 0.1;
                }
            }
            
            if (bullet.isBomb) {
                const dx = player.x + player.width / 2 - bullet.x;
                const dy = player.y + player.height / 2 - bullet.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80) {
                    createExplosion(bullet.x, bullet.y, bullet.color, 15);
                    if (dist < 60 && !player.invulnerable) {
                        takeDamage();
                    }
                    bullets.splice(i, 1);
                    continue;
                }
            }
            
            // Enhanced collision detection with player
            let collisionDetected = false;
            
            // Use circular collision for homing and chaos bullets
            if (bullet.type === 'homing' || bullet.type === 'chaos') {
                collisionDetected = checkCircularCollision(bullet, player);
            } else {
                collisionDetected = checkCollision(player, bullet);
            }
            
            if (collisionDetected && !player.invulnerable) {
                // Create impact effect based on bullet type
                const explosionSize = bullet.type === 'homing' ? 12 : 
                                    bullet.type === 'chaos' ? 15 : 8;
                createExplosion(bullet.x, bullet.y, bullet.color, explosionSize);
                
                // Different damage amounts
                const actualDamage = bullet.damage || 1;
                for (let dmg = 0; dmg < actualDamage; dmg++) {
                    takeDamage();
                }
                
                bullets.splice(i, 1);
                continue;
            }
        } else if (bullet.isPlayerBullet) {
            // Player bullets move up
            bullet.y -= bullet.speed;
            
            // Check collision with enemy bullets (both boss bullets and regular enemy bullets)
            for (let j = bullets.length - 1; j >= 0; j--) {
                const enemyBullet = bullets[j];
                // Check collision with any enemy bullet (boss bullets or regular enemy bullets, but not player bullets)
                if ((enemyBullet.isBossBullet || !enemyBullet.isPlayerBullet) && enemyBullet !== bullet) {
                    let bulletCollision = false;
                    
                    // Use appropriate collision detection based on bullet type
                    if (enemyBullet.type === 'homing' || enemyBullet.type === 'chaos') {
                        bulletCollision = checkCircularCollision(bullet, enemyBullet);
                    } else {
                        bulletCollision = checkCollision(bullet, enemyBullet);
                    }
                    
                    if (bulletCollision) {
                        // Create explosion effect where bullets collided
                        createExplosion(bullet.x, bullet.y, '#ffff00', 8);
                        createExplosion(enemyBullet.x, enemyBullet.y, enemyBullet.color, 6);
                        
                        // Play bullet collision sound
                        playSound('bulletCollision', 0.5);
                        
                        // Remove both bullets
                        bullets.splice(Math.max(i, j), 1);
                        bullets.splice(Math.min(i, j), 1);
                        
                        // Adjust index since we removed bullets
                        if (j < i) {
                            i--;
                        }
                        i--; // Adjust for the removed player bullet
                        break; // Exit the inner loop
                    }
                }
            }
        } else {
            // Enemy bullets move down
            bullet.y += bullet.speed;
            
            // Check collision with player
            if (checkCollision(player, bullet) && !player.invulnerable) {
                takeDamage();
                bullets.splice(i, 1);
                continue;
            }
        }
        
        // Remove bullets that are off screen
        if (bullet.y < -50 || bullet.y > canvas.height + 50 || 
            bullet.x < -50 || bullet.x > canvas.width + 50) {
            bullets.splice(i, 1);
        }
    }
}

// Enemy System
function spawnEnemy() {
    if (enemies.length >= GAME_SETTINGS.MAX_ENEMIES) return;
    
    const diffSetting = difficultySettings[difficulty];
    
    const enemyTypes = [
        { color: '#ff0000', health: Math.floor(1 * diffSetting.healthMultiplier), speed: 2, points: 10, size: 40, image: 'enemy1' },
        { color: '#ff8800', health: Math.floor(2 * diffSetting.healthMultiplier), speed: 1.5, points: 20, size: 45, image: 'enemy2' },
        { color: '#8800ff', health: Math.floor(3 * diffSetting.healthMultiplier), speed: 1, points: 50, size: 50, image: 'enemy3' }
    ];
    
    const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    
    // Random movement patterns
    const movementPatterns = ['straight', 'zigzag', 'sine', 'diagonal'];
    const pattern = movementPatterns[Math.floor(Math.random() * movementPatterns.length)];
    
    // Random speeds (base speed ± 50%)
    const speedVariation = 0.5 + Math.random(); // 0.5 to 1.5 multiplier
    const enemySpeed = type.speed * gameSpeed * speedVariation;
    
    // Random shooting frequency - INCREASED FIREPOWER
    const shootChance = 0.008 + Math.random() * 0.015; // 0.8% to 2.3% chance per frame (much higher)
    
    enemies.push({
        x: Math.random() * (canvas.width - type.size),
        y: -type.size,
        width: type.size,
        height: type.size,
        speed: enemySpeed,
        color: type.color,
        health: type.health,
        maxHealth: type.health,
        points: type.points,
        image: type.image,
        // Movement pattern properties
        movementPattern: pattern,
        horizontalSpeed: (Math.random() - 0.5) * 4, // Increased horizontal movement
        sinOffset: Math.random() * Math.PI * 2, // Random starting phase for sine wave
        patternTime: 0,
        // Shooting properties - ENHANCED
        shootChance: shootChance,
        lastShot: 0,
        burstCount: 0,
        burstMode: Math.random() < 0.3 // 30% chance for burst fire mode
    });
}

// Meteor System
function spawnMeteor() {
    if (meteors.length >= GAME_SETTINGS.MAX_METEORS) return;
    
    // Calculate speed based on score - meteors get faster as score increases
    const speedMultiplier = 1 + (score / 1000); // +100% speed for every 1000 points
    const meteorSpeed = GAME_SETTINGS.METEOR_BASE_SPEED * speedMultiplier * gameSpeed;
    
    // Random size for meteors
    const meteorSize = Math.random() * 30 + 25; // Size between 25-55
    
    meteors.push({
        x: Math.random() * (canvas.width - meteorSize),
        y: -meteorSize,
        width: meteorSize,
        height: meteorSize,
        speed: meteorSpeed + Math.random() * 3, // Add some randomness
        color: '#666666',
        health: 2, // Meteors take 2 hits to destroy
        maxHealth: 2,
        points: 25,
        angle: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        trail: [] // For visual trail effect
    });
}

function updateMeteors() {
    // Don't spawn meteors during boss fight
    if (boss) return;
    
    // Spawn new meteors - rate increases with score
    const spawnRate = GAME_SETTINGS.METEOR_SPAWN_RATE + (score / 10000); // Increase spawn rate with score
    if (Math.random() < spawnRate) {
        spawnMeteor();
    }
    
    // Update existing meteors
    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.y += meteor.speed;
        // No rotation - meteors are space debris, not creatures
        
        // Add trail effect
        meteor.trail.push({ x: meteor.x + meteor.width / 2, y: meteor.y + meteor.height / 2 });
        if (meteor.trail.length > 5) {
            meteor.trail.shift();
        }
        
        // Remove meteors that are off screen
        if (meteor.y > canvas.height) {
            meteors.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        if (checkCollision(player, meteor) && !player.invulnerable) {
            takeDamage();
            createExplosion(meteor.x, meteor.y, '#ff6600', 15);
            meteors.splice(i, 1);
        }
    }
}

// Update Enemies
function updateEnemies() {
    // Don't spawn enemies during boss fight
    const diffSetting = difficultySettings[difficulty];
    const adjustedSpawnRate = GAME_SETTINGS.ENEMY_SPAWN_RATE * gameSpeed * diffSetting.spawnMultiplier;
    
    if (!boss && Math.random() < adjustedSpawnRate) {
        spawnEnemy();
    }
    
    // Update existing enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        
        // Apply movement pattern
        enemy.patternTime++;
        
        switch(enemy.movementPattern) {
            case 'straight':
                enemy.y += enemy.speed;
                break;
                
            case 'zigzag':
                enemy.y += enemy.speed;
                enemy.x += Math.sin(enemy.patternTime * 0.1) * 2;
                break;
                
            case 'sine':
                enemy.y += enemy.speed;
                enemy.x += Math.sin(enemy.patternTime * 0.05 + enemy.sinOffset) * 3;
                break;
                
            case 'diagonal':
                enemy.y += enemy.speed;
                enemy.x += enemy.horizontalSpeed;
                // Bounce off screen edges
                if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
                    enemy.horizontalSpeed *= -1;
                }
                break;
        }
        
        // Keep enemies within screen bounds (except vertical)
        enemy.x = Math.max(0, Math.min(canvas.width - enemy.width, enemy.x));
        
        // Enhanced random shooting logic with burst mode
        enemy.lastShot++;
        
        if (enemy.burstMode && enemy.burstCount > 0) {
            // Burst fire mode - rapid shots
            if (enemy.lastShot > 8) { // Fast burst shots every 8 frames
                shootEnemyBullet(enemy);
                enemy.lastShot = 0;
                enemy.burstCount--;
                if (enemy.burstCount <= 0) {
                    enemy.burstMode = false;
                    enemy.lastShot = -60; // Cooldown after burst
                }
            }
        } else if (enemy.lastShot > 20 && Math.random() < enemy.shootChance) { // Reduced cooldown from 30 to 20
            if (Math.random() < 0.3 && !enemy.burstMode) {
                // Start burst mode
                enemy.burstMode = true;
                enemy.burstCount = 3 + Math.floor(Math.random() * 3); // 3-5 shots in burst
            } else {
                // Regular shot
                shootEnemyBullet(enemy);
            }
            enemy.lastShot = 0;
        }
        
        // Remove enemies that are off screen
        if (enemy.y > canvas.height) {
            enemies.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        if (checkCollision(player, enemy) && !player.invulnerable) {
            // Create explosion when enemy hits player
            createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 10);
            enemies.splice(i, 1);
            takeDamage();
            createExplosion(enemy.x, enemy.y, enemy.color, 10);
            enemies.splice(i, 1);
        }
    }
}

// Boss System
function spawnBoss() {
    const diffSetting = difficultySettings[difficulty];
    
    const bossTypes = [
        { // Level 1 Boss - Destroyer
            name: 'Destroyer',
            health: Math.floor(120 * diffSetting.healthMultiplier), // Increased from 20 to 120
            color: '#ff0066',
            size: 100,
            speed: 1 * diffSetting.speedMultiplier,
            points: 1000, // Increased from 500 to 1000
            pattern: 'straight',
            description: 'Light Assault Destroyer'
        },
        { // Level 2 Boss - Cruiser
            name: 'Cruiser',
            health: Math.floor(200 * diffSetting.healthMultiplier), // Increased from 35 to 200
            color: '#ff3300',
            size: 120,
            speed: 1.2 * diffSetting.speedMultiplier,
            points: 1500, // Increased from 750 to 1500
            pattern: 'zigzag',
            description: 'Heavy Battle Cruiser'
        },
        { // Level 3 Boss - Battleship
            name: 'Battleship',
            health: Math.floor(300 * diffSetting.healthMultiplier), // Increased from 50 to 300
            color: '#cc00ff',
            size: 140,
            speed: 1.5 * diffSetting.speedMultiplier,
            points: 2500, // Increased from 1000 to 2500
            pattern: 'circle',
            description: 'Armored Battleship'
        },
        { // Level 4 Boss - Dreadnought
            name: 'Dreadnought',
            health: Math.floor(450 * diffSetting.healthMultiplier), // Increased from 70 to 450
            color: '#0066ff',
            size: 160,
            speed: 1.8 * diffSetting.speedMultiplier,
            points: 4000, // Increased from 1500 to 4000
            pattern: 'spiral',
            description: 'Super Dreadnought'
        },
        { // Level 5 Boss (Final Boss) - Mothership
            name: 'Mothership',
            health: Math.floor(600 * diffSetting.healthMultiplier), // Increased from 100 to 600
            color: '#ffaa00',
            size: 180,
            speed: 2 * diffSetting.speedMultiplier,
            points: 6000, // Increased from 2500 to 6000
            pattern: 'chaos',
            description: 'Command Mothership'
        }
    ];
    
    const bossType = bossTypes[currentLevel - 1];
    
    boss = {
        x: canvas.width / 2 - bossType.size / 2,
        y: -bossType.size,
        width: bossType.size,
        height: bossType.size,
        speed: bossType.speed,
        color: bossType.color,
        health: bossType.health,
        maxHealth: bossType.health,
        points: bossType.points,
        angle: 0,
        pattern: bossType.pattern,
        patternTime: 0,
        shootTimer: 0,
        direction: 1,
        name: bossType.name,
        description: bossType.description
    };
    
    // Play boss appear sound
    playSound('bossAppear');
}

function updateBoss() {
    if (!boss) return;
    
    boss.patternTime++;
    boss.shootTimer++;
    
    // Boss movement patterns
    switch (boss.pattern) {
        case 'straight':
            if (boss.y < 50) boss.y += boss.speed;
            break;
        case 'zigzag':
            if (boss.y < 50) boss.y += boss.speed;
            boss.x += Math.sin(boss.patternTime * 0.05) * 2;
            break;
        case 'circle':
            if (boss.y < 50) boss.y += boss.speed;
            boss.x = canvas.width / 2 + Math.cos(boss.patternTime * 0.03) * 100 - boss.width / 2;
            break;
        case 'spiral':
            if (boss.y < 50) boss.y += boss.speed;
            boss.x = canvas.width / 2 + Math.cos(boss.patternTime * 0.05) * (boss.patternTime * 0.3) - boss.width / 2;
            break;
        case 'chaos':
            if (boss.y < 50) boss.y += boss.speed;
            if (boss.patternTime % 120 === 0) boss.direction *= -1;
            boss.x += boss.direction * 3;
            if (boss.x < 0 || boss.x > canvas.width - boss.width) boss.direction *= -1;
            break;
    }
    
    // Keep boss in bounds
    boss.x = Math.max(0, Math.min(canvas.width - boss.width, boss.x));
    
    // No rotation - boss ships maintain proper orientation
    
    // Boss shooting - INCREASED FREQUENCY
    if (boss.shootTimer > 30 - currentLevel * 5) { // Much faster shooting (was 60)
        shootBossBullet();
        boss.shootTimer = 0;
    }
    
    // Check collision with player
    if (checkCollision(player, boss) && !player.invulnerable) {
        takeDamage();
        createExplosion(player.x, player.y, '#ff0000', 15);
    }
}

function shootBossBullet() {
    // Random shooting pattern selection
    const patterns = ['targeted', 'homing', 'spray', 'spiral', 'random_chaos'];
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    const bossCenter = boss.x + boss.width / 2;
    const bossBottom = boss.y + boss.height;
    const playerCenter = player.x + player.width / 2;
    const playerMiddle = player.y + player.height / 2;
    
    // Calculate angle to player for targeting
    const dx = playerCenter - bossCenter;
    const dy = playerMiddle - bossBottom;
    const angleToPlayer = Math.atan2(dy, dx);
    const distToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    switch(selectedPattern) {
        case 'targeted':
            // Direct shots toward player position
            for (let i = 0; i < 3 + currentLevel; i++) {
                const spread = (i - 1) * 0.3; // Slight spread around target
                const finalAngle = angleToPlayer + spread;
                const speed = 4 + Math.random() * 3; // Random speed 4-7
                
                bullets.push({
                    x: bossCenter,
                    y: bossBottom,
                    width: 8,
                    height: 8,
                    vx: Math.cos(finalAngle) * speed,
                    vy: Math.sin(finalAngle) * speed,
                    speed: speed,
                    color: '#ff4444',
                    damage: 2,
                    isBossBullet: true,
                    type: 'targeted',
                    bouncing: false
                });
            }
            break;
            
        case 'homing':
            // Bullets that actively follow the player
            for (let i = 0; i < 2 + Math.floor(currentLevel / 2); i++) {
                const initialAngle = (Math.PI * 2 * i) / (2 + Math.floor(currentLevel / 2));
                const speed = 2 + Math.random() * 2; // Slower for homing
                
                bullets.push({
                    x: bossCenter + Math.cos(initialAngle) * 30,
                    y: bossBottom,
                    width: 10,
                    height: 10,
                    vx: Math.cos(initialAngle) * speed,
                    vy: Math.sin(initialAngle) * speed,
                    speed: speed,
                    color: '#ff6600',
                    damage: 3,
                    isBossBullet: true,
                    type: 'homing',
                    homingStrength: 0.15 + Math.random() * 0.1, // Random homing power
                    maxSpeed: 6,
                    bouncing: false
                });
            }
            break;
            
        case 'spray':
            // Random direction bullets
            for (let i = 0; i < 5 + currentLevel * 2; i++) {
                const randomAngle = Math.random() * Math.PI * 2;
                const speed = 3 + Math.random() * 4; // Random speed 3-7
                
                bullets.push({
                    x: bossCenter + (Math.random() - 0.5) * boss.width,
                    y: bossBottom,
                    width: 6,
                    height: 6,
                    vx: Math.cos(randomAngle) * speed,
                    vy: Math.sin(randomAngle) * speed,
                    speed: speed,
                    color: '#aa44ff',
                    damage: 1,
                    isBossBullet: true,
                    type: 'spray',
                    bouncing: true,
                    bounceCount: 0,
                    maxBounces: 2
                });
            }
            break;
            
        case 'spiral':
            // Spiraling pattern toward player
            for (let i = 0; i < 6; i++) {
                const spiralAngle = angleToPlayer + (i * Math.PI / 3) + (Date.now() * 0.01);
                const speed = 3 + Math.random() * 2;
                
                bullets.push({
                    x: bossCenter,
                    y: bossBottom,
                    width: 7,
                    height: 7,
                    vx: Math.cos(spiralAngle) * speed,
                    vy: Math.sin(spiralAngle) * speed,
                    speed: speed,
                    color: '#00aaff',
                    damage: 2,
                    isBossBullet: true,
                    type: 'spiral',
                    spiralRate: 0.1 + Math.random() * 0.1,
                    bouncing: false
                });
            }
            break;
            
        case 'random_chaos':
            // Complete chaos - random everything
            const bulletCount = 4 + Math.floor(Math.random() * (currentLevel * 3));
            for (let i = 0; i < bulletCount; i++) {
                const randomX = Math.random() * canvas.width;
                const randomY = Math.random() * canvas.height * 0.3; // Top 30% of screen
                const randomAngle = Math.random() * Math.PI * 2;
                const randomSpeed = 2 + Math.random() * 5; // Speed 2-7
                
                bullets.push({
                    x: randomX,
                    y: randomY,
                    width: 5 + Math.random() * 8, // Random size
                    height: 5 + Math.random() * 8,
                    vx: Math.cos(randomAngle) * randomSpeed,
                    vy: Math.sin(randomAngle) * randomSpeed,
                    speed: randomSpeed,
                    color: `hsl(${Math.random() * 360}, 100%, 50%)`, // Random color
                    damage: 1 + Math.floor(Math.random() * 3),
                    isBossBullet: true,
                    type: 'chaos',
                    changeDirection: Math.random() < 0.3, // 30% chance to change direction randomly
                    directionChangeTimer: 0,
                    bouncing: Math.random() < 0.5,
                    bounceCount: 0,
                    maxBounces: Math.floor(Math.random() * 4) + 1
                });
            }
            break;
    }
    
    // Store current pattern for visual feedback
    boss.currentPattern = selectedPattern;
}

function checkLevelProgress() {
    // Check if enough enemies killed to spawn boss
    if (!boss && enemiesKilled >= enemiesNeededForBoss * currentLevel) {
        spawnBoss();
        // Clear existing enemies and meteors for boss fight
        enemies.length = 0;
        meteors.length = 0;
    }
}

function nextLevel() {
    currentLevel++;
    enemiesKilled = 0;
    boss = null;
    
    // Play level complete sound
    playSound('levelComplete');
    
    if (currentLevel > maxLevel) {
        // Game completed!
        gameState = 'gameWon';
        showGameWon();
    } else {
        gameState = 'levelComplete';
        showLevelComplete();
    }
}

function showLevelComplete() {
    setTimeout(() => {
        if (gameState === 'levelComplete') {
            gameState = 'playing';
            // Bonus points for completing level
            score += currentLevel * 100;
            updateUI(); // Update UI immediately
        }
    }, 3000);
}

function showGameWon() {
    document.getElementById('gameOverlay').style.display = 'flex';
    document.getElementById('gameOverMenu').style.display = 'block';
    document.getElementById('gameOverMenu').innerHTML = `
        <h1>🎉 Victory!</h1>
        <p>You completed all ${maxLevel} levels!</p>
        <p>Final Score: ${score}</p>
        <button onclick="restartGame()">Play Again</button>
    `;
}

// Enhanced Collision Detection
function checkCollision(rect1, rect2) {
    // More precise collision detection
    const margin = 2; // Small margin for better gameplay feel
    return rect1.x + margin < rect2.x + rect2.width - margin &&
           rect1.x + rect1.width - margin > rect2.x + margin &&
           rect1.y + margin < rect2.y + rect2.height - margin &&
           rect1.y + rect1.height - margin > rect2.y + margin;
}

// Special collision for circular bullets (like homing and chaos)
function checkCircularCollision(bullet, target) {
    const bulletCenterX = bullet.x + bullet.width / 2;
    const bulletCenterY = bullet.y + bullet.height / 2;
    const targetCenterX = target.x + target.width / 2;
    const targetCenterY = target.y + target.height / 2;
    
    const dx = bulletCenterX - targetCenterX;
    const dy = bulletCenterY - targetCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const bulletRadius = Math.max(bullet.width, bullet.height) / 2;
    const targetRadius = Math.max(target.width, target.height) / 2;
    
    return distance < (bulletRadius + targetRadius - 2);
}

// Check Bullet-Enemy Collisions
function checkBulletCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        
        // Skip non-player bullets (they don't hurt enemies)
        if (!bullet.isPlayerBullet) continue;
        
        let bulletRemoved = false;
        
        // Check collision with boss
        if (boss && checkCollision(bullet, boss)) {
            boss.health -= bullet.damage;
            createParticle(boss.x + boss.width / 2, boss.y + boss.height / 2, '#ffaa00');
            bullets.splice(i, 1);
            bulletRemoved = true;
            
            // Check if boss is destroyed
            if (boss.health <= 0) {
                score += boss.points;
                updateUI(); // Update UI immediately
                createExplosion(boss.x + boss.width / 2, boss.y + boss.height / 2, boss.color, 25);
                
                // Play boss destroy sound
                playSound('bossDestroy');
                
                boss = null;
                nextLevel();
            }
        }
        
        // Check collision with enemies (only if bullet wasn't already removed)
        if (!bulletRemoved) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                
                if (checkCollision(bullet, enemy)) {
                    // Damage enemy
                    enemy.health -= bullet.damage;
                    
                    // Create hit effect
                    createParticle(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, '#ffff00');
                    
                    // Remove bullet
                    bullets.splice(i, 1);
                    bulletRemoved = true;
                    
                    // Check if enemy is destroyed
                    if (enemy.health <= 0) {
                        score += enemy.points;
                        enemiesKilled++;
                        updateUI(); // Update UI immediately
                        createExplosion(enemy.x, enemy.y, enemy.color, 8);
                        enemies.splice(j, 1);
                        
                        // Play enemy destroy sound
                        playSound('enemyDestroy', 0.6);
                        
                        // Increase game speed slightly
                        gameSpeed += 0.001;
                    }
                    break;
                }
            }
        }
        
        // Check collision with meteors (only if bullet wasn't already removed)
        if (!bulletRemoved) {
            for (let k = meteors.length - 1; k >= 0; k--) {
                const meteor = meteors[k];
                
                if (checkCollision(bullet, meteor)) {
                    // Damage meteor
                    meteor.health -= bullet.damage;
                    
                    // Create hit effect
                    createParticle(meteor.x + meteor.width / 2, meteor.y + meteor.height / 2, '#ffaa00');
                    
                    // Remove bullet
                    bullets.splice(i, 1);
                    
                    // Check if meteor is destroyed
                    if (meteor.health <= 0) {
                        score += meteor.points;
                        updateUI(); // Update UI immediately
                        createExplosion(meteor.x, meteor.y, '#ff6600', 12);
                        meteors.splice(k, 1);
                        
                        // Play meteor destroy sound
                        playSound('meteorDestroy', 0.5);
                        
                        // Meteors give extra speed increase
                        gameSpeed += 0.002;
                    }
                    break;
                }
            }
        }
    }
}

// Power-ups
function spawnPowerUp() {
    if (Math.random() < GAME_SETTINGS.POWERUP_SPAWN_RATE) {
        // Random power-up type
        const powerUpTypes = [
            { type: 'health', color: '#00ff88', probability: 0.4 },
            { type: 'firepower', color: '#ff8800', probability: 0.6 }
        ];
        
        // Select power-up type based on probability
        const randomValue = Math.random();
        let selectedType = powerUpTypes[0];
        
        if (randomValue > powerUpTypes[0].probability) {
            selectedType = powerUpTypes[1];
        }
        
        powerUps.push({
            x: Math.random() * (canvas.width - 30),
            y: -30,
            width: 30,
            height: 30,
            speed: 2,
            type: selectedType.type,
            color: selectedType.color,
            angle: 0
        });
    }
}

function updatePowerUps() {
    spawnPowerUp();
    
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        powerUp.y += powerUp.speed;
        powerUp.angle += 0.1;
        
        // Remove if off screen
        if (powerUp.y > canvas.height) {
            powerUps.splice(i, 1);
            continue;
        }
        
        // Check collision with player
        if (checkCollision(player, powerUp)) {
            if (powerUp.type === 'health' && lives < 3) {
                lives++;
                updateUI();
                createParticle(powerUp.x, powerUp.y, '#00ff88');
                
                // Play power-up sound
                playSound('powerUp');
            } else if (powerUp.type === 'firepower' && player.firepower < player.maxFirepower) {
                player.firepower++;
                createParticle(powerUp.x, powerUp.y, '#ff8800');
                createExplosion(powerUp.x, powerUp.y, '#ffaa00', 8);
                
                // Play power-up sound
                playSound('powerUp');
            }
            powerUps.splice(i, 1);
        }
    }
}

// Damage System
function takeDamage() {
    if (player.invulnerable) return;
    
    lives--;
    player.invulnerable = true;
    player.invulnerabilityTime = 120; // 2 seconds at 60fps
    
    // Lose firepower when taking damage
    if (player.firepower > 1) {
        player.firepower--;
        createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ff4400', 6);
    }
    
    // Play player hit sound
    playSound('playerHit');
    
    updateUI();
    
    if (lives <= 0) {
        gameOver();
    }
}

// Particle Effects
function createParticle(x, y, color) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30,
            maxLife: 30,
            color: color,
            size: Math.random() * 4 + 2
        });
    }
}

function createExplosion(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 40,
            maxLife: 40,
            color: color,
            size: Math.random() * 6 + 3
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        particle.size *= 0.98;
        
        if (particle.life <= 0 || particle.size < 0.5) {
            particles.splice(i, 1);
        }
    }
}

// Background Effects
function updateStars() {
    for (const star of stars) {
        star.y += star.speed;
        
        if (star.y > canvas.height) {
            star.y = -5;
            star.x = Math.random() * canvas.width;
        }
    }
}

// Rendering
function drawPlayer() {
    ctx.save();
    
    // Invulnerability flashing effect
    if (player.invulnerable && Math.floor(player.invulnerabilityTime / 10) % 2) {
        ctx.globalAlpha = 0.5;
    }
    
    // Draw player image
    if (images.player) {
        ctx.drawImage(images.player, player.x, player.y, player.width, player.height);
    } else {
        // Fallback to original triangle shape
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(player.x + player.width / 2, player.y);
        ctx.lineTo(player.x, player.y + player.height);
        ctx.lineTo(player.x + player.width, player.y + player.height);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw firepower indicator
    if (player.firepower > 1) {
        ctx.fillStyle = player.firepower === 2 ? '#ffaa00' : '#00ffff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 5;
        
        // Draw firepower level indicators as small dots above the player
        for (let i = 0; i < player.firepower; i++) {
            ctx.beginPath();
            ctx.arc(player.x + player.width / 2 + (i - 1) * 8, player.y - 10, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.shadowBlur = 0;
    }
    
    ctx.restore();
}

function drawBullets() {
    for (const bullet of bullets) {
        ctx.save();
        
        if (bullet.isBossBullet) {
            // Draw different boss bullet types with unique visuals
            ctx.fillStyle = bullet.color;
            ctx.shadowColor = bullet.color;
            
            switch(bullet.type) {
                case 'targeted':
                    // Sharp, direct bullets
                    ctx.shadowBlur = 8;
                    ctx.fillRect(bullet.x - 1, bullet.y - 1, bullet.width, bullet.height);
                    // Add targeting crosshair effect
                    ctx.strokeStyle = bullet.color;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(bullet.x - 3, bullet.y + bullet.height / 2);
                    ctx.lineTo(bullet.x + bullet.width + 3, bullet.y + bullet.height / 2);
                    ctx.moveTo(bullet.x + bullet.width / 2, bullet.y - 3);
                    ctx.lineTo(bullet.x + bullet.width / 2, bullet.y + bullet.height + 3);
                    ctx.stroke();
                    break;
                    
                case 'homing':
                    // Glowing, pulsing bullets with trail
                    const homingPulse = Math.sin(Date.now() * 0.02) * 2;
                    ctx.shadowBlur = 15 + homingPulse;
                    ctx.fillRect(bullet.x - 2, bullet.y - 2, bullet.width + 4, bullet.height + 4);
                    // Trail effect
                    ctx.fillStyle = bullet.color + '66'; // Semi-transparent
                    ctx.fillRect(bullet.x - bullet.vx, bullet.y - bullet.vy, bullet.width, bullet.height);
                    break;
                    
                case 'spray':
                    // Small, scattered bullets
                    ctx.shadowBlur = 6;
                    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                    if (bullet.bouncing) {
                        // Bouncing indicator
                        ctx.fillStyle = '#ffffff66';
                        ctx.fillRect(bullet.x - 1, bullet.y - 1, bullet.width + 2, bullet.height + 2);
                    }
                    break;
                    
                case 'spiral':
                    // Spinning visual effect
                    ctx.shadowBlur = 10;
                    ctx.save();
                    ctx.translate(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2);
                    ctx.rotate(Date.now() * 0.01);
                    ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
                    // Spiral arms
                    ctx.fillStyle = bullet.color + '88';
                    for (let i = 0; i < 4; i++) {
                        ctx.rotate(Math.PI / 2);
                        ctx.fillRect(0, -1, bullet.width, 2);
                    }
                    ctx.restore();
                    break;
                    
                case 'chaos':
                    // Chaotic, changing visual
                    const chaosFlicker = Math.random() * 5;
                    ctx.shadowBlur = 8 + chaosFlicker;
                    ctx.fillRect(bullet.x - 1, bullet.y - 1, bullet.width + 2, bullet.height + 2);
                    // Random sparks
                    for (let i = 0; i < 3; i++) {
                        ctx.fillStyle = `hsl(${Math.random() * 360}, 100%, 70%)`;
                        const sparkX = bullet.x + Math.random() * bullet.width;
                        const sparkY = bullet.y + Math.random() * bullet.height;
                        ctx.fillRect(sparkX, sparkY, 2, 2);
                    }
                    break;
                    
                default:
                    // Default boss bullet appearance
                    ctx.shadowBlur = 8;
                    ctx.fillRect(bullet.x - 1, bullet.y - 3, bullet.width, bullet.height);
                    break;
            }
            
            // Legacy special bullets
            if (bullet.isRocket) {
                ctx.shadowBlur = 10;
                ctx.fillRect(bullet.x - 2, bullet.y - 4, bullet.width, bullet.height);
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(bullet.x + 2, bullet.y + bullet.height - 2, bullet.width - 4, 8);
            } else if (bullet.isBomb) {
                const pulse = Math.sin(Date.now() * 0.01) * 2;
                ctx.shadowBlur = 15;
                ctx.fillRect(bullet.x - pulse, bullet.y - pulse, bullet.width + pulse * 2, bullet.height + pulse * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(bullet.x + bullet.width / 3, bullet.y + bullet.height / 3, bullet.width / 3, bullet.height / 3);
            }
            
            ctx.shadowBlur = 0;
        } else if (bullet.isPlayerBullet) {
            // Player bullets
            if (images.bullet) {
                ctx.drawImage(images.bullet, bullet.x - 8, bullet.y - 8, 16, 20);
            } else {
                ctx.fillStyle = bullet.color;
                ctx.shadowColor = bullet.color;
                ctx.shadowBlur = 5;
                ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
                ctx.shadowBlur = 0;
            }
        } else {
            // Enemy bullets
            ctx.fillStyle = bullet.color;
            ctx.shadowColor = bullet.color;
            ctx.shadowBlur = 6;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            ctx.shadowBlur = 0;
        }
        
        ctx.restore();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.save();
        
        if (images[enemy.image]) {
            // Draw enemy image without rotation
            ctx.drawImage(images[enemy.image], enemy.x, enemy.y, enemy.width, enemy.height);
        } else {
            // Fallback to colored rectangle without rotation
            ctx.fillStyle = enemy.color;
            ctx.shadowColor = enemy.color;
            ctx.shadowBlur = 8;
            ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        }
        
        ctx.restore();
        
        // Draw health bar if damaged
        if (enemy.health < enemy.maxHealth) {
            const barWidth = enemy.width;
            const barHeight = 4;
            const healthPercent = enemy.health / enemy.maxHealth;
            
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(enemy.x, enemy.y - 8, barWidth, barHeight);
            
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(enemy.x, enemy.y - 8, barWidth * healthPercent, barHeight);
        }
    }
}

function drawMeteors() {
    for (const meteor of meteors) {
        ctx.save();
        
        // Draw trail effect
        for (let i = 0; i < meteor.trail.length; i++) {
            const trailPoint = meteor.trail[i];
            const alpha = (i + 1) / meteor.trail.length * 0.3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ff6600';
            ctx.beginPath();
            ctx.arc(trailPoint.x, trailPoint.y, meteor.width / 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.globalAlpha = 1;
        
        if (images.meteor) {
            // Draw meteor image without rotation
            ctx.drawImage(images.meteor, meteor.x, meteor.y, meteor.width, meteor.height);
        } else {
            // Fallback to colored shape without rotation
            ctx.fillStyle = meteor.color;
            ctx.shadowColor = '#333333';
            ctx.shadowBlur = 6;
            ctx.fillRect(meteor.x, meteor.y, meteor.width, meteor.height);
            
            // Add crater details
            ctx.fillStyle = '#444444';
            ctx.fillRect(meteor.x + meteor.width / 4, meteor.y + meteor.height / 4, meteor.width / 6, meteor.height / 6);
            ctx.fillRect(meteor.x + meteor.width * 0.7, meteor.y + meteor.height * 0.6, meteor.width / 8, meteor.height / 8);
        }
        
        ctx.restore();
        
        // Draw health bar if damaged
        if (meteor.health < meteor.maxHealth) {
            const barWidth = meteor.width;
            const barHeight = 4;
            const healthPercent = meteor.health / meteor.maxHealth;
            
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(meteor.x, meteor.y - 8, barWidth, barHeight);
            
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(meteor.x, meteor.y - 8, barWidth * healthPercent, barHeight);
        }
    }
}

function drawBoss() {
    if (!boss) return;
    
    ctx.save();
    
    if (images.boss) {
        // Draw boss image without rotation
        ctx.drawImage(images.boss, boss.x, boss.y, boss.width, boss.height);
    } else {
        // Create unique designs for each boss type without rotation
        const centerX = boss.x + boss.width / 2;
        const centerY = boss.y + boss.height / 2;
        
        // Draw based on boss level/type
        switch(currentLevel) {
            case 1: // Destroyer
                ctx.fillStyle = boss.color;
                ctx.shadowColor = boss.color;
                ctx.shadowBlur = 12;
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height * 0.6);
                ctx.fillRect(boss.x + boss.width / 6, boss.y + boss.height / 6, boss.width * 0.66, boss.height * 0.4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(boss.x + boss.width / 3, boss.y + boss.height / 4, boss.width / 3, boss.height / 6);
                break;
                
            case 2: // Cruiser
                ctx.fillStyle = boss.color;
                ctx.shadowColor = boss.color;
                ctx.shadowBlur = 15;
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height * 0.7);
                ctx.fillRect(boss.x - 8, boss.y + boss.height / 4, boss.width / 3, boss.height / 3);
                ctx.fillRect(boss.x + boss.width * 0.66, boss.y + boss.height / 4, boss.width / 3, boss.height / 3);
                ctx.fillStyle = '#ffaa00';
                ctx.fillRect(boss.x + boss.width / 4, boss.y + boss.height / 3, boss.width / 2, boss.height / 8);
                break;
                
            case 3: // Battleship
                ctx.fillStyle = boss.color;
                ctx.shadowColor = boss.color;
                ctx.shadowBlur = 18;
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height * 0.8);
                ctx.fillRect(boss.x - 12, boss.y + boss.height / 6, boss.width / 2.5, boss.height / 2);
                ctx.fillRect(boss.x + boss.width * 0.6, boss.y + boss.height / 6, boss.width / 2.5, boss.height / 2);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(boss.x + boss.width * 0.3, boss.y + boss.height * 0.3, boss.width * 0.4, boss.height / 4);
                break;
                
            case 4: // Dreadnought
                ctx.fillStyle = boss.color;
                ctx.shadowColor = boss.color;
                ctx.shadowBlur = 20;
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height * 0.85);
                ctx.fillRect(boss.x - 15, boss.y + boss.height * 0.1, boss.width / 2, boss.height * 0.6);
                ctx.fillRect(boss.x + boss.width / 2, boss.y + boss.height * 0.1, boss.width / 2, boss.height * 0.6);
                ctx.fillStyle = '#00aaff';
                ctx.fillRect(boss.x + boss.width / 4, boss.y + boss.height / 6, boss.width / 2, boss.height / 3);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(boss.x + boss.width * 0.375, boss.y + boss.height / 3, boss.width / 4, boss.height / 8);
                break;
                
            case 5: // Mothership
                ctx.fillStyle = boss.color;
                ctx.shadowColor = boss.color;
                ctx.shadowBlur = 25;
                ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
                ctx.fillRect(boss.x - 20, boss.y, boss.width * 0.4, boss.height * 0.8);
                ctx.fillRect(boss.x + boss.width * 0.6, boss.y, boss.width * 0.4, boss.height * 0.8);
                ctx.fillStyle = '#ff4400';
                ctx.fillRect(boss.x + boss.width / 6, boss.y + boss.height / 6, boss.width * 0.66, boss.height * 0.4);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(boss.x + boss.width / 3, boss.y + boss.height * 0.3, boss.width / 3, boss.height / 5);
                break;
        }
    }
    
    ctx.restore();
    
    // Draw boss health bar
    const barWidth = boss.width;
    const barHeight = 10;
    const healthPercent = boss.health / boss.maxHealth;
    
    // Health bar background
    ctx.fillStyle = '#330000';
    ctx.fillRect(boss.x, boss.y - 25, barWidth, barHeight);
    
    // Health bar fill
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
    ctx.fillRect(boss.x, boss.y - 25, barWidth * healthPercent, barHeight);
    
    // Health bar border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boss.x, boss.y - 25, barWidth, barHeight);
    
    // Boss name and health text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${boss.name}: ${boss.health}/${boss.maxHealth}`, boss.x + boss.width / 2, boss.y - 30);
    
    // Boss description and current attack pattern
    ctx.fillStyle = '#ffaa00';
    ctx.font = '12px Arial';
    ctx.fillText(boss.description, boss.x + boss.width / 2, boss.y - 45);
    
    // Current attack pattern indicator
    if (boss.currentPattern) {
        ctx.fillStyle = '#ff6666';
        ctx.font = '10px Arial';
        const patternText = `Pattern: ${boss.currentPattern.toUpperCase()}`;
        ctx.fillText(patternText, boss.x + boss.width / 2, boss.y - 60);
    }
}

function drawPowerUps() {
    for (const powerUp of powerUps) {
        ctx.save();
        
        // Choose the appropriate image based on power-up type
        let powerUpImage = null;
        if (powerUp.type === 'health' && images.powerup_health) {
            powerUpImage = images.powerup_health;
        } else if (powerUp.type === 'firepower' && images.powerup_firepower) {
            powerUpImage = images.powerup_firepower;
        }
        
        ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2);
        ctx.rotate(powerUp.angle);
        
        if (powerUpImage) {
            // Draw the PNG image with rotation and scaling
            ctx.drawImage(powerUpImage, -powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height);
            
            // Add glow effect for PNG images
            ctx.shadowColor = powerUp.color;
            ctx.shadowBlur = 15;
            ctx.globalAlpha = 0.3;
            ctx.drawImage(powerUpImage, -powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height);
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        } else {
            // Fallback to colored shapes based on type
            ctx.fillStyle = powerUp.color;
            ctx.shadowColor = powerUp.color;
            ctx.shadowBlur = 8;
            
            if (powerUp.type === 'health') {
                // Health power-up: green cross
                ctx.fillRect(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-2, -10, 4, 20);
                ctx.fillRect(-10, -2, 20, 4);
            } else if (powerUp.type === 'firepower') {
                // Firepower power-up: orange diamond with weapon symbol
                ctx.beginPath();
                ctx.moveTo(0, -powerUp.height / 2);
                ctx.lineTo(powerUp.width / 2, 0);
                ctx.lineTo(0, powerUp.height / 2);
                ctx.lineTo(-powerUp.width / 2, 0);
                ctx.closePath();
                ctx.fill();
                
                // Add weapon symbol (double arrows)
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-8, -2, 16, 2);
                ctx.fillRect(-8, 2, 16, 2);
                // Arrow tips
                ctx.beginPath();
                ctx.moveTo(6, -4);
                ctx.lineTo(10, 0);
                ctx.lineTo(6, 4);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-6, -4);
                ctx.lineTo(-10, 0);
                ctx.lineTo(-6, 4);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

function drawParticles() {
    for (const particle of particles) {
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawStars() {
    ctx.fillStyle = '#ffffff';
    for (const star of stars) {
        ctx.save();
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw level complete message
    if (gameState === 'levelComplete') {
        ctx.fillStyle = '#00ff00';
        ctx.font = '36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${currentLevel - 1} Complete!`, canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillText(`Preparing Level ${currentLevel}...`, canvas.width / 2, canvas.height / 2 + 10);
        return;
    }
    
    // Draw background elements
    drawStars();
    
    // Draw game objects
    drawPlayer();
    drawBullets();
    drawEnemies();
    drawMeteors();
    drawBoss();
    drawPowerUps();
    drawParticles();
    
    // Draw level and progress info
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${currentLevel}`, 10, 30);
    
    if (!boss) {
        const enemiesLeft = (enemiesNeededForBoss * currentLevel) - enemiesKilled;
        ctx.fillText(`Enemies until Boss: ${Math.max(0, enemiesLeft)}`, 10, 50);
    } else {
        ctx.fillText('BOSS FIGHT!', 10, 50);
    }
}

// UI Updates
function updateUI() {
    // Force immediate DOM update
    const scoreElement = document.getElementById('score');
    const levelElement = document.getElementById('level');
    
    scoreElement.textContent = score;
    levelElement.textContent = currentLevel;
    
    // Force browser to update display immediately
    scoreElement.style.transform = 'scale(1.1)';
    setTimeout(() => {
        scoreElement.style.transform = 'scale(1)';
    }, 100);
    
    // Update hearts
    for (let i = 1; i <= 3; i++) {
        const heart = document.getElementById(`heart${i}`);
        if (i <= lives) {
            heart.classList.remove('lost');
        } else {
            heart.classList.add('lost');
        }
    }
}

// Main Game Loop
function gameLoop() {
    if (gameState !== 'playing' && gameState !== 'levelComplete') return;
    
    if (gameState === 'playing') {
        // Update game logic
        updatePlayer();
        updateBullets();
        updateEnemies();
        updateMeteors();
        updateBoss();
        updatePowerUps();
        updateParticles();
        updateStars();
        checkBulletCollisions();
        checkLevelProgress();
    }
    
    // Render everything
    render();
    
    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Initialize the game when page loads
window.addEventListener('load', () => {
    gameState = 'loading';
    loadImages();
    createStars();
    updateUI();
    updateLoadingScreen();
    
    // Hide all overlay menus initially (loading screen renders on canvas)
    document.getElementById('gameOverlay').style.display = 'none';
    document.getElementById('nameInputMenu').style.display = 'none';
    document.getElementById('difficultyMenu').style.display = 'none';
    document.getElementById('startMenu').style.display = 'none';
    document.getElementById('gameOverMenu').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
});