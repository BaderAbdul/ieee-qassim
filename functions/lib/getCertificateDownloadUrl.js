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
exports.getCertificateDownloadUrl = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.getCertificateDownloadUrl = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = (0, auth_1.verifyAuth)(context);
    const { certificateId } = data;
    if (!certificateId || typeof certificateId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Missing or invalid certificateId.');
    }
    const db = admin.firestore();
    const certRef = db.collection('certificates').doc(certificateId);
    const certSnap = await certRef.get();
    if (!certSnap.exists) {
        (0, errors_1.throwNotFound)('Certificate not found.');
    }
    const certData = certSnap.data();
    // Verify ownership or admin role (roles are stored in Firestore, not JWT custom claims)
    let isAdmin = false;
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    const role = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (role === 'super_admin' || role === 'event_organizer') {
        isAdmin = true;
    }
    if ((certData === null || certData === void 0 ? void 0 : certData.userId) !== uid && !isAdmin) {
        (0, errors_1.throwFailedPrecondition)('You do not have permission to access this certificate.');
    }
    if ((certData === null || certData === void 0 ? void 0 : certData.status) !== 'Available') {
        (0, errors_1.throwFailedPrecondition)(`Certificate is not available. Current status: ${certData === null || certData === void 0 ? void 0 : certData.status}`);
    }
    const storagePath = certData.storagePath;
    if (!storagePath) {
        (0, errors_1.throwFailedPrecondition)('Certificate storage path is missing.');
    }
    try {
        const bucket = admin.storage().bucket();
        const file = bucket.file(storagePath);
        // Check if file exists in storage
        const [exists] = await file.exists();
        if (!exists) {
            (0, errors_1.throwNotFound)('Certificate file not found in storage.');
        }
        // Generate a short-lived signed URL (e.g., valid for 15 minutes)
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes from now
        });
        return { status: 'success', url };
    }
    catch (error) {
        console.error('Error generating signed URL:', error);
        (0, errors_1.throwFailedPrecondition)('Failed to generate download URL.');
    }
    return { status: 'error' };
});
//# sourceMappingURL=getCertificateDownloadUrl.js.map