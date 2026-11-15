// /repertoire: the lines saved with "+ Repertoire" (localStorage key
// "codex-repertoire": { white: [line], black: [line] }, line = { slug, name,
// eco, pgn }), with remove buttons, a trainer link and a PGN download.

const root = document.getElementById('repertoire');
if (root) {
    const base = root.dataset.base || '';
    const KEY = 'codex-repertoire';
    const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
    const write = (rep) => { try { localStorage.setItem(KEY, JSON.stringify(rep)); } catch { /* private mode */ } };

    // After a removal: one line under that list naming the line, with a
    // button that puts it back where it was.
    const undo = document.createElement('p');
    undo.className = 'repertoire-undo';
    undo.setAttribute('role', 'status');
    function offerUndo(list, side, line, index) {
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'repertoire-remove';
        back.textContent = 'Undo';
        back.addEventListener('click', () => {
            const now = read();
            now[side] = now[side] || [];
            now[side].splice(index, 0, line);
            write(now);
            undo.remove();
            render();
        });
        undo.replaceChildren(`Removed ${line.name}. `, back);
        list.after(undo);
    }

    function render() {
        const rep = read();
        root.querySelectorAll('.repertoire-side').forEach((section) => {
            const side = section.dataset.side;
            const lines = rep[side] || [];
            const list = section.querySelector('.repertoire-list');
            list.textContent = '';
            lines.forEach((l) => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = `${base}/openings/${encodeURIComponent(l.slug)}`;
                const eco = document.createElement('span');
                eco.className = 'eco-tag';
                eco.textContent = l.eco;
                const name = document.createElement('span');
                name.className = 'child-list-name';
                name.textContent = l.name;
                a.append(eco, name);
                const remove = document.createElement('button');
                remove.type = 'button';
                remove.className = 'repertoire-remove';
                remove.textContent = 'Remove';
                remove.setAttribute('aria-label', `Remove ${l.name}`);
                remove.addEventListener('click', () => {
                    const now = read();
                    const index = (now[side] || []).findIndex((x) => x.slug === l.slug);
                    now[side] = (now[side] || []).filter((x) => x.slug !== l.slug);
                    write(now);
                    render();
                    offerUndo(list, side, l, Math.max(0, index));
                });
                li.append(a, remove);
                list.append(li);
            });
            section.querySelector('.repertoire-count').textContent = lines.length ? `(${lines.length})` : '';
            section.querySelector('.repertoire-empty').hidden = lines.length > 0;
            const actions = section.querySelector('.repertoire-actions');
            actions.hidden = lines.length === 0;
            if (lines.length) {
                actions.querySelector('[data-repertoire-train]').href =
                    `${base}/train/${encodeURIComponent(lines[0].slug)}?from=repertoire&side=${side}`;
                actions.querySelector('[data-repertoire-pgn]').href =
                    `${base}/api/pgn?side=${side}&slugs=${lines.map((l) => encodeURIComponent(l.slug)).join(',')}`;
            }
        });
    }
    render();
    window.addEventListener('storage', (e) => { if (e.key === KEY) render(); });
}
