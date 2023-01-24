// following this tutorial https://blog.k.io/atech/creating-a-simple-custom-event-system-in-javascript
const Event = require('./Event.js');

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
