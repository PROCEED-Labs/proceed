import { Folder } from '../folder-schema.js';
import store from './store.js';

// @ts-ignore
let firstInit = !global.foldersMetaObject;

export let foldersMetaObject: { [Id: string]: Folder } =
  // @ts-ignore
  global.foldersMetaObject || (global.foldersMetaObject = {});

/** initializes the folders meta information objects */
export function init() {
  if (!firstInit) return;

  const storedFolders = store.get('folders') as any[];

  // set roles store cache for quick access
  storedFolders.forEach((folder) => (foldersMetaObject[folder.id] = folder));
}
init();
