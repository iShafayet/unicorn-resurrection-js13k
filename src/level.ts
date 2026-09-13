import {
  TILE, TILE_ROWS, FLOOR_ROW, CEILING_ROW, HOSPITAL_WIDTH, DENSITY_PER_LOOP,
  SPAWN_TRIES, SPAWN_CHANCE, RETURN_DENSITY, UNICORN_WEIGHT, PLATFORM_RISE,
  OPENING_CHUNKS, SPAWN_GAP,
} from './config';
import { createRng, randInt } from './rng';

export type Spawn = { x: number; y: number; kind: number; used: number };

export type World = {
  grid: Uint8Array;
  cols: number;
  hospitalWidth: number;
  width: number;
  huntSpawns: Spawn[];
  returnSpawns: Spawn[];
  rng: () => number;
  loop: number;
};

const fillFloor = (tiles: Uint8Array, cols: number, x0: number, x1: number, fromRow: number) => {
  for (let x = x0; x < x1; x++) {
    for (let y = fromRow; y < TILE_ROWS; y++) tiles[y * cols + x] = 1;
  }
};

const fillCeiling = (tiles: Uint8Array, cols: number) => {
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < CEILING_ROW; y++) tiles[y * cols + x] = 1;
  }
};

const placePlatform = (tiles: Uint8Array, cols: number, x: number, y: number, width: number) => {
  for (let i = 0; i < width; i++) {
    const xx = x + i;
    if (xx >= 0 && xx < cols && y >= CEILING_ROW && y < FLOOR_ROW) tiles[y * cols + xx] = 1;
  }
};

const clearDoorways = (tiles: Uint8Array, cols: number) => {
  for (const x of [0, 1, cols - 2, cols - 1]) {
    if (x < 0 || x >= cols) continue;
    for (let y = CEILING_ROW; y < FLOOR_ROW; y++) tiles[y * cols + x] = 0;
    for (let y = FLOOR_ROW; y < TILE_ROWS; y++) tiles[y * cols + x] = 1;
  }
};

const chunkFlat = (cols: number, _rng: () => number) => {
  const tiles = new Uint8Array(cols * TILE_ROWS);
  fillCeiling(tiles, cols);
  fillFloor(tiles, cols, 0, cols, FLOOR_ROW);
  clearDoorways(tiles, cols);
  return tiles;
};

const chunkGap = (cols: number, rng: () => number) => {
  const tiles = new Uint8Array(cols * TILE_ROWS);
  fillCeiling(tiles, cols);
  const gapWidth = 3 + randInt(rng, 2);
  const gapX = 2 + randInt(rng, Math.max(1, cols - gapWidth - 4));
  fillFloor(tiles, cols, 0, gapX, FLOOR_ROW);
  fillFloor(tiles, cols, gapX + gapWidth, cols, FLOOR_ROW);
  clearDoorways(tiles, cols);
  return tiles;
};

const chunkSteps = (cols: number, _rng: () => number) => {
  const tiles = new Uint8Array(cols * TILE_ROWS);
  fillCeiling(tiles, cols);
  fillFloor(tiles, cols, 0, cols, FLOOR_ROW);
  placePlatform(tiles, cols, 3, FLOOR_ROW - PLATFORM_RISE, Math.max(4, cols - 6));
  clearDoorways(tiles, cols);
  return tiles;
};

const chunkLedge = (cols: number, rng: () => number) => {
  const tiles = new Uint8Array(cols * TILE_ROWS);
  fillCeiling(tiles, cols);
  const mid = (cols / 2) | 0;
  const highLeft = rng() < 0.5;
  fillFloor(tiles, cols, 0, mid, highLeft ? FLOOR_ROW - PLATFORM_RISE : FLOOR_ROW);
  fillFloor(tiles, cols, mid, cols, highLeft ? FLOOR_ROW : FLOOR_ROW - PLATFORM_RISE);
  clearDoorways(tiles, cols);
  return tiles;
};

const chunkPitPlatform = (cols: number, rng: () => number) => {
  const tiles = new Uint8Array(cols * TILE_ROWS);
  fillCeiling(tiles, cols);
  const gapWidth = 4;
  const gapX = 2 + randInt(rng, Math.max(1, cols - gapWidth - 4));
  fillFloor(tiles, cols, 0, gapX, FLOOR_ROW);
  fillFloor(tiles, cols, gapX + gapWidth, cols, FLOOR_ROW);
  placePlatform(tiles, cols, gapX + 1, FLOOR_ROW - PLATFORM_RISE, gapWidth - 2);
  clearDoorways(tiles, cols);
  return tiles;
};

const hospitalChunk = () => {
  const cols = HOSPITAL_WIDTH / TILE;
  const tiles = new Uint8Array(cols * TILE_ROWS);
  fillCeiling(tiles, cols);
  fillFloor(tiles, cols, 0, cols, FLOOR_ROW);
  for (let y = CEILING_ROW; y < TILE_ROWS; y++) tiles[y * cols] = 1;
  return tiles;
};

const templates = [chunkFlat, chunkGap, chunkSteps, chunkLedge, chunkPitPlatform];

export const pickKind = (rng: () => number, loop: number) => {
  const weights = [
    UNICORN_WEIGHT[0],
    loop >= 2 ? UNICORN_WEIGHT[1] : 0,
    loop >= 3 ? UNICORN_WEIGHT[2] : 0,
    loop >= 4 ? UNICORN_WEIGHT[3] : 0,
  ];
  let total = weights[0] + weights[1] + weights[2] + weights[3];
  let roll = rng() * total;
  for (let i = 0; i < 4; i++) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return 0;
};

