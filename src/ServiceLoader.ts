import EventEmitter, { EventEmitterOnOptions } from "./EventEmitter";
import Messager, { Message } from "./Messager";

interface LoaderOptions {
  hidden?: boolean;
  timeout?: number;
  ignoreTimeout?: boolean;
}

interface MessageHandlers {
  [key: string]: (msg: Message) => Error | { [key: string]: any } | undefined;
}

export default class ServiceLoader extends EventEmitter {
  container: HTMLElement;
  iframe: HTMLIFrameElement;
  iframeLoadTimeout: number = 5000;
  messager: Messager;
  pending: Promise<any>;
  selfEvents = ["loading", "load", "init", "error"];

  constructor(
    url: string,
    container: HTMLElement = document.body,
    options: LoaderOptions = {},
    messageHandlers: MessageHandlers = {}
  ) {
    super();

    this.container = container;
    if (options.timeout) {
      this.iframeLoadTimeout = options.timeout;
    }
    if (messageHandlers) {
      this.on("init", (messager) => Object.assign(messager, messageHandlers), {
        once: true,
      });
    }

    this.iframe = document.createElement("iframe");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.border = "none";
    this.iframe.src = url;
    // this.iframe.hidden = true;

    if (options.hidden) {
      this.container.appendChild(this.iframe);
    } else {
      this.container.appendChild(this.iframe);
      setTimeout(() => {
        super.emit("loading", this.container);
      }, 0);
    }

    this.messager = new Messager(this.iframe.contentWindow as Window);

    this.messager.on("close", () => this.container.removeChild(this.iframe), {
      once: true,
    });

    const initPromise = new Promise<any>((resolve, reject) => {
      this.messager.on(
        "load",
        () => {
          this.messager
            .postMessage({ type: "init" }, { ignoreOrigin: true })
            .then(resolve, reject)
            .then(() => {
              this.iframe.hidden = false;
              super.emit("load", this.container);
              super.emit("init", this.messager);
            });
        },
        { once: true }
      );
    });

    if (options.ignoreTimeout) {
      this.pending = initPromise;
    } else {
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(
          () =>
            reject(
              new ServiceLoaderIFrameError(
                `iframe 加载超时, url: ${url}, timeout: ${this.iframeLoadTimeout}`
              )
            ),
          this.iframeLoadTimeout
        );
      });
      this.pending = Promise.race([initPromise, timeoutPromise]);
    }

    this.pending.catch((err) => {
      super.emit("error", err);
    });
  }

  close({ data, immediate }: any = {}) {
    if (immediate) {
      this.container.removeChild(this.iframe);
    } else {
      return this.pending.then(() => {
        return this.messager
          .postMessage(
            { type: "close", data, event: true },
            { ignoreOrigin: true }
          )
          .then(() => {
            this.container.removeChild(this.iframe);
          });
      });
    }
  }

  emit(event: string, data?: any) {
    return this.pending.then(() => {
      return this.messager.postMessage(
        { type: event, data, event: true },
        { ignoreOrigin: true }
      );
    });
  }

  on(
    event: string,
    handler: (...args: any[]) => any,
    options?: EventEmitterOnOptions
  ) {
    if (this.selfEvents.includes(event)) {
      super.on(event, handler, options);
    } else {
      this.pending.then(() => {
        this.messager.on(event, handler, options);
      });
    }
  }

  off(event: string, handler: (...args: any[]) => any) {
    if (this.selfEvents.includes(event)) {
      super.off(event, handler);
    } else {
      this.pending.then(() => {
        this.messager.off(event, handler);
      });
    }
  }

  postMessage(type: string, data?: any, transfer?: Transferable[]) {
    return this.pending.then(() =>
      this.messager.postMessage(
        { type, data, transfer },
        { ignoreOrigin: true }
      )
    );
  }
}

export class ServiceLoaderError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "ServiceLoaderError";
  }
}

export class ServiceLoaderIFrameError extends ServiceLoaderError {
  constructor(message?: string) {
    super(message);
    this.name = "ServiceLoaderIFrameError";
  }
}
