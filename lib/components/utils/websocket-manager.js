import setupBaseUrl from "./setupBaseUrl";

export function setupWebsocketManager(
  url = setupBaseUrl("ws", "editor"),
  onMessage = () => {}
) {
  let socket = null;
  let log = false;
  let timeout = null;
  let lastPingTime = Date.now();
  // -1 so it goes to 0 on 1st connect
  let reconnectCount = -1;
  let warnCount = 0;
  // cache when creating for reconnects
  let _onMessage = onMessage;
  let eventListeners = [];

  function connect() {
    return reconnect();
  }

  function isConnected() {
    return socket && socket.readyState === WebSocket.OPEN;
  }

  function reconnect() {
    reconnectCount++;
    return new Promise((resolve, reject = () => {}) => {
      clearTimeout(timeout);

      if (socket && socket.close) {
        socket.close();
      }

      socket = new WebSocket(url);

      socket.onopen = function (e) {
        if (log) {
          // console.log(e);
          console.log(new Date().toLocaleString(), "reconnected to", url);
        }

        clearTimeout(timeout);
        resolve();
      };

      socket.onerror = function (e) {
        if (log) {
          console.log(new Date().toLocaleString(), url, e);
        }
        // reject("Can't connect to", url);
      };
      socket.onmessage = _onMessage;

      // add all other event listeners
      eventListeners.forEach((l) => {
        if (l.disabled) return;

        let event = l.event;
        let cb = l.cb;
        l.disabled = false;
        socket.addEventListener(event, cb);
      });

      socket.onclose = function (e) {
        if (log) {
          console.log(new Date().toLocaleString(), url, e);
          // console.log("closed", url);
          // console.log("reconnecting to", url);
        }
        // connect in 1 second

        timeout = setTimeout(() => {
          reconnect();
        }, 1000);
      };
    });
  }

  function send(data, isPing = false) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      if (reconnectCount >= 1 && !isPing && warnCount % 10 == 0) {
        // means we've reconnected once
        // message.warning(
        //   "Connection was previously lost and there might be connectivity issues while running this. Please refresh the page for best performance."
        // );
        console.log(
          "Connection was previously lost and there might be connectivity issues while running this. Consider refreshing the page for best performance."
        );
        warnCount++;
      }
      socket.send(JSON.stringify(data));
    }
  }

  function logging(on = false) {
    log = on;
  }

  function addEventListener(event, cb) {
    if (socket) {
      socket.addEventListener(event, cb);
      // push returns new length of the array so last
      // element has index return_val - 1
      return (
        eventListeners.push({
          event,
          cb,
          disabled: false,
        }) - 1
      );
    }
    return -1;
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

  function clearSocketTimeout() {
    clearTimeout(timeout);
  }

  function getEventListeners() {
    return eventListeners;
  }

  window.requestAnimationFrame(pinger);

  return connect()
    .then(() => {
      return {
        send,
        reconnect,
        addEventListener,
        removeEventListener,
        isConnected,
        logging,
        clearSocketTimeout,
        getSocket,
        getEventListeners,
      };
    })
    .catch((e) => {});
}
