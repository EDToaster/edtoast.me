// Pure game logic, no DOM. Keep it this way so it can be unit-tested.
export type Board = boolean[]; // row-major, true = lit

export function toggle(board: Board, size: number, i: number): Board {
  const next = board.slice();
  const r = Math.floor(i / size);
  const c = i % size;
  const flip = (rr: number, cc: number) => {
    if (rr >= 0 && rr < size && cc >= 0 && cc < size) next[rr * size + cc] = !next[rr * size + cc];
  };
  flip(r, c);
  flip(r - 1, c);
  flip(r + 1, c);
  flip(r, c - 1);
  flip(r, c + 1);
  return next;
}

// Scramble from a solved board so every puzzle is solvable.
export function scramble(size: number, moves = size * size, rand = Math.random): Board {
  let b: Board = new Array(size * size).fill(false);
  for (let k = 0; k < moves; k++) b = toggle(b, size, Math.floor(rand() * size * size));
  return b.some(Boolean) ? b : scramble(size, moves, rand);
}

export const isSolved = (b: Board) => b.every((x) => !x);
