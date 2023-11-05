import { EventEmitter } from 'events';
import { log, logError } from './utils/sdkLogger';

const clientErrorCodePattern = /^3\d{3}$/;

const connectionDetails = {
    wsPath: data => `${data.endpoint}?auth=${data.token}`
};

const defaults = {
    apiVersion: 1.0
};

const WS_EVENTS = {
    OPEN: 'open',
    CLOSE: 'close',
    ERROR: 'error',
    MESSAGE: 'message'
};

export default class Transport extends EventEmitter {
    constructor(config) {
        super();
        this.pingInterval = 10000;
        this.configuration = Object.assign({}, defaults, config);
        this._connect();
    }

    _connect() {
        this.conn = new WebSocket(
            connectionDetails.wsPath(this.configuration)
        );
        this._bindWsEvents();
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
        const isClientError = clientErrorCodePattern.test(closeEvent.code);
        if (closeEvent.code && !isClientError) {
            this._reconnect();
        }
        this.emit('close', closeEvent.code, closeEvent.reason, isClientError);
    }

    _onError(err) {
        // clearTimeout(this.pingTimeoutId);
        this.emit('error', 5000, err);
    }

    _onMessage(event) {
        if (!!event) {
            let parsed;
            try {
                parsed = JSON.parse(event.data);
                if (parsed.event === 'ready') {
                    this._ping();
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
            this.emit('error', 5001, err);
        }
    }

    _reconnect() {
        if (!this.reconnectAttempts) {
            this.reconnectAttempts = 0;
        }
        this.reconnectAttempts++;
        this._close();
        let reconnectInterval = Math.min(this.reconnectAttempts * 1000, 10000);
        log(`Attempt '${this.reconnectAttempts}', will retry after ${reconnectInterval}ms`);
        this.reconnectId = setTimeout(() => this._connect(), reconnectInterval);
    }

    _close() {
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