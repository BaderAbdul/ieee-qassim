"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beforeSignIn = exports.beforeCreate = void 0;
const identity_1 = require("firebase-functions/v2/identity");

exports.beforeCreate = (0, identity_1.beforeUserCreated)((_event) => {
    return;
});
exports.beforeSignIn = (0, identity_1.beforeUserSignedIn)((_event) => {
    return;
});
//# sourceMappingURL=authBlocking.js.map