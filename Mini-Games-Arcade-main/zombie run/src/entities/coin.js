export default class Coin {
    constructor(x, y, value = 1) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.value = value;
        this.vy = -200 - Math.random() * 100; // pop up then fall
        this.life = 5.0; // auto despawn after some seconds
    }

    getBounds() {
        return { x: this.x - this.width / 2, y: this.y - this.height / 2, width: this.width, height: this.height };
    }

    update(deltaTime, platforms = []) {
        // simple physics: vy + gravity
        this.vy += 1200 * deltaTime;
        this.y += this.vy * deltaTime;
        
        // Check for platform collisions to stop coins from falling through
        const bounds = this.getBounds();
        for (const platform of platforms) {
            const platBounds = platform.getBounds();
            
            // Check if coin is above platform and falling onto it
            if (bounds.y + bounds.height >= platBounds.y &&
                bounds.y + bounds.height <= platBounds.y + platBounds.height + 10 &&
                bounds.x + bounds.width > platBounds.x &&
                bounds.x < platBounds.x + platBounds.width &&
                this.vy >= 0) {
                // Rest coin on platform
                this.y = platBounds.y - bounds.height / 2;
                this.vy = 0;
                break;
            }
        }
        
        this.life -= deltaTime;
    }

    draw(ctx) {
        const b = this.getBounds();
        ctx.save();
        ctx.translate(b.x + b.width / 2, b.y + b.height / 2);
        // simple coin with shine
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-3, -6);
        ctx.lineTo(3, -6);
        ctx.lineTo(0, -2);
        ctx.fill();
        ctx.restore();
    }
}