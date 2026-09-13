import {
  VIEW_WIDTH, VIEW_HEIGHT, TILE, TILE_ROWS, FLOOR_ROW, PLAYER_HEIGHT, UNICORN_HEIGHT,
  POUR_FRAMES, WAKE_FRAMES, CAMERA_LOOK_FRAMES, WAKE_FADE_FRAMES, WAKE_HOLD_FRAMES,
  QUOTA_BASE, QUOTA_PER_LOOP, LOOK_AHEAD, CAMERA_LERP, POUR_X, VAT_X, BED_X, MOM_STAND_X,
  MOM_STAND_HEIGHT, FALL_FRAMES, AFTER_HIT_HOLD, Phase, Mom, HIT_FLASH_FRAMES,
  BANNER_FRAMES, DEATH_HOLD, ARRIVE_X, RUN_SPEED, DASH_SPEED,
} from './config';
import { GOODBYE_MIN_RUN } from './playtest';
import { pollInput, input } from './input';
import { bootCanvas, shake, screenShake } from './graphics/canvas';
import { bootSprites } from './graphics/sprites';
import { soundRevive, soundSting, soundAlarm, soundBlood, playRageTheme, playSoftTheme } from './sfx';
import { hush, tickTalk, sayMom, sayDeath, sayPour, sayBye, sayGrief } from './talk';
import { createWorld, growWorld } from './level';
import {
  Game, createPlayer, updatePlayer, updateUnicorns, updateBullets, updatePuddles, updateDroplets,
  updateVomits, updateSlime, updateMotes, activateSpawns, ensureUnicorns, burst,
} from './entities';

let game: Game;
let bestLoop = 1;
let timer = 0;
let hitFlash = 0;
let banner = '';
let bannerTimer = 0;
let momPose: number = Mom.Lying;
let momX = 0;
let momY = 0;
let momAngle = 0;
let killerX = 0;
let killerY = 0;
let killerFace = -1;
let killerStage = 0;
let fallTimer = 0;
let afterHitTimer = 0;
let slain = 0;
let pourStartVat = 0;
let pipeHead = 0;
let pipeTail = 0;
let blink = 0;
let griefAlpha = 0;
let fadeBlack = 0;
let momSpoke = 0;
let showingTitle = 1;
let gameOverAlpha = 0;
let endingStage = 0;
let endingAlpha = 0;
let teachAlpha = 0;
let teachUnlocked = 0;
let filledOnce = 0;
let griefLock = 0;
let wakeFade = 0;

const ease = (t: number) => {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return t * t * (3 - 2 * t);
};

const parkMom = (pose: number = Mom.Lying) => {
  momPose = pose;
  momX = BED_X + 4;
  momY = FLOOR_ROW * TILE - 22;
  momAngle = 0;
};

const quotaFor = (loop: number) => QUOTA_BASE + QUOTA_PER_LOOP * loop;

const createGame = (loop: number, seed: number): Game => {
  const world = createWorld(loop, seed);
  const py = FLOOR_ROW * TILE - PLAYER_HEIGHT;
  return {
    player: createPlayer(POUR_X, py),
    unicorns: [],
    bullets: [],
    puddles: [],
    droplets: [],
    vomits: [],
    slime: [],
    motes: [],
    world,
    phase: Phase.Title,
    loop,
    quota: quotaFor(loop),
    cameraX: 0,
    cameraY: FLOOR_ROW * TILE + 8 - VIEW_HEIGHT,
    returning: 0,
    hint: 0,
    sparks: [],
    kiss: 0,
    grief: 0,
  };
};

export const inHospital = () =>
  game.phase === Phase.Title
  || game.phase === Phase.Pour
  || game.phase === Phase.Wake
  || game.phase === Phase.Redeath
  || game.phase === Phase.Grief
  || game.phase === Phase.Kiss
  || game.phase === Phase.Ending;

const startPour = () => {
  game.phase = Phase.Pour;
  timer = POUR_FRAMES;
  pourStartVat = game.player.vat;
  parkMom(Mom.Ceiling);
  soundRevive();
  sayPour();
};

