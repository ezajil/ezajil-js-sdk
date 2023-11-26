import { httpGet, httpPost } from './utils/http';
import Transport from './Transport';
import Chatroom from './Chatroom';
import { EventEmitter } from 'events';
import User from './User';
import { sdkConfig } from './utils/sdkConfig';
import { log, logError } from './utils/sdkLogger';
import TokenManager from './TokenManager';

export default class Session extends EventEmitter {

    constructor(endpoint, apiKey, currentUser, config = {}) {
        super();
        sdkConfig.enableLogging = config.enableLogging || false;
        // TODO: remove protocol if added
        const isSsl = !endpoint.startsWith('localhost') && !endpoint.startsWith('127.0.0.1');
        this.apiEndpoint = isSsl ? 'https://' + endpoint: 'http://' + endpoint;
        this.wsEndpoint = isSsl ? 'wss://' + endpoint + '/chat' : 'ws://' + endpoint + '/chat';
        this.apiKey = apiKey;
        this.currentUser = currentUser;
        this.tokenManager = new TokenManager(this);
        this.transport = new Transport(this);
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

    createSingleChatroom(name, participantId, metadata, callback) {
        const body = JSON.stringify({ 'name': name, 'participantId': participantId, 'metadata': metadata });
        httpPost(`${this.apiEndpoint}/api/chatrooms/single`, this.apiKey, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => {
                response.json().then(data => {
                    const chatroom = new Chatroom(this, data.chatroomId, data.name, data.latestMessage,
                        data.creationDate, data.creatorId, data.single, data.users, data.metadata);
                    callback(chatroom, null);
                });
            })
            .catch(err => callback(null, err));
    }

    createGroupChatroom(name, participantIds, metadata, callback) {
        const body = JSON.stringify({ 'name': name, 'participantIds': participantIds, 'metadata': metadata });
        httpPost(`${this.apiEndpoint}/api/chatrooms/group`, this.apiKey, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => {
                response.json().then(data => {
                    const chatroom = new Chatroom(this, data.chatroomId, data.name, 
                        data.latestMessage, data.creationDate, data.creatorId,
                        data.single, data.users, data.metadata, null);
                    callback(chatroom, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getChatroom(chatroomId, callback) {
        httpGet(`${this.apiEndpoint}/api/chatrooms/${chatroomId}`, this.apiKey, (refresh) => this.tokenManager.get(refresh))
            .then(response => {
                response.json().then(data => {
                    const chatroom = new Chatroom(this, data.chatroomId, data.name, 
                        data.latestMessage, data.creationDate, data.creatorId, data.single,
                        data.users, data.metadata, null);
                    callback(chatroom, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getChatroomsOfUser(callback, pagingState = null, limit = null) {
        httpGet(`${this.apiEndpoint}/api/chatrooms/latest`, this.apiKey, (refresh) => this.tokenManager.get(refresh), { pagingState: pagingState, limit: limit })
            .then(response => {
                response.json().then(data => {
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
                    callback(chatrooms, data.pagingState, data.totalResults, null);
                });
            })
            .catch(err => callback(null, err));
    }


    getSingleChatroomsOfUser(callback, pagingState = null, limit = null) {
        httpGet(`${this.apiEndpoint}/api/chatrooms/latest/single`, this.apiKey, (refresh) => this.tokenManager.get(refresh), { pagingState: pagingState, limit: limit })
            .then(response => {
                response.json().then(data => {
                    const chatrooms = data.results.map(result => {
                        return new Chatroom(this, result.chatroomId, result.name, result.latestMessage, 
                            result.creationDate, result.creatorId, result.single, result.users, 
                            result.metadata, result.lastJoined);
                    });
                    callback(chatrooms, data.pagingState, data.totalResults, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getGroupChatroomsOfUser(callback, pagingState = null, limit = null) {
        httpGet(`${this.apiEndpoint}/api/chatrooms/latest/group`, this.apiKey, (refresh) => this.tokenManager.get(refresh), { pagingState: pagingState, limit: limit })
            .then(response => {
                response.json().then(data => {
                    const chatrooms = data.results.map(result => {
                        return new Chatroom(this, result.chatroomId, result.name, 
                            result.latestMessage, result.creationDate, result.creatorId, 
                            result.single, result.users, result.metadata, result.lastJoined);
                    });
                    callback(chatrooms, data.pagingState, data.totalResults, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getChatroomUsers(chatroomId, callback) {
        httpGet(`${this.apiEndpoint}/api/chatrooms/${chatroomId}/users`, this.apiKey, (refresh) => this.tokenManager.get(refresh))
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result =>
                        new User(result.userId, result.screenName, result.avatar, result.email, result.metadata,
                            result.lastSeen, result.online));
                    callback(users, null);
                });
            })
            .catch(err => callback(null, err));
    }

    getUsers(userIds, callback) {
        const body = JSON.stringify({ 'userIds': userIds });
        httpPost(`${this.apiEndpoint}/api/users/list`, this.apiKey, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result =>
                        new User(result.userId, result.screenName, result.avatar, result.email, result.metadata,
                            result.lastSeen, result.online));
                    callback(users, null);
                });
            })
            .catch(err => callback(null, err));
    }

    subscribeToUsersPresence(userIds, callback) {
        const body = JSON.stringify({ 'userIds': userIds });
        httpPost(`${this.apiEndpoint}/api/users/subscribe`, this.apiKey, (refresh) => this.tokenManager.get(refresh), body)
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result =>
                        new User(result.userId, result.screenName, result.avatar, result.email, result.metadata,
                            result.lastSeen, result.online));
                    callback(users, null);
                });
            })

            .catch(err => callback(null, err));
    }

    unsubscribeFromUsersPresence(userIds, callback) {
        const body = JSON.stringify({ 'userIds': userIds });
        httpPost(`${this.apiEndpoint}/api/users/unsubscribe`, this.apiKey, (refresh) => this.tokenManager.get(refresh), body)
            .catch(err => callback(null, err));
    }

    unsubscribeFromAllUsersPresence(callback) {
        const body = JSON.stringify({});
        httpPost(`${this.apiEndpoint}/api/users/unsubscribe-all`, this.apiKey, (refresh) => this.tokenManager.get(refresh), body)
            .catch(err => callback(null, err));
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
