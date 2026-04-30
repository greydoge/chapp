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
Object.defineProperty(exports, "__esModule", { value: true });
const EntityCaps = __importStar(require("./LegacyEntityCapabilities"));
class Disco {
    features;
    identities;
    extensions;
    items;
    caps;
    capsAlgorithms = ['sha-1'];
    constructor() {
        this.features = new Map();
        this.identities = new Map();
        this.extensions = new Map();
        this.items = new Map();
        this.caps = new Map();
        this.features.set('', new Set());
        this.identities.set('', []);
        this.extensions.set('', []);
    }
    getNodeInfo(node) {
        return {
            extensions: [...(this.extensions.get(node) || [])],
            features: [...(this.features.get(node) || [])],
            identities: [...(this.identities.get(node) || [])]
        };
    }
    addFeature(feature, node = '') {
        if (!this.features.has(node)) {
            this.features.set(node, new Set());
        }
        this.features.get(node).add(feature);
    }
    addIdentity(identity, node = '') {
        if (!this.identities.has(node)) {
            this.identities.set(node, []);
        }
        this.identities.get(node).push(identity);
    }
    addItem(item, node = '') {
        if (!this.items.has(node)) {
            this.items.set(node, []);
        }
        this.items.get(node).push(item);
    }
    addExtension(form, node = '') {
        if (!this.extensions.has(node)) {
            this.extensions.set(node, []);
        }
        this.extensions.get(node).push(form);
    }
    updateCaps(node, algorithms = this.capsAlgorithms) {
        const info = {
            extensions: [...this.extensions.get('')],
            features: [...this.features.get('')],
            identities: [...this.identities.get('')],
            type: 'info'
        };
        for (const algorithm of algorithms) {
            const version = EntityCaps.generate(info, algorithm);
            if (!version) {
                this.caps.delete(algorithm);
                continue;
            }
            this.caps.set(algorithm, {
                algorithm,
                node,
                value: version
            });
            const hashedNode = `${node}#${version}`;
            for (const feature of info.features) {
                this.addFeature(feature, hashedNode);
            }
            for (const identity of info.identities) {
                this.addIdentity(identity, hashedNode);
            }
            for (const form of info.extensions) {
                this.addExtension(form, hashedNode);
            }
            this.identities.set(hashedNode, info.identities);
            this.features.set(hashedNode, new Set(info.features));
            this.extensions.set(hashedNode, info.extensions);
        }
        return [...this.caps.values()];
    }
    getCaps() {
        return [...this.caps.values()];
    }
}
exports.default = Disco;
