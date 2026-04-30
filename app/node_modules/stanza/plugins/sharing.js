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
const JID = __importStar(require("../JID"));
const Namespaces_1 = require("../Namespaces");
function default_1(client) {
    client.disco.addFeature(Namespaces_1.NS_BOB);
    client.getBits = async (jid, cid) => {
        const result = await client.sendIQ({
            bits: {
                cid
            },
            to: jid,
            type: 'get'
        });
        return result.bits;
    };
    async function getUploadParameters(jid) {
        const disco = await client.getDiscoInfo(jid);
        if (!disco.features || !disco.features.includes(Namespaces_1.NS_HTTP_UPLOAD_0)) {
            return;
        }
        let maxSize;
        for (const form of disco.extensions || []) {
            const fields = form.fields || [];
            if (fields.some(field => field.name === 'FORM_TYPE' && field.value === Namespaces_1.NS_HTTP_UPLOAD_0)) {
                const sizeField = fields.find(field => field.name === 'max-file-size');
                if (sizeField) {
                    maxSize = parseInt(sizeField.value, 10);
                }
                return {
                    jid,
                    maxSize
                };
            }
        }
    }
    client.getUploadService = async (domain = JID.getDomain(client.jid)) => {
        const domainParameters = await getUploadParameters(domain);
        if (domainParameters) {
            return domainParameters;
        }
        const disco = await client.getDiscoItems(domain);
        for (const item of disco.items || []) {
            if (!item.jid) {
                continue;
            }
            const itemParameters = await getUploadParameters(item.jid);
            if (itemParameters) {
                return itemParameters;
            }
        }
        throw new Error('No upload service discovered on: ' + domain);
    };
    client.getUploadSlot = async (uploadService, uploadRequest) => {
        const resp = await client.sendIQ({
            httpUpload: {
                type: 'request',
                ...uploadRequest
            },
            to: uploadService,
            type: 'get'
        });
        return resp.httpUpload;
    };
}
