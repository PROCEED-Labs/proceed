<template>
  <v-data-table
    class="process-data-table"
    v-model="internalSelected"
    :headers="headers.filter((header) => header.display === true)"
    :items="groupedProcesses"
    :search="internalSearch"
    :expanded.sync="internalExpanded"
    :items-per-page.sync="itemsPerPage"
    :sort-by.sync="sortBy"
    show-expand
    :show-select="!simpleView"
    :no-data-text="
      'Huh! Seems like there are no ' +
      (isProjectMode ? 'Projects' : 'Processes') +
      ' available at the moment.'
    "
    no-results-text="No matching processes found"
    @click:row="handleRowClick"
  >
    <template v-slot:header.favorite>
      <v-btn icon small @click="$emit('update:showFavoriteList', !showFavoriteList)">
        <v-icon v-if="!showFavoriteList">mdi-star-outline</v-icon>
        <v-icon v-else color="yellow accent-4">mdi-star</v-icon>
      </v-btn>
    </template>

    <template v-if="isDeploymentMode" v-slot:item.actions="{ item }">
      <DeploymentButton deploymentMethod="static" @deploy="$emit('staticDeployment', item)" />
      <DeploymentButton deploymentMethod="dynamic" @deploy="$emit('dynamicDeployment', item)" />
    </template>

    <template v-else-if="isTemplateMode" v-slot:item.actions="{ item }">
      <v-btn class="mr-2 my-1" color="primary" @click="$emit('selectTemplate', item)"
        >Use as template</v-btn
      >
    </template>

    <template v-slot:header.departments>
      Departments
      <DepartmentsHeader
        :uniqueDepartments="uniqueDepartments"
        :groupByDepartments="groupByDepartments"
        @handleGroupByDepartments="handleGroupByDepartments"
        @emptyDepartments="groupByDepartments = []"
      />
    </template>

    <template v-slot:header.data-table-expand>
      <v-menu internal-activator offset-y>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on">
            <v-icon>mdi-dots-vertical</v-icon>
          </v-btn>
        </template>
        <v-list>
          <v-list-item
            v-for="(header, index) in headers.filter((header) => header.text)"
            :key="index"
            color="primary"
            :input-value="header.display"
            @click="handleHeaderSelection(header)"
          >
            <v-list-item-action>
              <v-checkbox v-model="header.display" color="primary"></v-checkbox>
            </v-list-item-action>

            <v-list-item-content>
              <v-list-item-title>{{ header.text }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </v-list>
      </v-menu>
    </template>

    <template v-slot:item.name="{ item }" width="auto">
      <strong>{{ item.name }}</strong>
    </template>

    <template v-slot:item.createdOn="{ item }">
      <DateTooltip :dateTime="item.createdOn" />
    </template>

    <template v-slot:item.lastEdited="{ item }">
      <DateTooltip :dateTime="item.lastEdited" />
    </template>

    <template v-slot:item.favorite="{ item }">
      <v-btn :disabled="simpleView || noActions" icon small @click="$emit('handleFavorite', item)">
        <v-icon v-if="item.isFavorite" color="yellow accent-4">mdi-star</v-icon>
        <v-icon v-else>mdi-star-outline</v-icon>
      </v-btn>
    </template>

    <template v-slot:item.departments="{ item }">
      <v-chip-group column>
        <v-chip
          v-for="(department, index) in item.departments"
          :key="index"
          :color="department.color"
          dark
          small
          @click="groupByDepartments = []"
          >{{ department.name }}</v-chip
        >
      </v-chip-group>
    </template>

    <template v-slot:expanded-item="{ headers, item }">
      <td :colspan="headers.length" transition="slide-y-transition">
        <ProcessDatatableExpanded
          :simpleView="simpleView || noActions"
          :process="item"
          :callToActionText="callToActionText"
          :isDeploymentMode="isDeploymentMode"
          @editBpmn="$emit('editBpmn', item)"
          @deleteProcessRequest="$emit('deleteProcessRequest', item)"
          @exportProcess="$emit('exportProcess', item)"
          @editProcessRequest="$emit('editProcessRequest', item)"
          @createProcessHierarchy="$emit('createProcessHierarchy', item)"
        />
      </td>
    </template>
  </v-data-table>
</template>

<script>
import ProcessDatatableExpanded from '@/frontend/components/processes/datatable/ProcessDatatableExpanded.vue';
import headers from '@/frontend/helpers/process-datatable-headers.js';
import DateTooltip from '@/frontend/components/universal/DateTooltip.vue';
import DeploymentButton from '@/frontend/components/processes/datatable/DeploymentButton.vue';
import DepartmentsHeader from '@/frontend/components/processes/datatable/DepartmentsHeader.vue';

export default {
  name: 'Process-DataTable',
  components: {
    ProcessDatatableExpanded,
    DateTooltip,
    DeploymentButton,
    DepartmentsHeader,
  },
  props: {
    simpleView: {
      type: Boolean,
      default: false,
    },
    noActions: {
      type: Boolean,
      default: false,
    },
    processes: {
      type: Array,
      required: true,
    },
    search: {
      type: String,
      default: '',
    },
    showFavoriteList: {
      type: Boolean,
      default: false,
    },
    selected: {
      type: Array,
      default: () => [],
    },
    expanded: {
      type: Array,
      default: () => [],
    },
    callToActionText: {
      type: String,
    },
    isDeploymentMode: {
      type: Boolean,
      default: false,
    },
    isTemplateMode: {
      type: Boolean,
      default: false,
    },
    isProjectMode: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    columnSelection: {
      get() {
        return this.isProjectMode
          ? this.$store.getters['userPreferencesStore/getColumnSelectionsProjectView']
          : this.$store.getters['userPreferencesStore/getColumnSelectionsProcessView'];
      },
      set(newValue) {
        if (this.isProjectMode) {
          this.$store.dispatch('userPreferencesStore/setColumnSelectionProjectView', newValue);
        } else {
          this.$store.dispatch('userPreferencesStore/setColumnSelectionProcessView', newValue);
        }
      },
    },
    headers() {
      let allHeaders = headers.map((header) => ({
        ...header,
        display: header.text ? this.columnSelection.includes(header.text) : true,
      }));

      return this.isProjectMode ? allHeaders : allHeaders.filter((h) => !h.isProject);
    },
    itemsPerPage: {
      get() {
        return this.$store.getters['userPreferencesStore/getItemsPerPage'];
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setItemsPerPageInProcessView', newValue);
      },
    },
    sortBy: {
      get() {
        return this.$store.getters['userPreferencesStore/getSortBy'];
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setSortByInProcessView', newValue);
      },
    },
    groupByDepartments: {
      get() {
        return this.$store.getters['userPreferencesStore/getGroupByDepartments'];
      },
      set(newValue) {
        this.$store.dispatch(
          'userPreferencesStore/setSetGroupByDepartmentsInProcessView',
          newValue
        );
      },
    },
    internalSearch: {
      get() {
        return this.search;
      },
      set(newValue) {
        this.$emit('update:search', newValue);
      },
    },
    internalSelected: {
      get() {
        return this.selected;
      },
      set(newValue) {
        this.$emit('update:selected', newValue);
      },
    },
    internalExpanded: {
      get() {
        if (this.isDeploymentMode) {
          return undefined;
        } else {
          return this.expanded;
        }
      },
      set(newValue) {
        this.$emit('update:expanded', newValue);
      },
    },
    uniqueDepartments() {
      return (
        this.processes
          .map((process) => process.departments)
          .flat()
          // filter to make list unqiue, by the name property of the department
          .filter(
            (value, index, self) =>
              value.name && self.findIndex((department) => department.name == value.name) === index
          )
          .sort((dep1, dep2) => (dep1.name < dep2.name ? -1 : 1))
      );
    },
    groupedProcesses() {
      if (!Array.isArray(this.groupByDepartments) || !this.groupByDepartments.length)
        return this.processes;

      return this.processes.filter(
        (process) =>
          Array.isArray(process.departments) &&
          process.departments.some((department) =>
            this.groupByDepartments.some(
              (groupedDepartment) => department.name === groupedDepartment.name
            )
          )
      );
    },
  },
  methods: {
    handleRowClick(process) {
      if (this.isDeploymentMode) return;
      if (this.internalExpanded.find((expandedProcess) => expandedProcess.id === process.id)) {
        this.internalExpanded = [];
      } else {
        this.internalExpanded = [process];
      }
    },
    handleGroupByDepartments(department) {
      const index = this.groupByDepartments.findIndex(
        (groupedDepartment) => groupedDepartment.name === department.name
      );
      index !== -1
        ? this.groupByDepartments.splice(index, 1)
        : this.groupByDepartments.push(department);

      this.groupByDepartments = this.groupByDepartments;
    },
    handleHeaderSelection(header) {
      if (this.columnSelection.includes(header.text)) {
        this.columnSelection = this.columnSelection.filter(
          (headerText) => headerText !== header.text
        );
      } else {
        this.columnSelection = [...this.columnSelection, header.text];
      }
    },
  },
};
</script>

<style lang="scss">
.process-data-table.v-data-table tbody tr:not(.v-data-table__empty-wrapper) {
  cursor: pointer;

  &:not(.v-data-table__expanded__content):nth-of-type(odd) {
    background-color: #f5f5f5;
  }

  &:not(.v-data-table__expanded__content):hover,
  &.v-data-table__expanded.v-data-table__expanded__row {
    background-color: #1976d248;
  }

  &.v-data-table__expanded.v-data-table__expanded__content {
    cursor: default;
  }
}
</style>
