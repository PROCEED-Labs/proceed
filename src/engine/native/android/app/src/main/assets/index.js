window.document.addEventListener('DOMContentLoaded', () => {
  class androidIPC extends PROCEED.IPC {
    constructor() {
      super();
      window.ipcReceive = this.ipcReceive.bind(this);
    }
    emit(message) {
      window.Android.postToNative(JSON.stringify(message));
    }
    ipcReceive(message) {
      const [taskID, args] = message;
      this.receive(taskID, args);
    }
  }
  PROCEED.init({}, new androidIPC());
});
