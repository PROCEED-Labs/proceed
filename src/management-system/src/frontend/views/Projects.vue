<template>
  <base-layout
    processType="project"
    title="Projects"
    addText="Create Project"
    callToAction="Open Project"
    @open="openOverview"
  >
    <template #before-table>
      <v-container fluid class="mt-3">
        <v-card>
          <v-row wrap>
            <v-col cols="12" sm="6">
              <v-card flat class="pa-1">
                <pie-chart
                  :height="120"
                  :chartdata="scheduleStatusData"
                  :options="scheduleStatusOptions"
                ></pie-chart>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6">
              <v-card flat class="pa-1">
                <pie-chart
                  :height="120"
                  :chartdata="planningStatusData"
                  :options="planningStatusOptions"
                ></pie-chart>
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-container>
    </template>
  </base-layout>
</template>
<script>
import BaseLayout from '@/frontend/components/processes/ProcessViewsBaseLayout.vue';

import PieChart from '@/frontend/components/projects/PieChart.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:Projects
 *
 */

export default {
  components: {
    BaseLayout,
    PieChart,
  },
  computed: {
    scheduleStatusData() {
      const chartData = {
        labels: ['In Preparation', 'On Schedule', 'Time Sensitive', 'Behind Schedule'],
        datasets: [
          {
            label: 'Schedule Status',
            backgroundColor: ['#DCDCDC', '#9ACD32', '#FFA500', '#B22222'],
            data: [1, 10, 5, 7],
          },
        ],
      };
      return chartData;
    },
    planningStatusData() {
      const chartData = {
        labels: ['Completely Planned', 'Planning in Progress', 'Need Replanning'],
        datasets: [
          {
            label: 'Planning Status',
            backgroundColor: ['#9ACD32', '#FFA500', '#B22222'],
            data: [10, 5, 7],
          },
        ],
      };
      return chartData;
    },
  },
  data() {
    return {
      scheduleStatusOptions: {
        title: {
          display: true,
          text: 'Running Projects',
          position: 'bottom',
          align: 'left',
        },
        legend: {
          position: 'right',
        },
      },
      planningStatusOptions: {
        title: {
          display: true,
          text: 'Project Planning',
          position: 'bottom',
          align: 'left',
        },
        legend: {
          position: 'right',
        },
      },
    };
  },
  methods: {
    openOverview(id) {
      this.$router.push({ name: 'show-project-bpmn', params: { id } });
    },
  },
};
</script>
