const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let seaLevel;
let money = 0;
let bestMoney = 0;
let mouseX = 0;
let mouseY = 0;
let isMouseDown = false;
let isLeftMouseDown = false; // Track left mouse separately
let cameraY = 0;
let gameState = 'fishing'; 

// Upgrades
let depthLevel = 1;
let capacityLevel = 1;
let cashMultiplier = 1.0;
let currentSessionMoney = 0;

function resize() {
    const maxWidth = 500;
    canvas.width = Math.min(window.innerWidth, maxWidth);
    canvas.height = window.innerHeight;
    canvas.style.margin = '0 auto';
    seaLevel = 250;
}

window.addEventListener('resize', resize);
window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

window.addEventListener('mousedown', (e) => {
    if (e.button === 2) isMouseDown = true; // Right click for hooking
    else if (e.button === 0) { // Left click
        isLeftMouseDown = true; // For movement/casting
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (gameState === 'result') {
            // Check Claim Button
            if (y > canvas.height * 0.7 && y < canvas.height * 0.8 && x > canvas.width * 0.2 && x < canvas.width * 0.8) {
                money += currentSessionMoney;
                if (currentSessionMoney > bestMoney) bestMoney = currentSessionMoney;
                gameState = 'fishing';
                rod.state = 'idle'; // Reset rod state so we can fish again
            }
        } else if (gameState === 'fishing') {
            let clickedUI = false;

            // Only check upgrades/play button if at surface
            if (cameraY < 50) {
                const cardW = (canvas.width - 60) / 3;
                const cardH = 150;
                const cardY = canvas.height - cardH - 30;

                // Play Button Click
                const distToPlay = Math.hypot(x - canvas.width / 2, y - canvas.height * 0.45);
                if (distToPlay < 65) {
                    rod.startCasting();
                    clickedUI = true;
                }

                // Card 0: Capacity
                if (x > 20 && x < 20 + cardW && y > cardY && y < cardY + cardH) {
                    if (money >= capacityLevel * 50) {
                        money -= capacityLevel * 50;
                        capacityLevel++;
                    }
                    clickedUI = true;
                }
                // Card 1: Depth
                else if (x > 30 + cardW && x < 30 + cardW * 2 && y > cardY && y < cardY + cardH) {
                    if (money >= depthLevel * 50) {
                        money -= depthLevel * 50;
                        depthLevel++;
                    }
                    clickedUI = true;
                }
                // Card 2: Cash Multiplier
                else if (x > 40 + cardW * 2 && x < 40 + cardW * 3 && y > cardY && y < cardY + cardH) {
                    const price = Math.floor((cashMultiplier - 0.9) * 10) * 100;
                    if (money >= price) {
                        money -= price;
                        cashMultiplier += 0.1;
                    }
                    clickedUI = true;
                }
            }

            if (!clickedUI && rod.state !== 'idle') {
                // If not clicking UI, but rod is already moving (e.g. sinking), we don't start casting again
                // Actually startCasting only works if rod.state is 'idle'
                rod.startCasting();
            }
        }
    }
});

// Prevent context menu on right click
window.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('mouseup', (e) => {
    if (e.button === 2) isMouseDown = false;
    if (e.button === 0) {
        isLeftMouseDown = false;
        if (gameState === 'fishing') rod.releaseCast();
    }
});

resize();

class Boat {
    constructor() {
        this.width = 180;
        this.height = 55;
    }

