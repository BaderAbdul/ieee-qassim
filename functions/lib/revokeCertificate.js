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
exports.revokeCertificate = void 0;
const storage_1 = require("firebase-admin/storage");
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions/v1"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.revokeCertificate = functions.https.onCall(async (data, context) => {
    const adminUid = (0, auth_1.verifyAuth)(context);
    const { role } = await (0, auth_1.verifyAdmin)(adminUid);
    if (role !== 'super_admin' && role !== 'event_organizer') {
        (0, errors_1.throwFailedPrecondition)('Insufficient permissions. Only Organizers or Super Admins can revoke certificates.');
    }
    const { certificateId } = data;
    if (!certificateId || typeof certificateId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Missing or invalid certificateId.');
    }
    const db = (0, firestore_1.getFirestore)();
    await db.runTransaction(async (transaction) => {
        const certRef = db.collection('certificates').doc(certificateId);
        const certSnap = await transaction.get(certRef);
        if (!certSnap.exists) {
            (0, errors_1.throwFailedPrecondition)('Certificate not found.');
        }
        const certData = certSnap.data();
        if ((certData === null || certData === void 0 ? void 0 : certData.status) !== 'Available') {
            (0, errors_1.throwFailedPrecondition)('Only Available certificates can be revoked.');
        }
        transaction.update(certRef, {
            status: 'Revoked',
            revokedBy: adminUid,
            revokedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        // We could delete the storage object in a post-transaction step
        // Using transaction.get allows us to read it safely
    });
    // Post-transaction, delete the file from Storage to ensure it's completely gone.
    try {
        const certRef = db.collection('certificates').doc(certificateId);
        const certSnap = await certRef.get();
        const certData = certSnap.data();
        if (certData === null || certData === void 0 ? void 0 : certData.storagePath) {
            const bucket = (0, storage_1.getStorage)().bucket();
            const file = bucket.file(certData.storagePath);
            const [exists] = await file.exists();
            if (exists) {
                await file.delete();
            }
        }
    }
    catch (err) {
        console.error(`Failed to delete storage object for revoked cert ${certificateId}:`, err);
        // Certificate is still marked Revoked in DB, which is the absolute truth anyway.
    }
    return { status: 'success' };
});
//# sourceMappingURL=revokeCertificate.js.map