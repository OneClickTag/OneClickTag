"use strict";
/**
 * Test helper utilities
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = void 0;
exports.createMockPrismaService = createMockPrismaService;
exports.createTestModule = createTestModule;
exports.generateTestJWT = generateTestJWT;
exports.createTestUser = createTestUser;
exports.createTestTenant = createTestTenant;
exports.createTestCustomer = createTestCustomer;
exports.createTestCampaign = createTestCampaign;
exports.waitFor = waitFor;
exports.mockGoogleApis = mockGoogleApis;
exports.mockRedisClient = mockRedisClient;
exports.mockBullQueue = mockBullQueue;
exports.expectError = expectError;
exports.deepMerge = deepMerge;
var testing_1 = require("@nestjs/testing");
var jest_mock_extended_1 = require("jest-mock-extended");
var prisma_service_1 = require("../../src/common/prisma/prisma.service");
var jwt_1 = require("@nestjs/jwt");
var config_1 = require("@nestjs/config");
/**
 * Create a mock Prisma service
 */
function createMockPrismaService() {
    return (0, jest_mock_extended_1.mockDeep)();
}
/**
 * Create a test module with common mocks
 */
function createTestModule() {
    return __awaiter(this, arguments, void 0, function (providers, imports, controllers) {
        var mockPrismaService, mockJwtService, mockConfigService;
        if (providers === void 0) { providers = []; }
        if (imports === void 0) { imports = []; }
        if (controllers === void 0) { controllers = []; }
        return __generator(this, function (_a) {
            mockPrismaService = createMockPrismaService();
            mockJwtService = (0, jest_mock_extended_1.mockDeep)();
            mockConfigService = (0, jest_mock_extended_1.mockDeep)();
            return [2 /*return*/, testing_1.Test.createTestingModule({
                    imports: imports,
                    controllers: controllers,
                    providers: __spreadArray(__spreadArray([], providers, true), [
                        {
                            provide: prisma_service_1.PrismaService,
                            useValue: mockPrismaService,
                        },
                        {
                            provide: jwt_1.JwtService,
                            useValue: mockJwtService,
                        },
                        {
                            provide: config_1.ConfigService,
                            useValue: mockConfigService,
                        },
                    ], false),
                }).compile()];
        });
    });
}
/**
 * Generate test JWT token
 */
function generateTestJWT(payload, secret) {
    if (payload === void 0) { payload = {}; }
    if (secret === void 0) { secret = 'test-secret'; }
    var jwt = require('jsonwebtoken');
    return jwt.sign(__assign({ sub: 'test-user-id', email: 'test@example.com', tenantId: 'test-tenant-id' }, payload), secret, { expiresIn: '1h' });
}
/**
 * Create test user data
 */
function createTestUser(overrides) {
    if (overrides === void 0) { overrides = {}; }
    return __assign({ id: 'test-user-id', email: 'test@example.com', name: 'Test User', createdAt: new Date(), updatedAt: new Date() }, overrides);
}
/**
 * Create test tenant data
 */
function createTestTenant(overrides) {
    if (overrides === void 0) { overrides = {}; }
    return __assign({ id: 'test-tenant-id', name: 'Test Tenant', domain: 'test.example.com', plan: 'premium', status: 'active', settings: {}, createdAt: new Date(), updatedAt: new Date() }, overrides);
}
/**
 * Create test customer data
 */
function createTestCustomer(overrides) {
    if (overrides === void 0) { overrides = {}; }
    return __assign({ id: 'test-customer-id', name: 'Test Customer', email: 'customer@example.com', company: 'Test Company', status: 'active', tenantId: 'test-tenant-id', tags: ['test'], metadata: {}, createdAt: new Date(), updatedAt: new Date() }, overrides);
}
/**
 * Create test campaign data
 */
