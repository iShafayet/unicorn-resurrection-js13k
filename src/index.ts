import { bindInput } from './input';
import { boot, tick } from './game';
import { draw } from './graphics/scene';
import { resize } from './graphics/canvas';

bindInput();
boot();
addEventListener('resize', resize);
resize();

let previous = 0;
const FRAME_MS = 1000 / 60;
let accumulator = 0;

const frame = (now: number) => {
  accumulator += Math.min(now - previous, 64);
  previous = now;
  while (accumulator >= FRAME_MS) {
    tick();
    accumulator -= FRAME_MS;
  }
  draw();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
