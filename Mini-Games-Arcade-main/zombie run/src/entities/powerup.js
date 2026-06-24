export default class PowerUp {
    constructor(x, y, type = 'heal') {
        this.x = x;
        this.y = y;
        this.width = 20;
        this.height = 16;
        this.type = type; // 'heal' or 'power'
        this.pulse = 0;
    }

    getBounds() {
        return { x: this.x - this.width / 2, y: this.y - this.height / 2, width: this.width, height: this.height };
    }

    apply(player) {
        if (this.type === 'heal') {
            const amount = Math.floor(player.maxHealth * 0.3);
            if (typeof player.heal === 'function') player.heal(amount);
        } else if (this.type === 'power') {
            if (typeof player.applyPowerUp === 'function') player.applyPowerUp('attackBoost');
        }
    }

    update(deltaTime) {
        this.pulse += deltaTime;
        // If attached to a platform, follow it so the item remains collectible
        if (this.hostPlatform) {
            this.x = this.hostPlatform.x + Math.floor(this.hostPlatform.width / 2);
            this.y = this.hostPlatform.y - 18;
        }
    }

    draw(ctx) {
        const bounds = this.getBounds();
        ctx.save();
        // Small pulsing effect
        const scale = 1 + Math.sin(this.pulse * 6) * 0.08;
        ctx.translate(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        ctx.scale(scale, scale);
        if (this.type === 'heal') {
            ctx.fillStyle = '#00ff88';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-6, -4, 12, 2);
            ctx.fillRect(-1, -7, 2, 14);
        } else {
            ctx.fillStyle = '#ffdd55';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            ctx.fillStyle = '#333333';
            ctx.fillRect(-6, -4, 12, 2);
            ctx.fillRect(-1, -7, 2, 14);
        }
        ctx.restore();
    }
}
