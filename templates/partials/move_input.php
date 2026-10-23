<?php
/**
 * The "Your move" text field under a board: the keyboard way to play a move.
 * Disabled until the page script (public/lib/move-input.js) switches it on.
 *
 * @var string $moveInputId id prefix, unique on the page
 */
$miId = htmlspecialchars($moveInputId, ENT_QUOTES, 'UTF-8');
?>
<form class="move-input" id="<?= $miId ?>-form" autocomplete="off" novalidate>
    <label for="<?= $miId ?>"><?= htmlspecialchars(t('board.move.label'), ENT_QUOTES, 'UTF-8') ?></label>
    <input type="text" id="<?= $miId ?>" name="move" disabled aria-describedby="<?= $miId ?>-hint"
           placeholder="<?= htmlspecialchars(t('board.move.placeholder'), ENT_QUOTES, 'UTF-8') ?>"
           autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go">
    <p class="move-input-hint" id="<?= $miId ?>-hint"><?= htmlspecialchars(t('board.move.hint'), ENT_QUOTES, 'UTF-8') ?></p>
    <p class="move-input-msg" id="<?= $miId ?>-msg" role="status" aria-live="polite"></p>
</form>
