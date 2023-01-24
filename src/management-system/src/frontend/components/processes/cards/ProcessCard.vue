<template>
  <div>
    <v-skeleton-loader v-if="!isVisible" max-width="100%" type="card"></v-skeleton-loader>

    <v-lazy transition="fade-transition" min-height="200" v-model="isVisible">
      <v-card max-width="100%" hover :raised="isSelected" :dark="isSelected">
        <BpmnPreview
          :callToActionText="callToActionText"
          :bpmnFile="bpmn"
          :isDeploymentMode="isDeploymentMode"
          @editBpmn="$emit('editBpmn')"
        ></BpmnPreview>

        <v-card-title class="card-title-icon">
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <span
                v-bind="attrs"
                v-on="on"
                class="headerClass card-title"
                @click="$emit('selectProcess')"
              >
                {{ process.name }}
              </span>
            </template>
            {{ process.name }}
          </v-tooltip>

          <v-tooltip v-if="!simpleView && subprocesses && subprocesses.length > 0" left>
            <template v-slot:activator="{ on, attrs }">
              <v-btn icon @click="$emit('createProcessHierarchy')" class="card-icon ma-0 ml-2" small
                ><v-icon v-bind="attrs" v-on="on">mdi-sitemap</v-icon></v-btn
              >
            </template>
            <span>Process Hierarchy</span>
          </v-tooltip>
          <v-btn
            :disabled="simpleView"
            icon
            @click="$emit('handleFavorite')"
            class="card-icon ma-0 ml-2"
            small
          >
            <v-icon v-if="process.isFavorite" color="yellow accent-4">mdi-star</v-icon>
            <v-icon v-else>mdi-star-outline</v-icon>
          </v-btn>
        </v-card-title>

        <v-card-subtitle @click="$emit('selectProcess')">
          Last Edited: <DateTooltip :dateTime="process.lastEdited" />
        </v-card-subtitle>

        <v-card-text v-if="process.description" @click="$emit('selectProcess')">
          <span v-if="process.description.length < 200 || isExpanded">
            {{ process.description }}
          </span>
          <span v-else> {{ process.description.substring(0, 200) }}... </span>
        </v-card-text>

        <v-card-actions>
          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-if="isDeploymentMode"
                v-on="on"
                v-bind="attrs"
                color="primary"
                @click="$emit('staticDeployment')"
                >Static</v-btn
              >
            </template>
            Static Deployment
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-if="isDeploymentMode"
                v-on="on"
                v-bind="attrs"
                color="primary"
                class="ml-2"
                @click="$emit('dynamicDeployment')"
                >Dynamic</v-btn
              >
            </template>
            Dynamic Deployment
          </v-tooltip>

          <v-tooltip bottom>
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                v-if="isTemplateMode"
                v-on="on"
                v-bind="attrs"
                color="primary"
                class="ml-2"
                @click="$emit('selectTemplate')"
                >Use as template</v-btn
              >
            </template>
            Use process as template
          </v-tooltip>

          <v-spacer></v-spacer>
          <v-btn icon @click="$emit('handleExpand')">
            <v-icon>{{ isExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}</v-icon>
          </v-btn>
        </v-card-actions>
        <v-expand-transition>
          <div v-show="isExpanded">
            <v-divider></v-divider>

            <v-card-text>
              <v-row>
                <v-col>
                  <v-icon left>mdi-calendar</v-icon>
                  <strong>Created On: </strong>
                  <DateTooltip :dateTime="process.createdOn" />
                </v-col>
              </v-row>
              <v-row>
                <v-col>
                  <v-icon left>mdi-calendar</v-icon>
                  <strong>Last Edited: </strong>
                  <DateTooltip :dateTime="process.lastEdited" />
                </v-col>
              </v-row>
              <v-row>
                <v-col cols="12" sm="12" md="12">
                  <strong>Departments:</strong>

                  <v-chip-group
                    v-if="Array.isArray(process.departments) && process.departments.length > 0"
                    column
                  >
                    <v-chip
                      v-for="(department, index) in process.departments"
                      :key="index"
                      :color="department.color"
                      dark
                      small
                      @click="$emit('departmentClick', department.name)"
                      >{{ department.name }}</v-chip
                    >
                  </v-chip-group>

                  <v-row class="ml-2 mt-2 mb-2" v-else><em>No departments specified.</em></v-row>
                </v-col>
              </v-row>
              <v-row v-if="!simpleView">
                <v-col id="deleteProcessButton">
                  <v-btn color="error" block @click="$emit('deleteProcessRequest')">Delete</v-btn>
                </v-col>
                <v-col>
                  <v-btn block @click="$emit('exportProcess')">Export</v-btn>
                </v-col>
                <v-responsive width="100%"></v-responsive>
                <v-col>
                  <v-btn
                    v-if="!simpleView"
                    block
                    color="primary"
                    @click="$emit('editProcessRequest')"
                    >Edit Metainformation</v-btn
                  >
                </v-col>
                <v-col>
                  <v-btn block color="primary" @click="$emit('editBpmn')">Open Editor</v-btn>
                </v-col>
              </v-row>
            </v-card-text>
          </div>
        </v-expand-transition>
      </v-card>
    </v-lazy>
  </div>
</template>

<script>
import BpmnPreview from '@/frontend/components/bpmn/BpmnPreview.vue';
import DateTooltip from '@/frontend/components/universal/DateTooltip.vue';

import { getProcessHierarchy } from '@/shared-frontend-backend/helpers/process-hierarchy.js';

export default {
  name: 'Process-Card',
  components: {
    BpmnPreview,
    DateTooltip,
  },
  props: {
    simpleView: {
      type: Boolean,
      required: false,
      default: false,
    },
    process: {
      type: Object,
      required: true,
    },
    isSelected: {
      type: Boolean,
      required: true,
    },
    isExpanded: {
      type: Boolean,
      required: true,
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
  },
  data() {
    return {
      isVisible: false,
      subprocesses: [],
      bpmn: null,
    };
  },
  watch: {
    process: {
      async handler(newProcess, oldProcess) {
        // recalculate subprocesses when the process changes
        if (newProcess && (!oldProcess || oldProcess.id !== newProcess.id)) {
          this.bpmn = await this.$store.getters['processStore/xmlById'](newProcess.id);
          this.subprocesses = await getProcessHierarchy(this.bpmn);
        }
      },
      immediate: true,
    },
  },
};
</script>

<style lang="scss" scoped>
.v-card {
  &.selected,
  &.selected .v-card {
    background-color: #f7f7f7;
  }

  .card-title-icon {
    display: flex;
    flex-wrap: nowrap;

    .card-title {
      flex-grow: 1;
    }

    .card-icon {
      justify-self: right;
      align-self: center;
    }
  }
}
.headerClass {
  white-space: nowrap !important;
  word-break: normal !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}
</style>
