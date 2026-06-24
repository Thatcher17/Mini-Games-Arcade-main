const canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

// --- Game State ---
let money = 200;
let lives = 5;
let wave = 0;
let enemies = [];
let towers = [];
let projectiles = [];
let selectedUnitType = null;
let selectedTower = null;
const mouse = { x: 0, y: 0 };
let frameCount = 0;
let gameStarted = false;

const towerConfigs = {
    basic:  { name: 'Soldier', cost: 50,  range: 120, damage: 15,  fireRate: 40,  color: '#3498db', projColor: '#5dade2' },
    fast:   { name: 'Speedy',  cost: 75,  range: 100, damage: 8,   fireRate: 15,  color: '#2ecc71', projColor: '#58d68d' },
    heavy:  { name: 'Giant',   cost: 150, range: 80,  damage: 50,  fireRate: 80,  color: '#e67e22', projColor: '#f0b27a' },
    long:   { name: 'Sniper',  cost: 200, range: 250, damage: 100, fireRate: 120, color: '#9b59b6', projColor: '#c39bd3' },
    mage:   { name: 'Wizard',  cost: 300, range: 150, damage: 30,  fireRate: 60,  color: '#f1c40f', projColor: '#f9e79f' },
    farm:   { name: 'Farm',    cost: 250, range: 0,   damage: 50,  fireRate: 300, color: '#795548', projColor: '#ffd700' }
};

// --- Map Path ---
const path = [
    { x: -50, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 100 },
    { x: 500, y: 100 },
    { x: 500, y: 500 },
    { x: 700, y: 500 },
    { x: 700, y: 300 },
    { x: 850, y: 300 }
];

// ==========================================
// MAP - Pre-baked to offscreen canvas for performance
// ==========================================
const mapCanvas = document.createElement('canvas');
mapCanvas.width = canvas.width;
mapCanvas.height = canvas.height;
const mapCtx = mapCanvas.getContext('2d');

function isOnPath(px, py, margin) {
    for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / (len * len)));
        const cx = a.x + t * dx, cy = a.y + t * dy;
        if (Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) < margin) return true;
    }
    return false;
}

