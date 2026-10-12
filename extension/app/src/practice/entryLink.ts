export function createPracticeEntry(onEnter: () => void): HTMLDivElement {
  const entry = document.createElement('div');
  entry.id = 'loopy-practice-entry';
  const style = document.createElement('style');
  style.textContent = `
    #loopy-practice-entry { position: relative; z-index: 1; margin: 0 0 10px; font: 14px/1.4 Arial, sans-serif; }
    #loopy-practice-entry a { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border: 1px solid #655241; border-radius: 9px; background: #241c18; color: #f5e9dc; text-decoration: none; }
    #loopy-practice-entry a:hover { background: #382c23; text-decoration: underline; }
    #loopy-practice-entry a:focus-visible { outline: 2px solid #ff7bc3; outline-offset: 3px; }
    #loopy-practice-entry span { color: #ff7bc3; }
  `;
  const link = document.createElement('a');
  const brand = document.createElement('span');
  brand.textContent = 'loopy goopy';
  link.append(brand, document.createTextNode(' · Enter practice mode'));
  link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); onEnter();
  });
  entry.append(style, link);
  return entry;
}
