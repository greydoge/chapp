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
function default_1(client) {
    client.on('iq:set:roster', iq => {
        const allowed = JID.allowedResponders(client.jid);
        if (!allowed.has(iq.from)) {
            return client.sendIQError(iq, {
                error: {
                    condition: 'service-unavailable',
                    type: 'cancel'
                }
            });
        }
        client.emit('roster:update', iq);
        client.sendIQResult(iq);
    });
    client.on('iq:set:blockList', iq => {
        const allowed = JID.allowedResponders(client.jid);
        if (!allowed.has(iq.from)) {
            return client.sendIQError(iq, {
                error: {
                    condition: 'service-unavailable',
                    type: 'cancel'
                }
            });
        }
        const blockList = iq.blockList;
        client.emit(blockList.action, {
            jids: blockList.jids || []
        });
        client.sendIQResult(iq);
    });
    client.getRoster = async () => {
        const resp = await client.sendIQ({
            roster: {
                version: client.config.rosterVer
            },
            type: 'get'
        });
        if (resp.roster) {
            const version = resp.roster.version;
            if (version) {
                client.config.rosterVer = version;
                client.emit('roster:ver', version);
            }
            resp.roster.items = resp.roster.items || [];
            return resp.roster;
        }
        else {
            return { items: [] };
        }
    };
    client.updateRosterItem = async (item) => {
        await client.sendIQ({
            roster: {
                items: [item]
            },
            type: 'set'
        });
    };
    client.removeRosterItem = (jid) => {
        return client.updateRosterItem({ jid, subscription: 'remove' });
    };
    client.subscribe = (jid) => {
        client.sendPresence({ type: 'subscribe', to: jid });
    };
    client.unsubscribe = (jid) => {
        client.sendPresence({ type: 'unsubscribe', to: jid });
    };
    client.acceptSubscription = (jid) => {
        client.sendPresence({ type: 'subscribed', to: jid });
    };
    client.denySubscription = (jid) => {
        client.sendPresence({ type: 'unsubscribed', to: jid });
    };
    client.getBlocked = async () => {
        const result = await client.sendIQ({
            blockList: {
                action: 'list'
            },
            type: 'get'
        });
        return {
            jids: [],
            ...result.blockList
        };
    };
    async function toggleBlock(action, jid) {
        await client.sendIQ({
            blockList: {
                action,
                jids: [jid]
            },
            type: 'set'
        });
    }
    client.block = async (jid) => toggleBlock('block', jid);
    client.unblock = async (jid) => toggleBlock('unblock', jid);
    client.goInvisible = async (probe = false) => {
        await client.sendIQ({
            type: 'set',
            visiblity: {
                probe,
                type: 'invisible'
            }
        });
    };
    client.goVisible = async () => {
        await client.sendIQ({
            type: 'set',
            visiblity: {
                type: 'visible'
            }
        });
    };
}
