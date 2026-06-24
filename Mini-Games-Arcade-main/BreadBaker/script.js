let kneads = 0;
const targetKneads = 200;
let money = 0;
let gameState = 'KNEADING'; // KNEADING, SLICING, BAKING, DONE

// --- Shop state ---
let clickPower = 1;
let apprenticeCount = 0;
let masterBakerCount = 0;
let hasGoldenKnife = false;
let hasTurboOven = false;
let hasSecondKitchen = false;
let autoKneadInterval = null;
let secondKitchenInterval = null;

const kneadCountDisplay = document.getElementById('knead-count');
const moneyCountDisplay = document.getElementById('money-count');
const statusDisplay = document.getElementById('status');
const doughElement = document.getElementById('dough');
const doughContainer = document.getElementById('dough-container');
const progressBar = document.getElementById('progress-bar');
const toolsContainer = document.getElementById('tools');
const knifePickup = document.getElementById('knife-pickup');
const ovenBtn = document.getElementById('oven-btn');
const resetBtn = document.getElementById('reset-btn');
const sliceElement = document.getElementById('slice');
const sliceTarget = document.getElementById('slice-target');
const sliceCanvas = document.getElementById('slice-canvas');
const ctx = sliceCanvas.getContext('2d');
const ovenContainer = document.getElementById('oven-container');
const ovenModel = document.getElementById('oven');
const knifeCursor = document.getElementById('knife-cursor');
const bakeryContainer = document.querySelector('.bakery-container');

// Slicing state vars
let isSlicingMode = false;
let slicingPoints = 0;
const pointsToSlice = 6; // Just needs a short drag across the box
let lastPoint = null;
let mobileCutInterval = null;

// Dragging state vars
let isDraggingDough = false;
let doughOffsetX = 0;
let doughOffsetY = 0;
let initialDoughX = 0;
let initialDoughY = 0;

// Secret Menu Elements
const secretTrigger = document.getElementById('secret-trigger');
const secretMenu = document.getElementById('secret-menu');
const secretInput = document.getElementById('secret-input');
const applyCodeBtn = document.getElementById('apply-code');
const closeSecretBtn = document.getElementById('close-secret');

console.log("Bread Baker script loaded");

// Use container for more forgiving click area
doughContainer.addEventListener('click', () => {
    if (gameState === 'KNEADING' && kneads < targetKneads) {
        kneads = Math.min(kneads + clickPower, targetKneads);
        updateUI();
        
        if (kneads >= targetKneads) {
            completeKneading();
        }
    }
});

// Secret Menu Logic
secretTrigger.addEventListener('click', () => {
    secretMenu.classList.remove('hidden');
});

// ── SHOP LOGIC ─────────────────────────────────────────────────────────
const shopTrigger = document.getElementById('shop-trigger');
const shopPanel = document.getElementById('shop-panel');
const closeShopBtn = document.getElementById('close-shop');
const shopMoneyDisplay = document.getElementById('shop-money');

shopTrigger.addEventListener('click', () => {
    shopPanel.classList.toggle('hidden');
    updateShopUI();
});
closeShopBtn.addEventListener('click', () => shopPanel.classList.add('hidden'));

const shopCosts = {
    'power-gloves': 50,
    'apprentice': 80,
    'master-baker': 300,
    'golden-knife': 120,
    'turbo-oven': 175,
    'second-kitchen': 600
};

document.querySelectorAll('.shop-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const item = btn.dataset.item;
        const cost = shopCosts[item];
        if (money < cost) return;
        money -= cost;
        moneyCountDisplay.textContent = money;
        applyUpgrade(item);
        updateShopUI();
    });
});

function applyUpgrade(item) {
    if (item === 'power-gloves') {
        if (clickPower < 6) clickPower++;
    } else if (item === 'apprentice') {
        apprenticeCount++;
        startAutoKnead();
    } else if (item === 'master-baker') {
        masterBakerCount++;
        startAutoKnead();
    } else if (item === 'golden-knife') {
        hasGoldenKnife = true;
    } else if (item === 'turbo-oven') {
        hasTurboOven = true;
    } else if (item === 'second-kitchen') {
        hasSecondKitchen = true;
        startSecondKitchen();
    }
}

