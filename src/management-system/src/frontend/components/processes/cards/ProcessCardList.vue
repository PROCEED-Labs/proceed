<template>
  <v-sheet :color="`grey ${theme.isDark ? 'darken-2' : 'lighten-4'}`">
    <v-container>
      <v-row>
        <v-col v-if="!simpleView" cols="2" class="d-flex align-center justify-start">
          <v-chip
            v-if="selected.length"
            color="primary"
            text-color="primary"
            small
            outlined
            close
            @click:close="$emit('update:selected', [])"
          >
            {{ selected.length }} selected
          </v-chip>
          <v-btn
            v-else
            color="primary"
            text-color="primary"
            rounded
            outlined
            small
            @click="$emit('update:selected', processes)"
            >Select all</v-btn
          >
        </v-col>
        <v-spacer />
        <v-col cols="2">
          <v-select
            :items="columnOptions"
            v-model="selectedColumOption"
            dense
            hide-details
            label="Cards per row"
          ></v-select>
        </v-col>
        <v-col cols="1" class="d-flex align-center justify-center">
          <v-btn icon small @click="$emit('update:showFavoriteList', !showFavoriteList)">
            <v-icon v-if="!showFavoriteList">mdi-star-outline</v-icon>
            <v-icon v-if="showFavoriteList" color="yellow accent-4">mdi-star</v-icon>
          </v-btn>
        </v-col>
      </v-row>
      <v-row>
        <v-col v-if="!Array.isArray(filteredProcesses) || filteredProcesses.length === 0">
          <em>Huh! Seems like there are no processes available at the moment.</em>
        </v-col>
        <v-col
          :cols="12 / selectedColumOption"
          class="text-left center"
          v-for="process in filteredProcesses"
          :key="process.id"
        >
          <ProcessCard
            :simpleView="simpleView"
            :process="process"
            :isSelected="isSelected(process)"
            :isExpanded="isExpanded(process)"
            :callToActionText="callToActionText"
            :isDeploymentMode="isDeploymentMode"
            :isTemplateMode="isTemplateMode"
            @selectTemplate="$emit('selectTemplate', process)"
            @dynamicDeployment="$emit('dynamicDeployment', process)"
            @staticDeployment="$emit('staticDeployment', process)"
            @editBpmn="$emit('editBpmn', process)"
            @selectProcess="selectProcess(process)"
            @handleFavorite="$emit('handleFavorite', process)"
            @createProcessHierarchy="$emit('createProcessHierarchy', process)"
            @handleExpand="handleExpand(process)"
            @editProcessRequest="$emit('editProcessRequest', process)"
            @deleteProcessRequest="$emit('deleteProcessRequest', process)"
            @exportProcess="$emit('exportProcess', process)"
            @departmentClick="(departmentName) => $emit('update:search', departmentName)"
          ></ProcessCard>
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script>
import ProcessCard from '@/frontend/components/processes/cards/ProcessCard.vue';

export default {
  name: 'ProcessCardList',
  inject: ['theme'],
  components: {
    ProcessCard,
  },
  props: {
    simpleView: {
      type: Boolean,
      required: false,
      default: false,
    },
    processes: {
      type: Array,
      required: true,
    },
    search: {
      type: String,
      required: false,
      default: '',
    },
    showFavoriteList: {
      type: Boolean,
      required: false,
      default: false,
    },
    selected: {
      type: Array,
      required: false,
      default: () => [],
    },
    expanded: {
      type: Array,
      required: false,
      default: () => [],
    },
    callToActionText: {
      type: String,
      required: false,
    },
    isDeploymentMode: {
      type: Boolean,
      required: false,
      default: false,
    },
    isTemplateMode: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  computed: {
    selectedColumOption: {
      get() {
        return this.$store.getters['userPreferencesStore/getCardsPerRow'];
      },
      set(newValue) {
        this.$store.dispatch('userPreferencesStore/setCardsPerRowInProcessView', newValue);
      },
    },
    filteredProcesses() {
      if (!this.search) return this.processes;

      const includesSearchString = (stringToSearch) =>
        typeof stringToSearch === 'string' &&
        stringToSearch.match(new RegExp(`.*${this.search}.*`, 'i'));

      return this.processes.filter((process) => {
        const hasMatchingName = includesSearchString(process.name);

        const hasMatchingDescription = includesSearchString(process.description);

        const hasMatchingDepartment =
          Array.isArray(process.departments) &&
          process.departments.some((department) => includesSearchString(department.name));

        return hasMatchingName || hasMatchingDescription || hasMatchingDepartment;
      });
    },
  },
  data() {
    return {
      columnOptions: [1, 2, 3, 4],
    };
  },
  methods: {
    selectProcess(process) {
      let newSelected;

      if (this.isSelected(process)) {
        newSelected = this.selected.filter((selectedProcess) => selectedProcess.id != process.id);
      } else {
        newSelected = [...this.selected, process];
      }

      this.$emit('update:selected', newSelected);
    },
    handleExpand(process) {
      let newExpanded;

      if (this.isExpanded(process)) {
        newExpanded = this.expanded.filter((expandedProcess) => expandedProcess.id != process.id);
      } else {
        newExpanded = [...this.expanded, process];
      }

      this.$emit('update:expanded', newExpanded);
    },
    isSelected(process) {
      return !!this.selected.find((selectedProcess) => selectedProcess.id === process.id);
    },
    isExpanded(process) {
      return !!this.expanded.find((expandedProcess) => expandedProcess.id === process.id);
    },
  },
};
</script>
