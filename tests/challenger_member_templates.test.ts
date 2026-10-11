import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventTemplates, eventTemplatePatch } from '../src/lib/eventTemplates.ts';
import { configurationReadiness } from '../src/lib/server/readiness.ts';

test('Preparation presets never reuse event identity, points, dates, certificates or live counters', () => {
  for (const template of eventTemplates) {
    const patch = eventTemplatePatch(template.id);
    assert.deepEqual(Object.keys(patch).sort(), ['durationHours', 'registrationMode', 'type']);
    const existing = { title: 'My event', date: '2026-11-01', points: 10, hasCertificate: true, registeredCount: 5, state: 'Draft' };
    const result = { ...existing, ...patch };
    for (const key of Object.keys(existing) as (keyof typeof existing)[]) assert.equal(result[key], existing[key]);
  }
  assert.throws(() => eventTemplatePatch('__proto__'));
});

test('Each preparation template application returns independent editable values', () => {
  const patch = eventTemplatePatch('workshop'); patch.durationHours = 20;
  assert.equal(eventTemplatePatch('workshop').durationHours, 2);
  assert.equal(eventTemplatePatch('competition').registrationMode, 'Manual');
});

test('Readiness only exposes configuration presence, never credentials or provider validity', () => {
  const empty = configurationReadiness({});
  assert.deepEqual(empty, { platformConfigured: false, mediaConfigured: false, email: 'disabled', configurationOnly: true });
  const configured = configurationReadiness({ FIREBASE_PROJECT_ID: 'secret-project', FIREBASE_CLIENT_EMAIL: 'secret-email', FIREBASE_PRIVATE_KEY: 'secret-private-key', CLOUDINARY_CLOUD_NAME: 'secret-cloud', CLOUDINARY_API_KEY: 'secret-key', CLOUDINARY_API_SECRET: 'secret-value', EMAIL_NOTIFICATIONS_ENABLED: 'true' });
  assert.equal(configured.platformConfigured, true); assert.equal(configured.mediaConfigured, true); assert.equal(configured.email, 'incomplete');
  assert.ok(!JSON.stringify(configured).includes('secret'));
  assert.equal(configurationReadiness({ FIREBASE_PROJECT_ID: ' ', FIREBASE_CLIENT_EMAIL: 'x', FIREBASE_PRIVATE_KEY: 'y' }).platformConfigured, false);
});

test('Readiness never treats a production or remote emulator configuration as a local demo', () => {
  const demo = { NODE_ENV: 'development', NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-local', FIRESTORE_EMULATOR_HOST: 'localhost:8080', FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099' };
  assert.equal(configurationReadiness(demo).platformConfigured, true);
  assert.equal(configurationReadiness({ ...demo, NODE_ENV: 'production' }).platformConfigured, false);
  assert.equal(configurationReadiness({ ...demo, FIRESTORE_EMULATOR_HOST: 'remote.example:8080' }).platformConfigured, false);
  assert.equal(configurationReadiness({ ...demo, NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'live-project' }).platformConfigured, false);
});
