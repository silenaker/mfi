import Messager, { Message } from "./Messager";

export default class Service extends Messager {
  constructor(acl?: string[]) {
    super(parent, acl);

    if (parent === window) return;

    this.registerRequestHandlers({
      key: "_inner",
      handlers: {
        init(this: Service, msg: Message, event: MessageEvent) {
          this.setPeerOrigin(event.origin);
          this.localEmit("init");
        },
      },
    });

    this.postMessage({ type: "load", event: true });
  }
}
