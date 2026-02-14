import { CELL_SIZE, PARTICLE_COUNT, PARTICLE_RADIUS, PARTICLE_PROPS } from "./config";

const PRESETS = [
  { damping: 0.001, attraction: 0.3, repel: 0.1, gravity: 0.5 },
  { damping: 0.001, attraction: 3, repel: 0, gravity: -1 },
  { damping: 0.05, attraction: 3, repel: 0.05, gravity: 0 },
  { damping: 0.05, attraction: 3, repel: 0.2, gravity: 4 },
  { damping: 0.1, attraction: 3, repel: 0.2, gravity: 8 },
  { damping: 0.3, attraction: 0.1, repel: 0.2, gravity: 12 },
  { damping: 0.05, attraction: 0.3, repel: 0.1, gravity: 16 },
  { damping: 0.05, attraction: 3, repel: 0.08, gravity: 20 },
];

let damping = 0;
let attraction = 0;
let repel = 0;
let gravity = 0;

window.setPreset = currentPreset => {
  damping = PRESETS[currentPreset].damping;
  attraction = PRESETS[currentPreset].attraction;
  repel = PRESETS[currentPreset].repel;
  gravity = PRESETS[currentPreset].gravity;
};
setPreset(0);

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const frameTimeElement = document.getElementById('frame-time');
const speedElement = document.getElementById('speed');

let gridCols = 0;
let gridRows = 0;
let gridHeads;
let nextParticle = new Int32Array(PARTICLE_COUNT);

function rebuildGrid() {
  gridHeads.fill(-1);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const cx = (px[i] / CELL_SIZE) | 0;
    const cy = (py[i] / CELL_SIZE) | 0;

    const cellIndex = cy * gridCols + cx;

    nextParticle[i] = gridHeads[cellIndex];
    gridHeads[cellIndex] = i;
  }
}

function forEachNeighborPair(fn) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const cx = (px[i] / CELL_SIZE) | 0;
    const cy = (py[i] / CELL_SIZE) | 0;

    for (let gy = cy - 1; gy <= cy + 1; gy++) {
      if (gy < 0 || gy >= gridRows) continue;

      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        if (gx < 0 || gx >= gridCols) continue;

        let p = gridHeads[gy * gridCols + gx];

        while (p !== -1) {
          if (p > i) {
            const dx = px[p] - px[i];
            const dy = py[p] - py[i];

            if (dx * dx + dy * dy <= CELL_SIZE * CELL_SIZE) {
              fn(i, p, dx, dy);
            }
          }

          p = nextParticle[p];
        }
      }
    }
  }
}

function interactParticles() {
  forEachNeighborPair((i, j, dx, dy) => {
    const d2 = dx * dx + dy * dy;

    if (d2 < PARTICLE_RADIUS * PARTICLE_RADIUS * 4) {
      const force = -repel;
      const fx = dx * force;
      const fy = dy * force;
      vx[i] += fx; vy[i] += fy;
      vx[j] -= fx; vy[j] -= fy;
      return;
    }

    const ti = particleTypes[i] | 0;
    const tj = particleTypes[j] | 0;

    // Directional coefficients:
    // i experiencing force due to j, and j due to i
    const cij = PARTICLE_PROPS[ti][tj + 1];
    const cji = PARTICLE_PROPS[tj][ti + 1];

    // Base magnitude
    const base = attraction / d2;

    // Apply per-particle coefficient (directional)
    const fi = base * cij;
    const fj = base * cji;

    // Force on i points toward j: (dx, dy) * fi
    // Force on j points toward i: (-dx, -dy) * fj  == (dx, dy) * (-fj)
    const fxI = dx * fi;
    const fyI = dy * fi;

    const fxJ = dx * fj;
    const fyJ = dy * fj;

    vx[i] += fxI; vy[i] += fyI;
    vx[j] -= fxJ; vy[j] -= fyJ;
  });
}


