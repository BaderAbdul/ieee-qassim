import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('Firebase authentication loads and resolves RSA signing keys without require(ESM)', () => {
  const source = `
    const assert = require('node:assert/strict');
    const { createRequire } = require('node:module');
    const { generateKeyPairSync, createPublicKey } = require('node:crypto');
    require('firebase-admin/auth');
    const adminRequire = createRequire(require.resolve('firebase-admin'));
    const jwks = adminRequire('jwks-rsa');
    const { publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const key = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', alg: 'RS256', use: 'sig' };
    const client = jwks({ jwksUri: 'https://example.test/keys', cache: false, fetcher: async () => ({ keys: [key] }) });
    client.getSigningKey('test-key').then(result => {
      const decoded = createPublicKey(result.getPublicKey()).export({ format: 'jwk' });
      assert.equal(decoded.n, key.n);
      console.log('strict-commonjs-auth-pass');
    }).catch(error => { console.error(error.message); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ['--no-experimental-require-module', '-e', source], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /strict-commonjs-auth-pass/);
});
