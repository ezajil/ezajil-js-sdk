import APIError from './APIError.js';
import { httpPost } from './utils/http.js';

export default class TokenManager {

    constructor() {
        this.accessToken = null;
        this.fetchTokenCallback = null;
    }

    setToken(accessToken) {
        this.accessToken = accessToken;
    }

    setFetchTokenCallback(callback) {
        this.fetchTokenCallback = callback;
    }

    get(forceTokenRefresh = false) {
        if (this.accessToken && !forceTokenRefresh) {
            return Promise.resolve(this.accessToken);
        }
        if (!this.fetchTokenCallback) {
            return Promise.reject(new APIError(401, "Authorization failed: make sure to define a valid token or a correct callback"));
        }
        return this.fetchTokenCallback().then(accessToken => {
            if (!accessToken) {
                // Handle the case where the callback does not return an access token
                throw new APIError(401, "Authorization failed: the token callback did not return a valid token");
            }
            this.accessToken = accessToken;
            return accessToken;
        }).catch(error => {
            throw error instanceof APIError ? error : new APIError(error.status, `Error fetching token: ${error.message}`);
        });
    }
}