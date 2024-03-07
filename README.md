## Introduction

Welcome to the JavaScript SDK documentation. This guide will walk you
through the integration process to add chat and presence monitoring capabilities to your application using our SDK.

### Key Features

- Real-time messaging within chatrooms.
- Online presence tracking to see when users are online, offline, or typing.
- Support for both single and group chatrooms.
- File uploads within messages.
- Extensive event handling to react to chat activities in real-time.

<br />

## Getting Started
### Prerequisites

Before integrating `ezajil-js-sdk` into your project, ensure you have:
- Node.js installed on your system.
- An account registered on our platform to obtain an API key.

### Obtaining an API Key
Sign up on our platform and navigate to the dashboard to create a new project.
Upon creation, you will be provided with an API key required for authenticating your requests.

## Installation

To install the SDK in your project, run the following command in your project directory:
```bash
npm install ezajil-js-sdk --save
```
<br />

### Basic usage
#### Authentication
To authenticate with the SDK and start a session, you'll need two pieces of information
obtained from the dashboard: your API key and the endpoint URL.

Here's how to use them to initialize your session:
```javascript
import {{ '{' }} Session, User {{ '}' }} from 'ezajil-js-sdk';

const currentUser = new User('yourUserId', 'yourScreenName', 'yourAvatarUrl', 'yourEmail');
const sdkConfig = {{ '{' }} enableLogging: true {{ '}' }};
const session = new Session('yourEndpoint', 'yourApiKey', currentUser, sdkConfig);

session.connect();
```

Make sure to replace `yourEndpoint` and `yourApiKey` with the actual values you obtained from the dashboard. 
<br/>
This example also assumes you're replacing `yourUserId`, `yourScreenName`, `yourAvatarUrl`, and `yourEmail` 
with the user information relevant to your application context.

<br />

## Components
The SDK consists of the following components:
- **User**: The User component represents an application user. It stores information such as the user's unique
identifier, screen name, avatar URL, and email address.
- **Session**: The Session component establishes the connection between your application and the ezajil backend. It
handles authentication and provides methods for creating chatrooms, fetching users, and subscribing to presence
events.
- **Chatroom**: The Chatroom component identifies the room where users exchange messages. It provides methods for
sending messages, retrieving messages in a paged manner, and managing chatroom users.
Now let's dive into each component in more detail.
<br />
### User
The User component represents an application user. It is initialized with the following parameters:
- `userId` (string): An identifier for the user. This identifier should be unique per user across the application.
- `screenName` (string): The user's screen name.
- `avatarUrl` (string): The URL of the user's avatar. This avatar is used in ezajil dashboard when listing users.
- `email` (string): The user's email address.
Example usage:
```javascript
const user = User.currentUser(userId, screenName, avatarUrl, email);
```
<br />
### Session

The Session component establishes the connection between your application and ezajil backend.
It requires the current user instance and credentials for authentication
(Connect to your project on <a href="https://dashboard.ezajil.io" target="_blank">ezajil dashboard</a> to get them).

