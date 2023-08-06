export default class User {

    constructor(userId, screenName, avatarUrl, email, metadata, lastSession, online) {
        this.userId = userId;
        this.screenName = screenName;
        this.avatarUrl = avatarUrl;
        this.email = email;
        this.metadata = metadata;
        this.lastSession = lastSession;
        this.online = online;
    }
}