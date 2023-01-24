<template>
  <v-container class="pa-3 text-left">
    <v-row>
      <v-col>
        <BpmnPreview
          :callToActionText="callToActionText"
          :bpmnFile="bpmn"
          :isDeploymentMode="isDeploymentMode"
          @editBpmn="$emit('editBpmn', process)"
        ></BpmnPreview>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="5" sm="5" md="5">
        <v-icon left>mdi-calendar</v-icon>
        <strong>Created On: </strong>
        <DateTooltip :dateTime="process.createdOn" />
      </v-col>
      <v-col cols="5" sm="5" md="5">
        <v-icon left>mdi-calendar</v-icon>
        <strong>Last Edited: </strong>
        <DateTooltip :dateTime="process.lastEdited" />
      </v-col>
      <v-col
        cols="2"
        sm="2"
        md="2"
        class="text-right"
        v-if="!simpleView && subprocesses && subprocesses.length > 0"
      >
        <v-tooltip left>
          <template v-slot:activator="{ on, attrs }">
            <a @click="$emit('createProcessHierarchy')"
              ><v-icon v-bind="attrs" v-on="on">mdi-sitemap</v-icon></a
            >
          </template>
          <span>Process Hierarchy</span>
        </v-tooltip>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" sm="12" md="12">
        <strong>Description: </strong>
        <em v-if="typeof process.description !== 'string' || process.description.length === 0"
          >No description specified.</em
        >
        <div v-else>
          <span style="white-space: pre-wrap">{{ process.description }}</span>
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" sm="12" md="12">
        <strong>Departments: </strong>
        <em v-if="!Array.isArray(process.departments) || process.departments.length === 0"
          >No departments specified.</em
        >
        <ul v-else>
          <li v-for="(department, index) in process.departments" :key="index">
            {{ department.name }}
          </li>
        </ul>
      </v-col>
    </v-row>
    <v-row v-if="!simpleView">
      <v-col>
        <v-btn
          color="error"
          block
          :disabled="!$can('delete', process)"
          @click="$emit('deleteProcessRequest', process)"
          >Delete</v-btn
        >
      </v-col>
      <v-col>
        <v-btn block @click="$emit('exportProcess', process)">Export</v-btn>
      </v-col>
      <v-col>
        <v-btn
          color="primary"
          block
          :disabled="!$can('update', process)"
          @click="$emit('editProcessRequest', process)"
          >Edit Metainformation</v-btn
        >
      </v-col>
      <v-col>
        <v-btn
          color="primary"
          block
          :disabled="!$can('view', process) && !$can('update', process)"
          @click="$emit('editBpmn', process)"
          >{{ callToActionText || 'Open Editor' }}</v-btn
        >
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import DateTooltip from '@/frontend/components/universal/DateTooltip.vue';
import BpmnPreview from '@/frontend/components/bpmn/BpmnPreview.vue';

import { getProcessHierarchy } from '@/shared-frontend-backend/helpers/process-hierarchy.js';

export default {
  name: 'Process-DataTable-Expanded',
  components: {
    BpmnPreview,
    DateTooltip,
  },
  props: {
    callToActionText: {
      type: String,
      required: false,
    },
    simpleView: {
      type: Boolean,
      required: false,
      default: false,
    },
    process: {
      type: Object,
      required: false,
      validator: function (process) {
        return !!process && process.id;
      },
    },
    isDeploymentMode: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  data() {
    return {
      bpmn: null,
      subprocesses: [],
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
