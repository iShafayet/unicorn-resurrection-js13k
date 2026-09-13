export type Line = { text: string; speaker: number; time: number };
let line: Line | 0 = 0;

const pack = (s: string) => s.split('|');
const pick = (list: string[]) => list[(Math.random() * list.length) | 0];

const DEATH = pack(
  'Aaarrgh! Get back here!|Nooooo! Not again!|No! This can\'t be happening.|I just got her back!|Stay away from her!|I\'ll kill every last one!|Not this time... not again...|Why her?! Why always her?!|I was so close...|Don\'t you die on me again!|I\'ll bring you back! I swear!|Get off her!',
);
const KILL = pack(
  'Die!|Die! Die!|Not enough blood!|Mom needs me!|Bleed!|For maa!|More! I need more!|Fall!|That\'s for mom!|Another one!',
);
const HURT = pack(
  'Nothing but a scratch!|Aaah!|I can\'t stop!|Keep moving!|Not yet!|I\'m fine!|Just blood...|Won\'t stop me!',
);
const POUR = pack(
  'This has to work!|This time...|Please...|Come back to me...|Stay with me, ma...|Just a little more...|I won\'t fail you...|This time you\'ll stay...',
);
const GRIEF = pack(
  'No... she has to wake up.|Why her?! WHY?!|Just one more time... I swear.|I miss her so much...|I\'ll always love you, ma...',
);

export const say = (text: string, speaker = 0, time = 100) => {
  line = { text, speaker, time };
};

export const hush = () => {
  line = 0;
};

export const tickTalk = () => {
  if (line && --line.time <= 0) line = 0;
};

const busy = () => !!(line && line.time > 28);

const sayRandom = (list: string[], chance = 0.3, time = 80) => {
  if (busy() || Math.random() > chance) return;
  say(pick(list), 0, time);
};

export const sayKill = () => sayRandom(KILL, 0.32, 70);
export const sayHurt = () => sayRandom(HURT, 0.38, 70);
export const sayDeath = (loop: number) => say(DEATH[(loop - 1) % DEATH.length], 0, 150);
export const sayPour = () => say(pick(POUR), 0, 110);
export const sayMom = () => say('My boy...', 1, 100);
export const sayGrief = (n: number) => say(GRIEF[n], 0, 150);
export const sayBye = () => say('Goodbye...', 0, 180);

export const getLine = () => line;
