declare module 'ezajil-js-sdk' {
    export class User {
        userId: string;
        screenName: string;
        avatarUrl: string;
        email: string;
        metadata: Map<string, string>;
        online: boolean;
        lastSeen: number;

        constructor(
            userId: string,
            screenName: string,
            avatarUrl?: string,
            email?: string,
            metadata?: Map<string, string>
        );
    }

    type ChatroomErrorPayloadMap = {
        'chat-message': Message;
        'user-typing': UserTypingEvent;
        'messages-delivered': MessagesDeliveredEvent;
        'messages-read': MessagesReadEvent;
    };

    type PayloadDeliveryErrorPayload<T extends keyof ChatroomErrorPayloadMap> = {
        event: T;
        payload: ChatroomErrorPayloadMap[T];
    };
    
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

    export class APIError extends Error {
        status: number;
        message: string;
        details: string | null;
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
        open(): void;
        close(): void;
        getMessages(callback: (messages: PageResult<Message> | null, error: APIError | null) => void, 
            pagingState?: string|null, limit?: number): void;
        getUsers(callback: (users: User[] | null, error: APIError | null) => void): void;
        sendChatMessage(textMessage: string): Message | null;
        uploadFile(file: File, callback: (messages: Message | null, error: APIError | null) => void): void;
        fireUserTyping(): void;
        markMessageAsDelivered(latestMessageDeliveredTimestamp: number): void;
        markMessageAsRead(latestMessageReadTimestamp: number): void;

        on(event: 'payload-delivery-error', listener: (code: number, reason: string, chatroomId: string,
            payload: PayloadDeliveryErrorPayload<'chat-message'|'user-typing'|'messages-delivered'|'messages-read'>) => void): this;
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

    type SDKConfig = {
        enableLogging: boolean;
    }

    // Declare the 'Session' class
    export class Session {
        constructor(currentUser: User, appCredentials: AppCredentials, sdkConfig: SDKConfig);
        connect(): void;
        isOpen(): boolean;
        createSingleChatroom(name: string, participantId: string, metadata: Map<string, string>, callback: (chatroom: Chatroom | null, error: APIError | null) => void): void;
        createGroupChatroom(name: string, participantIds: string[], metadata: Map<string, string>, callback: (chatroom: Chatroom | null, error: APIError | null) => void): void;
        getChatroom(chatroomId: string, callback: (chatroom: Chatroom | null, error: APIError | null) => void): void;
        getChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, pagingState: string|null, totalResults: number, error: APIError | null) => void, 
            pagingState?: string|null, limit?: number): void;
        getSingleChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, pagingState: string|null, totalResults: number, error: APIError | null) => void,
            pagingState?: string|null, limit?: number): void;
        getName(chatroom: any): string;
        getGroupChatroomsOfUser(callback: (chatrooms: Chatroom[] | null, pagingState: string|null, totalResults: number, error: APIError | null) => void,
            pagingState?: string|null, limit?: number): void;
        getChatroomUsers(chatroomId: string, callback: (users: User[] | null, error: APIError | null) => void): void;
        getUsers(userIds: string[], callback: (users: User[] | null, error: APIError | null) => void): void;
        subscribeToUsersPresence(userIds: string[], callback: (users: User[] | null, error: APIError | null) => void): void;
        subscribeToUsersPresence(users: User[], callback: (users: User[] | null, error: APIError | null) => void): void;
        unsubscribeFromUsersPresence(userIds: string[], callback: (error: APIError | null) => void): void;
        unsubscribeFromAllUsersPresence(callback: (error: APIError | null) => void): void;
        fireUserTyping(chatroomId: string): void;
        markMessageAsDelivered(chatroomId: string, latestMessageDeliveredTimestamp: number): void;
        markMessageAsRead(chatroomId: string, latestMessageReadTimestamp: number): void;

        on(event: 'connected', listener: () => void): this;
        on(event: 'disconnected', listener: (code: number, reason: string, isClientError: boolean) => void): this;
        on(event: 'online-user', listener: (user: User) => void): this;
        on(event: 'offline-user', listener: (user: User) => void): this;
        on(event: 'chat-message', listener: (message: Message) => void): this;
        on(event: 'message-sent', listener: (message: MessageSentEvent) => void): this;
        on(event: 'user-typing', listener: (message: UserTypingEvent) => void): this;
        on(event: 'messages-delivered', listener: (message: MessagesDeliveredEvent) => void): this;
        on(event: 'messages-read', listener: (message: MessagesReadEvent) => void): this;
        on(event: 'error', listener: (event: Event) => void): this;
    }
}