function startAutoKnead() {
    if (autoKneadInterval) clearInterval(autoKneadInterval);
    const rate = apprenticeCount * 1 + masterBakerCount * 5;
    if (rate <= 0) return;
    autoKneadInterval = setInterval(() => {
        if (gameState === 'KNEADING' && kneads < targetKneads) {
            kneads = Math.min(kneads + rate, targetKneads);
            updateUI();
            if (kneads >= targetKneads) completeKneading();
        }
    }, 1000);
}

function startSecondKitchen() {
    if (secondKitchenInterval) return;
    let kitchenState = 'idle';
    let kitchenTimer = 0;
    secondKitchenInterval = setInterval(() => {
        if (!hasSecondKitchen) return;
        kitchenTimer++;
        if (kitchenTimer >= 30) {
            kitchenTimer = 0;
            money += 100;
            moneyCountDisplay.textContent = money;
            showKitchenNotif();
            updateShopUI();
        }
    }, 1000);
}

function showKitchenNotif() {
    const notif = document.createElement('div');
    notif.textContent = '🏠 Second Kitchen sold a loaf! +$100';
    notif.style.cssText = 'position:fixed;bottom:70px;left:50%;transform:translateX(-50%);background:#4CAF50;color:white;padding:8px 18px;border-radius:20px;font-weight:bold;font-size:0.9rem;z-index:999;animation:fadeInUp 0.4s ease;pointer-events:none;';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2800);
}

function updateShopUI() {
    shopMoneyDisplay.textContent = money;
    document.getElementById('stat-click-power').textContent = clickPower;
    const autoRate = apprenticeCount * 1 + masterBakerCount * 5;
    document.getElementById('stat-auto-rate').textContent = autoRate;
    document.getElementById('owned-power-gloves').textContent = clickPower - 1;
    document.getElementById('owned-apprentice').textContent = apprenticeCount;
    document.getElementById('owned-master-baker').textContent = masterBakerCount;
    document.getElementById('owned-golden-knife-label').textContent = hasGoldenKnife ? '✅ Owned' : 'Not owned';
    document.getElementById('owned-turbo-oven-label').textContent = hasTurboOven ? '✅ Owned' : 'Not owned';
    document.getElementById('owned-second-kitchen-label').textContent = hasSecondKitchen ? '✅ Owned' : 'Not owned';

    document.querySelectorAll('.shop-buy-btn').forEach(btn => {
        const item = btn.dataset.item;
        const cost = shopCosts[item];
        const cantAfford = money < cost;
        const maxed = (item === 'power-gloves' && clickPower >= 6) ||
                       (item === 'golden-knife' && hasGoldenKnife) ||
                       (item === 'turbo-oven' && hasTurboOven) ||
                       (item === 'second-kitchen' && hasSecondKitchen);
        btn.disabled = cantAfford || maxed;
        if (maxed) btn.textContent = 'MAX';
        else btn.textContent = '$' + cost;
    });
}
// ── END SHOP ────────────────────────────────────────────────────────────

closeSecretBtn.addEventListener('click', () => {
    secretMenu.classList.add('hidden');
});

applyCodeBtn.addEventListener('click', () => {
    const code = secretInput.value.trim().toUpperCase();
    if (code === 'KNEADMAX') {
        kneads = targetKneads;
        updateUI();
        completeKneading();
        statusDisplay.textContent = "CHEAT: Kneading complete!";
    } else if (code === 'BAKEOFF') {
        finishGame();
        statusDisplay.textContent = "CHEAT: Bread insta-baked!";
    } else {
        alert("Invalid secret code!");
    }
    secretInput.value = '';
    secretMenu.classList.add('hidden');
});

knifePickup.addEventListener('click', () => {
    if (gameState === 'SLICING') {
        isSlicingMode = true;
        knifeCursor.classList.remove('hidden');
        sliceTarget.classList.remove('hidden');
        sliceCanvas.classList.remove('hidden');
        
        // Match canvas layout size
        sliceCanvas.width = doughElement.offsetWidth;
        sliceCanvas.height = doughElement.offsetHeight;
        
        document.body.classList.add('slicing-cursor');
        statusDisplay.textContent = "Draw a line across the green dashed box using the knife!";
        knifePickup.classList.add('hidden');
    }
});

// ── Mobile: hold finger on slice target to auto-cut (mobile only) ──────────
function isMobile() {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
}