export type View = {
  game: Game;
  bestLoop: number;
  hitFlash: number;
  banner: string;
  bannerTimer: number;
  momPose: number;
  momX: number;
  momY: number;
  momAngle: number;
  killerX: number;
  killerY: number;
  killerFace: number;
  slain: number;
  pipeHead: number;
  pipeTail: number;
  griefAlpha: number;
  fadeBlack: number;
  showingTitle: number;
  gameOverAlpha: number;
  endingStage: number;
  endingAlpha: number;
  teachAlpha: number;
  teachUnlocked: number;
  filledOnce: number;
  wakeFade: number;
};

export const getView = (): View => ({
  game,
  bestLoop,
  hitFlash,
  banner,
  bannerTimer,
  momPose,
  momX,
  momY,
  momAngle,
  killerX,
  killerY,
  killerFace,
  slain,
  pipeHead,
  pipeTail,
  griefAlpha,
  fadeBlack,
  showingTitle,
  gameOverAlpha,
  endingStage,
  endingAlpha,
  teachAlpha,
  teachUnlocked,
  filledOnce,
  wakeFade,
});

export const boot = () => {
  bootCanvas();
  bootSprites();
  game = createGame(1, (Math.random() * 1e9) | 0);
  game.player.vat = 0;
  timer = 0;
  parkMom(Mom.Ceiling);
  slain = 0;
  fallTimer = 0;
  afterHitTimer = 0;
  showingTitle = 1;
};

const restart = (loop: number, vat = 0) => {
  const seed = (loop * 0x9e3779b9) ^ ((Math.random() * 0xffffffff) | 0);
  game = createGame(loop, seed);
  game.player.vat = Math.min(vat, game.quota);
  timer = 0;
  parkMom(Mom.Ceiling);
  slain = 0;
  fallTimer = 0;
  afterHitTimer = 0;
  pipeHead = 0;
  pipeTail = 0;
  hitFlash = 0;
  banner = '';
  bannerTimer = 0;
  griefAlpha = 0;
  fadeBlack = 0;
  momSpoke = 0;
  gameOverAlpha = 0;
  endingStage = 0;
  endingAlpha = 0;
  teachAlpha = 0;
  teachUnlocked = 0;
  filledOnce = 0;
  griefLock = 0;
  wakeFade = 0;
  hush();
  playSoftTheme();
};

const goAgain = () => {
  restart(game.loop);
  startPour();
};

const updateCamera = () => {
  const maxY = Math.max(0, TILE_ROWS * TILE - VIEW_HEIGHT);
  let targetY = game.player.y + game.player.h - VIEW_HEIGHT * 0.72;
  if (inHospital()) {
    game.cameraX += (0 - game.cameraX) * 0.2;
    if (game.cameraX < 0.2) game.cameraX = 0;
    targetY = FLOOR_ROW * TILE + 8 - VIEW_HEIGHT;
  } else {
    const dir = game.returning ? -1 : 1;
    const targetX = game.player.x + 4 + LOOK_AHEAD * dir - VIEW_WIDTH / 2;
    game.cameraX += (targetX - game.cameraX) * CAMERA_LERP;
    if (game.cameraX < 0) game.cameraX = 0;
    const maxX = Math.max(0, game.world.width - VIEW_WIDTH);
    if (game.cameraX > maxX) game.cameraX = maxX;
  }
  if (targetY < 0) targetY = 0;
  if (targetY > maxY) targetY = maxY;
  game.cameraY += (targetY - game.cameraY) * 0.2;
};

const beginHunt = () => {
  game.phase = Phase.Hunt;
  game.returning = 0;
  banner = 'HUNT';
  bannerTimer = BANNER_FRAMES;
};

const beginReturn = () => {
  game.phase = Phase.Return;
  game.returning = 1;
  hitFlash = HIT_FLASH_FRAMES;
  banner = 'RUN';
  bannerTimer = BANNER_FRAMES;
  shake(6, 20);
  soundAlarm();
};

