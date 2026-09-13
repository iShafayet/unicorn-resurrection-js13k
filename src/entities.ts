import {
  RUN_SPEED, GRAVITY, JUMP_VELOCITY, COYOTE_FRAMES, JUMP_BUFFER_FRAMES, BULLET_SPEED, FIRE_RATE,
  IFRAMES, SPILL_FRACTION, DROPLET_LIFE, PIT_STUN, FILL_RATE, FILL_RATE_MIN, PUDDLE_LIFE,
  PUDDLE_LIFE_PER_LOOP, PUDDLE_LIFE_MIN, SPEED_PER_LOOP, SPEED_CAP, RETURN_SPEED_BONUS,
  RETURN_AGGRO, PUDDLE_AMOUNT, PUDDLE_RADIUS, DRAIN_RATE, UNICORN_HP, UNICORN_SPEED, UNICORN_SCALE,
  WALK_SPEED, CHARGE_RANGE, JUMPER_CHARGE_RANGE, REAR_FRAMES, DASH_FRAMES, DASH_SPEED,
  RECOVER_FRAMES, CROUCH_FRAMES, BULLET_DAMAGE, HOP_VELOCITY, HOP_SPEED, LAND_WAIT, SPIT_NEAR,
  SPIT_FAR, SPIT_COOLDOWN, JAW_FRAMES, VOMIT_GRAVITY, VOMIT_ARC, SLIME_WIDTH, SLIME_LIFE,
  KNOCKBACK_X, KNOCKBACK_Y, Phase, Kind, Stance, ACTIVATE_RADIUS, TILE, TILE_ROWS, VIEW_WIDTH,
  PLAYER_WIDTH, PLAYER_HEIGHT, UNICORN_WIDTH, UNICORN_HEIGHT, STARTING_LIVES, SPAWN_GAP,
  SPAWN_PLAYER_CLEAR, MIN_LIVE_UNICORNS, CEILING_ROW,
} from './config';
import { shake } from './graphics/canvas';
import { input } from './input';
import { soundShoot, soundHit, soundUnicornDie, soundBlood, soundHurt, soundPickup, soundDie } from './sfx';
import { sayKill, sayHurt } from './talk';
import { World, Spawn, Body, moveBody, solid, overlaps, pickKind } from './level';

export type Player = Body & {
  face: number;
  coyote: number;
  jumpBuffer: number;
  fireCool: number;
  iframes: number;
  vat: number;
  stunned: number;
  safeX: number;
  safeY: number;
  anim: number;
  aiming: number;
  lives: number;
};

export type Unicorn = Body & {
  kind: number;
  hp: number;
  face: number;
  stance: number;
  timer: number;
  scale: number;
  cooldown: number;
  anim: number;
  dead: number;
};

export type Bullet = { x: number; y: number; vx: number; w: number; h: number };
export type Puddle = { x: number; y: number; r: number; amount: number; maxAmount: number; life: number; maxLife: number };
export type Droplet = { x: number; y: number; vx: number; vy: number; amount: number; life: number; bounced: number; w: number; h: number };
export type Vomit = { x: number; y: number; vx: number; vy: number; w: number; h: number };
export type Slime = { x: number; y: number; w: number; life: number };
export type Mote = { x: number; y: number; vx: number; vy: number; life: number; color: string };

export type Game = {
  player: Player;
  unicorns: Unicorn[];
  bullets: Bullet[];
  puddles: Puddle[];
  droplets: Droplet[];
  vomits: Vomit[];
  slime: Slime[];
  motes: Mote[];
  world: World;
  phase: number;
  loop: number;
  quota: number;
  cameraX: number;
  cameraY: number;
  returning: number;
  hint: number;
  sparks: Mote[];
  kiss: number;
  grief: number;
};

