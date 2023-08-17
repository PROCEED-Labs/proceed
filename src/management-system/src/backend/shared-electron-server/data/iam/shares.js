import { v4 } from 'uuid';
import bcrypt from 'bcryptjs';
import store from '../store.js';
import { TYPE_USER, TYPE_LINK } from '../../../../shared-frontend-backend/constants/index.js';
import { config } from '../../../server/iam/utils/config.js';

export let sharesMetaObjects = {};

const resourceStoreMapping = {
  Process: 'processes',
  Project: 'processes',
  Template: 'processes',
};

// function to create random string, which is appended to url, for public shares
function getRandomString(length) {
  var randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var result = '';
  for (var i = 0; i < length; i++) {
    result += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
  }
  return result;
}

function addOrUpdateShare(share) {
  if (!sharesMetaObjects[share.resourceType]) {
    sharesMetaObjects = {
      ...sharesMetaObjects,
      [share.resourceType]: { [share.resourceId]: { [share.sharedWith]: share } },
    };
  }
  if (!sharesMetaObjects[share.resourceType][share.resourceId]) {
    sharesMetaObjects[share.resourceType] = {
      ...sharesMetaObjects[share.resourceType],
      [share.resourceId]: { [share.sharedWith]: share },
    };
  }
  if (!sharesMetaObjects[share.resourceType][share.resourceId][share.sharedWith]) {
    sharesMetaObjects[share.resourceType][share.resourceId] = {
      ...sharesMetaObjects[share.resourceType][share.resourceId],
      [share.sharedWith]: share,
    };
  }
}

function shareExists(share) {
  if (
    !sharesMetaObjects[share.resourceType] ||
    !sharesMetaObjects[share.resourceType][share.resourceId]
  ) {
    return false;
  } else {
    Object.values(sharesMetaObjects[share.resourceType][share.resourceId]).some((sh) => {
      switch (sh.type) {
        case TYPE_USER:
          return (
            (sh.sharedWith === share.sharedWith && sh.resourceId === share.resourceId) || // checks if share in general exists
            (sh.resourceId === share.resourceId && // checks if share exists with the same values
              sh.permissions == share.permissions &&
              sh.type == share.type) ||
            sh.id === share.id
          );
        case TYPE_LINK:
          return sh.type == share.type && sh.resourceId === share.resourceId;
        default:
          return false;
      }
    });
  }
}

/**
 * Returns shares in form of an array
 *
 * @returns {Promise<Array>} - array containing shares
 */
export async function getShares() {
  return Object.values(Object.values(Object.values(sharesMetaObjects)[0]))
    .map((obj) => Object.values(obj))
    .flat();
}

/**
 * Returns a share based on share id
 *
 * @param {String} shareId - the id of a share
 * @returns {Promise<Array>} - array containing all shares
 */
export async function getShare(shareId) {
  const shares = await getShares();
  return shares.find((share) => share.id === shareId);
}

/**
 * Creates a new share
 *
 * @param {Object} share - the new share object
 * @param {Number} share.permissions - allowed permissions (mandatory)
 * @param {String} share.resourceType - type of resource (mandatory)
 * @param {String} share.resourceId - id of resource (mandatory)
 * @param {0|1|2} share.type - type of sharing (mandatory) - 0 = sharing from user to user, 1 = sharing from user to group, 2 = link sharing
 * @param {String} share.sharedWith - id of a user (mandatory if not link sharing)
 * @param {String} share.password - password for a link sharing (only for type link, optional)
 * @param {Date} share.expiredAt - date when a sharing should expire (optional)
 * @param {String} share.note - a note for users that receive the sharing (optional)
 * @returns {Promise<Object>} - new share object
 */
export async function addShare(share) {
  if (shareExists(share)) {
    throw new Error('share already exists!');
  }

  share.resourceType = share.resourceType[0].toUpperCase() + share.resourceType.slice(1); //ensure capital types
  const resources = store.get(resourceStoreMapping[share.resourceType]);
  const resource = resources.find((resource) => resource.id === share.resourceId);

  if (resource) {
    share.resourceOwner = resource.owner;
  } else {
    throw new Error('Resource not found!');
  }

  if (share.type === TYPE_LINK) {
    const saltRounds = 10;
    share.password = share.password ? await bcrypt.hash(share.password, saltRounds) : null;
    share.token = getRandomString(15);
    share.sharedWith = share.token;
    share.url = config.MS_URL;
  }

  // set creation date
  const createdOn = new Date().toUTCString();
  share.createdOn = createdOn;
  share.updatedOn = createdOn;

  // set share id
  const id = v4();
  share.id = id;
  if (shareExists(share)) {
    throw new Error('Share with same id already exists!');
  }

  if (!share.permissions) share.permissions = 1; // default permissions
  if (!share.expiredAt) share.expiredAt = null; // default

  // store share in local cache
  addOrUpdateShare(share);

  // store share in db
  store.add('shares', share);

  return share;
}

/**
 * Updates a share based on share id
 *
 * @param {String} shareId - the id of a share object
 * @param {Object} updates - the updated share object properties
 * @param {Number} updates.permissions - allowed permissions (optional)
 * @param {String} updates.password - password for a link sharing (only for type link, optional)
 * @param {Date} updates.expiredAt - date when a sharing should expire (optional)
 * @param {String} updates.note - a note for users that receive the sharing (optional)
 * @returns {Promise<Object>} - updated share object
 */
export async function updateShare(shareId, updates) {
  const share = await getShare(shareId);
  if (!share) {
    throw new Error('Share not found!');
  }

  if (share.resourceId !== updates.resourceId || share.resourceType !== updates.resourceType) {
    throw new Error("Id of resource or type of resource doesn't match!");
  }

  if (updates.password && share.type === TYPE_LINK) {
    const saltRounds = 10;
    share.password = await bcrypt.hash(updates.password, saltRounds);
  }

  if (updates.note) share.note = updates.note;
  if (updates.permissions) share.permissions = updates.permissions;
  if (updates.expiredAt) share.expiredAt = updates.expiredAt;

  // set new updated on time
  const updatedOn = new Date().toUTCString();
  share.updatedOn = updatedOn;

  // update share in local cache
  addOrUpdateShare(share);

  // store share in db
  store.update('shares', shareId, share);

  return share;
}

/**
 * Deletes a share based on share id
 *
 * @param {Object} shareId - id share object
 * @returns {Promise<String>} - id share object
 */
export async function deleteShare(shareId) {
  const share = await getShare(shareId);
  if (!share) {
    throw new Error('Share not found!');
  }

  const shareTemp = share;
  // delete share in local cache
  delete sharesMetaObjects[share.resourceType][share.resourceId][share.sharedWith];

  // delete share in db
  store.remove('shares', shareId);

  return shareTemp;
}

/**
 * initializes the shares meta information objects
 */
export async function init() {
  sharesMetaObjects = {};

  // get resources that were persistently stored
  const storedShares = store.get('shares');

  // set resources store
  store.set('shares', 'shares', storedShares);

  // set resources store cache for quick access
  storedShares.forEach((share) => {
    addOrUpdateShare(share);
  });
}

init();
