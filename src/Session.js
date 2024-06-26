import { httpGet, httpPost } from './utils/http.js';
import Transport from './Transport.js';
import Chatroom from './Chatroom.js';
import { EventEmitter } from 'events';
import User from './User.js';
import { sdkConfig } from './utils/sdkConfig.js';
import { log } from './utils/sdkLogger.js';
import TokenManager from './TokenManager.js';
import PageResult from './PageResult.js';

export default class Session extends EventEmitter {

    constructor(endpoint, currentUser, config = {}) {
        super();
        sdkConfig.enableLogging = config.enableLogging || false;
        endpoint = this._removeProtocol(endpoint);
        const isSsl = !endpoint.startsWith('localhost') && !endpoint.startsWith('127.0.0.1');
        this.apiEndpoint = isSsl ? 'https://' + endpoint : 'http://' + endpoint;
        this.wsEndpoint = isSsl ? 'wss://' + endpoint + '/chat/v1' : 'ws://' + endpoint + '/chat/v1';
        this.currentUser = currentUser;
        this.tokenManager = new TokenManager();
        this.transport = new Transport(this);
    }

    setToken(accessToken) {
        this.tokenManager.setToken(accessToken);
    }

    setFetchTokenCallback(callback) {
        if (typeof callback === "function") {
            this.tokenManager.setFetchTokenCallback(callback);
        } else {
            throw new Error("Callback must be a function.");
        }
    }

