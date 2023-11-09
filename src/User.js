export default class User {

    constructor(userId, screenName, avatarUrl, email, metadata, lastSeen, online) {
        this.userId = userId;
        this.screenName = screenName;
        this.avatarUrl = avatarUrl;
        this.email = email;
        this.metadata = metadata;
        this.lastSeen = lastSeen;
        this.online = online;
    }
}