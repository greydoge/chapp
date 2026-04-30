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
const DataForms_1 = require("../helpers/DataForms");
const JID = __importStar(require("../JID"));
const Namespaces_1 = require("../Namespaces");
function default_1(client) {
    client.getHistorySearchForm = async (jid, opts = {}) => {
        const res = await client.sendIQ({
            archive: {
                type: 'query',
                version: opts.version
            },
            to: jid,
            type: 'get'
        });
        return res.archive.form;
    };
    client.searchHistory = async (jidOrOpts, opts = {}) => {
        const queryid = client.nextId();
        let jid = '';
        if (typeof jidOrOpts === 'string') {
            jid = jidOrOpts;
        }
        else {
            jid = jidOrOpts.to || '';
            opts = jidOrOpts;
        }
        opts.queryId = queryid;
        const form = opts.form || {};
        form.type = 'submit';
        const fields = form.fields || [];
        const defaultFields = [
            {
                name: 'FORM_TYPE',
                type: 'hidden',
                value: Namespaces_1.NS_MAM_2
            }
        ];
        if (opts.with) {
            defaultFields.push({
                name: 'with',
                type: 'text-single',
                value: opts.with
            });
        }
        if (opts.start) {
            defaultFields.push({
                name: 'start',
                type: 'text-single',
                value: opts.start.toISOString()
            });
        }
        if (opts.end) {
            defaultFields.push({
                name: 'end',
                type: 'text-single',
                value: opts.end.toISOString()
            });
        }
        form.fields = (0, DataForms_1.mergeFields)(defaultFields, fields);
        opts.form = form;
        const allowed = JID.allowedResponders(client.jid, jid);
        const results = [];
        const collector = (msg) => {
            if (allowed.has(msg.from) && msg.archive && msg.archive.queryId === queryid) {
                results.push(msg.archive);
            }
        };
        client.on('mam:item', collector);
        try {
            const resp = await client.sendIQ({
                archive: opts,
                id: queryid,
                to: jid,
                type: 'set'
            });
            return {
                ...resp.archive,
                results
            };
        }
        finally {
            client.off('mam:item', collector);
        }
    };
    client.getHistoryPreferences = async () => {
        const resp = await client.sendIQ({
            archive: {
                type: 'preferences'
            },
            type: 'get'
        });
        return resp.archive;
    };
    client.setHistoryPreferences = (opts) => {
        return client.sendIQ({
            archive: {
                type: 'preferences',
                ...opts
            },
            type: 'set'
        });
    };
    client.on('message', msg => {
        if (msg.archive) {
            client.emit('mam:item', msg);
        }
    });
}