    draw() {
        if (cameraY > 300) return;
        ctx.save();
        ctx.translate(canvas.width * 0.6 - this.width / 2, seaLevel - 35 - cameraY);
        
        // Hull - dark wooden fishing boat
        ctx.fillStyle = '#3E2723';
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(this.width - 10, 10);
        ctx.quadraticCurveTo(this.width, 20, this.width - 15, this.height);
        ctx.lineTo(15, this.height);
        ctx.quadraticCurveTo(0, 20, 10, 10);
        ctx.closePath();
        ctx.fill();

        // Hull stripe
        ctx.fillStyle = '#5D4037';
        ctx.fillRect(15, 20, this.width - 30, 8);

        // Deck
        ctx.fillStyle = '#795548';
        ctx.fillRect(20, 10, this.width - 40, 12);

        // Cabin
        ctx.fillStyle = '#ECEFF1';
        ctx.fillRect(30, -15, 40, 25);
        ctx.fillStyle = '#90A4AE';
        ctx.fillRect(35, -10, 12, 12);
        ctx.fillRect(52, -10, 12, 12);
        // Cabin roof
        ctx.fillStyle = '#B71C1C';
        ctx.fillRect(27, -20, 46, 7);

        // Mast
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(48, -55, 4, 40);

        // Flag
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.moveTo(52, -55);
        ctx.lineTo(72, -48);
        ctx.lineTo(52, -42);
        ctx.closePath();
        ctx.fill();

        // --- Fisherman Motion ---
        let swing = 0;
        if (rod.state === 'casting') {
            swing = -(rod.castPower / 150) * 0.8; // Pull back
        } else if (rod.state === 'sinking' && rod.lureY < seaLevel + 200) {
            const progress = (rod.lureY - seaLevel) / 200;
            swing = (1 - progress) * 0.5; // Follow through
        }

        // Rod in holder (only if not fishing)
        if (rod.state === 'idle' || rod.state === 'result_wait' || gameState === 'upgrade') {
            ctx.strokeStyle = '#4E342E';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.width - 40, 5);
            ctx.lineTo(this.width - 20, -30);
            ctx.stroke();
        }

        // --- Fisherman ---
        const fx = this.width - 55;
        const fy = 0;

        // Legs
        ctx.fillStyle = '#1565C0';
        ctx.fillRect(fx - 5, fy - 5, 8, 15);
        ctx.fillRect(fx + 5, fy - 5, 8, 15);

        // Body / jacket
        ctx.fillStyle = '#FDD835';
        ctx.fillRect(fx - 8, fy - 25, 24, 22);

        // Jacket collar
        ctx.fillStyle = '#F9A825';
        ctx.fillRect(fx - 8, fy - 25, 24, 5);

        // Arms and Rod Animation
        ctx.save();
        ctx.translate(fx + 4, fy - 20);
        ctx.rotate(swing);

        // Arms
        ctx.fillStyle = '#FDD835';
        ctx.fillRect(-18, -3, 8, 16);
        ctx.fillRect(10, -3, 8, 16);

