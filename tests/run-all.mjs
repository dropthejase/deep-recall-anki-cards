// Runs every test that needs no accounts, keys or local models. Each file prints PASS or FAIL lines.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
let failed = 0;
for (const file of [
  'build-check.mjs',
  'crypto.mjs',
  'breadcrumb.mjs',
  'ollama-address.mjs',
  'drawing.mjs',
  'cloud.mjs',
  'text-only-model.mjs',
  'lmstudio-mock.mjs',
  'addon.mjs',
]) {
  console.log(`\n== ${file}`);
  const result = spawnSync(process.execPath, [here + file], { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}
console.log(failed ? `\n${failed} test file(s) failed` : '\nAll test files passed');
process.exit(failed ? 1 : 0);
