<template>
  <v-container>
    <activity-time-calculation
      :instance="instance"
      :location="location"
      :selectedElement="selectedElement"
      :metaData="metaData"
      :size="size"
    />
    <v-row class="my-6" v-if="selectedElement && selectedElement.type === 'bpmn:UserTask'">
      <v-col cols="12">
        <span class="text-subtitle-2 font-weight-medium">
          <v-icon left>mdi-flag-triangle</v-icon>Milestone Progress:
        </span>
      </v-col>
      <v-col class="pt-0">
        <v-data-table
          class="milestone-table"
          dense
          :headers="headers"
          :items="milestonesWithProgress"
          :items-per-page="5"
          :mobile-breakpoint="size === 'large' ? 0 : 9999"
        ></v-data-table>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import ActivityTimeCalculation from '@/frontend/components/deployments/activityInfo/ActivityTimeCalculation.vue';

export default {
  components: { ActivityTimeCalculation },
  props: {
    metaData: Object,
    instance: Object,
    selectedElement: Object,
    title: String,
    location: Object,
    milestones: Array,
    size: { type: String, default: 'large' },
  },
  data() {
    return {
      headers: [
        {
          text: 'ID',
          value: 'id',
          width: '15%',
          divider: true,
        },
        { text: 'Name', value: 'name', width: '30%', divider: true },
        { text: 'Description', value: 'description', sortable: false, width: '40%', divider: true },
        { text: 'Progress', value: 'progress', width: '15%' },
      ],
    };
  },
  computed: {
    isRootElement() {
      return this.selectedElement && this.selectedElement.type === 'bpmn:Process';
    },
    selectedElementInformation() {
      let elementInfo = {};

      if (this.selectedElement && this.instance) {
        const logInfo = this.instance.log.find((l) => l.flowElementId == this.selectedElement.id);
        if (logInfo) {
          elementInfo = logInfo;
        } else {
          const tokenInfo = this.instance.tokens.find(
            (l) => l.currentFlowElementId == this.selectedElement.id
          );

          if (tokenInfo) {
            elementInfo = tokenInfo;
          }
        }
      }

      return elementInfo;
    },
    milestonesWithProgress() {
      return this.milestones.map((milestone) => {
        let milestoneProgress = 0;
        if (this.instance) {
          const { milestones } = this.selectedElementInformation;
          milestoneProgress = (milestones && milestones[milestone.id]) || 0;
        }
        return { ...milestone, progress: `${milestoneProgress}%` };
      });
    },
  },
  methods: {},
};
</script>

<style lang="scss" scoped>
.milestone-table {
  border: 1px solid lightgrey;
}
</style>
