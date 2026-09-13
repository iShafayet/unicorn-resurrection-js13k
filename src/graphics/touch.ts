import { input, touchEnabled, touchPads } from '../input';
import { drawCircle, drawText, drawFullscreenIcon } from './canvas';

export const drawTouchPads = () => {
  drawFullscreenIcon();
  if (!touchEnabled) return;
  for (const pad of touchPads) {
    const held = pad[3] === 'left' ? input.left
      : pad[3] === 'right' ? input.right
      : pad[3] === 'jump' ? input.jump
      : input.shoot;
    drawCircle(pad[0], pad[1], pad[2], '#f0e0c4', held ? 0.28 : 0.1);
    drawText(pad[4], pad[0], pad[1] - 4, 8, 'center', '#1a1410', 0.4);
  }
};
