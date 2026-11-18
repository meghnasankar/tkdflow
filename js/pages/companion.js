/* Read-and-print companion: the optional Print button appears only when this
   script runs and opens the browser's print dialog only when clicked. Without
   JavaScript, the browser's own Print works the same. */
for (const button of document.querySelectorAll('[data-print]')) {
  button.hidden = false;
  button.addEventListener('click', () => window.print());
}
