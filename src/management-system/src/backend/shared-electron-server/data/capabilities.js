import store from './store.js';
import { getDiscovered } from '../network/capabilities/discovery.js';
import eventHandler from '../../../frontend/backend-api/event-system/EventHandler.js';

let known = [];

eventHandler.on('store_capabilitiesChanged', () => {
  mergeCapabilities();
});

eventHandler.on('discovery_capabilitiesChanged', () => {
  mergeCapabilities();
});

function mergeCapabilities() {
  const discovered = getDiscovered();

  const added = store.get('capabilities');

  const onlyDiscovered = discovered.filter(
    (capability) => !added.some((sCapability) => sCapability.id === capability.id)
  );

  const newKnown = [];

  added.forEach((capability) => newKnown.push(capability));
  onlyDiscovered.forEach((capability) => newKnown.push(capability));

  const oldKnown = known;
  known = newKnown;
  eventHandler.dispatch('capabilitiesChanged', {
    capabilities: known,
    oldCapabilities: oldKnown,
  });
}

export function getCapabilities() {
  return [...known];
}
