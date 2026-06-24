// ─── Canvas Setup ───────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const W = canvas.width;   // 400
const H = canvas.height;  // 700

// ─── Lane Configuration ─────────────────────────────────────
const LANE_COUNT = 3;
const LANE_WIDTH = 100;
const ROAD_LEFT = (W - LANE_COUNT * LANE_WIDTH) / 2; // 50
const LANE_CENTERS = [];
for (let i = 0; i < LANE_COUNT; i++) {
  LANE_CENTERS.push(ROAD_LEFT + LANE_WIDTH * i + LANE_WIDTH / 2);
}

// ─── Game State ─────────────────────────────────────────────
let state = "menu"; // menu | playing | gameover
let score = 0;
let highScore = parseInt(localStorage.getItem("trafficDodgerHigh") || "0");
const TRAFFIC_DRIVING_SPEED = 2; // Constant speed for all traffic cars
let speed = 8;          // starting road speed
let spawnTimer = 0;
let spawnInterval = 35; // frames between spawns
let frameCount = 0;

// ─── Player ─────────────────────────────────────────────────
const player = {
  lane: 1,           // 0 = left (A), 1 = center (S), 2 = right (D)
  w: 50,
  h: 90,
  get x() { return LANE_CENTERS[this.lane] - this.w / 2; },
  y: H - 130,
  color: "#e60012",
  targetLane: 1,
  visualX: LANE_CENTERS[1] - 25,
};

// ─── Traffic (enemies) ──────────────────────────────────────
let traffic = [];

function pickWeightedLane() {
  // 50% chance middle, 25% left, 25% right
  const r = Math.random();
  if (r < 0.25) return 0;
  if (r < 0.75) return 1;
  return 2;
}

function spawnCar() {
  const roll = Math.random();

  // 15% chance roadblock (after score 10)
  if (score >= 10 && roll < 0.15) {
    spawnRoadblock();
    return;
  }
  // 20% chance semi truck (after score 5)
  if (score >= 5 && roll < 0.35) {
    spawnSemiTruck();
    return;
  }

  const lane = pickWeightedLane();
  const colors = ["#e94560", "#ff9a3c", "#fff200", "#a855f7", "#22c55e"];
  traffic.push({
    type: "car",
    lane,
    x: LANE_CENTERS[lane] - 25,
    y: -100,
    w: 50,
    h: 90,
    color: colors[Math.floor(Math.random() * colors.length)],
  });
}

function spawnSemiTruck() {
  const lane = pickWeightedLane();
  const truckColors = ["#3b5998", "#555", "#8B4513", "#2e8b57", "#b22222"];
  traffic.push({
    type: "truck",
    lane,
    x: LANE_CENTERS[lane] - 28,
    y: -200,
    w: 56,
    h: 160,
    color: truckColors[Math.floor(Math.random() * truckColors.length)],
  });
}

function spawnRoadblock() {
  // Pick two adjacent lanes
  const startLane = Math.random() < 0.5 ? 0 : 1;
  const x1 = LANE_CENTERS[startLane] - LANE_WIDTH / 2 + 5;
  const totalW = LANE_WIDTH * 2 - 10;
  traffic.push({
    type: "roadblock",
    lane: -1,
    x: x1,
    y: -80,
    w: totalW,
    h: 30,
    color: "#ff6600",
  });
}

// ─── Road‑line stripes ──────────────────────────────────────
let stripeOffset = 0;

// ─── Input ──────────────────────────────────────────────────
const keys = {};
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (keys[k]) return; // prevent repeat
  keys[k] = true;

  if (state === "menu" || state === "gameover") {
    if (k === "a" || k === "s" || k === "d") {
      startGame();
    }
    return;
  }

  if (state === "playing") {
    if (k === "a" && player.lane > 0) player.lane--;
    if (k === "d" && player.lane < LANE_COUNT - 1) player.lane++;
    if (k === "s") player.lane = 1;
  }
});
document.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ─── Start / Reset ─────────────────────────────────────────
function startGame() {
  state = "playing";
  score = 0;
  speed = 8;
  spawnInterval = 35;
  spawnTimer = 0;
  frameCount = 0;
  traffic = [];
  particles = [];
  player.lane = 1;
  player.visualX = LANE_CENTERS[1] - player.w / 2;

  // Change car color every start
  const raceColors = ["#e60012", "#00d2ff", "#22c55e", "#fff200", "#a855f7", "#ffffff", "#ff9a3c"];
  player.color = raceColors[Math.floor(Math.random() * raceColors.length)];
}

