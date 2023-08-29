const ipc = require('node-ipc');

function goToTarget([lat, long, alt = 10, timeout = 180], callback) {
  // target_location: [52.5167824, 13.3238021], //Target location is the only parameter needed
  var target_location;
  const pythonServer = {
    address: '127.0.0.1',
    port: 5005,
  };

  if (lat && long) {
    target_location = [lat, long];
  } else {
    return callback(new Error('No coordinates.'));
  }

  ipc.config.id = 'DeliverPackageCapability';
  ipc.config.retry = 1500; // Wait 1.5s before retry
  ipc.config.silent = false; // Not verbose

  ipc.serveNet(
    5006, //we set the port here because the server is already using the default of 5005.
    'udp4',
    function () {
      // ipc.server.on(
      //     'statusMessage',
      //     function (data) {
      //
      //         let locString = data.loc.split(":")[1];
      //         let locArray = locString.split(",")
      //         let latLongAlt = locArray.map((e) => {
      //             return e.split("=")[1]
      //         })
      //         let bat = data.bat.split("=");
      //         let groundspeed;
      //         if (data.groundspeed != "") {
      //             groundspeed = parseFloat(data.groundspeed).toFixed(3);
      //         } else {
      //             groundspeed = data.groundspeed;
      //         }
      //         console.log([latLongAlt], groundspeed + "m/s", bat[bat.length - 1] + "%", data.mode.split(":")[1])
      //     }
      // );
      ipc.server.on('command', function (data) {
        if (data.Operation) {
          this.stop();
          handleResponse(data, callback);
        }
      });
    },
  );

  ipc.server.on('start', async function () {
    console.log('Server started to listen for commands.');

    ipc.server.emit(pythonServer, 'DeliverPackage', {
      goal: 'GoToTarget',
      id: 'NodeClient',
      alt: alt,
      timeout: timeout,
      latlong: target_location,
    });
    //await timeout(ipc.server.emit(pythonServer, 'TakeOff', {alt: "", id: "NodeClient", message: {}}), 2500)
  });

  ipc.server.start();
}

async function handleResponse(data, callback) {
  if (data.Operation == 'DeliverPackage') {
    if (data.goal == 'GoToTarget') {
      if (data.Status == 'Success') {
        return callback('Success');
      }
    }
  }
}

module.exports = goToTarget;