const floorAt = (tiles: Uint8Array, cols: number, x: number) => {
  for (let y = CEILING_ROW; y < TILE_ROWS; y++) {
    if (tiles[y * cols + x]) return y;
  }
  return -1;
};

const crowded = (lists: Spawn[][], x: number, y: number) => {
  for (const list of lists) {
    for (const spawn of list) {
      if (Math.abs(spawn.x - x) < SPAWN_GAP && Math.abs(spawn.y - y) < 32) return 1;
    }
  }
  return 0;
};

const addSpawns = (
  list: Spawn[],
  tiles: Uint8Array,
  cols: number,
  originX: number,
  rng: () => number,
  loop: number,
  tries: number,
  chance: number,
) => {
  for (let i = 0; i < tries; i++) {
    if (rng() > chance) continue;
    for (let k = 0; k < 5; k++) {
      const x = 2 + randInt(rng, Math.max(1, cols - 4));
      const floor = floorAt(tiles, cols, x);
      if (floor < 0) continue;
      const worldX = (originX + x) * TILE + 4;
      const worldY = floor * TILE;
      if (crowded([list], worldX, worldY)) continue;
      list.push({ x: worldX, y: worldY, kind: pickKind(rng, loop), used: 0 });
      break;
    }
  }
};

const densityFor = (loop: number) => Math.min(0.95, SPAWN_CHANCE * (1 + DENSITY_PER_LOOP * (loop - 1)));

const stitch = (world: World, tiles: Uint8Array, cols: number) => {
  const nextCols = world.cols + cols;
  const next = new Uint8Array(nextCols * TILE_ROWS);
  for (let y = 0; y < TILE_ROWS; y++) {
    for (let x = 0; x < world.cols; x++) next[y * nextCols + x] = world.grid[y * world.cols + x];
    for (let x = 0; x < cols; x++) next[y * nextCols + world.cols + x] = tiles[y * cols + x];
  }
  const originX = world.cols;
  world.grid = next;
  world.cols = nextCols;
  world.width = nextCols * TILE;
  return originX;
};

const addChunk = (world: World, tiles: Uint8Array, cols: number, spawn: number) => {
  const originX = stitch(world, tiles, cols);
  if (spawn) {
    const density = densityFor(world.loop);
    addSpawns(world.huntSpawns, tiles, cols, originX, world.rng, world.loop, SPAWN_TRIES, density);
    addSpawns(world.returnSpawns, tiles, cols, originX, world.rng, world.loop, SPAWN_TRIES, density * RETURN_DENSITY);
  }
};

export const growWorld = (world: World, untilX: number) => {
  while (world.width < untilX) {
    const cols = 8 + randInt(world.rng, 9);
    const tiles = templates[randInt(world.rng, templates.length)](cols, world.rng);
    addChunk(world, tiles, cols, 1);
  }
};

export const createWorld = (loop: number, seed: number): World => {
  const rng = createRng(seed);
  const world: World = {
    grid: new Uint8Array(0),
    cols: 0,
    hospitalWidth: HOSPITAL_WIDTH,
    width: 0,
    huntSpawns: [],
    returnSpawns: [],
    rng,
    loop,
  };
  addChunk(world, hospitalChunk(), HOSPITAL_WIDTH / TILE, 0);
  growWorld(world, HOSPITAL_WIDTH + OPENING_CHUNKS * 96);
  return world;
};

export const solid = (world: World, x: number, y: number) => {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (ty < 0) return 1;
  if (tx < 0 || tx >= world.cols) return 1;
  if (ty >= TILE_ROWS) return 0;
  return world.grid[ty * world.cols + tx];
};

export type Body = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  onGround: number;
  hitWall: number;
};

export const moveBody = (body: Body, world: World, gravity = 0) => {
  if (gravity) {
    body.vy += gravity;
    if (body.vy > 6) body.vy = 6;
  }
  body.hitWall = 0;
  body.x += body.vx;
  if (body.vx > 0) {
    if (solid(world, body.x + body.w, body.y + 1) || solid(world, body.x + body.w, body.y + body.h - 1)) {
      body.x = Math.floor((body.x + body.w) / TILE) * TILE - body.w;
      body.vx = 0;
      body.hitWall = 1;
    }
  } else if (body.vx < 0) {
    if (solid(world, body.x, body.y + 1) || solid(world, body.x, body.y + body.h - 1)) {
      body.x = Math.floor(body.x / TILE) * TILE + TILE;
      body.vx = 0;
      body.hitWall = 1;
    }
  }
  body.y += body.vy;
  body.onGround = 0;
  if (body.vy >= 0) {
    if (solid(world, body.x + 1, body.y + body.h) || solid(world, body.x + body.w - 1, body.y + body.h)) {
      body.y = Math.floor((body.y + body.h) / TILE) * TILE - body.h;
      body.vy = 0;
      body.onGround = 1;
    }
  } else if (solid(world, body.x + 1, body.y) || solid(world, body.x + body.w - 1, body.y)) {
    body.y = Math.floor(body.y / TILE) * TILE + TILE;
    body.vy = 0;
  }
};

export const overlaps = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
