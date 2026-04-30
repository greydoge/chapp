"use strict";
/**
 * This file is derived from prior work.
 *
 * See NOTICE.md for full license text.
 *
 * Derived from: ltx, Copyright © 2010 Stephan Maka
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
// tslint:disable cognitive-complexity max-switch-cases
const events_1 = require("events");
const Definitions_1 = require("./Definitions");
const Element_1 = __importDefault(require("./Element"));
const Error_1 = __importDefault(require("./Error"));
function isBasicNameStart(c) {
    return ((97 /* Character.a */ <= c && c <= 122 /* Character.z */) ||
        (65 /* Character.A */ <= c && c <= 90 /* Character.Z */) ||
        c === 58 /* Character.Colon */ ||
        c === 95 /* Character.Underscore */);
}
function isExtendedNameStart(c) {
    return ((0xc0 <= c && c <= 0xd6) ||
        (0xd8 <= c && c <= 0xf6) ||
        (0xf8 <= c && c <= 0x2ff) ||
        (0x370 <= c && c <= 0x37d) ||
        (0x37f <= c && c <= 0x1fff) ||
        (0x200c <= c && c <= 0x200d) ||
        (0x2070 <= c && c <= 0x218f) ||
        (0x2c00 <= c && c <= 0x2fef) ||
        (0x3001 <= c && c <= 0xd7ff) ||
        (0xfdf0 <= c && c <= 0xfffd) ||
        (0x10000 <= c && c <= 0xeffff));
}
function isNameStart(c) {
    return isBasicNameStart(c) || isExtendedNameStart(c);
}
function isName(c) {
    return (isBasicNameStart(c) ||
        c === 45 /* Character.Dash */ ||
        c === 46 /* Character.Period */ ||
        (48 /* Character.Zero */ <= c && c <= 57 /* Character.Nine */) ||
        c === 0xb7 ||
        (0x0300 <= c && c <= 0x036f) ||
        (0x203f <= c && c <= 0x2040) ||
        isExtendedNameStart(c));
}
function isWhitespace(c) {
    return (c === 32 /* Character.Space */ ||
        c === 10 /* Character.NewLine */ ||
        c === 13 /* Character.CarriageReturn */ ||
        c === 9 /* Character.Tab */);
}
class Parser extends events_1.EventEmitter {
    allowComments = true;
    attributeName;
    attributes = {};
    state = 34 /* State.TEXT */;
    tagName = '';
    haveDeclaration = false;
    recordBuffer = [];
    constructor(opts = {}) {
        super();
        if (opts.allowComments !== undefined) {
            this.allowComments = opts.allowComments;
        }
    }
    write(data) {
        for (const char of data) {
            const c = char.codePointAt(0);
            switch (this.state) {
                case 34 /* State.TEXT */: {
                    if (c === 60 /* Character.LessThan */) {
                        let text;
                        try {
                            text = (0, Definitions_1.unescapeXML)(this.endRecord());
                        }
                        catch (err) {
                            this.emit('error', err);
                            return;
                        }
                        if (text) {
                            this.emit('text', text);
                        }
                        this.transition(31 /* State.TAG_START */);
                        continue;
                    }
                    else {
                        this.record(char);
                        continue;
                    }
                }
                case 31 /* State.TAG_START */: {
                    if (c === 47 /* Character.Slash */) {
                        this.transition(7 /* State.CLOSING_TAG_START */);
                        continue;
                    }
                    if (c === 33 /* Character.Exclamation */) {
                        this.transition(24 /* State.START_INSTRUCTION */);
                        continue;
                    }
                    if (c === 63 /* Character.Question */) {
                        if (this.haveDeclaration) {
                            return this.restrictedXML();
                        }
                        this.transition(25 /* State.START_PROCESSING_INSTRUCTION */);
                        continue;
                    }
                    if (isNameStart(c)) {
                        this.transition(30 /* State.TAG_NAME */);
                        this.startRecord(char);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 30 /* State.TAG_NAME */: {
                    if (isName(c)) {
                        this.record(char);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        this.startTag();
                        this.transition(32 /* State.TAG_WAIT_NAME */);
                        continue;
                    }
                    if (c === 47 /* Character.Slash */) {
                        this.startTag();
                        this.transition(29 /* State.TAG_END_SLASH */);
                        continue;
                    }
                    if (c === 62 /* Character.GreaterThan */) {
                        this.startTag();
                        this.transition(34 /* State.TEXT */);
                        this.emit('startElement', this.tagName, this.attributes);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 29 /* State.TAG_END_SLASH */: {
                    if (c === 62 /* Character.GreaterThan */) {
                        this.emit('startElement', this.tagName, this.attributes);
                        this.emit('endElement', this.tagName);
                        this.transition(34 /* State.TEXT */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 33 /* State.TAG */: {
                    if (isWhitespace(c)) {
                        this.transition(32 /* State.TAG_WAIT_NAME */);
                        continue;
                    }
                    if (c === 47 /* Character.Slash */) {
                        this.transition(29 /* State.TAG_END_SLASH */);
                        continue;
                    }
                    if (c === 62 /* Character.GreaterThan */) {
                        this.emit('startElement', this.tagName, this.attributes);
                        this.transition(34 /* State.TEXT */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 32 /* State.TAG_WAIT_NAME */: {
                    if (isWhitespace(c)) {
                        continue;
                    }
                    if (isNameStart(c)) {
                        this.startRecord(char);
                        this.transition(0 /* State.ATTR_NAME */);
                        continue;
                    }
                    if (c === 47 /* Character.Slash */) {
                        this.transition(29 /* State.TAG_END_SLASH */);
                        continue;
                    }
                    if (c === 62 /* Character.GreaterThan */) {
                        this.emit('startElement', this.tagName, this.attributes);
                        this.transition(34 /* State.TEXT */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 7 /* State.CLOSING_TAG_START */: {
                    if (isNameStart(c)) {
                        this.startRecord(char);
                        this.transition(6 /* State.CLOSING_TAG_NAME */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 6 /* State.CLOSING_TAG_NAME */: {
                    if (isName(c)) {
                        this.record(char);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        this.transition(8 /* State.CLOSING_TAG */);
                        continue;
                    }
                    if (c === 62 /* Character.GreaterThan */) {
                        const tag = this.endRecord();
                        this.emit('endElement', tag, this.attributes);
                        this.transition(34 /* State.TEXT */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 8 /* State.CLOSING_TAG */: {
                    if (isWhitespace(c)) {
                        continue;
                    }
                    if (c === 62 /* Character.GreaterThan */) {
                        const tag = this.endRecord();
                        this.emit('endElement', tag, this.attributes);
                        this.transition(34 /* State.TEXT */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 0 /* State.ATTR_NAME */: {
                    if (isName(c)) {
                        this.record(char);
                        continue;
                    }
                    if (c === 61 /* Character.Equal */) {
                        this.addAttribute();
                        this.transition(4 /* State.ATTR_WAIT_QUOTE */);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        this.addAttribute();
                        this.transition(3 /* State.ATTR_WAIT_EQ */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 3 /* State.ATTR_WAIT_EQ */: {
                    if (c === 61 /* Character.Equal */) {
                        this.transition(4 /* State.ATTR_WAIT_QUOTE */);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 4 /* State.ATTR_WAIT_QUOTE */: {
                    if (c === 34 /* Character.DoubleQuote */) {
                        this.startRecord();
                        this.transition(1 /* State.ATTR_QUOTE_DOUBLE */);
                        continue;
                    }
                    if (c === 39 /* Character.SingleQuote */) {
                        this.startRecord();
                        this.transition(2 /* State.ATTR_QUOTE_SINGLE */);
                        continue;
                    }
                    if (isWhitespace(c)) {
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 1 /* State.ATTR_QUOTE_DOUBLE */:
                case 2 /* State.ATTR_QUOTE_SINGLE */: {
                    if ((c === 34 /* Character.DoubleQuote */ && this.state === 1 /* State.ATTR_QUOTE_DOUBLE */) ||
                        (c === 39 /* Character.SingleQuote */ && this.state === 2 /* State.ATTR_QUOTE_SINGLE */)) {
                        const value = this.endRecord();
                        this.attributes[this.attributeName] = (0, Definitions_1.unescapeXML)(value);
                        this.transition(33 /* State.TAG */);
                        continue;
                    }
                    if (c === 60 /* Character.LessThan */) {
                        return this.notWellFormed();
                    }
                    this.record(char);
                    continue;
                }
                case 24 /* State.START_INSTRUCTION */: {
                    if (c === 45 /* Character.Dash */) {
                        if (!this.allowComments) {
                            return this.restrictedXML();
                        }
                        this.transition(23 /* State.START_COMMENT_DASH */);
                        continue;
                    }
                    if (c === 91 /* Character.LeftBracket */) {
                        this.transition(21 /* State.START_CDATA_LB */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 23 /* State.START_COMMENT_DASH */: {
                    if (c === 45 /* Character.Dash */) {
                        this.transition(14 /* State.IGNORE_COMMENT */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 14 /* State.IGNORE_COMMENT */: {
                    if (c === 45 /* Character.Dash */) {
                        this.transition(12 /* State.END_COMMENT_DASH */);
                    }
                    continue;
                }
                case 12 /* State.END_COMMENT_DASH */: {
                    if (c === 45 /* Character.Dash */) {
                        this.transition(11 /* State.END_COMMENT_DASH_DASH */);
                    }
                    else {
                        this.transition(14 /* State.IGNORE_COMMENT */);
                    }
                    continue;
                }
                case 11 /* State.END_COMMENT_DASH_DASH */: {
                    if (c === 62 /* Character.GreaterThan */) {
                        this.transition(34 /* State.TEXT */);
                    }
                    else {
                        this.transition(14 /* State.IGNORE_COMMENT */);
                    }
                    continue;
                }
                case 25 /* State.START_PROCESSING_INSTRUCTION */: {
                    if (c === 88 /* Character.X */ || c === 120 /* Character.x */) {
                        this.transition(28 /* State.START_XML_DECLARATION_X */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 28 /* State.START_XML_DECLARATION_X */: {
                    if (c === 77 /* Character.M */ || c === 109 /* Character.m */) {
                        this.transition(27 /* State.START_XML_DECLARATION_X_M */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 27 /* State.START_XML_DECLARATION_X_M */: {
                    if (c === 76 /* Character.L */ || c === 108 /* Character.l */) {
                        this.transition(26 /* State.START_XML_DECLARATION_X_M_L */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 26 /* State.START_XML_DECLARATION_X_M_L */: {
                    if (isWhitespace(c)) {
                        this.haveDeclaration = true;
                        this.transition(15 /* State.IGNORE_INSTRUCTION */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 13 /* State.END_XML_DECLARATION_QM */: {
                    if (c === 62 /* Character.GreaterThan */) {
                        this.transition(34 /* State.TEXT */);
                        continue;
                    }
                    return this.notWellFormed();
                }
                case 15 /* State.IGNORE_INSTRUCTION */: {
                    if (c === 63 /* Character.Question */) {
                        this.transition(13 /* State.END_XML_DECLARATION_QM */);
                    }
                    continue;
                }
                case 21 /* State.START_CDATA_LB */: {
                    this.wait(c, 67 /* Character.C */, 20 /* State.START_CDATA_LB_C */);
                    continue;
                }
                case 20 /* State.START_CDATA_LB_C */: {
                    this.wait(c, 68 /* Character.D */, 19 /* State.START_CDATA_LB_C_D */);
                    continue;
                }
                case 19 /* State.START_CDATA_LB_C_D */: {
                    this.wait(c, 65 /* Character.A */, 18 /* State.START_CDATA_LB_C_D_A */);
                    continue;
                }
                case 18 /* State.START_CDATA_LB_C_D_A */: {
                    this.wait(c, 84 /* Character.T */, 17 /* State.START_CDATA_LB_C_D_A_T */);
                    continue;
                }
                case 17 /* State.START_CDATA_LB_C_D_A_T */: {
                    this.wait(c, 65 /* Character.A */, 16 /* State.START_CDATA_LB_C_D_A_T_A */);
                    continue;
                }
                case 16 /* State.START_CDATA_LB_C_D_A_T_A */: {
                    this.wait(c, 91 /* Character.LeftBracket */, 5 /* State.CDATA */);
                    continue;
                }
                case 5 /* State.CDATA */: {
                    if (c === 93 /* Character.RightBracket */) {
                        this.transition(10 /* State.END_CDATA_RB */);
                        continue;
                    }
                    this.record(char);
                    continue;
                }
                case 10 /* State.END_CDATA_RB */: {
                    if (c === 93 /* Character.RightBracket */) {
                        this.transition(9 /* State.END_CDATA_RB_RB */);
                    }
                    else {
                        this.record(String.fromCodePoint(93 /* Character.RightBracket */));
                        this.record(char);
                        this.transition(5 /* State.CDATA */);
                    }
                    continue;
                }
                case 9 /* State.END_CDATA_RB_RB */: {
                    if (c === 62 /* Character.GreaterThan */) {
                        const text = this.endRecord();
                        if (text) {
                            this.emit('text', text);
                        }
                        this.transition(34 /* State.TEXT */);
                    }
                    else {
                        this.record(String.fromCodePoint(93 /* Character.RightBracket */));
                        this.record(String.fromCodePoint(93 /* Character.RightBracket */));
                        this.record(char);
                        this.transition(5 /* State.CDATA */);
                    }
                    continue;
                }
            }
        }
    }
    end(data) {
        if (data) {
            this.write(data);
        }
        this.write = () => undefined;
    }
    record(char) {
        this.recordBuffer.push(char);
    }
    startRecord(char) {
        this.recordBuffer = [];
        if (char) {
            this.recordBuffer.push(char);
        }
    }
    endRecord() {
        const data = this.recordBuffer;
        this.recordBuffer = [];
        return data.join('');
    }
    startTag() {
        this.tagName = this.endRecord();
        this.attributes = {};
    }
    addAttribute() {
        const name = this.endRecord();
        if (this.attributes[name] !== undefined) {
            return this.notWellFormed();
        }
        this.attributeName = name;
        this.attributes[name] = '';
    }
    wait(c, nextChar, newState) {
        if (c === nextChar) {
            this.transition(newState);
            return;
        }
        return this.notWellFormed();
    }
    transition(state) {
        this.state = state;
        if (state === 34 /* State.TEXT */) {
            this.startRecord();
        }
    }
    notWellFormed(msg) {
        this.emit('error', Error_1.default.notWellFormed(msg));
    }
    restrictedXML(msg) {
        this.emit('error', Error_1.default.restrictedXML(msg));
    }
}
function parse(data, opts = {}) {
    const p = new Parser(opts);
    let result;
    let element;
    let error = null;
    p.on('text', (text) => {
        if (element) {
            element.children.push(text);
        }
    });
    p.on('startElement', (name, attrs) => {
        const child = new Element_1.default(name, attrs);
        if (!result) {
            result = child;
        }
        if (!element) {
            element = child;
        }
        else {
            element = element.appendChild(child);
        }
    });
    p.on('endElement', (name) => {
        if (!element) {
            p.emit('error', Error_1.default.notWellFormed('a'));
        }
        else if (name === element.name) {
            if (element.parent) {
                element = element.parent;
            }
        }
        else {
            p.emit('error', Error_1.default.notWellFormed('b'));
        }
    });
    p.on('error', (e) => {
        error = e;
    });
    p.write(data);
    p.end();
    if (error) {
        throw error;
    }
    else {
        return result;
    }
}
exports.default = Parser;
