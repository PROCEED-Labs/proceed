import * as R from 'ramda';
import { processInterface, eventHandler } from '@/frontend/backend-api/index.js';
import { ensureCorrectProceedNamespace } from '@proceed/bpmn-helper';
import { mergeIntoObject } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

let xmlChagedCallback;

/**
 * For one process, if opened in Editor
 */
export default function createProcessEditorStore() {
  const initialState = {
    processXml: null, // the xml of the main process
    forceUpdateXml: null, // mostly used to signal to the modeler that a new xml has to be imported
    elementCapabilityMapping: {},
    library: {
      data: '',
      capabilities: [],
    },
    processDefinitionsId: null,
    subprocessId: null,
    instanceId: null,
    version: null,
    editingDisabled: false,
    lostConnection: false,
    modeler: null,
    currentView: 'modeler', // which view is currently displayed (e.g. 'modeler', 'xml-viewer', 'html-editor', 'script-editor')
    selectedElement: null,
  };

  const getters = {
    id(state) {
      return state.processDefinitionsId;
    },
    subprocessId(state) {
      return state.subprocessId;
    },
    instanceId(state) {
      return state.instanceId;
    },
    version(state) {
      return state.version;
    },
    processXml(state) {
      return state.processXml;
    },
    forceUpdateXml(state) {
      return state.forceUpdateXml;
    },
    selectedElement(state) {
      return state.selectedElement;
    },
    elementCapabilityMapping(state) {
      return state.elementCapabilityMapping;
    },
    capabilitiesOfElement(state) {
      return (id) => {
        if (state.elementCapabilityMapping[id] === undefined) {
          return [];
        }
        return state.elementCapabilityMapping[id];
      };
    },
    library(state) {
      return state.library;
    },
    editingDisabled(state) {
      return state.editingDisabled;
    },
    lostConnection(state) {
      return state.lostConnection;
    },
    modeler(state) {
      return state.modeler;
    },
    currentView(state) {
      return state.currentView;
    },
  };

  const actions = {
    init({ dispatch, state, rootGetters }) {
      xmlChagedCallback = eventHandler.on('processXmlChanged', async ({ processDefinitionsId }) => {
        if (processDefinitionsId === state.processDefinitionsId && !state.version) {
          const newMetaInfo = await rootGetters['processStore/processById'](
            state.processDefinitionsId
          );
          // TODO: don't kick the user out of a subprocess if the main xml is changed but the subprocess is still there
          dispatch('loadProcessFromStore', { processDefinitionsId });
        }
      });
    },

    reset({ commit, dispatch }) {
      // destruct event handlers
      if (xmlChagedCallback) {
        eventHandler.off('processXmlChanged', xmlChagedCallback);
        xmlChagedCallback = null;
      }

      // signal to the backend that a potentially loaded process is not edited anymore
      dispatch('stopEditing');

      // reset store state
      commit('setState', JSON.parse(JSON.stringify(initialState)));
    },

    async loadProcessFromStore({ state, commit, dispatch }, { processDefinitionsId, version }) {
      // make sure that the editing of the potentially previously loaded process is signaled to be stopped
      dispatch('stopEditing');

      commit('setProcessDefinitionsId', processDefinitionsId);

      commit('setVersion', version);

      let xml;
      if (version) {
        commit('setEditingDisabled', true);
        xml = await processInterface.getProcessVersionBpmn(processDefinitionsId, version);
      } else {
        dispatch('tryEnableEditing');
        xml = (await processInterface.getProcess(processDefinitionsId, true)).bpmn;
      }

      xml = ensureCorrectProceedNamespace(xml);

      commit('setProcessXml', xml);

      // make sure that the every module is informed that the xml has to be updated (e.g. modeler and xml viewer)
      // TODO: Bug: if the incoming xml is the same as the one that was imported  last time the modeler will not reload (load => make changes => rollback to initial version)
      commit('setForceUpdateXml', state.processXml);

      // signal to the backend that the process will be edited (if possible)
      dispatch('startEditing');
    },

    // store the processXml and inform the processStore that the bpmn changed so it can try to infer changes to the process meta info
    async setProcessXml({ state, commit, dispatch }, xml) {
      commit('setProcessXml', xml);

      // dispatch bpmn change to the process store for potential meta changes from the bpmn (e.g. name)
      dispatch(
        'processStore/updateBpmn',
        { id: state.processDefinitionsId, bpmn: xml },
        { root: true }
      );
    },

    setElementCapabilityMapping({ commit }, { elementId, capabilities, elementCapabilityMapping }) {
      commit('setElementCapabilityMapping', { elementId, capabilities, elementCapabilityMapping });
    },
    setScriptOfElement({ state }, { script, elId, elType, change }) {
      processInterface.broadcastScriptChangeEvent(
        state.processDefinitionsId,
        elId,
        elType,
        script,
        change
      );
    },
    setLibrary({ commit }, { library }) {
      commit('setLibrary', { library });
    },

    tryEnableEditing({ state, commit, rootGetters }) {
      const { lostConnection } = state;

      // TODO: maybe maintain a list of reasons that editing is disabled [missing permission, no connection...] instead of a single boolean value

      // TODO: check if this works
      const hasPermissionToEdit = rootGetters['authStore/ability'].can(
        'update',
        rootGetters['processStore/processById'](state.processDefinitionsId)
      );

      // don't reenable editing until there is a connection, the user has the necessary permissions and the current process is not a version
      if (!lostConnection && hasPermissionToEdit && !state.version) {
        commit('setEditingDisabled', false);
      }
    },

    // inform the backend about the editing state in the client
    startEditing({ state, rootGetters }) {
      if (state.processDefinitionsId && !state.version) {
        // observe the editing of the process currently in the editor (if the current process is not a final version)
        processInterface.observeProcessEditing(state.processDefinitionsId);

        // signal that the client wants to start editing the process in the editor (if the user has the required permission and the process is not a final version)
        const hasPermissionToEdit = rootGetters['authStore/ability'].can(
          'update',
          rootGetters['processStore/processById'](state.processDefinitionsId)
        );
        if (hasPermissionToEdit) {
          processInterface.blockProcess(state.processDefinitionsId);
        }
      }
    },
    stopEditing({ state, rootGetters }) {
      if (state.processDefinitionsId && !state.version) {
        // stop observing the editing of the process currently in the editor (if the current process is a final version it should not be observed)
        processInterface.stopObservingProcessEditing(state.processDefinitionsId);

        // signal that the client wants to stop editing the process in the editor (if the user does not have the required permission or the process is a final version the process could not be edited to begin with)
        const hasPermissionToEdit = rootGetters['authStore/ability'].can(
          'update',
          rootGetters['processStore/processById'](state.processDefinitionsId)
        );
        if (hasPermissionToEdit) {
          processInterface.unblockProcess(state.processDefinitionsId);
        }
      }
    },

    setModeler({ commit }, modeler) {
      commit('setModeler', modeler || null);

      let selectedElement = null;

      // initialize the selected element and setup a watcher on selection changes
      if (modeler) {
        selectedElement = modeler.get('proceedSelection').getSelectedElement();

        modeler.get('eventBus').on('proceedSelection.changed', ({ newSelection }) => {
          commit('setSelectedElement', newSelection);
        });
      }

      commit('setSelectedElement', selectedElement);
    },
  };

  const mutations = {
    setState(state, newState) {
      mergeIntoObject(state, newState, false, false, false);
    },

    setProcessDefinitionsId(state, processDefinitionsId) {
      state.processDefinitionsId = processDefinitionsId;
    },

    setSubprocessId(state, subprocessId) {
      state.subprocessId = subprocessId;
    },

    setInstanceId(state, instanceId) {
      state.instanceId = instanceId;
    },

    setVersion(state, version) {
      state.version = version;
    },

    setProcessXml(state, xml) {
      state.processXml = xml;
    },

    setForceUpdateXml(state, xml) {
      state.forceUpdateXml = xml;
    },

    setSelectedElement(state, element) {
      state.selectedElement = element;
    },

    setElementCapabilityMapping(state, { elementId, capabilities, elementCapabilityMapping }) {
      if (elementCapabilityMapping) {
        state.elementCapabilityMapping = elementCapabilityMapping;
      } else if (elementId && capabilities) {
        state.elementCapabilityMapping = R.assoc(
          elementId,
          capabilities,
          state.elementCapabilityMapping
        );
      } else {
        state.elementCapabilityMapping = {};
      }
    },
    setLibrary(state, { library }) {
      state.library = library || {
        data: '',
        capabilities: [],
      };
    },
    setEditingDisabled(state, editingDisabled) {
      state.editingDisabled = editingDisabled;
    },
    setLostConnection(state, lostConnection) {
      state.lostConnection = lostConnection;
    },

    setModeler(state, modeler) {
      state.modeler = modeler;
    },

    setCurrentView(state, view) {
      state.currentView = view;
    },
  };

  return {
    namespaced: true,
    state: JSON.parse(JSON.stringify(initialState)),
    getters,
    actions,
    mutations,
  };
}
