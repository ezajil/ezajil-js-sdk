import { httpPost } from './utils/http';
import { log, logError } from './utils/sdkLogger';

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
        return httpPost(`${this.apiEndpoint}/api/users/auth`, this.apiKey, null, body)
            .then(response => {
                return response.json().then(data => {
                    log(`response data: ${JSON.stringify(data)}`);
                    return data.accessToken;
                }).catch(error => logError(`Failed to fetch access token: ${error}`));
            })
            .catch(error => logError(`Failed to fetch access token: ${error}`)); // TODO handle limitation errors
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