<template>
  <div
    v-if="show"
    class="ide-container"
    :style="{ top: `${this.canvas.top}px`, width: '100%', height: `${this.canvas.height}px` }"
  >
    <v-card color="grey lighten-4" class="mb-2" style="border-top: 1px solid black">
      <v-app-bar dense>
        <v-toolbar-title>Script Editor</v-toolbar-title>
        <v-spacer />
        <v-btn @click="openScriptApi">Open Script Task API</v-btn>
        <v-btn color="primary" @click="saveAndClose()">
          Ok
          <v-icon class="ml-2">mdi-check</v-icon>
        </v-btn>
      </v-app-bar>
    </v-card>
    <v-row no-gutters style="height: 100%">
      <v-col cols="2">
        <script-tasks-list
          :menu-filtered="menuFiltered"
          :open-element-id="openElementId"
          :selected-element="selectedElement"
          @open="open"
        />
      </v-col>
      <v-col cols="10">
        <script-editor
          :process-definitions-id="processDefinitionsId"
          :open-element-id="openElementId"
          :reload-flag="openElementId"
          :value="openElementValue"
          :readonly="openElementReadonly"
          @input="updateOpenElementValue($event)"
        />
      </v-col>
    </v-row>
  </div>
</template>

<script>
import * as R from 'ramda';
import ScriptEditor from '@/frontend/components/scripting-ide/ScriptEditor.vue';
import ScriptTasksList from '@/frontend/components/scripting-ide/ScriptTasksList.vue';
import { eventHandler } from '@/frontend/backend-api/index.js';

/**
 * Scripting IDE component.
 */
