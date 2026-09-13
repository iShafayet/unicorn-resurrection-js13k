import { FIRE_RATE, Phase, Stance } from '../config';
import { Game } from '../entities';
import { ctx, drawSprite } from './canvas';
import { playerSprites } from './player-sprites';
import { unicornSprites, corpseSprites } from './unicorn-sprites';

export const drawActors = (game: Game) => {
  const cam = game.cameraX;
  for (const patch of game.slime) {
    const x = patch.x - cam;
    const y = patch.y;
    const colors = ['#c4281c', '#d4a017', '#3d9a58', '#3a7ec0'];
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(x, y + i, patch.w, 1);
    }
  }
  for (const puddle of game.puddles) {
    const rr = puddle.r * (0.45 * puddle.life / puddle.maxLife + 0.55 * puddle.amount / puddle.maxAmount);
    ctx.fillStyle = '#c4281c';
    ctx.beginPath();
    ctx.ellipse(puddle.x - cam, puddle.y, rr, rr * 0.4, 0, 0, 7);
    ctx.fill();
  }
  for (const drop of game.droplets) {
    ctx.fillStyle = '#c4281c';
    ctx.fillRect((drop.x - cam) | 0, drop.y | 0, 2, 2);
  }
  for (const blob of game.vomits) {
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(blob.x - cam + 2, blob.y + 2, 2, 0, 7);
    ctx.fill();
  }
  for (const bullet of game.bullets) {
    ctx.fillStyle = '#f4e4c1';
    ctx.fillRect((bullet.x - cam) | 0, bullet.y | 0, 2, 2);
  }
  for (const unicorn of game.unicorns) {
    const x = unicorn.x - cam;
    const y = unicorn.y;
    const flip = unicorn.face < 0 ? 1 : 0;
    ctx.save();
    if (unicorn.dead) {
      const corpse = corpseSprites[unicorn.kind];
      const dw = (corpse.width * unicorn.scale) | 0;
      const dh = (corpse.height * unicorn.scale) | 0;
      drawSprite(corpse, x + ((unicorn.w - dw) / 2 | 0), y + unicorn.h - dh, flip, dw, dh);
      ctx.restore();
      continue;
    }
    const frame = (unicorn.anim >> 3) & 1;
    const sprite = unicornSprites[unicorn.kind][unicorn.stance === Stance.Dash || unicorn.stance === Stance.Rear ? 0 : frame];
    if (unicorn.stance === Stance.Rear || unicorn.stance === Stance.Jaw) {
      if ((unicorn.timer & 4) === 0) ctx.globalAlpha = 0.55;
    }
    if (unicorn.stance === Stance.Rear) {
      ctx.translate(x + unicorn.w / 2, y + unicorn.h);
      ctx.rotate(-0.35 * unicorn.face);
      ctx.translate(-unicorn.w / 2, -unicorn.h - 3);
      drawSprite(sprite, 0, 0, flip, unicorn.w, unicorn.h);
    } else if (unicorn.stance === Stance.Crouch) {
      drawSprite(sprite, x, y + unicorn.h * 0.28, flip, unicorn.w, unicorn.h * 0.72);
    } else {
      drawSprite(sprite, x, y, flip, unicorn.w, unicorn.h);
    }
    ctx.restore();
  }
  const player = game.player;
  if (game.phase === Phase.Die) {
    ctx.save();
    ctx.translate(player.x - cam + 5, player.y + 16);
    ctx.rotate(0.9);
    drawSprite(playerSprites[3], -8, -14);
    ctx.restore();
  } else if (game.phase === Phase.Grief && game.grief === 4) {
    drawSprite(playerSprites[7], player.x - cam - 3, player.y - 4, player.face > 0 ? 1 : 0);
  } else if (game.phase === Phase.Kiss && game.kiss) {
    const u = game.kiss * game.kiss * (3 - 2 * game.kiss);
    ctx.save();
    ctx.translate(player.x - cam + 5, player.y + 18);
    ctx.rotate(0.42 * u);
    drawSprite(playerSprites[0], -6, -22, 1);
    ctx.restore();
  } else if (!(player.iframes && (player.iframes & 2))) {
    let frame = 0;
    const playing = game.phase === Phase.Hunt || game.phase === Phase.Return
      || game.phase === Phase.Arrive || game.phase === Phase.Kiss;
    if (game.phase === Phase.Pour || (game.phase === Phase.Grief && !game.grief)) frame = 6;
    else if (game.phase === Phase.Grief && game.grief === 3) frame = 6;
    else if (player.aiming > 0) frame = player.fireCool > FIRE_RATE - 4 ? 5 : 4;
    else if (playing && !player.onGround) frame = 3;
    else if (playing && Math.abs(player.vx) > 0.3) {
      const cycle = (player.anim >> 2) & 3;
      frame = cycle === 1 ? 1 : cycle === 3 ? 2 : 0;
    }
    const bob = frame === 1 || frame === 2 ? (player.anim >> 2) & 1 : 0;
    drawSprite(playerSprites[frame], player.x - cam - 3, player.y - 4 + bob, player.face > 0 ? 1 : 0);
  }
  for (const mote of game.motes) {
    ctx.fillStyle = mote.color;
    ctx.fillRect((mote.x - cam) | 0, mote.y | 0, 2, 2);
  }
};
