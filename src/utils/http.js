import APIError from '../APIError';
import { generateUID } from './util';

// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
export function httpGet(url, apiKey, authSupplier, queryParams = {}) {
    let apiUrl = url;

    // Add query parameters to the URL if provided
    if (Object.keys(queryParams).length > 0) {
        const queryString = Object.keys(queryParams)
            .filter(key => !!queryParams[key]) // Not null or undefined
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');
        apiUrl += `?${queryString}`;
    }
    var options = {
        method: 'GET',
        headers: new Headers(),
        mode: 'cors',
        cache: 'default'
    };
    return callAPI(apiUrl, apiKey, authSupplier, options);
}

export function httpPost(url, apiKey, authSupplier, body, queryParams = {}) {
    let apiUrl = url;
    // Add query parameters to the URL if provided
    if (Object.keys(queryParams).length > 0) {
        const queryString = Object.keys(queryParams)
            .filter(key => !!queryParams[key]) // Not null or undefined
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');
        apiUrl += `?${queryString}`;
    }
    var headers = new Headers();
    headers.append('Content-Type', 'application/json');
    var options = {
        method: 'POST',
        headers: headers,
        mode: 'cors',
        body: body
    };
    return callAPI(apiUrl, apiKey, authSupplier, options);
}

export function uploadFile(apiUrl, apiKey, authSupplier, body) {
    var options = {
        method: 'POST',
        headers: new Headers(),
        mode: 'cors',
        body: body
    };
    return callAPI(apiUrl, apiKey, authSupplier, options);
}

function callAPI(url, apiKey, authSupplier, options, forceTokenRefresh = false) {
    options.headers.append('uid', generateUID());
    options.headers.append('api-key', apiKey);
    if (authSupplier) {
        return authSupplier(forceTokenRefresh).then(accessToken => {
            options.headers.append('Authorization', `Bearer ${accessToken}`);
            return fetch(url, options);
        }).then(response => {
            if (!response.ok) {
                if (!forceTokenRefresh && response.status === 401) {
                    return callAPI(url, authSupplier, options, true);
                }
                return handleFetchError(response);
            }
            return response;
        });
    } else {
        return fetch(url, options).then(response => {
            if (!response.ok) {
                return handleFetchError(response);
            }
            return response;
        });
    }
}

function handleFetchError(response) {
    return response.text().then((text) => {
        let message;
        let details;
        if (response.status === 400) {
            try {
                const data = JSON.parse(text);
                message = buildBadRequestErrorMessage(data);
                details = data.invalidParameters;
            } catch (error) {
                message = text;
            }
        } else if (response.status === 500) {
            message = "An unexpected error has occurred. Our team has been alerted, and we are actively working to resolve it shortly";
        } else if (response.status === 401 || response.status === 403) {
            message = "Unauthorized";
        }

        throw new APIError(response.status, message, details);
    });
}

function buildBadRequestErrorMessage(payload) {
    const title = payload.title;
    const invalidParameters = payload["invalid-parameters"] || [];

    let errorMessage = invalidParameters.length > 0 ?
        invalidParameters.map(param => {
            const propertyName = param.property;
            const reason = param.reason;
            const value = param.value;
            return `Invalid value '${value}' for parameter '${propertyName}': ${reason}`;
        }).join('\n') : title;

    return errorMessage;
}