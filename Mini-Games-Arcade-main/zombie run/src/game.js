import Player from './entities/player.js';
import Platform from './entities/platform.js';
import Enemy, { Boss } from './entities/enemy.js';
import Bullet from './entities/bullet.js';
import Particle from './entities/particle.js';
import PowerUp from './entities/powerup.js';
import Coin from './entities/coin.js';
import { isColliding } from './utils/collision.js';
import LEVELS from './config/levelsConfig.js';
import { saved, saveSaved } from './utils/saveManager.js';

export default class Game {
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
        this.powerups = [];
        this.coins = 0; // collected currency
        this.coinPickups = []; // coin entities on the field
        this.score = 0;
        this.level = 1;
        this.gameRunning = true;
        this.mapWidth = 960;
        this.cameraX = 0;
        
        // Input handling
        this.keys = {};
        this.setupEventListeners();
        
        // Check for checkpoint - start at level 5 if reached
        const startLevel = saved.checkpointLevel >= 5 ? 5 : 1;
        
        // Initialize level
        this.initLevel(startLevel);
        this.level = startLevel;
        
        // Start game loop
        this.lastTime = Date.now();
        this.gameLoop();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (!this.gameRunning) return;
            this.keys[e.key.toLowerCase()] = true;
            
            // Jump with Space
            if (e.key === ' ') {
                this.player.jump();
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (!this.gameRunning) return;
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // Left mouse button for attack
        this.canvas.addEventListener('click', () => {
            if (!this.gameRunning) return;
            this.player.attack();
        });
    }
    
