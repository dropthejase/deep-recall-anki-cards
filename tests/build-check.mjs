// dist/ is committed so people can copy the templates without running anything. This checks it is
// up to date with card/, and that every script in the built templates is valid JavaScript.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildCard } from '../scripts/build.mjs';
import { newChecker } from './harness.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const { check, finish } = newChecker();
const built = buildCard();

for (const [name, text] of Object.entries(built)) {
  let committed = '';
  try {
    committed = readFileSync(root + 'dist/' + name, 'utf8');
  } catch {
    // reported below
  }
  check(`dist/${name} is up to date (run "npm run build" if not)`, committed === text);
}
for (const name of ['front.html', 'back.html']) {
  let ok = true;
  for (const match of built[name].matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    try {
      new Function(match[1]);
    } catch {
      ok = false;
    }
  }
  check(`every script in ${name} parses`, ok);
  check(`${name} does not load a separate file`, !built[name].includes('src="_deeprecall-ai.js"'));
}
process.exit(finish() ? 1 : 0);
