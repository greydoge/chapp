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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const DiscoManager_1 = __importDefault(require("../helpers/DiscoManager"));
const JID = __importStar(require("../JID"));
const Namespaces_1 = require("../Namespaces");
function default_1(client) {
    client.disco = new DiscoManager_1.default();
    client.disco.addFeature(Namespaces_1.NS_DISCO_INFO);
    client.disco.addFeature(Namespaces_1.NS_DISCO_ITEMS);
    client.disco.addIdentity({
        category: 'client',
        type: 'web'
    });
    client.registerFeature('caps', 100, (features, done) => {
        const domain = JID.getDomain(client.jid) || client.config.server;
        client.emit('disco:caps', {
            caps: features.legacyCapabilities || [],
            jid: domain
        });
        client.features.negotiated.caps = true;
        done();
    });
    client.getDiscoInfo = async (jid, node) => {
        const resp = await client.sendIQ({
            disco: {
                node,
                type: 'info'
            },
            to: jid,
            type: 'get'
        });
        return {
            extensions: [],
            features: [],
            identities: [],
            ...resp.disco
        };
    };
    client.getDiscoItems = async (jid, node) => {
        const resp = await client.sendIQ({
            disco: {
                node,
                type: 'items'
            },
            to: jid,
            type: 'get'
        });
        return {
            items: [],
            ...resp.disco
        };
    };
    client.updateCaps = () => {
        const node = client.config.capsNode || 'https://stanzajs.org';
        return client.disco.updateCaps(node);
    };
    client.getCurrentCaps = () => {
        const caps = client.disco.getCaps();
        if (!caps) {
            return;
        }
        const node = `${caps[0].node}#${caps[0].value}`;
        return {
            info: client.disco.getNodeInfo(node),
            legacyCapabilities: caps
        };
    };
    client.on('presence', pres => {
        if (pres.legacyCapabilities) {
            client.emit('disco:caps', {
                caps: pres.legacyCapabilities,
                jid: pres.from
            });
        }
    });
    client.on('iq:get:disco', iq => {
        const { type, node } = iq.disco;
        if (type === 'info') {
            client.sendIQResult(iq, {
                disco: {
                    ...client.disco.getNodeInfo(node || ''),
                    node,
                    type: 'info'
                }
            });
        }
        if (type === 'items') {
            client.sendIQResult(iq, {
                disco: {
                    items: client.disco.items.get(node || '') || [],
                    type: 'items'
                }
            });
        }
    });
}