// ─── Collision Detection ────────────────────────────────────
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ─── Drawing Helpers ────────────────────────────────────────
function drawRoad() {
  // Grass
  ctx.fillStyle = "#2d6a4f";
  ctx.fillRect(0, 0, ROAD_LEFT, H);
  ctx.fillRect(ROAD_LEFT + LANE_COUNT * LANE_WIDTH, 0, W, H);

  // Road surface
  ctx.fillStyle = "#333";
  ctx.fillRect(ROAD_LEFT, 0, LANE_COUNT * LANE_WIDTH, H);

  // Road edges
  ctx.fillStyle = "#fff";
  ctx.fillRect(ROAD_LEFT - 4, 0, 4, H);
  ctx.fillRect(ROAD_LEFT + LANE_COUNT * LANE_WIDTH, 0, 4, H);

  // Lane dashes
  stripeOffset = (stripeOffset + speed) % 40;
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  ctx.lineDashOffset = -stripeOffset;
  for (let i = 1; i < LANE_COUNT; i++) {
    const lx = ROAD_LEFT + LANE_WIDTH * i;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx, H);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCar(x, y, w, h, bodyColor, isPlayer) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 4, y + 4, w, h);

  if (isPlayer) {
    drawRaceCar(x, y, w, h, bodyColor);
  } else {
    drawTrafficCar(x, y, w, h, bodyColor);
  }
}

function drawRaceCar(x, y, w, h, color) {
  const cx = x + w / 2;

  // ── Main body (rounded front, wide rear) ──
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 14);
  // rounded hood
  ctx.quadraticCurveTo(x + 10, y, cx, y);
  ctx.quadraticCurveTo(x + w - 10, y, x + w - 10, y + 14);
  // sides widen out
  ctx.lineTo(x + w - 4, y + 24);
  ctx.lineTo(x + w, y + 34);
  ctx.lineTo(x + w, y + h - 8);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 8, y + h);
  ctx.lineTo(x + 8, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 8);
  ctx.lineTo(x, y + 34);
  ctx.lineTo(x + 4, y + 24);
  ctx.closePath();
  ctx.fill();

  // ── Darker side panels ──
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x, y + 30, 6, h - 40);
  ctx.fillRect(x + w - 6, y + 30, 6, h - 40);

  // ── Front windshield ──
  ctx.fillStyle = "rgba(160,220,255,0.85)";
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 16);
  ctx.lineTo(x + w - 8, y + 16);
  ctx.lineTo(x + w - 6, y + 30);
  ctx.lineTo(x + 6, y + 30);
  ctx.closePath();
  ctx.fill();
  // windshield glare
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.beginPath();
  ctx.moveTo(x + 10, y + 17);
  ctx.lineTo(x + 20, y + 17);
  ctx.lineTo(x + 16, y + 26);
  ctx.lineTo(x + 8, y + 26);
  ctx.closePath();
  ctx.fill();

  // ── Roof (darker shade) ──
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  roundRect(x + 7, y + 31, w - 14, 22, 4);

  // ── Rear windshield ──
  ctx.fillStyle = "rgba(160,220,255,0.75)";
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 54);
  ctx.lineTo(x + w - 7, y + 54);
  ctx.lineTo(x + w - 5, y + 64);
  ctx.lineTo(x + 5, y + 64);
  ctx.closePath();
  ctx.fill();

  // ── Headlights (front) ──
  ctx.fillStyle = "#ffe066";
  roundRect(x + 5, y + 6, 9, 6, 2);
  roundRect(x + w - 14, y + 6, 9, 6, 2);

  // ── Tail lights (rear) ──
  ctx.fillStyle = "#ff2222";
  roundRect(x + 3, y + h - 8, 10, 6, 2);
  roundRect(x + w - 13, y + h - 8, 10, 6, 2);

  // ── Rear bumper ──
  ctx.fillStyle = "#222";
  roundRect(x + 2, y + h - 3, w - 4, 3, 1);

  // ── Front grille ──
  ctx.fillStyle = "#111";
  roundRect(x + 14, y + 2, w - 28, 5, 2);

  // ── Side mirrors ──
  ctx.fillStyle = color;
  ctx.fillRect(x - 5, y + 28, 7, 5);
  ctx.fillRect(x + w - 2, y + 28, 7, 5);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 5, y + 28, 7, 5);
  ctx.strokeRect(x + w - 2, y + 28, 7, 5);

  // ── Center racing stripe ──
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillRect(cx - 3, y + 2, 6, 13);
  ctx.fillRect(cx - 3, y + 65, 6, h - 68);
}

