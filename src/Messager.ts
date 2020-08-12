import { v4 as uuid } from "uuid";
import EventEmitter from "./EventEmitter";

function isPromise(obj: any) {
  return (
    !!obj &&
    (typeof obj === "object" || typeof obj === "function") &&
    typeof obj.then === "function"
  );
}

export enum MessageCategory {
  Request,
  Response,
}

export interface Message {
  type: string;
  id: string;
  category: MessageCategory;
  message?: string;
  data?: any;
  event?: boolean;
  transfer?: Transferable[];
}

export default class Messager extends EventEmitter {
  peer: Window;
  peerOrigin?: string;
  acl?: string[];

  constructor(peer: Window, acl?: string[]) {
    super();
    this.peer = peer;
    this.acl = acl;

    const aclMatch = (target: string) => {
      return this.acl?.some((entry: string | RegExp) => {
        if (entry instanceof RegExp) {
          return entry.test(target);
        } else if (entry === "*") {
          return true;
        } else {
          return entry === target;
        }
      });
    };

    window.addEventListener("message", async (event) => {
      const incomingMessage: Message = event.data || {};
      let outgoingMessage: Partial<Message>;

      if (
        incomingMessage.category !== MessageCategory.Request ||
        this.peer !== event.source ||
        (this.acl && !aclMatch(event.origin)) // acl control
      ) {
        return;
      }

      if (incomingMessage.event) {
        super.emit(incomingMessage.type, incomingMessage.data);
        outgoingMessage = {
          type: "received",
          id: incomingMessage.id,
          category: MessageCategory.Response,
        };
        // @ts-ignore
      } else if (this[incomingMessage.type]) {
        // @ts-ignore
        outgoingMessage = this[incomingMessage.type](incomingMessage, event);
        if (isPromise(outgoingMessage)) {
          outgoingMessage = await (outgoingMessage as any);
        }
        outgoingMessage = {
          type: "data",
          id: incomingMessage.id,
          category: MessageCategory.Response,
          ...(outgoingMessage || {}),
        };
      } else {
        outgoingMessage = {
          type: "error",
          id: incomingMessage.id,
          category: MessageCategory.Response,
          message: `Unknown message type: ${incomingMessage.type}`,
        };
      }

      this.peer.postMessage(outgoingMessage, event.origin);
    });
  }

  postMessage(
    msg: Omit<Message, "id" | "category">,
    options?: any
  ): Promise<any> {
    options = Object.assign({ timeout: 2000 }, options);

    let messageHandler: any = null;

    return Promise.race([
      new Promise((resolve, reject) => {
        if (options.ignoreOrigin || this.peerOrigin) {
          const transfer = msg.transfer;
          delete msg.transfer;
          const message: Message = {
            ...msg,
            id: uuid(),
            category: MessageCategory.Request,
          };

          let peerOrigin =
            !options.ignoreOrigin && this.peerOrigin ? this.peerOrigin : "*";

          this.peer.postMessage(message, peerOrigin, transfer);

          messageHandler = (event: MessageEvent) => {
            if (
              (peerOrigin !== "*" && event.origin !== peerOrigin) ||
              event.source !== this.peer ||
              !event.data ||
              event.data.category !== MessageCategory.Response ||
              event.data.id !== message.id
            ) {
              return;
            }

            const result = this.handleMessage(event);
            if (result instanceof Error) {
              reject(result);
            } else {
              resolve(result);
            }

            window.removeEventListener("message", messageHandler);
            messageHandler = null;
          };

          window.addEventListener("message", messageHandler);
        } else {
          reject(new MessagerError("peerOrigin is necessary but it is null"));
        }
      }),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (messageHandler) {
            window.removeEventListener("message", messageHandler);
            messageHandler = null;
          }
          reject(
            new MessagerTimeoutError(`消息响应超时: ${JSON.stringify(msg)}`)
          );
        }, options.timeout);
      }),
    ]);
  }

  handleMessage(event: MessageEvent) {
    const handle = `handle${event.data.type.replace(/^\w/, (s: string) =>
      s.toUpperCase()
    )}`;
    // @ts-ignore
    if (this[handle]) return this[handle](event.data);

    return new MessagerUnknownMessageTypeError(event.data.type);
  }

  // type: received
  handleReceived() {
    // no-op
  }

  // type: data
  handleData(msg: Message) {
    return msg.data;
  }

  // type: error
  handleError(msg: Message) {
    return new MessagerError(msg.message);
  }

  emit(event: string, data?: any) {
    return this.postMessage({ type: event, data, event: true });
  }
}

export class MessagerError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "MessagerError";
  }
}

export class MessagerTimeoutError extends MessagerError {
  constructor(message?: string) {
    super(message);
    this.name = "MessagerTimeoutError";
  }
}

export class MessagerUnknownMessageTypeError extends MessagerError {
  constructor(message?: string) {
    super(message);
    this.name = "MessagerUnknownMessageTypeError";
  }
}
