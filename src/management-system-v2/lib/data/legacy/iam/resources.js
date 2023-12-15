import { v4 } from 'uuid';
import store from '../store.js';
import { resources } from './migrations/resources-migration.js';
import md5 from 'js-md5';

let resourcesMetaObjects = {};

/**
 * Returns all resources in form of an array
 *
 * @returns {Array} - array containing all resources
 */
export function getResources() {
  return Object.values(resourcesMetaObjects);
}

/**
 * Returns a resource based on resource id
 *
 * @param {String} resourceId - the id of a resource
 * @returns {Array} - array containing all resources
 */
export function getResource(resourceId) {
  return resourcesMetaObjects[resourceId];
}

/**
 * initializes the resources meta information objects
 */
export async function init() {
  resourcesMetaObjects = {};

  // get resources that were persistently stored
  const storedResources = store.get('resources');
  const copyOfStoredResources = JSON.parse(JSON.stringify(storedResources));
  copyOfStoredResources.forEach((resource) => delete resource.id);

  // check if hash is different, to know when the resources-migration file has changed to initiate a new migration
  if (md5(JSON.stringify(copyOfStoredResources)) !== md5(JSON.stringify(resources))) {
    // seed resources database with new resources
    resources.forEach((resource) => {
      resource.id = v4();
      resourcesMetaObjects[resource.id] = resource;
    });
    // set resources store
    store.set('resources', 'resources', Object.values(resourcesMetaObjects));
  } else {
    // set resources store
    store.set('resources', 'resources', storedResources);
    // set resources store cache for quick access
    storedResources.forEach((resource) => {
      resourcesMetaObjects[resource.id] = resource;
    });
  }
}

init();
