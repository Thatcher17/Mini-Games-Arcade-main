import Game from './game.js';
import { loadSaved, saveSaved, saved, updateCoins } from './utils/saveManager.js';
import { showShop } from './ui/shopUI.js';
import { showLocker } from './ui/lockerUI.js';

// Define startGame at module level so inline onclick works
function startGame() {
    const startMenu = document.getElementById('startMenu');
    // Hide start menu & overlays
    startMenu.style.display = 'none';
    document.getElementById('shopModal').style.display = 'none';
    document.getElementById('lockerModal').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';

    // Stop previous instance if present
    if (window.gameInstance) {
        try { window.gameInstance.gameRunning = false; } catch (e) {}
        window.gameInstance = null;
    }

    const game = new Game();
    // Apply saved coins and skin
    game.coins = saved.coins || 0;
    if (game.player) game.player.skin = saved.equippedSkin || 'default';

    window.gameInstance = game;
}

// Expose functions to global scope so inline onclick handlers work reliably
window.startGame = startGame;
window.showShop = showShop;
window.showLocker = showLocker;

window.addEventListener('load', () => {
    loadSaved();

    // Wire menu buttons
    const startMenu = document.getElementById('startMenu');
    const startButton = document.getElementById('startButton');
    const shopBtn = document.getElementById('shopBtn');
    const lockerBtn = document.getElementById('lockerBtn');
    const closeShop = document.getElementById('closeShop');
    const closeLocker = document.getElementById('closeLocker');
    const openShopFromMenu = document.getElementById('openShopFromMenu');
    const openLockerFromMenu = document.getElementById('openLockerFromMenu');
    const retryBtn = document.getElementById('retryBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const gameOverShop = document.getElementById('gameOverShop');

    // Use addEventListener and validate elements exist
    if (shopBtn) shopBtn.addEventListener('click', (e) => { console.log('HUD shop clicked'); showShop(); });
    else console.warn('shopBtn not found');

    if (lockerBtn) lockerBtn.addEventListener('click', (e) => { console.log('HUD locker clicked'); showLocker(); });
    else console.warn('lockerBtn not found');

    if (closeShop) closeShop.addEventListener('click', () => { document.getElementById('shopModal').style.display = 'none'; });
    if (closeLocker) closeLocker.addEventListener('click', () => { document.getElementById('lockerModal').style.display = 'none'; });
    if (openShopFromMenu) openShopFromMenu.addEventListener('click', () => { console.log('Menu shop clicked'); showShop(); });
    if (openLockerFromMenu) openLockerFromMenu.addEventListener('click', () => { console.log('Menu locker clicked'); showLocker(); });
    if (gameOverShop) gameOverShop.addEventListener('click', () => { console.log('Game over shop clicked'); showShop(); });

    if (startButton) startButton.addEventListener('click', () => { console.log('Start pressed'); startGame(); });
    else console.warn('startButton not found');

    if (retryBtn) retryBtn.addEventListener('click', () => { console.log('Retry pressed'); startGame(); });
    if (backToMenuBtn) backToMenuBtn.addEventListener('click', () => {
        console.log('Back to Menu pressed');
        if (window.gameInstance) { window.gameInstance.gameRunning = false; window.gameInstance = null; }
        document.getElementById('gameOver').style.display = 'none';
        startMenu.style.display = 'flex';
    });

    // Show start menu on page load
    startMenu.style.display = 'flex';

    // Show persisted coins in HUD
    const coinsEl = document.getElementById('coins');
    if (coinsEl) coinsEl.textContent = saved.coins;

    // Periodically sync saved coins from game instance
    setInterval(() => {
        if (window.gameInstance) {
            saved.coins = window.gameInstance.coins;
            saveSaved();
            const coinsEl = document.getElementById('coins');
            if (coinsEl) coinsEl.textContent = saved.coins;
        }
    }, 500);

    // Debug: log button clicks
    document.addEventListener('click', (e) => {
        const t = e.target;
        if (!t) return;
        if (t.tagName === 'BUTTON' || t.closest && t.closest('button')) {
            console.log('Button click:', t.id || t.textContent.trim(), t);
        }
    });

    console.log('UI initialized. Use Start to begin.');
});