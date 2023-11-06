import CryptoJS from 'crypto-js';
import { log } from './sdkLogger';

export function generateSignedToken(data, secretKey) {
    var header = {
        "alg": "HS256",
        "typ": "JWT"
    };

    var stringifiedHeader = CryptoJS.enc.Utf8.parse(JSON.stringify(header));
    var encodedHeader = base64url(stringifiedHeader);

    var stringifiedData = CryptoJS.enc.Utf8.parse(JSON.stringify(data));
    var encodedData = base64url(stringifiedData);

    var token = encodedHeader + "." + encodedData;

    var signature = CryptoJS.HmacSHA256(token, secretKey);
    signature = base64url(signature);
    return token + "." + signature;
}

function base64url(source) {
    // Encode in classical base64
    let encodedSource = CryptoJS.enc.Base64.stringify(source);

    // Remove padding equal characters
    encodedSource = encodedSource.replace(/=+$/, '');

    // Replace characters according to base64url specifications
    encodedSource = encodedSource.replace(/\+/g, '-');
    encodedSource = encodedSource.replace(/\//g, '_');

    return encodedSource;
}