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
const ACK_TYPES = new Set(['chat', 'groupchat', 'headline', 'normal']);
const ALLOWED_CHAT_STATE_TYPES = new Set(['chat', 'groupchat', 'normal']);
const MARKER_RANK = new Map([
    ['markable', 0],
    ['received', 1],
    ['displayed', 2],
    ['acknowledged', 3]
]);
const isReceivedCarbon = (msg) => !!msg.carbon && msg.carbon.type === 'received';
const isSentCarbon = (msg) => !!msg.carbon && msg.carbon.type === 'sent';
const isChatState = (msg) => !!msg.chatState;
const isReceiptRequest = (msg) => !!msg.receipt && msg.receipt.type === 'request' && ACK_TYPES.has(msg.type ?? 'normal');
const hasRTT = (msg) => !!msg.rtt;
const isCorrection = (msg) => !!msg.replace;
const isMarkable = (msg, marker) => msg.marker &&
    (MARKER_RANK.get(msg.marker.type) < MARKER_RANK.get(marker) ||
        msg.marker?.type === 'markable');
const isFormsMessage = (msg) => !!msg.forms && msg.forms.length > 0;
async function toggleCarbons(client, action) {
    await client.sendIQ({
        carbons: {
            action
        },
        type: 'set'
    });
}
function default_1(client) {
    client.disco.addFeature(Namespaces_1.NS_ATTENTION_0);
    client.disco.addFeature(Namespaces_1.NS_CHAT_MARKERS_0);
    client.disco.addFeature(Namespaces_1.NS_CHAT_STATES);
    client.disco.addFeature(Namespaces_1.NS_CORRECTION_0);
    client.disco.addFeature(Namespaces_1.NS_RECEIPTS);
    client.disco.addFeature(Namespaces_1.NS_RTT_0);
    client.enableCarbons = () => toggleCarbons(client, 'enable');
    client.disableCarbons = () => toggleCarbons(client, 'disable');
    client.markReceived = (msg) => client.sendMarker(msg, 'received');
    client.markDisplayed = (msg) => client.sendMarker(msg, 'displayed');
    client.markAcknowledged = (msg) => client.sendMarker(msg, 'acknowledged');
    client.getAttention = (jid, opts = {}) => {
        return client.sendMessage({
            ...opts,
            requestingAttention: true,
            to: jid,
            type: 'headline'
        });
    };
    client.sendMarker = (msg, marker, force) => {
        if (!isMarkable(msg, marker) && !force) {
            return;
        }
        const useStanzaID = client.config.groupchatMarkersUseStanzaID !== false;
        let id = msg.id;
        if (msg.type === 'groupchat' && msg.stanzaIds && useStanzaID) {
            const mucStanzaId = msg.stanzaIds.find(s => JID.equalBare(s.by, msg.from));
            if (mucStanzaId) {
                id = mucStanzaId.id;
            }
        }
        client.sendMessage({
            marker: {
                id,
                type: marker
            },
            to: msg.type === 'groupchat' ? JID.toBare(msg.from) : msg.from,
            type: msg.type
        });
    };
    client.on('message', msg => {
        if (msg.carbon && JID.equalBare(msg.from, client.jid)) {
            const forwardedMessage = msg.carbon.forward.message;
            if (!forwardedMessage.delay) {
                forwardedMessage.delay = msg.carbon.forward.delay || {
                    timestamp: new Date(Date.now())
                };
            }
            if (isReceivedCarbon(msg)) {
                client.emit('carbon:received', msg);
                client.emit('message', forwardedMessage);
            }
            if (isSentCarbon(msg)) {
                client.emit('carbon:sent', msg);
                client.emit('message:sent', forwardedMessage, true);
            }
        }
        if (isFormsMessage(msg)) {
            client.emit('dataform', msg);
        }
        if (msg.requestingAttention) {
            client.emit('attention', msg);
        }
        if (hasRTT(msg)) {
            client.emit('rtt', msg);
        }
        if (isCorrection(msg)) {
            client.emit('replace', msg);
        }
        if (isChatState(msg) && ALLOWED_CHAT_STATE_TYPES.has(msg.type || 'normal')) {
            client.emit('chat:state', msg);
        }
        const sendReceipts = client.config.sendReceipts !== false;
        const sendMUCReceipts = client.config.sendMUCReceipts !== false;
        const sendMarkers = client.config.chatMarkers !== false;
        const useStanzaID = client.config.groupchatMarkersUseStanzaID !== false;
        const isReceipt = isReceiptRequest(msg);
        const isReceivedMarkable = isMarkable(msg, 'received');
        const canSendReceipt = isReceipt && sendReceipts && (msg.type === 'groupchat' ? sendMUCReceipts : true);
        if (canSendReceipt || (sendMarkers && isReceivedMarkable)) {
            const to = msg.type === 'groupchat' ? JID.toBare(msg.from) : msg.from;
            let markerId = msg.id;
            if (msg.type === 'groupchat' && msg.stanzaIds && useStanzaID) {
                const mucStanzaId = msg.stanzaIds.find(s => JID.equalBare(s.by, msg.from));
                if (mucStanzaId) {
                    markerId = mucStanzaId.id;
                }
            }
            client.sendMessage({
                receipt: canSendReceipt
                    ? {
                        id: msg.id,
                        type: 'received'
                    }
                    : undefined,
                marker: sendMarkers && isReceivedMarkable
                    ? {
                        id: markerId,
                        type: 'received'
                    }
                    : undefined,
                to,
                type: msg.type
            });
        }
        if (msg.receipt && msg.receipt.type === 'received') {
            client.emit('receipt', msg);
        }
        if (msg.marker && msg.marker.type !== 'markable') {
            client.emit(`marker:${msg.marker.type}`, msg);
        }
    });
}
