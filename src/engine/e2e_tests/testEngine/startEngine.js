const native = require('@proceed/native');
const Nfs = require('@proceed/native-fs');
const Nexpress = require('@proceed/native-express');
const Nconfig = require('@proceed/native-config');
const Nmachine = require('@proceed/native-machine');
const Nmdns = require('@proceed/native-mdns');
const Ncapabilities = require('@proceed/native-capabilities');
const Nconsole = require('@proceed/native-console');
const fs = require('fs-extra');
const path = require('path');

// remove data_files directory to prevet errors due to faulty json files
const dataFilesPath = path.resolve(__dirname, 'data_files');
if (fs.existsSync(dataFilesPath) && fs.lstatSync(dataFilesPath).isDirectory()) {
  fs.removeSync(dataFilesPath);
}

native.registerModule(new Nfs({ dir: __dirname }));
native.registerModule(new Nexpress());
native.registerModule(new Nconfig({ dir: __dirname }));
native.registerModule(new Nmachine());
native.registerModule(new Nmdns());
native.registerModule(new Ncapabilities());
native.registerModule(new Nconsole());

native.startEngine({ childProcess: true });
