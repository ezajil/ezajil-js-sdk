import APIError from '../APIError';
import { log, logError } from './sdkLogger';

// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
export function httpGet(url, authSupplier, queryParams = {}) {
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
    return callAPI(apiUrl, options, authSupplier);
}

export function httpPost(url, authSupplier, body, queryParams = {}) {
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
    return callAPI(apiUrl, options, authSupplier);
}

export function uploadFile(url, authSupplier, body) {
    var options = {
        method: 'POST',
        headers: new Headers(),
        mode: 'cors',
        body: body
    };
    return callAPI(url, options, authSupplier);
}

function callAPI(url, options, authSupplier, forceTokenRefresh = false) {
    if (authSupplier) {
        return authSupplier(forceTokenRefresh).then(accessToken => {
            options.headers.append('Authorization', `Bearer ${accessToken}`);
            return fetch(url, options);
        }).then(response => {
            if (!response.ok) {
                if (!forceTokenRefresh && response.status === 401) {
                    return callAPI(url, options, authSupplier, true);
                }
                return handleFetchError(response);
            }
            return response;
        });
    } else {
        return fetch(url, options).then(response => {
            log(`OK? ${response.ok}`);
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
        try {
            const data = JSON.parse(text);

            if (response.status === 400) {
                message = data.title;
                details = data.invalidParameters;
            } else if (response.status === 500) {
                message = "An unexpected error has occurred. Our team has been alerted, and we are actively working to resolve it shortly.";
            } else if (response.status === 401 || response.status === 403) {
                message = "Unauthorized or Forbidden. Please log in or check your permissions.";
            }
        } catch (error) {
            // If the response isn't valid JSON, handle it accordingly
            message = `Unexpected error: ${response.status}`;
            details = text;
        }
        throw new APIError(response.status, message, details);
    });
}