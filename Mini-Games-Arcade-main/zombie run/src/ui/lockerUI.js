// Locker UI component

import { SKINS } from '../config/skinsConfig.js';
import { saved, saveSaved } from '../utils/saveManager.js';
import Player from '../entities/player.js';

export function renderLocker() {
    const grid = document.getElementById('lockerList');
    const previewName = document.getElementById('lockerPreviewName');
    const previewCanvas = document.getElementById('lockerPreviewCanvas');
    
    grid.innerHTML = '';
    saved.purchasedSkins.forEach(id => {
        const s = SKINS.find(x => x.id === id) || { id, name: id };
        const card = document.createElement('div');
        card.className = 'skinCard';
        card.dataset.id = s.id;
        
        const thumb = document.createElement('div');
        thumb.className = 'skinThumb';
        // thumb.textContent = s.name.charAt(0).toUpperCase();
        const thumbCvs = document.createElement('canvas');
        thumbCvs.width = 40; thumbCvs.height = 40;
        const thumbCtx = thumbCvs.getContext('2d');
        Player.drawStandalone(thumbCtx, 20 - 10, 10, s.id, { showHealth: false, scale: 0.8 });
        thumb.appendChild(thumbCvs);
        
        const name = document.createElement('div');
        name.textContent = s.name;
        name.style.fontSize = '13px';
        name.style.marginTop = '6px';
        
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = saved.equippedSkin === s.id ? 'Equipped' : 'Equip';
        btn.disabled = saved.equippedSkin === s.id;
        btn.style.marginTop = '8px';
        btn.onclick = () => { saved.equippedSkin = s.id; saveSaved(); if (window.gameInstance && window.gameInstance.player) window.gameInstance.player.skin = s.id; renderLocker(); };
        
        card.appendChild(thumb);
        card.appendChild(name);
        card.appendChild(btn);
        
        card.addEventListener('mouseenter', () => {
            previewName.textContent = s.name;
            previewCanvas.innerHTML = '';
            const cvs = document.createElement('canvas');
            cvs.width = 200;
            cvs.height = 140;
            previewCanvas.appendChild(cvs);
            const ctx = cvs.getContext('2d');
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, cvs.width, cvs.height);
            
            Player.drawStandalone(ctx, 100 - 24, 60, s.id, { 
                scale: 2, 
                showHealth: false,
                weapon: 'gun'
            });
        });
        
        grid.appendChild(card);
    });
    
    document.getElementById('lockerModal').style.display = 'flex';
}

export function showLocker() {
    renderLocker();
}

export default { renderLocker, showLocker };
