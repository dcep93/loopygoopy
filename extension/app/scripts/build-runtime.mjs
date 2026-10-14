import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
copyFileSync('../../catalog.json', 'src/practice/bundled-catalog.json');
execFileSync('tsc', [], { cwd: 'src/app', stdio: 'inherit' });
await build({ entryPoints: { practice: 'src/practice/content.ts', background: 'src/practice/background.ts' }, bundle: true, outdir: '../runtime', platform: 'browser', target: 'chrome120', loader: { '.css': 'text' }, define: { 'process.env.NODE_ENV': '"production"' } });
await build({ entryPoints: ['src/practice/model.ts'], bundle: true, outfile: '../runtime/model.mjs', format: 'esm', platform: 'node', target: 'node20' });
execFileSync(process.execPath, ['../../scripts/validate-catalog.mjs'], { stdio: 'inherit' });

copyFileSync('src/practice/fonts/ComicRelief-Regular.ttf', '../runtime/ComicRelief-Regular.ttf');
