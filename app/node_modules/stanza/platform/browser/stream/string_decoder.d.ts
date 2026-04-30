export function StringDecoder(encoding: any): void;
export class StringDecoder {
    constructor(encoding: any);
    encoding: any;
    text: typeof utf16Text | typeof base64Text;
    end: typeof utf16End | typeof base64End | typeof simpleEnd;
    fillLast: typeof utf8FillLast | undefined;
    write: typeof simpleWrite | undefined;
    lastNeed: number | undefined;
    lastTotal: number | undefined;
    lastChar: Buffer | undefined;
}
declare function utf16Text(buf: any, i: any): any;
declare class utf16Text {
    constructor(buf: any, i: any);
    lastNeed: number | undefined;
    lastTotal: number | undefined;
}
declare function base64Text(buf: any, i: any): any;
declare class base64Text {
    constructor(buf: any, i: any);
    lastNeed: number | undefined;
    lastTotal: number | undefined;
}
declare function utf16End(buf: any): any;
declare function base64End(buf: any): any;
declare function simpleEnd(buf: any): any;
declare function utf8FillLast(buf: any): any;
declare function simpleWrite(buf: any): any;
import Buffer_1 = require("../buffer");
import Buffer = Buffer_1.Buffer;
export {};
