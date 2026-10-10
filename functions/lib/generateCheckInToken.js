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
exports.generateCheckInToken = void 0;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions/v1"));
const node_crypto_1 = require("node:crypto");
const auth_1 = require("./utils/auth");
const eventLifecycle_1 = require("./utils/eventLifecycle");
// Tokens stay out of public event documents and expire after 15 minutes.
exports.generateCheckInToken = functions.https.onCall(async (data, context) => {
    await (0, auth_1.verifyAdmin)((0, auth_1.verifyAuth)(context));
    const eventId = (0, eventLifecycle_1.documentId)(data === null || data === void 0 ? void 0 : data.eventId, 'eventId');
    const token = (0, node_crypto_1.randomBytes)(32).toString('hex');
    const expiresAt = firestore_1.Timestamp.fromMillis(Date.now() + 15 * 60 * 1000);
    await (0, firestore_1.getFirestore)().runTransaction(async (tx) => {
        var _a;
        const event = await tx.get((0, firestore_1.getFirestore)().collection('events').doc(eventId));
        if (!event.exists || ((_a = event.data()) === null || _a === void 0 ? void 0 : _a.state) !== 'Ongoing')
            throw new functions.https.HttpsError('failed-precondition', 'Event must be Ongoing.');
        tx.set((0, firestore_1.getFirestore)().collection('event_secrets').doc(eventId), { token, expiresAt });
    });
    return { token, expiresAt: expiresAt.toMillis() };
});
//# sourceMappingURL=generateCheckInToken.js.map