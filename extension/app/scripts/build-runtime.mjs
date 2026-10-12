import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
execFileSync('tsc', [], { cwd: 'src/app', stdio: 'inherit' });
await build({ entryPoints: { practice: 'src/practice/content.ts', background: 'src/practice/background.ts', migrationDocument: 'src/practice/migrationDocument.ts' }, bundle: true, outdir: '../runtime', platform: 'browser', target: 'chrome120' });
await build({ entryPoints: ['src/practice/model.ts'], bundle: true, outfile: '../runtime/model.mjs', format: 'esm', platform: 'node', target: 'node20' });
copyFileSync('src/practice/golden.json', '../../site/golden.json');

copyFileSync('src/practice/migrate.html', '../runtime/migrate.html');