export const createPlayer = (x: number, y: number): Player => ({
  x, y, vx: 0, vy: 0, w: PLAYER_WIDTH, h: PLAYER_HEIGHT, onGround: 1, hitWall: 0,
  face: 1, coyote: 0, jumpBuffer: 0, fireCool: 0, iframes: 0, vat: 0, stunned: 0,
  safeX: x, safeY: y, anim: 0, aiming: 0, lives: STARTING_LIVES,
});

const speedMul = (game: Game, kind: number) =>
  UNICORN_SPEED[kind]
  * (1 + Math.min(SPEED_CAP, SPEED_PER_LOOP * (game.loop - 1)))
  * (game.returning ? 1 + RETURN_SPEED_BONUS : 1);

export const createUnicorn = (spawn: Spawn, game: Game): Unicorn => {
  const scale = UNICORN_SCALE[spawn.kind];
  const w = UNICORN_WIDTH * scale;
  const h = UNICORN_HEIGHT * scale;
  return {
    x: spawn.x, y: spawn.y - h, vx: 0, vy: 0, w, h, onGround: 0, hitWall: 0,
    kind: spawn.kind, hp: UNICORN_HP[spawn.kind], face: -1, stance: Stance.Walk,
    timer: 0, scale, cooldown: SPIT_COOLDOWN / 2, anim: 0, dead: 0,
  };
};

export const burst = (game: Game, x: number, y: number, n: number, color: string, life = 22) => {
  for (let i = 0; i < n; i++) {
    game.motes.push({
      x: x + Math.random() * 8 - 4,
      y: y + Math.random() * 6 - 2,
      vx: Math.random() * 5 - 2.5,
      vy: -Math.random() * 4 - 0.5,
      life: life + (Math.random() * life | 0),
      color,
    });
  }
};

const spillDroplets = (game: Game, x: number, y: number, amount: number) => {
  const n = 4 + (Math.random() * 5 | 0);
  const each = amount / n;
  for (let i = 0; i < n; i++) {
    game.droplets.push({
      x, y, vx: Math.random() * 3 - 1.5, vy: -Math.random() * 2 - 1.5,
      amount: each, life: DROPLET_LIFE, bounced: 0, w: 2, h: 2,
    });
  }
};

export const hurtPlayer = (game: Game, fromX: number) => {
  const player = game.player;
  if (player.iframes > 0 || game.phase === Phase.Die || player.stunned > 0) return;
  if (player.vat > 0) {
    const spill = Math.max(1, player.vat * SPILL_FRACTION);
    player.vat -= spill;
    if (player.vat < 0) player.vat = 0;
    spillDroplets(game, player.x + 3, player.y + 4, spill);
  }
  if (player.lives > 0) {
    const sparkY = 2 + (STARTING_LIVES - player.lives) * 4;
    for (let i = 0; i < 10; i++) {
      game.sparks.push({
        x: 6 + Math.random() * 4 - 2,
        y: sparkY + 1 + Math.random() * 2,
        vx: Math.random() * 2.4 - 1.2,
        vy: -Math.random() * 2.2 - 0.4,
        life: 18 + (Math.random() * 12 | 0),
        color: i & 1 ? '#f4e4c1' : '#c4281c',
      });
    }
    player.lives--;
  } else if (player.vat < 1) {
    game.phase = Phase.Die;
    soundDie();
    return;
  }
  player.vx = fromX < player.x ? KNOCKBACK_X : -KNOCKBACK_X;
  player.vy = KNOCKBACK_Y;
  player.iframes = IFRAMES;
  shake(4, 14);
  soundHurt();
  sayHurt();
};

const puddleLife = (loop: number) => Math.max(PUDDLE_LIFE_MIN, PUDDLE_LIFE - PUDDLE_LIFE_PER_LOOP * (loop - 1));