function generateMap() {
    // === BASE GRASS (gradient) ===
    const grassGrad = mapCtx.createLinearGradient(0, 0, 0, canvas.height);
    grassGrad.addColorStop(0, '#4a9e3f');
    grassGrad.addColorStop(0.5, '#3d8b34');
    grassGrad.addColorStop(1, '#357a2e');
    mapCtx.fillStyle = grassGrad;
    mapCtx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle noise patches on grass
    for (let i = 0; i < 500; i++) {
        const gx = Math.random() * canvas.width;
        const gy = Math.random() * canvas.height;
        if (isOnPath(gx, gy, 28)) continue;
        const shade = 30 + Math.random() * 40;
        mapCtx.fillStyle = `rgba(${shade}, ${80 + Math.random() * 40}, ${shade - 10}, 0.25)`;
        mapCtx.beginPath();
        mapCtx.ellipse(gx, gy, 3 + Math.random() * 8, 2 + Math.random() * 5, Math.random() * Math.PI, 0, Math.PI * 2);
        mapCtx.fill();
    }

    // === PATH ===
    // Outer border
    mapCtx.strokeStyle = '#5d4037';
    mapCtx.lineWidth = 48;
    mapCtx.lineJoin = 'round';
    mapCtx.lineCap = 'round';
    mapCtx.beginPath();
    mapCtx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) mapCtx.lineTo(path[i].x, path[i].y);
    mapCtx.stroke();

    // Main dirt
    mapCtx.strokeStyle = '#a67c52';
    mapCtx.lineWidth = 40;
    mapCtx.beginPath();
    mapCtx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) mapCtx.lineTo(path[i].x, path[i].y);
    mapCtx.stroke();

    // Light center
    mapCtx.strokeStyle = '#c4a26e';
    mapCtx.lineWidth = 18;
    mapCtx.beginPath();
    mapCtx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) mapCtx.lineTo(path[i].x, path[i].y);
    mapCtx.stroke();

    // Path pebbles / texture
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i], p2 = path[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        for (let d = 0; d < dist; d += 5) {
            const t = d / dist;
            const bx = p1.x + dx * t + (Math.random() - 0.5) * 28;
            const by = p1.y + dy * t + (Math.random() - 0.5) * 28;
            mapCtx.fillStyle = Math.random() > 0.5 ? 'rgba(90,65,40,0.2)' : 'rgba(180,150,110,0.15)';
            mapCtx.beginPath();
            mapCtx.arc(bx, by, 0.5 + Math.random() * 2, 0, Math.PI * 2);
            mapCtx.fill();
        }
    }

    // === GRASS TUFTS ===
    for (let i = 0; i < 280; i++) {
        const gx = Math.random() * canvas.width;
        const gy = Math.random() * canvas.height;
        if (isOnPath(gx, gy, 28)) continue;
        const h = 4 + Math.random() * 8;
        const clr = Math.random() > 0.5 ? '#2d7d2d' : '#3a9a3a';
        mapCtx.strokeStyle = clr;
        mapCtx.lineWidth = 1.5;
        for (let b = -1; b <= 1; b++) {
            mapCtx.beginPath();
            mapCtx.moveTo(gx + b * 2, gy);
            mapCtx.quadraticCurveTo(gx + b * 4, gy - h * 0.6, gx + b * 3, gy - h);
            mapCtx.stroke();
        }
    }

    // === FLOWERS ===
    for (let i = 0; i < 35; i++) {
        const fx = Math.random() * canvas.width;
        const fy = Math.random() * canvas.height;
        if (isOnPath(fx, fy, 30)) continue;
        const colors = ['#e74c3c', '#f39c12', '#e91e63', '#9b59b6', '#ffffff', '#f1c40f'];
        const fc = colors[Math.floor(Math.random() * colors.length)];
        mapCtx.strokeStyle = '#2d6b2d';
        mapCtx.lineWidth = 1;
        mapCtx.beginPath(); mapCtx.moveTo(fx, fy); mapCtx.lineTo(fx, fy - 6); mapCtx.stroke();
        for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            mapCtx.fillStyle = fc;
            mapCtx.beginPath();
            mapCtx.arc(fx + Math.cos(a) * 3, fy - 6 + Math.sin(a) * 3, 2, 0, Math.PI * 2);
            mapCtx.fill();
        }
        mapCtx.fillStyle = '#f1c40f';
        mapCtx.beginPath(); mapCtx.arc(fx, fy - 6, 1.5, 0, Math.PI * 2); mapCtx.fill();
    }

    // === ROCKS ===
    for (let i = 0; i < 12; i++) {
        const rx = Math.random() * canvas.width;
        const ry = Math.random() * canvas.height;
        if (isOnPath(rx, ry, 35)) continue;
        const rw = 5 + Math.random() * 10, rh = 3 + Math.random() * 6;
        const rockGrad = mapCtx.createRadialGradient(rx - 2, ry - 2, 1, rx, ry, rw);
        rockGrad.addColorStop(0, '#aaa');
        rockGrad.addColorStop(1, '#666');
        mapCtx.fillStyle = rockGrad;
        mapCtx.beginPath();
        mapCtx.ellipse(rx, ry, rw, rh, 0.2, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.strokeStyle = '#555';
        mapCtx.lineWidth = 0.5;
        mapCtx.stroke();
    }

    // === TREES ===
    for (let i = 0; i < 16; i++) {
        const tx = Math.random() * canvas.width;
        const ty = Math.random() * canvas.height;
        if (isOnPath(tx, ty, 50)) continue;
        if (ty < 95) continue;

        // Shadow
        mapCtx.fillStyle = 'rgba(0,0,0,0.12)';
        mapCtx.beginPath();
        mapCtx.ellipse(tx + 5, ty + 2, 14, 5, 0, 0, Math.PI * 2);
        mapCtx.fill();

        // Trunk
        const trunkGrad = mapCtx.createLinearGradient(tx - 3, ty, tx + 3, ty);
        trunkGrad.addColorStop(0, '#5d4037');
        trunkGrad.addColorStop(0.5, '#795548');
        trunkGrad.addColorStop(1, '#5d4037');
        mapCtx.fillStyle = trunkGrad;
        mapCtx.fillRect(tx - 3, ty - 18, 6, 20);

        // Leaf clusters
        const leafColors = ['#2e7d32', '#388e3c', '#43a047', '#4caf50'];
        for (let l = 0; l < 4; l++) {
            mapCtx.fillStyle = leafColors[l];
            const lx = tx + (Math.random() - 0.5) * 10;
            const ly = ty - 22 - l * 4 + (Math.random() - 0.5) * 4;
            mapCtx.beginPath();
            mapCtx.arc(lx, ly, 8 + Math.random() * 5, 0, Math.PI * 2);
            mapCtx.fill();
        }
    }

    // === POND ===
    const pondX = 620, pondY = 200;
    if (!isOnPath(pondX, pondY, 50)) {
        const waterGrad = mapCtx.createRadialGradient(pondX, pondY, 5, pondX, pondY, 30);
        waterGrad.addColorStop(0, 'rgba(52, 152, 219, 0.6)');
        waterGrad.addColorStop(0.7, 'rgba(41, 128, 185, 0.5)');
        waterGrad.addColorStop(1, 'rgba(39, 174, 96, 0.3)');
        mapCtx.fillStyle = waterGrad;
        mapCtx.beginPath();
        mapCtx.ellipse(pondX, pondY, 30, 18, 0, 0, Math.PI * 2);
        mapCtx.fill();
        // Lily pads
        mapCtx.fillStyle = 'rgba(46,125,50,0.6)';
        mapCtx.beginPath(); mapCtx.arc(pondX - 8, pondY + 4, 4, 0, Math.PI * 1.7); mapCtx.fill();
        mapCtx.beginPath(); mapCtx.arc(pondX + 10, pondY - 2, 3, 0, Math.PI * 1.7); mapCtx.fill();
    }

    // === PATH EDGE GRASS ===
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i], p2 = path[i + 1];
        const dx = p2.x - p1.x, dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / dist, ny = dx / dist;
        for (let d = 0; d < dist; d += 8) {
            const t = d / dist;
            for (let side = -1; side <= 1; side += 2) {
                const ex = p1.x + dx * t + nx * 23 * side + (Math.random() - 0.5) * 4;
                const ey = p1.y + dy * t + ny * 23 * side + (Math.random() - 0.5) * 4;
                mapCtx.strokeStyle = Math.random() > 0.5 ? '#2d7d2d' : '#3a9a3a';
                mapCtx.lineWidth = 1;
                mapCtx.beginPath();
                mapCtx.moveTo(ex, ey);
                mapCtx.lineTo(ex + (Math.random() - 0.5) * 3, ey - 3 - Math.random() * 4);
                mapCtx.stroke();
            }
        }
    }
}
generateMap();

// ==========================================
// CHARACTER DRAWING
// ==========================================

function drawCharacter(x, y, type, scale, facingLeft) {
    ctx.save();
    const s = scale;
    if (type === 'basic') drawSoldier(x, y, s);
    else if (type === 'fast') drawSpeedy(x, y, s);
    else if (type === 'heavy') drawGiant(x, y, s);
    else if (type === 'long') drawSniper(x, y, s);
    else if (type === 'mage') drawWizard(x, y, s);
    else if (type === 'farm') drawFarm(x, y, s);
    else if (type === 'enemy') drawGoblin(x, y, s);
    ctx.restore();
}