function drawTrafficCar(x, y, w, h, color) {
  // Body
  ctx.fillStyle = color;
  roundRect(x, y, w, h, 8);

  // Windshield (front)
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  roundRect(x + 8, y + 10, w - 16, 22, 4);

  // Headlights (front - at the top)
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(x + 5, y, 8, 5);
  ctx.fillRect(x + w - 13, y, 8, 5);

  // Tail lights (rear - at the bottom)
  ctx.fillStyle = "#ff3333";
  ctx.fillRect(x + 5, y + h - 5, 8, 5);
  ctx.fillRect(x + w - 13, y + h - 5, 8, 5);
}

function drawSemiTruck(x, y, w, h, color) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 4, y + 4, w, h);

  // Cab (front section - TOP)
  ctx.fillStyle = color;
  roundRect(x, y, w, h * 0.32, 6);

  // Cab windshield
  ctx.fillStyle = "rgba(180,220,255,0.7)";
  roundRect(x + 6, y + 4, w - 12, h * 0.08, 3);

  // Connection between trailer and cab
  ctx.fillStyle = "#333";
  ctx.fillRect(x + 8, y + h * 0.3, w - 16, 8);

  // Trailer (back section - BOTTOM)
  ctx.fillStyle = color;
  roundRect(x + 2, y + h * 0.35, w - 4, h * 0.65, 4);

  // Trailer panel lines
  ctx.strokeStyle = "rgba(0,0,0,0.2)";
  ctx.lineWidth = 1;
  for (let ly = y + h * 0.42; ly < y + h * 0.95; ly += 14) {
    ctx.beginPath();
    ctx.moveTo(x + 6, ly);
    ctx.lineTo(x + w - 6, ly);
    ctx.stroke();
  }

  // Headlights (front)
  ctx.fillStyle = "#ffe066";
  ctx.fillRect(x + 3, y, 8, 5);
  ctx.fillRect(x + w - 11, y, 8, 5);

  // Tail lights (rear)
  ctx.fillStyle = "#ff3333";
  ctx.fillRect(x + 3, y + h - 5, 10, 5);
  ctx.fillRect(x + w - 13, y + h - 5, 10, 5);

  // Wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(x - 3, y + h * 0.15, 6, 10);
  ctx.fillRect(x + w - 3, y + h * 0.15, 6, 10);
  ctx.fillRect(x - 3, y + h - 14, 6, 10);
  ctx.fillRect(x + w - 3, y + h - 14, 6, 10);
}

