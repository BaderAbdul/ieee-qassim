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
exports.onPointTransactionCreated = void 0;
exports.aggregatePoints = aggregatePoints;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
// Firestore delivers events at least once; the marker and total must commit together.
async function aggregatePoints(transactionId) {
    const db = (0, firestore_1.getFirestore)();
    const ledger = db.collection('point_transactions').doc(transactionId);
    await db.runTransaction(async (tx) => {
        var _a, _b, _c;
        const snap = await tx.get(ledger);
        const data = snap.data();
        if (!data || data.aggregatedAt)
            return;
        const amount = (_a = data.amount) !== null && _a !== void 0 ? _a : data.points;
        if (!Number.isSafeInteger(amount) || !data.userId)
            throw new Error('Invalid points ledger entry.');
        const userRef = db.collection('users').doc(data.userId);
        const [user, attendance] = await Promise.all([
            tx.get(userRef), tx.get(db.collection('attendance_logs').where('userId', '==', data.userId).limit(5)),
        ]);
        if (!user.exists)
            throw new Error('Points owner does not exist.');
        const totalPoints = Math.max(0, (((_b = user.data()) === null || _b === void 0 ? void 0 : _b.totalPoints) || 0) + amount);
        const badges = new Set(((_c = user.data()) === null || _c === void 0 ? void 0 : _c.badges) || []);
        if (attendance.size >= 1)
            badges.add('ieee_starter');
        if (attendance.size >= 3)
            badges.add('active_engineer');
        if (attendance.size >= 5)
            badges.add('tech_pioneer');
        if (totalPoints >= 100)
            badges.add('century_club');
        if (totalPoints >= 250)
            badges.add('engineering_leader');
        tx.update(userRef, { totalPoints, badges: Array.from(badges) });
        tx.update(ledger, { aggregatedAt: firestore_1.FieldValue.serverTimestamp() });
    });
}
exports.onPointTransactionCreated = functions.runWith({ failurePolicy: true }).firestore
    .document('point_transactions/{transactionId}').onCreate((_snap, context) => aggregatePoints(context.params.transactionId));
//# sourceMappingURL=onPointTransactionCreated.js.map