##### Creating a Session
To create a session, use the following code snippet while providing your own credentials:
```javascript
const user = new User(userId, screenName, avatarUrl, email);
const appCredentials = {{ '{' }}
organizationId: 'your-organization-id',
projectId: 'your-project-id',
secretKey: 'your-secret-key'
{{ '}' }};

const session = new Session(user, appCredentials);
```
##### Connecting to ezajil backend
Once you have created a session, you need to connect to the SaaS backend. Use the following code snippet:
```javascript
session.connect();
```
##### Handle Session Events
The Session component emits the following events:
- `connected` Triggered when the user has successfully connected.
- `disconnected` Triggered when the user is disconnected.
- `error` Triggered when an unexpected error occurs.
- `error-message` Triggered when a known SaaS error occurs.
- `online-user` Triggered when a subscribed user comes online.
- `offline-user` Triggered when a subscribed user goes offline.
- `chat-message` Triggered when the current user receives a chat message.
- `message-sent` Triggered when a message sent by the current user is confirmed.
- `user-typing` Triggered when a user is typing in a chatroom.
- `messages-delivered` Triggered when a delivered receipt is received for a message.
- `messages-read` Triggered when a read receipt is received for a message.
You can handle these events by attaching event listeners using the `on` method of the Session instance.
```javascript
session.on('connected', () => {{ '{' }}
// Handle the connected event
{{ '}' }});

session.on('disconnected', (code, reason) => {{ '{' }}
// The event has the code and reason associated to the disconnection for easier debugging
{{ '}' }});

session.on('error', (error) => {{ '{' }}
// The event includes a payload with a code, message and causing error object if it exists.
// This will usually include the WebSocket close codes.
// See: https://www.iana.org/assignments/websocket/websocket.xhtml
// {{ '{' }} "code": 1006, "message": "Error on WS connection", "error": {{ '{' }} ... {{ '}' }}{{ '}' }}
});

session.on('error-message', (sdkError) => {{ '{' }}
// This happens when you have reached an SDK limitations.
// For example if the chat messages limit has been reached, you get as a return the following payload:
// {{ '{' }} "code": 4003, "reason": "Chat messages limit has been exceeded",
// "chatMessage": {{ '{' }} // chat message that errored {{ '}' }}{{ '}' }}
{{ '}' }});

session.on('online-user', (onlineUser) => {{ '{' }}
// A user is now online
// {{ '{' }}"organizationId":"4482e5b6-9273-4506-a281-f5c6ffc4796d",
// "projectId":"d7bc5e8f-2f3b-427c-8b31-2c3d118fcd52",
// "userId":"ezajil2","screenName":"ezajil2","avatarUrl":null{{ '}' }}
{{ '}' }});

session.on('offline-user', (offlineUser) => {{ '{' }}
// A user is now offline
// {{ '{' }}"organizationId":"4482e5b6-9273-4506-a281-f5c6ffc4796d",
// "projectId":"d7bc5e8f-2f3b-427c-8b31-2c3d118fcd52","userId":"ezajil1"{{ '}' }}
{{ '}' }});

session.on('chat-message', (chatMessage) => {{ '{' }}
// Current user received a new message
// {{ '{' }}"organizationId":"4482e5b6-9273-4506-a281-f5c6ffc4796d",
// "projectId":"d7bc5e8f-2f3b-427c-8b31-2c3d118fcd52",
// "messageId":"6642a6c3-fbea-4796-aeee-2c4cb64aeb06",
// "chatroomId":"72621fb3-f89c-4d39-a368-41448fd19858",
// "author":"ezajil2","screenName":"ezajil2","content":"test",
// "mediaUrls":null,"preview":false,"sendingDate":1690311786401,
// "users":["ezajil1","ezajil2"]{{ '}' }}
{{ '}' }});

session.on('message-sent', (messageSent) => {{ '{' }}
// Current user received a sent message receipt
// {{ '{' }}"organizationId":"4482e5b6-9273-4506-a281-f5c6ffc4796d",
// "projectId":"d7bc5e8f-2f3b-427c-8b31-2c3d118fcd52",
// "chatroomId":"72621fb3-f89c-4d39-a368-41448fd19858",
// "messageId":"6642a6c3-fbea-4796-aeee-2c4cb64aeb06"{{ '}' }}
{{ '}' }});

session.on('user-typing', (userTyping) => {{ '{' }}
// Current user is informed that a user is typing in one of the chatrooms
// {{ '{' }}"organizationId":"4482e5b6-9273-4506-a281-f5c6ffc4796d",
// "projectId":"d7bc5e8f-2f3b-427c-8b31-2c3d118fcd52",
// "chatroomId":"72621fb3-f89c-4d39-a368-41448fd19858",
// "userId":"ezajil2"{{ '}' }}
{{ '}' }});

session.on('messages-delivered', (messagesDelivered) => {{ '{' }}
// Current user received delivered messages receipt.
// All messages that are before latestMessageDelivered date on the same chatroom
// can be considered as delivered as well
// {{ '{' }}"organizationId":"4482e5b6-9273-4506-a281-f5c6ffc4796d",
// "projectId":"d7bc5e8f-2f3b-427c-8b31-2c3d118fcd52",
// "chatroomId":"72621fb3-f89c-4d39-a368-41448fd19858",
// "latestMessageDelivered":1690311786401{{ '}' }}.
{{ '}' }});

session.on('message-sent', (messagesRead) => {{ '{' }}
// Current user received delivered messages receipt.
// All messages that are before latestMessageRead date on the same chatroom
// can be considered as read as well
// {{ '{' }}"organizationId":"4482e5b6-9273-4506-a281-f5c6ffc4796d",
// "projectId":"d7bc5e8f-2f3b-427c-8b31-2c3d118fcd52",
// "chatroomId":"72621fb3-f89c-4d39-a368-41448fd19858",
// "latestMessageRead":1689028370275{{ '}' }}.
{{ '}' }});
```

