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
    return fetch(apiUrl, options);
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
    return fetch(apiUrl, options);
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
    return fetch(url, options);
}