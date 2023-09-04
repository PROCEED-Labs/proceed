/* eslint-disable class-methods-use-this */
const NativeModule = require('@proceed/native-module');
const Bonjour = require('bonjour-service').default;
const exitHook = require('@darkobits/adeiu');

const bonjour = new Bonjour({
  multicast: true, // use udp multicasting
  loopback: true, // receive your own packets
  reuseAddr: true, // set the reu
});

const PROCEED_SERVICE_TYPE = 'proceed';

/**
 * Discovery class that provides the functionality to broadcast this PROCEED
 * engine and finding other engines using mdns (bonjour).
 * @class
 */
class MDNS extends NativeModule {
  constructor() {
    super();
    this.commands = [
      'publish',
      'discover',
      'unpublish',
      'remove_discovered_service',
      'reset_discovery',
      'on_discovered',
      'on_undiscovered',
    ];
    this.published = false;
    this.hostname = '';
    this.port = 0;
    this.txt = '';

    // Start building up an internal list right away
    this.find();
  }

  executeCommand(command, args, send) {
    if (command === 'publish') {
      return this.publish(args);
    }
    if (command === 'discover') {
      return this.discoveredEngines();
    }
    if (command === 'unpublish') {
      return this.unpublish();
    }
    if (command === 'remove_discovered_service') {
      return this.removeDiscoveredService(args);
    }
    if (command === 'reset_discovery') {
      return this.resetDiscovery();
    }
    if (command === 'on_discovered') {
      // register callback for when a machine is discovered
      this.onServiceUpEvent(send);
    }
    if (command === 'on_undiscovered') {
      this.onServiceDownEvent(send);
    }
    return undefined;
  }

  /**
   * Publish this engine as a PROCEED type.
   */
  // eslint-disable-next-line class-methods-use-this
  async publish(args) {
    return new Promise((resolve, reject) => {
      const [hostname, port, txt] = args;
      this.hostname = hostname;
      this.port = port;
      this.txt = txt;

      const service = bonjour.publish({
        name: hostname,
        type: PROCEED_SERVICE_TYPE,
        port,
        txt,
      });
      service.start();

      service.on('error', (error) => {
        console.log('--> Error publishing bonjour service: ', error);
        reject(error);
      });

      service.on('up', () => {
        console.log('--> Published bonjour service: ', hostname);
        this.published = true;
        resolve();
      });

      // Unpublish on exit
      exitHook(async () => {
        await new Promise((resolve2) => {
          bonjour.unpublishAll(() => {
            resolve2();
          });
        });
      });
    });
  }

  async unpublish() {
    return new Promise((resolve) => {
      bonjour.unpublishAll(() => {
        this.published = false;
        resolve();
      });
    });
  }

  /**
   * Start finding other PROCEED engines in the network.
   */
  find() {
    // Note: If we want to know when a service is up or down, we can add event
    // listeners for the 'up' and 'down' events of the browser. Currently we
    // only need the momentarily online services at a specific time, so we do
    // not care when exactly they are added / removed.
    this.browser = bonjour.find({ type: PROCEED_SERVICE_TYPE });
  }

  /**
   * Set function that is triggered when the browser finds a new service
   *
   * @param {Function} cb the send callback that pushes the new service to the universal part
   */
  onServiceUpEvent(cb) {
    this.browser.on(
      'up',
      function (service) {
        cb({
          ip: service.referer.address,
          port: service.port,
          name: service.name,
          txt: service.txt,
        });
      }.bind(this),
    );
  }

  onServiceDownEvent(cb) {
    this.browser.on(
      'down',
      function (service) {
        cb({
          ip: service.referer.address,
          port: service.port,
          name: service.name,
          txt: service.txt,
        });
      }.bind(this),
    );
  }

  /**
   * Removes a service with the given id and port from the list of found services
   *
   * Can be used if a service that is supposedly discovered can't be reached using the published ip and port
   *
   * @param {Array} args contains the ip of the service as its first and the port as its second element
   */
  removeDiscoveredService(args) {
    const [ip, port] = args;
    // const service = this.browser.services.find((s) => s.referer.address === ip && s.port === port);

    // if (service) {
    //   this.browser._removeService(service.fqdn);
    // }
    const oldBrowser = this.browser;
    oldBrowser.stop();
    let knownServices = [...oldBrowser.services];
    let oldUpHandlers = [...this.browser.listeners('up')];
    let oldDownHandlers = [...this.browser.listeners('down')];

    //  goodbye for non-responded / striked service
    const toBeRemovedService = knownServices.find(
      (service) => service.referer.address === ip && service.port === port,
    );
    oldDownHandlers.forEach((cb) => cb(toBeRemovedService));

    const initialUpHandler = function (service) {
      // check if the old browser already knew the service
      // port & host  TODO:-> could be not unique
      if (
        !knownServices.some(
          (s) => s.host === service.host && s.port === service.port,
        ) /* ->  services not known before */
      ) {
        // call the all callbacks from the old browser for new service -> announce them
        oldUpHandlers.forEach((cb) => cb(service));
      }
      // remove the service from the list of known services
      // (in case it goes down and up again) -> ensures check is only done ones
      knownServices = knownServices.filter(
        (s) => !((s) => s.host === service.host && s.port === service.port),
      );
    };

    this.browser = bonjour.find({ type: PROCEED_SERVICE_TYPE }, initialUpHandler);
  }

  /**
   * Resets the discovery of services in the local network and republishes if it is currently publishing
   * (Might be used when connecting to a network after a disconnect)
   */
  async resetDiscovery() {
    this.find();

    if (this.published);
    {
      await this.unpublish();
      await this.publish([this.hostname, this.port, this.txt]);
    }
  }

  /**
   * Return the current list of online (discovered) proceed engines in the network.
   * @param taskID The taskID of the dispatcher task
   */
  async discoveredEngines() {
    // TODO: Ensure that we searched at least for a certain time before
    // returning this list the first time? (Only relevant for instant find()
    // call after startup) -> Could be handled with a retry
    // console.log(this.browser.services);
    return [
      this.browser.services.map((service) => ({
        ip: service.referer.address,
        port: service.port,
        name: service.name,
        txt: service.txt,
      })),
    ];
  }
}

module.exports = MDNS;
