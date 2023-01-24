<script>
import uuid from 'uuid';

import { asyncMap } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';

import ExecutionQueue from '@/shared-frontend-backend/helpers/execution-queue.js';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This mixin provides a way for nested components inside the component using it to use and update the shared processesData component in a reactive way
 *
 * @memberof module:components.module:processes
 * @module Vue:ProcessesDataProviderMixin
 *
 */
export default {
  data() {
    return {
      /**
       * Provide the processesData inside an object so injecting components can react to changes
       */
      reactiveData: { processesData: [] },
      /**
       * The callbacks other components can provide to react to new entries being added
       */
      initCallbacks: [],
      /**
       * The callbacks other components can provide to react to changes on an entry
       */
      changeCallbacks: [],
      /**
       * Used to make sure that the processesData is only updated by one function at a time
       */
      executionQueue: new ExecutionQueue(),
    };
  },
  // this allows nested components to use and apply changes to the base data
  provide() {
    return {
      updateData: this.updateProcessesData,
      reactiveData: this.reactiveData,
      onInit: this.registerInitCallback,
      offInit: this.unregisterInitCallback,
      onChange: this.registerChangeCallback,
      offChange: this.unregisterChangeCallback,
    };
  },
  methods: {
    // creates a new id that can be used to identify a specific element inside processesData through changes
    createProcessDataId() {
      return uuid.v4();
    },
    /**
     * Will set processesData making sure that every entry contains an id that makes it identifyable
     *
     * @param {Array} entries the entries the new processesData should be initialized with
     */
    async setProcessesData(entries) {
      await this.executionQueue.enqueue(async () => {
        if (Array.isArray(entries)) {
          let newlyAdded = [];

          this.reactiveData.processesData = await asyncMap(entries, async (entry, index) => {
            // do nothing if this entry was already initialized
            if (entry.formEntryId) {
              return entry;
            } else {
              // consider the data of the added entry as changes so change handlers are able to be reused here
              let initChanges = { ...entry };

              // execute all registered init handlers
              for (const cb of this.initCallbacks) {
                initChanges = { ...initChanges, ...(await cb(entry)) };
              }

              newlyAdded.push({ index, initChanges });

              // add the entry with an identifying id
              return { formEntryId: this.createProcessDataId() };
            }
          });

          // some components are only rendered if there is data so wait for them to be created and add their change handlers and then trigger them
          if (newlyAdded.length) {
            this.$nextTick(() => {
              newlyAdded.forEach(({ index, initChanges }) => {
                this.updateProcessesData(index, initChanges);
              });
            });
          }
        } else {
          this.reactiveData.processesData = [];
        }
      });
    },
    /**
     * Will trigger change handlers with the current change and then recursively for all resulting changes until there is no new change
     *
     * BEWARE: this can lead to infinite cycles if some components have a cyclical change dependency
     *
     * @param {Object} currentData the current state of the entry
     * @param {Object} currentChanges the changes to apply
     *
     * @returns {Object} the result of all the changes applied to the existing entry
     *
     */
    async handleChanges(currentData, currentChanges) {
      let newChanges;
      do {
        newChanges = {};

        // execute all change handlers and save resulting changes
        for (const cb of this.changeCallbacks) {
          newChanges = { ...newChanges, ...(await cb(currentData, currentChanges)) };
        }

        // calculate the changed entry
        currentData = { ...currentData, ...currentChanges };

        // repeat for the resulting changes until there is no new change
        currentChanges = newChanges;
      } while (Object.keys(newChanges).length);

      return currentData;
    },
    /**
     * Will change the entry at the given index in a way that vue can react to
     *
     *
     * @param {Number} index the index of the element inside the processesData array
     * @param {Object} changes the changes to make
     */
    async updateProcessesData(index, changes) {
      await this.executionQueue.enqueue(async () => {
        const entry = this.reactiveData.processesData[index];

        // overwrite entry in the current processesData with the changes
        const newEntry = await this.handleChanges(entry, changes);

        // overwrite the old processesData to force vue to react to the changes
        this.reactiveData.processesData = [
          ...this.reactiveData.processesData.slice(0, index),
          newEntry,
          ...this.reactiveData.processesData.slice(index + 1),
        ];
      });
    },
    registerInitCallback(callback) {
      this.initCallbacks.push(callback);
    },
    unregisterInitCallback(callback) {
      this.initCallbacks = this.initCallbacks.filter((cb) => cb !== callback);
    },
    registerChangeCallback(callback) {
      this.changeCallbacks.push(callback);
    },
    unregisterChangeCallback(callback) {
      this.changeCallbacks = this.changeCallbacks.filter((cb) => cb !== callback);
    },
  },
};
</script>
