import { httpGet, httpPost, uploadFile } from './utils/http.js';
import { generateUUID } from './utils/util.js';
import { EventEmitter } from 'events';
import User from './User.js';
import { log } from './utils/sdkLogger.js';
import APIError from './APIError.js';

export default class Chatroom extends EventEmitter {

    constructor(session, chatroomId, name, latestMessage, creationDate, creatorId,
        single, users, metadata, lastJoined) {
        super();
        this.transport = session.transport;
        this.currentUser = session.currentUser;
        this.tokenManager = session.tokenManager;
        this.apiEndpoint = session.apiEndpoint;
        this.apiKey = session.apiKey;
        this.chatroomId = chatroomId;
        this.name = name;
        this.latestMessage = latestMessage;
        this.creationDate = creationDate;
        this.creatorId = creatorId;
        this.single = single;
        this.participantIds = users;
        this.metadata = metadata;
        this.lastJoined = lastJoined;
    }

    open() {
        this.transport.on(`payload-delivery-error:${this.chatroomId}`, (message) => {
            log(`payload-delivery-error: ${JSON.stringify(message)}`);
            this.emit('payload-delivery-error', message.code, message.reason, message.chatroomId, message.payload);
        });
        this.transport.on(`chat-message:${this.chatroomId}`, (message) => {
            log(`chat-message: ${JSON.stringify(message)}`);
            this.emit('chat-message', message);
        });
        this.transport.on(`message-sent:${this.chatroomId}`, (message) => {
            log(`message-sent: ${JSON.stringify(message)}`);
            this.emit('message-sent', message);
        });
        this.transport.on(`user-typing:${this.chatroomId}`, (message) => {
            log(`user-typing: ${JSON.stringify(message)}`);
            this.emit('user-typing', message);
        });
        this.transport.on(`messages-delivered:${this.chatroomId}`, (message) => {
            log(`messages-delivered: ${JSON.stringify(message)}`);
            this.emit('messages-delivered', message);
        });
        this.transport.on(`messages-read:${this.chatroomId}`, (message) => {
            log(`messages-read: ${JSON.stringify(message)}`);
            this.emit('messages-read', message);
        });
    }

    close() {
        this.removeAllListeners();
    }

    getMessages(pagingState = null, limit = null) {
        return httpGet(`${this.apiEndpoint}/api/v1/chatrooms/${this.chatroomId}/messages`, this.apiKey, (refresh) => this.tokenManager.get(refresh), {
            pagingState: pagingState,
            limit: limit,
        })
            .then(response => response.json())
            .catch(err => {
                throw err;
            });
    }

    getUsers() {
        return httpGet(`${this.apiEndpoint}/api/v1/chatrooms/${this.chatroomId}/users`, this.apiKey, (refresh) => this.tokenManager.get(refresh))
            .then(response => {
                response.json().then(data => {
                    return data.map(result => new User(result.userId, result.screenName, result.avatarUrl, result.email,
                        result.metadata, result.lastSeen, result.online));
                });
            })
            .catch(err => {
                throw err
            });
    }

    join() {
        return httpPost(`${this.apiEndpoint}/api/v1/chatrooms/${this.chatroomId}/join`, this.apiKey, (refresh) => this.tokenManager.get(refresh))
            .then(response => response.json())
            .catch(err => {
                throw err;
            });
    }

    sendChatMessage(textMessage) {
        if (textMessage.length > 0) {
            const author = this.currentUser;
            let message = {
                'chatroomId': this.chatroomId,
                'messageId': generateUUID(),
                'author': author.userId,
                'screenName': author.screenName,
                'content': textMessage,
                'users': this.participantIds,
                'sendingDate': (performance.now() + performance.timeOrigin) * 1e6,
            };
            this._sendTextMessage(message);
            return message;
        }
        return null;
    }

    _sendTextMessage(message) {
        this.transport.send({ event: 'chat-message', payload: message });
    }

    uploadFile(file) {
        return new Promise((resolve, reject) => {
            const sizeInMB = file.size / (1024 * 1024);
            if (sizeInMB > 20) {
                reject(new APIError(400, 'The maximum upload size is 20MB'));
                return;
            }
            const author = this.currentUser;
            const messageId = generateUUID();
            let formData = new FormData();
            formData.append('chatroomId', this.chatroomId);
            formData.append('author', author.userId);
            formData.append('messageId', messageId);
            formData.append('file', file);

            uploadFile(`${this.apiEndpoint}/dam/upload`, this.apiKey, (refresh) => this.tokenManager.get(refresh), formData)
                .then(response => {
                    response.json().then(uploadResult => {
                        let message = {
                            'chatroomId': this.chatroomId,
                            'messageId': messageId,
                            'author': author.userId,
                            'mediaUrls': uploadResult.links,
                            'preview': uploadResult.preview,
                            'screenName': author.screenName,
                            'users': this.participantIds,
                            'sendingDate': uploadResult.sendingDate,
                        };
                        this._sendTextMessage(message);
                        resolve(message);
                    }).catch(err => reject(err));
                })
                .catch((err) => reject(err));
        });
    }

    fireUserTyping() {
        this.transport.send({
            event: 'user-typing', payload: {
                chatroomId: this.chatroomId, ...this.currentUser
            }
        });
    }

    markMessageAsDelivered(latestMessageDeliveredTimestamp) {
        this.transport.send({
            event: 'messages-delivered', payload: {
                chatroomId: this.chatroomId, latestMessageDelivered: latestMessageDeliveredTimestamp
            }
        });
    }

    markMessageAsRead(latestMessageReadTimestamp) {
        this.transport.send({
            event: 'messages-read', payload: {
                chatroomId: this.chatroomId, latestMessageRead: latestMessageReadTimestamp
            }
        });
    }
}
