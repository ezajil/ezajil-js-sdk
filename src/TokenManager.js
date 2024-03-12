import { httpPost } from './utils/http.js';

export default class TokenManager {

    constructor(session) {
        this.apiEndpoint = session.apiEndpoint;
        this.appCredentials = session.appCredentials;
        this.apiKey = session.apiKey;
        this.currentUser = session.currentUser;
        this.accessToken = null;
    }

    fetchAccessToken() {
        const body = JSON.stringify(this.currentUser);
        return httpPost(`${this.apiEndpoint}/api/v1/users/auth`, this.apiKey, null, body)
            .then(response => {
                return response.json().then(data => {
                    return Promise.resolve(data.accessToken);
                });
            });
    }

    get(forceTokenRefresh = false) {
        if (this.accessToken && !forceTokenRefresh) {
            return Promise.resolve(this.accessToken);
        }
        return this.fetchAccessToken().then(accessToken => {
            this.accessToken = accessToken;
            return accessToken;
        });
    }
}