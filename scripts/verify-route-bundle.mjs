import { readFile, copyFile, mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

// Copy only traced deployment files; do not copy environment files or credentials.
const root = process.cwd();
const destination = await mkdtemp(path.join(os.tmpdir(), 'ieee-route-bundle-'));
for (const route of ['.next/server/app/api/media/route.js', '.next/server/app/api/platform/[action]/route.js']) {
  const trace = JSON.parse(await readFile(path.join(root, `${route}.nft.json`), 'utf8'));
  const files = [path.join(root, route), ...trace.files.map(file => path.resolve(root, path.dirname(route), file))];
  for (const source of files) {
    const relative = path.relative(root, source);
    if (relative.startsWith('..') || relative.split(path.sep).some(part => part.startsWith('.env'))) throw new Error('Unsafe traced file.');
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
  }
}
const require = createRequire(path.join(destination, 'package.json'));
for (const name of ['media', 'platform/[action]']) {
  const bundle = require(path.join(destination, '.next/server/app/api', name, 'route.js'));
  await bundle.routeModule.ensureUserland();
  const route = bundle.routeModule.userland;
  const response = await route.POST(new Request(`https://example.test/api/${name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }), { params: Promise.resolve({ action: 'syncPublicProfile' }) });
  assert.equal(response.status, 401);
  assert.equal((await response.json()).error.code, 'unauthenticated');
  console.log(`${name}: isolated traced bundle starts and rejects unauthenticated requests`);
}
console.log(`Disposable deployment copy: ${destination}`);
