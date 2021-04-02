import EventEmitter, { EventEmitterOnOptions } from "./EventEmitter";
import Messager, { RequestHandlers, ResponseHandlers } from "./Messager";

interface LoaderOptions {
  container?: HTMLElement;
  hidden?: boolean;
  initTimeout?: number;
  requestHandlers?: RequestHandlers;
  responseHandlers?: ResponseHandlers;
}

export default class ServiceLoader extends EventEmitter {
  private container: HTMLElement;
  private iframe: HTMLIFrameElement;
  private initTimeout?: number;
  private messager: Messager;
  private pending: Promise<any>;
  private selfEvents = ["loading", "load", "init", "error"];

  constructor(url: string, options: LoaderOptions = {}) {
    super();

    this.container = options.container || document.body;
    this.initTimeout = options.initTimeout;
    this.iframe = document.createElement("iframe");
    this.iframe.src = url;

    this.on(
      "init",
      (messager: Messager) => {
        if (options.requestHandlers) {
          messager.registerRequestHandlers(options.requestHandlers);
        }
        if (options.responseHandlers) {
          messager.registerResponseHandlers(options.responseHandlers);
        }
      },
      { once: true }
    );

    if (options.hidden) {
      this.iframe.hidden = true;
    } else {
      this.iframe.style.width = "100%";
      this.iframe.style.height = "100%";
      this.iframe.style.border = "none";
      setTimeout(() => {
        super.emit("loading", this.container);
      }, 0);
    }

    this.container.appendChild(this.iframe);
    this.messager = new Messager(this.iframe.contentWindow as Window);
    this.messager.on("close", () => this.container.removeChild(this.iframe), {
      once: true,
    });

    const initPromise = new Promise<void>((resolve, reject) => {
      this.messager.on(
        "load",
        () => {
          super.emit("load", this.container);
          this.messager.postMessage({ type: "init" }).then(() => {
            super.emit("init", this.messager);
            resolve();
          }, reject);
        },
        { once: true }
      );
    });

    if (!options.initTimeout) {
      this.pending = initPromise;
    } else {
      const timeoutPromise = new Promise((resolve, reject) => {
        setTimeout(
          () => reject(new ServiceLoaderIFrameError("init timeout")),
          this.initTimeout
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
          .postMessage({ type: "close", data, event: true })
          .then(() => {
            this.container.removeChild(this.iframe);
          });
      });
    }
  }

  emit(event: string, data?: any) {
    return this.pending.then(() => {
      return this.messager.postMessage({ type: event, data, event: true });
    });
  }

  on(
    event: string,
    handler: (...args: any[]) => any,
    options?: EventEmitterOnOptions
  ) {
    if (this.selfEvents.indexOf(event) !== -1) {
      super.on(event, handler, options);
    } else {
      this.messager.on(event, handler, options);
    }
  }

  off(event: string, handler: (...args: any[]) => any) {
    if (this.selfEvents.indexOf(event) !== -1) {
      super.off(event, handler);
    } else {
      this.messager.off(event, handler);
    }
  }

  postMessage(type: string, data?: any, transfer?: Transferable[]) {
    return this.pending.then(() =>
      this.messager.postMessage({ type, data, transfer })
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
