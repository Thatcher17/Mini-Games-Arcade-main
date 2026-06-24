export default class Particle {
    constructor(x, y, velocityX, velocityY, color) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.color = color;
        this.life = 0.5;
        this.size = 4;
        this.gravity = 500;
    }
    
    update(deltaTime) {
        this.velocityY += this.gravity * deltaTime;
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.life -= deltaTime;
    }
    
    draw(ctx) {
        ctx.globalAlpha = Math.max(0, this.life / 0.5);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}
