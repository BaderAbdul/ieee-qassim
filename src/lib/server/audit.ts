import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore';

/** Only safe, selected business facts belong here: never tokens or whole profiles. */
export function audit(tx: Transaction, action: string, actorUid: string, targetId: string, details: Record<string, unknown> = {}) {
  tx.create(getFirestore().collection('audit_logs').doc(), {
    action, actorUid, targetId, ...details, createdAt: FieldValue.serverTimestamp(),
  });
}
