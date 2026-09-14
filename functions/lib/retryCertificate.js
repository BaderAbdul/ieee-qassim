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
exports.retryCertificate = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.retryCertificate = functions.https.onCall(async (data, context) => {
    const adminUid = (0, auth_1.verifyAuth)(context);
    const { role } = await (0, auth_1.verifyAdmin)(adminUid);
    if (role !== 'super_admin' && role !== 'event_organizer') {
        (0, errors_1.throwFailedPrecondition)('Insufficient permissions. Only Organizers or Super Admins can retry certificates.');
    }
    const { certificateId } = data;
    if (!certificateId || typeof certificateId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Missing or invalid certificateId.');
    }
    const db = admin.firestore();
    await db.runTransaction(async (transaction) => {
        const certRef = db.collection('certificates').doc(certificateId);
        const certSnap = await transaction.get(certRef);
        if (!certSnap.exists) {
            (0, errors_1.throwFailedPrecondition)('Certificate not found.');
        }
        const certData = certSnap.data();
        if ((certData === null || certData === void 0 ? void 0 : certData.status) !== 'Failed') {
            (0, errors_1.throwFailedPrecondition)('Only Failed certificates can be retried.');
        }
        transaction.update(certRef, {
            status: 'Generating', // This will re-trigger the generateCertificate function
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            lastError: firestore_1.FieldValue.delete(), // clear the old error
        });
    });
    return { status: 'success' };
});
//# sourceMappingURL=retryCertificate.js.map