const killUnicorn = (game: Game, unicorn: Unicorn) => {
  burst(game, unicorn.x + unicorn.w / 2, unicorn.y + unicorn.h / 2, 8, '#1a222c');
  const r = PUDDLE_RADIUS[unicorn.kind] * (unicorn.kind === Kind.Drainer ? DRAIN_RATE : 1);
  let floorY = unicorn.y + unicorn.h;
  while (floorY < TILE_ROWS * TILE && !solid(game.world, unicorn.x + unicorn.w / 2, floorY)) floorY++;
  game.puddles.push({
    x: unicorn.x + unicorn.w / 2,
    y: floorY,
    r,
    amount: PUDDLE_AMOUNT[unicorn.kind],
    maxAmount: PUDDLE_AMOUNT[unicorn.kind],
    life: puddleLife(game.loop),
    maxLife: puddleLife(game.loop),
  });
  soundUnicornDie();
  sayKill();
};

const onSlime = (game: Game, player: Player) => {
  for (const patch of game.slime) {
    if (player.x + player.w > patch.x && player.x < patch.x + patch.w
      && player.y + player.h > patch.y - 4 && player.y + player.h < patch.y + 6) return 1;
  }
  return 0;
};

export const updatePlayer = (game: Game, canControl: number) => {
  const player = game.player;
  if (player.iframes > 0) player.iframes--;
  if (player.stunned > 0) {
    player.stunned--;
    return;
  }
  if (game.phase === Phase.Die) {
    player.vy += GRAVITY;
    player.y += player.vy;
    return;
  }

  const slow = onSlime(game, player);
  const speed = RUN_SPEED * (slow ? 0.5 : 1);

  if (canControl) {
    if (input.left) {
      player.vx = -speed;
      player.face = -1;
    } else if (input.right) {
      player.vx = speed;
      player.face = 1;
    } else {
      player.vx = 0;
    }

    if (player.onGround) player.coyote = COYOTE_FRAMES;
    else if (player.coyote > 0) player.coyote--;
    if (input.jumpPressed) player.jumpBuffer = JUMP_BUFFER_FRAMES;
    else if (player.jumpBuffer > 0) player.jumpBuffer--;
    if (player.jumpBuffer && player.coyote && !slow) {
      player.vy = JUMP_VELOCITY;
      player.onGround = 0;
      player.coyote = 0;
      player.jumpBuffer = 0;
    }
    if (!input.jump && player.vy < 0) player.vy *= 0.5;

    if (input.shoot) {
      player.aiming = 10;
      if (--player.fireCool <= 0) {
        player.fireCool = FIRE_RATE;
        game.bullets.push({
          x: player.x + (player.face > 0 ? player.w + 4 : -6),
          y: player.y + 6,
          vx: player.face * BULLET_SPEED,
          w: 3,
          h: 1,
        });
        soundShoot();
      }
    } else {
      player.fireCool = 0;
      if (player.aiming > 0) player.aiming--;
    }
  }

  moveBody(player, game.world, GRAVITY);
  if (player.x < TILE) player.x = TILE;
  if (player.x + player.w > game.world.width - TILE) player.x = game.world.width - TILE - player.w;

  const left = game.cameraX;
  const right = game.cameraX + VIEW_WIDTH;
  if (player.x < left) player.x = left;
  if (player.x + player.w > right) player.x = right - player.w;

  if (player.onGround && solid(game.world, player.x + 4, player.y + player.h + 1)) {
    player.safeX = player.x;
    player.safeY = player.y;
  }

  if (player.y > TILE_ROWS * TILE + 8) {
    hurtPlayer(game, player.x);
    if (game.phase !== Phase.Die) {
      player.x = player.safeX;
      player.y = player.safeY;
      player.vx = 0;
      player.vy = 0;
      player.stunned = PIT_STUN;
    }
  }
  player.anim++;
};

const walkToward = (unicorn: Unicorn, targetX: number, game: Game) => {
  const speed = WALK_SPEED * speedMul(game, unicorn.kind);
  unicorn.face = targetX < unicorn.x ? -1 : 1;
  unicorn.vx = unicorn.face * speed;
};