        // Hands
        ctx.fillStyle = '#FFCCBC';
        ctx.beginPath(); ctx.arc(-14, 14, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(14, 14, 4, 0, Math.PI * 2); ctx.fill();

        // The Rod (when casting/fishing)
        if (rod.state === 'casting' || rod.state === 'sinking' || rod.state === 'reeling' || rod.state === 'result_wait') {
            ctx.strokeStyle = '#4E342E';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(0, 14);
            ctx.lineTo(40, -40); // Rod tip
            ctx.stroke();
        }
        ctx.restore();

        // Head
        ctx.fillStyle = '#FFCCBC';
        ctx.beginPath(); ctx.arc(fx + 4, fy - 35, 10, 0, Math.PI * 2); ctx.fill();

        // Eyes
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.arc(fx + 1, fy - 37, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(fx + 8, fy - 37, 2, 0, Math.PI * 2); ctx.fill();

        // Hat (bucket hat)
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.ellipse(fx + 4, fy - 44, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(fx - 6, fy - 52, 20, 10);

        // Boots
        ctx.fillStyle = '#212121';
        ctx.fillRect(fx - 6, fy + 8, 10, 5);
        ctx.fillRect(fx + 4, fy + 8, 10, 5);

        ctx.restore();
    }
}

// Fish species definitions
const FISH_SPECIES = [
    { name: 'Clownfish', body: '#FF6D00', stripe: '#FFFFFF', belly: '#FFB74D', size: 14, speed: 2.5 },
    { name: 'Blue Tang', body: '#1565C0', stripe: '#0D47A1', belly: '#42A5F5', size: 16, speed: 2.8 },
    { name: 'Salmon', body: '#E57373', stripe: '#C62828', belly: '#FFCDD2', size: 22, speed: 1.8 },
    { name: 'Pufferfish', body: '#FDD835', stripe: '#F9A825', belly: '#FFF9C4', size: 18, speed: 1.0 },
    { name: 'Tuna', body: '#546E7A', stripe: '#263238', belly: '#CFD8DC', size: 26, speed: 3.5 },
    { name: 'Angelfish', body: '#AB47BC', stripe: '#6A1B9A', belly: '#E1BEE7', size: 15, speed: 1.5 },
    { name: 'Swordfish', body: '#37474F', stripe: '#455A64', belly: '#90A4AE', size: 30, speed: 4.0 },
    { name: 'Goldfish', body: '#FF8F00', stripe: '#E65100', belly: '#FFE0B2', size: 12, speed: 1.2 },
];

class Fish {
    constructor() {
        this.reset();
        this.y = seaLevel + 500 + Math.random() * 2000;
    }

    reset() {
        this.species = FISH_SPECIES[Math.floor(Math.random() * FISH_SPECIES.length)];
        this.size = this.species.size;
        this.direction = Math.random() > 0.5 ? 1 : -1;
        this.x = this.direction === 1 ? -50 : canvas.width + 50;
        this.y = seaLevel + 300 + Math.random() * (depthLevel * 5500);
        this.speed = this.species.speed;
        this.hooked = false;
    }

    update() {
        if (!this.hooked) {
            this.x += this.speed * this.direction;
            if (this.direction === 1 && this.x > canvas.width + 50) this.x = -50;
            if (this.direction === -1 && this.x < -50) this.x = canvas.width + 50;
        }
    }

    draw() {
        if (this.y < cameraY - 100 || this.y > cameraY + canvas.height + 100) return;
        const s = this.size;
        const sp = this.species;
        ctx.save();
        ctx.translate(this.x, this.y - cameraY);
        if (this.direction === -1) ctx.scale(-1, 1);

        // Body
        ctx.fillStyle = sp.body;
        ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2); ctx.fill();

        // Belly
        ctx.fillStyle = sp.belly;
        ctx.beginPath(); ctx.ellipse(0, s * 0.15, s * 0.8, s * 0.3, 0, 0, Math.PI); ctx.fill();

        // Stripe / Pattern
        ctx.fillStyle = sp.stripe;
        ctx.fillRect(-s * 0.1, -s * 0.5, s * 0.15, s);

        // Dorsal Fin
        ctx.fillStyle = sp.stripe;
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, -s * 0.5);
        ctx.quadraticCurveTo(0, -s * 1.1, s * 0.3, -s * 0.5);
        ctx.closePath();
        ctx.fill();

        // Tail
        ctx.fillStyle = sp.body;
        ctx.beginPath();
        ctx.moveTo(-s + 3, 0);
        ctx.lineTo(-s - 12, -s * 0.5);
        ctx.quadraticCurveTo(-s - 6, 0, -s - 12, s * 0.5);
        ctx.closePath();
        ctx.fill();

        // Pectoral Fin
        ctx.fillStyle = sp.stripe;
        ctx.beginPath();
        ctx.moveTo(s * 0.1, s * 0.2);
        ctx.quadraticCurveTo(s * 0.3, s * 0.7, -s * 0.1, s * 0.5);
        ctx.closePath();
        ctx.fill();

        // Eye (white)
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(s * 0.5, -s * 0.1, s * 0.18, 0, Math.PI * 2); ctx.fill();
        // Pupil
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(s * 0.55, -s * 0.1, s * 0.09, 0, Math.PI * 2); ctx.fill();
        // Eye glint
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.arc(s * 0.58, -s * 0.15, s * 0.04, 0, Math.PI * 2); ctx.fill();

        // Mouth
        ctx.strokeStyle = sp.stripe;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s * 0.85, s * 0.05, s * 0.1, 0.2, Math.PI * 0.8);
        ctx.stroke();

