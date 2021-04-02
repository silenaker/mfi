export interface EventEmitterOnOptions {
  once?: boolean;
}

export default class EventEmitter {
  private eventHandles: any = {};

  on(
    event: string,
    handle: (...args: any[]) => any,
    options?: EventEmitterOnOptions
  ) {
    this.eventHandles[event] = this.eventHandles[event] || [];
    if (this.eventHandles[event].indexOf(handle) !== -1) return;
    // @ts-ignore
    handle.__event_emitter_on_options = options;
    this.eventHandles[event].push(handle);
  }

  off(event: string, handle: (...args: any[]) => any) {
    if (
      this.eventHandles[event] &&
      this.eventHandles[event].indexOf(handle) !== -1
    ) {
      const index = this.eventHandles[event].indexOf(handle);
      this.eventHandles[event].splice(index, 1);
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.eventHandles[event]) {
      const cbs = this.eventHandles[event].slice();
      this.eventHandles[event] = cbs.filter((cb: any) => {
        const options = (cb.__event_emitter_on_options ||
          {}) as EventEmitterOnOptions;
        return !options.once;
      });
      for (let i = 0; i < cbs.length; i++) {
        cbs[i].call(this, ...args);
      }
    }
  }
}
