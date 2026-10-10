/* Deployment preparation. Defaults to read-only. Run under a maintenance window before enabling triggers. */
const admin = require('firebase-admin/app');
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');
const { publicProfile } = require('../lib/publicProfiles.js');
const args = process.argv.slice(2);
const projectId = args[args.indexOf('--project') + 1];
const apply = args.includes('--apply');
if (!args.includes('--project') || !projectId || projectId.startsWith('--')) throw new Error('Explicit --project is required.');
admin.initializeApp({ projectId });
const db = getFirestore();

async function pages(collection, visit) {
  let cursor;
  while (true) {
    let query = db.collection(collection).orderBy(FieldPath.documentId()).limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    if (page.empty) break;
    for (const doc of page.docs) await visit(doc);
    cursor = page.docs.at(-1);
  }
}
async function main() {
  const totals = { users: 0, countersChanged: 0, historicalLedgerMarked: 0, legacyTokensRemoved: 0, ideasSanitized: 0, invalidLedgers: 0 };
  await pages('users', async user => {
    totals.users++;
    if (apply) {
      if (user.data().isRestricted) await db.collection('public_profiles').doc(user.id).delete();
      else await db.collection('public_profiles').doc(user.id).set(publicProfile(user.data()));
    }
  });
  await pages('events', async event => {
    const active = await db.collection('registrations').where('eventId', '==', event.id).where('status', 'in', ['pending', 'approved', 'attended']).count().get();
    const attendance = await db.collection('attendance_logs').where('eventId', '==', event.id).count().get();
    if (event.data().registeredCount !== active.data().count || event.data().attendanceCount !== attendance.data().count) totals.countersChanged++;
    if ('checkinToken' in event.data()) totals.legacyTokensRemoved++;
    if (apply) await event.ref.update({
      registeredCount: active.data().count, attendanceCount: attendance.data().count,
      checkinToken: FieldValue.delete(),
    });
  });
  await pages('point_transactions', async ledger => {
    const data = ledger.data();
    if (!data.aggregatedAt) {
      if (!data.userId || !Number.isSafeInteger(data.amount ?? data.points)) { totals.invalidLedgers++; return; }
      totals.historicalLedgerMarked++;
      // Existing totals are preserved. Historical double-awards require an audited correction,
      // never an automatic replay or an assumption that every old ledger is unpaid.
      if (apply) await ledger.ref.update({ aggregatedAt: FieldValue.serverTimestamp(), aggregationBaseline: 'pre-release' });
    }
  });
  await pages('ideas', async idea => {
    if ('userEmail' in idea.data()) {
      totals.ideasSanitized++;
      if (apply) await idea.ref.update({ userEmail: FieldValue.delete() });
    }
  });
  console.log(JSON.stringify({ projectId, mode: apply ? 'APPLIED' : 'DRY RUN', ...totals }, null, 2));
  console.log('Review historical points/attendance independently. This script does not certify old client-written data.');
}
main().then(() => admin.deleteApp(admin.getApp())).catch(error => { console.error(error.message); process.exitCode = 1; });
