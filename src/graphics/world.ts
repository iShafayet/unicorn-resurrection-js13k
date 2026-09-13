import {
  VIEW_WIDTH, TILE, TILE_ROWS, FLOOR_ROW, CEILING_ROW, HOSPITAL_WIDTH,
  STONE_DARK, WALL, WINDOW, STONE, LINOLEUM, VAT_X, BED_X, POUR_X, Phase, Mom,
} from '../config';
import { World } from '../level';
import { View } from '../game';
import { ctx, drawSprite } from './canvas';
import { momLie, momLieShut, momCeiling, momStand, momStandShut, momLook } from './mom-sprites';

export const drawTiles = (world: World, cameraX: number) => {
  const x0 = Math.max(0, (cameraX / TILE) | 0);
  const x1 = Math.min(world.cols, ((cameraX + VIEW_WIDTH) / TILE | 0) + 1);
  const hospitalCols = (world.hospitalWidth / TILE) | 0;
  for (let y = 0; y < TILE_ROWS; y++) {
    for (let x = x0; x < x1; x++) {
      if (!world.grid[y * world.cols + x]) continue;
      const px = x * TILE - cameraX;
      const py = y * TILE;
      const top = y === 0 || !world.grid[(y - 1) * world.cols + x];
      ctx.fillStyle = x < hospitalCols ? LINOLEUM : STONE;
      ctx.fillRect(px, py, TILE, TILE);
      if (top) {
        ctx.fillStyle = x < hospitalCols ? '#3a3640' : STONE_DARK;
        ctx.fillRect(px, py, TILE, 1);
        if (((x * 3 + y) & 3) === 0) ctx.fillRect(px + 2, py + 2, 3, 1);
      }
    }
  }
};