    _removeProtocol(url) {
        return url.replace(/^[a-zA-Z]+:\/\//, '');
    }

    connect() {
        this._bindTransportEvents();
        this.transport.connect();
    }

    close() {
        this.transport.close();
    }

    _bindTransportEvents() {
        this.transport.on('open', () => {
            log('Connection opened');
        });
        this.transport.on('ready', () => {
            log('Connection ready');
            this.emit('connected');
        });
        this.transport.on('close', (code, reason, isClientError) => {
            log(`Connection closed: ${reason} (code: ${code} - Client error: ${isClientError})`);
            this.emit('disconnected', code, reason, isClientError);
        });
        this.transport.on('error', (event) => {
            this.emit('error', event);
        });
        this.transport.on('online-user', (user) => {
            log(`online user: ${JSON.stringify(user)}`);
            // ignore event for current user
            if (user.userId !== this.currentUser.userId) {
                this.emit('online-user', user);
            }
        });
        this.transport.on('offline-user', (user) => {
            log(`offline-user: ${JSON.stringify(user)}`);
            // ignore event for current user
            if (user.userId !== this.currentUser.userId) {
                this.emit('offline-user', user);
            }
        });
        this.transport.on('chat-message', (message) => {
            log(`chat-message: ${JSON.stringify(message)}`);
            this.emit('chat-message', message);
        });
        this.transport.on('message-sent', (message) => {
            log(`message-sent: ${JSON.stringify(message)}`);
            this.emit('message-sent', message);
        });
        this.transport.on('user-typing', (message) => {
            log(`user-typing: ${JSON.stringify(message)}`);
            this.emit('user-typing', message);
        });
        this.transport.on('messages-delivered', (message) => {
            log(`messages-delivered: ${JSON.stringify(message)}`);
            this.emit('messages-delivered', message);
        });
        this.transport.on('messages-read', (message) => {
            log(`messages-read: ${JSON.stringify(message)}`);
            this.emit('messages-read', message);
        });
    }

    isOpen() {
        return this.transport.isOpen();
    }

    createSingleChatroom(name, participantId, metadata) {
        const body = JSON.stringify({ 'name': name, 'participantId': participantId, 'metadata': metadata });
        return httpPost(`${this.apiEndpoint}/api/v1/chatrooms/single`, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => response.json())
            .then(data => {
                return new Chatroom(this, data.chatroomId, data.name, data.latestMessage,
                    data.creationDate, data.creatorId, data.single, data.users, data.metadata);
            })
            .catch(err => {
                throw err;
            });
    }

    createGroupChatroom(name, participantIds, metadata) {
        const body = JSON.stringify({ 'name': name, 'participantIds': participantIds, 'metadata': metadata });
        return httpPost(`${this.apiEndpoint}/api/v1/chatrooms/group`, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => response.json())
            .then(data => {
                return new Chatroom(this, data.chatroomId, data.name,
                    data.latestMessage, data.creationDate, data.creatorId,
                    data.single, data.users, data.metadata, null);
            })
            .catch(err => {
                throw err;
            });
    }

    getChatroom(chatroomId) {
        return httpGet(`${this.apiEndpoint}/api/v1/chatrooms/${chatroomId}`, (refresh) => this.tokenManager.get(refresh))
            .then(response => response.json())
            .then(data => {
                return new Chatroom(this, data.chatroomId, data.name,
                    data.latestMessage, data.creationDate, data.creatorId, data.single,
                    data.users, data.metadata, null);
            })
            .catch(err => {
                throw err;
            });
    }

    getChatroomsOfUser(pagingState = null, limit = null) {
        return httpGet(`${this.apiEndpoint}/api/v1/chatrooms/latest`, (refresh) => this.tokenManager.get(refresh), { pagingState: pagingState, limit: limit })
            .then(response => response.json())
            .then(data => {
                const chatrooms = data.results.map(result => {
                    if (result.single) {
                        return new Chatroom(this, result.chatroomId, result.users[0],
                            result.latestMessage, result.creationDate, result.creatorId,
                            result.single, result.users, result.metadata, result.lastJoined);
                    }
                    return new Chatroom(this, result.chatroomId, result.name, result.latestMessage,
                        result.creationDate, result.creatorId, result.single, result.users,
                        result.metadata, result.lastJoined);
                });
                return new PageResult(chatrooms, data.pagingState, data.totalResults);
            })
            .catch(err => {
                throw err;
            });
    }


    getSingleChatroomsOfUser(pagingState = null, limit = null) {
        return httpGet(`${this.apiEndpoint}/api/v1/chatrooms/latest/single`, (refresh) => this.tokenManager.get(refresh), { pagingState: pagingState, limit: limit })
            .then(response => response.json())
            .then(data => {
                const chatrooms = data.results.map(result => {
                    return new Chatroom(this, result.chatroomId, result.name, result.latestMessage,
                        result.creationDate, result.creatorId, result.single, result.users,
                        result.metadata, result.lastJoined);
                });
                return new PageResult(chatrooms, data.pagingState, data.totalResults);
            })
            .catch(err => {
                throw err;
            });
    }

    getGroupChatroomsOfUser(pagingState = null, limit = null) {
        return httpGet(`${this.apiEndpoint}/api/v1/chatrooms/latest/group`, (refresh) => this.tokenManager.get(refresh), { pagingState: pagingState, limit: limit })
            .then(response => response.json())
            .then(data => {
                const chatrooms = data.results.map(result => {
                    return new Chatroom(this, result.chatroomId, result.name,
                        result.latestMessage, result.creationDate, result.creatorId,
                        result.single, result.users, result.metadata, result.lastJoined);
                });
                return new PageResult(chatrooms, data.pagingState, data.totalResults, null);
            })
            .catch(err => {
                throw err;
            });
    }

    getChatroomUsers(chatroomId) {
        return httpGet(`${this.apiEndpoint}/api/v1/chatrooms/${chatroomId}/users`, (refresh) => this.tokenManager.get(refresh))
            .then(response => response.json())
            .then(data => {
                return data.map(result =>
                    new User(result.userId, result.screenName, result.avatar, result.email, result.metadata,
                        result.lastSeen, result.online));
            })
            .catch(err => {
                throw err;
            });
    }

    getUsers(userIds) {
        const body = JSON.stringify({ 'userIds': userIds });
        return httpPost(`${this.apiEndpoint}/api/v1/users/list`, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => response.json())
            .then(data => {
                return data.map(result =>
                    new User(result.userId, result.screenName, result.avatar, result.email, result.metadata,
                        result.lastSeen, result.online));
            })
            .catch(err => {
                throw err;
            });
    }

    subscribeToUsersPresence(userIds) {
        const body = JSON.stringify({ 'userIds': userIds });
        return httpPost(`${this.apiEndpoint}/api/v1/users/subscribe`, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => response.json())
            .then(data => {
                return data.map(result =>
                    new User(result.userId, result.screenName, result.avatar, result.email, result.metadata,
                        result.lastSeen, result.online));
            })
            .catch(err => {
                throw err;
            });
    }

    unsubscribeFromUsersPresence(userIds) {
        const body = JSON.stringify({ 'userIds': userIds });
        return httpPost(`${this.apiEndpoint}/api/v1/users/unsubscribe`, (refresh) => this.tokenManager.get(refresh), body)
            .catch(err => {
                throw err;
            });
    }

    unsubscribeFromAllUsersPresence() {
        const body = JSON.stringify({});
        return httpPost(`${this.apiEndpoint}/api/v1/users/unsubscribe-all`, (refresh) => this.tokenManager.get(refresh), body)
            .catch(err => {
                throw err;
            });
    }

    fireUserTyping(chatroomId) {
        this.transport.send({
            event: 'user-typing', payload: {
                chatroomId: chatroomId, ...this.currentUser
            }
        });
    }

    markMessageAsDelivered(chatroomId, latestMessageDelivered) {
        this.transport.send({
            event: 'messages-delivered', payload: {
                chatroomId: chatroomId, latestMessageDelivered: latestMessageDelivered
            }
        });
    }

    markMessageAsRead(chatroomId, latestMessage) {
        this.transport.send({
            event: 'messages-read', payload: {
                chatroomId: chatroomId, latestMessageRead: latestMessage
            }
        });
    }
}
