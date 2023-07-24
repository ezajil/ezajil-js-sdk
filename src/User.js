export default class User {

    constructor(organizationId, projectId, userId, screenName, avatarUrl, email, lastSession, online) {
        this.organizationId = organizationId;
        this.projectId = projectId;
        this.userId = userId;
        this.screenName = screenName;
        this.avatarUrl = avatarUrl;
        this.email = email;
        this.lastSession = lastSession;
        this.online = online;
    }

    static currentUser(organizationId, projectId, userId, screenName, avatarUrl, email) {
        return new User(organizationId, projectId, userId, screenName, avatarUrl, email);
    }
}