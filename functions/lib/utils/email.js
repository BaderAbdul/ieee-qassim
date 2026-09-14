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
exports.enqueueEmail = enqueueEmail;
const firestore_1 = require("firebase-admin/firestore");
const admin = __importStar(require("firebase-admin"));
/**
 * Enqueues an email into the `mail` collection for asynchronous processing.
 * Uses `dedupeKey` as the document ID to guarantee idempotency.
 */
async function enqueueEmail(payload) {
    const db = admin.firestore();
    const mailRef = db.collection('mail').doc(payload.dedupeKey);
    try {
        await mailRef.create({
            to: payload.to,
            template: payload.template,
            data: payload.data,
            status: 'PENDING',
            dedupeKey: payload.dedupeKey,
            attemptCount: 0,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp()
        });
        console.log(`Successfully enqueued email ${payload.template} with dedupeKey ${payload.dedupeKey}`);
    }
    catch (error) {
        if (error.code === 6) { // ALREADY_EXISTS
            console.log(`Email with dedupeKey ${payload.dedupeKey} already exists. Skipping.`);
        }
        else {
            console.error(`Failed to enqueue email with dedupeKey ${payload.dedupeKey}:`, error);
            throw error;
        }
    }
}
//# sourceMappingURL=email.js.map