<template>
  <v-dialog :value="show" :max-width="maxWidth" @input="$emit('cancel')">
    <v-card>
      <v-card-title>
        Processes
        <v-btn-toggle v-model="processViewMode" class="ml-3" color="primary" mandatory dense group>
          <v-btn value="table">
            <v-icon>mdi-format-align-justify</v-icon>
          </v-btn>
          <v-btn value="card">
            <v-icon>mdi-apps</v-icon>
          </v-btn>
        </v-btn-toggle>
        <v-spacer />
        <v-btn icon @click="$emit('cancel')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      <v-divider></v-divider>
      <v-card-text style="padding-top: 20px">
        <v-text-field
          v-model="search"
          append-icon="mdi-magnify"
          label="Search"
          single-line
          :disabled="!mappedProcesses || mappedProcesses.length === 0"
          clearable
        ></v-text-field>

        <v-divider />

        <ProcessCardList
          v-if="processViewMode === 'card'"
          simpleView
          :isDeploymentMode="isDeploymentMode"
          :isTemplateMode="isTemplateMode"
          :processes="mappedProcesses"
          :search.sync="search"
          :expanded.sync="expanded"
          :showFavoriteList.sync="showFavoriteList"
          :callToActionText="callToActionText"
          @editBpmn="editBpmn"
          @dynamicDeployment="$emit('dynamicDeployment', $event)"
          @staticDeployment="$emit('staticDeployment', $event)"
          @selectTemplate="$emit('selectTemplate', $event)"
        />
        <ProcessDataTable
          v-else-if="processViewMode === 'table'"
          simpleView
          :isDeploymentMode="isDeploymentMode"
          :isTemplateMode="isTemplateMode"
          :processes="mappedProcesses"
          :search.sync="search"
          :expanded.sync="expanded"
          :showFavoriteList.sync="showFavoriteList"
          :callToActionText="callToActionText"
          @editBpmn="editBpmn"
          @staticDeployment="$emit('staticDeployment', $event)"
          @dynamicDeployment="$emit('dynamicDeployment', $event)"
          @selectTemplate="$emit('selectTemplate', $event)"
        />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script>
import ProcessCardList from '@/frontend/components/processes/cards/ProcessCardList.vue';
import ProcessDataTable from '@/frontend/components/processes/datatable/ProcessDatatable.vue';

export default {
  name: 'new-tab-modal',
  components: {
    ProcessCardList,
    ProcessDataTable,
  },
  props: {
    callToActionText: { type: String, required: false },
    isDeploymentMode: { type: Boolean, required: false, default: false },
    isTemplateMode: { type: Boolean, required: false, default: false },
    show: { type: Boolean, required: true },
    maxWidth: { type: String, required: false },
  },
  computed: {
    showFavoriteList: {
      get() {
        return this.$store.getters['userPreferencesStore/getShowFavoritesProcessView'];
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setShowFavoritesProcessView', newValue);
        this.expanded = [];
      },
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
      const processes = this.$store.getters['processStore/processes'];
      const processType = this.isTemplateMode ? 'template' : 'process';
      return processes ? processes.filter((process) => process.type === processType) : [];
    },
    mappedProcesses() {
      if (!this.processes) return [];

      let processes = this.processes.map((process) => {
        return {
          ...process,
          departments: process.departments
            ? process.departments.map((department) => {
                return {
                  name: department,
                  color: this.getDepartmentColor(department),
                };
              })
            : '',
          isFavorite: this.favorites.includes(process.id),
        };
      });

      if (this.showFavoriteList) {
        processes = processes.filter((process) => process.isFavorite);
      }

      return processes;
    },
  },
  data() {
    return {
      search: '',
      expanded: [],
    };
  },
  watch: {
    search() {
      this.expanded = [];
    },
    processViewMode() {
      this.expanded = [];
    },
  },
  methods: {
    editBpmn(process) {
      if (process) {
        this.$emit('click:bpmnPreview', process.id);
      }
    },
    getDepartmentColor(departmentName) {
      return this.departments
        .filter((department) => department.name === departmentName)
        .map((department) => department.color)
        .pop();
    },
  },
};
</script>
