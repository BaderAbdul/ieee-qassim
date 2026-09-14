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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.beforeSignIn = exports.beforeCreate = void 0;
const identity_1 = require("firebase-functions/v2/identity");
const functions = __importStar(require("firebase-functions"));
// To use these functions, Firebase Authentication with Identity Platform must be upgraded in the project.
const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN || ((_a = functions.config().auth) === null || _a === void 0 ? void 0 : _a.allowed_domain);
exports.beforeCreate = (0, identity_1.beforeUserCreated)((event) => {
    var _a;
    if (ALLOWED_DOMAIN) {
        const user = event.data;
        const emailDomain = (_a = user.email) === null || _a === void 0 ? void 0 : _a.split('@')[1];
        if (emailDomain !== ALLOWED_DOMAIN) {
            throw new functions.https.HttpsError('permission-denied', `Only users from ${ALLOWED_DOMAIN} are allowed to register.`);
        }
    }
});
exports.beforeSignIn = (0, identity_1.beforeUserSignedIn)((event) => {
    var _a;
    if (ALLOWED_DOMAIN) {
        const user = event.data;
        const emailDomain = (_a = user.email) === null || _a === void 0 ? void 0 : _a.split('@')[1];
        if (emailDomain !== ALLOWED_DOMAIN) {
            throw new functions.https.HttpsError('permission-denied', `Only users from ${ALLOWED_DOMAIN} are allowed to sign in.`);
        }
    }
});
//# sourceMappingURL=authBlocking.js.map