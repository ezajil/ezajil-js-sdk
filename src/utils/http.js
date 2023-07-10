// https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
export function httpGet(url, authToken) {
    var myHeaders = new Headers();
    myHeaders.append('x-auth-user', 'Bearer ' + authToken);
    var options = {
        method: 'GET',
        headers: myHeaders,
        mode: 'cors',
        cache: 'default'
    };
    return fetch(url, options);
}

export function httpPost(url, authToken, body) {
    var myHeaders = new Headers();
    myHeaders.append('x-auth-user', 'Bearer ' + authToken);
    myHeaders.append('Content-Type', 'application/json');
    var options = {
        method: 'POST',
        headers: myHeaders,
        mode: 'cors',
        body: body
    };
    return fetch(url, options);
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