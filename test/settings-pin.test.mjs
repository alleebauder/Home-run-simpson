import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

test('Settings asks for the PIN on every profile by default', () => {
  assert.match(app, /\n\s*pinAll: true,\n/);
  assert.match(app, /name === 'settings' && name !== APP\.name && S\.pin && \(S\.pinAll \|\| !privateOK\(\)\) && !\(await askPin\('Enter PIN to open Settings'\)\)/);
});

test('the PIN-for-every-profile switch is in Settings > Family', () => {
  assert.match(app, /id="s-pinAll" data-set="pinAll"/);
});
