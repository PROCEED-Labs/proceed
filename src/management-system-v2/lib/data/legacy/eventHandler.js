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

class EventHandler {
  constructor() {
    this.events = {};
  }

  addEvent(eventName) {
    if (this.events[eventName]) {
      return;
    }

    this.events[eventName] = new Event(eventName);
  }

  dispatch(eventName, data) {
    let event = this.events[eventName];

    if (!event) {
      event = new Event(eventName);
      this.events[eventName] = event;
    }

    event.fire(data);
  }

  on(eventName, callback) {
    let event = this.events[eventName];

    if (!event) {
      event = new Event(eventName);
      this.events[eventName] = event;
    }

    event.registerCallback(callback);

    return callback;
  }

  off(eventName, callback) {
    const event = this.events[eventName];

    if (event && event.callbacks.some((storedCallback) => storedCallback === callback)) {
      event.unregisterCallback(callback);
    }
  }
}

module.exports = new EventHandler();
module.exports.EventHandler = EventHandler;
