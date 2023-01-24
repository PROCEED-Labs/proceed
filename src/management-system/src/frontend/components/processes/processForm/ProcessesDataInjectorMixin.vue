<script>
/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This mixin injects the shared processesData object into the component and sets up reactivity to changes inside the processesData for the component using it
 *
 * It allows the component to update processesData based on the current changes inside it
 *
 * @memberof module:components.module:processes
 * @module Vue:ProcessesDataInjectorMixin
 *
 */
export default {
  inject: ['updateData', 'reactiveData', 'onInit', 'offInit', 'onChange', 'offChange'],
  computed: {
    processesData() {
      return this.reactiveData.processesData;
    },
  },
  methods: {
    async handleFormInitialization(currentData) {
      let initData = {};

      // call initProcessData function for new Array elements if that functions exists on the component
      if (this.initProcessData) {
        initData = await this.initProcessData(currentData);
      }

      return initData;
    },
    async handleProcessDataChanges(currentData, currentChanges) {
      let newChanges = {};

      if (currentChanges.originalStoredProcessId) {
        // call initFromExisting process if the process this entry is based on changed
        if (this.initFromExistingProcess) {
          newChanges = {
            ...newChanges,
            ...(await this.initFromExistingProcess(currentData, currentChanges)),
          };
        }
      }

      if (currentChanges.bpmn) {
        // call initProcessDataFromBPMN if the entry contains BPMN and is either new or the BPMN changed
        if (this.initProcessDataFromBPMN) {
          newChanges = {
            ...newChanges,
            ...(await this.initProcessDataFromBPMN(currentData, currentChanges)),
          };
        }
      }
      if (currentChanges.bpmn === null) {
        // make sure to remove bpmn related data if the bpmn is removed
        if (this.removeBPMNRelatedData) {
          newChanges = {
            ...newChanges,
            ...(await this.removeBPMNRelatedData(currentData, currentChanges)),
          };
        }
      }

      if (this.watchOtherChanges) {
        // allow components to set up their own change reactivity
        newChanges = {
          ...newChanges,
          ...(await this.watchOtherChanges(currentData, currentChanges)),
        };
      }

      return newChanges;
    },
  },
  created() {
    this.onInit(this.handleFormInitialization);
    this.onChange(this.handleProcessDataChanges);
  },
  beforeDestroy() {
    this.offInit(this.handleFormInitialization);
    this.offChange(this.handleProcessDataChanges);
  },
};
</script>
