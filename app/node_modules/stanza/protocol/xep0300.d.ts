import { DefinitionOptions } from '../jxt';
import { Buffer } from '../platform';
export interface Hash {
    version?: '2' | '1';
    algorithm?: string;
    value?: Buffer;
}
export interface HashUsed {
    version?: '2';
    algorithm: string;
}
declare const Protocol: DefinitionOptions[];
export default Protocol;
