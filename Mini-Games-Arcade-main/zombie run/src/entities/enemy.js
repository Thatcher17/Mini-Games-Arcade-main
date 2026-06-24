import Bullet from './bullet.js';

export default class Enemy {
    constructor(x, y, type = 'goblin') {
        this.x = x;
        this.y = y;
        this.type = type;
        // set properties per enemy type for easier extension (spider added)
        if (type === 'orc') {
            this.width = 32;
            this.height = 40;
            this.health = 50;
            this.speed = 80;
            this.chaseSpeed = 150;
            this.contactDamage = 8;
            this.color = '#2d5016';
        } else if (type === 'spider') {
            this.width = 40;
            this.height = 28;
            this.health = 120;
            this.speed = 120;
            this.chaseSpeed = 200;
            this.contactDamage = 15;
            this.color = '#6b2b88';
        } else { // goblin default
            this.width = 24;
            this.height = 32;
            this.health = 30;
            this.speed = 100;
            this.chaseSpeed = 120;
            this.contactDamage = 5;
            this.color = '#4CAF50';
        }
        this.maxHealth = this.health;
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 1200;
        this.onGround = false;
        
        this.direction = 1;
        this.patrolRange = 150;
        this.patrolStart = x;
        this.sightRange = 200;
        this.chasing = false;
        
        this.attackRange = 40;
        this.attackCooldown = 1;
        this.attackCooldownTime = 0;
        this.attacking = false;
        this.attackTime = 0; 
    }
    
    update(deltaTime, player, platforms) {
        // Apply gravity
        this.velocityY += this.gravity * deltaTime;
        
        // Determine behavior
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        this.chasing = distToPlayer < this.sightRange;
        
        if (this.chasing) {
            // Chase the player
            if (Math.abs(player.x - this.x) > 10) {
                this.velocityX = this.chaseSpeed * Math.sign(player.x - this.x);
                this.direction = Math.sign(player.x - this.x);
            }
            
            // Try to jump towards player
            if (this.onGround && player.y < this.y - 20) {
                this.velocityY = -400;
            }
            
            // Attack if close
            if (distToPlayer < this.attackRange && this.attackCooldownTime <= 0) {
                this.attacking = true;
                this.attackTime = 0.2;
                this.attackCooldownTime = this.attackCooldown;
            }
        } else {
            // Patrol
            if (this.x < this.patrolStart - this.patrolRange || this.x > this.patrolStart + this.patrolRange) {
                this.direction *= -1;
            }
            this.velocityX = this.speed * this.direction;
        }
        
        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Platform collision
        this.onGround = false;
        platforms.forEach(platform => {
            const bounds = this.getBounds();
            const platformBounds = platform.getBounds();
            
            if (this.isCollidingWithRect(bounds, platformBounds)) {
                if (this.velocityY >= 0 && bounds.y + bounds.height - this.velocityY * deltaTime <= platformBounds.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                }
            }
        });
        
        // Boundary
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 960) this.x = 960 - this.width;
        
        // Vertical boundary - prevent falling through floor
        const groundLevel = window.gameInstance ? window.gameInstance.canvas.height - 40 : 600;
        if (this.y + this.height > groundLevel) {
            this.y = groundLevel - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }
        
        // Update cooldowns
        if (this.attackCooldownTime > 0) {
            this.attackCooldownTime -= deltaTime;
        }
        if (this.attacking) {
            this.attackTime -= deltaTime;
            if (this.attackTime <= 0) {
                this.attacking = false;
            }
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
    }
    
    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    
    isCollidingWithRect(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    draw(ctx) {
        const isGoblin = this.type === 'goblin';
        const isSpider = this.type === 'spider';
        
        if (isSpider) {
            // Spider body (ellipse) and animated legs
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.ellipse(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, this.height / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // animated legs: 4 on each side
            ctx.strokeStyle = '#2b1b3b';
            ctx.lineWidth = 2;
            const t = Date.now() * 0.004;
            for (let side = -1; side <= 1; side += 2) {
                for (let i = 0; i < 4; i++) {
                    ctx.beginPath();
                    const lx = this.x + this.width / 2;
                    const ly = this.y + this.height / 2 + (i - 1.5) * 4;
                    const angle = Math.sin(t + i) * 0.6;
                    const legLen = 18 + i * 2;
                    ctx.moveTo(lx, ly);
                    ctx.lineTo(lx + Math.cos(angle) * legLen * side, ly + Math.sin(angle) * legLen);
                    ctx.stroke();
                }
            }
            
            // Multiple small eyes - glow when chasing
            ctx.fillStyle = this.chasing ? '#ff4444' : '#000';
            ctx.fillRect(this.x + 8, this.y + 2, 2, 2);
            ctx.fillRect(this.x + 12, this.y + 1, 2, 2);
            ctx.fillRect(this.x + this.width - 14, this.y + 2, 2, 2);
            ctx.fillRect(this.x + this.width - 10, this.y + 1, 2, 2);
            
            // Health bar (compact)
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(this.x, this.y - 10, this.width, 4);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x, this.y - 10, this.width * (this.health / this.maxHealth), 4);
            
            // Attack indicator
            if (this.attacking) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30, 0, Math.PI * 2);
                ctx.stroke();
            }
            return;
        }
        
