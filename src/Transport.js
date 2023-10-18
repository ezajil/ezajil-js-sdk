import { EventEmitter } from 'events';
import SDKError from './error/SDKError';

const connectionDetails = {
    wsPath: data => `${data.endpoint}?auth=${data.token}`,
    token: data => data.token
};

const defaults = {
    apiVersion: 2.1
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
        this.pingInterval = 5000;
        this.configuration = Object.assign({}, defaults, config);
        this._connect();
    }

    _connect() {
        this.conn = new WebSocket(
            connectionDetails.wsPath(this.configuration), 
            [connectionDetails.token(this.configuration)]
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
        this.emit('open');
        this.ping();
        this.clearReconnectAttemptIfExists();
    }

    _onClose(closeEvent) {
        this.emit('close', closeEvent.code, closeEvent.reason);
        clearTimeout(this.pingTimeoutId);
        this.reconnect();
    }

    _onError(err) {
        const error = new SDKError(`Error on WS connection: ${err.message}`, null, err);
        this.emit('error', error);
        clearTimeout(this.pingTimeoutId);
    }

    _onMessage(event) {
        if (!!event) {
            let parsed;
            try {
                parsed = JSON.parse(event.data);
                this.emit(parsed.event, parsed.payload);
            } catch (ex) {
                console.error(ex);
                this.emit('message', event.data);
            }
        }
    }

    ping() {
        try {
            if (this.isOpen()) {
                this.conn.send('');
            }
            this.pingTimeoutId = setTimeout(() => {
                this.ping();
            }, this.pingInterval);
        }
        catch (err) {
            const error = new SDKError(`Error on WS ping: ${err.message}`, null, err);
            this.emit('error', error);
        }
    }

    send(message) {
        try {
            this.conn.send(JSON.stringify(message));
        } catch (e) {
            console.error(`Failed to send message: ${message}`, e)
        }
    }

    reconnect() {
        if (!this.reconnectAttempts) {
            this.reconnectAttempts = 0;
        }
        this.reconnectAttempts++;
        this.close();
        let reconnectInterval = Math.min(this.reconnectAttempts * 1000, 10000);
        console.log(`Attempt '${this.reconnectAttempts}', will retry after ${reconnectInterval}ms`);
        this.reconnectId = setTimeout(() => this._connect(), reconnectInterval);
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

    isOpen() {
        return !!this.conn && this.conn.readyState === 1;
    }

    clearReconnectAttemptIfExists() {
        if (this.reconnectId) {
            clearTimeout(this.reconnectId);
        }
        this.reconnectAttempts = 0;
    }
}