export default {
  components: { ScriptEditor, ScriptTasksList },

  props: {
    canvasID: {
      type: String,
      required: true,
    },
    // The Id of the currently open process.
    processDefinitionsId: String,
  },

  computed: {
    canvas() {
      return document.getElementById(this.canvasID).getBoundingClientRect();
    },
    modeler() {
      return this.$store.getters['processEditorStore/modeler'];
    },
    selectedElement() {
      return this.$store.getters['processEditorStore/selectedElement'];
    },
    show() {
      return this.$store.getters['processEditorStore/currentView'] === 'script-editor';
    },
    // Returns the configuration of the MS
    config() {
      return this.$store.getters['configStore/config'];
    },
    // Returns the id of the currently open element or null.
    openElementId() {
      return this.openElement ? this.openElement.id : null;
    },

    // Returns whether the current element is readonly.
    openElementReadonly() {
      return this.openElement ? this.openElement.readonly : true;
    },

    /**
     * Returns the very object which holds the value for the currently open element.
     * The value can be accessed and changed using the "data" property.
     */
    openElementValueObject() {
      if (!this.openElement) {
        return null;
      }

      // library objects don't have any child nodes to filter
      if (this.openElement.id.includes('LIBRARY')) {
        return this.openElement.xmlObject;
      }

      let scriptElement = null;

      // otherwise find data object
      if (this.openElement.type === 'scriptTask') {
        scriptElement = R.find(R.propEq('nodeName', 'script'))(
          this.openElement.xmlObject.childNodes,
        );
        // if there is no script element, add one (including a cdata section) and return it
        if (!scriptElement) {
          scriptElement = this.processDiagram.createElement('script');
          this.openElement.xmlObject.appendChild(scriptElement);
        }
      }
      return scriptElement;
    },

    /**
     * Returns the script value of the selected element.
     */
    openElementValue() {
      if (this.openElementValueObject) {
        const separatorFilter = /\/\*{14} (SCRIPT|LIBRARY) (BEGINS|ENDS) \*{14}\//g;
        const blankLineFilter = /^\s*[\r\n]/gm;
        let script = this.openElementValueObject.textContent;
        return script.replace(blankLineFilter, '').trim();
      }
      return '';
    },

    /**
     * Returns the XML of the currently edited process.
     */
    xml() {
      return this.$store.getters['processEditorStore/processXml'];
    },

    /**
     * Returns the object of the currently open process.
     */
    process() {
      return this.$store.getters['processStore/processById'](this.processDefinitionsId);
    },

    /**
     * Returns the traversable parser element of the currently edited process.
     */
    processDiagram() {
      return new DOMParser().parseFromString(this.xml, 'application/xml');
    },

    /**
     * Returns an iterable parser element of all script tasks or sequence flows that are coming from a XOR/OR Gateway of the currently edited process.
     */
    processElements() {
      return this.processDiagram.getElementsByTagName('scriptTask');
    },

    /**
     * Returns all processes APART from the currently open one (=> all other).
     */
    processes() {
      return R.reject(R.propEq('id', this.processDefinitionsId))(
        this.$store.getters['processStore/processes'],
      );
    },

    /**
     * Returns the library for the currently open process.
     */
    processLibrary() {
      return this.$store.getters['processEditorStore/library'];
    },

    /**
     * Build a menu tree from both this processes' elements and all other processes' tasks,
     * which are not writeable.
     */
    menuTree() {
      if (!this.selectedElement) {
        return [];
      }

      return [
        {
          name: this.process.name,
          id: this.process.id,
          library: this.process.library || {
            data: '',
            capabilities: [],
          },
          readonly: false,
          elements: this.processElements,
        },
      ]
        .concat(this.otherElements)
        .map((item) => {
          // map all objects to useful menu items,
          // store original XML object under xmlObject
          const xmlElements = item.elements;
          const menuElements = [
            // {
            //   name: 'Library',
            //   id: `LIBRARY-${item.id}`,
            //   title: 'Library',
            //   readonly: item.readonly,
            //   xmlObject: item.library,
            // },
          ];

          let acceptedElements = 'scriptTask';

          for (let i = 0; i < xmlElements.length; i += 1) {
            const element = xmlElements[i];

            // only show elements from other processes of similar type as selected element
            if (element.tagName === acceptedElements) {
              const nameElement = R.find(R.propEq('nodeName', 'name'))(element.attributes);
              const idElement = R.find(R.propEq('nodeName', 'id'))(element.attributes);

              const name = nameElement ? nameElement.nodeValue : null;
              const id = idElement ? idElement.nodeValue : null;

              menuElements.push({
                name,
                id,
                processDefinitionsId: item.id,
                type: acceptedElements,
                title: name || id,
                readonly: this.selectedElement.id != id,
                xmlObject: element,
              });
            }
          }

          // return menu item object
          return {
            active: true, // open list group by default
            name: item.name,
            id: item.id,
            readonly: item.readonly,
            elements: menuElements,
          };
        });
    },
    menuFiltered() {
      const self = this;
      return this.menuTree.filter((process) => process.name.includes(self.elementFilter));
    },
  },

  data() {
    return {
      /**
       * Model for the filter field.
       */
      elementFilter: '',
      openElement: null,
      elementsFiltered: [],
      autoSaveTimeout: null,
      otherElements: [],
      timeout: null,
      scriptEventCallback: null,
    };
  },

  methods: {
    openScriptApi() {
      window.open('https://docs.proceed-labs.org/concepts/bpmn/bpmn-script-task/');
    },
    /**
     * close editor automatically 5 minutes after last change
     */
    autoClose() {
      if (!process.env.IS_ELECTRON) {
        this.timeout = setTimeout(() => {
          this.saveAndClose();
        }, this.config.closeOpenEditorsInMs || 300000);
      }
    },
    async saveChanges() {
      // save changes in the modeler
      this.modeler
        .get('customModeling')
        .addJSToElement(this.openElementId, this.openElementValueObject.textContent);
    },
    saveAndClose() {
      this.$store.dispatch('processStore/stopEditingTask', {
        taskId: this.selectedElement.id,
        processDefinitionsId: this.processDefinitionsId,
      });
      this.$store.commit('processEditorStore/setCurrentView', 'modeler');
    },
    /**
     * Opens an element.
     *
     * @param element
     * @returns void
     */
    open(element) {
      this.openElement = element;
    },

    /**
     * Updates the code value of the currently open element.
     *
     * @param value
     */
    updateOpenElementValue(element) {
      if (
        this.openElementValueObject &&
        !this.openElementReadonly &&
        this.openElementValueObject.textContent !== element.code
      ) {
        this.openElementValueObject.textContent = element.code;
        clearTimeout(this.timeout);
        this.autoClose();
        this.$store.dispatch('processEditorStore/setScriptOfElement', {
          script: element.code,
          elId: this.openElementId,
          elType: this.selectedElement.type,
          change: element.change,
        });
        this.saveChanges();
      }
    },
    /**
     * Gets all sequenceFlows and scriptTasks from other processes
     */
    async loadOtherElements() {
      const promises = this.processes.map(async (process) => {
        const bpmn = await this.$store.getters['processStore/xmlById'](process.id);

        const xmlDom = new DOMParser().parseFromString(bpmn, 'application/xml');

        const scriptTasks = Array.from(xmlDom.getElementsByTagName('scriptTask'));

        return {
          name: process.name,
          id: process.id,
          library: process.library || {
            data: '',
            capabilities: [],
          },
          readonly: true, // elements of other processes cannot be written in this IDE
          elements: scriptTasks,
        };
      });

      this.otherElements = await Promise.all(promises);
    },
  },
  watch: {
    /**
     * When the user selects a different element in the BPMN diagram,
     * if it is a script task, open its code in the editor.
     */
    show(isOpen) {
      // all tasks available for open are in the
      // first slot of the menuTree, since that's
      // where the currently open process resides.
      if (isOpen) {
        // mark the task as being edited
        this.$store.dispatch('processStore/startEditingTask', {
          taskId: this.selectedElement.id,
          processDefinitionsId: this.processDefinitionsId,
        });

        if (this.selectedElement.type === 'bpmn:ScriptTask') {
          this.autoClose();
          const availableTasks = this.menuTree[0].elements;
          // find menu item by id
          const taskToSelect = R.find(R.propEq('id', this.selectedElement.id))(availableTasks);

          // if exists, open it
          if (taskToSelect) {
            this.openElement = taskToSelect;
          }
        }

        this.scriptEventCallback = ({ processDefinitionsId, elId, elType, script, change }) => {
          // update the code visible in the editor if the currently selected element is updated but not editable (editable ones are handled in a subcomponent)
          if (this.show && elId === this.openElementId && this.openElementReadonly) {
            this.openElementValueObject.textContent = script;
            // trigger a reload of the modeler content
            const tmp = this.openElement;
            this.openElement = null;
            this.$nextTick(() => {
              this.openElement = tmp;
            });
          }
        };

        // add the callback to the eventHandler when the script editor is opened
        eventHandler.on('processScriptChanged', this.scriptEventCallback);
      } else {
        if (this.scriptEventCallback) {
          // remove callback from eventHandler when script editor is closed
          eventHandler.off('processScriptChanged', this.scriptEventCallback);
          this.scriptEventCallback = null;
        }
      }
    },
    async processes() {
      this.loadOtherElements();
    },
  },
  mounted() {
    this.loadOtherElements();
  },
};
</script>

<style scoped>
.ide-container {
  position: absolute;
  border: 1px solid lightgray;
  z-index: 999;
  overflow: hidden;
}

.v-list__tile--active {
  background-color: rgba(0, 0, 0, 0.04);
}
</style>