const updatePlay = (canControl: number) => {
  updateCamera();
  if (game.phase === Phase.Hunt) growWorld(game.world, game.cameraX + VIEW_WIDTH + 280);
  if (game.phase === Phase.Hunt) activateSpawns(game, game.world.huntSpawns);
  if (game.phase === Phase.Return) {
    activateSpawns(game, game.world.returnSpawns);
    activateSpawns(game, game.world.huntSpawns);
  }
  updatePlayer(game, canControl);
  updateUnicorns(game);
  ensureUnicorns(game);
  updateBullets(game);
  updatePuddles(game);
  updateDroplets(game);
  updateVomits(game);
  updateSlime(game);
  updateMotes(game);
  if (game.phase === Phase.Hunt && game.player.vat >= game.quota) {
    if (game.loop === 1) filledOnce = 1;
    beginReturn();
  }
  if (game.phase === Phase.Return && game.player.vat >= game.quota && game.player.x < game.world.hospitalWidth - 16) {
    game.phase = Phase.Arrive;
    game.unicorns.length = 0;
    game.vomits.length = 0;
  }
  if (game.phase === Phase.Die) timer = DEATH_HOLD;
};

const beginRedeath = () => {
  wakeFade = 0;
  game.phase = Phase.Redeath;
  killerX = VIEW_WIDTH + 12;
  killerY = FLOOR_ROW * TILE - UNICORN_HEIGHT;
  killerFace = -1;
  killerStage = 0;
  fallTimer = 0;
  afterHitTimer = 0;
};