function createTestCampaign(overrides) {
    if (overrides === void 0) { overrides = {}; }
    return __assign({ id: 'test-campaign-id', name: 'Test Campaign', description: 'Test campaign description', customerId: 'test-customer-id', tenantId: 'test-tenant-id', type: 'page_view', status: 'active', config: {
            triggers: [{ type: 'url', value: 'https://example.com' }],
            actions: [{ type: 'conversion', value: 'purchase' }],
        }, createdAt: new Date(), updatedAt: new Date() }, overrides);
}
/**
 * Wait for a condition to be true
 */
function waitFor(condition_1) {
    return __awaiter(this, arguments, void 0, function (condition, timeout, interval) {
        var start;
        if (timeout === void 0) { timeout = 5000; }
        if (interval === void 0) { interval = 100; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    start = Date.now();
                    _a.label = 1;
                case 1:
                    if (!(Date.now() - start < timeout)) return [3 /*break*/, 4];
                    return [4 /*yield*/, condition()];
                case 2:
                    if (_a.sent()) {
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, interval); })];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 4: throw new Error("Condition not met within ".concat(timeout, "ms"));
            }
        });
    });
}
/**
 * Mock Google APIs
 */
function mockGoogleApis() {
    return {
        auth: {
            OAuth2: jest.fn().mockImplementation(function () { return ({
                setCredentials: jest.fn(),
                getAccessToken: jest.fn().mockResolvedValue({ token: 'mock-token' }),
                refreshAccessToken: jest.fn().mockResolvedValue({
                    credentials: { access_token: 'new-mock-token' }
                }),
            }); }),
        },
        ads: {
            GoogleAdsApi: jest.fn().mockImplementation(function () { return ({
                Customer: jest.fn().mockReturnValue({
                    query: jest.fn().mockResolvedValue([]),
                    mutate: jest.fn().mockResolvedValue({ results: [] }),
                }),
            }); }),
        },
        firebase: {
            initializeApp: jest.fn(),
            auth: jest.fn().mockReturnValue({
                verifyIdToken: jest.fn().mockResolvedValue({
                    uid: 'test-firebase-uid',
                    email: 'test@example.com',
                }),
            }),
        },
    };
}
/**
 * Mock Redis client
 */
function mockRedisClient() {
    return {
        get: jest.fn(),
        set: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        ttl: jest.fn(),
        flushall: jest.fn(),
        disconnect: jest.fn(),
        on: jest.fn(),
        ready: true,
    };
}
/**
 * Mock Bull queue
 */
function mockBullQueue() {
    return {
        add: jest.fn(),
        process: jest.fn(),
        on: jest.fn(),
        getJob: jest.fn(),
        getJobs: jest.fn(),
        clean: jest.fn(),
        pause: jest.fn(),
        resume: jest.fn(),
        count: jest.fn(),
    };
}
/**
 * Assert that an error was thrown
 */
function expectError(fn, expectedError) {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    _a.sent();
                    throw new Error('Expected function to throw an error');
                case 2:
                    error_1 = _a.sent();
                    if (expectedError) {
                        if (typeof expectedError === 'string') {
                            expect(error_1.message).toContain(expectedError);
                        }
                        else if (expectedError instanceof RegExp) {
                            expect(error_1.message).toMatch(expectedError);
                        }
                        else {
                            expect(error_1).toBeInstanceOf(expectedError);
                        }
                    }
                    return [2 /*return*/, error_1];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Deep merge objects for test data
 */
function deepMerge(target, source) {
    for (var key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            target[key] = target[key] || {};
            deepMerge(target[key], source[key]);
        }
        else {
            target[key] = source[key];
        }
    }
    return target;
}
/**
 * Generate random test data
 */
exports.random = {
    string: function (length) {
        if (length === void 0) { length = 10; }
        return Math.random().toString(36).substring(2, length + 2);
    },
    email: function () { return "".concat(exports.random.string(), "@example.com"); },
    number: function (min, max) {
        if (min === void 0) { min = 0; }
        if (max === void 0) { max = 1000; }
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    boolean: function () { return Math.random() > 0.5; },
    date: function () { return new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000); },
    uuid: function () { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }); },
};
