<template>
  <v-dialog :value="show" @input="cancel" scrollable max-width="800px">
    <v-card>
      <popup :popupData="popupData" />
      <v-card-title>
        <span class="headline mx-0">
          <slot name="title">
            <span>{{ mainAction }}</span>
          </slot>
        </span>
        <v-spacer></v-spacer>
        <slot name="title-action"> </slot>
      </v-card-title>
      <v-card-text style="padding: 8px 30px 20px">
        <v-form v-model="isFormValid" name="process-form" @submit.prevent>
          <!-- Data Fields for a New Process -->
          <v-container class="pa-0">
            <slot
              name="before-main"
              :currentProcessData="currentData"
              :pageIndex="currentIndex"
            ></slot>
            <v-container class="pa-0">
              <slot name="bpmn-info"></slot>
              <v-row v-if="currentData && currentData.bpmn">
                <v-col cols="12" sm="12" md="12">
                  <BpmnPreview
                    viewerMode="navigated-viewer"
                    :bpmnFile="currentData.bpmn"
                  ></BpmnPreview>
                </v-col>
              </v-row>
            </v-container>
            <form-warnings
              v-model="hasUnresolvedWarnings"
              :currentData="currentData"
              :currentIndex="currentIndex"
            ></form-warnings>
            <slot name="main">
              <div v-if="currentData">
                <v-row>
                  <v-col class="py-0" cols="12" sm="12" md="12">
                    <v-text-field
                      id="processFormDataName"
                      label="Name*"
                      v-model="currentData.name"
                      :rules="[inputRules.requiredName, inputRules.nameCounter]"
                      counter="150"
                      required
                    ></v-text-field>
                  </v-col>
                </v-row>
                <project-properties
                  v-if="isProject"
                  :currentProcessData="currentData"
                ></project-properties>
                <v-row>
                  <v-col class="py-0" cols="12" sm="12" md="12">
                    <v-textarea
                      label="Description"
                      v-model="currentData.description"
                      :rules="[inputRules.descriptionCounter]"
                      rows="3"
                      auto-grow
                      counter
                      clearable
                    ></v-textarea>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col class="py-0" cols="12" sm="12" md="12">
                    <v-select
                      v-model="currentData.departments"
                      :items="departmentNames"
                      label="Department"
                      required
                      clearable
                      multiple
                      chips
                      deletable-chips
                      no-data-text="Unfortunatly you don't have any Departments added"
                    ></v-select>
                  </v-col>
                </v-row>
                <v-row>
                  <v-col class="py-0" cols="12" sm="12" md="12">
                    <small>*indicates required field</small>
                  </v-col>
                </v-row>
                <fifth-industry-properties
                  v-if="show5thIndustryFeature"
                  :processType="processType"
                  :currentData="currentData"
                  :currentIndex="currentIndex"
                ></fifth-industry-properties>
                <v-row v-if="processesData.length > 1">
                  <v-col>
                    <v-pagination
                      v-model="currentPage"
                      circle
                      :length="processesData.length"
                      :total-visible="12"
                    >
                    </v-pagination>
                  </v-col>
                </v-row>
              </div>
            </slot>
          </v-container>
        </v-form>
        <user-tasks-handler></user-tasks-handler>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <slot
          name="actions"
          :mainAction="mainAction"
          :confirm="handleSubmit"
          :cancel="cancel"
          :isFormValid="isFormValid"
          :numProcesses="numProcesses"
          :processesData="processesData"
          :currentProcessIndex="currentIndex"
          :isSubmitting="isSubmitting"
        >
          <v-btn @click="cancel">Cancel</v-btn>
          <v-btn
            id="processFormDataAddProcess"
            color="primary"
            :loading="isSubmitting"
            :disabled="!isFormValid || hasUnresolvedWarnings"
            @click="handleSubmit"
          >
            Ok
          </v-btn>
        </slot>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import { mapGetters } from 'vuex';
import ProjectProperties from './ProjectProperties.vue';
import FifthIndustryProperties from './5thIndustryProperties.vue';
import { getProcessDocumentation } from '@proceed/bpmn-helper';
import processesDataInjectorMixin from './ProcessesDataInjectorMixin.vue';
import onSubmitProviderMixin from './OnSubmitProviderMixin.vue';
import UserTasksHandler from './userTasks.vue';
import FormWarnings from './ProcessFormWarnings.vue';
import BpmnPreview from '@/frontend/components/bpmn/BpmnPreview.vue';

import { enable5thIndustryIntegration } from '../../../../../../../FeatureFlags';

/**
 * @module components
 */
/**
 * @memberof module:components
 * @module processes
 */
/**
 * This is a dialog that allows creation or editing of processes from provided data,
 * it can be used to create more use-case specific dialogs (e.g. for Adding, Editing, Importing)
 *
 * @memberof module:components.module:processes
 * @module Vue:ProcessForm
 *
 * @vue-prop {String} action - the kind of action that is performed by the sorrounding form (used for header)
 * @vue-prop {String} processType - the kind of process that is manipulated (e.g. process, project, ...) (used for header)
 *
 * @vue-computed {Process[]} storedProcesses - all processes from the vuex store
 * @vue-computed {String[]} departmentNames - names of all possible departments
 * @vue-computed {*} departments - all possible departments
 * @vue-computed {number} currentIndex - the current displayed Page minus 1 (index in array)
 * @vue-computed {String} mainAction - the action performed by using this form (e.g. Add Process) (used in header and given in action slot for use in encapsulating form)
 *
 * @vue-event {undefined} done - if the good button (add, import, save) was clicked
 * @vue-event {(Object<Process>|null)} process - information about the process that was added/edited... (null when more than one)
 * @vue-event {undefined} cancel - if the form should be closed without the intention of doing anything (abort)
 */
