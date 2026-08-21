export const MODE = {
  CUBE: 'cube',
  SHIP: 'ship',
  BALL: 'ball',
  UFO: 'ufo',
  WAVE: 'wave'
};

export const OBJECTS = {
  SPIKE: 'spike',
  DOUBLE: 'doubleSpike',
  BLOCK: 'block',
  PLATFORM: 'platform',
  SAW: 'saw',
  PAD: 'pad',
  RING: 'ring',
  GRAVITY_RING: 'gravityRing',
  MODE_PORTAL: 'modePortal',
  GRAVITY_PORTAL: 'gravityPortal',
  SPEED_PORTAL: 'speedPortal',
  MINI_PORTAL: 'miniPortal',
  DUAL_PORTAL: 'dualPortal'
};

export const WORLD = {
  H: 320,
  FLOOR: 0,
  CEILING: 288,
  WARNING: 248,
  SPEED_MIN: 120,
  SPEED_MAX: 900,
  SHIP_THRUST: 1150,
  SHIP_DESCENT: 700,
  SHIP_MAX_VY: 500,
  CUBE_JUMP: 650,
  UFO_IMPULSE: 600,
  GRAVITY: 1800,
  WAVE_SPEED: 430,
  PORTAL_GRACE: 0.16
};

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

function overlap(a, b) {
  return a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
}

function hitbox(p) {
  const inset = Math.max(4, p.size * 0.12);
  return {
    x: p.x + inset,
    y: p.y + inset,
    w: Math.max(2, p.size - inset * 2),
    h: Math.max(2, p.size - inset * 2)
  };
}

function makePlayer(id) {
  return {
    id,
    x: 100,
    y: WORLD.FLOOR,
    size: 34,
    vy: 0,
    gravity: 1,
    mode: MODE.CUBE,
    onGround: true,
    alive: true,
    hold: false,
    inputBuffer: 0,
    mini: false,
    rotation: 0,
    portalGrace: 0
  };
}

export class GameEngine {
  constructor(level) {
    this.level = level;
    this.resetState();
  }

  resetState() {
    this.players = [makePlayer(0)];
    this.speed = clamp(Number(this.level.speed) || 285, WORLD.SPEED_MIN, WORLD.SPEED_MAX);
    this.running = false;
    this.completed = false;
    this.crashed = false;
    this.checkpoint = null;
    this.checkpoints = [];
    this.triggered = new Set();
    this.actions = new Set();
  }

  reset(startX = 100, preserve = false) {
    const checkpoint = preserve ? this.checkpoint : null;
    const checkpoints = preserve ? [...this.checkpoints] : [];

    this.players = [makePlayer(0)];
    const player = this.players[0];

    player.x = Math.max(100, startX);
    player.y = WORLD.FLOOR;
    player.vy = 0;
    player.gravity = 1;
    player.mode = MODE.CUBE;
    player.onGround = true;
    player.alive = true;
    player.hold = false;
    player.inputBuffer = 0;
    player.mini = false;
    player.size = 34;
    player.portalGrace = 0;

    this.speed = clamp(Number(this.level.speed) || 285, WORLD.SPEED_MIN, WORLD.SPEED_MAX);
    this.running = true;
    this.completed = false;
    this.crashed = false;
    this.triggered.clear();
    this.actions.clear();
    this.checkpoint = checkpoint;
    this.checkpoints = checkpoints;
  }

  inputDown() {
    if (!this.running) return;

    for (const player of this.players) {
      player.inputBuffer = 0.10;

      if (player.mode === MODE.CUBE) {
        if (player.onGround) {
          player.vy = WORLD.CUBE_JUMP * player.gravity;
          player.onGround = false;
          player.inputBuffer = 0;
        }
      } else if (player.mode === MODE.BALL) {
        if (player.onGround) {
          player.gravity *= -1;
          player.vy = 0;
          player.onGround = false;
          player.inputBuffer = 0;
        }
      } else if (player.mode === MODE.UFO) {
        player.vy = WORLD.UFO_IMPULSE * player.gravity;
        player.onGround = false;
        player.inputBuffer = 0;
      } else if (player.mode === MODE.SHIP || player.mode === MODE.WAVE) {
        player.hold = true;
      }
    }
  }

  release() {
    for (const player of this.players) {
      player.hold = false;
    }
  }

  step(dt) {
    if (!this.running) return;

    const previousX = this.players[0]?.x ?? 100;

    for (const player of this.players) {
      if (!player.alive) continue;
      player.inputBuffer = Math.max(0, player.inputBuffer - dt);
      player.portalGrace = Math.max(0, player.portalGrace - dt);
      player.x += this.speed * dt;
    }

    this.processPortals(previousX, this.players[0]?.x ?? previousX);

    for (const player of this.players) {
      if (!player.alive) continue;

      this.updateVertical(player, dt);

      if (!this.resolveWorldAndSolids(player)) {
        this.crash();
        return;
      }

      this.processPadsAndRings(player);

      if (!this.checkHazards(player)) {
        this.crash();
        return;
      }
    }

    this.syncDual();

    if (this.players[0].x >= this.level.length) {
      this.running = false;
      this.completed = true;
    }
  }