function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

// ─── FARM ───
function drawFarm(x, y, s) {
    // Ground base
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); ctx.ellipse(x, y, 15 * s, 8 * s, 0, 0, Math.PI * 2); ctx.fill();
    
    // Barn structure
    ctx.fillStyle = '#c62828';
    ctx.fillRect(x - 12 * s, y - 24 * s, 24 * s, 20 * s);
    
    // Roof
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y - 24 * s);
    ctx.lineTo(x, y - 36 * s);
    ctx.lineTo(x + 14 * s, y - 24 * s);
    ctx.closePath();
    ctx.fill();
    
    // Door
    ctx.fillStyle = '#white';
    ctx.fillRect(x - 4 * s, y - 14 * s, 8 * s, 10 * s);
    ctx.strokeStyle = '#8d6e63';
    ctx.strokeRect(x - 4 * s, y - 14 * s, 8 * s, 10 * s);
    
    // Window/Cross on barn
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 20 * s); ctx.lineTo(x + 8 * s, y - 12 * s);
    ctx.moveTo(x + 8 * s, y - 20 * s); ctx.lineTo(x - 8 * s, y - 12 * s);
    ctx.stroke();

    // Floating gold coin effect
    if (frameCount % 60 < 30) {
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(x, y - 45 * s, 4 * s, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f9a825';
        ctx.font = 'bold ' + (10 * s) + 'px Arial';
        ctx.fillText('$', x - 2 * s, y - 41 * s);
    }
}

// ─── SOLDIER ───
function drawSoldier(x, y, s) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(x, y, 8 * s, 3 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Boots
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(x - 6 * s, y - 4 * s, 5 * s, 4 * s);
    ctx.fillRect(x + 1 * s, y - 4 * s, 5 * s, 4 * s);
    // Legs
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x - 5 * s, y - 14 * s, 4 * s, 11 * s);
    ctx.fillRect(x + 1 * s, y - 14 * s, 4 * s, 11 * s);
    // Body
    const bodyGrad = ctx.createLinearGradient(x - 6 * s, y - 28 * s, x + 6 * s, y - 14 * s);
    bodyGrad.addColorStop(0, '#2980b9');
    bodyGrad.addColorStop(1, '#3498db');
    ctx.fillStyle = bodyGrad;
    roundRect(x - 7 * s, y - 28 * s, 14 * s, 15 * s, 2 * s);
    // Belt
    ctx.fillStyle = '#7f6c54';
    ctx.fillRect(x - 7 * s, y - 15 * s, 14 * s, 2 * s);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x - 1 * s, y - 15 * s, 2 * s, 2 * s);
    // Arms
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(x - 10 * s, y - 27 * s, 4 * s, 10 * s);
    ctx.fillRect(x + 6 * s, y - 27 * s, 4 * s, 10 * s);
    // Hands
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(x - 8 * s, y - 16 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8 * s, y - 16 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    // Sword
    ctx.fillStyle = '#bdc3c7';
    ctx.fillRect(x + 9 * s, y - 28 * s, 2 * s, 16 * s);
    ctx.fillStyle = '#7f6c54';
    ctx.fillRect(x + 7 * s, y - 13 * s, 6 * s, 2 * s);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x + 9 * s, y - 11 * s, 2 * s, 5 * s);
    // Shield on left arm
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(x - 14 * s, y - 26 * s);
    ctx.lineTo(x - 10 * s, y - 27 * s);
    ctx.lineTo(x - 10 * s, y - 18 * s);
    ctx.lineTo(x - 12 * s, y - 16 * s);
    ctx.lineTo(x - 14 * s, y - 18 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3498db';
    ctx.beginPath(); ctx.arc(x - 12 * s, y - 22 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(x, y - 33 * s, 6 * s, 0, Math.PI * 2); ctx.fill();
    // Helmet
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(x, y - 33 * s, 6.5 * s, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 7 * s, y - 34 * s, 14 * s, 2 * s);
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 34 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 34 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath(); ctx.arc(x - 1.5 * s, y - 34 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2.5 * s, y - 34 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#a0522d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y - 30 * s, 2 * s, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
}

// ─── SPEEDY ───
function drawSpeedy(x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y, 7 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Running shoes
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 5 * s, y - 3 * s, 4 * s, 3 * s);
    ctx.fillRect(x + 1 * s, y - 3 * s, 4 * s, 3 * s);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 4 * s, y - 3 * s, 2 * s, 1 * s);
    ctx.fillRect(x + 2 * s, y - 3 * s, 2 * s, 1 * s);
    // Legs
    ctx.fillStyle = '#1a5276';
    ctx.fillRect(x - 4 * s, y - 12 * s, 3 * s, 10 * s);
    ctx.fillRect(x + 1 * s, y - 12 * s, 3 * s, 10 * s);
    // Body
    const bodyGrad = ctx.createLinearGradient(x - 5 * s, y - 24 * s, x + 5 * s, y - 12 * s);
    bodyGrad.addColorStop(0, '#27ae60');
    bodyGrad.addColorStop(1, '#2ecc71');
    ctx.fillStyle = bodyGrad;
    roundRect(x - 6 * s, y - 24 * s, 12 * s, 13 * s, 2 * s);
    // Speed chevrons
    ctx.strokeStyle = '#1e8449';
    ctx.lineWidth = 1 * s;
    for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x - 3 * s, y - (22 - i * 3) * s);
        ctx.lineTo(x, y - (23 - i * 3) * s);
        ctx.lineTo(x + 3 * s, y - (22 - i * 3) * s);
        ctx.stroke();
    }
    // Bare arms
    ctx.fillStyle = '#f0c8a0';
    ctx.fillRect(x - 8 * s, y - 23 * s, 3 * s, 9 * s);
    ctx.fillRect(x + 5 * s, y - 23 * s, 3 * s, 9 * s);
    // Dual daggers
    ctx.fillStyle = '#bdc3c7';
    ctx.save();
    ctx.translate(x + 7 * s, y - 14 * s);
    ctx.rotate(0.3);
    ctx.fillRect(-1 * s, -8 * s, 2 * s, 8 * s);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-1.5 * s, 0, 3 * s, 2 * s);
    ctx.restore();
    ctx.fillStyle = '#bdc3c7';
    ctx.save();
    ctx.translate(x - 7 * s, y - 14 * s);
    ctx.rotate(-0.3);
    ctx.fillRect(-1 * s, -8 * s, 2 * s, 8 * s);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-1.5 * s, 0, 3 * s, 2 * s);
    ctx.restore();
    // Head
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(x, y - 28 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    // Headband
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x - 5.5 * s, y - 30 * s, 11 * s, 2.5 * s);
    // Headband tails
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(x + 5.5 * s, y - 29 * s);
    ctx.quadraticCurveTo(x + 9 * s, y - 30 * s, x + 11 * s, y - 32 * s);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 29 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 29 * s, 1.3 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a5276';
    ctx.beginPath(); ctx.arc(x - 1.6 * s, y - 29 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2.4 * s, y - 29 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();
    // Grin
    ctx.strokeStyle = '#a0522d';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(x, y - 26 * s, 1.5 * s, 0, Math.PI); ctx.stroke();
}

