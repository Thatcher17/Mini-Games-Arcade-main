export default class Bullet {
    constructor(x, y, velocityX, velocityY, damage = 50, owner = 'player') {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.width = 8;
        this.height = 4;
        this.gravity = 0; // Bullets don't fall initially
        this.life = 3; // Max lifetime in seconds
        this.damage = damage;
        this.owner = owner; // 'player' or 'enemy'
    }
    
    update(deltaTime) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        // Meteors fall at constant speed, normal bullets arc
        if (!this.isMeteor) {
            this.velocityY += 200 * deltaTime; // Slight gravity drop
        }
        this.life -= deltaTime;
    }
    
    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    
    draw(ctx) {
        if (this.isMeteor) {
            // Big fiery meteor projectile
            const cx = this.x + this.width / 2;
            const cy = this.y + this.height / 2;
            const r = this.width / 2;

            // Outer glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#ff4400';

            // Main rock body
            ctx.fillStyle = '#555';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Lava cracks
            ctx.strokeStyle = '#ff6600';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.5, cy - r * 0.3);
            ctx.lineTo(cx + r * 0.2, cy + r * 0.1);
            ctx.lineTo(cx + r * 0.5, cy + r * 0.4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cx + r * 0.1, cy - r * 0.5);
            ctx.lineTo(cx - r * 0.15, cy + r * 0.3);
            ctx.stroke();

            // Fiery top trail
            ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.beginPath();
            ctx.moveTo(cx - r * 0.6, cy - r);
            ctx.quadraticCurveTo(cx, cy - r * 2.2, cx + r * 0.6, cy - r);
            ctx.lineTo(cx + r * 0.3, cy - r * 0.5);
            ctx.quadraticCurveTo(cx, cy - r * 1.4, cx - r * 0.3, cy - r * 0.5);
            ctx.fill();

            ctx.shadowBlur = 0;

            // Warning shadow on ground (if close enough)
            if (window.gameInstance) {
                const groundY = window.gameInstance.canvas.height - 40;
                if (this.y < groundY) {
                    const alpha = Math.min(0.4, (this.y + 200) / groundY * 0.4);
                    ctx.fillStyle = 'rgba(255, 0, 0, ' + alpha + ')';
                    ctx.beginPath();
                    ctx.ellipse(cx, groundY, r * 1.2, 6, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            return;
        }

        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Bullet glow
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // Bullet trail effect
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(this.x - this.velocityX * 0.05, this.y - this.velocityY * 0.05, this.width + 4, this.height);
    }
}
