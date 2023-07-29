declare module 'ezajil-js-sdk' {
    export class User {
        organizationId: string;
        projectId: string;
        userId: string;
        screenName: string;
        avatarUrl: string;
        email: string;

        static currentUser(
            organizationId: string,
            projectId: string,
            userId: string,
            screenName: string,
            avatarUrl: string,
            email: string
        ): User;
    }

    export interface SDKError {
        message: string;
        code: string;
        error: any;
    }

    export interface Message {
        author: string;
        screenName: string;
        content: string;
        mediaUrls: Map<string, string>;
        preview: boolean;
        sendingDate: number;
        status: 'NOT_SENT' | 'SENT' | 'DELIVERED' | 'READ';
        systemMessage: boolean;
    }

    export type MessageSentEvent = {
        organizationId: string;
        projectId: string;
        chatroomId: string;
        messageId: string;
    }

    export type UserTypingEvent = {
        organizationId: string;
        projectId: string;
        chatroomId: string;
        userId: string;
    }

    export type MessagesDeliveredEvent = {
        organizationId: string;
        projectId: string;
        chatroomId: string;
        latestMessageDelivered: number;
    }

    export type MessagesReadEvent = {
        organizationId: string;
        projectId: string;
        chatroomId: string;
        latestMessageRead: number;
    }

    export class Chatroom {
        chatroomId: string;
        name: string;
        latestMessage: string;
        creationDate: string;
        creatorId: string;
        single: boolean;
        participantIds: string[];
        metadata: Map<string, string>;
        getMessages(from: number, size: number, callback: (messages: Message[] | null, error: Response | null) => void): void;
        getUsers(callback: (users: User[] | null, error: Response | null) => void): void;
        sendChatMessage(textMessage: string): void;
        uploadFile(file: File, callback: (messages: Message | null, error: SDKError | Response | null) => void): void;
        fireUserTyping(): void;
        markMessageAsDelivered(latestMessageDeliveredTimestamp: number): void;
        markMessageAsRead(latestMessageReadTimestamp: number): void;
    }

    type AppCredentials = {
        organizationId: string;
        projectId: string;
        secretKey: string;
    }

    // Declare the 'Session' class
    export class Session {
        constructor(currentUser: User, appCredentials: AppCredentials);
        connect(): void;
        isOpen(): boolean;
        createSingleChatroom(participantId: string, metadata: Map<string, string>, callback: (chatroom: Chatroom | null, error: Response | null) => void): void;
        createGroupChatroom(name: string, participantIds: string[], metadata: Map<string, string>, callback: (chatroom: Chatroom | null, error: Response | null) => void): void;
        getChatroom(chatroomId: string, callback: (chatroom: Chatroom | null, error: Response | null) => void): void;
        getChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, error: Response | null) => void): void;
        getSingleChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, error: Response | null) => void): void;
        getName(chatroom: any): string;
        getGroupChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, error: Response | null) => void): void;
        getChatroomUsers(chatroomId: string, callback: (users: User[] | null, error: Response | null) => void): void;
        getUsers(userIds: string[], callback: (users: User[] | null, error: Response | null) => void): void;
        subscribeToUsersPresence(userIds: string[], callback: (users: User[] | null, error: Response | null) => void): void;
        unsubscribeFromUsersPresence(userIds: string[], callback: (error: Response | null) => void): void;
        unsubscribeFromAllUsersPresence(callback: (error: Response | null) => void): void;
        fireUserTyping(chatroomId: string): void;
        markMessageAsDelivered(message: any): void;
        markMessageAsRead(chatroomId: string, latestMessage: any): void;

        // Declare additional events emitted by the Session class
        on(event: 'connected', listener: () => void): this;
        on(event: 'disconnected', listener: (code: number, reason: string) => void): this;
        on(event: 'error', listener: (err: Error) => void): this;
        on(event: 'error-message', listener: (code: string, reason: string, chatMessage: string) => void): this;
        on(event: 'online-user', listener: (user: User) => void): this;
        on(event: 'offline-user', listener: (user: User) => void): this;
        on(event: 'chat-message', listener: (message: Message) => void): this;
        on(event: 'message-sent', listener: (message: MessageSentEvent) => void): this;
        on(event: 'user-typing', listener: (message: UserTypingEvent) => void): this;
        on(event: 'messages-delivered', listener: (message: MessagesDeliveredEvent) => void): this;
        on(event: 'messages-read', listener: (message: MessagesReadEvent) => void): this;
    }
}