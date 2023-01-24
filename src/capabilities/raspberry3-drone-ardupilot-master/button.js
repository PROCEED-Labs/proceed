const Gpio = require('onoff').Gpio; //include onoff to interact with the GPIO
const ipc = require('node-ipc');

function button([gpio_pin = 17], cb) {
  const defaultArgs = {
    pythonServer: {
      address: '127.0.0.1',
      port: 5005,
    },
  };

  const pushButton = new Gpio(gpio_pin, 'in', 'both'); //use GPIO pin 17 as input, and 'both' button presses, and releases should be handled

  function unexportOnClose() {
    //function to run when exiting program
    console.log('Received SIGINT. Press Control-D to exit.');
    pushButton.unexport(); // Unexport Button GPIO to free resources
  }

  process.on('SIGINT', unexportOnClose);
  pushButton.watch(function (err, value) {
    //Watch for hardware interrupts on pushButton GPIO, specify callback function
    if (err) {
      //if an error
      console.error('There was an error', err); //output error message to console
      return;
    }
    console.log('BUTTON WAS PRESSED - SENDING MESSAGE');
    pushButton.unwatchAll();
    cb([null]);
  });
}

module.exports = button;
