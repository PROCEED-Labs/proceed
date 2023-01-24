const DeviceUUID = require('device-uuid');
const platform = require('platform');
import { canvasFingerprint } from './helper';
import { WebCPU } from 'webcpu';

// const onlineAddresses = ['clients3.google.com', '1.1.1.1'];

/**
 * @class
 */
export class Machine {
  constructor() {
    this.commands = ['read_device_info'];
    // this.totalmem = os.totalmem();
    this.totalmem = navigator.deviceMemory;
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

    if (properties.includes('id')) {
      const hash = canvasFingerprint();
      deviceInfo.id = hash;
    }

    if (properties.includes('os')) {
      deviceInfo.os = {
        platform: platform.os.architecture,
        distro: platform.os.family,
        release: platform.os.version,
      };
    }

    if (properties.includes('cpu')) {
      const cpuResult = await WebCPU.detectCPU();

      deviceInfo.cpu = {
        cores: cpuResult['reportedCores'],
        physicalCores: cpuResult['estimatedPhysicalCores'],
        processors: null,
        speed: null,
        currentLoad: null,
      };
    }

    if (properties.includes('mem')) {
      if (window.performance.memory) {
        const _memory = window.performance.memory;
        const _total = _memory.jsHeapSizeLimit;
        const _free = _memory.jsHeapSizeLimit - _memory.usedJSHeapSize;
        deviceInfo.mem = {
          total: _total,
          free: _free,
          load: Math.round(_free / _total),
        };
      } else {
        deviceInfo.mem = {
          total: null,
          free: null,
          load: null,
        };
      }
    }

    if (properties.includes('disk')) {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { usage, quota } = await navigator.storage.estimate();
        deviceInfo.disk = {
          type: null,
          total: quota,
          free: quota - usage,
          used: usage,
        };
      }

      deviceInfo.disk = {
        type: null,
        total: null,
        free: null,
        used: null,
      };
    }

    if (properties.includes('battery')) {
      const battery = await navigator.getBattery();
      deviceInfo.battery = {
        hasBattery: true,
        percent: Math.round(battery.level * 100),
        isCharging: battery.charging,
        timeremaining: battery.dischargingTime,
      };
    }

    if (properties.includes('display')) {
      deviceInfo.display = {
        currentResX: window.screen.width,
        currentResY: window.screen.height,
      };
    }

    if (properties.includes('inputs')) {
      const inputs = [];
      if ('ontouchstart' in document.documentElement) {
        inputs.push('Touchscreen');
      }

      const _devices = await navigator.mediaDevices.enumerateDevices();
      _devices.forEach((device) => {
        if (device.kind === 'audioinput' && !inputs.includes('Microphone')) {
          inputs.push('Microphone');
        }
        if (device.kind === 'videoinput' && !inputs.includes('Camera')) {
          inputs.push('Camera');
        }
      });

      // const mobileAndTabletCheck = function() {
      //   let check = false;
      //   (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
      //   return check;
      // };
      // if (mobileAndTabletCheck()) {
      //   inputs.push('')
      // }
      deviceInfo.inputs = inputs;
    }

    if (properties.includes('outputs')) {
      const outputs = [];
      if (window.screen.width + window.screen.height > 0) {
        outputs.push('Screen');
      }
      const _devices = await navigator.mediaDevices.enumerateDevices();
      _devices.forEach((device) => {
        if (device.kind === 'audiooutput' && !outputs.includes('Speaker')) {
          outputs.push('Speaker');
        }
      });
      deviceInfo.outputs = outputs;
    }

    console.log({ deviceInfo });

    return [deviceInfo];
  }
}
