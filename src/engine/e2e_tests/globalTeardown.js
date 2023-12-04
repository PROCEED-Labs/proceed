const fs = require('fs');
const path = require('path');

module.exports = () => {
  return new Promise((resolve) => {
    global.__engineProcess__.on('exit', () => {
      resolve();
    });
    global.__engineProcess__.kill();
  });
};
