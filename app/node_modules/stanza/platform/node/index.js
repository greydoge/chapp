"use strict";
/* istanbul ignore file */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PassThrough = exports.Duplex = exports.Transform = exports.Writable = exports.Readable = exports.WebSocket = exports.RTCPeerConnection = exports.Hmac = exports.Hash = exports.fetch = exports.Buffer = exports.name = void 0;
exports.getHashes = getHashes;
exports.createHash = createHash;
exports.createHmac = createHmac;
exports.randomBytes = randomBytes;
exports.createResolver = createResolver;
const ws_1 = __importDefault(require("ws"));
exports.WebSocket = ws_1.default;
const crypto_1 = require("crypto");
Object.defineProperty(exports, "Hash", { enumerable: true, get: function () { return crypto_1.Hash; } });
Object.defineProperty(exports, "Hmac", { enumerable: true, get: function () { return crypto_1.Hmac; } });
const dns = __importStar(require("dns"));
const buffer_1 = require("buffer");
Object.defineProperty(exports, "Buffer", { enumerable: true, get: function () { return buffer_1.Buffer; } });
const stream_1 = require("stream");
Object.defineProperty(exports, "Readable", { enumerable: true, get: function () { return stream_1.Readable; } });
Object.defineProperty(exports, "Writable", { enumerable: true, get: function () { return stream_1.Writable; } });
Object.defineProperty(exports, "Transform", { enumerable: true, get: function () { return stream_1.Transform; } });
Object.defineProperty(exports, "PassThrough", { enumerable: true, get: function () { return stream_1.PassThrough; } });
Object.defineProperty(exports, "Duplex", { enumerable: true, get: function () { return stream_1.Duplex; } });
const ianaNames = new Map([
    ['md2', 'md2'],
    ['md5', 'md5'],
    ['sha-1', 'sha1'],
    ['sha-224', 'sha224'],
    ['sha-256', 'sha256'],
    ['sha-384', 'sha384'],
    ['sha-512', 'sha512']
]);
function getHashes() {
    return ['sha-1', 'sha-256', 'sha-384', 'sha-512', 'md5'];
}
function createHash(alg) {
    return (0, crypto_1.createHash)(ianaNames.get(alg.toLowerCase()) || alg);
}
function createHmac(alg, key) {
    return (0, crypto_1.createHmac)(ianaNames.get(alg.toLowerCase()) || alg, key);
}
function randomBytes(size) {
    return (0, crypto_1.randomBytes)(size);
}
function createResolver(opts) {
    return new dns.promises.Resolver(opts);
}
const nativeRTCPeerConnection = undefined;
exports.RTCPeerConnection = nativeRTCPeerConnection;
const nativeFetch = globalThis.fetch.bind(globalThis);
exports.fetch = nativeFetch;
exports.name = 'node';