    initLevel(levelNum) {
        this.platforms = [];
        this.enemies = [];
        this.particles = [];
        this.bullets = [];
        
        // Map width setting — always standard size
        this.mapWidth = 960;
        
        // Ground
        this.platforms.push(new Platform(0, this.canvas.height - 40, this.canvas.width, 40, true));
        
        // Load level from config or use boss/invasion defaults
        const levelConfig = LEVELS[levelNum];
        
        if (levelConfig && levelNum <= 4) {
            // Use config for levels 1-4
            this.player.weapon = levelConfig.weapon;
            
            // Add platforms from config
            levelConfig.platforms.forEach(p => {
                this.platforms.push(new Platform(p[0], p[1], p[2], p[3], p[4], p[5], p[6]));
            });
            
            // Add enemies from config
            levelConfig.enemies.forEach(e => {
                this.enemies.push(new Enemy(e[0], e[1], e[2]));
            });
        } else if (levelNum === 5) {
            // Boss level - minimal platforms as requested
            this.player.weapon = 'gun';
            
            // Just the boss in the center
            this.enemies.push(new Boss(this.canvas.width / 2 - 50, this.canvas.height - 140));
        } else if (levelNum >= 6) {
            // Spider invasion levels - progressively harder after boss
            this.player.weapon = 'gun';
            // Add a few platforms; spiders will arrive after a short delay
            this.platforms.push(new Platform(100, this.canvas.height - 180, 200, 20));
            this.platforms.push(new Platform(400, this.canvas.height - 260, 180, 20, true, 300, 600));
            this.platforms.push(new Platform(700, this.canvas.height - 220, 200, 20));
            const spiderCount = 2 + (levelNum - 5); // increases each level beyond 5
            // Prepare pending spider spawn (3 second countdown)
            const positions = [];
            for (let i = 0; i < spiderCount; i++) {
                const sx = 120 + (i * 180) % (this.canvas.width - 240);
                const sy = 240 + ((i % 3) * 60);
                positions.push({ x: sx, y: sy });
            }
            // Use an explicit countdown object so it ticks down to 0 and then spawns
            // `spawned` tracks whether they have already been created; `postDelay` keeps
            // the notification visible for a short moment after spawning.
            this.spiderSpawnPending = { timer: 3.0, positions, active: true, spawned: false, postDelay: 0.5 };
            console.log(`Spiders incoming in ${this.spiderSpawnPending.timer}s!`);
        }

        // Ensure each level has a parkour/staircase path so the stage is traversable
        if (levelNum <= 4) {
            const steps = 6 + Math.min(4, Math.floor(levelNum / 2)); // more steps for higher levels
            const stepWidth = 110;
            const stepHeight = 60;
            let startX = 40;
            let y = this.canvas.height - 120;
            let x = startX;
            for (let i = 0; i < steps; i++) {
                // Add modest steps; stop if we approach top of screen
                this.platforms.push(new Platform(x, y, stepWidth, 20));
                x += stepWidth - 30;
                y -= stepHeight;
                if (y < 80) break;
            }
        }

        // Chance to spawn up to one heal or powerup on the level (fewer on invasion stages)
        const spawnChance = levelNum >= 6 ? 0.25 : 0.5;
        if (Math.random() < spawnChance) {
            const types = ['heal', 'power'];
            const t = types[Math.floor(Math.random() * types.length)];
            // choose a platform above ground to place the pickup
            const candidates = this.platforms.filter(p => p.y < this.canvas.height - 60);
            const spawnPlat = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : this.platforms[0];
            // place pickup centered on platform and attach to it if it moves so it stays reachable
            const px = spawnPlat.x + Math.floor(spawnPlat.width / 2);
            const py = spawnPlat.y - 18;
            const pu = new PowerUp(px, py, t);
            if (spawnPlat.moving) {
                pu.hostPlatform = spawnPlat;
                // ensure initial alignment
                pu.x = spawnPlat.x + Math.floor(spawnPlat.width / 2);
                pu.y = spawnPlat.y - 18;
            }
            this.powerups.push(pu);
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

        // Handle pending spider spawn timer
        if (this.spiderSpawnPending) {
            // If not yet spawned, tick the countdown down to 0
            if (!this.spiderSpawnPending.spawned) {
                this.spiderSpawnPending.timer = Math.max(0, this.spiderSpawnPending.timer - deltaTime);
                if (this.spiderSpawnPending.timer <= 0) {
                    // Spawn spiders exactly once
                    this.spiderSpawnPending.positions.forEach(pos => {
                        this.enemies.push(new Enemy(pos.x, pos.y, 'spider'));
                        this.createParticles(pos.x, pos.y, '#6b2b88', 6);
                    });
                    console.log('Spiders spawned!');
                    this.spiderSpawnPending.spawned = true;
                    // keep the notification for a short time so the UI can show '0s'
                    this.spiderSpawnPending.postDelay = 0.5;
                }
            }
            // After spawned, count down the postDelay and then remove the pending object
            else {
                this.spiderSpawnPending.postDelay -= deltaTime;
                if (this.spiderSpawnPending.postDelay <= 0) {
                    delete this.spiderSpawnPending;
                }
            }
        }
        
        // Update bullets
        this.bullets.forEach((bullet, bulletIndex) => {
            bullet.update(deltaTime);
            // Projectiles from player hit enemies
            if (bullet.owner === 'player') {
                this.enemies.forEach((enemy, enemyIndex) => {
                    if (isColliding(bullet.getBounds(), enemy.getBounds())) {
                        enemy.takeDamage(bullet.damage);
                        this.bullets.splice(bulletIndex, 1);
                        this.score += 10;
                        this.createParticles(bullet.x, bullet.y, '#ffff00', 5);

                        if (enemy.health <= 0) {
                            this.enemies.splice(enemyIndex, 1);
                            const killScore = enemy.isBoss ? 2000 : 100;
                            this.score += killScore;
                            this.createParticles(enemy.x, enemy.y, '#ffff00', 10);
                            // Spawn coins on death (boss gives more)
                            const coinValue = enemy.isBoss ? 10 : 1;
                            this.spawnCoins(enemy.x, enemy.y, coinValue);
                        }
                    }
                });
            }
            // Projectiles from enemies hit the player
            else if (bullet.owner === 'enemy') {
                if (isColliding(bullet.getBounds(), this.player.getBounds())) {
                    this.player.takeDamage(bullet.damage);
                    this.bullets.splice(bulletIndex, 1);
                    this.createParticles(this.player.x, this.player.y, '#ff0000', 6);
                }
            }
        });
        
        // Remove bullets that went off screen
        this.bullets = this.bullets.filter(b => b.x > -50 && b.x < this.canvas.width + 50 && b.life > 0);
        
        // Update enemies
        this.enemies.forEach((enemy, index) => {
            enemy.update(deltaTime, this.player, this.platforms);
            
            // Check collision with player attacks (knife only)
            if (this.player.attacking && this.player.weapon === 'knife') {
                if (isColliding(this.player.getAttackBox(), enemy.getBounds())) {
                    const damage = Math.floor(25 * this.player.attackMultiplier);
                    enemy.takeDamage(damage);
                    this.score += 10;
                    this.createParticles(enemy.x, enemy.y, '#ff6b6b', 5);
                    
                    if (enemy.health <= 0) {
                        this.enemies.splice(index, 1);
                        const killScore = enemy.isBoss ? 2000 : 100;
                        this.score += killScore;
                        this.createParticles(enemy.x, enemy.y, '#ffff00', 10);                        const coinValue = enemy.isBoss ? 10 : 1;
                        this.spawnCoins(enemy.x, enemy.y, coinValue);                    }
                }
            }
            
            // Check collision with enemy (boss must be active to deal damage)
            if (isColliding(this.player.getBounds(), enemy.getBounds())) {
                const canDamage = enemy.isBoss ? enemy.active : true;
                
                // If boss and player is jumping over (player bottom is above boss top half), no damage
                const isJumpingOver = enemy.isBoss && (this.player.y + this.player.height < enemy.y + enemy.height * 0.5);
                
                if (canDamage && !isJumpingOver) {
                    const damage = enemy.contactDamage || 5;
                    this.player.takeDamage(damage);
                    this.createParticles(this.player.x, this.player.y, '#ff0000', 3);
                }
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

        // Handle power-up pickups
        this.powerups.forEach((pu, i) => {
            pu.update(deltaTime);
            if (isColliding(this.player.getBounds(), pu.getBounds())) {
                pu.apply(this.player);
                this.powerups.splice(i, 1);
            }
        });

        // Update coin pickups and handle collection
        this.coinPickups.forEach((c, i) => {
            c.update(deltaTime, this.platforms);
            if (isColliding(this.player.getBounds(), c.getBounds())) {
                this.coins += c.value;
                // feedback + particles
                this.createParticles(c.x, c.y, '#ffcc00', 6);
                this.coinPickups.splice(i, 1);
                // persist coins
                try { localStorage.setItem('coins', JSON.stringify(this.coins)); } catch (e) {}
            } else if (c.life <= 0) {
                // despawn
                this.coinPickups.splice(i, 1);
            }
        });
        
        // Check if player fell off the map
        if (this.player.y > this.canvas.height) {
            this.endGame(false);
        }
        
        // Check if level cleared
        // Do not auto-advance if a spider invasion countdown is pending (prevents instant level skips)
        if (this.enemies.length === 0 && !this.spiderSpawnPending) {
            this.nextLevel();
        }
        
        // Check if player died
        if (this.player.health <= 0) {
            this.endGame(false);
        }
        
        // No camera scrolling needed
        this.cameraX = 0;

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

    spawnCoins(x, y, amount) {
        // Drop several coins that sum to `amount` (split into singles, boss may drop more)
        const single = 1;
        let remaining = amount;
        while (remaining > 0) {
            const val = Math.min(single, remaining);
            // add small random offset
            const cx = x + (Math.random() - 0.5) * 20;
            const cy = y + (Math.random() - 0.5) * 10;
            this.coinPickups.push(new Coin(cx, cy, val));
            remaining -= val;
        }
    }
    
    nextLevel() {
        this.level++;
        
        // Save checkpoint if reached level 5 or beyond
        if (this.level >= 5 && saved.checkpointLevel < 5) {
            saved.checkpointLevel = 5;
            saveSaved();
        }
        
        // Continue game beyond level 5. After the boss (level 5), further levels
        // spawn stronger 'spider' enemies and increase difficulty.
        this.score += 500;
        this.initLevel(this.level);
    }
    
    endGame(won) {
        this.gameRunning = false;
        const gameOverDiv = document.getElementById('gameOver');
        const title = document.getElementById('gameOverTitle');
        const text = document.getElementById('gameOverText');
        
        if (won) {
            title.textContent = 'You Win!';
            text.textContent = `Final Score: ${this.score}\nLevel: ${this.level}\nCoins: ${this.coins}`;
        } else {
            title.textContent = 'Game Over';
            text.textContent = `Final Score: ${this.score}\nLevel Reached: ${this.level}\nCoins: ${this.coins}`;
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

        // Optional elements (may be removed from UI)
        const comboEl = document.getElementById('combo');
        if (comboEl) comboEl.textContent = this.enemies.length;

        const enemiesEl = document.getElementById('enemies');
        if (enemiesEl) enemiesEl.textContent = this.enemies.length;

        const powerEl = document.getElementById('power');
        if (powerEl) {
            if (this.player.attackMultiplier > 1 && this.player.powerTimer > 0) {
                powerEl.textContent = `Attack Boost (${Math.ceil(this.player.powerTimer)}s)`;
            } else {
                powerEl.textContent = 'None';
            }
        }

        // Coins HUD
        const coinsEl = document.getElementById('coins');
        if (coinsEl) coinsEl.textContent = this.coins;
    }
    
    draw() {
        this.ctx.save();
        
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

        // Draw powerups
        this.powerups.forEach(pu => pu.draw(this.ctx));

        // Draw coins
        this.coinPickups.forEach(c => c.draw(this.ctx));

        this.ctx.restore();

        // Spider spawn countdown display (UI stays fixed on screen)
        if (this.spiderSpawnPending) {
            // Show remaining seconds (use 0 if already spawned) so the UI can display 3,2,1,0
            const t = this.spiderSpawnPending.spawned ? 0 : Math.ceil(this.spiderSpawnPending.timer);
            this.ctx.fillStyle = 'rgba(0,0,0,0.65)';
            this.ctx.fillRect(this.canvas.width / 2 - 120, 16, 240, 36);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Spiders arriving: ${t}s`, this.canvas.width / 2, 44);
        }
        
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
