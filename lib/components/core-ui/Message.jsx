import { CircleCheck, CircleAlert, Info, CircleX } from "lucide-react";
import React, { createContext, useContext, useSyncExternalStore } from "react";
import { twMerge } from "tailwind-merge";

/**
 * Provides a message manager with success, error, warning, and info messages.
 * Allows subscribing to messages and getting a list of messages.
 *
 * **Usually used with the MessageMonitor and MessageContext components.**
 *
 * @returns {{
 * success: function,
 * error: function,
 * warning: function,
 * info: function,
 * subscribe: function,
 * getList: function,
 * clear: function,
 * getServerSnapshot: function
 * }}
 *
 * @example
 * // Usage with context:
 * const messageManager = MessageManager();
 * <MessageManagerContext.Provider value={messageManager}>
 *   <MessageMonitor />
 *    <App />
 * </MessageManagerContext.Provider>
 *
 *
 * @example
 * // Core class usage
 * const messageManager = MessageManager();
 * messageManager.success("Success message");
 * messageManager.error("Error message");
 * messageManager.warning("Warning message");
 *
 * messageManager.subscribe(() => {
 *  console.log(messageManager.getList());
 * });
 *
 * messageManager.clear();
 * */
export function MessageManager() {
  let list = [];
  let listeners = [];

  const deleteAfter = 3000;

  const deleteMessage = (id) => {
    list = list.filter((m) => m.id !== id);
    emitChange();
  };

  function addMessage(type, message) {
    const time = performance.now();
    const id = crypto.randomUUID();

    list = [
      ...list,
      {
        type: type,
        id,
        message: typeof message === "string" ? message : message?.message,
        time,
        deleteInterval: setTimeout(() => {
          deleteMessage(id);
        }, deleteAfter),
      },
    ];
  }

  function success(message) {
    addMessage("success", message);
    emitChange();
  }

  function error(message) {
    addMessage("error", message);
    emitChange();
  }

  function warning(message) {
    addMessage("warning", message);
    emitChange();
  }

  function info(message) {
    addMessage("info", message);
    emitChange();
  }

  function clear() {
    list = [];
  }

  function subscribe(listener) {
    listeners = [...listeners, listener];

    return function unsubscribe() {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function emitChange() {
    listeners.forEach((l) => l());
  }

  function getList() {
    return list;
  }

  return {
    success,
    error,
    warning,
    info,
    subscribe,
    getList,
    clear,
    // for ssr purposes
    getServerSnapshot: function () {
      return list;
    },
  };
}

/**
 * Context for the MessageManager.
 *
 * @example
 * const messageManager = MessageManager();
 * <MessageManagerContext.Provider value={messageManager}>
 *  <MessageMonitor />
 *   <App />
 * </MessageManagerContext.Provider>
 * */
export const MessageManagerContext = createContext(MessageManager());

const icons = {
  success: <CircleCheck className="text-lime-500 w-4 h-4" />,
  warning: <CircleAlert className="text-yellow-400 w-4 h-4" />,
  error: <CircleX className="text-rose-500 w-4 h-4" />,
  info: <Info className="text-blue-500 w-4 h-4" />,
};

/**
 * @typedef {Object} MessageMonitorProps
 * @property {boolean} [disabled=false] - If true, the message monitor will be disabled. Messages will still be pushed to message manager, but nothign will be displayed by this component.
 * @property {string} [rootClassNames] - Additional classes to be added to the root div. For example, You can choose to make this an absolute div at the bottom/top of a relative container if you want to keep the messages "contained" within the portion of the screen your container is in.
 */

/**
 * Provides a message monitor for the MessageManager. This subscribes to the message manager and displays the messages. By default, renders in a fixed div at the top of the screen.
 * @param {MessageMonitorProps} props
 * */
export function MessageMonitor({ disabled = false, rootClassNames = "" }) {
  const messageManager = useContext(MessageManagerContext);

  const messages = useSyncExternalStore(
    messageManager.subscribe,
    messageManager.getList,
    messageManager.getServerSnapshot
  );

  return (
    <>
      {!disabled && (
        <div
          className={twMerge(
            "fixed flex flex-col items-center w-full top-0 justify-center z-[100] *:transition-all pointer-events-none",
            rootClassNames
          )}
        >
          {messages.map((message, i) => (
            <div
              key={message.id}
              className={twMerge(
                `agui-item agui-message my-2 flex flex-row gap-2 items-center max-w-[80%] p-2 shadow-md bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 mx-auto rounded-lg max-w-10/12 border animate-fade-in-down`,
                message.type === "success" &&
                  "border-lime-500 dark:border-lime-600",
                message.type === "warning" &&
                  "border-yellow-400 dark:border-yellow-500",
                message.type === "error" &&
                  "border-rose-500 dark:border-rose-600",
                message.type === "info" &&
                  "border-blue-500 dark:border-blue-600"
              )}
            >
              <span className="dark:text-gray-200">{icons[message.type]}</span>
              <span className="grow">{message.message}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