const atCliff = (unicorn: Unicorn, world: World, dir: number) =>
  unicorn.onGround && !solid(world, dir > 0 ? unicorn.x + unicorn.w + 2 : unicorn.x - 2, unicorn.y + unicorn.h + 1);

const onShortPlatform = (unicorn: Unicorn, world: World) => atCliff(unicorn, world, 1) && atCliff(unicorn, world, -1);

const aggroRange = (game: Game, base: number) => base * (game.returning ? 1 + RETURN_AGGRO : 1);

const startRear = (unicorn: Unicorn) => {
  unicorn.stance = Stance.Rear;
  unicorn.timer = REAR_FRAMES;
  unicorn.vx = 0;
};

const blockHospitalDoor = (game: Game, unicorn: Unicorn) => {
  const door = game.world.hospitalWidth;
  if (unicorn.x >= door) return;
  unicorn.x = door;
  if (unicorn.vx < 0) unicorn.vx = 0;
  if (unicorn.stance === Stance.Dash || unicorn.stance === Stance.Air) {
    unicorn.stance = Stance.Recover;
    unicorn.timer = RECOVER_FRAMES;
    unicorn.vx = 0;
  }
};

const updateOneUnicorn = (game: Game, unicorn: Unicorn) => {
  const player = game.player;
  const dx = player.x - unicorn.x;
  const adx = Math.abs(dx);
  const ady = Math.abs(player.y - unicorn.y);

  if (unicorn.stance === Stance.Rear) {
    unicorn.vx = 0;
    if (--unicorn.timer <= 0) {
      unicorn.stance = Stance.Dash;
      unicorn.timer = DASH_FRAMES;
      unicorn.face = dx < 0 ? -1 : 1;
      unicorn.vx = unicorn.face * DASH_SPEED * speedMul(game, unicorn.kind);
    }
  } else if (unicorn.stance === Stance.Dash) {
    unicorn.vx = unicorn.face * DASH_SPEED * speedMul(game, unicorn.kind);
    if (--unicorn.timer <= 0) {
      unicorn.stance = Stance.Recover;
      unicorn.timer = RECOVER_FRAMES;
    }
  } else if (unicorn.stance === Stance.Crouch) {
    unicorn.vx = 0;
    if (--unicorn.timer <= 0) {
      unicorn.stance = Stance.Air;
      unicorn.vy = HOP_VELOCITY;
      unicorn.face = dx < 0 ? -1 : 1;
      unicorn.vx = unicorn.face * HOP_SPEED * speedMul(game, unicorn.kind);
      unicorn.onGround = 0;
    }
  } else if (unicorn.stance === Stance.Air) {
    if (unicorn.onGround) {
      unicorn.stance = Stance.Wait;
      unicorn.timer = LAND_WAIT;
      unicorn.vx = 0;
    }
  } else if (unicorn.stance === Stance.Jaw) {
    unicorn.vx = 0;
    if (--unicorn.timer <= 0) {
      const arc = VOMIT_ARC;
      const gx = player.x + 4 - (unicorn.x + unicorn.w / 2);
      const gy = player.y + 4 - (unicorn.y + 4);
      game.vomits.push({
        x: unicorn.x + unicorn.w / 2,
        y: unicorn.y + 4,
        vx: gx / arc,
        vy: (gy - 0.5 * VOMIT_GRAVITY * arc * arc) / arc,
        w: 4,
        h: 4,
      });
      unicorn.stance = Stance.Walk;
      unicorn.cooldown = SPIT_COOLDOWN;
    }
  } else if (unicorn.stance === Stance.Wait || unicorn.stance === Stance.Recover) {
    walkToward(unicorn, player.x, game);
    if (--unicorn.timer <= 0) unicorn.stance = Stance.Walk;
  } else if (unicorn.kind === Kind.Drainer) {
    if (game.returning) {
      walkToward(unicorn, player.x, game);
    } else {
      let nearest: Puddle | 0 = 0;
      let nearestDist = 1e9;
      for (const puddle of game.puddles) {
        const d = Math.abs(puddle.x - unicorn.x);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = puddle;
        }
      }
      if (nearest) walkToward(unicorn, nearest.x, game);
      else unicorn.vx = unicorn.face * WALK_SPEED * speedMul(game, unicorn.kind);
    }
  } else if (unicorn.kind === Kind.Spitter) {
    if (adx < SPIT_NEAR) {
      unicorn.face = dx < 0 ? 1 : -1;
      unicorn.vx = unicorn.face * WALK_SPEED * speedMul(game, unicorn.kind);
    } else if (adx > SPIT_FAR) {
      walkToward(unicorn, player.x, game);
    } else {
      unicorn.vx = 0;
    }
    if (--unicorn.cooldown <= 0) {
      unicorn.stance = Stance.Jaw;
      unicorn.timer = JAW_FRAMES;
    }
  } else if (unicorn.kind === Kind.Jumper) {
    walkToward(unicorn, player.x, game);
    if (unicorn.onGround && adx < aggroRange(game, JUMPER_CHARGE_RANGE) && ady < 18) {
      startRear(unicorn);
    } else if (unicorn.onGround && unicorn.stance === Stance.Walk && !onShortPlatform(unicorn, game.world)) {
      unicorn.stance = Stance.Crouch;
      unicorn.timer = CROUCH_FRAMES;
    }
  } else {
    walkToward(unicorn, player.x, game);
    if (adx < aggroRange(game, CHARGE_RANGE) && ady < 20) startRear(unicorn);
  }

  if (unicorn.stance !== Stance.Dash && unicorn.stance !== Stance.Air
    && unicorn.stance !== Stance.Rear && unicorn.stance !== Stance.Jaw) {
    if (onShortPlatform(unicorn, game.world)) {
      unicorn.vx = 0;
      if (unicorn.stance === Stance.Crouch) {
        unicorn.stance = Stance.Walk;
        unicorn.timer = 0;
      }
    } else if (unicorn.vx && atCliff(unicorn, game.world, unicorn.vx > 0 ? 1 : -1)) {
      if (unicorn.kind === Kind.Jumper && unicorn.onGround && unicorn.stance === Stance.Walk) {
        unicorn.stance = Stance.Crouch;
        unicorn.timer = CROUCH_FRAMES;
      }
      unicorn.vx = 0;
    }
  }

  unicorn.anim++;
  moveBody(unicorn, game.world, GRAVITY);
  blockHospitalDoor(game, unicorn);
  if (unicorn.hitWall && unicorn.stance !== Stance.Dash) unicorn.vx = 0;

  if (unicorn.kind === Kind.Drainer && !unicorn.dead) {
    for (const puddle of game.puddles) {
      if (Math.abs(unicorn.x + unicorn.w / 2 - puddle.x) < puddle.r
        && Math.abs(unicorn.y + unicorn.h - puddle.y) < 6) puddle.life -= 2;
    }
  }

  if (player.x >= game.world.hospitalWidth) {
    if (!unicorn.dead && overlaps(player, unicorn)) hurtPlayer(game, unicorn.x);
    if (unicorn.stance === Stance.Dash) {
      const hornX = unicorn.face > 0 ? unicorn.x + unicorn.w : unicorn.x - 8;
      if (overlaps(player, { x: hornX, y: unicorn.y + 2, w: 8, h: unicorn.h - 2 })) {
        hurtPlayer(game, unicorn.x);
      }
    }
  }
};

