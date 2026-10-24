// Keyboard access: the "Your move" field under each board, the board's text alternative, the live
// announcement of moves on the opening page, and the difficulty radio group on /play.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../../vendor/chess.min.js';
import { launch, newPage, go, BASE, expectBoard } from './helpers.mjs';

let browser;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });

const at = (...sans) => { const c = new Chess(); sans.forEach((s) => c.move(s)); return c; };
const ready = (page, id) => page.waitForFunction((i) => !document.getElementById(i).disabled, {}, id);
// An entry the page refused stays in the field for editing: start each one from an empty field.
const type = async (page, id, text) => {
  await page.$eval('#' + id, (e) => { e.value = ''; });
  await page.click('#' + id);
  await page.type('#' + id, text);
  await page.keyboard.press('Enter');
};
const msg = (page, id) => page.$eval('#' + id + '-msg', (e) => e.textContent);

test('opening: a typed SAN or UCI move is played like a mouse move', async () => {
  const page = await newPage(browser);
  try {
    await go(page, '/openings/sicilian-defense');
    await ready(page, 'board-move');
    await type(page, 'board-move', 'Nf3');
    await expectBoard(page, '#board', at('e4', 'c5', 'Nf3'));
    assert.match(await page.$eval('#board-explore', (e) => e.textContent), /Nf3/);
    assert.equal(await page.$eval('#board-move', (e) => e.value), '');
    assert.match(await msg(page, 'board-move'), /Nf3/);

    // From and to squares; a check mark may be typed or left out.
    await type(page, 'board-move', 'b8c6');
    await expectBoard(page, '#board', at('e4', 'c5', 'Nf3', 'Nc6'));
    await type(page, 'board-move', 'Bb5');
    await expectBoard(page, '#board', at('e4', 'c5', 'Nf3', 'Nc6', 'Bb5'));

    // Back on the line, the line's own move steps along it (the move list marks it).
    await page.click('#board-reset');
    await type(page, 'board-move', 'e4');
    await expectBoard(page, '#board', at('e4'));
    assert.deepEqual(await page.$$eval('#move-list button.is-active', (bs) => bs.map((b) => b.textContent)), ['e4']);
    assert.deepEqual(page.problems, []);
  } finally { await page.close(); }
});

test('opening: an illegal entry changes nothing and says why', async () => {
  const page = await newPage(browser);
  try {
    await go(page, '/openings/sicilian-defense');
    await ready(page, 'board-move');
    await type(page, 'board-move', 'Ke5');
    await expectBoard(page, '#board', at('e4', 'c5'));
    assert.match(await msg(page, 'board-move'), /not a legal move/);
    assert.equal(await page.$eval('#board-move', (e) => e.getAttribute('aria-invalid')), 'true');
    assert.equal(await page.$eval('#board-move-msg', (e) => e.getAttribute('aria-live')), 'polite');
    assert.deepEqual(page.problems, []);
  } finally { await page.close(); }
});

test('opening: the board has a text alternative and arrow keys announce the move', async () => {
  const page = await newPage(browser);
  try {
    await go(page, '/openings/sicilian-defense');
    await ready(page, 'board-move');
    assert.equal(await page.$eval('#board', (e) => e.getAttribute('role')), 'img');
    assert.equal(await page.$eval('#board', (e) => e.getAttribute('aria-label')), 'Chess board: position after 1…c5, White to move');
    assert.equal(await page.$eval('#board', (e) => e.getAttribute('aria-describedby')), 'board-move-hint');
    assert.equal(await page.$eval('#board-live', (e) => e.getAttribute('aria-live')), 'polite');
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction(() => document.getElementById('board-live').textContent === '1. e4, Black to move');
    assert.equal(await page.$eval('#board', (e) => e.getAttribute('aria-label')), 'Chess board: position after 1. e4, Black to move');
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.getElementById('board-live').textContent === '1…c5, White to move');
    await page.click('#board-reset');
    await page.waitForFunction(() => document.getElementById('board-live').textContent === 'Starting position');
  } finally { await page.close(); }
});

// The game list of /play as a chess.js game (the opening's moves, then the ones played here).
const played = async (page) => {
  const sans = await page.$$eval('#play-moves li span:not(.move-no)', (s) => s.map((x) => x.textContent));
  const c = new Chess();
  sans.forEach((s) => c.move(s));
  return { c, n: sans.length };
};
const waitPlies = (page, n) => page.waitForFunction((k) => document.querySelectorAll('#play-moves li span:not(.move-no)').length >= k, { timeout: 20000 }, n);

