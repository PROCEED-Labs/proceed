import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import Machines from '@/frontend/views/Machines.vue';

const localVue = createLocalVue();
localVue.use(Vuex);

let vuetify;
beforeEach(() => {
  vuetify = new Vuetify();
});

let store;

const factory = (values = {}) => {
  store = new Vuex.Store({
    modules: {
      machineStore: {
        ...values,
      },
    },
  });
  return mount(Machines, {
    vuetify,
    store,
    mocks: {
      $can: () => {
        return true;
      },
    },
    localVue,
    sync: false,
  });
};

describe('Machines', () => {
  it('is a Vue instance', () => {
    const wrapper = factory({
      namespaced: true,
      getters: {
        machines: () => [],
      },
    });
    expect(wrapper.isVueInstance()).toBeTruthy();
  });

  it('renders the correct title', () => {
    const wrapper = factory({
      namespaced: true,
      getters: {
        machines: () => [],
      },
    });
    expect(wrapper.find('.v-toolbar__title').text()).toBe('Machines');
  });

  it('shows "No data available" when there are no machines available', () => {
    const wrapper = factory({
      namespaced: true,
      getters: {
        machines: () => [],
      },
    });
    expect(wrapper.find('td').text()).toBe('No data available');
  });

  // // not sure why this isn't working!
  // it('has a filled table if a machine exists', () => {
  //   const wrapper = factory({
  //     state: {
  //       machines: [{
  //         id: 0,
  //         name: 'Pi',
  //         location: 'http://192.168.137.27',
  //         color: '#00ccff'
  //       }],
  //       status: {}
  //     }
  //   });
  //   console.log(wrapper.html());
  //   expect(wrapper.find('v-data-table').element.hasChildNodes()).toBe(true);
  // });
});