        // Swordfish gets a sword
        if (sp.name === 'Swordfish') {
            ctx.fillStyle = '#78909C';
            ctx.beginPath();
            ctx.moveTo(s, 0);
            ctx.lineTo(s + 20, -2);
            ctx.lineTo(s + 20, 2);
            ctx.closePath();
            ctx.fill();
        }

        // Pufferfish gets spines
        if (sp.name === 'Pufferfish') {
            ctx.strokeStyle = sp.stripe;
            ctx.lineWidth = 1.5;
            for (let a = 0; a < Math.PI * 2; a += 0.5) {
                ctx.beginPath();
                ctx.moveTo(Math.cos(a) * s * 0.5, Math.sin(a) * s * 0.45);
                ctx.lineTo(Math.cos(a) * s * 0.75, Math.sin(a) * s * 0.7);
                ctx.stroke();
            }
        }

        ctx.restore();
    }
}

class Rod {
    constructor(boat) {
        this.boat = boat;
        this.lureX = canvas.width * 0.6 + 50;
        this.lureY = seaLevel;
        this.hookedFishes = [];
        this.state = 'idle';
        this.castPower = 0;
    }

    startCasting() {
        if (this.state === 'idle') {
            this.state = 'casting';
            this.castPower = 0;
        }
    }

    releaseCast() {
        if (this.state === 'casting') {
            this.state = 'sinking';
            this.lureX = canvas.width * 0.6 + 50;
            this.lureY = seaLevel;
        }
    }

    update() {
        const maxCapacity = capacityLevel + 2;
        const maxDepth = seaLevel + 100 + (depthLevel * 5000); 

        if (this.state === 'casting') {
            this.castPower = Math.min(this.castPower + 3, 150);
        }

        if (this.state === 'sinking') {
            this.lureY += 14;
            // Only move horizontally when Left Mouse is held
            if (isLeftMouseDown) {
                this.lureX += (mouseX - this.lureX) * 0.2;
            }
            cameraY += (this.lureY - 200 - cameraY) * 0.15;

            // Auto reel back if depth reached or full capacity
            if (this.lureY >= maxDepth || this.hookedFishes.length >= maxCapacity) {
                this.state = 'reeling';
            }
        }

        if (this.state === 'reeling') {
            this.lureY -= 18;
            this.lureX += (canvas.width * 0.6 + 50 - this.lureX) * 0.1;
            cameraY = Math.max(0, cameraY - 18);

            if (this.lureY <= seaLevel) {
                currentSessionMoney = Math.floor(this.hookedFishes.length * 10 * cashMultiplier);
                // Reset hooked fish so they "disappear" from the hook and respawn deep down
                this.hookedFishes.forEach(f => f.reset());
                this.hookedFishes = [];
                
                gameState = 'result';
                this.state = 'result_wait';
            }
        }

        this.hookedFishes.forEach((fish, i) => {
            fish.x = this.lureX;
            fish.y = this.lureY + 15 + (i * 20);
            fish.hooked = true;
        });
    }

