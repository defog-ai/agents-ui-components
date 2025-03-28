import { generateUUID } from "./utils";

interface WebSocketManagerOptions {
  /**
   * The url of the websocket.
   */
  url?: string | null;
  /**
   * Called when the connection is opened.
   */
  onOpen?: (ev: Event) => void;
  /**
   * Called when the connection is closed.
   */
  onClose?: (ev: CloseEvent) => void;
  /**
   * Called when an error occurs.
   */
  onError?: (ev: Event) => void;
  /**
   * Called when a message is received.
   */
  onMessage?: (ev: MessageEvent) => void;
  /**
   * The delay between reconnect attempts.
   */
  reconnectDelay?: number;
  /**
   * The maximum number of reconnect attempts.
   */
  reconnectMaxAttempts?: number;
  /**
   * Whether to send a ping message every 5 seconds to keep the connection alive.
   */
  ping?: boolean;
  /**
   * Whether to automatically reconnect if the connection is closed.
   */
  autoReconnect?: boolean;
  /**
   * The timeout for the connection. Calls the onTimeout callback if the connection times out.
   */
  connectionTimeoutAfter?: number;
  /**
   * Called when the connection times out.
   */
  onTimeout?: () => void;
  /**
   * Start connect immediately on creation.
   */
  connectImmediately?: boolean;
}

export interface WebSocketManager {
  /**
   * Sends a message to the websocket.
   */
  send: (data: any, isPing?: boolean) => void;
  /**
   * Connects to the websocket. Closes the connection if it's already connected, and starts a new connection.
   */
  connect: () => void;
  /**
   * Closes the connection to the websocket and destroys the manager.
   */
  destroy: () => void;
  /**
   * Adds an event listener to the websocket.
   */
  addEventListener: (event: string, cb: (event: any) => void) => void;
  /**
   * Removes an event listener from the websocket.
   */
  removeEventListener: (
    event: string,
    cb: (event: any) => void,
    listenerIdx: number
  ) => void;
  /**
   * Checks if the websocket is connected.
   */
  isConnected: () => boolean;
  /**
   * Whether to log messages.
   */
  setLogging: (on: boolean) => void;
  /**
   * Returns the socket.
   */
  getSocket: () => WebSocket | null;
  /**
   * Returns the event listeners.
   */
  getEventListeners: () => any[];
}

const defaultConfig = {
  url: null,
  onMessage: () => {},
  onOpen: () => {},
  onClose: () => {},
  onError: () => {},
  onTimeout: () => {},
  reconnectDelay: 2000,
  reconnectMaxAttempts: 3,
  ping: false,
  autoReconnect: true,
  connectionTimeoutAfter: 10000,
  connectImmediately: true,
};

/**
 * Manages a websocket connection.
 */