##### Manage Session Lifecycle
- `connect()`

Connects the current user to ezajil backend.

- `disconnect()`

Disconnects the current user from ezajil backend.

##### Interact with Chatrooms
- `createSingleChatroom(otherUserId, metadata, callback)`

Creates a chatroom between the current user and another user identified by the otherUserId.
It also accepts a metadata object to store additional key-value data related to the chatroom.
The callback function is called with the created chatroom and an error if something goes wrong.
```javascript
session.createSingleChatroom(otherUserId, metadata, (chatroom, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error creating chatroom:', error);
{{ '}' }} else {{ '{' }}
// Process the created chatroom
console.log('Created chatroom:', chatroom);
{{ '}' }}
{{ '}' }});
```

- `createGroupChatroom(name, participantIds, metadata, callback)`

Creates a group chatroom, adding the participants provided as input.
It also accepts a metadata object to store additional key-value data related to the chatroom.
The callback function is called with the created chatroom and an error if something goes wrong.
```javascript
session.createGroupChatroom(name, participantIds, metadata, (chatroom, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error creating chatroom:', error);
{{ '}' }} else {{ '{' }}
// Process the created chatroom
console.log('Created chatroom:', chatroom);
{{ '}' }}
{{ '}' }});
```

- `getChatroomById(chatroomId, callback)`

Retrieves a chatroom instance by its chatroomId.
The callback function is called with the retrieved chatroom if successful or an error if something goes wrong.
```javascript
session.getChatroomById(chatroomId, (chatroom, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error retrieving chatroom:', error);
{{ '}' }} else {{ '{' }}
// Process the retrieved chatroom
console.log('Retrieved chatroom:', chatroom);
{{ '}' }}
{{ '}' }});
```

- `getChatroomsOfUser(callback)`

Fetches all chatrooms associated to current user.
The callback function is called with the list of all chatrooms of the current user, if successful, or an error if
something goes wrong.
```javascript
session.getChatroomsOfUser((chatrooms, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error retrieving user chatrooms:', error);
{{ '}' }} else {{ '{' }}
// Process the retrieved chatrooms
console.log('Retrieved chatrooms:', chatrooms);
{{ '}' }}
{{ '}' }});
```

##### Interact with users
- `getChatroomUsers(chatroomId, callback)`

Fetches users associated with the given chatroom.
The callback function is called with the list of users if successful or an error if something goes wrong.
```javascript
session.getChatroomUsers(chatroomId, (users, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error retrieving users of chatroom:', error);
{{ '}' }} else {{ '{' }}
// Process the retrieved users
console.log('Retrieved users:', users);
{{ '}' }}
{{ '}' }});
```

- `getUsers(userIds, callback)`

Fetches users by their IDs.
The callback function is called with the list of users if successful or an error if something goes wrong.
```javascript
session.getUsers(userIds, (users, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error retrieving users:', error);
{{ '}' }} else {{ '{' }}
// Process the retrieved users
console.log('Retrieved users:', users);
{{ '}' }}
{{ '}' }});
```

##### Manage Presence Subscriptions
- `subscribeToUsersPresence(userIds, callback)`

