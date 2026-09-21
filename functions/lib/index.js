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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
// Initialize the Firebase Admin SDK
admin.initializeApp();
// Export the Cloud Functions
__exportStar(require("./registerForEvent"), exports);
__exportStar(require("./generateCheckInToken"), exports);
__exportStar(require("./processCheckIn"), exports);
__exportStar(require("./submitCheckIn"), exports);
__exportStar(require("./manualAttendanceOverride"), exports);
__exportStar(require("./addManualPoints"), exports);
__exportStar(require("./onPointTransactionCreated"), exports);
__exportStar(require("./authBlocking"), exports);
__exportStar(require("./issueCertificates"), exports);
__exportStar(require("./generateCertificate"), exports);
__exportStar(require("./getCertificateDownloadUrl"), exports);
__exportStar(require("./retryCertificate"), exports);
__exportStar(require("./revokeCertificate"), exports);
// Transactional Email System
__exportStar(require("./workers/processMailQueue"), exports);
__exportStar(require("./cron/retryMailQueue"), exports);
__exportStar(require("./triggers/emailRegistrations"), exports);
__exportStar(require("./triggers/emailAttendance"), exports);
__exportStar(require("./triggers/emailCertificates"), exports);
__exportStar(require("./cron/sendEventReminders"), exports);
//# sourceMappingURL=index.js.map