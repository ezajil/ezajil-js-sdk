import { EventEmitter } from 'events';
import { log, logError } from './utils/sdkLogger';

const WS_EVENTS = {
    OPEN: 'open',
    CLOSE: 'close',
    ERROR: 'error',
    MESSAGE: 'message'
};

export default class Transport extends EventEmitter {
    constructor(session) {
        super();
        this.pingInterval = 10000;
        this.wsEndpoint = session.wsEndpoint;
        this.tokenManager = session.tokenManager;
    }

    connect(forceTokenRefresh = false) {
        this.tokenManager.get(forceTokenRefresh)
        .then(accessToken => {
                // TODO: Handle handshake errors (retry with new token on 401 - expired token)
                this.conn = new WebSocket(
                    this.wsEndpoint,
                    accessToken
                );
                this._bindWsEvents();
            }).catch(error => {
                if (error.status === 400) {
                    // Not retryable
                    this.emit('close', 4000, error.message, true);
                } else if (error.status === 401) {
                    // Not retryable
                    this.emit('close', 4001, error.message, true);
                } else if (error.status === 500) {
                    // Retry
                    this._reconnect();
                    this.emit('close', 5000, error.message, false);
                }
            });
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
        this._clearReconnectAttemptIfExists();
        this.emit('open');
    }

    _onClose(closeEvent) {
        clearTimeout(this.pingTimeoutId);
        const isClientError = [4000, 4001, 4004, 4006].includes(closeEvent.code);
        if (closeEvent.code && !isClientError) {
            this._reconnect();
        }
        this.emit('close', closeEvent.code, closeEvent.reason, isClientError);
    }

    _onError(event) {
        if (event && event.target.readyState === 3) {
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
            this._reconnect();
        }
    }

    _reconnect(forceTokenRefresh = false) {
        this.close();
        this.reconnectAttempts++;
        let reconnectInterval = Math.min(this.reconnectAttempts * 1000, 10000);
        log(`Attempt '${this.reconnectAttempts}', will retry after ${reconnectInterval}ms`);
        this.reconnectId = setTimeout(() => this.connect(forceTokenRefresh), reconnectInterval);
    }

    close() {
        clearTimeout(this.pingTimeoutId);
        if (!this.conn) {
            return;
        }
        this._unbindWsEvents();
        this.conn.close();
        this.conn = null;
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