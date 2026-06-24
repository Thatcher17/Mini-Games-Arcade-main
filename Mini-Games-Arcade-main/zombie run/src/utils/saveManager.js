// Game state and persistence management

export let saved = {
    coins: 0,
    purchasedSkins: ['default'],
    equippedSkin: 'default',
    checkpointLevel: 1
};

export function loadSaved() {
    try {
        const s = JSON.parse(localStorage.getItem('gameSave') || '{}');
        if (typeof s.coins === 'number') saved.coins = s.coins;
        if (Array.isArray(s.purchasedSkins)) saved.purchasedSkins = s.purchasedSkins;
        if (s.equippedSkin) saved.equippedSkin = s.equippedSkin;
        if (typeof s.checkpointLevel === 'number') saved.checkpointLevel = s.checkpointLevel;
    } catch (e) { /* ignore */ }
}

export function saveSaved() {
    try { localStorage.setItem('gameSave', JSON.stringify(saved)); } catch (e) {}
}

export function updateCoins(amount) {
    saved.coins = amount;
    saveSaved();
    const coinsEl = document.getElementById('coins');
    if (coinsEl) coinsEl.textContent = saved.coins;
}

export default { saved, loadSaved, saveSaved, updateCoins };
