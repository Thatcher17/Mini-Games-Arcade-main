import Bullet from './bullet.js';

export default class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 32;
        this.velocityX = 0;
        this.velocityY = 0;
        // Increased default health to make the player less fragile
        this.health = 500;
        this.maxHealth = 500;
        this.speed = 300;
        this.jumpPower = 500;
        this.gravity = 1200;

        this.onGround = false;
        this.onWall = false;
        this.wallSide = null;
        this.wallSlideTime = 0;
        this.airTime = 0;

        this.attacking = false;
        this.attackTime = 0;
        this.attackDuration = 0.3;
        this.attackRange = 40;
        this.attackCooldown = 0.5;
        this.attackCooldownTime = 0;

        this.direction = 1; // 1 = right, -1 = left
        this.weapon = 'knife'; // 'knife' or 'gun'
        this.skin = 'default'; // skin id to use for rendering
        // NOTE: skin colors are defined in Player.skins static map

        // Power-up related fields
        this.attackMultiplier = 1; // multiplies attack damage
        this.powerTimer = 0; // remaining time for active power-up
        this.powerDuration = 10; // seconds

        // New properties for requested features
        this.canDoubleJump = false;
        this.isDoubleJumping = false;
        this.flipAngle = 0; // for the jump flip animation
        this.fallThroughTimer = 0;
        this.isFallingThrough = false;
        this.fallThroughCooldown = 0;
    }

    // Define available skins (id -> color keys)
    static skins = {
        default: {
            primary: '#e63946',
            accent: '#a71930',
            trim: '#ffb703',
            belt: '#2a2a2a',
            pants: '#3a3a3a',
            boot: '#1a1a1a',
            skinTone: '#ffcc99',
            skinOutline: '#cc9966',
            helmet: '#4a4a4a',
            helmetShade: '#666666'
        },
        steel: {
            primary: '#2b6da3',
            accent: '#1f4b6b',
            trim: '#d1e7ff',
            belt: '#1f2933',
            pants: '#213547',
            boot: '#0f1720',
            skinTone: '#ffd9b3',
            skinOutline: '#cc9966',
            helmet: '#2b2b2b',
            helmetShade: '#111111'
        },
        gold: {
            primary: '#ff9f1c',
            accent: '#cc7a00',
            trim: '#fff1c1',
            belt: '#3a2a1a',
            pants: '#5a4a3a',
            boot: '#3b2b1a',
            skinTone: '#ffd9b3',
            skinOutline: '#cc9966',
            helmet: '#7a5a1a',
            helmetShade: '#5a3a0a'
        },
        skeleton: {
            primary: '#ffffff',
            accent: '#dddddd',
            trim: '#bbbbbb',
            belt: '#2a2a2a',
            pants: '#bbbbbb',
            boot: '#888888',
            skinTone: '#f6f6f6',
            skinOutline: '#999999',
            helmet: '#ffffff',
            helmetShade: '#e0e0e0'
        },
        ninja: {
            primary: '#0b0b0b',
            accent: '#111111',
            trim: '#666666',
            belt: '#0b0b0b',
            pants: '#0e0e0e',
            boot: '#050505',
            skinTone: '#d1ad93',
            skinOutline: '#222222',
            helmet: '#0b0b0b',
            helmetShade: '#000000'
        },
        army: {
            primary: '#6b8f4a',
            accent: '#445a2a',
            trim: '#a8b98b',
            belt: '#2a2a2a',
            pants: '#3f5b39',
            boot: '#2f3f2b',
            skinTone: '#f0d5b2',
            skinOutline: '#9b8a6f',
            helmet: '#3b4b2b',
            helmetShade: '#223322'
        },
        frost: {
            primary: '#a2d2ff',
            accent: '#4895ef',
            trim: '#ffffff',
            belt: '#1e6091',
            pants: '#bde0fe',
            boot: '#184e77',
            skinTone: '#e0fbfc',
            skinOutline: '#98c1d9',
            helmet: '#4ea8de',
            helmetShade: '#64dfdf'
        },
        plasma: {
            primary: '#7209b7',
            accent: '#3f37c9',
            trim: '#4cc9f0',
            belt: '#480ca8',
            pants: '#560bad',
            boot: '#3a0ca3',
            skinTone: '#caf0f8',
            skinOutline: '#48cae4',
            helmet: '#b5179e',
            helmetShade: '#f72585'
        },
        void: {
            primary: '#10002b',
            accent: '#240046',
            trim: '#9d4edd',
            belt: '#3c096c',
            pants: '#5a189a',
            boot: '#10002b',
            skinTone: '#e0aaff',
            skinOutline: '#7b2cbf',
            helmet: '#3c096c',
            helmetShade: '#10002b'
        }
    };

    update(deltaTime, keys, platforms) {
        // Horizontal movement
        this.velocityX = 0;
        if (keys['a']) {
            this.velocityX = -this.speed;
            this.direction = -1;
        }
        if (keys['d']) {
            this.velocityX = this.speed;
            this.direction = 1;
        }

        // Apply gravity
        this.velocityY += this.gravity * deltaTime;

        // Update position
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Platform collision
        this.onGround = false;
        this.onWall = false;

        // Fall through timer logic
        if (keys['s'] && this.onGround) {
            this.fallThroughTimer += deltaTime;
            if (this.fallThroughTimer >= 3.0) {
                this.isFallingThrough = true;
                this.fallThroughCooldown = 0.5; // stop colliding for a moment
                this.fallThroughTimer = 0;
            }
        } else {
            this.fallThroughTimer = 0;
        }

        if (this.fallThroughCooldown > 0) {
            this.fallThroughCooldown -= deltaTime;
            if (this.fallThroughCooldown <= 0) {
                this.isFallingThrough = false;
            }
        }
        
        platforms.forEach(platform => {
            const bounds = this.getBounds();
            const platformBounds = platform.getBounds();
            
            // Check if colliding and not falling through
            if (!this.isFallingThrough && this.isCollidingWithRect(bounds, platformBounds)) {
                // Coming from above
                if (this.velocityY >= 0 && bounds.y + bounds.height - this.velocityY * deltaTime <= platformBounds.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                    this.airTime = 0;
                    this.isDoubleJumping = false;
                    this.flipAngle = 0;
                }
                // Only treat as solid if platform.solid is true or not specified
                // Coming from below
                else if (platform.solid !== false && this.velocityY < 0 && bounds.y >= platformBounds.y + platformBounds.height) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
                // Wall collision - left
                else if (platform.solid !== false && this.velocityX > 0 && bounds.x + bounds.width - this.velocityX * deltaTime <= platformBounds.x) {
                    this.x = platform.x - this.width;
                    this.onWall = true;
                    this.wallSide = 'left';
                    this.isDoubleJumping = false;
                    this.flipAngle = 0;
                }
                // Wall collision - right
                else if (platform.solid !== false && this.velocityX < 0 && bounds.x >= platformBounds.x + platformBounds.width) {
                    this.x = platform.x + platform.width;
                    this.onWall = true;
                    this.wallSide = 'right';
                    this.isDoubleJumping = false;
                    this.flipAngle = 0;
                }
            }
        });
        
        // Wall slide
        if (this.onWall && !this.onGround) {
            this.velocityY = Math.max(this.velocityY, -100); // Slow fall on wall
            this.wallSlideTime += deltaTime;
        } else {
            this.wallSlideTime = 0;
        }
        
        // Track air time
        if (!this.onGround) {
            this.airTime += deltaTime;
        }
        
        // Boundary collision
        const mapWidth = window.gameInstance ? window.gameInstance.mapWidth : 960;
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > mapWidth) this.x = mapWidth - this.width;
        
        // Update attack cooldown
        if (this.attackCooldownTime > 0) {
            this.attackCooldownTime -= deltaTime;
        }
        
        // Update attack state
        if (this.attacking) {
            this.attackTime -= deltaTime;
            if (this.attackTime <= 0) {
                this.attacking = false;
                this.attackCooldownTime = this.attackCooldown;
            }
        }

        // Power-up timer
        if (this.powerTimer > 0) {
            this.powerTimer -= deltaTime;
            if (this.powerTimer <= 0) {
                // Reset multiplier
                this.attackMultiplier = 1;
                this.powerTimer = 0;
            }
        }

        // Jump flip animation
        if (this.isDoubleJumping) {
            const flipSpeed = Math.PI * 4; // 2 full rotations per jump duration roughly
            this.flipAngle += flipSpeed * deltaTime;
            if (this.flipAngle >= Math.PI * 2 * 2) {
                // Keep it at multiple of 2pi just in case but we reset it on land anyway
            }
        }
    }

    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }

    applyPowerUp(type) {
        if (type === 'heal') {
            this.heal(Math.floor(this.maxHealth * 0.3));
        } else if (type === 'attackBoost') {
            this.attackMultiplier = 1.5;
            this.powerTimer = this.powerDuration;
        }
    }
    
    jump() {
        if (this.onGround) {
            this.velocityY = -this.jumpPower;
            this.onGround = false;
            this.canDoubleJump = true;
            this.isDoubleJumping = false;
        } else if (this.canDoubleJump) {
            // Double jump
            this.velocityY = -this.jumpPower * 0.9;
            this.canDoubleJump = false;
            this.isDoubleJumping = true;
            this.flipAngle = 0;
        } else if (this.onWall && this.wallSlideTime > 0.1) {
            // Wall jump
            this.velocityY = -this.jumpPower;
            this.velocityX = 400 * (this.wallSide === 'left' ? 1 : -1);
            this.onWall = false;
            this.canDoubleJump = true; // Refresh double jump on wall jump
            this.isDoubleJumping = false;
        }
    }
    
    attack() {
        if (this.attackCooldownTime <= 0) {
            this.attacking = true;
            this.attackTime = this.attackDuration;
            
            // Gun shoots bullets
            if (this.weapon === 'gun') {
                const bulletSpeed = 400;
                const bulletVelocityX = bulletSpeed * this.direction;
                const bulletX = this.x + (this.direction > 0 ? this.width : 0);
                const bulletY = this.y + this.height / 2 - 2;
                const damage = Math.floor(50 * this.attackMultiplier);
                
                // Add new bullet to global game instance (legacy compatibility)
                if (window.gameInstance) {
                    window.gameInstance.bullets.push(new Bullet(bulletX, bulletY, bulletVelocityX, 0, damage, 'player'));
                }
            }
        }
    }
    
    takeDamage(amount) {
        this.health = Math.max(0, this.health - amount);
    }
    
    getAttackBox() {
        return {
            x: this.x + (this.direction > 0 ? this.width : -this.attackRange),
            y: this.y + 5,
            width: this.attackRange,
            height: this.height - 10
        };
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
        ctx.save();
        if (this.isDoubleJumping) {
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.flipAngle);
            ctx.translate(-(this.x + this.width / 2), -(this.y + this.height / 2));
        }

        Player.drawStandalone(ctx, this.x, this.y, this.skin, {
            direction: this.direction,
            weapon: this.weapon,
            attacking: this.attacking,
            attackTime: this.attackTime,
            attackDuration: this.attackDuration,
            velocityX: this.velocityX,
            width: this.width,
            height: this.height,
            health: this.health,
            maxHealth: this.maxHealth,
            attackMultiplier: this.attackMultiplier
        });

        // Draw fall through progress bar if charging
        if (this.fallThroughTimer > 0) {
            const barW = this.width;
            const progress = this.fallThroughTimer / 3.0;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(this.x, this.y + this.height + 5, barW, 4);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(this.x, this.y + this.height + 5, barW * progress, 4);
        }

        ctx.restore();
    }

    static drawStandalone(ctx, x, y, skinId, options = {}) {
        const {
            direction = 1,
            weapon = 'knife',
            attacking = false,
            attackTime = 0,
            attackDuration = 0.3,
            velocityX = 0,
            width = 24,
            height = 32,
            health = 500,
            maxHealth = 500,
            attackMultiplier = 1,
            showHealth = true,
            scale = 1
        } = options;

        ctx.save();
        if (scale !== 1) {
            ctx.translate(x, y);
            ctx.scale(scale, scale);
            ctx.translate(-x, -y);
        }

        // Animation frame for running
        const runFrame = Math.floor((Date.now() * 0.01) % 4);
        const legOffset = (runFrame % 2) * 2 - 1;
        
        // Determine skin colors
        const skin = Player.skins[skinId] || Player.skins.default;

        // GLOW EFFECTS for special skins
        if (skinId === 'gold' || skinId === 'plasma' || skinId === 'void') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = skin.trim;
        }

        // TORSO / BODY - Armored chest plate
        ctx.fillStyle = skin.primary; // main color
        ctx.fillRect(x + 2, y + 2, width - 4, 16);
        
        // Chest plate armor detail
        ctx.fillStyle = skin.accent;
        ctx.fillRect(x + 3, y + 3, 8, 14);
        ctx.fillRect(x + 13, y + 3, 8, 14);
        ctx.fillRect(x + 6, y + 8, 12, 3); // Chest strap
        
        // Armor studs
        ctx.fillStyle = skin.trim;
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(x + 4 + i * 8, y + 5, 3, 3);
        }
        
        // Belt
        ctx.fillStyle = skin.belt;
        ctx.fillRect(x + 2, y + 18, width - 4, 4);
        ctx.fillStyle = skin.trim;
        ctx.fillRect(x + 10, y + 19, 4, 2); // Belt buckle
        
        // LEFT LEG - animated
        ctx.fillStyle = skin.pants;
        ctx.fillRect(x + 5, y + 22, 6, 8 + legOffset);
        // Left boot
        ctx.fillStyle = skin.boot;
        ctx.fillRect(x + 4, y + 30 + legOffset, 8, 2);
        
        // RIGHT LEG - animated opposite
        ctx.fillStyle = skin.pants;
        ctx.fillRect(x + 13, y + 22, 6, 8 - legOffset);
        // Right boot
        ctx.fillStyle = skin.boot;
        ctx.fillRect(x + 12, y + 30 - legOffset, 8, 2);
        
        // LEFT ARM
        ctx.fillStyle = skin.skinTone;
        ctx.fillRect(x - 5, y + 6, 5, 10);
        // Left glove
        ctx.fillStyle = skin.trim;
        ctx.fillRect(x - 5, y + 14, 5, 4);
        
        // RIGHT ARM
        ctx.fillStyle = skin.skinTone;
        ctx.fillRect(x + width, y + 6, 5, 10);
        // Right glove
        ctx.fillStyle = skin.trim;
        ctx.fillRect(x + width, y + 14, 5, 4);
        
        // NECK
        ctx.fillStyle = skin.skinTone;
        ctx.fillRect(x + 10, y - 3, 4, 5);
        
        // HEAD
        ctx.fillStyle = skin.skinTone;
        ctx.fillRect(x + 6, y - 10, 12, 13);
        
        // Head outline/shadow
        ctx.strokeStyle = skin.skinOutline || '#cc9966';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 6, y - 10, 12, 13);
        
        // Helmet (top)
        ctx.fillStyle = skin.helmet;
        ctx.fillRect(x + 6, y - 12, 12, 3);
        ctx.fillStyle = skin.helmetShade;
        ctx.fillRect(x + 6, y - 11, 12, 1);
        
        // LEFT EYE
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 8, y - 7, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 8.5, y - 6.5, 1, 1);
        
        // RIGHT EYE
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 14, y - 7, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 14.5, y - 6.5, 1, 1);
        
        // MOUTH - Combat expression
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x + 12, y - 2, 1.5, 0, Math.PI);
        ctx.stroke();
        
        // Cheek blush
        ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(x + 7, y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 17, y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // CAPE/CLOAK EFFECT
        if (velocityX !== 0) {
            ctx.fillStyle = 'rgba(230, 57, 70, 0.4)';
            const capeWave = Math.sin(Date.now() * 0.01) * 3;
            ctx.beginPath();
            ctx.moveTo(x + 2, y);
            ctx.lineTo(x - 8 + capeWave, y + 15);
            ctx.lineTo(x - 6 + capeWave, y + 20);
            ctx.lineTo(x + 2, y + 16);
            ctx.closePath();
            ctx.fill();
        }
        
        // WEAPON
        if (weapon === 'knife') {
            const handX = direction > 0 ? x + width : x;
            const handY = y + 14;
            let angle = direction * (-Math.PI / 4);
            if (attacking) {
                const progress = 1 - Math.max(0, attackTime / attackDuration);
                const eased = Math.sin(progress * Math.PI);
                angle = direction * (-Math.PI / 4 + eased * Math.PI * 0.95);
            }

            ctx.save();
            ctx.translate(handX, handY);
            ctx.rotate(angle);
            ctx.fillStyle = '#e8e8e8';
            ctx.fillRect(4, -3, 14, 6);
            ctx.beginPath();
            ctx.moveTo(18, -5);
            ctx.lineTo(24, 0);
            ctx.lineTo(18, 5);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(-4, -4, 6, 8);
            ctx.restore();

            if (attacking) {
                ctx.strokeStyle = 'rgba(255,170,0,0.45)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(handX + direction * 6, handY, 32, direction > 0 ? -1.2 : -2.0, direction > 0 ? -0.2 : -0.5);
                ctx.stroke();
            }
        } else if (weapon === 'gun') {
            ctx.fillStyle = '#1a1a1a';
            if (direction > 0) {
                ctx.fillRect(x + width, y + 10, 14, 5);
                ctx.fillRect(x + width + 3, y + 7, 8, 3);
                ctx.fillRect(x + width + 14, y + 11, 4, 3);
            } else {
                ctx.fillRect(x - 14, y + 10, 14, 5);
                ctx.fillRect(x - 11, y + 7, 8, 3);
                ctx.fillRect(x - 18, y + 11, 4, 3);
            }
        }
        
        // Reset shadow for UI components
        ctx.shadowBlur = 0;

        if (showHealth) {
            const barWidth = width + 18;
            const barHeight = 8;
            const barX = x - 7;
            const barY = y - 20;
            const healthPercent = Math.max(0, Math.min(1, health / maxHealth));

            ctx.fillStyle = 'rgba(20,20,20,0.9)';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barWidth, barHeight);

            const grad = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            grad.addColorStop(0, '#00ff00');
            grad.addColorStop(0.5, '#ffaa00');
            grad.addColorStop(1, '#ff0000');
            ctx.fillStyle = grad;
            ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * healthPercent, barHeight - 2);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${Math.floor(health)}/${maxHealth}`, barX + barWidth / 2, barY - 6);
        }

        ctx.restore();
    }
}
