import { JID } from '../JID';
import { DefinitionOptions } from '../jxt';
import { NS_VCARD_TEMP } from '../Namespaces';
import { Buffer } from '../platform';
declare module './' {
    interface IQPayload {
        vcard?: VCardTemp;
    }
}
export interface VCardTemp {
    format?: typeof NS_VCARD_TEMP;
    fullName?: string;
    name?: VCardTempName;
    records?: VCardTempRecord[];
}
export interface VCardTempName {
    family?: string;
    given?: string;
    middle?: string;
    prefix?: string;
    suffix?: string;
}
export interface VCardTempPhoto {
    type: 'photo';
    data?: Buffer;
    mediaType?: string;
    url?: string;
}
export interface VCardTempLogo {
    type: 'photo';
    data?: Buffer;
    mediaType?: string;
    url?: string;
}
type VCardTempAddressType = 'home' | 'work' | 'domestic' | 'international' | 'postal' | 'parcel';
export interface VCardTempAddress {
    type: 'address';
    city?: string;
    code?: string;
    country?: string;
    pobox?: string;
    preferred?: boolean;
    region?: string;
    street?: string;
    street2?: string;
    types?: VCardTempAddressType[];
}
type VCardTempAddressLabelType = 'home' | 'work';
export interface VCardTempAddressLabel {
    type: 'addressLabel';
    lines?: string;
    preferred?: boolean;
    types?: VCardTempAddressLabelType[];
}
type VCardTempPhoneType = 'home' | 'work' | 'cell' | 'fax' | 'voice' | 'msg';
export interface VCardTempPhone {
    type: 'tel';
    value?: string;
    preferred?: boolean;
    types?: VCardTempPhoneType[];
}
type VCardTempEmailType = 'home' | 'internet' | 'work';
export interface VCardTempEmail {
    type: 'email';
    value?: string;
    preferred?: boolean;
    types?: VCardTempEmailType[];
}
export interface VCardTempJID {
    type: 'jid';
    jid?: JID;
}
export interface VCardTempCategories {
    type: 'categories';
    value: string[];
}
type VCardFieldType = 'nickname' | 'birthday' | 'jid' | 'url' | 'title' | 'role' | 'description' | 'sort' | 'revision' | 'uid' | 'productId' | 'note' | 'timezone';
export interface VCardTempField {
    type: VCardFieldType;
    value: string;
}
export interface VCardTempOrg {
    type: 'organization';
    value?: string;
    units?: string[];
}
export type VCardTempRecord = VCardTempPhoto | VCardTempAddress | VCardTempAddressLabel | VCardTempPhone | VCardTempEmail | VCardTempOrg | VCardTempLogo | VCardTempCategories | VCardTempField;
declare const Protocol: DefinitionOptions[];
export default Protocol;