    draw() {
        ctx.save();
        ctx.translate(0, -cameraY);
        
        if (this.state !== 'idle') {
            // Fishing line
            ctx.strokeStyle = 'rgba(255,255,255,0.7)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(canvas.width * 0.6 + 40, seaLevel - 20);
            ctx.lineTo(this.lureX, this.lureY);
            ctx.stroke();
            
            // Bobber
            ctx.fillStyle = '#FF1744';
            ctx.beginPath(); ctx.arc(this.lureX, this.lureY, 7, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath(); ctx.arc(this.lureX, this.lureY, 7, Math.PI, Math.PI * 2); ctx.fill();

            // Big Hook - active while sinking
            const hookActive = this.state === 'sinking';
            ctx.strokeStyle = hookActive ? '#FFD600' : '#9E9E9E';
            ctx.lineWidth = hookActive ? 6 : 4;
            // Shaft
            ctx.beginPath();
            ctx.moveTo(this.lureX, this.lureY + 7);
            ctx.lineTo(this.lureX, this.lureY + 30);
            ctx.stroke();
            // Curved hook
            ctx.beginPath();
            ctx.arc(this.lureX + 12, this.lureY + 30, 12, Math.PI, Math.PI * 0.1, true);
            ctx.stroke();
            // Barb
            ctx.beginPath();
            ctx.moveTo(this.lureX + 23, this.lureY + 24);
            ctx.lineTo(this.lureX + 18, this.lureY + 18);
            ctx.stroke();

            // Catch radius indicator when hook active
            if (hookActive) {
                ctx.strokeStyle = 'rgba(255, 214, 0, 0.3)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.lureX, this.lureY + 25, 80, 0, Math.PI * 2);
                ctx.stroke();
            }
        }

        if (this.state === 'casting') {
            const barX = canvas.width * 0.6 + 60;
            const barY = seaLevel - 60;
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(barX, barY, 60, 10);
            ctx.fillStyle = '#76FF03';
            ctx.fillRect(barX, barY, (this.castPower / 150) * 60, 10);
        }
        ctx.restore();
    }
}

const boat = new Boat();
const rod = new Rod(boat);
const fishes = Array.from({ length: 80 }, () => new Fish());

function drawBackground() {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, seaLevel);
    skyGrad.addColorStop(0, '#81D4FA');
    skyGrad.addColorStop(1, '#E1F5FE');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvas.width, seaLevel);

    // Forest / Trees
    if (cameraY < 300) {
        ctx.save();
        ctx.translate(0, -cameraY);
        for (let i = -50; i < canvas.width + 50; i += 40) {
            const h = 60 + Math.sin(i * 0.1) * 20;
            // Tree trunk
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(i + 15, seaLevel - 15, 10, 15);
            // Tree leaves
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.moveTo(i, seaLevel - 15);
            ctx.lineTo(i + 20, seaLevel - 15 - h);
            ctx.lineTo(i + 40, seaLevel - 15);
            ctx.closePath();
            ctx.fill();
        }
        // Grass line
        ctx.fillStyle = '#8BC34A';
        ctx.fillRect(0, seaLevel - 15, canvas.width, 15);
        ctx.restore();
    }

    // Underwater gradient
    const waterGrad = ctx.createLinearGradient(0, seaLevel, 0, canvas.height + seaLevel);
    waterGrad.addColorStop(0, '#2196F3');
    waterGrad.addColorStop(1, '#1A237E');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, Math.max(0, seaLevel - cameraY), canvas.width, canvas.height + 5000);

    ctx.fillStyle = '#1A0D2D';
    for(let i = -100; i < canvas.width + 100; i += 80) {
        ctx.beginPath();
        ctx.moveTo(i, canvas.height); // This needs to be relative to world, but background usually moves slower or is fixed
        // Actually the original background was fixed. Let's keep it simple.
    }
}

function drawWavyWalls() {
    ctx.save();
    ctx.translate(0, -cameraY);
    ctx.fillStyle = '#5E35B1';
    
    const wallDepth = seaLevel + 500 + (depthLevel * 5500);
    // Left
    ctx.beginPath(); ctx.moveTo(0, seaLevel);
    for(let y = seaLevel; y < wallDepth; y += 50) {
        ctx.lineTo(40 + Math.sin(y * 0.04) * 15, y);
    }
    ctx.lineTo(0, wallDepth); ctx.fill();

    // Right
    ctx.beginPath(); ctx.moveTo(canvas.width, seaLevel);
    for(let y = seaLevel; y < wallDepth; y += 50) {
        ctx.lineTo(canvas.width - 40 - Math.sin(y * 0.04) * 15, y);
    }
    ctx.lineTo(canvas.width, wallDepth); ctx.fill();
    ctx.restore();
}

