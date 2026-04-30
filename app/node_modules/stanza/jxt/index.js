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
exports.XMLElement = exports.Translator = exports.Registry = exports.StreamParser = exports.parse = exports.Parser = void 0;
exports.define = define;
const Element_1 = __importDefault(require("./Element"));
exports.XMLElement = Element_1.default;
const Registry_1 = __importDefault(require("./Registry"));
exports.Registry = Registry_1.default;
const Translator_1 = __importDefault(require("./Translator"));
exports.Translator = Translator_1.default;
__exportStar(require("./Definitions"), exports);
__exportStar(require("./Types"), exports);
__exportStar(require("./Helpers"), exports);
var Parser_1 = require("./Parser");
Object.defineProperty(exports, "Parser", { enumerable: true, get: function () { return __importDefault(Parser_1).default; } });
Object.defineProperty(exports, "parse", { enumerable: true, get: function () { return Parser_1.parse; } });
var StreamParser_1 = require("./StreamParser");
Object.defineProperty(exports, "StreamParser", { enumerable: true, get: function () { return __importDefault(StreamParser_1).default; } });
function define(definitions) {
    return (registry) => {
        registry.define(definitions);
    };
}
