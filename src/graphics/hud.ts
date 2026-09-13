import {
  VIEW_WIDTH, VIEW_HEIGHT, TILE, CEILING_ROW, HOSPITAL_WIDTH, VAT_X, STARTING_LIVES, Phase,
} from '../config';
import { GOODBYE_MIN_RUN } from '../playtest';
import { usingGamepad, shootPrompt, jumpPrompt, touchEnabled } from '../input';
import { View, inHospital } from '../game';
import { ctx, drawText, fillOverlay, toRoman } from './canvas';

let blink = 0;

export const drawVial = (view: View) => {
  const { game } = view;
  const quota = game.quota;
  const vat = Math.max(0, game.player.vat);
  const x = 3;
  const vw = 5;
  const vh = 16;
  const y0 = 2 + STARTING_LIVES * 4;
  for (let i = 0; i < STARTING_LIVES; i++) {
    const y = 2 + i * 4;
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, vw + 2, 4);
    ctx.fillStyle = game.player.lives > STARTING_LIVES - 1 - i ? '#f4e4c1' : '#3a3a48';
    ctx.fillRect(x + 1, y + 1, vw, 2);
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y0, vw + 2, vh + 2);
  ctx.fillStyle = '#3a3a48';
  ctx.fillRect(x + 1, y0 + 1, vw, vh);
  const fillH = (vat / quota) * vh;
  ctx.fillStyle = '#c4281c';
  ctx.fillRect(x + 1, y0 + 1 + vh - fillH, vw, fillH);
  ctx.fillStyle = '#f4e4c1';
  ctx.fillRect(x, y0 + 1, vw + 2, 1);
  for (const spark of game.sparks) {
    ctx.fillStyle = spark.color;
    ctx.fillRect(spark.x | 0, spark.y | 0, 2, 2);
  }
};

export const drawTitle = () => {
  blink++;
  fillOverlay(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 'rgba(0,0,0,0.62)');
  drawText('Unicorn Resurrection', VIEW_WIDTH / 2, 28, 11, 'center', '#f4e4c1');
  drawText('Press ' + shootPrompt() + ' to resurrect mom', VIEW_WIDTH / 2, 48, 8, 'center');
  drawText('A game by Sayem Shafayet', 4, touchEnabled ? 8 : VIEW_HEIGHT - 11, 6, 'left', '#8a8478');
};

