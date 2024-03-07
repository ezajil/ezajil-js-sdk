import { sdkConfig } from './sdkConfig.js';

export function log(message) {
    if (sdkConfig.enableLogging) {
        console.log(message);
    }
}

export function logError(message) {
    if (sdkConfig.enableLogging) {
        console.error(message);
    }
}