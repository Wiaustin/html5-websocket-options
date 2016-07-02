'use strict';

const NodeWebSocket = require('ws');
const noop = () => {};

/**
 * Creates something similar to a WebApi MessageEvent
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
 *
 * @param {Object} target
 * @param {String|Blob|ArrayBuffer} data
 */
const MessageEvent = function (target, data) {
    this.bubbles = false;
    this.cancelable = false;
    this.cancelBubble = false;
    this.currentTarget = this;
    this.data = data;
    this.eventPhase = 0;
    this.srcElement = this;
    this.target = this;
    this.timeStamp = Date.now();
    this.type = 'message';
};

// @todo CloseEvent

/**
 * Creates something similar to a HTML5 WebSocket
 *
 * @param {String} url
 */
const WebSocket = function (url, protocols) {

    if (!(this instanceof WebSocket)) {
        throw new TypeError("Constructor WebSocket requires 'new'.");
    }

    this.url = url;
    this.protocol = protocols;
    this.readyState = this.CONNECTING;
    this.bufferedAmount = 0;

    // DOM Level 0
    this.onopen = noop;
    this.onclose = noop;
    this.onerror = noop;
    this.onmessage = noop;

    const ws = new NodeWebSocket(url, protocols);

    // DOM Level 2
    const eventListeners = {
        open: [],
        close: [],
        message: [],
        error: [],
    };

    /**
     * @param  {String} type
     * @param  {Function} listener
     */
    this.addEventListener = (type, listener) => {
        const listeners = eventListeners[type];
        if (Array.isArray(listeners)) {
            if (!listeners.some(fn => fn === listener)) {
                listeners.push(listener);
            }
        }
    };

    /**
     * @param  {String} type
     * @param  {Function} listener
     */
    this.removeEventListener = (type, listener) => {
        const listeners = eventListeners[type];
        if (Array.isArray(listeners)) {
            eventListeners[type] = listeners.filter(fn => fn !== listener);
        }
    };

    this.send = (data) => {
        ws.send(data, error => {
            if (error) {
                eventListeners.error.forEach(fn => fn(error));
                this.onerror(error);
            }
        });
    };

    this.close = () => {
        ws.close();
        if (this.readyState === this.CONNECTING) {
            // Browser's WebSocket emits a `close` event when
            // transitioning from CONNECTING to CLOSING
            process.nextTick(() => {
                ws.emit('close');
            });
        }
        this.readyState = this.CLOSING;
    };

    ws.on('open', () => {
        this.readyState = this.OPEN;
        eventListeners.open.forEach(fn => fn());
        this.onopen();
    });

    ws.on('close', () => {
        this.readyState = this.CLOSED;
        eventListeners.close.forEach(fn => fn());
        this.onclose();
    });

    ws.on('message', data => {
        // https://developer.mozilla.org/en-US/docs/Web/Events/message
        const messageEvent = new MessageEvent(this, data);
        eventListeners.message.forEach(fn => fn(messageEvent));
        this.onmessage(messageEvent);
    });

    ws.on('error', error => {
        eventListeners.error.forEach(fn => fn(error));
        this.onerror(error);
    });
};

WebSocket.prototype.CONNECTING = 0;
WebSocket.prototype.OPEN = 1;
WebSocket.prototype.CLOSING = 2;
WebSocket.prototype.CLOSED = 3;

module.exports = WebSocket;