export function createWebsocketManager(
  options: WebSocketManagerOptions
): WebSocketManager {
  const config = { ...defaultConfig, ...options };
  const {
    url,
    reconnectDelay,
    reconnectMaxAttempts,
    ping,
    autoReconnect,
    connectionTimeoutAfter,
  } = config;

  let socket: WebSocket | null = null;
  let log: boolean = false;
  let connectionTimeout: NodeJS.Timeout | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let lastPingTime: number = Date.now();
  // -1 so it goes to 0 on 1st connect
  let reconnectCount: number = -1;
  let warnCount: number = 0;
  let destroyed: boolean = false;

  // cache when creating for reconnects
  let _onMessage = config.onMessage;
  let _onOpen = config.onOpen;
  let _onClose = config.onClose;
  let _onError = config.onError;
  let _onTimeout = config.onTimeout;
  const id = generateUUID(8);

  let eventListeners: any[] = [];

  function isConnected() {
    return socket && socket.readyState === WebSocket.OPEN;
  }

  function logger(...args: any[]) {
    if (!log) return;
    console.groupCollapsed(id + ": " + (args.length && args[0]));
    console.log(...args);
    console.groupEnd();
  }

  function connect() {
    reconnectCount++;
    clearTimeouts();

    if (socket && socket.close && socket.readyState !== WebSocket.CLOSED) {
      socket.close();
    }

    socket = new WebSocket(url);

    logger("connecting");

    // timeout if we aren't connected by connectionTimeoutAfter seconds
    connectionTimeout = setTimeout(() => {
      logger("connection timed out");

      if (socket.readyState === WebSocket.CONNECTING) {
        socket.close();
        if (reconnectCount < reconnectMaxAttempts) {
          reconnectCount++;
          setTimeout(connect, reconnectDelay);
        } else {
          if (_onTimeout && typeof _onTimeout === "function") {
            _onTimeout();
          }
        }
      }
    }, connectionTimeoutAfter);

    socket.onopen = function (e) {
      logger("reconnected to", url);

      // reset reconnect count
      reconnectCount = 0;
      // clear the connection and reconnect timeouts
      clearTimeouts();

      if (_onOpen && typeof _onOpen === "function") {
        _onOpen(e);
      }
    };

    socket.onerror = function (e) {
      logger("error", url, e);

      if (_onError && typeof _onError === "function") {
        _onError(e);
      }
    };

    socket.onmessage = function (e) {
      if (_onMessage && typeof _onMessage === "function") {
        _onMessage(e);
      }
    };

    // add all other event listeners
    eventListeners.forEach((l) => {
      if (l.disabled) return;

      let event = l.event;
      let cb = l.cb;
      l.disabled = false;
      socket.addEventListener(event, cb);
    });

    socket.onclose = function (e) {
      logger("closed", e);

      if (_onClose && typeof _onClose === "function") {
        _onClose(e);
      }

      clearTimeouts();

      // connect in reconnectDelay ms
      // but only if the close event was not clean
      if (e.wasClean || destroyed) {
        return;
      }

      if (autoReconnect) {
        logger(`reconnecting to ${url}, in ${reconnectDelay} ms`);
      }

      reconnectTimeout = setTimeout(() => {
        if (!autoReconnect) return;
        // if we have reached the maximum number of reconnect attempts, stop reconnecting
        if (reconnectCount >= reconnectMaxAttempts) {
          logger(
            "Maximum number of reconnect attempts reached. Stopping reconnecting."
          );
          return;
        }

        logger("reconnecting to", url);
        connect();
      }, reconnectDelay);
    };
  }

  function send(data, isPing = false) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      if (reconnectCount >= 1 && !isPing && warnCount % 10 == 0) {
        // means we've reconnected once
        logger(
          "Connection was previously lost and there might be connectivity issues while running this. Consider refreshing the page for best performance."
        );
        warnCount++;
      }
      socket.send(JSON.stringify(data));
    }
  }

  function setLogging(on = false) {
    log = on;
  }

  function addEventListener(event, cb) {
    if (log) {
      logger("adding event listeners");
    }
    if (socket) {
      socket.addEventListener(event, cb);
      eventListeners.push({
        event,
        cb,
        disabled: false,
      });
    }
  }

  function pinger() {
    const delta = Date.now() - lastPingTime;
    // keep pinging every 5 seconds if websocket is connected
    if (delta > 5000) {
      lastPingTime = Date.now();
      send({ ping: "ping" }, true);
    }
    window.requestAnimationFrame(pinger);
  }

  function removeEventListener(event, cb, listenerIdx) {
    logger("removing event listeners");
    if (socket) {
      socket.removeEventListener(event, cb);
      // remove from eventListeners array
      if (listenerIdx !== -1) {
        eventListeners[listenerIdx].disabled = true;
      }
    }
  }

  function getSocket() {
    return socket;
  }

  function getEventListeners() {
    return eventListeners;
  }

  function clearConnectionTimeout() {
    clearTimeout(connectionTimeout);
  }

  function clearReconnectTimeout() {
    clearTimeout(reconnectTimeout);
  }

  function clearTimeouts() {
    clearConnectionTimeout();
    clearReconnectTimeout();
  }

  function destroy() {
    clearTimeouts();
    logger("Closing socket and destroying manager", socket);
    destroyed = true;

    if (socket) {
      socket.close();
    }

    logger("destroyed");
  }

  if (ping) {
    window.requestAnimationFrame(pinger);
  }

  if (config.connectImmediately) {
    connect();
  }

  return {
    send,
    destroy,
    connect,
    addEventListener,
    removeEventListener,
    isConnected,
    setLogging,
    getSocket,
    getEventListeners,
  };
}