// ─── GIANT ───
function drawGiant(x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(x, y, 12 * s, 4 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Heavy boots
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(x - 8 * s, y - 6 * s, 7 * s, 6 * s);
    ctx.fillRect(x + 1 * s, y - 6 * s, 7 * s, 6 * s);
    // Armored legs
    const legGrad = ctx.createLinearGradient(x - 8 * s, y, x + 8 * s, y);
    legGrad.addColorStop(0, '#78909c');
    legGrad.addColorStop(0.5, '#90a4ae');
    legGrad.addColorStop(1, '#78909c');
    ctx.fillStyle = legGrad;
    ctx.fillRect(x - 7 * s, y - 18 * s, 6 * s, 13 * s);
    ctx.fillRect(x + 1 * s, y - 18 * s, 6 * s, 13 * s);
    // Body armor
    const armorGrad = ctx.createLinearGradient(x - 10 * s, y - 38 * s, x + 10 * s, y - 18 * s);
    armorGrad.addColorStop(0, '#b0bec5');
    armorGrad.addColorStop(0.3, '#cfd8dc');
    armorGrad.addColorStop(0.5, '#b0bec5');
    armorGrad.addColorStop(1, '#78909c');
    ctx.fillStyle = armorGrad;
    roundRect(x - 10 * s, y - 38 * s, 20 * s, 21 * s, 3 * s);
    // Armor seam
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 38 * s); ctx.lineTo(x, y - 18 * s);
    ctx.stroke();
    // Shoulder pads
    ctx.fillStyle = '#78909c';
    ctx.beginPath(); ctx.arc(x - 10 * s, y - 35 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 10 * s, y - 35 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x - 10 * s, y - 35 * s, 5 * s, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 10 * s, y - 35 * s, 5 * s, 0, Math.PI * 2); ctx.stroke();
    // Arms
    ctx.fillStyle = '#90a4ae';
    ctx.fillRect(x - 14 * s, y - 34 * s, 5 * s, 14 * s);
    ctx.fillRect(x + 9 * s, y - 34 * s, 5 * s, 14 * s);
    // Gauntlets
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(x - 14 * s, y - 21 * s, 5 * s, 4 * s);
    ctx.fillRect(x + 9 * s, y - 21 * s, 5 * s, 4 * s);
    // War Hammer
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(x + 13 * s, y - 42 * s, 2 * s, 26 * s);
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(x + 9 * s, y - 44 * s, 10 * s, 6 * s);
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 9 * s, y - 44 * s, 10 * s, 6 * s);
    // Hammer spike
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.moveTo(x + 19 * s, y - 42 * s);
    ctx.lineTo(x + 22 * s, y - 41 * s);
    ctx.lineTo(x + 19 * s, y - 40 * s);
    ctx.closePath();
    ctx.fill();
    // Head
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(x, y - 43 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    // Helmet
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.arc(x, y - 43 * s, 7.5 * s, Math.PI, 0);
    ctx.fill();
    // Visor
    ctx.fillStyle = '#37474f';
    ctx.fillRect(x - 5 * s, y - 45 * s, 10 * s, 3 * s);
    // Glowing eyes
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 43.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 43.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
}