function drawHUD() {
    if (cameraY > 50) {
        // Fishing depth indicator
        ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; ctx.textAlign = 'right';
        ctx.fillText(`x${rod.hookedFishes.length}`, canvas.width - 30, 45);
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillText(`${Math.floor(cameraY/10)}m`, canvas.width - 60, canvas.height * 0.85);

        // Icon
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.ellipse(canvas.width - 70, 38, 15, 10, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Top Money Display (matches image)
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,160,0,1)'; ctx.font = 'bold 16px Arial';
    ctx.fillText('EARNINGS', canvas.width / 2, 25);
    ctx.fillStyle = 'white'; ctx.font = 'bold 48px Arial';
    ctx.fillText(`$ ${money}`, canvas.width / 2, 80);

    // Best Score (top right box)
    const bestW = 100;
    ctx.fillStyle = 'rgba(255,160,0,0.9)';
    ctx.beginPath(); ctx.roundRect(canvas.width - bestW - 20, 20, bestW, 50, 25); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = '900 12px Arial'; ctx.textAlign = 'right';
    ctx.fillText('BEST', canvas.width - 25, 35);
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`$ ${bestMoney}`, canvas.width - 25, 60);

    // Trophy icon for best
    ctx.fillStyle = '#FFD54F';
    ctx.beginPath(); ctx.arc(canvas.width - bestW - 5, 45, 15, 0, Math.PI * 2); ctx.fill();
}

function drawResultScreen() {
    ctx.fillStyle = 'rgba(26, 13, 45, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Banner
    ctx.fillStyle = '#FF5722';
    ctx.beginPath(); ctx.roundRect(canvas.width/2 - 120, 80, 240, 70, 10); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = 'bold 36px Arial'; ctx.textAlign = 'center';
    ctx.fillText('SCORE', canvas.width / 2, 128);

    ctx.font = 'bold 70px Arial';
    ctx.fillText(`${currentSessionMoney} $`, canvas.width / 2, 280);
    ctx.font = '24px Arial'; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`BEST ${bestMoney} $`, canvas.width / 2, 330);

    // Claim Button
    ctx.fillStyle = '#2196F3';
    ctx.beginPath(); ctx.roundRect(canvas.width*0.2, canvas.height*0.72, canvas.width*0.6, 60, 30); ctx.fill();
    ctx.fillStyle = 'white'; ctx.font = 'bold 28px Arial';
    ctx.fillText('CLAIM', canvas.width / 2, canvas.height * 0.72 + 40);
}