export const drawHud = (view: View) => {
  const {
    game, bestLoop, teachAlpha, teachUnlocked, banner, bannerTimer, griefAlpha, filledOnce,
  } = view;
  blink++;
  if (game.phase !== Phase.Grief && game.phase !== Phase.Kiss && game.phase !== Phase.Ending && game.phase !== Phase.Die) {
    drawText(toRoman(game.loop), VIEW_WIDTH / 2, 3, 8, 'center');
    if (inHospital()) drawText('BEST: ' + toRoman(bestLoop), VIEW_WIDTH - 20, 3, 7, 'right');
  }
  if (game.player.vat >= game.quota && (game.phase === Phase.Hunt || game.phase === Phase.Return) && (blink & 32) < 22) {
    drawText('FULL', 14, 3, 7, 'left', '#c4281c');
  }
  if (game.phase === Phase.Title) {
    drawText('Press ' + shootPrompt() + ' to pour', VIEW_WIDTH / 2, 22, 9, 'center');
  }
  if (teachAlpha > 0) {
    const a = teachAlpha * 0.8;
    const cx = VAT_X + 14 - game.cameraX;
    const cy = CEILING_ROW * TILE + 6 - game.cameraY;
    if (usingGamepad()) {
      drawText('D-pad / stick  move', cx, cy, 6, 'left', '#c8c0b4', a);
      drawText('A  jump', cx, cy + 9, 6, 'left', '#c8c0b4', a);
      drawText('X  shoot', cx, cy + 18, 6, 'left', '#c8c0b4', a);
    } else {
      drawText('Arrows / WASD  move', cx, cy, 6, 'left', '#c8c0b4', a);
      drawText('Space  jump', cx, cy + 9, 6, 'left', '#c8c0b4', a);
      drawText('F  shoot', cx, cy + 18, 6, 'left', '#c8c0b4', a);
    }
  }
  if (teachUnlocked && game.loop === 1) {
    const a = 0.8;
    const y = CEILING_ROW * TILE + 8 - game.cameraY;
    const x0 = HOSPITAL_WIDTH + 24 - game.cameraX;
    const x1 = HOSPITAL_WIDTH + VIEW_WIDTH + 24 - game.cameraX;
    const x2 = HOSPITAL_WIDTH + VIEW_WIDTH * 2 + 24 - game.cameraX;
    drawText('Kill unicorns and collect blood', x0, y, 6, 'left', '#c8c0b4', a);
    drawText('to resurrect mom', x0, y + 9, 6, 'left', '#c8c0b4', a);
    drawText('Stand in blood puddles', x1, y, 6, 'left', '#c8c0b4', a);
    drawText('to fill the vat', x1, y + 9, 6, 'left', '#c8c0b4', a);
    drawText('Collected blood', x2, y, 6, 'left', '#c8c0b4', a);
    drawText('doubles as HP', x2, y + 9, 6, 'left', '#c8c0b4', a);
  }
  if (game.phase === Phase.Pour) {
    if (game.loop >= GOODBYE_MIN_RUN) drawText('Press ' + jumpPrompt() + ' to pause', VIEW_WIDTH / 2, 22, 9, 'center');
    else drawText('Pouring...', VIEW_WIDTH / 2, 22, 9, 'center', '#c4281c');
  }
  if (game.phase === Phase.Grief && game.grief < 5) {
    drawText('Press ' + jumpPrompt() + (game.grief >= 4 ? ' to let go' : '...'), VIEW_WIDTH / 2, 22, 8, 'center', '#c8c0b4', griefAlpha);
    drawText('Press ' + shootPrompt() + ' to go again', VIEW_WIDTH / 2, 36, 8, 'center', '#8a8478', griefAlpha);
  }
  if (bannerTimer > 0 && (bannerTimer & 8) < 6) {
    drawText(banner, VIEW_WIDTH / 2, 22, 14, 'center', banner === 'RUN' ? '#c4281c' : '#f4e4c1');
  }
  if (game.loop === 1 && filledOnce && (game.phase === Phase.Hunt || game.phase === Phase.Return) && game.player.x >= game.world.hospitalWidth + 80) {
    drawText('Return to mom with a full vat', VIEW_WIDTH / 2, 36, 7, 'center', '#f4e4c1');
  }
};

export const drawGameOver = (view: View) => {
  const a = view.gameOverAlpha < 1 ? view.gameOverAlpha : 1;
  drawText('Game Over', VIEW_WIDTH / 2, 36, 12, 'center', '#f4e4c1', a);
  if (view.gameOverAlpha > 0.7) {
    drawText(
      'Press ' + shootPrompt() + ' to resurrect self',
      VIEW_WIDTH / 2,
      56,
      8,
      'center',
      '#c8c0b4',
      view.gameOverAlpha - 0.7 < 1 ? view.gameOverAlpha - 0.7 : 1,
    );
  }
};

export const drawEnding = (view: View) => {
  const { endingStage, endingAlpha } = view;
  if (endingStage < 3) {
    drawText('Unable are the Loved to die', VIEW_WIDTH / 2, 22, 8, 'center', '#f4e4c1', endingAlpha);
    drawText('For Love is Immortality,', VIEW_WIDTH / 2, 36, 8, 'center', '#f4e4c1', endingAlpha);
    drawText('Nay, it is Deity', VIEW_WIDTH / 2, 50, 8, 'center', '#f4e4c1', endingAlpha);
    drawText('- Emily Dickinson', VIEW_WIDTH / 2, 68, 7, 'center', '#8a8478', endingAlpha);
  } else {
    drawText('Thank you for playing this game', VIEW_WIDTH / 2, 16, 7, 'center', '#f4e4c1', endingAlpha);
    drawText('by Sayem Shafayet who often', VIEW_WIDTH / 2, 28, 7, 'center', '#c8c0b4', endingAlpha);
    drawText('has a hard time letting go.', VIEW_WIDTH / 2, 40, 7, 'center', '#c8c0b4', endingAlpha);
    drawText('Stay in touch: sayemshafayet.com', VIEW_WIDTH / 2, 60, 7, 'center', '#8a96a0', endingAlpha);
    if (endingAlpha > 0.55) {
      const pa = endingAlpha - 0.55 < 1 ? endingAlpha - 0.55 : 1;
      drawText('Press ' + shootPrompt() + ' to resurrect self', VIEW_WIDTH / 2, 80, 8, 'center', '#c8c0b4', pa);
    }
  }
};
