/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
const { machine, timer, network } = require('@proceed/system');
const config = require('../configuration/configHandler');
const routes = require('./src/routes/machineInformationRoutes');
const logging = require('../logging/logging');

const DAY = 864000;
const HALFDAY = DAY / 2;
const HOUR = 3600;
const HALFHOUR = HOUR / 2;
const MINUTE = 60;
const TENMINUTES = MINUTE * 10;

/**
 * Property names and corresponding cache timeouts in s.
 */
const PROPERTIES = {
  hostname: Infinity,
  id: Infinity,
  online: 5,
  os: Infinity,
  cpu: 0,
  mem: 5,
  disk: 30,
  battery: 30,
  display: 60,
  network: 10,
  outputs: 30,
  inputs: 30,
};

/**
 * The property names of the machine values that are set/appended by the config.
 */
const CONFIG_PROPERTIES = [
  'port',
  'classes',
  'domains',
  'inputs',
  'outputs',
  'onlineCheckingAddresses',
  'currentlyConnectedEnvironments',
  'name',
  'description',
  'acceptUserTasks',
  'deactivateProcessExecution',
];

const loggingConfigObject = {
  moduleName: 'MACHINE INFORMATION',
};

let instance;

/**
 * @memberof module:@proceed/machine
 * @class
 *
 * Class for requesting information about the machine the engine is running on.
 */
class MachineInformation {
  /**
   * @hideconstructor
   */
  constructor() {
    this.RAMloads = [];
    this.CPUloads = [];
    this.machineInfoCache = new Map();
    this.done = undefined;
    this.logger = logging.getLogger(loggingConfigObject);
  }

  /**
   * Initializes the Machine-Manager component by reading the interval at which cpu and ram
   * information should be fetched
   */
  async init() {
    // Set done promise so the other methods wait for init to finish.
    let succeed;
    this.done = new Promise((resolve) => {
      succeed = resolve;
    });

    this.logger.debug('Initializing the Machine Information module');

    const loadInterval = await config.readConfig('engine.loadInterval');
    if (loadInterval <= 60 && loadInterval >= 0) {
      this.loadInterval = loadInterval;
    } else {
      this.loadInterval = 10; // standard 10
    }
    this.maxLoadsSize = DAY / this.loadInterval;
    this.totalMemMB = (await this.getMachineInformation(['mem'])).mem.total;
    timer.setInterval(this._getRecord.bind(this), this.loadInterval * 1000);

    routes(this);
    succeed();
    return this.done;
  }

  /**
   * Returns information about the device
   * @param {string[]} properties The property names that are to be read
   * @param {object[]} The properties for the provided names
   */
  async getMachineInformation(properties) {
    let _properties = properties;
    if (!properties || properties.length === 0) {
      // create array to request all properties
      _properties = Object.keys(PROPERTIES).concat(CONFIG_PROPERTIES);
    }
    this.logger.trace('Machine information were requested: ' + _properties);

    const machineInfos = {};

    // set 'name' and 'description' which only come from the config and not the machine module
    // if 'name' is empty, set the hostname as default
    if (_properties.includes('name')) {
      const _name = await config.readConfig('name');
      machineInfos.name = _name ? _name : (await machine.getMachineInfo(['hostname']))['hostname'];
    }
    if (_properties.includes('description')) {
      machineInfos['description'] = await config.readConfig('description');
    }

    // properties array to object with values filled from cache or native machine module
    for (const _prop of _properties) {
      const [hit, cached] = this._checkCache(_prop);
      //get value from cache
      if (hit) {
        machineInfos[_prop] = cached;
      } else if (_prop === 'online') {
        const value = await this._checkOnline();
        machineInfos[_prop] = value;
        this._setCache(_prop, value);
      } else {
        // Fetch values from native machine module
        const _tmpMachineValueFromNative = await machine.getMachineInfo([_prop]);

        // Exclude the (non-existent) machine properties that come from the config: object is empty
        if (Object.keys(_tmpMachineValueFromNative).length !== 0) {
          machineInfos[_prop] = _tmpMachineValueFromNative[_prop];
          this._setCache(_prop, _tmpMachineValueFromNative[_prop]);
        }
      }
    }

    if (_properties.includes('cpu')) {
      // Add load averages:
      machineInfos.cpu.loadLastMinute = this._getAverageLoad(MINUTE).CPU;
      machineInfos.cpu.loadLastTenMinutes = this._getAverageLoad(TENMINUTES).CPU;
      machineInfos.cpu.loadLastHalfHour = this._getAverageLoad(HALFHOUR).CPU;
      machineInfos.cpu.loadLastHour = this._getAverageLoad(HOUR).CPU;
      machineInfos.cpu.loadLastHalfDay = this._getAverageLoad(HALFDAY).CPU;
      machineInfos.cpu.loadLastDay = this._getAverageLoad(DAY).CPU;
    }

    // put other config values into machine, call by reference
    await this._mergeConfigWithMachineInfos(machineInfos, _properties);

    this.logger.trace('Returned Machine infomation: ' + JSON.stringify(machineInfos));
    return machineInfos;
  }

