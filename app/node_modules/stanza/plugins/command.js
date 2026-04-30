"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const Namespaces_1 = require("../Namespaces");
function default_1(client) {
    client.disco.addFeature(Namespaces_1.NS_ADHOC_COMMANDS);
    client.disco.addItem({
        name: 'Ad-Hoc Commands',
        node: Namespaces_1.NS_ADHOC_COMMANDS
    });
    client.getCommands = (jid) => {
        return client.getDiscoItems(jid, Namespaces_1.NS_ADHOC_COMMANDS);
    };
}