export const drawHospital = (view: View) => {
  const { game, pipeHead, pipeTail, slain, momPose, momX, momY, momAngle } = view;
  const cam = game.cameraX;
  if (cam > HOSPITAL_WIDTH) return;
  const floorY = FLOOR_ROW * TILE;
  const ceilY = CEILING_ROW * TILE;
  ctx.fillStyle = '#16141a';
  ctx.fillRect(-cam, ceilY, HOSPITAL_WIDTH, floorY - ceilY);
  ctx.fillStyle = WALL;
  ctx.fillRect(-cam, ceilY, 8, floorY - ceilY);
  ctx.fillStyle = WINDOW;
  ctx.fillRect(118 - cam, ceilY + 6, 22, 16);
  ctx.fillStyle = '#8a9078';
  ctx.fillRect(120 - cam, ceilY + 8, 8, 6);
  ctx.fillStyle = '#1a181c';
  ctx.fillRect(128 - cam, ceilY + 6, 2, 16);
  ctx.fillRect(118 - cam, ceilY + 13, 22, 2);
  const px0 = VAT_X + 5 - cam;
  const px1 = BED_X + 16 - cam;
  const py0 = floorY;
  const py1 = floorY + 10;
  const py2 = floorY - 7;
  ctx.fillStyle = '#0a080c';
  ctx.fillRect(px0 - 3, py1 - 3, px1 - px0 + 7, 7);
  ctx.fillStyle = '#2a3038';
  ctx.fillRect(px0 - 2, py0, 5, py1 - py0 + 3);
  ctx.fillRect(px0 - 2, py1 - 2, px1 - px0 + 5, 5);
  ctx.fillRect(px1 - 2, py2, 5, py1 - py2 + 3);
  ctx.fillStyle = '#4a545c';
  ctx.fillRect(px0 - 1, py0, 3, py1 - py0 + 2);
  ctx.fillRect(px0 - 1, py1 - 1, px1 - px0 + 3, 3);
  ctx.fillRect(px1 - 1, py2, 3, py1 - py2 + 2);
  if (pipeHead > pipeTail) {
    const down = py1 - py0;
    const across = px1 - px0;
    const up = py1 - py2;
    const total = down + across + up;
    const a = total * pipeTail;
    const b = total * pipeHead;
    ctx.fillStyle = '#a81820';
    const segment = (x: number, y: number, w: number, h: number, s0: number, s1: number, upward = 0) => {
      const u0 = a < s0 ? s0 : a;
      const u1 = b > s1 ? s1 : b;
      if (u1 <= u0) return;
      const t0 = (u0 - s0) / (s1 - s0);
      const t1 = (u1 - s0) / (s1 - s0);
      if (h > w) {
        const ha = (h * t0 | 0);
        const hb = (h * t1 | 0);
        ctx.fillRect(x, upward ? y + h - hb : y + ha, w, Math.max(1, hb - ha));
      } else {
        const xa = (w * t0 | 0);
        const xb = (w * t1 | 0);
        ctx.fillRect(x + xa, y, Math.max(1, xb - xa), h);
      }
    };
    segment(px0, py0, 2, down, 0, down);
    segment(px0, py1, across, 2, down, down + across);
    segment(px1, py2, 2, up, down + across, total, 1);
  }
  ctx.fillStyle = '#2a2420';
  ctx.fillRect(BED_X - cam, floorY - 12, 36, 12);
  ctx.fillStyle = '#4a4038';
  ctx.fillRect(BED_X - 2 - cam, floorY - 4, 4, 4);
  ctx.fillRect(BED_X + 34 - cam, floorY - 4, 4, 4);
  ctx.fillStyle = '#c8b8a0';
  ctx.fillRect(BED_X + 4 - cam, floorY - 16, 28, 7);
  ctx.fillStyle = '#d8c8b0';
  ctx.fillRect(BED_X + 4 - cam, floorY - 18, 10, 5);
  if (slain && momPose === Mom.Lying) {
    ctx.fillStyle = '#8a1820';
    ctx.fillRect(BED_X + 12 - cam, floorY - 14, 12, 2);
  }
  const x = (momX - cam) | 0;
  const y = momY | 0;
  if (momPose === Mom.Falling) {
    ctx.save();
    ctx.translate(x + 8, y + momStand.height - 1);
    ctx.rotate(momAngle);
    drawSprite(slain ? momStandShut : momStand, -8, 1 - momStand.height);
    ctx.restore();
  } else if (momPose === Mom.Ceiling) {
    drawSprite(momCeiling, x, y);
  } else if (momPose === Mom.Lying || momPose === Mom.Camera) {
    drawSprite(slain ? momLieShut : momLie, x, y);
    if (slain && momPose === Mom.Lying) {
      ctx.fillStyle = '#a81820';
      ctx.fillRect(x + 8, y + 6, 8, 2);
    }
  } else if (momPose === Mom.Looking) {
    drawSprite(momLook, x, y);
  } else {
    drawSprite(momStand, x, y);
  }
  const tx = VAT_X + 3 - cam;
  const tankTop = ceilY + 6;
  const hoseY = floorY - 16;
  ctx.fillStyle = '#8a96a0';
  ctx.fillRect(tx - 1, tankTop, 9, 2);
  ctx.fillStyle = '#2a3038';
  ctx.fillRect(tx, tankTop + 2, 2, floorY - tankTop - 2);
  ctx.fillRect(tx + 5, tankTop + 2, 2, floorY - tankTop - 2);
  ctx.fillStyle = '#1a2028';
  ctx.fillRect(tx + 2, tankTop + 2, 3, floorY - tankTop - 2);
  ctx.fillStyle = '#0a0c10';
  ctx.fillRect(tx + 5, hoseY, 2, 4);
  ctx.fillStyle = '#8a96a0';
  ctx.fillRect(tx + 6, hoseY, 5, 3);
  ctx.fillStyle = '#1a2028';
  ctx.fillRect(tx + 7, hoseY + 1, 4, 1);
  if ((game.phase === Phase.Pour || game.phase === Phase.Grief) && pipeHead > pipeTail) {
    ctx.fillStyle = '#a81820';
    ctx.fillRect(tx + 2, hoseY + 3, 3, floorY - hoseY - 3);
    ctx.fillRect(tx + 7, hoseY + 1, POUR_X - VAT_X - 8, 1);
    ctx.fillRect(POUR_X - cam - 2, hoseY, 2, 3);
  }
};