  /**
   * Adds some config value to the machine values.
   * Note: Some properties can be set by both, the native machine and
   * the native config module. E.g. 'output' and 'inputs' are determined
   * from the machine but extended by the config values
   *
   * @param {object} machineObj object containing the information from the native machine module; call-by-reference
   * @param {array} relevantPropertiesToReturn array containing the keys that needs to be returned
   */
  async _mergeConfigWithMachineInfos(machineInfos, relevantPropertiesToReturn) {
    let configData = await config.readConfig('machine');
    let relevantConfigData = _filterRelevantConfigKeys(configData, relevantPropertiesToReturn);
    _mergeConfigAndMachine(relevantConfigData, machineInfos);

    configData = await config.readConfig('processes');
    relevantConfigData = _filterRelevantConfigKeys(configData, relevantPropertiesToReturn);
    _mergeConfigAndMachine(relevantConfigData, machineInfos);

    // Filter only the needed config keys to be requested
    function _filterRelevantConfigKeys(configKeys, relevantKeys) {
      const rkObject = {};
      Object.keys(configKeys)
        .filter((key) => relevantKeys.includes(key))
        .forEach((key) => {
          rkObject[key] = configKeys[key];
        });
      return rkObject;
    }

    // merge Keys if object and array,
    // only take config key if not already has a value in machineObj
    // call by reference
    function _mergeConfigAndMachine(configObj, machineObj) {
      Object.keys(configObj).forEach((key) => {
        if (typeof machineObj[key] === 'undefined') {
          machineObj[key] = configObj[key];
        } else if (Array.isArray(machineObj[key])) {
          const newVals = configObj[key].filter((val) => !machineObj[key].includes(val));
          machineObj[key] = machineObj[key].concat(newVals);
        } else if (typeof machineObj[key] === 'object') {
          _mergeConfigAndMachine(configObj[key], machineObj[key]);
        }
      });
    }
  }

  /**
   * Returns an array `[hit, result]` with `hit` being a boolean indicating if
   * the cache was hit or missed and `result` carrying the value, if any. This
   * is needed because all nullish values could also be valid cache hits and
   * thus aren't suitable for cache miss indication.
   * @private
   */
  _checkCache(property) {
    if (this.machineInfoCache.has(property)) {
      // Found entry in cache, but we still need to validate its freshness
      const [entry, timestamp] = this.machineInfoCache.get(property);
      const timeout = PROPERTIES[property];

      if (new Date().getTime() - timestamp > timeout * 1000) {
        // Invalidate cache if older than timeout
        this.machineInfoCache.delete(property);
      } else {
        return [true, entry];
      }
    }
    return [false, null];
  }

  _setCache(property, value) {
    // Store the value and set timestamp
    this.machineInfoCache.set(property, [value, new Date().getTime()]);
  }

  /**
   * Clears the cache. Only necessary for testing.
   */
  _clearCache() {
    this.machineInfoCache.clear();
  }

  /**
   * Calculates the average CPU and RAM load for a given interval
   * @param {number} time One of the supported time frames in seconds
   * @returns {object} An object including the average for the given time
   */
  _getAverageLoad(time) {
    // const tempRAMLoads = [...this.RAMloads].map((s) => parseFloat(s)); // clone
    const tempCPULoads = [...this.CPUloads];
    // if there are not enough snapshots, use all available
    // const RAMlowerBound = tempRAMLoads.length >= time / this.loadInterval
    //  ? tempRAMLoads.length - (time / this.loadInterval) : 0;
    const CPUlowerBound =
      tempCPULoads.length >= time / this.loadInterval
        ? tempCPULoads.length - time / this.loadInterval
        : 0;

    /*
    let RAMsum = 0;
    let RAMcount = 0;
    for (let i = tempRAMLoads.length - 1; i >= RAMlowerBound; i -= 1) {
      RAMsum += tempRAMLoads[i] / this.totalMemMB;
      RAMcount += 1;
    }

    let ramResult = 0;
    if (RAMsum !== 0) {
      ramResult = (1 - (RAMsum / RAMcount)).toFixed(4);
    } else {
      ramResult = 0;
    }
    */

    let CPUsum = 0;
    let CPUcount = 0;
    for (let i = tempCPULoads.length - 1; i >= CPUlowerBound; i -= 1) {
      CPUsum += tempCPULoads[i];
      CPUcount += 1;
    }

    let cpuResult = 0;
    if (CPUsum !== 0) {
      cpuResult = CPUsum / CPUcount;
    } else {
      cpuResult = 0;
    }

    return { RAM: 0, CPU: cpuResult };
  }

  /**
   * Fetches RAM utilization and saves it in the instance's array.
   */
  async _getRecord() {
    const { free } = (await this.getMachineInformation(['mem'])).mem;
    await this.done;
    if (this.RAMloads.length >= this.maxLoadsSize) {
      this.RAMloads.shift();
    }
    this.RAMloads.push(free);

    this._getCPULoadRecord();
  }

  /**
   * Calculates the current CPU utilization and adds it to the instance's CPU array
   */
  async _getCPULoadRecord() {
    const load = (await this.getMachineInformation(['cpu'])).cpu.currentLoad;

    if (this.CPUloads.length >= this.maxLoadsSize) {
      this.CPUloads.shift();
    }
    this.CPUloads.push(load);
  }

  async _checkOnline() {
    const addresses = await config.readConfig('machine.onlineCheckingAddresses');
    const online = (
      await Promise.all(
        addresses.map(
          (address) =>
            new Promise((resolve, reject) => {
              timer.setTimeout(() => {
                resolve(false);
              }, 10000);
              network
                .sendRequest(address, undefined, '/', undefined, false)
                .then(() => resolve(true))
                .catch((err) => resolve(err === 'Status Code was: 301'));
            }),
        ),
      )
    ).includes(true);
    return online;
  }
}

/*
 * Returns the Machine-Manager's instance and creates it if necessary.
 * returns {module:@proceed/machine}
 */
function getInstance() {
  if (!instance) {
    instance = new MachineInformation();
  }
  return instance;
}

module.exports = getInstance();
