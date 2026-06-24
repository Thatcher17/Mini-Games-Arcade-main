class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Store game instance globally for player to access
        window.gameInstance = this;
        
        // Game state
        this.player = new Player(100, this.canvas.height - 150);
        this.platforms = [];
        this.enemies = [];
        this.particles = [];
        this.bullets = [];
        this.score = 0;
        this.level = 1;
        this.gameRunning = true;
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Initialize level
        this.initLevel(1);
        
        // Start game loop
        this.lastTime = Date.now();
        this.gameLoop();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // Jump with Space
            if (e.key === ' ') {
                this.player.jump();
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Left mouse button for attack
        this.canvas.addEventListener('click', () => {
            this.player.attack();
        });
    }
    
    initLevel(levelNum) {
        this.platforms = [];
        this.enemies = [];
        this.particles = [];
        this.bullets = [];
        
        // Update player weapon
        if (levelNum >= 3) {
            this.player.weapon = 'gun';
        } else {
            this.player.weapon = 'knife';
        }
        
        // Ground
        this.platforms.push(new Platform(0, this.canvas.height - 40, this.canvas.width, 40, true));
        
        // Level-specific layout
        if (levelNum === 1) {
            // Tutorial level
            this.platforms.push(new Platform(200, 520, 300, 20));
            this.platforms.push(new Platform(600, 480, 300, 20));
            this.platforms.push(new Platform(150, 360, 250, 20));
            this.platforms.push(new Platform(500, 300, 350, 20));
            this.platforms.push(new Platform(100, 150, 300, 20));
            
            // Enemies
            this.enemies.push(new Enemy(400, 450, 'goblin'));
            this.enemies.push(new Enemy(700, 370, 'goblin'));
        } else if (levelNum === 2) {
            // Moving platforms and more enemies
            this.platforms.push(new Platform(200, 500, 250, 20));
            this.platforms.push(new Platform(550, 450, 250, 20, true, 400, 600));
            this.platforms.push(new Platform(150, 350, 300, 20));
            this.platforms.push(new Platform(600, 300, 280, 20, true, 400, 700));
            this.platforms.push(new Platform(100, 150, 400, 20));
            
            this.enemies.push(new Enemy(400, 400, 'goblin'));
            this.enemies.push(new Enemy(650, 320, 'orc'));
            this.enemies.push(new Enemy(300, 200, 'goblin'));
        } else if (levelNum === 3) {
            // Challenging level
            this.platforms.push(new Platform(150, 520, 200, 20));
            this.platforms.push(new Platform(450, 480, 200, 20, true, 300, 500));
            this.platforms.push(new Platform(750, 440, 150, 20));
            this.platforms.push(new Platform(200, 340, 280, 20));
            this.platforms.push(new Platform(550, 300, 250, 20, true, 400, 750));
            this.platforms.push(new Platform(150, 150, 700, 20));
            
            this.enemies.push(new Enemy(300, 400, 'orc'));
            this.enemies.push(new Enemy(600, 350, 'goblin'));
            this.enemies.push(new Enemy(400, 200, 'orc'));
            this.enemies.push(new Enemy(800, 250, 'goblin'));
        } else if (levelNum === 4) {
            // Very challenging level with moving platforms
            this.platforms.push(new Platform(100, 520, 150, 20));
            this.platforms.push(new Platform(350, 480, 200, 20, true, 250, 450));
            this.platforms.push(new Platform(700, 440, 200, 20));
            this.platforms.push(new Platform(150, 340, 350, 20, true, 100, 500));
            this.platforms.push(new Platform(600, 300, 300, 20));
            this.platforms.push(new Platform(200, 180, 550, 20));
            
            this.enemies.push(new Enemy(300, 380, 'orc'));
            this.enemies.push(new Enemy(700, 340, 'orc'));
            this.enemies.push(new Enemy(400, 220, 'orc'));
            this.enemies.push(new Enemy(600, 180, 'orc'));
        } else if (levelNum === 5) {
            // Boss level - epic parkour climb to the top
            // Left side stairs
            this.platforms.push(new Platform(50, 540, 80, 20));
            this.platforms.push(new Platform(40, 480, 80, 20));
            this.platforms.push(new Platform(60, 420, 80, 20));
            this.platforms.push(new Platform(30, 360, 80, 20));
            
            // Right side stairs
            this.platforms.push(new Platform(830, 540, 80, 20));
            this.platforms.push(new Platform(840, 480, 80, 20));
            this.platforms.push(new Platform(820, 420, 80, 20));
            this.platforms.push(new Platform(850, 360, 80, 20));
            
            // Middle climbing path
            this.platforms.push(new Platform(200, 500, 120, 20));
            this.platforms.push(new Platform(640, 480, 120, 20));
            this.platforms.push(new Platform(150, 380, 150, 20, true, 100, 300));
            this.platforms.push(new Platform(700, 360, 150, 20, true, 600, 850));
            this.platforms.push(new Platform(300, 280, 360, 20));
            this.platforms.push(new Platform(200, 200, 560, 20));
            
            // Boss arena at top
            this.platforms.push(new Platform(300, 80, 360, 30));
            
            // Boss enemy
            this.enemies.push(new Boss(480, 40));
        }
    }
    
    update(deltaTime) {
        if (!this.gameRunning) return;
        
        // Update player
        this.player.update(deltaTime, this.keys, this.platforms);
        
        // Update platforms
        this.platforms.forEach(platform => {
            if (platform.moving) {
                platform.update(deltaTime);
            }
        });
        
        // Update bullets
        this.bullets.forEach((bullet, bulletIndex) => {
            bullet.update(deltaTime);
            
            // Check bullet collision with enemies
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.isColliding(bullet.getBounds(), enemy.getBounds())) {
                    enemy.takeDamage(50);
                    this.bullets.splice(bulletIndex, 1);
                    this.score += 10;
                    this.createParticles(bullet.x, bullet.y, '#ffff00', 5);
                    
                    if (enemy.health <= 0) {
                        this.enemies.splice(enemyIndex, 1);
                        const killScore = enemy.isBoss ? 2000 : 100;
                        this.score += killScore;
                        this.createParticles(enemy.x, enemy.y, '#ffff00', 10);
                    }
                }
            });
        });
        
        // Remove bullets that went off screen
        this.bullets = this.bullets.filter(b => b.x > -50 && b.x < this.canvas.width + 50);
        
        // Update enemies
        this.enemies.forEach((enemy, index) => {
            enemy.update(deltaTime, this.player, this.platforms);
            
            // Check collision with player attacks (knife only)
            if (this.player.attacking && this.player.weapon === 'knife') {
                if (this.isColliding(this.player.getAttackBox(), enemy.getBounds())) {
                    const damage = 25;
                    enemy.takeDamage(damage);
                    this.score += 10;
                    this.createParticles(enemy.x, enemy.y, '#ff6b6b', 5);
                    
                    if (enemy.health <= 0) {
                        this.enemies.splice(index, 1);
                        const killScore = enemy.isBoss ? 2000 : 100;
                        this.score += killScore;
                        this.createParticles(enemy.x, enemy.y, '#ffff00', 10);
                    }
                }
            }
            
            // Check collision with enemy
            if (this.isColliding(this.player.getBounds(), enemy.getBounds())) {
                this.player.takeDamage(5);
                this.createParticles(this.player.x, this.player.y, '#ff0000', 3);
            }
        });
        
        // Remove dead enemies
        this.enemies = this.enemies.filter(e => e.health > 0);
        
        // Update particles
        this.particles.forEach((particle, index) => {
            particle.update(deltaTime);
            if (particle.life <= 0) {
                this.particles.splice(index, 1);
            }
        });
        
        // Check if player fell off the map
        if (this.player.y > this.canvas.height) {
            this.endGame(false);
        }
        
        // Check if level cleared
        if (this.enemies.length === 0) {
            this.nextLevel();
        }
        
        // Check if player died
        if (this.player.health <= 0) {
            this.endGame(false);
        }
        
        // Update UI
        this.updateUI();
    }
    
    createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 / count) * i;
            const velocity = 200 + Math.random() * 100;
            this.particles.push(new Particle(x, y, velocity * Math.cos(angle), velocity * Math.sin(angle), color));
        }
    }
    
    isColliding(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    nextLevel() {
        this.level++;
        if (this.level > 5) {
            this.endGame(true);
        } else {
            this.score += 500;
            this.initLevel(this.level);
        }
    }
    
    endGame(won) {
        this.gameRunning = false;
        const gameOverDiv = document.getElementById('gameOver');
        const title = document.getElementById('gameOverTitle');
        const text = document.getElementById('gameOverText');
        
        if (won) {
            title.textContent = 'You Win!';
            text.textContent = `Final Score: ${this.score}\nLevel: ${this.level}`;
        } else {
            title.textContent = 'Game Over';
            text.textContent = `Final Score: ${this.score}\nLevel Reached: ${this.level}`;
        }
        
        gameOverDiv.style.display = 'block';
    }
    
    updateUI() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = this.score;

        const levelEl = document.getElementById('level');
        if (levelEl) levelEl.textContent = this.level;

        const healthEl = document.getElementById('health');
        if (healthEl) healthEl.textContent = Math.max(0, this.player.health);

        const comboEl = document.getElementById('combo');
        if (comboEl) comboEl.textContent = this.enemies.length;
    }
    
    draw() {
        // Clear canvas with sky blue
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw clouds
        this.drawClouds();
        
        // Draw platforms
        this.platforms.forEach(platform => platform.draw(this.ctx));
        
        // Draw bullets
        this.bullets.forEach(bullet => bullet.draw(this.ctx));
        
        // Draw enemies
        this.enemies.forEach(enemy => enemy.draw(this.ctx));
        
        // Draw player
        this.player.draw(this.ctx);
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // Draw game info
        this.drawGameInfo();
    }
    
    drawClouds() {
        const time = Date.now() * 0.0001;
        for (let i = 0; i < 3; i++) {
            const x = (100 + i * 300 + time * 20) % (this.canvas.width + 100);
            const y = 50 + i * 40;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.fillRect(x, y, 80, 30);
            this.ctx.fillRect(x + 25, y - 15, 50, 30);
        }
    }
    
    drawGameInfo() {
        // This is handled by HTML elements in the UI
    }
    
    gameLoop = () => {
        const now = Date.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;
        
        this.update(deltaTime);
        this.draw();
        
        requestAnimationFrame(this.gameLoop);
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 32;
        this.velocityX = 0;
        this.velocityY = 0;
        this.health = 250;
        this.maxHealth = 250;
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
        this.color = '#ff0000';
        this.weapon = 'knife'; // 'knife' or 'gun'
    }
    
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
        
        platforms.forEach(platform => {
            const bounds = this.getBounds();
            const platformBounds = platform.getBounds();
            
            // Check if colliding
            if (this.isCollidingWithRect(bounds, platformBounds)) {
                // Coming from above
                if (this.velocityY >= 0 && bounds.y + bounds.height - this.velocityY * deltaTime <= platformBounds.y) {
                    this.y = platform.y - this.height;
                    this.velocityY = 0;
                    this.onGround = true;
                    this.airTime = 0;
                }
                // Coming from below
                else if (this.velocityY < 0 && bounds.y >= platformBounds.y + platformBounds.height) {
                    this.y = platform.y + platform.height;
                    this.velocityY = 0;
                }
                // Wall collision - left
                else if (this.velocityX > 0 && bounds.x + bounds.width - this.velocityX * deltaTime <= platformBounds.x) {
                    this.x = platform.x - this.width;
                    this.onWall = true;
                    this.wallSide = 'left';
                }
                // Wall collision - right
                else if (this.velocityX < 0 && bounds.x >= platformBounds.x + platformBounds.width) {
                    this.x = platform.x + platform.width;
                    this.onWall = true;
                    this.wallSide = 'right';
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
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > 960) this.x = 960 - this.width;
        
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
    }
    
    jump() {
        if (this.onGround) {
            this.velocityY = -this.jumpPower;
            this.onGround = false;
        } else if (this.onWall && this.wallSlideTime > 0.1) {
            // Wall jump
            this.velocityY = -this.jumpPower;
            this.velocityX = 400 * (this.wallSide === 'left' ? 1 : -1);
            this.onWall = false;
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
                
                // This will be passed to game through a callback
                window.gameInstance.bullets.push(new Bullet(bulletX, bulletY, bulletVelocityX, 0));
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
        // Animation frame for running
        const runFrame = Math.floor((Date.now() * 0.01) % 4);
        const legOffset = (runFrame % 2) * 2 - 1;
        
        // TORSO / BODY - Armored chest plate
        ctx.fillStyle = '#e63946'; // Rich red
        ctx.fillRect(this.x + 2, this.y + 2, this.width - 4, 16);
        
        // Chest plate armor detail
        ctx.fillStyle = '#a71930';
        ctx.fillRect(this.x + 3, this.y + 3, 8, 14);
        ctx.fillRect(this.x + 13, this.y + 3, 8, 14);
        ctx.fillRect(this.x + 6, this.y + 8, 12, 3); // Chest strap
        
        // Armor studs
        ctx.fillStyle = '#ffb703';
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(this.x + 4 + i * 8, this.y + 5, 3, 3);
        }
        
        // Belt
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(this.x + 2, this.y + 18, this.width - 4, 4);
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(this.x + 10, this.y + 19, 4, 2); // Belt buckle
        
        // LEFT LEG - animated
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(this.x + 5, this.y + 22, 6, 8 + legOffset);
        // Left boot
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + 4, this.y + 30 + legOffset, 8, 2);
        
        // RIGHT LEG - animated opposite
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(this.x + 13, this.y + 22, 6, 8 - legOffset);
        // Right boot
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(this.x + 12, this.y + 30 - legOffset, 8, 2);
        
        // LEFT ARM
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(this.x - 5, this.y + 6, 5, 10);
        // Left glove
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(this.x - 5, this.y + 14, 5, 4);
        
        // RIGHT ARM
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(this.x + this.width, this.y + 6, 5, 10);
        // Right glove
        ctx.fillStyle = '#ffb703';
        ctx.fillRect(this.x + this.width, this.y + 14, 5, 4);
        
        // NECK
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(this.x + 10, this.y - 3, 4, 5);
        
        // HEAD
        ctx.fillStyle = '#ffcc99';
        ctx.fillRect(this.x + 6, this.y - 10, 12, 13);
        
        // Head outline/shadow
        ctx.strokeStyle = '#cc9966';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x + 6, this.y - 10, 12, 13);
        
        // Helmet (top)
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(this.x + 6, this.y - 12, 12, 3);
        ctx.fillStyle = '#666666';
        ctx.fillRect(this.x + 6, this.y - 11, 12, 1);
        
        // LEFT EYE
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 8, this.y - 7, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 8.5, this.y - 6.5, 1, 1);
        
        // RIGHT EYE
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x + 14, this.y - 7, 2, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(this.x + 14.5, this.y - 6.5, 1, 1);
        
        // MOUTH - Combat expression
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y - 2, 1.5, 0, Math.PI);
        ctx.stroke();
        
        // Cheek blush
        ctx.fillStyle = 'rgba(255, 100, 100, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x + 7, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + 17, this.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // CAPE/CLOAK EFFECT
        if (this.velocityX !== 0) {
            ctx.fillStyle = 'rgba(230, 57, 70, 0.4)';
            const capeWave = Math.sin(Date.now() * 0.01) * 3;
            ctx.beginPath();
            ctx.moveTo(this.x + 2, this.y);
            ctx.lineTo(this.x - 8 + capeWave, this.y + 15);
            ctx.lineTo(this.x - 6 + capeWave, this.y + 20);
            ctx.lineTo(this.x + 2, this.y + 16);
            ctx.closePath();
            ctx.fill();
        }
        
        // WEAPON
        if (this.weapon === 'knife') {
            // Knife blade - shiny silver
            ctx.fillStyle = '#e8e8e8';
            if (this.direction > 0) {
                ctx.beginPath();
                ctx.moveTo(this.x + this.width + 4, this.y + 12);
                ctx.lineTo(this.x + this.width + 18, this.y + 10);
                ctx.lineTo(this.x + this.width + 16, this.y + 14);
                ctx.closePath();
                ctx.fill();
                // Knife shine
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.x + this.width + 12, this.y + 11, 2, 2);
                // Knife handle
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(this.x + this.width + 2, this.y + 12, 3, 4);
            } else {
                ctx.beginPath();
                ctx.moveTo(this.x - 4, this.y + 12);
                ctx.lineTo(this.x - 18, this.y + 10);
                ctx.lineTo(this.x - 16, this.y + 14);
                ctx.closePath();
                ctx.fill();
                // Knife shine
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(this.x - 14, this.y + 11, 2, 2);
                // Knife handle
                ctx.fillStyle = '#8b4513';
                ctx.fillRect(this.x - 5, this.y + 12, 3, 4);
            }
        } else if (this.weapon === 'gun') {
            // Detailed futuristic gun
            ctx.fillStyle = '#1a1a1a';
            if (this.direction > 0) {
                // Gun body
                ctx.fillRect(this.x + this.width, this.y + 10, 14, 5);
                // Gun scope
                ctx.fillRect(this.x + this.width + 3, this.y + 7, 8, 3);
                // Gun muzzle
                ctx.fillRect(this.x + this.width + 14, this.y + 11, 4, 3);
                // Gun highlight
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x + this.width, this.y + 10, 14, 1);
                // Charging effect
                if (this.attacking) {
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(this.x + this.width + 14, this.y + 11, 4, 3);
                    ctx.fillStyle = '#00aa00';
                    ctx.fillRect(this.x + this.width + 14, this.y + 11, 4, 1);
                    // Muzzle flare
                    ctx.fillStyle = '#ffaa00';
                    ctx.beginPath();
                    ctx.moveTo(this.x + this.width + 18, this.y + 12);
                    ctx.lineTo(this.x + this.width + 26, this.y + 10);
                    ctx.lineTo(this.x + this.width + 26, this.y + 14);
                    ctx.closePath();
                    ctx.fill();
                }
            } else {
                // Gun body
                ctx.fillRect(this.x - 14, this.y + 10, 14, 5);
                // Gun scope
                ctx.fillRect(this.x - 11, this.y + 7, 8, 3);
                // Gun muzzle
                ctx.fillRect(this.x - 18, this.y + 11, 4, 3);
                // Gun highlight
                ctx.fillStyle = '#333';
                ctx.fillRect(this.x - 14, this.y + 10, 14, 1);
                // Charging effect
                if (this.attacking) {
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(this.x - 18, this.y + 11, 4, 3);
                    ctx.fillStyle = '#00aa00';
                    ctx.fillRect(this.x - 18, this.y + 11, 4, 1);
                    // Muzzle flare
                    ctx.fillStyle = '#ffaa00';
                    ctx.beginPath();
                    ctx.moveTo(this.x - 18, this.y + 12);
                    ctx.lineTo(this.x - 26, this.y + 10);
                    ctx.lineTo(this.x - 26, this.y + 14);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
        
        // HEALTH BAR - improved style
        const barWidth = this.width + 10;
        const barX = this.x - 5;
        const barY = this.y - 18;
        
        // Health bar background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(barX, barY, barWidth, 5);
        
        // Health bar border
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, 5);
        
        // Health fill gradient
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffaa00' : '#ff0000';
        ctx.fillRect(barX + 1, barY + 1, (barWidth - 2) * healthPercent, 3);
        
        // Health text above head
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(Math.floor(this.health) + '/250', barX + barWidth / 2, barY - 6);
    }
}