// ─── SNIPER ───
function drawSniper(x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y, 7 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Boots
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x - 5 * s, y - 3 * s, 4 * s, 3 * s);
    ctx.fillRect(x + 1 * s, y - 3 * s, 4 * s, 3 * s);
    // Legs
    ctx.fillStyle = '#4a235a';
    ctx.fillRect(x - 4 * s, y - 13 * s, 3.5 * s, 11 * s);
    ctx.fillRect(x + 0.5 * s, y - 13 * s, 3.5 * s, 11 * s);
    // Body (coat)
    const bodyGrad = ctx.createLinearGradient(x - 6 * s, y - 26 * s, x + 6 * s, y - 13 * s);
    bodyGrad.addColorStop(0, '#7d3c98');
    bodyGrad.addColorStop(1, '#9b59b6');
    ctx.fillStyle = bodyGrad;
    roundRect(x - 6 * s, y - 26 * s, 12 * s, 14 * s, 2 * s);
    // Coat detail buttons
    ctx.fillStyle = '#f1c40f';
    for (let b = 0; b < 3; b++) {
        ctx.beginPath();
        ctx.arc(x, y - 24 * s + b * 4 * s, 0.8 * s, 0, Math.PI * 2);
        ctx.fill();
    }
    // Arms
    ctx.fillStyle = '#7d3c98';
    ctx.fillRect(x - 8 * s, y - 25 * s, 3 * s, 10 * s);
    ctx.fillRect(x + 5 * s, y - 25 * s, 3 * s, 10 * s);
    // Gloved hands
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath(); ctx.arc(x - 6.5 * s, y - 14 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6.5 * s, y - 14 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    // Sniper rifle
    ctx.fillStyle = '#2c3e50';
    ctx.save();
    ctx.translate(x + 7 * s, y - 18 * s);
    ctx.rotate(-0.2);
    ctx.fillRect(0, -1.5 * s, 20 * s, 3 * s);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-3 * s, -2.5 * s, 6 * s, 5 * s);
    ctx.fillStyle = '#3498db';
    ctx.beginPath(); ctx.arc(8 * s, -3 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2c3e50'; ctx.lineWidth = 0.5 * s; ctx.stroke();
    // Scope glint
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(7.5 * s, -3.5 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Head
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(x, y - 30 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    // Hood
    ctx.fillStyle = '#6c3483';
    ctx.beginPath();
    ctx.arc(x, y - 30 * s, 5.5 * s, Math.PI * 0.85, Math.PI * 0.15, true);
    ctx.lineTo(x + 4 * s, y - 24 * s);
    ctx.lineTo(x - 4 * s, y - 24 * s);
    ctx.closePath();
    ctx.fill();
    // Goggles
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(x - 5 * s, y - 32 * s, 10 * s, 3 * s);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 30.5 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3498db';
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 30.5 * s, 1.2 * s, 0, Math.PI * 2); ctx.fill();
    // Mouth
    ctx.strokeStyle = '#a0522d';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x - 1.5 * s, y - 28 * s);
    ctx.lineTo(x + 1.5 * s, y - 28 * s);
    ctx.stroke();
}