  updateVertical(player, dt) {
    if (player.portalGrace > 0 &&
        (player.mode === MODE.SHIP || player.mode === MODE.UFO || player.mode === MODE.WAVE)) {
      player.onGround = false;
      return;
    }

    if (player.mode === MODE.WAVE) {
      const direction = player.hold ? 1 : -1;
      player.y += direction *
        player.gravity *
        WORLD.WAVE_SPEED *
        (player.mini ? 2 : 1) *
        dt;
      player.onGround = false;
      return;
    }

    if (player.mode === MODE.SHIP) {
      const target = player.hold ? WORLD.SHIP_MAX_VY : -WORLD.SHIP_MAX_VY;
      const rate = player.hold ? WORLD.SHIP_THRUST : WORLD.SHIP_DESCENT;

      if (player.vy < target) {
        player.vy = Math.min(target, player.vy + player.gravity * rate * dt);
      } else if (player.vy > target) {
        player.vy = Math.max(target, player.vy - player.gravity * rate * dt);
      }

      player.vy = clamp(player.vy, -WORLD.SHIP_MAX_VY, WORLD.SHIP_MAX_VY);
      player.y += player.vy * dt;
      return;
    }

    const acceleration = player.mode === MODE.UFO
      ? -player.gravity * 1450
      : -player.gravity * WORLD.GRAVITY;

    player.vy = clamp(player.vy + acceleration * dt, -900, 900);
    player.y += player.vy * dt;
  }

  resolveWorldAndSolids(player) {
    if (player.mode === MODE.SHIP || player.mode === MODE.UFO || player.mode === MODE.WAVE) {
      return player.y >= WORLD.FLOOR && player.y + player.size <= WORLD.CEILING;
    }

    const box = hitbox(player);
    let landed = false;

    for (const object of this.solids()) {
      if (box.x + box.w <= object.x || box.x >= object.x + object.w) continue;

      if (player.gravity > 0) {
        const top = object.y + object.h;
        if (player.y <= top &&
            player.y >= top - player.size - 5 &&
            player.vy <= 0) {
          player.y = top;
          player.vy = 0;
          player.onGround = true;
          landed = true;
        }
      } else {
        const bottom = object.y;
        if (player.y + player.size >= bottom &&
            player.y + player.size <= bottom + player.size + 5 &&
            player.vy >= 0) {
          player.y = bottom - player.size;
          player.vy = 0;
          player.onGround = true;
          landed = true;
        }
      }
    }

    if (player.gravity > 0 && player.y <= WORLD.FLOOR) {
      player.y = WORLD.FLOOR;
      player.vy = 0;
      player.onGround = true;
      landed = true;
    }

    if (player.gravity < 0 && player.y + player.size >= WORLD.CEILING) {
      player.y = WORLD.CEILING - player.size;
      player.vy = 0;
      player.onGround = true;
      landed = true;
    }

    if (landed) return true;

    if (player.y < WORLD.FLOOR || player.y + player.size > WORLD.CEILING) {
      return false;
    }

    for (const object of this.solids()) {
      if (!overlap(hitbox(player), object)) continue;

      const current = hitbox(player);
      const topContact = player.gravity > 0 &&
        Math.abs(current.y - (object.y + object.h)) < 5;
      const bottomContact = player.gravity < 0 &&
        Math.abs(current.y + current.h - object.y) < 5;

      if (!topContact && !bottomContact) return false;
    }

    return true;
  }

  solids() {
    return (this.level.objects || []).filter(object =>
      object.type === OBJECTS.BLOCK || object.type === OBJECTS.PLATFORM);
  }

  hazards() {
    return (this.level.objects || []).filter(object =>
      object.type === OBJECTS.SPIKE || object.type === OBJECTS.DOUBLE || object.type === OBJECTS.SAW);
  }

  checkHazards(player) {
    if (player.portalGrace > 0) return true;

    const box = hitbox(player);

    for (const object of this.hazards()) {
      if (object.type === OBJECTS.SAW) {
        const centerX = object.x + object.w / 2;
        const centerY = object.y + object.h / 2;
        const dx = box.x + box.w / 2 - centerX;
        const dy = box.y + box.h / 2 - centerY;
        const radius = object.w / 2 + box.w * 0.45;

        if (dx * dx + dy * dy < radius * radius) return false;
        continue;
      }

      const count = object.type === OBJECTS.DOUBLE ? 2 : 1;

      for (let i = 0; i < count; i++) {
        const hazard = {
          x: object.x + i * 40 + 5,
          y: object.y,
          w: Math.min(30, object.w - 8),
          h: object.h
        };

        if (overlap(box, hazard)) return false;
      }
    }

    return true;
  }

