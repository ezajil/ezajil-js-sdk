// Start an HTTP server and websocket and test all possible error scenarios and check retries work
import WebSocket, { WS } from 'jest-websocket-mock';
import Session from '../Session';
import User from '../User';
import 'isomorphic-fetch'; // in order to make Headers work
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

describe('Session Class', () => {
    let server;
    beforeEach(() => {
        server = new WebSocket('ws://localhost:1234/chat/v1');
        server.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        fetchMock.resetMocks();
    });
    afterEach((done) => {
        server.closed.then(() => done());
        server.close({ code: 4000, reason: 'string', wasClean: true });
    });

    it('should be open when auth successful', (done) => {
        const session = new Session('localhost:1234', 'api_key', new User('1', 'ezajil1'));
        mockSuccessfulAuth();
        session.transport.on('open', () => {
            expect(session.isOpen()).toBeTruthy();
            done();
        });
        session.connect();
    });

    it('should be connected when auth successful and ready event received', (done) => {
        const session = new Session('localhost:1234', 'api_key', new User('1', 'ezajil1'));
        mockSuccessfulAuth();
        session.on('connected', () => {
            done();
        });
        server.connected.then(() => server.send('{"event": "ready", "payload": null}'));
        session.connect();
    });

    it('should be disconnected when auth fails with 401 error', (done) => {
        const session = new Session('localhost:1234', 'api_key', new User('1', 'ezajil1'));
        mockUnauthorizedAuth();
        session.on('disconnected', (code, reason, isClientError) => {
            expect(code).toBe(4001);
            expect(reason).toBe('Unauthorized');
            expect(isClientError).toBeTruthy();
            // No attempt to reconnect
            expect(session.transport.reconnectId).toBeUndefined();
            done();
        });
        session.connect();
    });

    it('should be disconnected when auth fails with 400 error', (done) => {
        const session = new Session('localhost:1234', 'api_key', new User('1', 'ezajil1'));
        mockBadRequestAuth();
        session.on('disconnected', (code, reason, isClientError) => {
            expect(code).toBe(4000);
            expect(reason).toBe('Invalid value \'\' for parameter \'userId\': must not be blank');
            expect(isClientError).toBeTruthy();
            // No attempt to reconnect
            expect(session.transport.reconnectId).toBeUndefined();
            done();
        });
        session.connect();
    });

    it('should be disconnected when auth fails with 500 error and should try to reconnect', (done) => {
        const session = new Session('localhost:1234', 'api_key', new User('1', 'ezajil1'));
        mockInternalErrorAuth();
        session.on('disconnected', (code, reason, isClientError) => {
            expect(code).toBe(5000);
            expect(reason).toBe('An unexpected error has occurred. Our team has been alerted, and we are actively working to resolve it shortly');
            expect(isClientError).toBeFalsy();
            // Attempts to reconnect
            expect(session.transport.reconnectId).not.toBeUndefined();
            done();
        });
        session.connect();
    });

    it('should force refresh on error (handshake failure)', (done) => {
        const session = new Session('localhost:1234', 'api_key', new User('1', 'ezajil1'));
        mockSuccessfulAuth(); // Expired access token
        session.on('error', (event) => {
            // Attempts to reconnect
            expect(session.transport.reconnectId).not.toBeUndefined();
            session.close();
            done();
        });
        const spy = jest.spyOn(session.transport, 'connect');
        session.connect();
        server.error();
    });
});

function mockSuccessfulAuth() {
    fetchMock.mockResponseOnce(JSON.stringify({
        organizationId: '053f4104-6713-4362-ba02-dc8a694c8221',
        projectId: 'e06aed1d-84bc-48b0-b6c0-6513aabf621b',
        userId: 'testUser',
        screenName: 'testUser',
        avatarUrl: null,
        email: null,
        metadata: null,
        accessToken: 'access-token'
    }));
}

function mockUnauthorizedAuth() {
    fetchMock.mockResponseOnce(null, { status: 401 });
}

function mockBadRequestAuth() {
    fetchMock.mockResponseOnce(JSON.stringify({
        title: 'One or more request parameters are not valid',
        status: 400,
        instance: 'http://localhost:8080/api/v1/users/auth',
        'invalid-parameters': [{
            reason: 'must not be blank',
            property: 'userId',
            value: ''

        }]
    }), { status: 400 });
}

function mockInternalErrorAuth() {
    fetchMock.mockResponseOnce(null, { status: 500 });
}
