<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>{{ title }}</v-toolbar-title>
      <!-- List or Card view buttons -->
      <v-btn-toggle v-model="processViewMode" class="ml-3" color="primary" mandatory dense group>
        <v-btn value="table">
          <v-icon>mdi-format-align-justify</v-icon>
        </v-btn>
        <v-btn value="card">
          <v-icon>mdi-apps</v-icon>
        </v-btn>
      </v-btn-toggle>
      <v-spacer />

      <!-- Import and Add button -->
      <v-btn @click.stop="showProcessForm('Import')" v-if="$can('create', 'Process')">
        <v-icon> mdi-upload </v-icon>
      </v-btn>
      <v-btn
        color="primary"
        @click.stop="showProcessForm('Add')"
        v-if="$can('create', 'Process')"
        >{{ addText }}</v-btn
      >
    </v-toolbar>

    <slot name="before-table"></slot>

    <v-row>
      <v-col
        :cols="
          $useAuthorization && isAuthenticated && expanded[0] && $can('share', expanded[0]) ? 8 : 12
        "
        :class="
          $useAuthorization && isAuthenticated && expanded[0] && $can('share', expanded[0])
            ? 'pr-0'
            : ''
        "
      >
        <v-container fluid>
          <v-row row wrap justify-center id="wrapper">
            <v-col class="text-center centered">
              <v-card>
                <v-card-title>
                  <!-- Drop Down menu "Select Action" -->
                  <v-menu :disabled="!selected.length" offset-y>
                    <template v-slot:activator="{ on }">
                      <v-btn color="primary" :disabled="!selected.length" v-on="on">
                        <v-icon left>mdi-menu-down</v-icon>Select Action
                      </v-btn>
                    </template>
                    <v-list>
                      <v-list-item @click="expandSelected">
                        <v-list-item-title>
                          <v-icon left>mdi-arrow-expand-vertical</v-icon>Expand
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="collapseSelected">
                        <v-list-item-title>
                          <v-icon left>mdi-arrow-collapse-vertical</v-icon>Collapse
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item v-if="selected.length === 1" disabled>
                        <v-list-item-title>
                          <v-icon left>mdi-checkbox-outline</v-icon>Deploy
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="openExportDialog">
                        <v-list-item-title>
                          <v-icon left>mdi-export</v-icon>Export
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item
                        v-if="selected.length === 1"
                        :disabled="!canEditProcesses"
                        @click="handleEditProcessRequest(selected[0])"
                      >
                        <v-list-item-title>
                          <v-icon left>mdi-pencil</v-icon>Edit
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item @click="handleCopyProcessRequest(selected)">
                        <v-list-item-title>
                          <v-icon left>mdi-content-copy</v-icon>Copy
                        </v-list-item-title>
                      </v-list-item>
                      <v-list-item
                        @click="removeSelectedProcessesDialog = true"
                        :disabled="!canDeleteProcesses"
                      >
                        <v-list-item-title>
                          <v-icon left>mdi-delete</v-icon>Delete
                        </v-list-item-title>
                      </v-list-item>
                    </v-list>
                  </v-menu>
                  <v-spacer></v-spacer>
                  <v-text-field
                    class="ma-0"
                    v-model="search"
                    append-icon="mdi-magnify"
                    label="Search"
                    single-line
                    hide-details
                    :disabled="!typeProcesses || typeProcesses.length === 0"
                    clearable
                  ></v-text-field>
                </v-card-title>
                <v-divider />
                <ProcessCardList
                  v-if="processViewMode === 'card'"
                  :processes="mappedProcesses"
                  :search.sync="search"
                  :selected.sync="selected"
                  :expanded.sync="expanded"
                  :showFavoriteList.sync="showFavoriteList"
                  :callToActionText="callToAction"
                  @handleFavorite="handleFavorite"
                  @createProcessHierarchy="handleProcessHierarchy"
                  @editBpmn="openProcess"
                  @editProcessRequest="handleEditProcessRequest"
                  @deleteProcessRequest="handleDeleteProcessRequest"
                  @exportProcess="exportProcess"
                />
                <ProcessDataTable
                  v-else-if="processViewMode === 'table'"
                  :processes="mappedProcesses"
                  :search.sync="search"
                  :selected.sync="selected"
                  :expanded.sync="expanded"
                  :showFavoriteList.sync="showFavoriteList"
                  :isProjectMode="processType === 'project'"
                  :callToActionText="callToAction"
                  @handleFavorite="handleFavorite"
                  @createProcessHierarchy="handleProcessHierarchy"
                  @editBpmn="openProcess"
                  @editProcessRequest="handleEditProcessRequest"
                  @deleteProcessRequest="handleDeleteProcessRequest"
                  @exportProcess="exportProcess"
                />
              </v-card>
            </v-col>
          </v-row>
          <DepartmentsList @changeSearch="changeSearchItem"></DepartmentsList>
        </v-container>
      </v-col>
      <v-col
        v-if="$useAuthorization && isAuthenticated && expanded[0] && $can('share', expanded[0])"
        cols="4"
        class="pl-0"
      >
        <v-container fluid class="pl-0">
          <ShareProcessPanel :expanded.sync="expanded" />
        </v-container>
      </v-col>
    </v-row>

    <!-- Delete dialog -->
    <confirmation
      :title="deleteConfirmationTitle"
      :continueButtonText="`Delete ${
        selected.length > 1 ? `${selected.length} ${this.title}` : this.upperCaseType
      }`"
      continueButtonColor="error"
      :show="removeSelectedProcessesDialog"
      maxWidth="500px"
      @cancel="removeSelectedProcessesDialog = false"
      @continue="deleteSelectedProcesses"
    >
      <div v-if="selected.length === 1">
        You are about to delete the {{ processType }} <b>{{ selected[0].name }}</b> and all of the
        subprocesses!
      </div>
      <div v-else>
        You are about to delete <b>{{ selected.length }} {{ title.toLowerCase() }}</b> and all of
        their subprocesses:
        <ul style="list-style-position: inside">
          <li v-for="process of selected" :key="process.id">
            {{ process.name }}
          </li>
        </ul>
      </div>
    </confirmation>

    <!-- Delete dialog -->
    <confirmation
      :title="forceDeleteConfirmationTitle"
      :continueButtonText="`Delete ${
        selected.length > 1 ? `${selected.length} ${this.title}` : this.upperCaseType
      }`"
      continueButtonColor="error"
      :show="removeBlockedProcessesDialog"
      maxWidth="500px"
      @cancel="removeBlockedProcessesDialog = false"
      @continue="deleteSelectedProcesses"
    >
      <div v-if="selected.length === 1">
        You are about to delete the {{ processType }} <b>{{ selected[0].name }}</b
        >!
      </div>
      <div v-else>
        You are about to delete <b>{{ selected.length }} {{ title.toLowerCase() }}</b
        >:
        <ul style="list-style-position: inside">
          <li v-for="process of selected" :key="process.id">
            {{ process.name }}
          </li>
        </ul>
      </div>
    </confirmation>

    <add-form
      :type="processType"
      :show="isAddFormShown"
      @cancel="removeProcessForm('Add')"
      @process="openInEditor"
      @done="removeProcessForm('Add')"
    />

    <edit-form
      :type="processType"
      :processToBeEdited="processToBeEditedProp"
      :show="isEditFormShown"
      @cancel="removeProcessForm('Edit')"
      @done="removeProcessForm('Edit')"
    />

    <import-form
      :type="processType"
      :show="isImportFormShown"
      @cancel="removeProcessForm('Import')"
      @process="openInEditor"
      @done="removeProcessForm('Import')"
    />

    <copy-form
      :processesToBeCopied="processesToBeCopied"
      :type="processType"
      :show="isCopyFormShown"
      @cancel="removeProcessForm('Copy')"
      @done="removeProcessForm('Copy')"
      @process="openInEditor"
    />

    <ExportModal
      :loading="exportRunning"
      :title="`Export selected ${selected.length > 1 ? title.toLowerCase() : processType}`"
      :text="selectionText"
      :error="errorSelectionText"
      :max="max"
      :show="exportSelectedProcessesDialog"
      @cancel="exportSelectedProcessesDialog = false"
      @continue="exportSelected"
    />

    <SubprocessesModal
      :process="processForSubprocessModal"
      :show="isSubprocessesModalVisible"
      @cancel="isSubprocessesModalVisible = false"
      @editBpmn="openProcess($event.process)"
    />

    <slot name="after-table"></slot>

    <local-process-modal
      :processType="title"
      :processes="typeProcesses"
      v-if="$can('create', 'Process')"
    ></local-process-modal>
  </div>
</template>
<script>
import ImportForm from '@/frontend/components/processes/processForm/ImportProcessForm.vue';
import AddForm from '@/frontend/components/processes/processForm/AddProcessForm.vue';
import EditForm from '@/frontend/components/processes/processForm/EditProcessForm.vue';
import CopyForm from '@/frontend/components/processes/processForm/CopyProcessForm.vue';
import ExportModal from '@/frontend/components/processes/ExportModal.vue';
import SubprocessesModal from '@/frontend/components/processes/subprocesses/SubprocessesModal.vue';
import Confirmation from '@/frontend/components/universal/Confirmation.vue';
import DepartmentsList from '@/frontend/components/departments/DepartmentsList.vue';
import ProcessCardList from '@/frontend/components/processes/cards/ProcessCardList.vue';
import ProcessDataTable from '@/frontend/components/processes/datatable/ProcessDatatable.vue';
import { exportSelectedProcesses } from '@/frontend/helpers/process-export/process-export.js';
import { getMaximumResolution } from '@/frontend/helpers/process-export/process-max-resolution.js';
import { subject } from '@casl/ability';
import { mapGetters } from 'vuex';
import ShareProcessPanel from '@/frontend/components/processes/ShareProcessPanel.vue';
import LocalProcessModal from './LocalProcessModal.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:Process
 *
 * @vue-computed showFavoriteList
 * @vue-computed processViewMode
 * @vue-computed departments
 * @vue-computed favorites
 * @vue-computed processes
 * @vue-computed mappedProcesses
 * @vue-computed deleteConfirmationTitle
 * @vue-computed forceDeleteConfirmationTitle
 */
export default {
  props: {
    processType: {
      type: String,
      required: false,
      default: 'process',
    },
    title: {
      type: String,
      required: false,
      default: 'Processes',
    },
    addText: {
      type: String,
      required: false,
      default: 'Add',
    },
    callToAction: {
      type: String,
      required: false,
      default: 'Open Editor',
    },
  },

  components: {
    Confirmation,
    DepartmentsList,
    ProcessCardList,
    ProcessDataTable,
    ExportModal,
    SubprocessesModal,
    ImportForm,
    AddForm,
    EditForm,
    CopyForm,
    ShareProcessPanel,
    LocalProcessModal,
  },

  computed: {
    showFavoriteList: {
      get() {
        return this.$store.getters['userPreferencesStore/getShowFavoritesProcessView'];
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setShowFavoritesProcessView', newValue);
        this.resetSelectionAndExpansion();
      },
    },
    ...mapGetters({
      isAuthenticated: 'authStore/isAuthenticated',
    }),
    canDeleteProcesses() {
      return this.selected.every((process) => this.$can('delete', process));
    },
    canEditProcesses() {
      return this.selected.every((process) => this.$can('update', process));
    },
    processViewMode: {
      get() {
        return this.$store.getters['userPreferencesStore/getSelectedProcessView'];
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setSelectedProcessView', newValue);
      },
    },
    departments() {
      return this.$store.getters['departmentStore/getDepartments'];
    },
    favorites() {
      return this.$store.getters['userPreferencesStore/getUserFavorite'];
    },
    processes() {
      return this.$store.getters['processStore/processes'];
    },
    typeProcesses() {
      return this.processes.filter((p) => p.type === this.processType);
    },
    visibleProcesses() {
      if (this.$store.getters['authStore/isAuthenticated']) {
        return this.typeProcesses.filter((p) => p.owner || p.shared);
      } else {
        return this.typeProcesses;
      }
    },
    mappedProcesses() {
      if (!this.visibleProcesses) return [];

      let processes = this.visibleProcesses.map((process) => {
        const type = process.type[0].toUpperCase() + process.type.slice(1);
        return subject(type, {
          ...process,
          departments: process.departments
            ? process.departments.map((department) => {
                return {
                  name: department,
                  color: this.getDepartmentColor(department),
                };
              })
            : '',
          isFavorite: this.isFavorite(process.id),
        });
      });

      if (this.showFavoriteList) {
        processes = processes.filter((process) => process.isFavorite);
      }

      return processes;
    },
    deleteConfirmationTitle() {
      return `delete the selected ${
        this.selected.length === 1 ? this.processType : this.title.toLowerCase()
      }?`;
    },
    forceDeleteConfirmationTitle() {
      return `delete the selected ${
        this.selected.length === 1
          ? `${this.processType}? This ${this.processType} is`
          : `${this.title.toLowerCase()}? One or more of the ${this.title.toLowerCase()} are`
      } being edited by someone else`;
    },
  },
  data() {
    return {
      upperCaseType: `${this.processType[0].toUpperCase()}${this.processType.slice(1)}`,

      /** see ProcessForm.vue: add, import, edit, select */
      isImportFormShown: false,
      isAddFormShown: false,
      isEditFormShown: false,
      isCopyFormShown: false,
      /** */
      removeSelectedProcessesDialog: false,
      /** */
      removeBlockedProcessesDialog: false,
      /** */
      confirmationText: 'Do you want to continue?',
      /** */
      selectionText: 'Please select a format for the file export',
      /** */
      errorSelectionText: 'Please select a format',
      /** */
      processToBeEditedProp: undefined,
      /** */
      processesToBeCopied: [],
      /** */
      search: '',
      /** */
      selected: [],
      /** */
      expanded: [],
      /** */
      exportRunning: false,
      /** */
      exportSelectedProcessesDialog: false,
      /** */
      isSubprocessesModalVisible: false,
      /** */
      processForSubprocessModal: null,
      /** */
      max: 10,
    };
  },
  watch: {
    search() {
      this.resetSelectionAndExpansion();
    },
    processViewMode() {
      this.resetSelectionAndExpansion();
    },
    isProcessFormShown(isShown) {
      // make sure to reset the form when user closed it by clicking outside it
      if (!isShown) {
        this.processToBeEditedProp = undefined;
        this.processesToBeCopied = [];
      }
    },
  },
  methods: {
    /** */
    resetSelectionAndExpansion() {
      this.selected = [];
      this.expanded = [];
    },
    showProcessForm(processFormType) {
      this[`is${processFormType}FormShown`] = true;
    },
    /** */
    handleEditProcessRequest(process) {
      this.processToBeEditedProp = this.typeProcesses.find((pro) => pro.id === process.id);
      this.showProcessForm('Edit');
    },
    handleCopyProcessRequest(processes) {
      this.processesToBeCopied = processes;
      this.showProcessForm('Copy');
    },
    removeProcessForm(processFormType) {
      this.processToBeEditedProp = undefined;
      this[`is${processFormType}FormShown`] = false;
    },

    /** */
    async exportProcess(process) {
      this.selected = this.typeProcesses.filter((pro) => pro.id === process.id);
      this.max = await getMaximumResolution(this.selected);
      this.exportSelectedProcessesDialog = true;
    },
    /**
     * Expand selected Processes in the Process Data Table
     */
    expandSelected() {
      this.expanded = this.expanded
        .concat(this.selected)
        .filter((value, index, self) => self.indexOf(value) === index);
    },
    /**
     * Collapse selected expanded Processes in the Process Data Table
     */
    collapseSelected() {
      this.expanded = this.expanded.filter((process) => !this.selected.includes(process));
    },
    /**
     * Add or Delete ProcessDefinitionsId from Favorite in userPreferencesStore
     */
    handleFavorite(process) {
      if (process.isFavorite) {
        this.$store.dispatch('userPreferencesStore/deleteProcessFromFavoritesById', process.id);
      } else {
        this.$store.dispatch('userPreferencesStore/addNewProcessToFavorites', process.id);
      }
    },
    /**
     * return true if processDefinitionsId is in Favorites
     */
    isFavorite(processDefinitionsId) {
      return this.favorites.includes(processDefinitionsId);
    },
    /** */
    changeSearchItem(searchItem) {
      this.search = searchItem;
    },
    /** */
    getDepartmentColor(departmentName) {
      return this.departments
        .filter((department) => department.name === departmentName)
        .map((department) => department.color)
        .pop();
    },
    /** Handles requests to open a process */
    openInEditor(process) {
      if (process) this.openProcess(process);
    },
    /** */
    deleteSelectedProcesses() {
      this.selected
        .map((process) => process.id)
        .forEach((id) => {
          this.$store.dispatch('processStore/remove', { id });
        });
      this.removeBlockedProcessesDialog = false;
      this.removeSelectedProcessesDialog = false;
      this.selected = [];
    },

    /** */
    handleDeleteProcessRequest(process) {
      this.selected = this.typeProcesses.filter((pro) => pro.id === process.id);
      if (process.inEditingBy && process.inEditingBy.length > 0) {
        this.removeBlockedProcessesDialog = true;
      } else {
        this.removeSelectedProcessesDialog = true;
      }
    },
    /** */
    chooseDeleteDialog() {
      let blocked = false;
      this.selected.forEach((process) => {
        if (process.inEditingBy && process.inEditingBy.length > 0) {
          blocked = true;
        }
      });
      if (blocked) {
        this.removeBlockedProcessesDialog = true;
      } else {
        this.removeSelectedProcessesDialog = true;
      }
    },
    openProcess(process) {
      this.$emit('open', process.id);
    },
    /** */
    handleProcessHierarchy(process) {
      this.processForSubprocessModal = process;
      this.isSubprocessesModalVisible = true;
    },
    /**
     * Open export dialog for exporting multiple processes
     * get the max supported resolution, based on the size of the processes
     */
    async openExportDialog() {
      this.max = await getMaximumResolution(this.selected);
      this.exportSelectedProcessesDialog = true;
    },
    /**
     * - export selected processes in selected format
     * - add additional data (bpmn, user tasks, subprocesses, call activities)
     *
     * @param {*} selectedOption selected export format
     */
    async exportSelected(selectedOption) {
      if (!selectedOption) {
        this.exportSelectedProcessesDialog = true;
        return;
      }
      this.exportRunning = true;
      await exportSelectedProcesses(this.processes, this.selected, selectedOption);

      this.exportSelectedProcessesDialog = false;
      this.exportRunning = false;
      this.selected = [];
    },
  },
};
</script>
