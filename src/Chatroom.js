import { httpGet, httpPost, uploadFile } from './utils/http';
import { generateUUID } from './utils/util';
import { EventEmitter } from 'events';
import User from './User';
import { log, logError } from './utils/sdkLogger';
import APIError from './APIError';

export default class Chatroom extends EventEmitter {

    constructor(transport, endpoint, authToken, chatroomId, currentUser, name, latestMessage, creationDate, creatorId,
        single, users, metadata, lastJoined) {
        super();
        this.transport = transport;
        this.endpoint = endpoint;
        this.authToken = authToken;
        this.chatroomId = chatroomId;
        this.currentUser = currentUser;
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

    getMessages(callback, pagingState = null, limit = null) {
        httpGet(`${this.endpoint}/api/chatrooms/${this.chatroomId}/messages`, this.authToken, {
            pagingState: pagingState,
            limit: limit,
        })
            .then(response => {
                response.json().then(data => {
                    callback(data, null);
                });
            })
            .catch(err => {
                callback(null, err);
            });
    }

    getUsers(callback) {
        httpGet(`${this.endpoint}/api/chatrooms/${this.chatroomId}/users`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result => new User(result.userId, result.screenName, result.avatarUrl, result.email,
                        result.metadata, result.lastSeen, result.online));
                    callback(users, null);
                });
            })
            .catch(err => callback(null, err));
    }

    join(callback) {
        httpPost(`${this.endpoint}/api/chatrooms/${this.chatroomId}/join`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    callback(data, null);
                });
            })
            .catch(err => callback(null, err));
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
                'sendingDate': (new Date).getTime(),
            };
            this._sendTextMessage(message);
            return message;
        }
        return null;
    }

    _sendTextMessage(message) {
        this.transport.send({ event: 'chat-message', payload: message });
    }

    uploadFile(file, callback) {
        const sizeInMB = file.size / (1024 * 1024);
        if (sizeInMB > 20) {
            callback(null, new APIError(400, 'The maximum upload size is 20MB'));
            return;
        }
        const author = this.currentUser;
        let formData = new FormData();
        formData.append('file', file);
        // TODO: take size as input
        uploadFile(`${this.endpoint}/dam/upload/${this.chatroomId}`, this.authToken, formData)
            .then(response => {
                response.json().then(uploadResult => {
                    let message = {
                        'chatroomId': this.chatroomId,
                        'messageId': generateUUID(),
                        'author': author.userId,
                        'mediaUrls': uploadResult.links,
                        'preview': uploadResult.preview,
                        'screenName': author.screenName,
                        'users': this.participantIds,
                        'sendingDate': (new Date).getTime(),
                    };
                    this._sendTextMessage(message);
                    callback(message, null);
                });
            })
            .catch((err) => callback(null, err));
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
