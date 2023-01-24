import { mount, createLocalVue } from '@vue/test-utils';
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import ProcessInformation from '@/frontend/views/Process.vue';

/*
 * Currently doesn't work because of a problem with bpmn-js/lib modules
 */

jest.mock('@/frontend/main.js', () => ({
  store: {},
}));

// mock to avoid error: Not implemented: HTMLCanvasElement.prototype.getContext
jest.mock('jspdf', () => {});

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
      processStore: {
        ...values,
      },
      departmentStore: {
        namespaced: true,
        getters: {
          getDepartments: () => [],
        },
      },
      userPreferencesStore: {
        namespaced: true,
        actions: {
          resetUIPreferences: () => {},
          setSelectedProcessView: () => {},
        },
      },
    },
  });
  return mount(ProcessInformation, {
    vuetify,
    store,
    localVue,
    mocks: {
      $can: (action, data) => {
        if (action === 'share') {
          return Array.isArray(data) && data.length;
        }

        return true;
      },
    },
    sync: false,
  });
};

describe('Process.vue', () => {
  it('renders the correct title', () => {
    const wrapper = factory({
      state: {
        processes: [],
      },
      getters: {
        processes() {
          return [];
        },
      },
      namespaced: true,
    });
    expect(wrapper.find('.v-toolbar__title').text()).toBe('Processes');
  });
});
