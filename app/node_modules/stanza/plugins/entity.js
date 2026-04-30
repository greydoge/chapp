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
exports.default = default_1;
const Constants_1 = require("../Constants");
const Namespaces_1 = require("../Namespaces");
const hashes = __importStar(require("../platform"));
function default_1(client) {
    client.disco.addFeature('jid\\20escaping');
    client.disco.addFeature(Namespaces_1.NS_DELAY);
    client.disco.addFeature(Namespaces_1.NS_EME_0);
    client.disco.addFeature(Namespaces_1.NS_FORWARD_0);
    client.disco.addFeature(Namespaces_1.NS_HASHES_2);
    client.disco.addFeature(Namespaces_1.NS_HASHES_1);
    client.disco.addFeature(Namespaces_1.NS_IDLE_1);
    client.disco.addFeature(Namespaces_1.NS_JSON_0);
    client.disco.addFeature(Namespaces_1.NS_OOB);
    client.disco.addFeature(Namespaces_1.NS_PSA);
    client.disco.addFeature(Namespaces_1.NS_REFERENCE_0);
    client.disco.addFeature(Namespaces_1.NS_SHIM);
    client.disco.addFeature(Namespaces_1.NS_DATAFORM);
    client.disco.addFeature(Namespaces_1.NS_DATAFORM_MEDIA);
    client.disco.addFeature(Namespaces_1.NS_DATAFORM_VALIDATION);
    client.disco.addFeature(Namespaces_1.NS_DATAFORM_LAYOUT);
    const names = hashes.getHashes();
    for (const name of names) {
        client.disco.addFeature((0, Namespaces_1.NS_HASH_NAME)(name));
    }
    client.disco.addFeature(Namespaces_1.NS_TIME);
    client.disco.addFeature(Namespaces_1.NS_VERSION);
    client.on('iq:get:softwareVersion', iq => {
        return client.sendIQResult(iq, {
            softwareVersion: client.config.softwareVersion || {
                name: 'stanzajs.org',
                version: Constants_1.VERSION
            }
        });
    });
    client.on('iq:get:time', (iq) => {
        const time = new Date();
        client.sendIQResult(iq, {
            time: {
                tzo: time.getTimezoneOffset(),
                utc: time
            }
        });
    });
    client.getSoftwareVersion = async (jid) => {
        const resp = await client.sendIQ({
            softwareVersion: {},
            to: jid,
            type: 'get'
        });
        return resp.softwareVersion;
    };
    client.getTime = async (jid) => {
        const resp = await client.sendIQ({
            time: {},
            to: jid,
            type: 'get'
        });
        return resp.time;
    };
    client.getLastActivity = async (jid) => {
        const resp = await client.sendIQ({
            lastActivity: {},
            to: jid,
            type: 'get'
        });
        return resp.lastActivity;
    };
}