// ─── WIZARD ───
function drawWizard(x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y, 7 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Shoes
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 1 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 3 * s, y - 1 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Robe
    const robeGrad = ctx.createLinearGradient(x, y - 30 * s, x, y);
    robeGrad.addColorStop(0, '#1a237e');
    robeGrad.addColorStop(0.5, '#283593');
    robeGrad.addColorStop(1, '#3949ab');
    ctx.fillStyle = robeGrad;
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - 2 * s);
    ctx.lineTo(x - 8 * s, y - 28 * s);
    ctx.quadraticCurveTo(x, y - 32 * s, x + 8 * s, y - 28 * s);
    ctx.lineTo(x + 7 * s, y - 2 * s);
    ctx.closePath();
    ctx.fill();
    // Stars on robe
    ctx.fillStyle = '#ffd54f';
    [[-3, -10], [2, -16], [-1, -22], [4, -8]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.arc(x + sx * s, y + sy * s, 1 * s, 0, Math.PI * 2);
        ctx.fill();
    });
    // Belt
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x - 7 * s, y - 14 * s, 14 * s, 2 * s);
    // Gem on belt
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(x, y - 15 * s);
    ctx.lineTo(x + 2 * s, y - 13 * s);
    ctx.lineTo(x, y - 11 * s);
    ctx.lineTo(x - 2 * s, y - 13 * s);
    ctx.closePath();
    ctx.fill();
    // Sleeves
    ctx.fillStyle = '#283593';
    ctx.fillRect(x - 10 * s, y - 27 * s, 4 * s, 12 * s);
    ctx.fillRect(x + 6 * s, y - 27 * s, 4 * s, 12 * s);
    // Hands
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(x - 8 * s, y - 15 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 8 * s, y - 15 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    // Staff
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(x + 10 * s, y - 2 * s);
    ctx.lineTo(x + 10 * s, y - 42 * s);
    ctx.stroke();
    // Orb with glow
    const orbGlow = ctx.createRadialGradient(x + 10 * s, y - 44 * s, 1 * s, x + 10 * s, y - 44 * s, 5 * s);
    orbGlow.addColorStop(0, '#fff');
    orbGlow.addColorStop(0.3, '#64b5f6');
    orbGlow.addColorStop(0.7, '#1565c0');
    orbGlow.addColorStop(1, 'rgba(21,101,192,0)');
    ctx.fillStyle = orbGlow;
    ctx.beginPath(); ctx.arc(x + 10 * s, y - 44 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#42a5f5';
    ctx.beginPath(); ctx.arc(x + 10 * s, y - 44 * s, 3 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(x + 9 * s, y - 45 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    // Head
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath(); ctx.arc(x, y - 33 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    // Beard
    ctx.fillStyle = '#bdbdbd';
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, y - 30 * s);
    ctx.quadraticCurveTo(x, y - 22 * s, x + 3 * s, y - 30 * s);
    ctx.fill();
    // Wizard Hat
    const hatGrad = ctx.createLinearGradient(x, y - 54 * s, x, y - 35 * s);
    hatGrad.addColorStop(0, '#0d47a1');
    hatGrad.addColorStop(1, '#1565c0');
    ctx.fillStyle = hatGrad;
    ctx.beginPath();
    ctx.moveTo(x - 8 * s, y - 36 * s);
    ctx.lineTo(x + 8 * s, y - 36 * s);
    ctx.lineTo(x + 3 * s, y - 54 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(x - 8 * s, y - 38 * s, 16 * s, 2.5 * s);
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath(); ctx.arc(x + 1 * s, y - 45 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 34 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 34 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0d47a1';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 34 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 34 * s, 0.8 * s, 0, Math.PI * 2); ctx.fill();
}

// ─── GOBLIN (Enemy) ───
function drawGoblin(x, y, s) {
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath(); ctx.ellipse(x, y, 6 * s, 2 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Feet
    ctx.fillStyle = '#5d8a3c';
    ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 1 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 3 * s, y - 1 * s, 3 * s, 1.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Legs
    ctx.fillStyle = '#4a7a2e';
    ctx.fillRect(x - 4 * s, y - 10 * s, 3 * s, 9 * s);
    ctx.fillRect(x + 1 * s, y - 10 * s, 3 * s, 9 * s);
    // Ragged tunic
    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y - 10 * s);
    ctx.lineTo(x - 5 * s, y - 22 * s);
    ctx.lineTo(x + 5 * s, y - 22 * s);
    ctx.lineTo(x + 6 * s, y - 10 * s);
    ctx.closePath();
    ctx.fill();
    // Torn edges
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 0.8 * s;
    ctx.beginPath();
    ctx.moveTo(x - 6 * s, y - 10 * s);
    ctx.lineTo(x - 4 * s, y - 8 * s);
    ctx.lineTo(x - 2 * s, y - 10 * s);
    ctx.lineTo(x, y - 9 * s);
    ctx.lineTo(x + 2 * s, y - 10 * s);
    ctx.lineTo(x + 4 * s, y - 8 * s);
    ctx.lineTo(x + 6 * s, y - 10 * s);
    ctx.stroke();
    // Arms
    ctx.fillStyle = '#5d8a3c';
    ctx.fillRect(x - 8 * s, y - 21 * s, 3 * s, 9 * s);
    ctx.fillRect(x + 5 * s, y - 21 * s, 3 * s, 9 * s);
    // Club
    ctx.fillStyle = '#5d4037';
    ctx.save();
    ctx.translate(x + 7 * s, y - 12 * s);
    ctx.rotate(0.4);
    ctx.fillRect(-1 * s, -10 * s, 2.5 * s, 10 * s);
    ctx.fillStyle = '#795548';
    ctx.beginPath(); ctx.ellipse(0.25 * s, -11 * s, 3.5 * s, 2.5 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Spikes
    ctx.fillStyle = '#bdbdbd';
    ctx.beginPath(); ctx.arc(-2.5 * s, -11 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(3 * s, -11 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(0.25 * s, -13.5 * s, 1 * s, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // Head
    ctx.fillStyle = '#5d8a3c';
    ctx.beginPath(); ctx.arc(x, y - 25 * s, 5 * s, 0, Math.PI * 2); ctx.fill();
    // Pointy ears
    ctx.beginPath();
    ctx.moveTo(x - 5 * s, y - 27 * s);
    ctx.lineTo(x - 11 * s, y - 30 * s);
    ctx.lineTo(x - 5 * s, y - 24 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 5 * s, y - 27 * s);
    ctx.lineTo(x + 11 * s, y - 30 * s);
    ctx.lineTo(x + 5 * s, y - 24 * s);
    ctx.closePath();
    ctx.fill();
    // Yellow eyes
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath(); ctx.arc(x - 2 * s, y - 26 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2 * s, y - 26 * s, 1.5 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath(); ctx.arc(x - 1.7 * s, y - 26 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 2.3 * s, y - 26 * s, 0.7 * s, 0, Math.PI * 2); ctx.fill();
    // Mouth with fangs
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(x, y - 22 * s, 2.5 * s, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x - 1.5 * s, y - 22 * s); ctx.lineTo(x - 0.5 * s, y - 20.5 * s); ctx.lineTo(x + 0.5 * s, y - 22 * s);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 0.5 * s, y - 22 * s); ctx.lineTo(x + 1.5 * s, y - 20.5 * s); ctx.lineTo(x + 2.5 * s, y - 22 * s);
    ctx.fill();
}

// ==========================================
// CLASSES
// ==========================================

class Enemy {
    constructor(health, speed) {
        this.x = path[0].x;
        this.y = path[0].y;
        this.health = health;
        this.maxHealth = health;
        this.speed = speed;
        this.waypointIndex = 0;
    }

    draw() {
        // Health bar bg
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.moveTo(this.x - 14, this.y - 42); ctx.lineTo(this.x + 14, this.y - 42);
        ctx.lineTo(this.x + 14, this.y - 36); ctx.lineTo(this.x - 14, this.y - 36);
        ctx.closePath(); ctx.fill();
        // Health bar red
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(this.x - 13, this.y - 41, 26, 4);
        // Health fill
        const hpPct = this.health / this.maxHealth;
        ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : (hpPct > 0.25 ? '#f39c12' : '#e74c3c');
        ctx.fillRect(this.x - 13, this.y - 41, hpPct * 26, 4);

        drawCharacter(this.x, this.y, 'enemy', 0.8, false);
    }

    update() {
        const target = path[this.waypointIndex + 1];
        if (target) {
            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < this.speed) {
                this.waypointIndex++;
            } else {
                this.x += (dx / dist) * this.speed;
                this.y += (dy / dist) * this.speed;
            }
        } else {
            lives--;
            return false;
        }
        return this.health > 0;
    }
}

class Projectile {
    constructor(x, y, target, damage, type) {
        this.x = x;
        this.y = y;
        this.target = target;
        this.damage = damage;
        this.speed = type === 'long' ? 12 : (type === 'mage' ? 5 : 7);
        this.type = type;
        this.trail = [];
    }

    draw() {
        // Trail
        if (this.type === 'mage') {
            for (let i = 0; i < this.trail.length; i++) {
                const alpha = i / this.trail.length * 0.4;
                ctx.fillStyle = `rgba(66, 165, 245, ${alpha})`;
                ctx.beginPath();
                ctx.arc(this.trail[i].x, this.trail[i].y, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            const glow = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, 8);
            glow.addColorStop(0, 'rgba(255,255,255,0.9)');
            glow.addColorStop(0.4, 'rgba(66,165,245,0.7)');
            glow.addColorStop(1, 'rgba(66,165,245,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(this.x, this.y, 8, 0, Math.PI * 2); ctx.fill();
        } else if (this.type === 'long') {
            ctx.strokeStyle = 'rgba(200,200,200,0.5)';
            ctx.lineWidth = 1;
            if (this.trail.length > 0) {
                ctx.beginPath();
                ctx.moveTo(this.trail[0].x, this.trail[0].y);
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
            }
            ctx.fillStyle = '#ecf0f1';
            ctx.beginPath(); ctx.arc(this.x, this.y, 2, 0, Math.PI * 2); ctx.fill();
        } else {
            const cfg = towerConfigs[this.type] || {};
            ctx.fillStyle = cfg.projColor || '#f1c40f';
            ctx.beginPath(); ctx.arc(this.x, this.y, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath(); ctx.arc(this.x - 0.5, this.y - 0.5, 1.2, 0, Math.PI * 2); ctx.fill();
        }
    }

    update() {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 8) this.trail.shift();

        if (!enemies.includes(this.target)) return false;
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.speed) {
            this.target.health -= this.damage;
            if (this.target.health <= 0) {
                const idx = enemies.indexOf(this.target);
                if (idx > -1) { money += 20; enemies.splice(idx, 1); }
            }
            return false;
        }
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
        return true;
    }
}

class Tower {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        const cfg = towerConfigs[type];
        this.range = cfg.range;
        this.damage = cfg.damage;
        this.fireRate = cfg.fireRate;
        this.fireTimer = 0;
        this.color = cfg.color;
        this.level = 1;
        this.upgradeCost = Math.floor(cfg.cost * 1.5);
    }

    upgrade() {
        if (money >= this.upgradeCost) {
            money -= this.upgradeCost;
            this.level++;
            this.damage = Math.floor(this.damage * 1.4);
            this.range += 15;
            this.fireRate = Math.max(5, Math.floor(this.fireRate * 0.9));
            this.upgradeCost = Math.floor(this.upgradeCost * 1.8);
            return true;
        }
        return false;
    }

    draw() {
        drawCharacter(this.x, this.y, this.type, this.type === 'heavy' ? 1.2 : 1, false);

        // Draw level indicator
        ctx.fillStyle = '#f1c40f';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Lv.' + this.level, this.x, this.y + 10);

        // Range on hover or if selected
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        if (Math.sqrt(dx * dx + dy * dy) < 25 || selectedTower === this) {
            ctx.strokeStyle = selectedTower === this ? 'rgba(230, 126, 34, 0.5)' : 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = selectedTower === this ? 2 : 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(this.x, this.y - 15, this.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    update() {
        if (this.fireTimer > 0) {
            this.fireTimer--;
        } else {
            if (this.type === 'farm') {
                money += this.damage; // Farm "damage" is money generated
                this.fireTimer = this.fireRate;
                return;
            }

            const target = enemies.find(e => {
                const dx = e.x - this.x;
                const dy = e.y - this.y;
                return Math.sqrt(dx * dx + dy * dy) < this.range;
            });
            if (target) {
                projectiles.push(new Projectile(this.x, this.y - 20, target, this.damage, this.type));
                this.fireTimer = this.fireRate;
            }
        }
    }
}

// --- Interaction ---
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener('click', (e) => {
    // If we click on a tower, select it for upgrades
    const clickedTower = towers.find(t => {
        const dx = mouse.x - t.x;
        const dy = mouse.y - t.y;
        return Math.sqrt(dx * dx + dy * dy) < 25;
    });

    if (clickedTower) {
        showUpgradeMenu(clickedTower);
        return;
    }

    // Otherwise, try to place a tower
    if (!selectedUnitType) {
        hideUpgradeMenu();
        return;
    }

    if (isOnPath(mouse.x, mouse.y, 30)) return; // Block track placement
    
    const cfg = towerConfigs[selectedUnitType];
    if (money >= cfg.cost) {
        towers.push(new Tower(mouse.x, mouse.y, selectedUnitType));
        money -= cfg.cost;
        
        selectedUnitType = null;
        document.querySelectorAll('.unit').forEach(btn => btn.classList.remove('active'));
    }
});

document.querySelectorAll('.unit').forEach(u => {
    u.addEventListener('click', (e) => {
        e.stopPropagation();
        hideUpgradeMenu(); // Selecting a unit hides upgrade menu
        document.querySelectorAll('.unit').forEach(btn => btn.classList.remove('active'));
        u.classList.add('active');
        selectedUnitType = u.dataset.unit;
    });
});

const startBtn = document.getElementById('start-game-btn');
const startScreen = document.getElementById('start-screen');

startBtn.addEventListener('click', () => {
    gameStarted = true;
    startScreen.style.display = 'none';
});

function startWave() {
    // Legacy function replaced by startFirstWave logic
}

const upgradeMenu = document.getElementById('upgrade-menu');
const upgradeBtn = document.getElementById('upgrade-btn');
const closeUpgrade = document.getElementById('close-upgrade');

function showUpgradeMenu(tower) {
    selectedTower = tower;
    selectedUnitType = null;
    document.querySelectorAll('.unit').forEach(btn => btn.classList.remove('active'));
    
    upgradeMenu.classList.remove('hidden');
    document.getElementById('upgrade-title').textContent = towerConfigs[tower.type].name + ' (Lv.' + tower.level + ')';
    
    const nextDmg = Math.floor(tower.damage * 1.4);
    const nextRange = tower.range + 15;
    const nextSpd = Math.max(5, Math.floor(tower.fireRate * 0.9));

    const dmgLabel = tower.type === 'farm' ? 'Income' : 'DMG';
    const spdLabel = tower.type === 'farm' ? 'Frequency' : 'SPD';

    document.getElementById('stat-dmg').innerHTML = `${dmgLabel}: ${tower.damage} <span class="bonus">→ ${nextDmg}</span>`;
    document.getElementById('stat-range').innerHTML = tower.type === 'farm' ? '' : `Range: ${tower.range} <span class="bonus">→ ${nextRange}</span>`;
    document.getElementById('stat-spd').innerHTML = `${spdLabel}: ${tower.fireRate} <span class="bonus">→ ${nextSpd}</span>`;
    
    upgradeBtn.textContent = `Upgrade ($${tower.upgradeCost})`;
    upgradeBtn.disabled = money < tower.upgradeCost;
    upgradeBtn.style.opacity = money < tower.upgradeCost ? '0.5' : '1';
}

function hideUpgradeMenu() {
    selectedTower = null;
    upgradeMenu.classList.add('hidden');
}

upgradeBtn.addEventListener('click', () => {
    if (selectedTower) {
        if (selectedTower.upgrade()) {
            showUpgradeMenu(selectedTower); // Refresh menu
        }
    }
});

closeUpgrade.addEventListener('click', hideUpgradeMenu);

const moneyEl = document.getElementById('money');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');

function initUnitPreviews() {
    document.querySelectorAll('.unit').forEach(u => {
        const type = u.dataset.unit;
        const subCanvas = u.querySelector('.unit-preview');
        const sCtx = subCanvas.getContext('2d');
        
        sCtx.clearRect(0, 0, subCanvas.width, subCanvas.height);
        
        const originalCtx = ctx;
        ctx = sCtx;
        
        // Draw centered in 65x65 canvas
        drawCharacter(32, 50, type, 0.9, false);
        
        ctx = originalCtx;
    });
}

function updateUI() {
    moneyEl.textContent = money;
    livesEl.textContent = lives;
    waveEl.textContent = wave;
    
    // Update upgrade button state if menu is open
    if (selectedTower && !upgradeMenu.classList.contains('hidden')) {
        upgradeBtn.disabled = money < selectedTower.upgradeCost;
        upgradeBtn.style.opacity = money < selectedTower.upgradeCost ? '0.5' : '1';
    }
}

// --- Main Loop ---
function animate() {
    if (frameCount === 0) initUnitPreviews();
    frameCount++;

    // Draw pre-baked map
    ctx.drawImage(mapCanvas, 0, 0);

    if (lives > 0) {
        // Auto-start next wave logic
        if (gameStarted && enemies.length === 0 && !waveInProgress) {
            // Short delay between waves
            setTimeout(startFirstWave, 2000); 
            waveInProgress = true; // Temporary flag to prevent multiple triggers
        }

        // Ghost placement preview
        if (selectedUnitType) {
            const cfg = towerConfigs[selectedUnitType];
            const onPath = isOnPath(mouse.x, mouse.y, 30);
            
            ctx.globalAlpha = 0.35;
            drawCharacter(mouse.x, mouse.y, selectedUnitType, selectedUnitType === 'heavy' ? 1.2 : 1, false);
            
            // Range indicator or restricted area
            ctx.globalAlpha = 0.2;
            ctx.fillStyle = onPath ? '#ff4d4d' : '#ffffff';
            ctx.beginPath();
            if (selectedUnitType === 'farm') {
                ctx.arc(mouse.x, mouse.y, 30, 0, Math.PI * 2);
            } else {
                ctx.arc(mouse.x, mouse.y - 15, cfg.range, 0, Math.PI * 2);
            }
            ctx.fill();
            
            if (onPath) {
                ctx.strokeStyle = '#ff4d4d';
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(mouse.x - 10, mouse.y - 10); ctx.lineTo(mouse.x + 10, mouse.y + 10);
                ctx.moveTo(mouse.x + 10, mouse.y - 10); ctx.lineTo(mouse.x - 10, mouse.y + 10);
                ctx.stroke();
            }
            
            ctx.globalAlpha = 1.0;
        }

        // Updates
        enemies = enemies.filter(e => {
            const alive = e.update();
            if (alive) e.draw();
            return alive;
        });

        towers.forEach(t => {
            t.update();
            t.draw();
        });

        projectiles = projectiles.filter(p => {
            const active = p.update();
            if (active) p.draw();
            return active;
        });
    } else {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#ff4d4d';
        ctx.font = 'bold 64px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('DEFEAT', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Inter';
        ctx.fillStyle = '#fff';
        ctx.fillText('Waves Survived: ' + wave, canvas.width / 2, canvas.height / 2 + 60);
    }

    updateUI();
    requestAnimationFrame(animate);
}

let waveInProgress = false;
function startFirstWave() {
    waveInProgress = true;
    wave++;
    let spawned = 0;
    const totalToSpawn = 5 + wave * 2;
    const interval = setInterval(() => {
        if (lives > 0) {
            enemies.push(new Enemy(50 + wave * 30, 1.5 + wave * 0.1));
            spawned++;
        }
        if (spawned >= totalToSpawn) {
            clearInterval(interval);
            waveInProgress = false;
        }
    }, 800);
}

animate();
