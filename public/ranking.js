// Ranking pages: a click on a column name sorts the table by it, highest
// first, and a second click turns the order round (sortable-tablesort; the
// cells carry data-sort where their text is not a plain number).
import 'sortable-tablesort/dist/esm/sortable.js';

// The same from the keyboard: Tab to a column name, Enter or Space.
document.querySelectorAll('.sortable thead th:not(.no-sort)').forEach((th) => {
    th.tabIndex = 0;
    th.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        th.click();
    });
});
