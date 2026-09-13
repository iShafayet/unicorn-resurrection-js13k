import { getLine } from '../talk';
import { drawBubble } from './canvas';

export const drawDialogue = (
  camX: number,
  camY: number,
  playerX: number,
  playerY: number,
  motherX: number,
  motherY: number,
) => {
  const line = getLine();
  if (!line) return;
  const x = (line.speaker ? motherX + 8 : playerX + 5) - camX;
  const y = (line.speaker ? motherY : playerY) - camY;
  drawBubble(line.text, x, y);
};
