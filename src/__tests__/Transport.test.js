import WebSocket, { WS } from 'jest-websocket-mock';
import Transport from '../Transport';

describe('Transport Class', () => {
    let server;
    let transport;
    beforeEach(() => {
        server = new WebSocket('ws://localhost:1234');
    });
    afterEach((done) => {
        console.log('after each');
        server.closed.then(() => done());
        server.close({ code: 4000, reason: 'string', wasClean: true });
    });

    it('should establish a WebSocket connection', (done) => {
        transport = new Transport({ endpoint: 'ws://localhost:1234', token: 'yourtoken' });
        transport.on('open', () => {
            expect(transport.isOpen()).toBeTruthy();
            expect(transport.pingTimeoutId).toBeUndefined();
            done();
        });

    });

    it('should react to ready event and start recurring ping', (done) => {
        transport = new Transport({ endpoint: 'ws://localhost:1234', token: 'yourtoken' });
        transport.on('ready', () => {
            expect(transport.isOpen()).toBeTruthy();
            expect(transport.pingTimeoutId).not.toBeNull();
            done();
        });

        // When server says that connection is ready, client should start pinging regularly
        server.connected.then(() => server.send('{"event": "ready", "payload": null}'));
    });

    it('should attempt to reconnect on close code different than 4xxx', (done) => {
        transport = new Transport({ endpoint: 'ws://localhost:1234', token: 'yourtoken' });

        transport.on('ready', () => {
            transport.on('close', (code, reason) => {
                expect(transport.isOpen()).toBeFalsy();
                expect(transport.pingTimeoutId._destroyed).toBeTruthy();
                // Attempts to reconnect
                expect(transport.reconnectId).not.toBeUndefined();
                done();
            });

            transport._close();
        });

        server.connected.then(() => server.send('{"event": "ready", "payload": null}'));
    });

    it('should handle error event', (done) => {
        transport = new Transport({ endpoint: 'ws://localhost:1234', token: 'yourtoken' });

        transport.on('error', (code, reason) => {
            expect(code).toBe(5000);
            done();
        });
        server.connected.then(() => {
            // Simulate an error on the WebSocket connection
            server.error();
        });
    });

    it('should handle message event', (done) => {
        transport = new Transport({ endpoint: 'ws://localhost:1234', token: 'yourtoken' });
        const message = { event: 'chat-message', payload: 'testPayload' };

        transport.on(message.event, (payload) => {
            expect(payload).toBe(message.payload);
            done();
        });

        server.connected.then(() => {
            // Simulate a WebSocket message event
            server.send(JSON.stringify(message));
        });
    });
});