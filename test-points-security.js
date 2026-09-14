"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var rules_unit_testing_1 = require("@firebase/rules-unit-testing");
var fs_1 = require("fs");
var path_1 = require("path");
var testEnv;
function runTests() {
    return __awaiter(this, void 0, void 0, function () {
        var studentContext, adminContext, organizerContext;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, rules_unit_testing_1.initializeTestEnvironment)({
                        projectId: 'demo-ieee-qu-site',
                        firestore: {
                            rules: (0, fs_1.readFileSync)((0, path_1.resolve)(__dirname, 'firestore.rules'), 'utf8'),
                            host: '127.0.0.1',
                            port: 8080,
                        },
                    })];
                case 1:
                    testEnv = _a.sent();
                    studentContext = testEnv.authenticatedContext('student1', { email: 'student1@qu.edu.sa', role: 'student' });
                    adminContext = testEnv.authenticatedContext('admin1', { email: 'admin1@qu.edu.sa', role: 'super_admin' });
                    organizerContext = testEnv.authenticatedContext('organizer1', { email: 'org1@qu.edu.sa', role: 'event_organizer' });
                    // Test 1: Students cannot modify totalPoints
                    console.log('Test 1: Students cannot modify totalPoints directly');
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)(studentContext.firestore().collection('users').doc('student1').update({
                            totalPoints: 1000
                        }))];
                case 2:
                    _a.sent();
                    console.log('✅ Passed');
                    // Test 2: Students cannot create point transactions
                    console.log('Test 2: Students cannot create point transactions');
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)(studentContext.firestore().collection('point_transactions').doc('tx1').set({
                            userId: 'student1',
                            amount: 50,
                            source: 'manual_adjustment',
                            reason: 'Hacked the points'
                        }))];
                case 3:
                    _a.sent();
                    console.log('✅ Passed');
                    // Test 3: Admins cannot create point transactions directly (must go through Cloud Functions)
                    console.log('Test 3: Admins cannot create point transactions directly');
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertFails)(adminContext.firestore().collection('point_transactions').doc('tx2').set({
                            userId: 'student1',
                            amount: 50,
                            source: 'manual_adjustment',
                            reason: 'Awarded points'
                        }))];
                case 4:
                    _a.sent();
                    console.log('✅ Passed');
                    // Test 4: Organizers can read point transactions
                    console.log('Test 4: Organizers can read point transactions');
                    return [4 /*yield*/, (0, rules_unit_testing_1.assertSucceeds)(organizerContext.firestore().collection('point_transactions').get())];
                case 5:
                    _a.sent();
                    console.log('✅ Passed');
                    console.log('All security tests passed!');
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
runTests().catch(console.error);
