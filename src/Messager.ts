import { uuid } from "./utils";
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

export interface RequestHandlers {
  [reqType: string]: (
    msg: Message,
    event: MessageEvent
  ) => Partial<Message> | Promise<Partial<Message>> | void;
}

export interface RequestHandlersModule {
  key: string;
  acl?: Array<string | RegExp>;
  excludeDefaultAcl?: boolean;
  handlers: RequestHandlers;
}

export interface ResponseHandlers {
  [respType: string]: (msg: Message, event: MessageEvent) => any;
}

export default class Messager extends EventEmitter {
  private peer: Window;
  private peerOrigin?: string;
  private acl?: Array<string | RegExp>;

  private requestHandlers: { [key: string]: RequestHandlersModule } = {
    default: {
      key: "default",
      handlers: {},
    },
  };

  private responseHandlers: ResponseHandlers = {
    // type: received
    received() {
      // no-op
    },

    // type: data
    data(msg: Message) {
      return msg.data;
    },

    // type: error
    error(msg: Message) {
      return new MessagerError(msg.message);
    },
  };

  constructor(peer: Window, acl?: string[]) {
    super();
    this.peer = peer;
    this.acl = acl;

    addEventListener("message", (event) => {
      const incomingMessage = event.data || {};

      if (
        incomingMessage.category !== MessageCategory.Request ||
        this.peer !== event.source ||
        !this.aclMatch(incomingMessage, event.origin)
      ) {
        return;
      }

      this.handlerRequest(event).then((outgoingMessage) => {
        this.peer.postMessage(outgoingMessage, event.origin);
      });
    });
  }

  private getRequestHandlersModule(incomingMessage: Message) {
    for (const module in this.requestHandlers) {
      if (this.requestHandlers[module].handlers[incomingMessage.type]) {
        return this.requestHandlers[module];
      }
    }
  }

  private aclMatch(incomingMessage: Message, requestSrc: string) {
    let acl = this.acl;
    let module = this.getRequestHandlersModule(incomingMessage);

    if (module && module.acl) {
      acl = module.excludeDefaultAcl || !acl ? module.acl : acl.concat(module.acl);
    }

    if (!acl) return true;

    return acl.some((pattern: string | RegExp) => {
      if (pattern instanceof RegExp) {
        return pattern.test(requestSrc);
      } else if (pattern === "*") {
        return true;
      } else {
        return pattern === requestSrc;
      }
    });
  }

  private handlerRequest(event: MessageEvent): Promise<Message> {
    const incomingMessage: Message = event.data;

    if (incomingMessage.event) {
      super.emit(incomingMessage.type, incomingMessage.data);
      return Promise.resolve({
        type: "received",
        id: incomingMessage.id,
        category: MessageCategory.Response,
      });
    }

    const module = this.getRequestHandlersModule(incomingMessage);
    const requestHandler = module && module.handlers[incomingMessage.type];
    const handleError = (err: any) => {
      return {
        type: "error",
        id: incomingMessage.id,
        category: MessageCategory.Response,
        message:
          err instanceof Error
            ? err.message
            : typeof err === "object"
            ? JSON.stringify(err)
            : err,
      };
    };
    const handleResult = (res: Partial<Message> | undefined) => ({
      type: "data",
      id: incomingMessage.id,
      category: MessageCategory.Response,
      ...(res || {}),
    });

    if (requestHandler) {
      try {
        let result = requestHandler.call(this, incomingMessage, event);

        if (isPromise(result)) {
          return (result as Promise<Partial<Message>>)
            .then((res) => handleResult(res))
            .catch((err) => handleError(err));
        } else {
          return Promise.resolve(handleResult(result as Partial<Message>));
        }
      } catch (err) {
        return Promise.resolve(handleError(err));
      }
    } else {
      return Promise.resolve(
        handleError(`Unknown message type: ${incomingMessage.type}`)
      );
    }
  }

  protected setPeerOrigin(peerOrigin: string) {
    this.peerOrigin = peerOrigin;
  }

  postMessage(
    msg: Omit<Message, "id" | "category">,
    options?: any
  ): Promise<any> {
    options = { timeout: 2000, ...(options || {}) };

    let messageHandler: any = null;

    return Promise.race([
      new Promise((resolve, reject) => {
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

          const result = this.handleResponse(event);
          if (result instanceof Error) {
            reject(result);
          } else {
            resolve(result);
          }

          removeEventListener("message", messageHandler);
          messageHandler = null;
        };

        addEventListener("message", messageHandler);
      }),
      new Promise((resolve, reject) => {
        setTimeout(() => {
          if (messageHandler) {
            removeEventListener("message", messageHandler);
            messageHandler = null;
          }
          reject(
            new MessagerTimeoutError(`request timeout: ${JSON.stringify(msg)}`)
          );
        }, options.timeout);
      }),
    ]);
  }

  handleResponse(event: MessageEvent) {
    const handler = this.responseHandlers[event.data.type];
    if (handler) return handler.call(this, event.data, event);

    return new MessagerUnknownResponseTypeError(event.data.type);
  }

  emit(event: string, data?: any) {
    return this.postMessage({ type: event, data, event: true });
  }

  protected localEmit(event: string, data?: any) {
    super.emit(event, data);
  }

  registerRequestHandlers(
    handlersModule: RequestHandlers | RequestHandlersModule
  ) {
    if (!handlersModule.handlers) {
      handlersModule = {
        key: "default",
        handlers: handlersModule as RequestHandlers,
      };
    }

    this.requestHandlers[
      (handlersModule as RequestHandlersModule).key
    ] = handlersModule as RequestHandlersModule;
  }

  registerResponseHandlers(handlers: ResponseHandlers) {
    for (const respType in handlers) {
      if (Object.prototype.hasOwnProperty.call(handlers, respType)) {
        this.responseHandlers[respType] = handlers[respType];
      }
    }
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

export class MessagerUnknownResponseTypeError extends MessagerError {
  constructor(message?: string) {
    super(message);
    this.name = "MessagerUnknownResponseTypeError";
  }
}
