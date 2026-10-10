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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.onUserProfileWritten = void 0;
const app_1 = require("firebase-admin/app");
// Initialize the Firebase Admin SDK
(0, app_1.initializeApp)();
// Export the Cloud Functions
__exportStar(require("./registerForEvent"), exports);
var publicProfiles_1 = require("./publicProfiles");
Object.defineProperty(exports, "onUserProfileWritten", { enumerable: true, get: function () { return publicProfiles_1.onUserProfileWritten; } });
__exportStar(require("./checkUniversityId"), exports);
__exportStar(require("./generateCheckInToken"), exports);
__exportStar(require("./processCheckIn"), exports);
__exportStar(require("./submitCheckIn"), exports);
__exportStar(require("./manualAttendanceOverride"), exports);
__exportStar(require("./addManualPoints"), exports);
__exportStar(require("./onPointTransactionCreated"), exports);
__exportStar(require("./issueCertificates"), exports);
__exportStar(require("./saveExternalCertificate"), exports);
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
__exportStar(require("./triggers/onRegistrationCancelled"), exports);
//# sourceMappingURL=index.js.map