        // BODY
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Armor texture
        ctx.fillStyle = this.color === '#4CAF50' ? '#3a8c2a' : '#1a3a0c';
        if (isGoblin) {
            ctx.fillRect(this.x + 4, this.y + 4, 6, 8);
            ctx.fillRect(this.x + 14, this.y + 4, 6, 8);
            ctx.fillRect(this.x + 6, this.y + 10, 12, 3);
        } else {
            ctx.fillRect(this.x + 6, this.y + 5, 8, 12);
            ctx.fillRect(this.x + 8, this.y + 8, 16, 4);
        }
        
        // Head
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 4, this.y - 10, this.width - 8, 12);
        
        // Head details
        ctx.fillStyle = this.color === '#4CAF50' ? '#3a8c2a' : '#0a3a0c';
        ctx.fillRect(this.x + 5, this.y - 8, 6, 4);
        ctx.fillRect(this.x + this.width - 11, this.y - 8, 6, 4);
        
        // Eyes - glow when chasing
        ctx.fillStyle = this.chasing ? '#ff0000' : '#000';
        ctx.fillRect(this.x + 6, this.y - 7, 3, 3);
        ctx.fillRect(this.x + this.width - 9, this.y - 7, 3, 3);
        
        // Eye shine when chasing
        if (this.chasing) {
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(this.x + 7, this.y - 6, 1, 1);
            ctx.fillRect(this.x + this.width - 8, this.y - 6, 1, 1);
        }
        
        // Nose
        ctx.fillStyle = '#000';
        if (isGoblin) {
            ctx.fillRect(this.x + 10, this.y - 4, 2, 2);
        } else {
            ctx.fillRect(this.x + this.width / 2 - 1, this.y - 3, 2, 2);
        }
        
        // Fangs/teeth
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x + 8, this.y, 2, 2);
        ctx.fillRect(this.x + this.width - 10, this.y, 2, 2);
        
        // Health bar
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - 15, this.width, 3);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - 15, this.width * (this.health / this.maxHealth), 3);
        
        // Attack indicator
        if (this.attacking) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 25, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

export class Boss extends Enemy {
    constructor(x, y) {
        super(x, y, 'orc');
        this.width = 100; // Bigger boss
        this.height = 100;
        this.health = 1125; // Reduced health (25% nerf from 1500)
        this.maxHealth = 1125;
        this.speed = 80;
        this.color = '#8b0000'; // Dark red
        this.isBoss = true;
        this.sightRange = 1200; // Increased range
        this.chaseSpeed = 160; 
        this.attackRange = 80;
        this.attackCooldown = 0.8; // Faster attacks
        this.attackPattern = 0;
        this.patrolRange = 200;
        this.phaseHealth = 562; // Update phase transition to half health
        this.phase2 = false;
        this.contactDamage = 15; // Fair contact damage for a boss
        
        // Sky projectile logic
        this.skyAttackTimer = 0;
        this.skyAttackCooldown = 4.0; // Seconds between sky drops
        
        // Spawn/Arrival logic
        this.spawnTimer = 3.0;
        this.active = false;
    }
    
