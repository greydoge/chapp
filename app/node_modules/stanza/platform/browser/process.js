"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextTick = nextTick;
/* eslint-disable @typescript-eslint/ban-types */
function nextTick(callback, ...args) {
    queueMicrotask(() => callback(...args));
}
