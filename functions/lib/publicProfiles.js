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
exports.onUserProfileWritten = void 0;
exports.publicProfile = publicProfile;
exports.syncPublicProfile = syncPublicProfile;
const firestore_1 = require("firebase-admin/firestore");
const functions = __importStar(require("firebase-functions/v1"));
function publicProfile(data) {
    const fields = ['displayName', 'arabicFullName', 'firstName', 'familyName', 'photoURL', 'role', 'totalPoints', 'badges', 'publicProfile', 'cardPreferences', 'createdAt', 'college', 'major'];
    const result = Object.fromEntries(fields.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
    if (data.publicProfile)
        result.publicProfile = Object.fromEntries(['avatar', 'bio', 'linkedin'].filter(key => data.publicProfile[key] !== undefined).map(key => [key, data.publicProfile[key]]));
    if (data.cardPreferences)
        result.cardPreferences = Object.fromEntries(['theme', 'pattern'].filter(key => data.cardPreferences[key] !== undefined).map(key => [key, data.cardPreferences[key]]));
    return result;
}
// Read the current source within a transaction: delayed triggers cannot publish stale data.
async function syncPublicProfile(userId) {
    const db = (0, firestore_1.getFirestore)();
    await db.runTransaction(async (tx) => {
        var _a;
        const source = await tx.get(db.collection('users').doc(userId));
        const target = db.collection('public_profiles').doc(userId);
        if (!source.exists || ((_a = source.data()) === null || _a === void 0 ? void 0 : _a.isRestricted))
            tx.delete(target);
        else
            tx.set(target, publicProfile(source.data()));
    });
}
exports.onUserProfileWritten = functions.runWith({ failurePolicy: true }).firestore.document('users/{userId}')
    .onWrite((_change, context) => syncPublicProfile(context.params.userId));
//# sourceMappingURL=publicProfiles.js.map