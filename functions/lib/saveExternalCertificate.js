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
exports.saveExternalCertificate = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("./utils/auth");
const eventLifecycle_1 = require("./utils/eventLifecycle");
exports.saveExternalCertificate = functions.https.onCall(async (data, context) => {
    const actor = (0, auth_1.verifyAuth)(context);
    await (0, auth_1.verifyAdmin)(actor);
    const eventId = (0, eventLifecycle_1.documentId)(data === null || data === void 0 ? void 0 : data.eventId, 'eventId');
    const userId = (0, eventLifecycle_1.documentId)(data === null || data === void 0 ? void 0 : data.userId, 'userId');
    let url;
    try {
        url = new URL(data === null || data === void 0 ? void 0 : data.url);
    }
    catch (_a) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid certificate URL.');
    }
    if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2000)
        throw new functions.https.HttpsError('invalid-argument', 'Use an HTTPS certificate URL.');
    const db = (0, firestore_1.getFirestore)();
    const id = `certificate_${eventId}_${userId}`;
    return db.runTransaction(async (tx) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const ref = db.collection('certificates').doc(id);
        const [event, log, user, existing] = await Promise.all([
            tx.get(db.collection('events').doc(eventId)),
            tx.get(db.collection('attendance_logs').doc(`${eventId}_${userId}`)),
            tx.get(db.collection('users').doc(userId)), tx.get(ref),
        ]);
        if (((_a = event.data()) === null || _a === void 0 ? void 0 : _a.state) !== 'Completed' || !((_b = event.data()) === null || _b === void 0 ? void 0 : _b.hasCertificate) || !log.exists || !user.exists)
            throw new functions.https.HttpsError('failed-precondition', 'A completed event and verified attendance are required.');
        if (((_c = existing.data()) === null || _c === void 0 ? void 0 : _c.status) === 'Revoked' || ((_d = existing.data()) === null || _d === void 0 ? void 0 : _d.status) === 'Generating')
            throw new functions.https.HttpsError('failed-precondition', 'Certificate cannot be replaced in this state.');
        tx.set(ref, {
            id, eventId, userId, status: 'Available', externalUrl: url.href,
            studentName: ((_e = user.data()) === null || _e === void 0 ? void 0 : _e.arabicFullName) || ((_f = user.data()) === null || _f === void 0 ? void 0 : _f.displayName) || 'Student',
            eventTitle: ((_g = event.data()) === null || _g === void 0 ? void 0 : _g.title) || '', eventType: ((_h = event.data()) === null || _h === void 0 ? void 0 : _h.type) || 'Other',
            attendanceDate: (_j = log.data()) === null || _j === void 0 ? void 0 : _j.timestamp,
            issueDate: firestore_1.FieldValue.serverTimestamp(), createdAt: ((_k = existing.data()) === null || _k === void 0 ? void 0 : _k.createdAt) || firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(), attemptCount: 1, issuedBy: actor,
        });
        return { status: 'success' };
    });
});
//# sourceMappingURL=saveExternalCertificate.js.map