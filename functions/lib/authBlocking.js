"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beforeSignIn = exports.beforeCreate = void 0;
const identity_1 = require("firebase-functions/v2/identity");
// To use these functions, Firebase Authentication with Identity Platform must be upgraded in the project.
exports.beforeCreate = (0, identity_1.beforeUserCreated)((_event) => {
    // Allow all users to register regardless of domain
    return;
});
exports.beforeSignIn = (0, identity_1.beforeUserSignedIn)((_event) => {
    // Allow all users to sign in regardless of domain
    return;
});
//# sourceMappingURL=authBlocking.js.map