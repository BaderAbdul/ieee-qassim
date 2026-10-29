import test from 'node:test';
import assert from 'node:assert/strict';
import { readBackendResponse } from '../src/lib/backendResponse.ts';

test('Empty hosting error produces a meaningful error, not a JSON parsing exception', async () => {
  await assert.rejects(readBackendResponse(new Response('', { status: 500 })), error => {
    assert.ok(error instanceof Error); assert.match(error.message, /HTTP 500/); assert.doesNotMatch(error.message, /Unexpected end/); return true;
  });
});
test('HTML errors and malformed successful responses are rejected safely', async () => {
  await assert.rejects(readBackendResponse(new Response('<html>failure</html>', { status: 502 })), /HTTP 502/);
  await assert.rejects(readBackendResponse(new Response('[]', { status: 200 })), /HTTP 200/);
});
test('Structured backend errors and successful payloads retain their meaning', async () => {
  await assert.rejects(readBackendResponse(Response.json({ error: { code: 'failed-precondition', message: 'Registration closed.' } }, { status: 409 })), /Registration closed/);
  assert.deepEqual(await readBackendResponse(Response.json({ data: { status: 'approved' } })), { data: { status: 'approved' } });
});

test('GET endpoints can accept bare arrays while action responses stay strict', async () => {
  assert.deepEqual(await readBackendResponse(Response.json([{ id: 'member-1' }]), true), [{ id: 'member-1' }]);
  await assert.rejects(readBackendResponse(Response.json([])), /HTTP 200/);
});
