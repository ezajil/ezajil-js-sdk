import { generateSignedToken } from './utils/crypto';
import { httpGet, httpPost, postData } from './utils/http';
import Transport from './Transport';
import Chatroom from './Chatroom';
import { EventEmitter } from 'events';
import User from './User';


//TODO add onReconnect
export default class Session extends EventEmitter {

    constructor(currentUser, appCredentials) {
        super();
        this.currentUser = currentUser;
        this.appCredentials = appCredentials;
        this.authToken = generateSignedToken({
            organizationId: appCredentials.organizationId,
            projectId: appCredentials.projectId,
            ...currentUser
        }, appCredentials.secretKey);
        this.transport = new Transport({ 'token': this.authToken });
        this.connect();
    }

    connect() {
        this.transport.on('open', () => {
            console.log('Connection established');
            this.emit('connected');
        });
        this.transport.on('close', (code, reason) => {
            console.log(`Connection closed: ${code} - ${reason}`);
            this.emit('disconnected', code, reason);
            this.transport.reconnect();
        });
        this.transport.on('error', (err) => {
            console.error('Connection errored', err);
            this.emit('error', err);
        });
        this.transport.on('error-message', (message) => {
            console.log(`error-message: ${JSON.stringify(message)}`);
            this.emit('error-message', message.code, message.reason, message.chatMessage);
        });
        this.transport.on('online-user', (user) => {
            console.log(`online user: ${JSON.stringify(user)}`);
            // ignore event for current user
            if (user.userId !== this.currentUser.userId) {
                this.emit('online-user', user);
            }
        });
        this.transport.on('offline-user', (user) => {
            console.log(`offline-user: ${JSON.stringify(user)}`);
            // ignore event for current user
            if (user.userId !== this.currentUser.userId) {
                this.emit('offline-user', user);
            }
        });
        this.transport.on('chat-message', (message) => {
            console.log(`chat-message: ${JSON.stringify(message)}`);
            this.emit('chat-message', message);
        });
        this.transport.on('message-sent', (message) => {
            console.log(`message-sent: ${JSON.stringify(message)}`);
            this.emit('message-sent', message);
        });
        this.transport.on('user-typing', (message) => {
            console.log(`user-typing: ${JSON.stringify(message)}`);
            this.emit('user-typing', message);
        });
        this.transport.on('messages-delivered', (message) => {
            console.log(`messages-delivered: ${JSON.stringify(message)}`);
            this.emit('messages-delivered', message);
        });
        this.transport.on('messages-read', (message) => {
            console.log(`messages-read: ${JSON.stringify(message)}`);
            this.emit('messages-read', message);
        });
    }

    isOpen() {
        return !!this.transport && this.transport.isOpen();
    }

    createSingleChatroom(participantId, metadata, callback) {
        const body = JSON.stringify({ "participantId": participantId, "metadata": metadata });
        httpPost(`${process.env.API_URL}/api/chatroom/single`, this.authToken, body)
            .then(response => {
                response.json().then(data => {
                    const chatroom = new Chatroom(this.transport, this.authToken, data.chatroomId, this.currentUser, participantId, data.latestMessage,
                        data.creationDate, data.creatorId, data.single, data.users, data.metadata);
                    callback(chatroom, null);
            });
        })
        .catch(err => callback(null, err));
    }

