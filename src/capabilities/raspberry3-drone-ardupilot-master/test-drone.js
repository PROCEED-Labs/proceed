const ipc = require('node-ipc');

const pythonServer = {
  address: '127.0.0.1',
  port: 5005,
};

const TEL = [52.512904, 13.322384];
const MAR = [52.5167824, 13.3238021];
ipc.serveNet(
  5006, //we set the port here because the server is already using the default of 5005.
  'udp4',
  function () {
    ipc.server.on('statusMessage', function (data) {
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
      console.log(
        [latLongAlt],
        groundspeed + 'm/s',
        bat[bat.length - 1] + '%',
        data.mode.split(':')[1],
      );
    });

    ipc.server.on('command', function (data) {
      if (data.Operation) {
        //console.log(data);
        this.stop();
        handleResponse(data);
      }
    });
  },
);

async function handleResponse(data) {
  if (data.Operation == 'DeliverPackage') {
    if (data.goal == 'testDrone') {
      if (data.Status == 'Success') {
        return callback('Success');
      }
    }
  }
}

ipc.server.start();

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

ipc.server.on('start', async function () {
  var targetLoc = MAR;

  ipc.server.emit(pythonServer, 'DeliverPackage', {
    goal: 'testDrone',
    id: 'NodeClient',
    alt: 10,
    latlong: targetLoc,
  });
});