function drawRoadblock(x, y, w, h) {
  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(x + 3, y + 3, w, h);

  // Main barrier
  ctx.fillStyle = "#ff6600";
  roundRect(x, y, w, h, 4);

  // Warning stripes
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = "#fff";
  const stripeW = 18;
  for (let sx = x - h; sx < x + w; sx += stripeW * 2) {
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + h, y);
    ctx.lineTo(sx + h + stripeW, y);
    ctx.lineTo(sx + stripeW, y + h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Reflectors on ends
  ctx.fillStyle = "#ff0000";
  roundRect(x + 4, y + h / 2 - 4, 8, 8, 2);
  roundRect(x + w - 12, y + h / 2 - 4, 8, 8, 2);
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ─── Particles (crash effect) ───────────────────────────────
let particles = [];

function spawnExplosion(x, y) {
  for (let i = 0; i < 30; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 40 + Math.random() * 20,
      size: 3 + Math.random() * 5,
      color: ["#e94560", "#ff9a3c", "#fff200", "#fff"][Math.floor(Math.random() * 4)],
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life / 60;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ─── HUD ────────────────────────────────────────────────────
function drawHUD() {
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`Score: ${score}`, 10, 30);
  ctx.textAlign = "right";
  ctx.fillText(`Best: ${highScore}`, W - 10, 30);
  ctx.fillStyle = "#ffe066";
  ctx.font = "14px 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(`${Math.floor(speed * 30)} km/h`, 10, 52);

  // Lane labels at bottom
  ctx.font = "bold 16px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = player.lane === 0 ? "#00d2ff" : "#555";
  ctx.fillText("◄ A", LANE_CENTERS[0], H - 15);
  ctx.fillStyle = player.lane === 1 ? "#00d2ff" : "#555";
  ctx.fillText("●", LANE_CENTERS[1], H - 15);
  ctx.fillStyle = player.lane === 2 ? "#00d2ff" : "#555";
  ctx.fillText("D ►", LANE_CENTERS[2], H - 15);
}

// ─── Screens ────────────────────────────────────────────────
function drawMenu() {
  drawRoad();

  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#00d2ff";
  ctx.font = "bold 42px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("TRAFFIC", W / 2, H / 2 - 80);
  ctx.fillText("DODGER", W / 2, H / 2 - 30);

  ctx.fillStyle = "#fff";
  ctx.font = "18px 'Segoe UI', sans-serif";
  ctx.fillText("A ← Left    D → Right", W / 2, H / 2 + 30);

  ctx.fillStyle = "#e94560";
  ctx.font = "bold 20px 'Segoe UI', sans-serif";
  ctx.fillText("Press A, S, or D to Start", W / 2, H / 2 + 80);

  if (highScore > 0) {
    ctx.fillStyle = "#ffe066";
    ctx.font = "16px 'Segoe UI', sans-serif";
    ctx.fillText(`High Score: ${highScore}`, W / 2, H / 2 + 120);
  }
}

function drawGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "#e94560";
  ctx.font = "bold 44px 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CRASH!", W / 2, H / 2 - 60);

  ctx.fillStyle = "#fff";
  ctx.font = "24px 'Segoe UI', sans-serif";
  ctx.fillText(`Score: ${score}`, W / 2, H / 2);

  if (score >= highScore) {
    ctx.fillStyle = "#ffe066";
    ctx.font = "18px 'Segoe UI', sans-serif";
    ctx.fillText("★ New High Score! ★", W / 2, H / 2 + 35);
  }

  ctx.fillStyle = "#aaa";
  ctx.font = "18px 'Segoe UI', sans-serif";
  ctx.fillText("Press A, S, or D to Retry", W / 2, H / 2 + 80);
}

// ─── Main Loop ──────────────────────────────────────────────
function update() {
  frameCount++;

  // Speed is set based on score milestones
  speed = 8 + Math.floor(score / 5);

  // Dynamic spawn interval based on score
  if (score < 15) {
    spawnInterval = 35;
  } else if (score < 30) {
    spawnInterval = 45;
  } else {
    spawnInterval = 55;
  }

  // Smooth lane sliding
  const targetX = LANE_CENTERS[player.lane] - player.w / 2;
  player.visualX += (targetX - player.visualX) * 0.25;

  // Spawn traffic
  spawnTimer++;
  if (spawnTimer >= spawnInterval) {
    spawnTimer = 0;
    spawnCar();
  }

  // Move traffic & score
  for (let i = traffic.length - 1; i >= 0; i--) {
    const car = traffic[i];
    // Traffic drives in same direction at a constant speed, 
    // roadblocks stay stationary on the road.
    if (car.type === "roadblock") {
      car.y += speed;
    } else {
      car.y += (speed - TRAFFIC_DRIVING_SPEED);
    }

    if (car.y > H) {
      traffic.splice(i, 1);
      score++;
      continue;
    }

    // Collision
    const pBox = { x: player.visualX + 5, y: player.y + 5, w: player.w - 10, h: player.h - 10 };
    const cBox = { x: car.x + 5, y: car.y + 5, w: car.w - 10, h: car.h - 10 };
    if (rectsOverlap(pBox, cBox)) {
      // Game over
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("trafficDodgerHigh", highScore);
      }
      state = "gameover";
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  if (state === "menu") {
    drawMenu();
    return;
  }

  drawRoad();

  // Draw traffic cars, trucks, and roadblocks
  for (const obj of traffic) {
    if (obj.type === "truck") {
      drawSemiTruck(obj.x, obj.y, obj.w, obj.h, obj.color);
    } else if (obj.type === "roadblock") {
      drawRoadblock(obj.x, obj.y, obj.w, obj.h);
    } else {
      drawCar(obj.x, obj.y, obj.w, obj.h, obj.color, false);
    }
  }

  // Draw player
  drawCar(player.visualX, player.y, player.w, player.h, player.color, true);

  drawHUD();

  if (state === "gameover") {
    drawGameOver();
  }
}

function gameLoop() {
  if (state === "playing") {
    update();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