    update(deltaTime, player, platforms) {
        if (this.spawnTimer > 0) {
            this.spawnTimer -= deltaTime;
            
            if (this.spawnTimer <= 0) {
                this.active = true;
                // Move boss to ground level if it was floating
                this.y = window.gameInstance.canvas.height - 40 - this.height;
            }
            return;
        }

        if (!this.active) return;

        // Phase 2 at half health
        if (this.health <= this.phaseHealth && !this.phase2) {
            this.phase2 = true;
            this.speed = 120;
            this.chaseSpeed = 200;
            this.color = '#ff0000';
            this.skyAttackCooldown = 2.5; // Slightly more frequent drops in P2
        }
        
        // Sky attack
        this.skyAttackTimer += deltaTime;
        if (this.skyAttackTimer >= this.skyAttackCooldown) {
            this.skyAttackTimer = 0;
            this.dropProjectiles(player);
        }

        // Apply gravity
        this.velocityY += this.gravity * deltaTime;
        
        // Determine behavior
        // Rest of behavior follows...
        const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
        this.chasing = distToPlayer < this.sightRange;
        
        if (this.chasing) {
            // Chase with pattern
            this.attackPattern += deltaTime;
            
            // Chase the player
            if (Math.abs(player.x - this.x) > 10) {
                this.velocityX = this.chaseSpeed * Math.sign(player.x - this.x);
                this.direction = Math.sign(player.x - this.x);
            }
            
            // Jump pattern
            if (this.onGround && this.attackPattern % 5 < 0.5) {
                this.velocityY = -450;
            }
            
            // Attack pattern
            if (distToPlayer < this.attackRange && this.attackCooldownTime <= 0) {
                this.attacking = true;
                this.attackTime = 0.4;
                this.attackCooldownTime = this.attackCooldown;

                // Throw projectile towards player
                if (window.gameInstance) {
                    const bx = this.x + this.width / 2;
                    const by = this.y + this.height / 2;
                    const dx = player.x - bx;
                    const dy = player.y - by;
                    const mag = Math.hypot(dx, dy) || 1;
                    const speed = this.phase2 ? 500 : 380;
                    const vx = (dx / mag) * speed;
                    const vy = (dy / mag) * speed;
                    // enemy-owned bullet
                    window.gameInstance.bullets.push(new Bullet(bx, by, vx, vy, 25, 'enemy'));
                }
            }
        } else {
            // Patrol
            if (this.x < this.patrolStart - this.patrolRange || this.x > this.patrolStart + this.patrolRange) {
                this.direction *= -1;
            }
            this.velocityX = this.speed * this.direction;
        }
        
        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        
        // Platform collision
        this.onGround = false;
        platforms.forEach(platform => {
            const bounds = this.getBounds();
            const platformBounds = platform.getBounds();
            
            if (this.isCollidingWithRect(bounds, platformBounds)) {
                if (this.velocityY >= 0 && bounds.y + bounds.height - this.velocityY * deltaTime <= platformBounds.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                }
            }
        });
        
        // Boundary
        const mapWidth = window.gameInstance ? window.gameInstance.mapWidth : 960;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > mapWidth) this.x = mapWidth - this.width;
        
        // Vertical boundary - prevent falling through floor
        const groundLevel = window.gameInstance ? window.gameInstance.canvas.height - 40 : 600;
        if (this.y + this.height > groundLevel) {
            this.y = groundLevel - this.height;
            this.velocityY = 0;
            this.onGround = true;
        }
        
