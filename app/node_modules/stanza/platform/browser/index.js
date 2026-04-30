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
exports.PassThrough = exports.Duplex = exports.Transform = exports.Writable = exports.Readable = exports.WebSocket = exports.RTCPeerConnection = exports.fetch = exports.Hmac = exports.Hash = exports.createHash = exports.Buffer = exports.name = void 0;
exports.randomBytes = randomBytes;
exports.getHashes = getHashes;
exports.createHmac = createHmac;
exports.createResolver = createResolver;
const buffer_1 = require("./buffer");
Object.defineProperty(exports, "Buffer", { enumerable: true, get: function () { return buffer_1.Buffer; } });
const createHash_1 = __importStar(require("./crypto/createHash"));
exports.createHash = createHash_1.default;
Object.defineProperty(exports, "Hash", { enumerable: true, get: function () { return createHash_1.Hash; } });
const Hmac_1 = __importDefault(require("./crypto/Hmac"));
exports.Hmac = Hmac_1.default;
const stream_1 = require("./stream");
Object.defineProperty(exports, "Readable", { enumerable: true, get: function () { return stream_1.Readable; } });
Object.defineProperty(exports, "Writable", { enumerable: true, get: function () { return stream_1.Writable; } });
Object.defineProperty(exports, "Transform", { enumerable: true, get: function () { return stream_1.Transform; } });
Object.defineProperty(exports, "PassThrough", { enumerable: true, get: function () { return stream_1.PassThrough; } });
Object.defineProperty(exports, "Duplex", { enumerable: true, get: function () { return stream_1.Duplex; } });
function randomBytes(size) {
    const rawBytes = new Uint8Array(size);
    if (size > 0) {
        (globalThis.crypto || globalThis.msCrypto).getRandomValues(rawBytes);
    }
    return buffer_1.Buffer.from(rawBytes.buffer);
}
function getHashes() {
    return ['sha-1', 'sha-256', 'sha-512', 'md5'];
}
function createHmac(alg, key) {
    return new Hmac_1.default(alg.toLowerCase(), key);
}
function createResolver() {
    return undefined;
}
const nativeFetch = globalThis.fetch.bind(globalThis);
exports.fetch = nativeFetch;
const nativeWS = globalThis.WebSocket;
exports.WebSocket = nativeWS;
const nativeRTCPeerConnection = globalThis
    .RTCPeerConnection;
exports.RTCPeerConnection = nativeRTCPeerConnection;
exports.name = 'browser';