export const tick = () => {
  pollInput();
  if (game.hint) {
    if (input.anyPressed) game.hint = 0;
    return;
  }
  tickTalk();
  const showTeach = teachUnlocked && game.loop === 1 && game.player.vat < game.quota && game.player.x < game.world.hospitalWidth;
  if (showTeach) teachAlpha = Math.min(1, teachAlpha + 0.018);
  else teachAlpha = 0;
  if (bannerTimer > 0) bannerTimer--;
  if (hitFlash > 0) hitFlash--;
  if (screenShake.time > 0) screenShake.time--;

  if (game.phase === Phase.Title) {
    updateCamera();
    game.player.x = POUR_X;
    game.player.y = FLOOR_ROW * TILE - PLAYER_HEIGHT;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.onGround = 1;
    game.player.face = -1;
    parkMom(slain ? Mom.Lying : Mom.Ceiling);
    if (input.shootPressed) {
      showingTitle = 0;
      startPour();
    }
    return;
  }

  if (game.phase === Phase.Pour) {
    updateCamera();
    if (game.loop >= GOODBYE_MIN_RUN && input.jumpPressed) {
      game.phase = Phase.Grief;
      game.grief = 1;
      griefLock = 40;
      griefAlpha = 0;
      sayGrief(0);
      return;
    }
    timer--;
    const k = 1 - timer / POUR_FRAMES;
    game.player.vat = pourStartVat * (1 - k);
    pipeHead = k < 0.38 ? k / 0.38 : 1;
    pipeTail = k < 0.82 ? 0 : (k - 0.82) / 0.18;
    game.player.x = POUR_X;
    game.player.y = FLOOR_ROW * TILE - PLAYER_HEIGHT;
    game.player.onGround = 1;
    game.player.face = -1;
    if ((timer % 8) === 0) {
      burst(game, VAT_X + 10, FLOOR_ROW * TILE - 16, 1, '#a81820');
      soundBlood();
    }
    momPose = pipeHead > 0.72 ? Mom.Camera : Mom.Ceiling;
    momX = BED_X + 4;
    momY = FLOOR_ROW * TILE - 22;
    if (pipeHead > 0.72 && pipeTail < 0.95 && (timer % 6) === 0) {
      burst(game, BED_X + 16, FLOOR_ROW * TILE - 10, 1, '#a81820');
      soundBlood();
    }
    updateMotes(game);
    if (timer <= 0) {
      game.player.vat = 0;
      pipeHead = 0;
      pipeTail = 0;
      game.phase = Phase.Wake;
      timer = WAKE_FRAMES;
    }
    return;
  }

  if (game.phase === Phase.Wake) {
    updateCamera();
    timer--;
    const floorY = FLOOR_ROW * TILE;
    const standY = floorY - MOM_STAND_HEIGHT;
    const elapsed = WAKE_FRAMES - timer;
    const fadeOut = CAMERA_LOOK_FRAMES + WAKE_FADE_FRAMES;
    const holdEnd = fadeOut + WAKE_HOLD_FRAMES;
    const fadeIn = holdEnd + WAKE_FADE_FRAMES;
    momAngle = 0;
    pipeHead = 0;
    pipeTail = 0;
    if (elapsed < fadeOut) {
      momPose = Mom.Camera;
      momX = BED_X + 4;
      momY = floorY - 22;
      wakeFade = elapsed < CAMERA_LOOK_FRAMES ? 0 : ease((elapsed - CAMERA_LOOK_FRAMES) / WAKE_FADE_FRAMES);
    } else {
      momPose = Mom.Looking;
      momX = MOM_STAND_X;
      momY = standY;
      if (elapsed < holdEnd) wakeFade = 1;
      else if (elapsed < fadeIn) wakeFade = 1 - ease((elapsed - holdEnd) / WAKE_FADE_FRAMES);
      else {
        wakeFade = 0;
        if (!momSpoke) {
          momSpoke = 1;
          sayMom();
        }
      }
    }
    game.player.x = POUR_X;
    game.player.y = floorY - PLAYER_HEIGHT;
    game.player.onGround = 1;
    game.player.face = elapsed < fadeOut ? -1 : 1;
    updateMotes(game);
    if (timer <= 0) beginRedeath();
    return;
  }

  if (game.phase === Phase.Redeath) {
    updateCamera();
    const floorY = FLOOR_ROW * TILE;
    const standY = floorY - MOM_STAND_HEIGHT;
    game.player.x = POUR_X;
    game.player.y = floorY - PLAYER_HEIGHT;
    game.player.onGround = 1;
    game.player.face = 1;
    if (killerStage === 0) {
      killerX -= 1.2;
      if (killerX < 220) killerStage = 1;
    } else if (killerStage === 1) {
      killerX -= DASH_SPEED;
      if (killerX < MOM_STAND_X - 2) {
        slain = 1;
        burst(game, MOM_STAND_X + 6, floorY - 12, 8, '#c4281c', 26);
        shake(4, 14);
        hitFlash = 4;
        soundSting();
        playRageTheme();
        sayDeath(game.loop);
        teachUnlocked = 1;
        killerStage = 2;
        killerFace = 1;
        fallTimer = FALL_FRAMES;
        afterHitTimer = AFTER_HIT_HOLD;
      }
    } else {
      killerX += DASH_SPEED;
    }
    if (fallTimer > 0) {
      fallTimer--;
      const u = ease(1 - fallTimer / FALL_FRAMES);
      if (u < 0.92) {
        momPose = Mom.Falling;
        momX = MOM_STAND_X + (BED_X + 4 - MOM_STAND_X) * u;
        momY = standY + (floorY - 22 - standY) * u;
        momAngle = -u * 0.95;
      } else {
        parkMom();
      }
    } else if (killerStage === 2) {
      if (afterHitTimer > 0) afterHitTimer--;
      else beginHunt();
    }
    updateMotes(game);
    return;
  }

  if (game.phase === Phase.Hunt || game.phase === Phase.Return) {
    updatePlay(1);
    return;
  }

  if (game.phase === Phase.Arrive) {
    updateCamera();
    const target = ARRIVE_X;
    if (game.player.x > target + 1) {
      game.player.vx = -RUN_SPEED;
      game.player.face = -1;
    } else if (game.player.x < target - 1) {
      game.player.vx = RUN_SPEED;
      game.player.face = 1;
    } else {
      game.player.vx = 0;
      if (game.loop + 1 > bestLoop) bestLoop = game.loop + 1;
      const next = game.loop + 1;
      const vat = game.player.vat;
      restart(next, vat);
      if (next > 1) startPour();
      return;
    }
    updatePlayer(game, 0);
    updateMotes(game);
    return;
  }

  if (game.phase === Phase.Grief) {
    updateCamera();
    const floorY = FLOOR_ROW * TILE;
    game.player.y = floorY - PLAYER_HEIGHT;
    game.player.vx = 0;
    game.player.vy = 0;
    game.player.onGround = 1;
    if (griefLock > 0) griefLock--;
    game.player.anim++;
    const stage = game.grief;
    if (stage === 1) {
      game.player.x = POUR_X + ((game.player.anim >> 2) & 1 ? 1 : -1);
      game.player.face = (game.player.anim >> 3) & 1 ? 1 : -1;
    } else if (stage === 3) {
      game.player.x = POUR_X;
      game.player.face = -1;
    } else if (stage === 5) {
      game.player.x = POUR_X;
      game.player.face = 1;
    } else {
      game.player.x = POUR_X;
      game.player.face = stage === 2 || stage === 4 ? 1 : -1;
    }
    if (griefAlpha < 1) griefAlpha += 0.012;
    if (stage === 5) {
      timer--;
      if (timer <= 0) {
        game.phase = Phase.Kiss;
        game.kiss = 0;
        griefAlpha = 0;
        playSoftTheme();
        sayBye();
      }
    } else if (input.jumpPressed && griefLock <= 0) {
      game.grief++;
      griefLock = 40;
      sayGrief(game.grief - 1);
      if (game.grief === 2) {
        shake(5, 18);
        burst(game, game.player.x + 4, game.player.y + 10, 4, '#c4281c');
      }
      if (game.grief === 5) timer = 90;
    } else if (input.shootPressed) {
      game.phase = Phase.Pour;
      game.grief = 0;
      griefAlpha = 0;
      hush();
    }
    updateMotes(game);
    return;
  }

  if (game.phase === Phase.Kiss) {
    updateCamera();
    parkMom();
    const kissX = BED_X - 8;
    const floorY = FLOOR_ROW * TILE;
    game.player.onGround = 1;
    game.player.face = 1;
    if (!game.kiss) {
      if (game.player.x < kissX - 1) {
        game.player.vx = RUN_SPEED * 0.55;
      } else {
        game.player.vx = 0;
        game.player.x = kissX;
        game.player.y = floorY - PLAYER_HEIGHT;
        game.kiss = 0.02;
        timer = 90;
      }
      updatePlayer(game, 0);
    } else if (timer > 0) {
      timer--;
      if (game.kiss < 1) game.kiss = Math.min(1, game.kiss + 0.04);
      game.player.vx = 0;
      game.player.x = kissX;
      game.player.y = floorY - PLAYER_HEIGHT;
    } else {
      fadeBlack += 0.007;
      if (fadeBlack >= 1) {
        fadeBlack = 1;
        endingStage = 0;
        endingAlpha = 0;
        game.phase = Phase.Ending;
      }
    }
    updateMotes(game);
    return;
  }

  if (game.phase === Phase.Ending) {
    fadeBlack = 1;
    if (endingStage === 0) {
      endingAlpha += 0.005;
      if (endingAlpha >= 1) {
        endingAlpha = 1;
        endingStage = 1;
        timer = 320;
      }
    } else if (endingStage === 1) {
      timer--;
      if (timer <= 0) endingStage = 2;
    } else if (endingStage === 2) {
      endingAlpha -= 0.006;
      if (endingAlpha <= 0) {
        endingAlpha = 0;
        endingStage = 3;
      }
    } else {
      if (endingAlpha < 1) endingAlpha += 0.008;
      if (endingAlpha > 0.55 && input.shootPressed) goAgain();
    }
    return;
  }

  if (game.phase === Phase.Die) {
    updatePlayer(game, 0);
    updateMotes(game);
    if (timer > 0) timer--;
    fadeBlack += 0.016;
    if (fadeBlack > 1) fadeBlack = 1;
    if (fadeBlack >= 1) {
      gameOverAlpha += 0.016;
      if (gameOverAlpha > 1.2 && input.shootPressed) goAgain();
    }
  }
};
