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
exports.processCheckIn = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const auth_1 = require("./utils/auth");
const eventLifecycle_1 = require("./utils/eventLifecycle");
// Compatibility endpoint shares the same attendance transaction as submitCheckIn.
exports.processCheckIn = functions.https.onCall((data, context) => {
    const uid = (0, auth_1.verifyAuth)(context);
    return (0, eventLifecycle_1.recordAttendance)({ eventId: (0, eventLifecycle_1.documentId)(data === null || data === void 0 ? void 0 : data.eventId, 'eventId'), userId: uid, actorUid: uid, admin: false, token: data === null || data === void 0 ? void 0 : data.token });
});
//# sourceMappingURL=processCheckIn.js.map