class Platform {
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

class Enemy {
    constructor(x, y, type = 'goblin') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = type === 'orc' ? 32 : 24;
        this.height = type === 'orc' ? 40 : 32;
        this.health = type === 'orc' ? 50 : 30;
        this.maxHealth = this.health;
        this.velocityX = 0;
        this.velocityY = 0;
        this.speed = type === 'orc' ? 80 : 100;
        this.gravity = 1200;
        this.onGround = false;
        
        this.direction = 1;
        this.patrolRange = 150;
        this.patrolStart = x;
        this.sightRange = 200;
        this.chasing = false;
        this.chaseSpeed = type === 'orc' ? 150 : 120;
        
        this.attackRange = 40;
        this.attackCooldown = 1;
        this.attackCooldownTime = 0;
        this.attacking = false;
        this.attackTime = 0;
        
        this.color = type === 'orc' ? '#2d5016' : '#4CAF50';
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

class Bullet {
    constructor(x, y, velocityX, velocityY) {
        this.x = x;
        this.y = y;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        this.width = 8;
        this.height = 4;
        this.gravity = 0; // Bullets don't fall initially
        this.life = 3; // Max lifetime in seconds
    }
    
    update(deltaTime) {
        this.x += this.velocityX * deltaTime;
        this.y += this.velocityY * deltaTime;
        this.velocityY += 200 * deltaTime; // Slight gravity drop
        this.life -= deltaTime;
    }
    
