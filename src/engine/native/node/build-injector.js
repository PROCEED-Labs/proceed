const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Install vm2 deps
exec('npm install', { cwd: __dirname }, (err, stdout, stderr) => {
  if (err) {
    console.log(err);
    return;
  }
  // Remove bin (causes copy error)
  fs.removeSync(path.join(__dirname, './node_modules/.bin'));
  // Copy to build dir
  fs.copySync(
    path.join(__dirname, './node_modules'),
    path.join(__dirname, '../../../../build/engine/node_modules')
  );
});
