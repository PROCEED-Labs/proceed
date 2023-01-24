import uuid from 'uuid';

/**
 * Some information might be continuously polled by one or multiple frontends (e.g. machine information, deployment/instance information)
 *
 * This class is supposed to help set up polling for currently needed information and tear down that polling when the information is not needed anymore
 */
export default class PollingHandler {
  /**
   * Creates a new handler that will start polling using the provided function
   *
   * @param {function} pollingFunction the function that contains the polling logic (should return the required information)
   * @param {number} pollingInterval the the delay between consecutive polling attempts (in ms)
   * @param {function} onReceival the function that will be called with the data returned by the pollingFunction
   */
  constructor(pollingFunction, pollingInterval, onReceival) {
    this.keepPolling = true;
    this.pollingCycleId = undefined;

    this.pollingFunction = pollingFunction;
    this.pollingInterval = pollingInterval;
    this.onReceival = onReceival;

    this._pollingLoop();
  }

  /**
   * Will tear down the polling loop
   */
  stopPolling() {
    this.keepPolling = false;
    this.pollingCycleId = undefined;
  }

  /**
   * Will skip the waiting period and start a request
   *
   * a currently active request will be canceled
   */
  async skipWaiting() {
    await this._pollingLoop();
  }

  /**
   * Allows the polling interval of the polling handler to be changed so every subsequent cycle will use the new interval
   *
   * @param {number} newInterval the time the handler should wait between every polling cycle
   */
  changePollingInterval(newInterval) {
    this.pollingInterval = newInterval;
  }

  async _pollingLoop() {
    const cycleId = uuid.v4();
    this.pollingCycleId = cycleId;
    const pollingResult = await this.pollingFunction();

    if (this.keepPolling && this.pollingCycleId === cycleId) {
      await this.onReceival(pollingResult);
    }

    setTimeout(() => {
      if (this.keepPolling && this.pollingCycleId === cycleId) {
        this._pollingLoop();
      }
    }, this.pollingInterval);
  }
}
