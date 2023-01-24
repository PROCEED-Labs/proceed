// following this tutorial https://blog.k.io/atech/creating-a-simple-custom-event-system-in-javascript
class Event {
  constructor(eventName) {
    this.eventName = eventName;
    this.callbacks = [];
  }

  registerCallback(callback) {
    this.callbacks.push(callback);
  }

  unregisterCallback(callback) {
    const index = this.callbacks.indexOf(callback);

    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  fire(data) {
    //copy callback array to prevent changes while iterating
    const callbacks = this.callbacks.slice(0);

    callbacks.forEach((callback) => {
      callback(data);
    });
  }
}

module.exports = Event;
