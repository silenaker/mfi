import Messager, { Message } from "./Messager";

export default class Service extends Messager {
  constructor(peer: Window = window.parent, acl?: string[]) {
    super(peer, acl);

    if (peer === window) return;

    this.postMessage({ type: "load", event: true }, { ignoreOrigin: true });
  }

  // init
  init(msg: Message, event: MessageEvent) {
    this.peerOrigin = event.origin;
    super.emit("init");
  }
}
