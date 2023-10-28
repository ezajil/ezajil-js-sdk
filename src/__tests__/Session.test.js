import WebSocket from 'jest-websocket-mock';
import Session from '../Session';
import SDKError from '../error/SDKError';
import User from '../User';

describe('Session Class', () => {
    let server;
    let session;
    beforeEach(() => {
        server = new WebSocket('ws://localhost:1234');
    });
    afterEach(done => {
        console.log('after each');
        server.closed.then(() => done());
        server.close({ code: 4000, reason: 'string', wasClean: true });
    });
});