    createGroupChatroom(name, participantIds, metadata, callback) {
        const body = JSON.stringify({ "name": name, "participantIds": participantIds, "metadata": metadata });
        httpPost(`${process.env.API_URL}/api/chatroom/group`, this.authToken, body)
            .then(response => {
                response.json().then(data => {
                    const chatroom = new Chatroom(this.transport, this.authToken, data.chatroomId, this.currentUser, data.name, data.latestMessage,
                        data.creationDate, data.creatorId, data.single, data.users, data.metadata, null);
                    callback(chatroom, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getChatroom(chatroomId, callback) {
        httpGet(`${process.env.API_URL}/api/chatroom?chatroomId=${chatroomId}`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    const chatroom = new Chatroom(this.transport, this.authToken, data.chatroomId, this.currentUser, data.name, data.latestMessage,
                        data.creationDate, data.creatorId, data.single, data.users, data.metadata, null);
                    callback(chatroom, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getChatroomsOfUser(callback) {
        httpGet(`${process.env.API_URL}/api/chatroom/latest`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    const chatrooms = data.results.map(result => {
                        if (result.single) {
                            return new Chatroom(this.transport, this.authToken, result.chatroomId, this.currentUser, result.users[0], result.latestMessage,
                                result.creationDate, result.creatorId, result.single, result.users, result.metadata, result.lastJoined);
                        }
                        return new Chatroom(this.transport, this.authToken, result.chatroomId, this.currentUser, result.name, result.latestMessage,
                            result.creationDate, result.creatorId, result.single, result.users, result.metadata, result.lastJoined);
                    });
                    callback(chatrooms, null);
                });
            })
            .catch(err => callback(null, err));
    }


    getSingleChatroomsOfUser(callback) {
        httpGet(`${process.env.API_URL}/api/chatroom/latest/single`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    const chatrooms = data.results.map(result => {
                        return new Chatroom(this.transport, this.authToken, result.chatroomId, this.currentUser,
                            this.getName(result), result.latestMessage, result.creationDate, result.creatorId, 
                            result.single, result.users, result.metadata, result.lastJoined);
                    });
                    callback(chatrooms, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getName(chatroom) {
        if (chatroom.users.length === 1) {
            return chatroom.users[1];
        }
        return this.currentUser.userId === chatroom.users[1] ? chatroom.users[0] : chatroom.users[1];
    }

    getGroupChatroomsOfUser(callback) {
        httpGet(`${process.env.API_URL}/api/chatroom/latest/group`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    const chatrooms = data.results.map(result => {
                        return new Chatroom(this.transport, this.authToken, result.chatroomId, this.currentUser, result.name, result.latestMessage,
                            result.creationDate, result.creatorId, result.single, result.users, result.metadata, result.lastJoined);
                    });
                    callback(chatrooms, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getChatroomUsers(chatroomId, callback) {
        httpGet(`${process.env.API_URL}/api/chatroom/users/${chatroomId}`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result =>
                        new User(result.organizationId, result.projectId, result.userId, result.screenName, result.avatar, result.email, result.lastSession, result.online));
                    callback(users, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getUsers(userIds, callback) {
        const body = JSON.stringify({ "userIds": userIds });
        httpPost(`${process.env.API_URL}/api/user/list`, this.authToken, body)
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result =>
                        new User(result.organizationId, result.projectId, result.userId, result.screenName, result.avatar, result.email, result.lastSession, result.online));
                    callback(users, null);
                });
            })
            .catch(err => callback(null, err));
    }

    subscribeToUsersPresence(userIds, callback) {
        const body = JSON.stringify({ "userIds": userIds });
        httpPost(`${process.env.API_URL}/api/user/subscribe-users-status`, this.authToken, body)
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result =>
                        new User(result.organizationId, result.projectId, result.userId, result.screenName, result.avatar, result.email, result.lastSession, result.online));
                    callback(users, null);
                });
            })

            .catch(err => callback(null, err));
    }

    unsubscribeFromUsersPresence(userIds, callback) {
        const body = JSON.stringify({ "userIds": userIds });
        httpPost(`${process.env.API_URL}/api/user/unsubscribe-users-status`, this.authToken, body)
            .then(response => {
                callback(response, null);
            })
            .catch(err => callback(null, err));
    }

    unsubscribeFromAllUsersPresence(callback) {
        const body = JSON.stringify({});
        httpPost(`${process.env.API_URL}/api/user/unsubscribe-all-users-status`, this.authToken, body)
            .then(response => {
                callback(response, null);
            })
            .catch(err => callback(null, err));
    }

    fireUserTyping(chatroomId) {
        this.transport.send({
            event: 'user-typing', payload: {
                organizationId: this.currentUser.organizationId, projectId: this.currentUser.projectId,
                chatroomId: chatroomId, userId: this.currentUser.userId
            }
        });
    }

    markMessageAsDelivered(message) {
        this.transport.send({
            event: 'messages-delivered', payload: {
                organizationId: this.currentUser.organizationId, projectId: this.currentUser.projectId,
                chatroomId: message.chatroomId, latestMessageDelivered: message.sendingDate
            }
        });
    }

    markMessageAsRead(chatroomId, latestMessage) {
        this.transport.send({
            event: 'messages-read', payload: {
                organizationId: this.currentUser.organizationId, projectId: this.currentUser.projectId,
                chatroomId: chatroomId, latestMessageRead: latestMessage
            }
        });
    }
}