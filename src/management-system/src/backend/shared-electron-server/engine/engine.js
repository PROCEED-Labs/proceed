import native from '@proceed/native';
import Nfs from '@proceed/native-fs';
import Nkoa from '@proceed/native-koa';
import Nconfig from '@proceed/native-config';
import Nmachine from '@proceed/native-machine';
import Nmdns from '@proceed/native-mdns';
import Ncapabilities from '@proceed/native-capabilities';
import Nconsole from '@proceed/native-console';
import VM2 from '@proceed/native-vm2';
import NMQTT from '@proceed/native-mqtt';
import path from 'path';
import fse from 'fs-extra';

import { getAppDataPath } from '../data/fileHandling.js';

async function initEngine(silentMode = true) {
  // The dir where the native part of the engine is writing files to
  let appDir = getAppDataPath();
  const FILES_DIR = path.join(appDir, 'Engine');

  await fse.ensureDir(FILES_DIR);

  native.registerModule(new Nfs({ dir: FILES_DIR }));
  native.registerModule(new Nkoa());
  native.registerModule(new Nconfig({ dir: FILES_DIR }));
  native.registerModule(new Nmachine());
  native.registerModule(new Nmdns());
  native.registerModule(new Ncapabilities({ dir: FILES_DIR }));
  native.registerModule(new Nconsole());
  native.registerModule(new VM2());
  native.registerModule(new NMQTT());

  if (typeof window !== 'undefined') {
    // Set this flag to disable the window overwrite by the UI componenet of the
    // PROCEED engine
    window.PROCEED_DONT_WRITE_WINDOW = true;
  }

  await native.startEngine({ childProcess: false, silentMode });

  return native;
}

// The single init promise which we can return on every call
let INIT_PROMISE = null;

export default async (silentMode) => {
  if (!INIT_PROMISE) {
    INIT_PROMISE = initEngine(silentMode);
  }
  return INIT_PROMISE;
};