const spriteCache = new Map();
function getSprite(particleType, speedBucket, r) {
  const key = `${particleType}:${speedBucket}:${r}`;
  let c = spriteCache.get(key);
  if (c) return c;

  c = document.createElement("canvas");
  const size = (r + 2 + 10) * 2;
  c.width = c.height = size;

  const g = c.getContext("2d");
  g.translate(size / 2, size / 2);

  const a = Math.sqrt(speedBucket) * 7 + 10;
  g.fillStyle = `hsl(${PARTICLE_PROPS[particleType][0]}, 100%, ${a}%)`;
  g.shadowBlur = 5;
  g.shadowColor = g.fillStyle;
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fill();

  spriteCache.set(key, c);
  return c;
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  ctx.fillStyle = "rgb(20, 15, 11)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  gridCols = Math.ceil(canvas.width / CELL_SIZE);
  gridRows = Math.ceil(canvas.height / CELL_SIZE);

  gridHeads = new Int32Array(gridCols * gridRows);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// positions
const px = new Float32Array(PARTICLE_COUNT);
const py = new Float32Array(PARTICLE_COUNT);

// velocities
const vx = new Float32Array(PARTICLE_COUNT);
const vy = new Float32Array(PARTICLE_COUNT);

// other
const particleTypes = new Int8Array(PARTICLE_COUNT);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  px[i] = Math.random() * canvas.width;
  py[i] = Math.random() * canvas.height;

  // const angle = Math.random() * Math.PI * 2;
  // const s = 0.5 + Math.random() * 0.5;

  // vx[i] = Math.cos(angle) * s;
  // vy[i] = Math.sin(angle) * s;

  particleTypes[i] = Math.floor(Math.random() * PARTICLE_PROPS.length);
}

function updateParticles() {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const dx = px[i] - canvas.width / 2;
    const dy = py[i] - canvas.height / 2;
    const d2 = dx * dx + dy * dy + 0.001;
    if (d2 > 20000) {
      vx[i] -= 2 * gravity / d2 * dx;
      vy[i] -= 2 * gravity / d2 * dy;
    }

    vx[i] /= 1 + damping;
    vy[i] /= 1 + damping;

    px[i] += vx[i];
    py[i] += vy[i];

    if (px[i] <= PARTICLE_RADIUS) {
      px[i] = PARTICLE_RADIUS;
      vx[i] *= -1;
    } else if (px[i] >= canvas.width - PARTICLE_RADIUS) {
      px[i] = canvas.width - PARTICLE_RADIUS;
      vx[i] *= -1;
    }

    if (py[i] <= PARTICLE_RADIUS) {
      py[i] = PARTICLE_RADIUS;
      vy[i] *= -1;
    } else if (py[i] >= canvas.height - PARTICLE_RADIUS) {
      py[i] = canvas.height - PARTICLE_RADIUS;
      vy[i] *= -1;
    }
  }
}

function drawParticles(ctx) {
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const particleType = particleTypes[i];
    const speedBucket = Math.min(vx[i] * vx[i] + vy[i] * vy[i], 99) | 0;

    const s = getSprite(particleType, speedBucket, PARTICLE_RADIUS);

    ctx.drawImage(
      s,
      px[i] - s.width / 2,
      py[i] - s.height / 2
    );
  }
}

let fpsRefreshCounter = 0;
let startTime = new Date().getTime();
function animate() {
  ctx.fillStyle = "rgb(17, 13, 9, 0.3)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalCompositeOperation = "lighter";

  updateParticles();
  rebuildGrid();
  interactParticles();
  drawParticles(ctx);

  ctx.globalCompositeOperation = "source-over";
  requestAnimationFrame(animate);

  if (fpsRefreshCounter >= 50) {
    frameTimeElement.textContent = (new Date().getTime() - startTime) / 50;
    speedElement.innerHTML = `
damping: ${damping}<br />
attraction: ${attraction}<br />
repel: ${repel}<br />
gravity: ${gravity}<br />
`;

    startTime = new Date().getTime();
    fpsRefreshCounter = 0;
  }
  fpsRefreshCounter++;
}

ctx.fillStyle = "rgb(20, 15, 11)";
ctx.fillRect(0, 0, canvas.width, canvas.height);
animate();

setInterval(() => {
  setPreset(Math.floor(Math.random() * PRESETS.length));
}, 2450);