export default {
  name: 'process-form',
  mixins: [processesDataInjectorMixin, onSubmitProviderMixin],
  components: {
    popup: AlertWindow,
    ProjectProperties,
    FifthIndustryProperties,
    UserTasksHandler,
    FormWarnings,
    BpmnPreview,
  },
  props: {
    action: {
      type: String,
      required: false,
      default: 'Do something with',
    },
    processType: {
      type: String,
      required: false,
      default: 'process',
    },
    show: {
      type: Boolean,
      required: true,
    },
  },
  computed: {
    ...mapGetters({
      isAuthenticated: 'authStore/isAuthenticated',
      getUser: 'authStore/getUser',
    }),
    isProject() {
      return this.processType === 'project';
    },
    storedProcesses() {
      return this.$store.getters['processStore/processes'];
    },
    departmentNames() {
      return this.departments.map((department) => department.name);
    },
    departments() {
      return this.$store.getters['departmentStore/getDepartments'];
    },
    numProcesses() {
      return this.processesData ? this.processesData.length : 0;
    },
    currentIndex() {
      return this.currentPage - 1;
    },
    currentData() {
      return this.processesData[this.currentIndex];
    },
    pluralAffix() {
      return this.processType === 'process' ? 'es' : 's';
    },
    mainAction() {
      return `${this.action} ${this.upperCaseType}${
        this.processesData && this.processesData.length > 1 ? this.pluralAffix : ''
      }`;
    },
  },
  data() {
    return {
      show5thIndustryFeature: enable5thIndustryIntegration,
      /** validation rules for the input fields inside the form */
      inputRules: {
        requiredName: (name) => !!name || 'Name is required',
        nameCounter: (name) =>
          (name && name.length <= 150) || 'Name should not be greater than 150 characters',
        descriptionCounter: (description) =>
          !description ||
          (description && description.length <= 100000) ||
          'Description should not be greater than 100000 characters',
      },
      /** */
      popupData: {
        body: '',
        display: 'none',
        color: 'info',
      },
      /** if all necessary data/form fields have been filled (vuetify: Forms v-model) */
      isFormValid: false,
      /**
       * possible to select multiple processes for import
       * => display multiple "pages" on the import dialog
       *
       * This variable indicates the current page.
       */
      currentPage: 1,
      upperCaseType: `${this.processType[0].toUpperCase()}${this.processType.slice(1)}`,

      hasUnresolvedWarnings: false,

      isSubmitting: false,
    };
  },
  methods: {
    /** Emits cancel event to parent component */
    cancel() {
      this.$emit('cancel');
    },

    /** Checks if all pages are valid */
    async validatePages() {
      // check if the input fields of every process are valid
      // if not, show the page for the invalid process
      for (let currentPage = 1; currentPage <= this.processesData.length; currentPage++) {
        this.currentPage = currentPage;
        // wait for the DOM update, after which the input fields will be validated
        await this.$nextTick();
        await this.$nextTick();

        if (!this.isFormValid) {
          throw new Error('This page is not valid!');
        }

        await this.executeValidatorCallbacks(this.processesData[currentPage - 1]);
      }
    },
    /** Called if the submit button is clicked */
    async handleSubmit() {
      let process;
      try {
        if (this.processesData.length < 1) {
          console.warn("Can't submit since there is no process data!");
          return;
        }

        this.isSubmitting = true;

        await this.validatePages();

        for (const processData of this.processesData) {
          // execute before submit callbacks for every process
          await this.executeBeforeSubmitCallbacks(processData);
        }

        const processes = await this.submitProcesses();
        process = processes.length === 1 ? processes[0] : null;
        this.$emit('process', process);
        this.$emit('done');
      } catch ({ message }) {
        this.popupData.body = message;
        this.popupData.color = 'error';
        this.popupData.display = 'block';
      }
      this.isSubmitting = false;
    },
    /** Sends the data of all processes to the store/backend */
    async submitProcesses() {
      let processes = [];
      for (const processData of this.processesData) {
        let { bpmn } = processData;
        delete processData.bpmn;

        if (this.isAuthenticated && this.getUser) processData.owner = this.getUser.id;
        const finalProcess = await this.$store.dispatch('processStore/add', {
          process: processData,
          bpmn,
          override: true,
        });

        await this.executeAfterSubmitCallbacks({ ...processData, bpmn }, finalProcess);

        processes.push(finalProcess);
      }
      return processes;
    },
    // this will be called from a function in the mixin if a new entry is added
    initProcessData() {
      return { type: this.processType };
    },
    // this will be called from a function in the mixin if the bpmn of a processesDataEntry changes
    async initProcessDataFromBPMN(_, changes) {
      // load the description from the bpmn if the user didn't already provide one
      const description = await getProcessDocumentation(changes.bpmn);
      return {
        description: changes.description || description,
      };
    },
    initFromExistingProcess(_, changes) {
      const existingProcess = this.$store.getters['processStore/processById'](
        changes.originalStoredProcessId,
      );

      return {
        departments: [...existingProcess.departments],
      };
    },
  },
  watch: {
    numProcesses(processCount) {
      if (processCount <= this.currentPage) {
        this.currentPage = processCount;
      } else if (!this.currentPage) {
        this.currentPage = 1;
      }
    },
  },
};
</script>
