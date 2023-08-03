import { httpGet, httpPost, uploadFile } from './utils/http';
import { generateUUID } from './utils/util';
import { EventEmitter } from 'events';
import SDKError from './error/SDKError';
import User from './User';

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

    // TODO: change inputs
    getMessages(from, size, callback) {
        // Get latest messages
        httpGet(this.endpoint + '/api/chatroom/messages/' + this.chatroomId, this.authToken)
            .then(response => {
                response.json().then(data => {
                    data.results.sort((m1, m2) => m1.sendingDate - m2.sendingDate);
                    callback(data, null);
                });
            })
            .catch(err => callback(null, err));

            this.transport.on('error-message', (message) => {
                if (message.chatroomId === this.chatroomId) {
                    console.log(`error-message: ${JSON.stringify(message)}`);
                    this.emit('error-message', message.code, message.reason, message.chatMessage);
                }
            });
            this.transport.on('chat-message', (message) => {
                if (message.chatroomId === this.chatroomId) {
                    console.log(`chat-message: ${JSON.stringify(message)}`);
                    this.emit('chat-message', message);
                }
            });
            this.transport.on('message-sent', (message) => {
                if (message.chatroomId === this.chatroomId) {
                    console.log(`message-sent: ${JSON.stringify(message)}`);
                    this.emit('message-sent', message);
                }
            });
            this.transport.on('user-typing', (message) => {
                if (message.chatroomId === this.chatroomId) {
                    console.log(`user-typing: ${JSON.stringify(message)}`);
                    this.emit('user-typing', message);
                }
            });
            this.transport.on('messages-delivered', (message) => {
                if (message.chatroomId === this.chatroomId) {
                    console.log(`messages-delivered: ${JSON.stringify(message)}`);
                    this.emit('messages-delivered', message);
                }
            });
            this.transport.on('messages-read', (message) => {
                if (message.chatroomId === this.chatroomId) {
                    console.log(`messages-read: ${JSON.stringify(message)}`);
                    this.emit('messages-read', message);
                }
            });
    }

    // TODO: fix
    getUsers(callback) {
        // Get latest messages
        httpGet(`${this.endpoint}/api/chatroom/users/${this.chatroomId}`, this.authToken)
            .then(response => {
                response.json().then(data => {
                    const users = data.map(result => new User(userId, screenName, avatarUrl, email, lastSession, online));
                    callback(users, null);
                });
            })
            .catch(err => callback(null, err));
    }

    join(callback) {
        // Get latest messages
        httpPost(`${this.endpoint}/api/chatroom/join/${this.chatroomId}`, this.authToken)
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
                'organizationId': author.organizationId,
                'projectId': author.projectId,
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
        this.transport.send({event: 'chat-message', payload: message});
    }

    uploadFile(file, callback) {
        const sizeInMB = file.size / (1024 * 1024);
        if (sizeInMB > 20) {
            callback(null, new SDKError('The maximum size is 20MB', 8004));
            return;
        }
        const author = this.currentUser;
        let formData = new FormData();
        formData.append('file', file);
        // TODO: take size as input
        uploadFile(this.endpoint + '/dam/upload/' + this.chatroomId + '/' + author.userId, this.authToken, formData)
            .then(response => {
                response.json().then(uploadResult => {
                    if (uploadResult.status > 399) {
                        callback(null, uploadResult);
                    } else {
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
                    }
                });
            })
            .catch((err) => callback(null, err));
    }

    fireUserTyping() {
        this.transport.send({
            event: 'user-typing', payload: {
                organizationId: this.currentUser.organizationId, projectId: this.currentUser.projectId,
                chatroomId: this.chatroomId, userId: this.currentUser.userId
            }
        });
    }

    markMessageAsDelivered(latestMessageDeliveredTimestamp) {
        this.transport.send({
            event: 'messages-delivered', payload: {
                organizationId: this.currentUser.organizationId, projectId: this.currentUser.projectId,
                chatroomId: this.chatroomId, latestMessageDelivered: latestMessageDeliveredTimestamp
            }
        });
    }

    markMessageAsRead(latestMessageReadTimestamp) {
        this.transport.send({
            event: 'messages-read', payload: {
                organizationId: this.currentUser.organizationId, projectId: this.currentUser.projectId,
                chatroomId: this.chatroomId, latestMessageRead: latestMessageReadTimestamp
            }
        });
    }

    close() {
        this.removeAllListeners();
    }
}