test('play: typed moves reach the engine; the field is off while it thinks', async () => {
  const page = await newPage(browser);
  try {
    await go(page, '/play/sicilian-defense');
    await page.waitForSelector('.play-engine-state[data-state="ready"]', { timeout: 20000 });
    await waitPlies(page, 3);   // e4 c5 and the engine's move
    await ready(page, 'play-move');
    assert.equal(await page.$eval('#play-board', (e) => e.getAttribute('role')), 'img');
    assert.match(await page.$eval('#play-board', (e) => e.getAttribute('aria-label')), /^Chess board: position after 2\. \S+, Black to move$/);

    let { c, n } = await played(page);
    const san = c.moves()[0];
    await type(page, 'play-move', san);
    assert.equal(await page.$eval('#play-move', (e) => e.disabled), true, 'off while the engine answers');
    await waitPlies(page, n + 2);
    await ready(page, 'play-move');
    ({ c, n } = await played(page));
    assert.equal(c.history()[3], san);
    await expectBoard(page, '#play-board', c);

    // From and to squares.
    const mv = c.moves({ verbose: true })[0];
    await type(page, 'play-move', mv.from + mv.to + (mv.promotion || ''));
    await waitPlies(page, n + 2);
    await ready(page, 'play-move');

    // An illegal entry changes nothing.
    const count = (await played(page)).n;
    await type(page, 'play-move', 'Qa1');
    assert.match(await msg(page, 'play-move'), /not a legal move/);
    assert.equal((await played(page)).n, count);
    assert.deepEqual(page.problems, []);
  } finally { await page.close(); }
});

test('train: a typed right move is accepted, a wrong one rejected, UCI works', async () => {
  const page = await newPage(browser);
  try {
    await go(page, '/train/sicilian-defense-najdorf-variation');
    const cfg = await page.$eval('#train-data', (e) => JSON.parse(e.textContent));
    const line = new Chess();
    line.load_pgn(cfg.lines[0].pgn, { sloppy: true });
    const sans = line.history();
    const mine = (i) => (i % 2 === 0) === (cfg.color === 'white');
    const first = sans.findIndex((_, i) => mine(i));
    const game = new Chess();
    sans.slice(0, first).forEach((s) => game.move(s));
    await expectBoard(page, '#train-board', game);
    await ready(page, 'train-move');
    assert.match(await page.$eval('#train-board', (e) => e.getAttribute('aria-label')), /^Chess board: /);

    // Illegal: nothing changes and the field says why.
    await type(page, 'train-move', 'Ke5');
    assert.match(await msg(page, 'train-move'), /not a legal move/);
    await expectBoard(page, '#train-board', game);

    // Legal but not the line's move.
    const wrong = game.moves().find((m) => m.replace(/[+#]/g, '') !== sans[first].replace(/[+#]/g, ''));
    await type(page, 'train-move', wrong);
    await page.waitForFunction(() => /not this line/.test(document.getElementById('train-status').textContent));
    await expectBoard(page, '#train-board', game);

    // The right one, as SAN.
    game.move(sans[first]);
    await type(page, 'train-move', sans[first]);
    await page.waitForFunction(() => document.getElementById('train-status').textContent === 'Right.');
    await expectBoard(page, '#train-board', game);

    // The next one as UCI, once the opponent has replied.
    assert.ok(first + 2 < sans.length, 'the line has another move for the user');
    game.move(sans[first + 1]);
    await expectBoard(page, '#train-board', game);
    await ready(page, 'train-move');
    const m = new Chess(game.fen()).move(sans[first + 2]);
    await page.$eval('#train-status', (e) => { e.textContent = ''; });
    await type(page, 'train-move', m.from + m.to + (m.promotion || ''));
    await page.waitForFunction(() => document.getElementById('train-status').textContent === 'Right.');
    assert.deepEqual(page.problems, []);
  } finally { await page.close(); }
});

test('play: the difficulty radios are in the HTML and arrow keys move the choice', async () => {
  const html = await (await fetch(BASE + '/play/sicilian-defense')).text();
  const group = html.match(/<div class="play-difficulty"[\s\S]*?<\/div>/)[0];
  assert.equal((group.match(/role="radio"/g) || []).length, 6);
  assert.deepEqual(group.match(/aria-checked="(true|false)"/g).map((a) => a.slice(14, -1)), ['false', 'false', 'false', 'true', 'false', 'false']);

  const page = await newPage(browser);
  try {
    await go(page, '/play/sicilian-defense');
    await page.waitForSelector('#play-difficulty [role="radio"][aria-checked="true"]');
    const checked = () => page.$eval('#play-difficulty [aria-checked="true"]', (b) => b.querySelector('.diff-name').textContent);
    const start = await checked();
    assert.equal(await page.$$eval('#play-difficulty [tabindex="0"]', (b) => b.length), 1);
    await page.focus('#play-difficulty [aria-checked="true"]');
    await page.keyboard.press('ArrowRight');
    assert.notEqual(await checked(), start);
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-checked')), 'true');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await checked(), start);
    assert.deepEqual(page.problems, []);
  } finally { await page.close(); }
});
