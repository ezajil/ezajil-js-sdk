declare module 'ezajil-js-sdk' {
    export class User {
        userId: string;
        screenName: string;
        avatarUrl: string;
        email: string;
        metadata: Map<string, string>;
        online: boolean;
        lastSession: number;

        constructor(
            userId: string,
            screenName: string,
            avatarUrl?: string,
            email?: string,
            metadata?: Map<string, string>
        );
    }

    export interface SDKError {
        message: string;
        code: string;
        error: any;
    }

    export interface Message {
        chatroomId: string;
        messageId: string;
        author: string;
        screenName: string;
        content: string;
        mediaUrls: { [key: string]: string };
        preview: boolean;
        sendingDate: number;
        status: 'NOT_SENT' | 'SENT' | 'DELIVERED' | 'READ';
        systemMessage: boolean;
    }

    export type MessageSentEvent = {
        chatroomId: string;
        messageId: string;
    }

    export interface UserTypingEvent extends User {
        chatroomId: string;
    }

    export type MessagesDeliveredEvent = {
        chatroomId: string;
        latestMessageDelivered: number;
    }

    export type MessagesReadEvent = {
        chatroomId: string;
        latestMessageRead: number;
    }

    export type PageResult<T> = {
        results: T[];
        pagingState: string | null;
        totalResults: number;
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
        getMessages(from: number, size: number, callback: (messages: PageResult<Message> | null, error: Response | null) => void): void;
        getUsers(callback: (users: User[] | null, error: Response | null) => void): void;
        sendChatMessage(textMessage: string): Message | null;
        uploadFile(file: File, callback: (messages: Message | null, error: SDKError | Response | null) => void): void;
        fireUserTyping(): void;
        markMessageAsDelivered(latestMessageDeliveredTimestamp: number): void;
        markMessageAsRead(latestMessageReadTimestamp: number): void;
        close(): void;

        on(event: 'error-message', listener: (code: string, reason: string, chatMessage: string) => void): this;
        on(event: 'chat-message', listener: (message: Message) => void): this;
        on(event: 'message-sent', listener: (message: MessageSentEvent) => void): this;
        on(event: 'user-typing', listener: (message: UserTypingEvent) => void): this;
        on(event: 'messages-delivered', listener: (message: MessagesDeliveredEvent) => void): this;
        on(event: 'messages-read', listener: (message: MessagesReadEvent) => void): this;
    }

    type AppCredentials = {
        endpoint: string;
        organizationId: string;
        projectId: string;
        secretKey: string;
    }

    // Declare the 'Session' class
    export class Session {
        constructor(currentUser: User, appCredentials: AppCredentials);
        connect(): void;
        isOpen(): boolean;
        createSingleChatroom(name: string, participantId: string, metadata: Map<string, string>, callback: (chatroom: Chatroom | null, error: Response | null) => void): void;
        createGroupChatroom(name: string, participantIds: string[], metadata: Map<string, string>, callback: (chatroom: Chatroom | null, error: Response | null) => void): void;
        getChatroom(chatroomId: string, callback: (chatroom: Chatroom | null, error: Response | null) => void): void;
        getChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, error: Response | null) => void): void;
        getSingleChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, error: Response | null) => void): void;
        getName(chatroom: any): string;
        getGroupChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, error: Response | null) => void): void;
        getChatroomUsers(chatroomId: string, callback: (users: User[] | null, error: Response | null) => void): void;
        getUsers(userIds: string[], callback: (users: User[] | null, error: Response | null) => void): void;
        subscribeToUsersPresence(userIds: string[], callback: (users: User[] | null, error: Response | null) => void): void;
        subscribeToUsersPresence(users: User[], callback: (users: User[] | null, error: Response | null) => void): void;
        unsubscribeFromUsersPresence(userIds: string[], callback: (error: Response | null) => void): void;
        unsubscribeFromAllUsersPresence(callback: (error: Response | null) => void): void;
        fireUserTyping(chatroomId: string): void;
        markMessageAsDelivered(chatroomId: string, latestMessageDeliveredTimestamp: number): void;
        markMessageAsRead(chatroomId: string, latestMessageReadTimestamp: number): void;

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