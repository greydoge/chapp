"use strict";
// ====================================================================
// XEP-0421: Occupant identifiers for semi-anonymous MUCs
// --------------------------------------------------------------------
// Source: https://xmpp.org/extensions/xep-0421.html
// Version: 1.0.1 (2025-04-09)
// ====================================================================
Object.defineProperty(exports, "__esModule", { value: true });
const jxt_1 = require("../jxt");
const Namespaces_1 = require("../Namespaces");
const Protocol = [
    (0, jxt_1.extendPresence)({
        occupantId: (0, jxt_1.childAttribute)(Namespaces_1.NS_OCCUPANT_0, 'occupant-id', 'id')
    }),
    (0, jxt_1.extendMessage)({
        occupantId: (0, jxt_1.childAttribute)(Namespaces_1.NS_OCCUPANT_0, 'occupant-id', 'id')
    })
];
exports.default = Protocol;