sliceTarget.addEventListener('touchstart', (e) => {
    if (!isSlicingMode || !isMobile()) return;
    e.preventDefault();
    statusDisplay.textContent = "Hold here... cutting! ✂️";
    let progress = 0;
    mobileCutInterval = setInterval(() => {
        progress++;
        // Draw a fake slash line on the canvas
        const cx = sliceCanvas.width / 2;
        const cy = sliceCanvas.height / 2;
        ctx.beginPath();
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.moveTo(cx - 40 + progress * 8, cy - 10);
        ctx.lineTo(cx - 30 + progress * 8, cy + 10);
        ctx.stroke();
        if (progress >= 8) {
            clearInterval(mobileCutInterval);
            mobileCutInterval = null;
            completeSlicing();
        }
    }, 120);
}, { passive: false });

sliceTarget.addEventListener('touchend', () => {
    if (mobileCutInterval) {
        clearInterval(mobileCutInterval);
        mobileCutInterval = null;
        if (isSlicingMode) statusDisplay.textContent = "Keep holding to slice!";
    }
});

sliceTarget.addEventListener('touchcancel', () => {
    if (mobileCutInterval) {
        clearInterval(mobileCutInterval);
        mobileCutInterval = null;
    }
});

// Knife tracking, slicing, and dragging logic
window.addEventListener('mousemove', (e) => {
    if (isSlicingMode) {
        knifeCursor.style.left = e.clientX + 'px';
        knifeCursor.style.top = e.clientY + 'px';
        
        // Detect if mouse is clicking/dragging
        if (e.buttons === 1) { 
            const canvasRect = sliceCanvas.getBoundingClientRect();
            const x = e.clientX - canvasRect.left;
            const y = e.clientY - canvasRect.top;
            
            // Draw on canvas
            if (lastPoint) {
                ctx.beginPath();
                ctx.strokeStyle = '#8b4513';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.moveTo(lastPoint.x, lastPoint.y);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            lastPoint = { x, y };

            // Check for bridge collision with target box
            const targetRect = sliceTarget.getBoundingClientRect();
            if (e.clientX >= targetRect.left && e.clientX <= targetRect.right &&
                e.clientY >= targetRect.top && e.clientY <= targetRect.bottom) {
                
                slicingPoints++;
                if (slicingPoints >= pointsToSlice) {
                    completeSlicing();
                }
            }
        } else {
            lastPoint = null;
        }
    } else if (isDraggingDough) {
        doughElement.style.position = 'fixed';
        doughElement.style.left = (e.clientX - doughOffsetX) + 'px';
        doughElement.style.top = (e.clientY - doughOffsetY) + 'px';
        
        // Check for intersection with oven
        const ovenRect = ovenModel.getBoundingClientRect();
        const doughRect = doughElement.getBoundingClientRect();
        
        if (doughRect.left < ovenRect.right &&
            doughRect.right > ovenRect.left &&
            doughRect.top < ovenRect.bottom &&
            doughRect.bottom > ovenRect.top) {
            ovenModel.style.backgroundColor = '#6d4c41'; // Highlight oven
        } else {
            ovenModel.style.backgroundColor = '#444';
        }
    }
});

window.addEventListener('mouseup', (e) => {
    if (isDraggingDough) {
        const ovenRect = ovenModel.getBoundingClientRect();
        const doughRect = doughElement.getBoundingClientRect();
        
        if (doughRect.left < ovenRect.right &&
            doughRect.right > ovenRect.left &&
            doughRect.top < ovenRect.bottom &&
            doughRect.bottom > ovenRect.top) {
            // Dropped in oven
            isDraggingDough = false;
            doughElement.classList.remove('dragging');
            doughElement.classList.add('hidden'); // Move into oven "inside"
            ovenModel.style.backgroundColor = '#444';
            startBaking();
        } else {
            // Dropped outside, return to start
            isDraggingDough = false;
            doughElement.classList.remove('dragging');
            doughElement.style.position = '';
            doughElement.style.left = '';
            doughElement.style.top = '';
        }
    }
});

doughElement.addEventListener('mousedown', (e) => {
    if (gameState === 'BAKING_PREP') {
        isDraggingDough = true;
        const rect = doughElement.getBoundingClientRect();
        doughOffsetX = e.clientX - rect.left;
        doughOffsetY = e.clientY - rect.top;
        doughElement.classList.add('dragging');
    }
});

function completeSlicing() {
    isSlicingMode = false;
    gameState = 'WAITING_FOR_OVEN';
    knifeCursor.classList.add('hidden');
    sliceTarget.classList.add('hidden');
    sliceCanvas.classList.add('hidden');
    sliceElement.classList.remove('hidden');
    document.body.classList.remove('slicing-cursor');
    
    statusDisplay.textContent = "Bread sliced! Ready for the oven.";
    statusDisplay.style.color = "#2e7d32";
    ovenBtn.disabled = false;

    // Golden Knife: auto-advance to oven immediately
    if (hasGoldenKnife) {
        setTimeout(() => {
            gameState = 'BAKING_PREP';
            ovenContainer.classList.remove('hidden');
            statusDisplay.textContent = "Golden Knife auto-sliced! Drag the bread into the oven.";
            doughElement.classList.add('draggable');
            ovenBtn.classList.add('hidden');
        }, 500);
    }
}

ovenBtn.addEventListener('click', () => {
    if (gameState === 'WAITING_FOR_OVEN') {
        gameState = 'BAKING_PREP';
        ovenContainer.classList.remove('hidden');
        statusDisplay.textContent = "Drag the bread into the oven!";
        doughElement.classList.add('draggable');
        ovenBtn.classList.add('hidden');
    }
});

function updateUI() {
    kneadCountDisplay.textContent = kneads;
    const progressPercentage = (kneads / targetKneads) * 100;
    progressBar.style.width = progressPercentage + '%';
    
    // Change bread color slightly as it gets kneaded
    const lightness = 95 - (progressPercentage / 10);
    doughElement.style.backgroundColor = `hsl(38, 92%, ${lightness}%)`;
}

function completeKneading() {
    gameState = 'SLICING';
    statusDisplay.textContent = "Fully kneaded! Now use the knife to slice the top.";
    statusDisplay.style.color = "#2e7d32";
    doughElement.style.cursor = "default";
    doughElement.style.transform = "scale(1.1)";
    
    // Show tools
    toolsContainer.classList.remove('hidden');
}

function startBaking() {
    gameState = 'DONE';
    ovenContainer.querySelector('p').textContent = "Baking...";
    statusDisplay.textContent = "Baking in the oven...";
    bakeryContainer.classList.add('oven-mode');
    
    const interval = hasTurboOven ? 33 : 100; // 3x faster with turbo oven
    let bakingProgress = 0;
    const bakeInterval = setInterval(() => {
        bakingProgress += 5;
        if (bakingProgress <= 100) {
            const brownness = 90 - (bakingProgress * 0.5);
            doughElement.style.backgroundColor = `hsl(20, 50%, ${brownness}%)`;
        } else {
            clearInterval(bakeInterval);
            finishGame();
        }
    }, interval);
}

function finishGame() {
    doughElement.classList.remove('hidden');
    doughElement.style.position = '';
    doughElement.style.left = '';
    doughElement.style.top = '';
    doughElement.classList.add('baked');
    
    money += 100;
    moneyCountDisplay.textContent = money;
    updateShopUI();
    
    statusDisplay.textContent = "Freshly baked bread! Sold for $100!";
    statusDisplay.style.color = "#ff9800";
    ovenContainer.querySelector('p').textContent = "Done!";
    
    // Change bread shape slightly to look like it rose
    doughElement.style.transform = "scale(1.2) translateY(-10px)";
    
    resetBtn.classList.remove('hidden');
}

resetBtn.addEventListener('click', resetGame);

function resetGame() {
    kneads = 0;
    gameState = 'KNEADING';
    slicingPoints = 0;
    
    // Reset UI
    updateUI();
    statusDisplay.textContent = "Time to knead some dough!";
    statusDisplay.style.color = "";
    doughElement.classList.remove('baked', 'draggable', 'hidden');
    doughElement.style.transform = "";
    doughElement.style.backgroundColor = "";
    doughElement.style.cursor = "";
    
    sliceElement.classList.add('hidden');
    ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    
    ovenContainer.classList.add('hidden');
    ovenContainer.querySelector('p').textContent = "Drag the bread into the oven!";
    
    toolsContainer.classList.add('hidden');
    knifePickup.classList.remove('hidden');
    ovenBtn.classList.remove('hidden');
    ovenBtn.disabled = true;
    resetBtn.classList.add('hidden');
    
    bakeryContainer.classList.remove('oven-mode');

    // Restart auto-knead if workers were bought
    if (apprenticeCount > 0 || masterBakerCount > 0) startAutoKnead();
    updateShopUI();
}
