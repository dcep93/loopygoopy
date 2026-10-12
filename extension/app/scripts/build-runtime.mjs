import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
copyFileSync('../../catalog.json', 'src/practice/bundled-catalog.json');
execFileSync('tsc', [], { cwd: 'src/app', stdio: 'inherit' });
await build({ entryPoints: { practice: 'src/practice/content.ts', background: 'src/practice/background.ts', migrationDocument: 'src/practice/migrationDocument.ts' }, bundle: true, outdir: '../runtime', platform: 'browser', target: 'chrome120' });
await build({ entryPoints: ['src/practice/model.ts'], bundle: true, outfile: '../runtime/model.mjs', format: 'esm', platform: 'node', target: 'node20' });
execFileSync(process.execPath, ['../../scripts/validate-catalog.mjs'], { stdio: 'inherit' });

copyFileSync('src/practice/migrate.html', '../runtime/migrate.html');
