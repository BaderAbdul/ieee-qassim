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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
exports.onPointTransactionCreated = functions.firestore
    .document('point_transactions/{transactionId}')
    .onCreate(async (snap, context) => {
    const data = snap.data();
    const { userId, amount } = data;
    if (!userId || typeof amount !== 'number') {
        console.error('Invalid point transaction data:', data);
        return null;
    }
    const db = admin.firestore();
    const userRef = db.collection('users').doc(userId);
    // Atomically increment the user's totalPoints cache
    try {
        await userRef.update({
            totalPoints: admin.firestore.FieldValue.increment(amount)
        });
        console.log(`Successfully updated totalPoints for user ${userId} by ${amount}`);
    }
    catch (error) {
        // If the user document doesn't exist or doesn't have totalPoints, we might need to set it
        if (error.code === 5 || error.message.includes('NOT_FOUND')) {
            await userRef.set({
                totalPoints: amount
            }, { merge: true });
            console.log(`Created and set totalPoints for user ${userId} to ${amount}`);
        }
        else {
            console.error('Error updating totalPoints:', error);
            throw error;
        }
    }
    return null;
});
//# sourceMappingURL=onPointTransactionCreated.js.map