Subscribes the current user to the presence events of the specified users.
The callback function is called with the list of users with their current online status, indicating the successful
subscription, or an error, if any.
```javascript
session.subscribeToUsersPresence(userIds, (users, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error subscribing to user presence:', error);
{{ '}' }} else {{ '{' }}
// Process the subscribed users
console.log('Subscribed users:', subscribedUsers);
{{ '}' }}
{{ '}' }});
```

- `unsubscribeFromUsersPresence(userIds, callback)`

Unsubscribes the current user from the presence events of the specified users.
The callback function is called with an error, if any.
```javascript
session.unsubscribeFromUsersPresence(userIds, (error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error unsubscribing from user presence:', error);
{{ '}' }} else {{ '{' }}
// Handle successful unsubscription
console.log('Unsubscribed from user presence');
{{ '}' }}
{{ '}' }});
```

- `unsubscribeFromAllUsersPresence(callback)`

Unsubscribes the current user from the presence events of all users they were subscribed to.
The callback function is called with an error, if any.
```javascript
session.unsubscribeFromAllUsersPresence((error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error unsubscribing from all user presence:', error);
{{ '}' }} else {{ '{' }}
// Handle successful unsubscription
console.log('Unsubscribed from all user presence');
{{ '}' }}
{{ '}' }});
```

##### Manage Messages Receipts
- `fireUserTyping(chatroomId)`
Triggers the **user-typing** event for current user in the chatroom for other users to consume
```javascript
chatroom.fireUserTyping();
```
- `markMessagesAsDelivered(chatroomId, latestMessageDelivered)`
Marks received messages as successfully delivered.
This will produce **messages-delivered** that users on the chatroom can consume
```javascript
// Pass the latest message delivered timestamp as input
chatroom.markMessagesAsDelivered();
```

- `markMessagesAsRead(chatroomId, latestMessageRead)`

Marks received messages as successfully read by the current user.
This will produce **messages-read** that users on the chatroom can consume
```javascript
// Pass the latest message read timestamp as input
if an unexpected issue occurs.
```javascript
chatroom.getMessages(from, limit, (messages, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error retrieving messages:', error);
{{ '}' }} else {{ '{' }}
// Process the retrieved messages
console.log('Retrieved messages:', messages);
{{ '}' }}
{{ '}' }});
```

- `getUsers(callback)`
Gets the users of the chatroom. The callback function is called with the list of users or an error, if any.
```javascript
chatroom.getUsers((users, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error retrieving users:', error);
{{ '}' }} else {{ '{' }}
// Process the retrieved users
console.log('Retrieved users:', users);
{{ '}' }}
{{ '}' }});
```

- `sendChatMessage(text)`
Sends a chat message from the current user in the chatroom.
```javascript
chatroom.sendChatMessage('Hello, everyone!');
```
- `uploadFile(file, callback)`
Uploads an attachment file from the current user in the chatroom.
```javascript
const file = document.getElementById('attachmentInput').files[0];
chatroom.uploadFile(file, (message, error) => {{ '{' }}
if (error) {{ '{' }}
// Handle the error
console.error('Error uploading file:', error);
{{ '}' }} else {{ '{' }}
// Process the uploaded message.
// This message will contain the link of the uploaded attachment
console.log('Uploaded message:', message);
{{ '}' }}
{{ '}' }});
```

- `fireUserTyping()`
Triggers the **user-typing** event for current user in the chatroom for other users to consume
```javascript
chatroom.fireUserTyping();
```
- `markMessagesAsDelivered(latestMessageDelivered)`
Marks received messages as successfully delivered.
This will produce **messages-delivered** that users on the chatroom can consume
```javascript
// Pass the latest message delivered timestamp as input
chatroom.markMessagesAsDelivered();
```

- `markMessagesAsRead(latestMessageRead)`

Marks received messages as successfully read by the current user.
This will produce **messages-read** that users on the chatroom can consume
```javascript
// Pass the latest message read timestamp as input
chatroom.markMessagesAsRead();
```