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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.core = core;
exports.default = default_1;
__exportStar(require("./account"), exports);
__exportStar(require("./avatar"), exports);
__exportStar(require("./bind"), exports);
__exportStar(require("./command"), exports);
__exportStar(require("./connection"), exports);
__exportStar(require("./disco"), exports);
__exportStar(require("./entity"), exports);
__exportStar(require("./features"), exports);
__exportStar(require("./hostmeta"), exports);
__exportStar(require("./jingle"), exports);
__exportStar(require("./mam"), exports);
__exportStar(require("./messaging"), exports);
__exportStar(require("./muc"), exports);
__exportStar(require("./pep"), exports);
__exportStar(require("./pubsub"), exports);
__exportStar(require("./roster"), exports);
__exportStar(require("./sasl"), exports);
__exportStar(require("./sharing"), exports);
const account_1 = __importDefault(require("./account"));
const avatar_1 = __importDefault(require("./avatar"));
const bind_1 = __importDefault(require("./bind"));
const command_1 = __importDefault(require("./command"));
const connection_1 = __importDefault(require("./connection"));
const disco_1 = __importDefault(require("./disco"));
const entity_1 = __importDefault(require("./entity"));
const features_1 = __importDefault(require("./features"));
const hostmeta_1 = __importDefault(require("./hostmeta"));
const jingle_1 = __importDefault(require("./jingle"));
const mam_1 = __importDefault(require("./mam"));
const messaging_1 = __importDefault(require("./messaging"));
const muc_1 = __importDefault(require("./muc"));
const pep_1 = __importDefault(require("./pep"));
const pubsub_1 = __importDefault(require("./pubsub"));
const roster_1 = __importDefault(require("./roster"));
const sasl_1 = __importDefault(require("./sasl"));
const sharing_1 = __importDefault(require("./sharing"));
function core(client) {
    client.use(features_1.default);
    client.use(disco_1.default);
    client.use(bind_1.default);
    client.use(connection_1.default);
    client.use(hostmeta_1.default);
    client.use(sasl_1.default);
}
function default_1(client) {
    client.use(account_1.default);
    client.use(messaging_1.default);
    client.use(avatar_1.default);
    client.use(command_1.default);
    client.use(entity_1.default);
    client.use(jingle_1.default);
    client.use(mam_1.default);
    client.use(muc_1.default);
    client.use(pep_1.default);
    client.use(pubsub_1.default);
    client.use(roster_1.default);
    client.use(sharing_1.default);
}
