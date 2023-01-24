const ipc = require('node-ipc');

function initDrone([timeout = 15], callback) {
  const pythonServer = {
    address: '127.0.0.1',
    port: 5005,
  };

  ipc.config.id = 'DeliverPackageCapability';
  ipc.config.retry = 1500; // Wait 1.5s before retry
  ipc.config.silent = true; // Not verbose

  ipc.serveNet(
    5006, //we set the port here because the server is already using the default of 5005.
    'udp4',
    function () {
      ipc.server.on('statusMessage', function (data) {
        console.log(data);
        let locString = data.loc.split(':')[1];
        let locArray = locString.split(',');
        let latLongAlt = locArray.map((e) => {
          return e.split('=')[1];
        });
        let bat = data.bat.split('=');
        let groundspeed;
        if (data.groundspeed != '') {
          groundspeed = parseFloat(data.groundspeed).toFixed(3);
        } else {
          groundspeed = data.groundspeed;
        }
        latLongAlt[3] = data.alt;
        //console.log([latLongAlt], groundspeed + "m/s", bat[bat.length - 1] + "%", data.mode.split(":")[1])
        return callback(latLongAlt);
      });

      ipc.server.on('command', function (data) {
        if (data.goal == 'initDrone' && data.Status == 'Completed') {
          //console.log(data)
          this.stop();
          callback([null, data]);
        }
      });
    }
  );

  ipc.server.on('start', async function () {
    console.log('Initialising the drone for a manual flight. Timeout is ' + timeout);

    return ipc.server.emit(pythonServer, 'DeliverPackage', {
      goal: 'initDrone',
      timeout: timeout,
      id: 'NodeClient',
    });
  });
  ipc.server.start();
}

module.exports = initDrone;