export const updateUnicorns = (game: Game) => {
  for (let i = game.unicorns.length; i--;) {
    const unicorn = game.unicorns[i];
    if (unicorn.dead) {
      if (!unicorn.onGround) moveBody(unicorn, game.world, GRAVITY);
      blockHospitalDoor(game, unicorn);
      if (unicorn.y > TILE_ROWS * TILE + 40) game.unicorns.splice(i, 1);
      continue;
    }
    updateOneUnicorn(game, unicorn);
    if (unicorn.y > TILE_ROWS * TILE + 40) {
      game.unicorns.splice(i, 1);
      continue;
    }
    if (unicorn.hp <= 0) {
      killUnicorn(game, unicorn);
      unicorn.dead = 1;
      unicorn.hp = 0;
      unicorn.vx = 0;
      unicorn.vy = 0;
    }
  }
};

export const updateBullets = (game: Game) => {
  for (let i = game.bullets.length; i--;) {
    const bullet = game.bullets[i];
    bullet.x += bullet.vx;
    if (bullet.x < game.cameraX - 8 || bullet.x > game.cameraX + VIEW_WIDTH + 8) {
      game.bullets.splice(i, 1);
      continue;
    }
    for (let j = game.unicorns.length; j--;) {
      const unicorn = game.unicorns[j];
      if (unicorn.dead) continue;
      if (overlaps(bullet, unicorn)) {
        unicorn.hp -= BULLET_DAMAGE;
        burst(game, bullet.x, bullet.y, 3, '#f4e4c1');
        soundHit();
        game.bullets.splice(i, 1);
        break;
      }
    }
  }
};

