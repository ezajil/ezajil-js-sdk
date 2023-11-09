import APIError from '../APIError';

// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
export function httpGet(url, authToken, queryParams = {}) {
    let apiUrl = url;

    // Add query parameters to the URL if provided
    if (Object.keys(queryParams).length > 0) {
        const queryString = Object.keys(queryParams)
            .filter(key => !!queryParams[key]) // Not null or undefined
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');
        apiUrl += `?${queryString}`;
    }
    var myHeaders = new Headers();
    myHeaders.append('x-auth-user', 'Bearer ' + authToken);
    var options = {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors',
        cache: 'default'
    };
    return callAPI(apiUrl, options);
}

export function httpPost(url, authToken, body, queryParams = {}) {
    let apiUrl = url;
    // Add query parameters to the URL if provided
    if (Object.keys(queryParams).length > 0) {
        const queryString = Object.keys(queryParams)
            .filter(key => !!queryParams[key]) // Not null or undefined
            .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
            .join('&');
        apiUrl += `?${queryString}`;
    }
    var myHeaders = new Headers();
    myHeaders.append('x-auth-user', 'Bearer ' + authToken);
    myHeaders.append('Content-Type', 'application/json');
    var options = {
        method: 'POST',
        headers: myHeaders,
        mode: 'cors',
        body: body
    };
    return callAPI(apiUrl, options);
}

export function uploadFile(url, authToken, body) {
    var myHeaders = new Headers();
    myHeaders.append('x-auth-user', 'Bearer ' + authToken);
    var options = {
        method: 'POST',
        headers: myHeaders,
        mode: 'cors',
        body: body
    };
    return callAPI(url, options);
}

function callAPI(url, options) {
    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                return handleFetchError(response);
            }
            return response;
        });
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