function drawUpgradeScreen() {
    if (cameraY >= 50 || gameState !== 'fishing') return;

    // --- PLAY Button ---
    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.45;
    const radius = 65;

    // Circular background
    const playGrad = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
    playGrad.addColorStop(0, '#FF8F00');
    playGrad.addColorStop(1, '#FF5722');
    ctx.fillStyle = playGrad;
    ctx.beginPath(); ctx.arc(centerX, centerY, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.stroke();

    // Hook Icon in center
    ctx.strokeStyle = 'white'; ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY - 25);
    ctx.lineTo(centerX, centerY + 10);
    ctx.arc(centerX + 10, centerY + 10, 10, Math.PI, Math.PI * 0.1, true);
    ctx.stroke();

    // Text on button
    ctx.fillStyle = 'white'; ctx.textAlign = 'center';
    ctx.font = '900 28px Arial';
    ctx.fillText('PLAY', centerX, centerY + 10);

    // --- Upgrade Cards ---
    const cardW = (canvas.width - 60) / 3;
    const cardH = 150;
    const cardY = canvas.height - cardH - 30;

    const drawCard = (idx, title, value, price, type) => {
        const x = 20 + idx * (cardW + 10);
        
        // Card Body
        ctx.fillStyle = 'white';
        ctx.beginPath(); ctx.roundRect(x, cardY, cardW, cardH, 15); ctx.fill();

        // Icon Area
        ctx.fillStyle = '#F5F5F5';
        ctx.beginPath(); ctx.arc(x + cardW/2, cardY + 55, 30, 0, Math.PI * 2); ctx.fill();

        // Draw specific icon
        ctx.save();
        ctx.translate(x + cardW/2, cardY + 55);
        if (type === 'fish') {
            ctx.fillStyle = '#2196F3';
            ctx.beginPath(); ctx.ellipse(-5, 0, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(8, -5, 12, 6, 0.5, 0, Math.PI * 2); ctx.fill();
        } else if (type === 'depth') {
            ctx.strokeStyle = '#FF7043'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 10); ctx.arc(8, 10, 8, Math.PI, Math.PI * 0.1, true); ctx.stroke();
        } else if (type === 'cash') {
            ctx.fillStyle = '#4CAF50';
            ctx.fillRect(-20, -12, 40, 24);
            ctx.fillStyle = 'white'; ctx.font = 'bold 12px Arial';
            ctx.fillText('$', 0, 5);
        }
        ctx.restore();

        // Title
        ctx.fillStyle = '#555'; ctx.font = '900 10px Arial';
        ctx.fillText(title, x + cardW/2, cardY + 15);

        // Value
        ctx.fillStyle = '#333'; ctx.font = 'bold 12px Arial';
        ctx.fillText(value, x + cardW/2, cardY + 100);

        // Price Button
        const canAfford = money >= price;
        ctx.fillStyle = canAfford ? '#FF7043' : '#BDBDBD';
        ctx.beginPath(); ctx.roundRect(x + 5, cardY + 110, cardW - 10, 32, 16); ctx.fill();
        ctx.fillStyle = 'white'; ctx.font = 'bold 14px Arial';
        ctx.fillText(`${price} $`, x + cardW/2, cardY + 132);

        // Upgrade Arrow
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.moveTo(x + cardW - 5, cardY + 5);
        ctx.lineTo(x + cardW + 8, cardY - 5);
        ctx.lineTo(x + cardW - 5, cardY - 15);
        ctx.closePath(); ctx.fill();
    };

    drawCard(0, 'MAX FISHES', `${capacityLevel + 2} FISH`, capacityLevel * 50, 'fish');
    drawCard(1, 'MAX DEPTH', `${depthLevel * 50}m`, depthLevel * 50, 'depth');
    drawCard(2, 'CASH MULTI', `x${cashMultiplier.toFixed(1)}`, Math.floor((cashMultiplier - 0.9) * 10) * 100, 'cash');
}

function loop() {
    if (gameState === 'fishing') {
        rod.update();
        fishes.forEach(f => {
            // Automatically catch fish when sinking if they touch the hook radius
            if (rod.state === 'sinking' && !f.hooked && rod.hookedFishes.length < capacityLevel + 2) {
                const dist = Math.hypot(f.x - rod.lureX, f.y - (rod.lureY + 25));
                if (dist < 80) rod.hookedFishes.push(f);
            }
            f.update();
        });
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawBackground();
    const waterHeight = seaLevel + 500 + (depthLevel * 5500);
    ctx.fillStyle = '#2196F3'; ctx.fillRect(0, seaLevel - cameraY, canvas.width, waterHeight);
    drawWavyWalls();
    boat.draw();
    fishes.forEach(f => f.draw());
    rod.draw();
    drawHUD();

    if (gameState === 'result') drawResultScreen();
    drawUpgradeScreen();

    requestAnimationFrame(loop);
}

loop();
