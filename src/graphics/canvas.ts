import { VIEW_WIDTH, VIEW_HEIGHT } from '../config';
import { PALETTE } from './palette';

export let buf: HTMLCanvasElement;
export let ctx: CanvasRenderingContext2D;
let screen: HTMLCanvasElement;
let screenCtx: CanvasRenderingContext2D;
let overlayCanvas: HTMLCanvasElement;
let overlayCtx: CanvasRenderingContext2D;
let viewScale = 1;
let dpr = 1;
let originX = 0;
let originY = 0;
const OVERLAY_SCALE = 2;

const pixelScale = () => viewScale * dpr;

export const screenShake = { magnitude: 0, time: 0 };

export const shake = (magnitude: number, time: number) => {
  screenShake.magnitude = magnitude;
  screenShake.time = time;
};

export const decodeSprite = (w: number, raw: string, pal = PALETTE) => {
  const s = raw.replace(/\s/g, '');
  const h = (s.length / w) | 0;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const im = g.createImageData(w, h);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const id = ch === '.' ? 0 : ch.charCodeAt(0) - 48;
    if (!id) continue;
    const col = pal[id];
    const o = i * 4;
    im.data[o] = col >> 16;
    im.data[o + 1] = (col >> 8) & 255;
    im.data[o + 2] = col & 255;
    im.data[o + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return c;
};

export const bootCanvas = () => {
  buf = document.createElement('canvas');
  buf.width = VIEW_WIDTH;
  buf.height = VIEW_HEIGHT;
  ctx = buf.getContext('2d')!;
  overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = VIEW_WIDTH * OVERLAY_SCALE;
  overlayCanvas.height = VIEW_HEIGHT * OVERLAY_SCALE;
  overlayCtx = overlayCanvas.getContext('2d')!;
  screen = document.getElementById('c2d') as HTMLCanvasElement;
  screenCtx = screen.getContext('2d')!;
};

export const resize = () => {
  const dw = innerWidth;
  const dh = innerHeight;
  dpr = devicePixelRatio || 1;
  screen.width = (dw * dpr) | 0;
  screen.height = (dh * dpr) | 0;
  const fit = Math.min(dw / VIEW_WIDTH, dh / VIEW_HEIGHT);
  viewScale = dw < 648 ? fit : Math.max(1, fit | 0);
};

export const drawSprite = (spr: HTMLCanvasElement, x: number, y: number, flip = 0, sw = 0, sh = 0) => {
  sw = sw || spr.width;
  sh = sh || spr.height;
  x |= 0;
  y |= 0;
  if (flip) {
    ctx.save();
    ctx.translate(x + sw, y);
    ctx.scale(-1, 1);
    ctx.drawImage(spr, 0, 0, sw, sh);
    ctx.restore();
  } else ctx.drawImage(spr, x, y, sw, sh);
};

export const drawText = (s: string, x: number, y: number, size = 8, align: CanvasTextAlign = 'left', col = '#c8c0b4', a = 1) => {
  const px = (x * OVERLAY_SCALE) | 0;
  const py = (y * OVERLAY_SCALE) | 0;
  overlayCtx.save();
  overlayCtx.globalAlpha = a;
  overlayCtx.font = `700 ${size * OVERLAY_SCALE}px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
  overlayCtx.textAlign = align;
  overlayCtx.textBaseline = 'top';
  overlayCtx.fillStyle = '#000';
  overlayCtx.fillText(s, px + 1, py + 1);
  overlayCtx.fillStyle = col;
  overlayCtx.fillText(s, px, py);
  overlayCtx.restore();
};

export const fillOverlay = (x: number, y: number, w: number, h: number, col = 'rgba(0,0,0,0.55)') => {
  overlayCtx.fillStyle = col;
  overlayCtx.fillRect((x * OVERLAY_SCALE) | 0, (y * OVERLAY_SCALE) | 0, (w * OVERLAY_SCALE) | 0, (h * OVERLAY_SCALE) | 0);
};

export const textWidth = (s: string, size = 7) => {
  overlayCtx.font = `700 ${size * OVERLAY_SCALE}px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
  return overlayCtx.measureText(s).width / OVERLAY_SCALE;
};

export const drawBubble = (s: string, x: number, y: number) => {
  const size = textWidth(s, 7) > VIEW_WIDTH - 18 ? 6 : 7;
  const w = textWidth(s, size) + 8;
  const h = size + 6;
  let bx = x - w / 2;
  let by = y - h - 7;
  if (bx < 2) bx = 2;
  if (bx + w > VIEW_WIDTH - 2) bx = VIEW_WIDTH - 2 - w;
  if (by < 2) by = 2;
  fillOverlay(bx - 1, by - 1, w + 2, h + 2, '#2a2420');
  fillOverlay(bx, by, w, h, '#f0e0c4');
  const tx = x < bx + 4 ? bx + 4 : x > bx + w - 5 ? bx + w - 5 : x;
  fillOverlay(tx - 1, by + h, 3, 3, '#f0e0c4');
  fillOverlay(tx + 1, by + h + 3, 2, 2, '#f0e0c4');
  drawText(s, bx + w / 2, by + 3, size, 'center', '#1a1410');
};

export const clientToView = (cx: number, cy: number) => {
  const r = screen.getBoundingClientRect();
  const z = pixelScale();
  const bx = (screen.width - VIEW_WIDTH * z) / 2;
  const by = (screen.height - VIEW_HEIGHT * z) / 2;
  return [
    ((cx - r.left) * screen.width / r.width - bx) / z,
    ((cy - r.top) * screen.height / r.height - by) / z,
  ];
};

export const FULLSCREEN_X = VIEW_WIDTH - 14;
export const FULLSCREEN_Y = 4;

export const fullscreenHit = (x: number, y: number) =>
  x >= FULLSCREEN_X - 3 && x <= FULLSCREEN_X + 11 && y >= FULLSCREEN_Y - 3 && y <= FULLSCREEN_Y + 11;

export const drawFullscreenIcon = () => {
  overlayCtx.save();
  overlayCtx.globalAlpha = 0.4;
  overlayCtx.fillStyle = '#f0e0c4';
  const bit = (x: number, y: number, w: number, h: number) =>
    overlayCtx.fillRect((x * OVERLAY_SCALE) | 0, (y * OVERLAY_SCALE) | 0, w * OVERLAY_SCALE, h * OVERLAY_SCALE);
  const on = document.fullscreenElement || (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement;
  const arm = (cx: number, cy: number, dx: number, dy: number) => {
    bit(cx + (dx < 0 ? -2 : 0), cy, 3, 1);
    bit(cx, cy + (dy < 0 ? -2 : 0), 1, 3);
  };
  if (!on) {
    arm(FULLSCREEN_X, FULLSCREEN_Y, 1, 1);
    arm(FULLSCREEN_X + 7, FULLSCREEN_Y, -1, 1);
    arm(FULLSCREEN_X, FULLSCREEN_Y + 7, 1, -1);
    arm(FULLSCREEN_X + 7, FULLSCREEN_Y + 7, -1, -1);
  } else {
    bit(FULLSCREEN_X + 2, FULLSCREEN_Y, 1, 3);
    bit(FULLSCREEN_X, FULLSCREEN_Y + 2, 3, 1);
    bit(FULLSCREEN_X + 5, FULLSCREEN_Y, 1, 3);
    bit(FULLSCREEN_X + 5, FULLSCREEN_Y + 2, 3, 1);
    bit(FULLSCREEN_X + 2, FULLSCREEN_Y + 5, 1, 3);
    bit(FULLSCREEN_X, FULLSCREEN_Y + 5, 3, 1);
    bit(FULLSCREEN_X + 5, FULLSCREEN_Y + 5, 1, 3);
    bit(FULLSCREEN_X + 5, FULLSCREEN_Y + 5, 3, 1);
  }
  overlayCtx.restore();
};

export const drawCircle = (x: number, y: number, r: number, col: string, a = 1) => {
  overlayCtx.save();
  overlayCtx.globalAlpha = a;
  overlayCtx.fillStyle = col;
  overlayCtx.beginPath();
  overlayCtx.arc((x * OVERLAY_SCALE) | 0, (y * OVERLAY_SCALE) | 0, r * OVERLAY_SCALE, 0, 7);
  overlayCtx.fill();
  overlayCtx.restore();
};

export const flushOverlay = () => {
  const z = pixelScale();
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.drawImage(overlayCanvas, originX, originY, VIEW_WIDTH * z, VIEW_HEIGHT * z);
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
};

export const toRoman = (n: number) => {
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const glyphs = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let out = '';
  for (let i = 0; i < 13; i++) {
    while (n >= values[i]) {
      out += glyphs[i];
      n -= values[i];
    }
  }
  return out || 'N';
};

export const present = (flash = 0) => {
  if (flash) {
    ctx.fillStyle = `rgba(255,255,255,${flash})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
  screenCtx.imageSmoothingEnabled = false;
  screenCtx.fillStyle = '#000';
  screenCtx.fillRect(0, 0, screen.width, screen.height);
  const z = pixelScale();
  originX = (screen.width - VIEW_WIDTH * z) / 2;
  originY = (screen.height - VIEW_HEIGHT * z) / 2;
  if (screenShake.time > 0) {
    originX += (Math.random() - 0.5) * screenShake.magnitude * z;
    originY += (Math.random() - 0.5) * screenShake.magnitude * z;
  }
  screenCtx.drawImage(buf, originX, originY, VIEW_WIDTH * z, VIEW_HEIGHT * z);
};
