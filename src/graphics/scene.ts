import { VIEW_WIDTH, VIEW_HEIGHT, SKY, Phase } from '../config';
import { getView } from '../game';
import { ctx, present, fillOverlay, flushOverlay } from './canvas';
import { drawTiles, drawHospital } from './world';
import { drawActors } from './actors';
import { drawVial, drawHud, drawTitle, drawGameOver, drawEnding } from './hud';
import { drawDialogue } from './dialogue';
import { drawTouchPads } from './touch';
import { drawSprite } from './canvas';
import { unicornSprites } from './unicorn-sprites';

export const draw = () => {
  const view = getView();
  const { game } = view;
  ctx.fillStyle = SKY;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.save();
  ctx.translate(0, -game.cameraY | 0);
  drawTiles(game.world, game.cameraX);
  drawHospital(view);
  if (game.phase === Phase.Redeath) {
    drawSprite(unicornSprites[0][0], view.killerX - game.cameraX, view.killerY, view.killerFace < 0 ? 1 : 0);
  }
  drawActors(game);
  ctx.restore();
  if (!view.showingTitle) drawVial(view);
  present(view.hitFlash ? 0.85 : 0);
  if (view.showingTitle) {
    drawTitle();
    drawTouchPads();
    flushOverlay();
    return;
  }
  drawHud(view);
  if (game.phase !== Phase.Ending && game.phase !== Phase.Die) {
    drawDialogue(game.cameraX, game.cameraY, game.player.x, game.player.y, view.momX, view.momY);
  }
  if (view.wakeFade > 0) fillOverlay(0, 0, VIEW_WIDTH, VIEW_HEIGHT, `rgba(72,70,74,${view.wakeFade})`);
  if (view.fadeBlack > 0) fillOverlay(0, 0, VIEW_WIDTH, VIEW_HEIGHT, `rgba(0,0,0,${view.fadeBlack})`);
  if (game.phase === Phase.Die && view.fadeBlack >= 0.95) drawGameOver(view);
  if (game.phase === Phase.Ending) drawEnding(view);
  drawTouchPads();
  flushOverlay();
};
