import fs from 'node:fs/promises';

const start = '<!-- practice-catalog:start -->';
const end = '<!-- practice-catalog:end -->';
const escapeLabel = title => title.replace(/\s+/g, ' ').trim()
  .replace(/&/g, '&amp;').replace(/[\\`*_[\]<>]/g, '\\$&');

export function renderCatalog(readme, catalog) {
  const from = readme.indexOf(start), to = readme.indexOf(end);
  if (from < 0 || to < from || readme.indexOf(start, from + start.length) >= 0 || readme.indexOf(end, to + end.length) >= 0) {
    throw Error('README must contain exactly one ordered pair of practice-catalog markers.');
  }
  const links = catalog.videos.map(video => `- [${escapeLabel(video.title)}](${video.sourceUrl}&loopygoopy)`);
  const content = links.length ? links.join('\n') : 'No prepared videos yet.';
  return `${readme.slice(0, from + start.length)}\n\n${content}\n\n${readme.slice(to)}`;
}

export async function updateCatalogReadme(catalog) {
  const path = new URL('../README.md', import.meta.url);
  const before = await fs.readFile(path, 'utf8');
  const after = renderCatalog(before, catalog);
  if (after !== before) await fs.writeFile(path, after);
}