        // Update cooldowns
        if (this.attackCooldownTime > 0) {
            this.attackCooldownTime -= deltaTime;
        }
        if (this.attacking) {
            this.attackTime -= deltaTime;
            if (this.attackTime <= 0) {
                this.attacking = false;
            }
        }
    }
    
    dropProjectiles(player) {
        if (!window.gameInstance) return;
        
        // Slow, massive projectiles — few but lethal
        const count = this.phase2 ? 3 : 2;
        for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() - 0.5) * 400;
            const bx = player.x + offsetX;
            const by = -80 - (Math.random() * 60);
            const vy = 120 + Math.random() * 40; // Very slow fall
            const damage = 600; // Still one-hit kill (Player HP is 500)
            
            const b = new Bullet(bx, by, 0, vy, damage, 'enemy');
            b.width = 40;
            b.height = 40;
            b.isMeteor = true; // Flag for special rendering
            b.life = 8; // Longer life since they fall slowly
            window.gameInstance.bullets.push(b);
        }
    }

    draw(ctx) {
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;

        // Arrival effect / Spawn timer indicator
        if (this.spawnTimer > 0) {
            const progress = 1 - (this.spawnTimer / 3);
            // Pulsing warning circle
            ctx.fillStyle = 'rgba(255, 0, 0, ' + (0.15 + progress * 0.35) + ')';
            ctx.beginPath();
            ctx.arc(cx, cy, 120 * (1 - progress * 0.6), 0, Math.PI * 2);
            ctx.fill();
            // Warning ring
            ctx.strokeStyle = 'rgba(255, 60, 0, ' + (0.5 + Math.sin(Date.now() / 150) * 0.3) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 80, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.fillStyle = '#ff3333';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('WARNING', cx, this.y - 60);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 18px Arial';
            ctx.fillText('BOSS IN ' + Math.ceil(this.spawnTimer), cx, this.y - 35);
            return;
        }

        // --- BOSS MODEL ---
        const w = this.width;
        const h = this.height;
        const bx = this.x;
        const by = this.y;

        // Phase 2 glow
        if (this.phase2) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = '#ff2200';
        }

        // Body — armored torso
        ctx.fillStyle = this.color;
        ctx.fillRect(bx + 10, by + 25, w - 20, h - 30);
        // Armor plate highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(bx + 14, by + 28, w - 28, 20);

        // Shoulder pads
        ctx.fillStyle = this.phase2 ? '#cc0000' : '#5a0000';
        ctx.beginPath();
        ctx.ellipse(bx + 8, by + 30, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + w - 8, by + 30, 14, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // Spikes on shoulders
        ctx.fillStyle = '#aaa';
        ctx.beginPath();
        ctx.moveTo(bx - 2, by + 30);
        ctx.lineTo(bx - 10, by + 15);
        ctx.lineTo(bx + 6, by + 25);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + w + 2, by + 30);
        ctx.lineTo(bx + w + 10, by + 15);
        ctx.lineTo(bx + w - 6, by + 25);
        ctx.fill();

        // Head
        ctx.fillStyle = this.phase2 ? '#aa0000' : '#6b0000';
        const headW = 40;
        const headH = 30;
        const headX = bx + (w - headW) / 2;
        const headY = by - 5;
        ctx.fillRect(headX, headY, headW, headH);

        // Horns
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(headX + 4, headY + 4);
        ctx.lineTo(headX - 12, headY - 22);
        ctx.lineTo(headX + 12, headY);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(headX + headW - 4, headY + 4);
        ctx.lineTo(headX + headW + 12, headY - 22);
        ctx.lineTo(headX + headW - 12, headY);
        ctx.fill();

        // Eyes — glowing
        const eyeGlow = this.phase2 ? '#ff4400' : '#ffcc00';
        ctx.fillStyle = eyeGlow;
        ctx.shadowBlur = 8;
        ctx.shadowColor = eyeGlow;
        ctx.fillRect(headX + 8, headY + 12, 8, 6);
        ctx.fillRect(headX + headW - 16, headY + 12, 8, 6);
        // Pupil
        ctx.fillStyle = '#000';
        ctx.fillRect(headX + 10, headY + 14, 4, 3);
        ctx.fillRect(headX + headW - 14, headY + 14, 4, 3);
        ctx.shadowBlur = 0;

        // Mouth / jaw scar
        ctx.strokeStyle = '#330000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(headX + 12, headY + headH - 4);
        ctx.lineTo(headX + headW - 12, headY + headH - 4);
        ctx.stroke();

        // Belt / waist detail
        ctx.fillStyle = '#444';
        ctx.fillRect(bx + 12, by + h - 30, w - 24, 6);
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(cx - 5, by + h - 31, 10, 8); // Belt buckle

        // Legs
        ctx.fillStyle = this.phase2 ? '#880000' : '#4a0000';
        ctx.fillRect(bx + 18, by + h - 24, 22, 24);
        ctx.fillRect(bx + w - 40, by + h - 24, 22, 24);
        // Boots
        ctx.fillStyle = '#222';
        ctx.fillRect(bx + 16, by + h - 6, 26, 6);
        ctx.fillRect(bx + w - 42, by + h - 6, 26, 6);

        // Arms
        ctx.fillStyle = this.phase2 ? '#990000' : '#5a0000';
        ctx.fillRect(bx - 2, by + 38, 14, 35);
        ctx.fillRect(bx + w - 12, by + 38, 14, 35);
        // Fists
        ctx.fillStyle = '#333';
        ctx.fillRect(bx - 4, by + 70, 16, 12);
        ctx.fillRect(bx + w - 12, by + 70, 16, 12);

        ctx.shadowBlur = 0;

        // --- HEALTH BAR ---
        const barY = by - 35;
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(bx - 5, barY, w + 10, 12);
        // Red bg
        ctx.fillStyle = '#880000';
        ctx.fillRect(bx - 4, barY + 1, w + 8, 10);
        // Green fill
        const hpRatio = this.health / this.maxHealth;
        const barColor = hpRatio > 0.5 ? '#00cc00' : hpRatio > 0.25 ? '#ffaa00' : '#ff0000';
        ctx.fillStyle = barColor;
        ctx.fillRect(bx - 4, barY + 1, (w + 8) * hpRatio, 10);
        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx - 5, barY, w + 10, 12);

        // Boss name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('COLOSSUS PRIME', cx, barY - 6);
        
        // Attack indicator
        if (this.attacking) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 55, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}
