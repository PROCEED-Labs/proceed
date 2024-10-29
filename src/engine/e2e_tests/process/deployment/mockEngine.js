const native = require('@proceed/native');
const Nfs = require('@proceed/native-fs');
const Nexpress = require('@proceed/native-express');
const Nconfig = require('@proceed/native-config');
const MockMachine = require('./mockNativeMachine.js');
const Nmdns = require('@proceed/native-mdns');
const Ncapabilities = require('@proceed/native-capabilities');
const Nconsole = require('@proceed/native-console');
const ChildProcessExecutor = require('@proceed/native-vm2');

native.registerModule(new Nfs({ dir: process.argv[2] }));
native.registerModule(new Nexpress());
native.registerModule(new Nconfig({ dir: process.argv[2] }));
native.registerModule(new MockMachine(process.argv[2]));
native.registerModule(new Nmdns());
native.registerModule(new Ncapabilities());
native.registerModule(new Nconsole());
native.registerModule(new ChildProcessExecutor());

native.startEngine({ childProcess: false });
