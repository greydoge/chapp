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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = exports.Platform = exports.SASL = exports.RTT = exports.RSM = exports.Utils = exports.Jingle = exports.Stanzas = exports.Namespaces = exports.JID = exports.JXT = exports.DataForms = exports.Constants = exports.Client = void 0;
exports.createClient = createClient;
const Client_1 = __importDefault(require("./Client"));
exports.Client = Client_1.default;
const Constants = __importStar(require("./Constants"));
exports.Constants = Constants;
const RTT = __importStar(require("./helpers/RTT"));
exports.RTT = RTT;
const JID = __importStar(require("./JID"));
exports.JID = JID;
const Jingle = __importStar(require("./jingle"));
exports.Jingle = Jingle;
const JXT = __importStar(require("./jxt"));
exports.JXT = JXT;
const LibSASL = __importStar(require("./lib/sasl"));
exports.SASL = LibSASL;
const Namespaces = __importStar(require("./Namespaces"));
exports.Namespaces = Namespaces;
const Stanzas = __importStar(require("./protocol"));
exports.Stanzas = Stanzas;
const Utils = __importStar(require("./Utils"));
exports.Utils = Utils;
const Platform = __importStar(require("./platform"));
exports.Platform = Platform;
__exportStar(require("./helpers/StreamManagement"), exports);
const RSM = __importStar(require("./helpers/RSM"));
exports.RSM = RSM;
const DataForms = __importStar(require("./helpers/DataForms"));
exports.DataForms = DataForms;
exports.VERSION = Constants.VERSION;
const plugins_1 = __importDefault(require("./plugins"));
__exportStar(require("./plugins"), exports);
function createClient(opts) {
    const client = new Client_1.default(opts);
    client.use(plugins_1.default);
    return client;
}
