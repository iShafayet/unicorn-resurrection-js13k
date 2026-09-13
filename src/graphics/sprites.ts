import { bootPlayerSprites } from './player-sprites';
import { bootUnicornSprites } from './unicorn-sprites';
import { bootMomSprites } from './mom-sprites';

export const bootSprites = () => {
  bootPlayerSprites();
  bootUnicornSprites();
  bootMomSprites();
};
