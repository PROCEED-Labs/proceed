import Vue from 'vue';
import Vuex from 'vuex';

jest.mock('@proceed/bpmn-helper/src/PROCEED-CONSTANTS.js', function () {
  return {
    generateBpmnId: jest.fn().mockReturnValue(1),
    initXml: jest.fn().mockReturnValue('XML'),
  };
});

import createProcessEditorStore from '@/frontend/stores/process-editor.js';
import { initXml } from '@proceed/bpmn-helper';

Vue.use(Vuex);

/** importing vuetify/dist/vuetify.min.css causes a problem */
let store;
describe('Process Editor Store', () => {
  beforeEach(() => {
    store = new Vuex.Store(createProcessEditorStore());
  });

  describe('actions', () => {
    test('it should set xml', () => {
      store.dispatch('setProcessXml', 'my-custom-xml');
      expect(store.getters.processXml).toEqual('my-custom-xml');
    });
  });
});
