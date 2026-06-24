export default class Platform {
    constructor(x, y, width, height, solid = true, minX = null, maxX = null) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.solid = solid;
        this.moving = minX !== null && maxX !== null;
        this.minX = minX;
        this.maxX = maxX;
        this.direction = 1;
        this.speed = 100;
    }
    
    update(deltaTime) {
        if (this.moving) {
            this.x += this.speed * this.direction * deltaTime;
            if (this.x <= this.minX || this.x + this.width >= this.maxX) {
                this.direction *= -1;
            }
        }
    }
    
    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    
    draw(ctx) {
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Draw texture
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 1;
        for (let i = 0; i < this.width; i += 10) {
            ctx.beginPath();
            ctx.moveTo(this.x + i, this.y);
            ctx.lineTo(this.x + i, this.y + this.height);
            ctx.stroke();
        }
    }
}
