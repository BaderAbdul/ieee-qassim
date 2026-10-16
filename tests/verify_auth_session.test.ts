import test from 'node:test';
import assert from 'node:assert/strict';
import { startSession, type SessionState } from '../src/lib/auth/session.ts';
import { canRedirectAfterPopup, readRedirectAttempt } from '../src/lib/auth/loginFlow.ts';

type User = { uid: string };
type Profile = { completed: boolean; role?: string };
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function harness(timeoutMs = 1000) {
  const states: SessionState<User, Profile>[] = [];
  const subscriptions: { user: User; next: (profile: Profile | null, cached: boolean) => void; fail: (error: unknown) => void; stopped: boolean }[] = [];
  let authNext!: (user: User | null) => void;
  let creations = 0; let ready = 0;
  const creation = deferred<Profile>();
  const session = startSession<User, Profile>({
    observeUser: next => { authNext = next; return () => {}; },
    observeProfile: (user, next, fail) => { const record = { user, next, fail, stopped: false }; subscriptions.push(record); return () => { record.stopped = true; }; },
    createProfile: () => { creations++; return creation.promise; }, update: state => states.push(state), ready: () => { ready++; }, timeoutMs,
  });
  return { session, states, subscriptions, creation, emit: (user: User | null) => authNext(user), get creations() { return creations; }, get ready() { return ready; } };
}

test('Restored sign-in waits for a profile and keeps the same account without a refresh', () => {
  const h = harness(); try {
    h.emit({ uid: 'alice' }); assert.equal(h.states.at(-1)?.loading, true);
    h.subscriptions[0].next({ completed: true }, false);
    assert.equal(h.states.at(-1)?.user?.uid, 'alice'); assert.equal(h.states.at(-1)?.loading, false);
    h.emit({ uid: 'alice' }); assert.equal(h.subscriptions.length, 1); assert.equal(h.ready, 1);
  } finally { h.session.dispose(); }
});

test('Late snapshots and creation errors cannot overwrite a newer account or sign-out', async () => {
  const h = harness(); try {
    h.emit({ uid: 'old' }); const old = h.subscriptions[0]; old.next(null, false);
    h.emit({ uid: 'new' }); h.subscriptions[1].next({ completed: true }, false);
    old.next({ completed: false }, false); old.fail(new Error('late')); h.creation.reject(new Error('late creation')); await Promise.resolve(); await Promise.resolve();
    assert.equal(h.states.at(-1)?.user?.uid, 'new'); assert.equal(h.states.at(-1)?.error, null);
    h.emit(null); h.subscriptions[1].next({ completed: true }, false); assert.equal(h.states.at(-1)?.user, null);
  } finally { h.session.dispose(); }
});

test('Empty cache never creates a replacement account; server absence creates once', async () => {
  const h = harness(); try {
    h.emit({ uid: 'fresh' }); const observer = h.subscriptions[0];
    observer.next(null, true); assert.equal(h.creations, 0);
    observer.next(null, false); observer.next(null, false); assert.equal(h.creations, 1);
    h.creation.resolve({ completed: false }); await Promise.resolve();
    assert.equal(h.states.at(-1)?.loading, false); assert.equal(h.states.at(-1)?.profile?.completed, false);
  } finally { h.session.dispose(); }
});

test('Profile updates arriving before account creation finishes are preserved', async () => {
  const h = harness(); try {
    h.emit({ uid: 'fresh' }); h.subscriptions[0].next(null, false);
    h.subscriptions[0].next({ completed: true, role: 'organizer' }, false);
    h.creation.resolve({ completed: false }); await Promise.resolve();
    assert.equal(h.states.at(-1)?.profile?.completed, true); assert.equal(h.states.at(-1)?.profile?.role, 'organizer');
  } finally { h.session.dispose(); }
});

test('Slow or failed account loads show recovery and retry without signing out', async () => {
  const h = harness(15); try {
    h.emit({ uid: 'alice' }); await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(h.states.at(-1)?.loading, false); assert.ok(h.states.at(-1)?.error); assert.equal(h.states.at(-1)?.user?.uid, 'alice');
    h.session.retry({ uid: 'alice' }); h.subscriptions[1].next({ completed: true }, false);
    assert.equal(h.states.at(-1)?.error, null); assert.equal(h.states.at(-1)?.loading, false);
  } finally { h.session.dispose(); }
});

test('Only blocked popups with same-origin auth helpers may fall back to redirect', () => {
  assert.equal(canRedirectAfterPopup({ code: 'auth/popup-blocked' }, 'www.ieeequ.online', 'www.ieeequ.online'), true);
  assert.equal(canRedirectAfterPopup({ code: 'auth/popup-blocked' }, 'ieeeqassim.firebaseapp.com', 'www.ieeequ.online'), false);
  for (const code of ['auth/network-request-failed', 'auth/popup-closed-by-user', 'auth/unauthorized-domain']) assert.equal(canRedirectAfterPopup({ code }, 'www.ieeequ.online', 'www.ieeequ.online'), false);
});

test('Redirect recovery preserves the locale/event/QR and rejects unsafe or stale destinations', () => {
  const now = 10000000;
  const path = '/en/events/workshop/checkin?token=sample#rating';
  assert.equal(readRedirectAttempt(JSON.stringify({ path, startedAt: now }), now)?.path, path);
  for (const path of ['https://elsewhere.test', '//elsewhere.test', '/%2felsewhere.test', '/api/action', '/__']) assert.equal(readRedirectAttempt(JSON.stringify({ path, startedAt: now }), now), null);
  assert.equal(readRedirectAttempt(JSON.stringify({ path, startedAt: now - 16 * 60000 }), now), null);
});
