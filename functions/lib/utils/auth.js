"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAdmin = exports.verifyAuth = void 0;
const firestore_1 = require("firebase-admin/firestore");
const errors_1 = require("./errors");
const verifyAuth = (context) => {
    if (!context.auth || !context.auth.uid) {
        (0, errors_1.throwUnauthenticated)();
    }
    return context.auth.uid;
};
exports.verifyAuth = verifyAuth;
const verifyAdmin = async (uid) => {
    var _a, _b;
    const userSnap = await (0, firestore_1.getFirestore)().collection('users').doc(uid).get();
    if (!userSnap.exists) {
        (0, errors_1.throwUnauthorized)('User profile not found.');
    }
    const role = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.role;
    if ((_b = userSnap.data()) === null || _b === void 0 ? void 0 : _b.isRestricted)
        (0, errors_1.throwUnauthorized)('Account is restricted.');
    if (role !== 'event_organizer' && role !== 'super_admin') {
        (0, errors_1.throwUnauthorized)('Admin access required.');
    }
    return { uid, role };
};
exports.verifyAdmin = verifyAdmin;
//# sourceMappingURL=auth.js.map