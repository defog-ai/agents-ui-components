import { CircleCheck, CircleAlert, Info, CircleX } from "lucide-react";
import { generateUUID } from "../utils/utils";
import React, { createContext, useContext, useSyncExternalStore } from "react";
import { twMerge } from "tailwind-merge";

type MessageType = "success" | "error" | "warning" | "info";

interface Message {
  id: string;
  type: MessageType;
  message: string;
  /** in seconds */
  deleteAfter?: number;
  persist?: boolean;
  time: number;
  deleteInterval: NodeJS.Timeout;
}

type MessagePusher = (
  /** The message to be displayed */
  message: string | Message,
  /** delete this message after given time (in milliseconds). Defaults to 3000 (3 seconds). */
  deleteAfter?: number,
  /**
   * Persist this message.
   * This means that the message will not be deleted even if
   * the delete after time has passed.
   */
  persist?: boolean
) => void;

interface MessageManager {
  success: MessagePusher;
  error: MessagePusher;
  warning: MessagePusher;
  info: MessagePusher;
  clear: (id: number) => void;
  getList: () => Message[];
  subscribe: (listener: Listener) => () => void;
  getServerSnapshot: () => Message[];
}

type Listener = () => void;

/**
 * Provides a message manager with success, error, warning, and info messages.
 * Allows subscribing to messages and getting a list of messages.
 *
 * **Usually used with the MessageMonitor and MessageContext components.**
 *
 * @returns
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
export function MessageManager(): MessageManager {
  let list: Message[] = [];
  let listeners: Listener[] = [];

  const defaultDeleteAfter = 3000;

  const deleteMessage = (id) => {
    list = list.filter((m) => m.id !== id);
    emitChange();
  };

  function addMessage(
    type: MessageType,
    message: Message | string,
    deleteAfter?: number,
    persist?: boolean
  ) {
    const time = performance.now();
    const id = generateUUID();

    list = [
      ...list,
      {
        type: type,
        id,
        message: typeof message === "string" ? message : message?.message,
        time,
        deleteInterval: setTimeout(() => {
          if (persist) return;
          deleteMessage(id);
        }, deleteAfter || defaultDeleteAfter),
      },
    ];
  }

  function success(
    message: string | Message,
    deleteAfter?: number,
    persist?: boolean
  ) {
    addMessage("success", message, deleteAfter, persist);
    emitChange();
  }

  function error(
    message: string | Message,
    deleteAfter?: number,
    persist?: boolean
  ) {
    addMessage("error", message, deleteAfter, persist);
    emitChange();
  }

  function warning(
    message: string | Message,
    deleteAfter?: number,
    persist?: boolean
  ) {
    addMessage("warning", message, deleteAfter, persist);
    emitChange();
  }

  function info(
    message: string | Message,
    deleteAfter?: number,
    persist?: boolean
  ) {
    addMessage("info", message, deleteAfter, persist);
    emitChange();
  }

  function clear() {
    list = [];
  }

  function subscribe(listener: Listener) {
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

interface MessageMonitorProps {
  /**
   * If true, the message monitor will be disabled. Messages will still be pushed to message manager, but nothing will be displayed by this component.
   */
  disabled?: boolean;
  /**
   * Additional classes to be added to the root div. For example, You can choose to make this an absolute div at the bottom/top of a relative container if you want to keep the messages "contained" within the portion of the screen your container is in.
   */
  rootClassNames?: string;
}

/**
 * Provides a message monitor for the MessageManager. This subscribes to the message manager and displays the messages. By default, renders in a fixed div at the top of the screen.
 * @param {MessageMonitorProps} props
 * */
export function MessageMonitor({
  disabled = false,
  rootClassNames = "",
}: MessageMonitorProps) {
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
