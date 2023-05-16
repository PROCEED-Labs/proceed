export type IPCListener = (err?: Error, ...args: any[]) => Promise<boolean> | boolean | void;

abstract class IPC {
  private callbacks: Map<string, IPCListener> = new Map();

  emit(_message: [string, string, any[]]) {
    throw new Error(`The subclass ${this.constructor.name} doesn't implement emit().`);
  }

  listen(taskID: string, callback: IPCListener) {
    // Store the callback
    this.callbacks.set(taskID, callback);
  }

  async receive(taskID: string, [err, ...args]: [Error | null, any[]]) {
    if (!this.callbacks.has(taskID)) {
      // TODO: consider logging unhadled events
      return;
    }
    // Call stored callback with arguments
    const shouldRemove = await this.callbacks.get(taskID)(err, ...args);

    //const used = process.memoryUsage().heapUsed / 1024 / 1024;
    //console.log(`${Math.round(used * 100) / 100} MB heap used`);

    if (shouldRemove) {
      this.callbacks.delete(taskID);
    }
  }
}

export default IPC;
