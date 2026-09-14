"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryMailQueue = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
exports.retryMailQueue = (0, scheduler_1.onSchedule)('every 5 minutes', async (event) => {
    const db = admin.firestore();
    // Find PENDING emails where nextAttemptAt is in the past
    const snapshot = await db.collection('mail')
        .where('status', '==', 'PENDING')
        .where('nextAttemptAt', '<=', admin.firestore.Timestamp.now())
        .limit(100)
        .get();
    if (snapshot.empty) {
        console.log('No pending emails require retry at this time.');
        return;
    }
    console.log(`Found ${snapshot.size} emails to retry. Waking up workers...`);
    // Touch the document to trigger `processMailQueue` (onDocumentWritten)
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { updatedAt: firestore_1.FieldValue.serverTimestamp() });
    });
    await batch.commit();
    console.log(`Successfully triggered retries for ${snapshot.size} emails.`);
});
//# sourceMappingURL=retryMailQueue.js.map