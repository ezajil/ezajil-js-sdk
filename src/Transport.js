import { EventEmitter } from 'events';
import { log, logError } from './utils/sdkLogger.js';

const WS_EVENTS = {
    OPEN: 'open',
    CLOSE: 'close',
    ERROR: 'error',
    MESSAGE: 'message'
};

const ConnectionState = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected'
};

export default class Transport extends EventEmitter {
    constructor(session) {
        super();
        this.connectionState = ConnectionState.DISCONNECTED;
        this.pingInterval = 10000;
        this.maxReconnectInterval = 30000;
        this.reconnectExponentialBackoff = 2;
        this.wsEndpoint = session.wsEndpoint;
        this.tokenManager = session.tokenManager;
    }

    connect(forceTokenRefresh = false) {
        if (this.connectionState !== ConnectionState.DISCONNECTED) {
            log('Skip connect. Already connecting or connected');
            return;
        }
        this.connectionState = ConnectionState.CONNECTING;
        this.tokenManager.get(forceTokenRefresh)
            .then(accessToken => {
                this.conn = new WebSocket(this.wsEndpoint, accessToken);
                this._bindWsEvents();
            }).catch(error => {
                this.connectionState = ConnectionState.DISCONNECTED;
                this._handleConnectionError(error);
            });
    }

    _handleConnectionError(error) {
        if ([400, 401].includes(error.status)) {
            this.emit('close', error.status, error.message, true);
        } else {
            this.emit('close', error.status || 500, error.message, false);
            this._reconnect();
        }
    }

    _bindWsEvents() {
        this.conn.onopen = () => this._onOpen();
        this.conn.onclose = (closeEvent) => this._onClose(closeEvent);
        this.conn.onerror = (err) => this._onError(err);
        this.conn.onmessage = (event) => this._onMessage(event);
    }

    _unbindWsEvents() {
        this.conn.removeEventListener(WS_EVENTS.OPEN, this._onOpen);
        this.conn.removeEventListener(WS_EVENTS.CLOSE, this._onClose);
        this.conn.removeEventListener(WS_EVENTS.ERROR, this._onError);
        this.conn.removeEventListener(WS_EVENTS.MESSAGE, this._onMessage);
    }

    _onOpen() {
        this.connectionState = ConnectionState.CONNECTED;
        this._clearReconnectAttemptIfExists();
        this.emit('open');
    }

    _onClose(closeEvent) {
        this.connectionState = ConnectionState.DISCONNECTED;
        clearTimeout(this.pingTimeoutId);
        const isClientError = [4000, 4001, 4004, 4006].includes(closeEvent.code);
        if (closeEvent.code && !isClientError) {
            log('_onClose.reconnect');
            this._reconnect();
        }
        this.emit('close', closeEvent.code, closeEvent.reason, isClientError);
    }

    _onError(event) {
        if (event && event.target.readyState === 3) {
            this.connectionState = ConnectionState.DISCONNECTED;
            log('_onError.reconnect');
            // Maybe due to 401 handshake failure
            this._reconnect(true);
        }
        this.emit('error', event);
    }

    _onMessage(event) {
        if (!!event) {
            let parsed;
            try {
                parsed = JSON.parse(event.data);
                if (parsed.event === 'ready') {
                    this._ping();
                }
                if (['chat-message', 'payload-delivery-error', 'message-sent',
                    'user-typing', 'messages-delivered', 'messages-read'].includes(parsed.event)) {
                    this.emit(`${parsed.event}:${parsed.payload.chatroomId}`, parsed.payload);
                }
                this.emit(parsed.event, parsed.payload);
            } catch (ex) {
                logError(ex);
                this.emit('message', event.data);
            }
        }
    }

    _ping() {
        try {
            if (this.isOpen()) {
                this.conn.send('');
            }
            this.pingTimeoutId = setTimeout(() => {
                this._ping();
            }, this.pingInterval);
        }
        catch (err) {
            this.emit('error', 5002, err);
            this.close();
            this._reconnect();
        }
    }

    _reconnect() {
        if (this.connectionState !== ConnectionState.DISCONNECTED) {
            return;
        }
        let reconnectInterval = Math.min(
            this.reconnectAttempts * this.reconnectExponentialBackoff * 1000, 
            this.maxReconnectInterval
        );
        log(`Reconnect attempt '${this.reconnectAttempts}', retry after ${reconnectInterval}ms`);
        this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
        this.reconnectId = setTimeout(() => this.connect(true), reconnectInterval);
    }

    close() {
        log('Closing connection');
        this.connectionState = ConnectionState.DISCONNECTED;
        clearTimeout(this.pingTimeoutId);
        clearTimeout(this.reconnectId);
        if (this.conn) {
            this._unbindWsEvents();
            this.conn.close();
            this.conn = null;
        }
    }

    _clearReconnectAttemptIfExists() {
        if (this.reconnectId) {
            clearTimeout(this.reconnectId);
        }
        this.reconnectAttempts = 0;
    }

    isOpen() {
        return !!this.conn && this.conn.readyState === 1;
    }

    send(message) {
        try {
            this.conn.send(JSON.stringify(message));
        } catch (e) {
            logError(`Failed to send message: ${message}`, e)
        }
    }
}