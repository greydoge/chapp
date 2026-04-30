"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.childJID = exports.childJIDAttribute = exports.JIDAttribute = void 0;
exports.addAlias = addAlias;
exports.extendMessage = extendMessage;
exports.extendPresence = extendPresence;
exports.extendIQ = extendIQ;
exports.extendStreamFeatures = extendStreamFeatures;
exports.extendStanzaError = extendStanzaError;
exports.pubsubItemContentAliases = pubsubItemContentAliases;
const Namespaces_1 = require("../Namespaces");
const Types_1 = require("./Types");
// ====================================================================
// Useful XMPP Aliases
// ====================================================================
exports.JIDAttribute = Types_1.attribute;
exports.childJIDAttribute = Types_1.childAttribute;
exports.childJID = Types_1.childText;
// ====================================================================
// XMPP Definition Shortcuts
// ====================================================================
function addAlias(namespace, element, aliases) {
    return {
        aliases: Array.isArray(aliases) ? aliases : [aliases],
        element,
        fields: {},
        namespace
    };
}
function extendMessage(fields) {
    return { element: 'message', fields, namespace: Namespaces_1.NS_CLIENT };
}
function extendPresence(fields) {
    return { element: 'presence', fields, namespace: Namespaces_1.NS_CLIENT };
}
function extendIQ(fields) {
    return { element: 'iq', fields, namespace: Namespaces_1.NS_CLIENT };
}
function extendStreamFeatures(fields) {
    return {
        element: 'features',
        fields,
        namespace: Namespaces_1.NS_STREAM
    };
}
function extendStanzaError(fields) {
    return {
        element: 'error',
        fields,
        namespace: Namespaces_1.NS_STANZAS,
        path: 'stanzaError'
    };
}
function pubsubItemContentAliases() {
    return [
        { path: 'pubsubcontent', contextField: 'itemType' },
        { path: 'pubsubitem.content', contextField: 'itemType' },
        { path: 'pubsubeventitem.content', contextField: 'itemType' },
        { path: 'iq.pubsub.publish.items', contextField: 'itemType' }
    ];
}
