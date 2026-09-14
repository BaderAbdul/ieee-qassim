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
exports.addManualPoints = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.addManualPoints = functions.https.onCall(async (data, context) => {
    const adminUid = (0, auth_1.verifyAuth)(context);
    await (0, auth_1.verifyAdmin)(adminUid); // Only admins can do manual adjustments
    const { studentUid, amount, reason } = data;
    if (!studentUid || typeof studentUid !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid or missing studentUid.');
    }
    if (typeof amount !== 'number' || amount === 0) {
        (0, errors_1.throwFailedPrecondition)('Invalid amount. Must be a non-zero number.');
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        (0, errors_1.throwFailedPrecondition)('Reason is required for manual point adjustments.');
    }
    const db = admin.firestore();
    // Create a new point transaction
    // Using auto-ID since manual adjustments can happen multiple times for a student
    const pointTxRef = db.collection('point_transactions').doc();
    await pointTxRef.set({
        userId: studentUid,
        amount: amount,
        source: 'manual_adjustment',
        reason: reason.trim(),
        createdBy: adminUid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { status: 'success', transactionId: pointTxRef.id };
});
//# sourceMappingURL=addManualPoints.js.map