export const updatePuddles = (game: Game) => {
  const player = game.player;
  for (let i = game.puddles.length; i--;) {
    const puddle = game.puddles[i];
    puddle.life--;
    const feet = { x: player.x + 1, y: player.y + player.h - 3, w: player.w - 2, h: 4 };
    const standing = feet.x < puddle.x + puddle.r && feet.x + feet.w > puddle.x - puddle.r
      && Math.abs(feet.y + 2 - puddle.y) < 6;
    if (standing && player.vat < game.quota && player.iframes <= 0) {
      const rate = Math.max(FILL_RATE_MIN, puddle.amount * FILL_RATE);
      const gained = Math.min(rate, puddle.amount, game.quota - player.vat);
      player.vat += gained;
      puddle.amount -= gained;
      if (gained) soundBlood();
    }
    if (puddle.life <= 0 || puddle.amount <= 0) game.puddles.splice(i, 1);
  }
};

export const updateDroplets = (game: Game) => {
  const player = game.player;
  for (let i = game.droplets.length; i--;) {
    const drop = game.droplets[i];
    drop.vy += GRAVITY;
    drop.x += drop.vx;
    drop.y += drop.vy;
    if (solid(game.world, drop.x, drop.y + 2) && drop.vy > 0) {
      drop.y = Math.floor((drop.y + 2) / TILE) * TILE - 2;
      if (!drop.bounced) {
        drop.vy *= -0.5;
        drop.bounced = 1;
      } else {
        drop.vy = 0;
        drop.vx *= 0.6;
      }
    }
    drop.life--;
    if (overlaps(player, drop) && player.vat < game.quota && player.iframes <= 0) {
      player.vat = Math.min(game.quota, player.vat + drop.amount);
      soundPickup();
      game.droplets.splice(i, 1);
      continue;
    }
    if (drop.life <= 0) game.droplets.splice(i, 1);
  }
};

export const updateVomits = (game: Game) => {
  for (let i = game.vomits.length; i--;) {
    const blob = game.vomits[i];
    blob.vy += VOMIT_GRAVITY;
    blob.x += blob.vx;
    blob.y += blob.vy;
    if (blob.x < game.world.hospitalWidth) {
      game.vomits.splice(i, 1);
      continue;
    }
    if (game.player.x >= game.world.hospitalWidth && overlaps(game.player, blob)) {
      hurtPlayer(game, blob.x);
      game.vomits.splice(i, 1);
      continue;
    }
    if (blob.vy > 0 && solid(game.world, blob.x + 2, blob.y + 4)) {
      if (blob.x >= game.world.hospitalWidth) {
        game.slime.push({
          x: blob.x - SLIME_WIDTH / 2,
          y: Math.floor((blob.y + 4) / TILE) * TILE,
          w: SLIME_WIDTH,
          life: SLIME_LIFE,
        });
      }
      game.vomits.splice(i, 1);
      continue;
    }
    if (blob.y > TILE_ROWS * TILE + 20) game.vomits.splice(i, 1);
  }
};

