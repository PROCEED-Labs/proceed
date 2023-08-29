/* eslint-disable class-methods-use-this */
const NativeModule = require('@proceed/native-module');
const os = require('os');
const machineUUID = require('machine-uuid');
const si = require('systeminformation');
const ping = require('ping');
const http = require('http');

const onlineAddresses = ['clients3.google.com', '1.1.1.1'];

/**
 * @class
 */
class Machine extends NativeModule {
  constructor() {
    super();
    this.commands = ['read_device_info'];
  }

  executeCommand(command, args) {
    if (command === 'read_device_info') {
      return this.getDeviceInfo(args);
    }
    return undefined;
  }

  /**
   * Fetches the device information by using the OS module and systeminformation
   * package.
   * @param {String[]} args The properties to be read
   * @returns {object[]} A single object array containing the result value
   */
  async getDeviceInfo(args) {
    const [properties] = args;
    const deviceInfo = {};

    if (properties.includes('hostname')) {
      deviceInfo.hostname = os.hostname();
    }
    if (properties.includes('id')) {
      deviceInfo.id = await machineUUID();
    }
    if (properties.includes('os')) {
      const osInfo = await si.osInfo();
      deviceInfo.os = {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
      };
    }
    if (properties.includes('cpu')) {
      const cpu = await si.cpu();
      const currentLoad = (await si.currentLoad()).currentload;
      deviceInfo.cpu = {
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        processors: cpu.processors,
        speed: cpu.speed,
        currentLoad,
      };
    }
    if (properties.includes('mem')) {
      const mem = await si.mem();
      const memLoad = 1 - (mem.available / mem.total).toFixed(2);
      deviceInfo.mem = {
        total: mem.total,
        // not mem.free because it it the physical free RAM. But Linux has buffers and caches that are just for performance improvement and can be freed easily. So, free =~ free + buffers/caches
        free: mem.available,
        // not mem.used, because it includes buffers/cache/slab
        used: mem.active,
        load: memLoad,
      };
    }
    if (properties.includes('disk')) {
      const fsSize = await si.fsSize();
      const disks = (await si.blockDevices()).filter((device) => device.mount !== '');

      deviceInfo.disk = fsSize.map((fss) => {
        const disktype = disks.find((disk) => disk.mount === fss.mount);
        return {
          type: disktype ? disktype.physical : '',
          total: fss.size,
          free: fss.size - fss.used,
          used: fss.used,
        };
      });
    }
    if (properties.includes('battery')) {
      const battery = await si.battery();
      deviceInfo.battery = {
        hasBattery: battery.hasbattery,
        percent: battery.percent,
        maxCapacity: battery.maxcapacity,
      };
    }
    if (properties.includes('display')) {
      const graphics = await si.graphics();
      deviceInfo.display = graphics.displays.map((display) => ({
        currentResX: display.currentResX,
        currentResY: display.currentResY,
      }));
    }
    if (properties.includes('network')) {
      const network = await si.networkInterfaces();
      const interfaces = Object.values(os.networkInterfaces()).flat();
      deviceInfo.network = network.map((netw) => {
        const _interfacev4 = interfaces.find((_if) => _if.address === netw.ip4);
        const _interfacev6 = interfaces.find((_if) => _if.address === netw.ip6);
        return {
          type: netw.type,
          ip4: netw.ip4,
          netmaskv4: _interfacev4 !== undefined ? _interfacev4.netmask : '',
          netmaskv6: _interfacev6 !== undefined ? _interfacev6.netmask : '',
          ip6: netw.ip6,
          mac: netw.mac,
        };
      });
    }
    if (properties.includes('outputs')) {
      const graphics = await si.graphics();
      const outputs = graphics.displays.some(
        (display) => display.currentResX + display.currentResY > 1,
      )
        ? ['Screen']
        : undefined;
      deviceInfo.outputs = outputs;
    }

    return [deviceInfo];
  }
}

module.exports = Machine;
