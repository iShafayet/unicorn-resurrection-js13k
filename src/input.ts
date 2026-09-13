import { unlockAudio } from './sfx';
import { clientToView, fullscreenHit } from './graphics/canvas';

export const input = {
  left: 0,
  right: 0,
  jump: 0,
  jumpPressed: 0,
  shoot: 0,
  shootPressed: 0,
  anyPressed: 0,
};

export const touchEnabled = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
export let gamepadConnected = 0;

export const usingGamepad = () => gamepadConnected || touchEnabled;
export const shootPrompt = () => (usingGamepad() ? 'X' : 'F');
export const jumpPrompt = () => (usingGamepad() ? 'A' : 'Space');

const keys: Record<string, number> = {};
let jumpWasDown = 0;
let shootWasDown = 0;
let anyWasDown = 0;
const fingers: Record<number, string> = {};
let lastFullscreenTap = 0;

const toggleFullscreen = () => {
  const now = performance.now();
  if (now - lastFullscreenTap < 400) return;
  lastFullscreenTap = now;
  const doc = document as Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void };
  const root = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc);
  } else {
    (root.requestFullscreen || root.webkitRequestFullscreen)?.call(root);
  }
};

const gameplayKeys = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'KeyA', 'KeyD', 'KeyW',
  'KeyF', 'ControlLeft', 'ControlRight',
]);

export const touchPads: [number, number, number, string, string][] = [
  [20, 102, 15, 'left', '<'],
  [52, 102, 15, 'right', '>'],
  [164, 102, 15, 'shoot', 'X'],
  [196, 102, 15, 'jump', 'A'],
];

const padAt = (x: number, y: number) => {
  for (const pad of touchPads) {
    const dx = x - pad[0];
    const dy = y - pad[1];
    if (dx * dx + dy * dy <= pad[2] * pad[2]) return pad[3];
  }
  return '';
};

const handleTouch = (event: TouchEvent, down: number) => {
  event.preventDefault();
  if (down) unlockAudio();
  for (let i = 0; i < event.changedTouches.length; i++) {
    const touch = event.changedTouches[i];
    if (!down) {
      delete fingers[touch.identifier];
    } else {
      const point = clientToView(touch.clientX, touch.clientY);
      if (fullscreenHit(point[0], point[1])) {
        toggleFullscreen();
        fingers[touch.identifier] = '';
      } else {
        fingers[touch.identifier] = padAt(point[0], point[1]);
      }
    }
  }
};

export const bindInput = () => {
  const setKey = (event: KeyboardEvent, down: number) => {
    if (gameplayKeys.has(event.code) || gameplayKeys.has(event.key)) event.preventDefault();
    keys[event.code] = down;
    if (down) unlockAudio();
  };
  onkeydown = event => setKey(event, 1);
  onkeyup = event => setKey(event, 0);
  addEventListener('touchstart', event => handleTouch(event, 1), { passive: false });
  addEventListener('touchmove', event => handleTouch(event, 1), { passive: false });
  addEventListener('touchend', event => handleTouch(event, 0), { passive: false });
  addEventListener('touchcancel', event => handleTouch(event, 0), { passive: false });
  addEventListener('gamepadconnected', () => unlockAudio());
  addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') return;
    const point = clientToView(event.clientX, event.clientY);
    if (fullscreenHit(point[0], point[1])) toggleFullscreen();
  });
};

const readGamepad = () => {
  const out = { left: 0, right: 0, jump: 0, shoot: 0 };
  gamepadConnected = 0;
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const pad of list) {
    if (!pad) continue;
    gamepadConnected = 1;
    const stick = pad.axes[0] || 0;
    if (stick < -0.4 || pad.buttons[14]?.pressed) out.left = 1;
    if (stick > 0.4 || pad.buttons[15]?.pressed) out.right = 1;
    if (pad.buttons[0]?.pressed || pad.buttons[1]?.pressed || pad.buttons[12]?.pressed) out.jump = 1;
    if (pad.buttons[2]?.pressed || pad.buttons[3]?.pressed) out.shoot = 1;
  }
  return out;
};

const readTouch = () => {
  const out = { left: 0, right: 0, jump: 0, shoot: 0 };
  for (const id in fingers) {
    const name = fingers[+id];
    if (name === 'left') out.left = 1;
    else if (name === 'right') out.right = 1;
    else if (name === 'jump') out.jump = 1;
    else if (name === 'shoot') out.shoot = 1;
  }
  return out;
};

export const pollInput = () => {
  const pad = readGamepad();
  const touch = readTouch();
  input.left = keys['ArrowLeft'] || keys['KeyA'] || pad.left || touch.left;
  input.right = keys['ArrowRight'] || keys['KeyD'] || pad.right || touch.right;
  input.jump = keys['Space'] || keys['KeyW'] || keys['ArrowUp'] || pad.jump || touch.jump;
  input.shoot = keys['KeyF'] || keys['ControlLeft'] || keys['ControlRight'] || pad.shoot || touch.shoot;
  input.jumpPressed = input.jump && !jumpWasDown ? 1 : 0;
  input.shootPressed = input.shoot && !shootWasDown ? 1 : 0;
  const any = input.left || input.right || input.jump || input.shoot;
  input.anyPressed = any && !anyWasDown ? 1 : 0;
  jumpWasDown = input.jump;
  shootWasDown = input.shoot;
  anyWasDown = any;
};