  processPortals(previousX, currentX) {
    for (const object of this.level.objects || []) {
      const portalTypes = [
        OBJECTS.MODE_PORTAL,
        OBJECTS.GRAVITY_PORTAL,
        OBJECTS.SPEED_PORTAL,
        OBJECTS.MINI_PORTAL,
        OBJECTS.DUAL_PORTAL
      ];

      if (!portalTypes.includes(object.type)) continue;
      if (!(previousX < object.x && currentX >= object.x)) continue;

      const key = `${object.type}:${object.x}:${object.y}`;
      if (this.triggered.has(key)) continue;
      this.triggered.add(key);

      if (object.type === OBJECTS.MODE_PORTAL) {
        for (const player of this.players) {
          player.mode = object.mode || MODE.CUBE;
          player.vy = 0;
          player.onGround = false;
          player.inputBuffer = 0;
          player.hold = false;
          player.portalGrace = WORLD.PORTAL_GRACE;
          player.size = player.mini ? 24 : 34;

          if (player.mode === MODE.SHIP) {
            player.y = clamp(player.y, 90, WORLD.CEILING - player.size - 60);
            if (player.y < 110) player.y = 145;
          } else if (player.mode === MODE.UFO) {
            player.y = clamp(player.y, 80, WORLD.CEILING - player.size - 70);
            if (player.y < 100) player.y = 145;
          } else if (player.mode === MODE.WAVE) {
            player.y = clamp(player.y, 80, WORLD.CEILING - player.size - 80);
            if (player.y < 100) player.y = 145;
          } else {
            player.y = clamp(player.y, WORLD.FLOOR, WORLD.CEILING - player.size);
          }
        }
      } else if (object.type === OBJECTS.GRAVITY_PORTAL) {
        for (const player of this.players) {
          player.gravity *= -1;
          player.vy = 0;
          player.onGround = false;
          player.portalGrace = 0.08;
        }
      } else if (object.type === OBJECTS.SPEED_PORTAL) {
        this.speed = clamp(Number(object.speed) || this.speed, WORLD.SPEED_MIN, WORLD.SPEED_MAX);
      } else if (object.type === OBJECTS.MINI_PORTAL) {
        for (const player of this.players) {
          player.mini = !player.mini;
          player.size = player.mini ? 24 : 34;
          player.y = clamp(player.y, WORLD.FLOOR, WORLD.CEILING - player.size);
          player.portalGrace = 0.08;
        }
      } else if (object.type === OBJECTS.DUAL_PORTAL) {
        this.toggleDual();
      }
    }
  }

  processPadsAndRings(player) {
    if (player.mode === MODE.WAVE || player.portalGrace > 0) return;

    const box = hitbox(player);

    for (const object of this.level.objects || []) {
      if (!overlap(box, object)) continue;

      const key = `${object.type}:${object.x}:${object.y}:${player.id}`;
      if (this.actions.has(key)) continue;

      if (object.type === OBJECTS.PAD) {
        const touchingSurface = player.onGround;
        const descending = player.gravity > 0 ? player.vy < 0 : player.vy > 0;

        if (touchingSurface || descending) {
          player.vy = player.gravity * 760;
          player.onGround = false;
          this.actions.add(key);
        }
      }

      if (object.type === OBJECTS.RING || object.type === OBJECTS.GRAVITY_RING) {
        if (player.inputBuffer <= 0) continue;

        if (object.type === OBJECTS.RING) {
          player.vy = player.gravity * 700;
        } else {
          player.gravity *= -1;
          player.vy = 0;
          player.onGround = false;
        }

        player.inputBuffer = 0;
        this.actions.add(key);
      }
    }

    player.inputBuffer = 0;
  }

  toggleDual() {
    if (this.players.length === 2) {
      this.players.pop();
      return;
    }

    const first = this.players[0];
    const second = makePlayer(1);

    second.x = first.x;
    second.mode = first.mode;
    second.gravity = -first.gravity;
    second.size = first.size;
    second.mini = first.mini;
    second.y = clamp(WORLD.CEILING - first.y - first.size, WORLD.FLOOR, WORLD.CEILING - second.size);
    second.portalGrace = WORLD.PORTAL_GRACE;

    this.players.push(second);
  }

  syncDual() {
    if (this.players.length !== 2) return;

    const first = this.players[0];
    const second = this.players[1];

    second.x = first.x;
    second.mode = first.mode;
    second.gravity = -first.gravity;
    second.size = first.size;
    second.mini = first.mini;
    second.y = clamp(WORLD.CEILING - first.y - first.size, WORLD.FLOOR, WORLD.CEILING - second.size);
  }

  checkpoint() {
    if (!this.running) return;

    const x = Math.floor(this.players[0].x / 100) * 100;

    if (!this.checkpoints.includes(x)) {
      this.checkpoints.push(x);
    }

    this.checkpoint = x;
  }

  crash() {
    this.running = false;
    this.crashed = true;

    for (const player of this.players) {
      player.alive = false;
    }
  }

  getProgress() {
    return clamp(
      (this.players[0].x - 100) / Math.max(1, this.level.length - 100),
      0,
      1
    );
  }
}
