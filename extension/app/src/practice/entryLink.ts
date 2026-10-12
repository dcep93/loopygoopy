export function createPracticeEntry(onEnter: () => void): HTMLDivElement {
  const entry = document.createElement('div');
  entry.id = 'loopy-practice-entry';
  const style = document.createElement('style');
  style.textContent = `
    #loopy-practice-entry { position: relative; flex: none; margin: 0 8px 0 0; }
    #loopy-practice-entry a { display: block; padding: 8px 0; font: 400 20px/1.2 "Comic Sans MS", "Comic Sans", cursive; letter-spacing: -1px; white-space: nowrap; color: #ff7bc3; text-decoration: none; }
    #loopy-practice-entry a:hover { text-decoration: underline; }
    #loopy-practice-entry a:focus-visible { outline: 2px solid #ff7bc3; outline-offset: 3px; }
    ytd-masthead #center:has(> #loopy-practice-entry) > :is(yt-searchbox, ytd-searchbox) { margin-left: 0 !important; min-width: 0; }
  `;
  const link = document.createElement('a');
  link.textContent = 'loopy goopy';
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onEnter();
  });
  entry.append(style, link);
  return entry;
}
