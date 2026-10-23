import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../../vendor/chess.min.js';
import { resolveMove } from '../../public/lib/move-input.js';

const run = (fen, text) => { const r = resolveMove(new Chess(fen), text); return r.move ? r.move.san.replace(/[+#]/g, '') : r.error; };

test('resolveMove: SAN with or without marks, UCI, castling', () => {
  assert.equal(run(undefined, 'e4'), 'e4');
  assert.equal(run(undefined, 'nf3'), 'Nf3');
  assert.equal(run(undefined, 'Nf3+'), 'Nf3');
  assert.equal(run(undefined, 'g1f3'), 'Nf3');
  assert.equal(run(undefined, 'g1-f3'), 'Nf3');
  const castle = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
  assert.equal(run(castle, 'O-O'), 'O-O');
  assert.equal(run(castle, '0-0-0'), 'O-O-O');
  assert.equal(run(castle, 'e1g1'), 'O-O');
});

test('resolveMove: promotion piece, queen when left out', () => {
  const fen = '8/4P2k/8/8/8/8/8/4K3 w - - 0 1';
  assert.equal(run(fen, 'e7e8'), 'e8=Q');
  assert.equal(run(fen, 'e7e8n'), 'e8=N');
  assert.equal(run(fen, 'e8=N'), 'e8=N');
  assert.equal(run(fen, 'e8N'), 'e8=N');
});

test('resolveMove: illegal, ambiguous and empty entries explain themselves', () => {
  assert.match(run(undefined, 'Ke5'), /not a legal move/);
  assert.match(run(undefined, 'e7e5'), /not a legal move/);
  assert.match(run(undefined, '  '), /Type a move/);
  assert.match(run(undefined, 'e4 Nf3'), /one move at a time/);
  assert.match(run('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1', 'Nd2'), /Nbd2 or Nfd2/);
  assert.equal(run('4k3/8/8/8/8/8/8/1N2KN2 w - - 0 1', 'Nbd2'), 'Nbd2');
});
