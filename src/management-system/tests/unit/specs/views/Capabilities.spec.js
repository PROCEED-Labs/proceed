import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import Vuetify from 'vuetify/dist/vuetify';

import Capabilities from '@/frontend/views/Capabilities.vue';

import createCapabilityStore from '@/frontend/stores/capability.js';
import createMachineStore from '@/frontend/stores/machine.js';
import DataInterface from './../../mocks/DataInterface.js';

const localVue = createLocalVue();
localVue.use(Vuex);

let vuetify;
beforeEach(() => {
  vuetify = new Vuetify();

  DataInterface.prototype.get.mockReturnValue([]);
  DataInterface.prototype.set.mockReset();
});

const factory = () => {
  const capabilityStore = createCapabilityStore();
  const machineStore = createMachineStore();

  const store = new Vuex.Store({
    modules: {
      capabilityStore,
      machineStore,
    },
  });
  store.dispatch('capabilityStore/loadCapabilities');
  return mount(Capabilities, {
    vuetify,
    store,
    localVue,
    sync: false,
  });
};

describe('Capabilities.vue', () => {
  test('is a Vue instance', () => {
    const wrapper = factory();
    expect(wrapper.isVueInstance()).toBeTruthy();
  });

  it('renders the correct title', () => {
    const wrapper = factory();
    expect(wrapper.find('.v-toolbar__title').text()).toBe('Capabilities');
  });
});
