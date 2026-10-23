// The "Your move" text field under a board (templates/partials/move_input.php):
// the keyboard way to play, since chessground cannot be used without a mouse.
// resolveMove() is pure (a chess.js game and some text), so tests/js can import it.
import { plain, sanTokens } from './helpers.js';

// Compare moves loosely: case, the x of a capture and the = of a promotion do not matter.
const loose = (san) => plain(san).replace(/[x=]/g, '').toLowerCase();

// Text → { move } (a chess.js verbose move) or { error } (a sentence for the visitor).
export function resolveMove(chess, text) {
    const raw = text.trim();
    if (raw === '') return { error: 'Type a move first, for example e4, Nf3 or g1f3.' };
    const legal = chess.moves({ verbose: true });

    // From and to squares, promotion piece last: g1f3, e7e8q (queen if left out, like a mouse move).
    const uci = raw.toLowerCase().match(/^([a-h][1-8])[\s-]?([a-h][1-8])\s?=?([qrbn])?$/);
    if (uci) {
        const found = legal.filter((m) => m.from === uci[1] && m.to === uci[2]);
        const pick = found.find((m) => m.promotion === (uci[3] || 'q')) || (uci[3] ? null : found[0]);
        return pick ? { move: pick } : { error: `${raw} is not a legal move here.` };
    }

    const tokens = sanTokens(raw);
    if (tokens.length !== 1) return { error: 'Type one move at a time.' };
    const tok = tokens[0];
    let found = legal.filter((m) => plain(m.san) === plain(tok));
    if (!found.length) found = legal.filter((m) => loose(m.san) === loose(tok));
    if (!found.length) {
        // "Nd2" when two knights can go there.
        const piece = tok.match(/^([KQRBN])x?([a-h][1-8])$/);
        if (piece) found = legal.filter((m) => m.piece === piece[1].toLowerCase() && m.to === piece[2]);
    }
    if (found.length === 1) return { move: found[0] };
    if (found.length > 1) return { error: `${raw} could be ${found.map((m) => m.san).join(' or ')}: say which one.` };
    return { error: `${raw} is not a legal move here.` };
}

// Wires the form of templates/partials/move_input.php. `getChess()` returns the game as it is
// now; `onMove(from, to, promotion)` makes the move the way a mouse move does and may return the
// sentence to announce ('' for none, as the page announces it itself). Returns { setEnabled }.
export function moveInput(id, getChess, onMove) {
    const form = document.getElementById(id + '-form');
    if (!form) return { setEnabled() {} };
    const input = document.getElementById(id);
    const msg = document.getElementById(id + '-msg');
    let wantFocus = false;   // the visitor was typing here when it was switched off for the engine's move

    document.addEventListener('focusin', (e) => { if (e.target !== input) wantFocus = false; });
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.disabled) return;
        const r = resolveMove(getChess(), input.value);
        if (r.error) {
            input.setAttribute('aria-invalid', 'true');
            msg.textContent = r.error;
            return;
        }
        input.removeAttribute('aria-invalid');
        input.value = '';
        wantFocus = true;
        const note = onMove(r.move.from, r.move.to, r.move.promotion);
        msg.textContent = typeof note === 'string' ? note : `Played ${r.move.san}.`;
    });
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));

    return {
        setEnabled(on) {
            input.disabled = !on;
            if (on && wantFocus && (document.activeElement === document.body || document.activeElement === null)) input.focus();
        },
    };
}

// The text alternative of a board: where the game stands, in words.
export const boardText = (lastMove, turn) => 'Chess board: '
    + (lastMove ? `position after ${lastMove}` : 'starting position') + `, ${turn === 'w' ? 'White' : 'Black'} to move`;

// role="img" with a label kept current by the page, pointing at the move field's hint.
export function describeBoard(el, id) {
    el.setAttribute('role', 'img');
    el.setAttribute('aria-describedby', id + '-hint');
    return (text) => el.setAttribute('aria-label', text);
}
