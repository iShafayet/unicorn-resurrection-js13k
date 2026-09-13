export const VIEW_WIDTH = 216;
export const VIEW_HEIGHT = 120;
export const TILE = 8;
export const TILE_ROWS = 20;
export const CEILING_ROW = 7;
export const FLOOR_ROW = 16;
export const HOSPITAL_WIDTH = 160;
export const PLAYER_WIDTH = 10;
export const PLAYER_HEIGHT = 20;
export const UNICORN_WIDTH = 32;
export const UNICORN_HEIGHT = 20;
export const PLATFORM_RISE = 2;
export const OPENING_CHUNKS = 6;

export const QUOTA_BASE = 40;
export const QUOTA_PER_LOOP = 20;

export const RUN_SPEED = 1.6;
export const GRAVITY = 0.25;
export const JUMP_VELOCITY = -4.2;
export const COYOTE_FRAMES = 6;
export const JUMP_BUFFER_FRAMES = 6;

export const BULLET_SPEED = 5;
export const FIRE_RATE = 10;
export const BULLET_DAMAGE = 1;

export const KNOCKBACK_X = 2.5;
export const KNOCKBACK_Y = -2;
export const IFRAMES = 60;
export const SPILL_FRACTION = 0.15;
export const DROPLET_LIFE = 90;
export const DEATH_HOLD = 30;
export const PIT_STUN = 30;

export const FILL_RATE = 0.04;
export const FILL_RATE_MIN = 0.1;

export const PUDDLE_LIFE = 750;
export const PUDDLE_LIFE_PER_LOOP = 45;
export const PUDDLE_LIFE_MIN = 300;

export const DENSITY_PER_LOOP = 0.15;
export const SPEED_PER_LOOP = 0.05;
export const SPEED_CAP = 0.5;
export const RETURN_SPEED_BONUS = 0.45;
export const RETURN_AGGRO = 0.75;

export const LOOK_AHEAD = 28;
export const CAMERA_LERP = 0.12;
export const ACTIVATE_RADIUS = 320;

export const PUDDLE_AMOUNT = [8, 10, 18, 20];
export const PUDDLE_RADIUS = [8, 9, 14, 13];
export const DRAIN_RATE = 1.6;
export const UNICORN_HP = [1, 2, 4, 3];
export const UNICORN_SPEED = [1, 1, 0.6, 1.5];
export const UNICORN_SCALE = [1, 1, 1.5, 0.75];
export const UNICORN_WEIGHT = [4, 3, 2, 2];
export const WALK_SPEED = 0.55;
export const CHARGE_RANGE = 80;
export const JUMPER_CHARGE_RANGE = 50;
export const REAR_FRAMES = 30;
export const DASH_FRAMES = 25;
export const DASH_SPEED = 3.5;
export const RECOVER_FRAMES = 40;
export const CROUCH_FRAMES = 32;
export const HOP_VELOCITY = -2.8;
export const HOP_SPEED = 1.05;
export const LAND_WAIT = 32;
export const SPIT_NEAR = 60;
export const SPIT_FAR = 110;
export const SPIT_COOLDOWN = 120;
export const JAW_FRAMES = 36;
export const VOMIT_GRAVITY = 0.15;
export const VOMIT_ARC = 36;
export const SLIME_WIDTH = 24;
export const SLIME_LIFE = 180;

export const SPAWN_TRIES = 3;
export const SPAWN_CHANCE = 0.4;
export const RETURN_DENSITY = 0.7;
export const STARTING_LIVES = 2;
export const SPAWN_GAP = 96;
export const SPAWN_PLAYER_CLEAR = 72;
export const MIN_LIVE_UNICORNS = 2;

export const POUR_FRAMES = 180;
export const CAMERA_LOOK_FRAMES = 40;
export const WAKE_FADE_FRAMES = 24;
export const WAKE_HOLD_FRAMES = 10;
export const SPEAK_FRAMES = 70;
export const WAKE_FRAMES = CAMERA_LOOK_FRAMES + WAKE_FADE_FRAMES * 2 + WAKE_HOLD_FRAMES + SPEAK_FRAMES;
export const FALL_FRAMES = 84;
export const AFTER_HIT_HOLD = 36;
export const HIT_FLASH_FRAMES = 6;
export const BANNER_FRAMES = 60;
export const ARRIVE_X = 32;
export const POUR_X = 32;
export const VAT_X = 16;
export const BED_X = 52;
export const MOM_STAND_X = 92;
export const MOM_STAND_HEIGHT = 16;

export const SKY = '#0c0a0e';
export const STONE_DARK = '#3e3834';
export const WALL = '#1c1a1e';
export const WINDOW = '#6a7060';
export const STONE = '#32302e';
export const LINOLEUM = '#242028';

export const Phase = {
  Title: 0,
  Pour: 1,
  Redeath: 2,
  Hunt: 3,
  Return: 4,
  Arrive: 5,
  Die: 6,
  Wake: 7,
  Grief: 8,
  Kiss: 9,
  Ending: 10,
} as const;

export const Kind = {
  Rusher: 0,
  Jumper: 1,
  Spitter: 2,
  Drainer: 3,
} as const;

export const Stance = {
  Walk: 0,
  Rear: 1,
  Dash: 2,
  Recover: 3,
  Crouch: 4,
  Air: 5,
  Jaw: 6,
  Wait: 7,
} as const;

export const Mom = {
  Lying: 0,
  Looking: 3,
  Falling: 4,
  Ceiling: 5,
  Camera: 6,
} as const;
