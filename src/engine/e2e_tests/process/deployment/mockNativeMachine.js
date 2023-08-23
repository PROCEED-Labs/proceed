const Machine = require('@proceed/native-machine');
const fs = require('fs');
const path = require('path');

class MockMachine extends Machine {
  constructor(mockFolderPath) {
    super();
    this.mockMachineInfo = JSON.parse(
      fs.readFileSync(path.resolve(mockFolderPath, 'machine.json'), 'utf8'),
    );
  }

  async getDeviceInfo(args) {
    const info = await super.getDeviceInfo(args);

    Object.keys(info[0]).forEach((key) => {
      if (this.mockMachineInfo[key]) {
        info[0][key] = this.mockMachineInfo[key];
      }
    });

    return info;
  }
}

module.exports = MockMachine;
