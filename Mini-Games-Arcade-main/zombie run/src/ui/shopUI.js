// Shop UI component

import { SKINS } from '../config/skinsConfig.js';
import { saved, saveSaved } from '../utils/saveManager.js';
import { playBeep } from '../utils/audio.js';
import Player from '../entities/player.js';

export function renderShop(selectedId) {
    const grid = document.getElementById('shopGrid');
    const previewName = document.getElementById('previewName');
    const previewRarity = document.getElementById('previewRarity');
    const previewDesc = document.getElementById('previewDesc');
    const previewCanvas = document.getElementById('previewCanvas');
    const buyButton = document.getElementById('buyButton');
    const equipButton = document.getElementById('equipButton');

    grid.innerHTML = '';
    
    // Group skins by rarity
    const rarityOrder = ['common', 'uncommon', 'rare', 'legendary'];
    const grouped = {};
    rarityOrder.forEach(r => grouped[r] = []);
    SKINS.forEach(s => grouped[s.rarity].push(s));
    
    // Render each rarity group
    rarityOrder.forEach(rarityName => {
        const skinsInGroup = grouped[rarityName];
        if (skinsInGroup.length === 0) return;
        
        // Rarity header
        const header = document.createElement('div');
        header.style.cssText = 'grid-column: 1 / -1; font-size: 18px; font-weight: bold; color: #fff; margin-top: 12px; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 2px solid #444;';
        const rarityLabel = document.createElement('span');
        rarityLabel.className = `rarity ${rarityName}`;
        rarityLabel.textContent = rarityName.toUpperCase();
        header.appendChild(rarityLabel);
        grid.appendChild(header);
        
        // Render skins in this rarity
        skinsInGroup.forEach(s => {
            const card = document.createElement('div');
            card.className = 'skinCard';
            card.dataset.id = s.id;

            const thumb = document.createElement('div');
            thumb.className = 'skinThumb';
            const thumbCvs = document.createElement('canvas');
            thumbCvs.width = 40; thumbCvs.height = 40;
            const thumbCtx = thumbCvs.getContext('2d');
            Player.drawStandalone(thumbCtx, 20 - 10, 10, s.id, { showHealth: false, scale: 0.8 });
            thumb.appendChild(thumbCvs);

            const title = document.createElement('div');
            title.textContent = s.name;
            title.style.fontSize = '13px';
            title.style.marginTop = '6px';

            const cost = document.createElement('div');
            cost.style.fontSize = '12px';
            cost.style.color = '#ccc';
            cost.textContent = `${s.cost} coins`;

            card.appendChild(thumb);
            card.appendChild(title);
            card.appendChild(cost);

            card.addEventListener('click', () => {
                playBeep(660, 0.06);
                renderShop(s.id);
            });

            if (selectedId === s.id) card.style.borderColor = '#ffb703';
            grid.appendChild(card);
        });
    });

    // Populate preview
    const sel = SKINS.find(x => x.id === selectedId) || SKINS[0];
    if (sel) {
        previewName.textContent = sel.name;
        previewRarity.innerHTML = `<span class="rarity ${sel.rarity}">${sel.rarity.toUpperCase()}</span>`;
        previewDesc.textContent = sel.desc + `\nCost: ${sel.cost} coins`;

        previewCanvas.innerHTML = '';
        const cvs = document.createElement('canvas');
        cvs.width = 200; cvs.height = 140;
        previewCanvas.appendChild(cvs);
        const ctx = cvs.getContext('2d');
        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        
        // Use the new standalone renderer
        Player.drawStandalone(ctx, 100 - 24, 60, sel.id, { 
            scale: 2, 
            showHealth: false,
            weapon: 'gun'
        });

        const owned = saved.purchasedSkins.includes(sel.id);
        buyButton.style.display = owned ? 'none' : 'inline-block';
        equipButton.style.display = owned ? 'inline-block' : 'none';
        equipButton.disabled = saved.equippedSkin === sel.id;

        buyButton.onclick = () => {
            const available = (window.gameInstance ? window.gameInstance.coins : saved.coins) || 0;
            if (available < sel.cost) { alert('Not enough coins'); return; }
            const confirmText = document.getElementById('confirmText');
            confirmText.textContent = `Buy ${sel.name} for ${sel.cost} coins? (~${sel.kills} kills)`;
            document.getElementById('confirmModal').style.display = 'flex';
            const yes = document.getElementById('confirmYes');
            const no = document.getElementById('confirmNo');
            const cleanup = () => { yes.onclick = null; no.onclick = null; document.getElementById('confirmModal').style.display = 'none'; };
            yes.onclick = () => {
                if (window.gameInstance) window.gameInstance.coins -= sel.cost;
                saved.coins = Math.max(0, (window.gameInstance ? window.gameInstance.coins : saved.coins) - sel.cost);
                saved.purchasedSkins.push(sel.id);
                saveSaved();
                playBeep(1100, 0.08);
                const card = document.querySelector(`.skinCard[data-id="${sel.id}"]`);
                if (card) { card.classList.add('purchasedAnim'); setTimeout(()=>card.classList.remove('purchasedAnim'), 500); }
                cleanup();
                renderShop(sel.id);
            };
            no.onclick = () => { playBeep(440, 0.06); cleanup(); };
        };

        equipButton.onclick = () => {
            saved.equippedSkin = sel.id;
            if (window.gameInstance && window.gameInstance.player) window.gameInstance.player.skin = sel.id;
            saveSaved();
            playBeep(1200, 0.06);
            renderShop(sel.id);
        };
    }

    document.getElementById('shopModal').style.display = 'flex';
}

export function showShop() {
    renderShop();
}

export default { renderShop, showShop };
