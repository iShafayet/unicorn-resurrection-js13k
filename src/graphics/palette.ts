export const PALETTE = [0, 0x0a0c10, 0xd4a07a, 0x1a222c, 0x4e5a66, 0xa81820, 0xf0e0c4, 0x3a322c, 0x8a96a0];
export const ACCENT = [0xf0e0c4, 0x6a8cb0, 0x5a8a58, 0xd4b44a];

export const swapAccent = (accent: number) => {
  const next = PALETTE.slice();
  next[6] = accent;
  return next;
};