export const updateSlime = (game: Game) => {
  for (let i = game.slime.length; i--;) {
    if (--game.slime[i].life <= 0) game.slime.splice(i, 1);
  }
};

const stepMotes = (list: Mote[]) => {
  for (let i = list.length; i--;) {
    const mote = list[i];
    mote.x += mote.vx;
    mote.y += mote.vy;
    mote.vy += 0.15;
    if (--mote.life <= 0) list.splice(i, 1);
  }
};

export const updateMotes = (game: Game) => {
  stepMotes(game.motes);
  stepMotes(game.sparks);
};

const groundY = (world: World, x: number) => {
  for (let row = CEILING_ROW; row < TILE_ROWS; row++) {
    if (solid(world, x, row * TILE + 1)) return row * TILE;
  }
  return -1;
};

const onPlayer = (game: Game, x: number, y: number, w = UNICORN_WIDTH, h = UNICORN_HEIGHT) => {
  const p = game.player;
  const dx = x + w / 2 - (p.x + p.w / 2);
  const dy = y - h / 2 - (p.y + p.h / 2);
  return dx * dx + dy * dy < SPAWN_PLAYER_CLEAR * SPAWN_PLAYER_CLEAR;
};

export const ensureUnicorns = (game: Game) => {
  if (game.phase !== Phase.Hunt && game.phase !== Phase.Return) return;
  let live = 0;
  for (const unicorn of game.unicorns) if (!unicorn.dead) live++;
  const viewLeft = game.cameraX;
  const viewRight = game.cameraX + VIEW_WIDTH;
  for (let k = 0; live < MIN_LIVE_UNICORNS && k < 14; k++) {
    const side = game.returning ? (k & 1 ? -1 : 1) : (k < 9 ? 1 : -1);
    const wx = side > 0 ? viewRight + 72 + (k >> 1) * 40 : viewLeft - 72 - (k >> 1) * 40;
    if (wx < game.world.hospitalWidth + 24 || wx > game.world.width - 24) continue;
    if (wx > viewLeft - 24 && wx < viewRight + 24) continue;
    let near = 0;
    for (const unicorn of game.unicorns) {
      if (!unicorn.dead && Math.abs(unicorn.x - wx) < SPAWN_GAP) {
        near = 1;
        break;
      }
    }
    if (near) continue;
    const floor = groundY(game.world, wx);
    if (floor < 0 || onPlayer(game, wx, floor)) continue;
    game.unicorns.push(createUnicorn({ x: wx, y: floor, kind: pickKind(game.world.rng, game.loop), used: 1 }, game));
    live++;
  }
};

export const activateSpawns = (game: Game, list: Spawn[]) => {
  const mid = game.cameraX + VIEW_WIDTH / 2;
  for (const spawn of list) {
    if (spawn.used || Math.abs(spawn.x - mid) >= ACTIVATE_RADIUS) continue;
    let near = 0;
    for (const unicorn of game.unicorns) {
      if (!unicorn.dead && Math.abs(unicorn.x - spawn.x) < SPAWN_GAP) {
        near = 1;
        break;
      }
    }
    if (near) continue;
    const scale = UNICORN_SCALE[spawn.kind];
    if (onPlayer(game, spawn.x, spawn.y, UNICORN_WIDTH * scale, UNICORN_HEIGHT * scale)) continue;
    spawn.used = 1;
    game.unicorns.push(createUnicorn(spawn, game));
  }
};
