import { DefinitionOptions } from '../jxt';
declare module './' {
    interface Presence {
        occupantId?: string;
    }
    interface Message {
        occupantId?: string;
    }
}
declare const Protocol: DefinitionOptions[];
export default Protocol;