    getBounds() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    
    draw(ctx) {
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

class Particle {
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

class Boss extends Enemy {
    constructor(x, y) {
        super(x, y, 'orc');
        this.width = 60;
        this.height = 60;
        this.health = 300;
        this.maxHealth = 300;
        this.speed = 60;
        this.color = '#8b0000'; // Dark red
        this.isBoss = true;
        this.sightRange = 500;
        this.chaseSpeed = 100;
        this.attackRange = 50;
        this.attackCooldown = 1.5;
        this.attackPattern = 0;
        this.patrolRange = 200;
        this.phaseHealth = 200;
        this.phase2 = false;
    }
    
    update(deltaTime, player, platforms) {
        // Phase 2 at half health
        if (this.health <= this.phaseHealth && !this.phase2) {
            this.phase2 = true;
            this.speed = 100;
            this.chaseSpeed = 150;
            this.color = '#ff0000';
        }
        
        // Apply gravity
        this.velocityY += this.gravity * deltaTime;
        
        // Determine behavior
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
            if (this.onGround && this.attackPattern % 2 < 1) {
                this.velocityY = -450;
            }
            
            // Attack pattern
            if (distToPlayer < this.attackRange && this.attackCooldownTime <= 0) {
                this.attacking = true;
                this.attackTime = 0.4;
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
    
    draw(ctx) {
        // Boss body - larger and more threatening
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Boss crown/horns
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.moveTo(this.x + 10, this.y - 5);
        ctx.lineTo(this.x + 15, this.y - 15);
        ctx.lineTo(this.x + 20, this.y - 5);
        ctx.lineTo(this.x + 30, this.y - 15);
        ctx.lineTo(this.x + 35, this.y - 5);
        ctx.lineTo(this.x + 45, this.y - 15);
        ctx.lineTo(this.x + 50, this.y - 5);
        ctx.closePath();
        ctx.fill();
        
        // Boss head
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x + 8, this.y - 20, this.width - 16, 20);
        
        // Eyes - glowing red
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 15, this.y - 15, 6, 6);
        ctx.fillRect(this.x + this.width - 21, this.y - 15, 6, 6);
        
        // Health bar (large)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x, this.y - 30, this.width, 5);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x, this.y - 30, this.width * (this.health / this.maxHealth), 5);
        
        // Boss name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x + this.width / 2, this.y - 35);
        
        // Attack indicator
        if (this.attacking) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 40, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
}

// Start the game when the page loads
window.addEventListener('load', () => {
    new Game();
});

// Display controls
window.addEventListener('load', () => {
    console.log('=== PIXEL PARKOUR ===');
    console.log('Controls:');
    console.log('A/D - Move left/right');
    console.log('SPACE - Jump / Wall Jump');
    console.log('LEFT MOUSE BUTTON - Attack');
    console.log('');
    console.log('Level 1-2: Knife attacks');
    console.log('Level 3+: Gun attacks (stronger!)');
    console.log('Level 5: BOSS FIGHT');
    console.log('');
    console.log('Defeat all enemies to advance to the next level!');
});
