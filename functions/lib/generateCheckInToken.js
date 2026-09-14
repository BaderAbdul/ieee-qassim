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
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const jwt = __importStar(require("jsonwebtoken"));
const auth_1 = require("./utils/auth");
const errors_1 = require("./utils/errors");
exports.generateCheckInToken = functions.https.onCall(async (data, context) => {
    var _a;
    const uid = (0, auth_1.verifyAuth)(context);
    await (0, auth_1.verifyAdmin)(uid); // Only admins can generate QR tokens
    const { eventId } = data;
    if (!eventId || typeof eventId !== 'string') {
        (0, errors_1.throwFailedPrecondition)('Invalid eventId.');
    }
    const db = admin.firestore();
    const eventSnap = await db.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
        (0, errors_1.throwFailedPrecondition)('Event not found.');
    }
    const eventData = eventSnap.data();
    if (eventData.state !== 'Ongoing') {
        (0, errors_1.throwFailedPrecondition)('Event must be Ongoing to generate tokens.');
    }
    // Get the secret from environment config (firebase functions:config:set or dotenv)
    // For V1, we'll use a strong fallback if env var is missing, but in production, this should be set in Secrets Manager.
    const JWT_SECRET = process.env.JWT_SECRET || ((_a = functions.config().jwt) === null || _a === void 0 ? void 0 : _a.secret);
    if (!JWT_SECRET) {
        throw new functions.https.HttpsError('internal', 'JWT_SECRET is not configured. Please set it in Firebase Secret Manager.');
    }
    // Create a payload with a nonce to prevent replay attacks and limit lifespan to 60 seconds
    const payload = {
        eventId,
        nonce: Date.now() + Math.random().toString(36).substring(2),
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '60s' });
    return { token };
});
//# sourceMappingURL=generateCheckInToken.js.map