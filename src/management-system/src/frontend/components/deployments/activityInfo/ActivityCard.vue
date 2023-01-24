<template>
  <viewport-relative-resizable-window
    v-if="selectedElement"
    :canvasID="canvasID"
    :canvas="canvas"
    :initialMeasurements="initialMeasurements"
    minWidth="500px"
    @close="$emit('close')"
    @resize="emitWindowMeasurements"
    @move="emitWindowMeasurements"
  >
    <template #header>
      <div v-if="cardSize === 'large'">
        <v-tabs v-model="tab">
          <v-tab v-for="item in cardItems" :key="item">
            {{ item }}
          </v-tab>
        </v-tabs>
      </div>
      <v-menu offset-y v-else>
        <template v-slot:activator="{ on, attrs }">
          <v-btn icon v-bind="attrs" v-on="on">
            <v-icon>mdi-menu</v-icon>
          </v-btn>
        </template>

        <v-list>
          <v-list-item-group v-model="tab">
            <v-list-item v-for="(item, i) in cardItems" :key="i">
              <v-list-item-title>{{ item }}</v-list-item-title>
            </v-list-item>
          </v-list-item-group>
        </v-list>
      </v-menu>
    </template>
    <v-card id="activityCard" elevation="6">
      <v-card-text class="pa-0">
        <v-tabs-items v-model="tab">
          <v-tab-item>
            <v-container>
              <div class="text-h6 font-weight-regular mb-4">
                Status of <span class="font-weight-black font-italic">{{ title }}</span>
              </div>
              <activity-status-information
                :metaData="metaData"
                :instance="instance"
                :deployment="deployment"
                :location="location"
                :milestones="milestones"
                :selectedElement="selectedElement"
                :title="title"
                :size="cardSize"
              >
                <template #process-preview>
                  <slot name="process-preview"></slot>
                </template>
              </activity-status-information>
            </v-container>
          </v-tab-item>
          <v-tab-item>
            <v-container>
              <div class="text-h6 font-weight-regular mb-4">
                Advanced Information of
                <span class="font-weight-black font-italic">{{ title }}</span>
              </div>
              <activity-advanced-information
                :instance="instance"
                :deployment="deployment"
                :selectedVersion="selectedVersion"
                :selectedElement="selectedElement"
                :selectedToken="selectedToken"
              >
                <template #additional-content>
                  <slot name="additional-content"></slot>
                </template>
              </activity-advanced-information>
            </v-container>
          </v-tab-item>
          <v-tab-item>
            <v-container>
              <div class="text-h6 font-weight-regular mb-4">
                Timing Information of <span class="font-weight-black font-italic">{{ title }}</span>
              </div>
              <activity-timing-information
                :metaData="metaData"
                :instance="instance"
                :location="location"
                :milestones="milestones"
                :selectedElement="selectedElement"
                :title="title"
                :size="cardSize"
              ></activity-timing-information>
            </v-container>
          </v-tab-item>
          <v-tab-item>
            <v-container>
              <div class="text-h6 font-weight-regular mb-4">
                Assignment Information of
                <span class="font-weight-black font-italic">{{ title }}</span>
              </div>
            </v-container>
          </v-tab-item>
          <v-tab-item>
            <v-container>
              <div class="text-h6 font-weight-regular mb-4">
                Resource Information of
                <span class="font-weight-black font-italic">{{ title }}</span>
              </div>
              <activity-resource-information
                :metaData="metaData"
                :instance="instance"
                :location="location"
                :milestones="milestones"
                :selectedElement="selectedElement"
                :title="title"
                :size="cardSize"
              ></activity-resource-information>
            </v-container>
          </v-tab-item>
        </v-tabs-items>
      </v-card-text>
    </v-card>
  </viewport-relative-resizable-window>
</template>

<script>
import ViewportRelativeResizableWindow from '@/frontend/components/resizable-window/ViewportRelativeResizableWindow.vue';
import ActivityStatusInformation from '@/frontend/components/deployments/activityInfo/ActivityStatusInformation.vue';
import ActivityResourceInformation from '@/frontend/components/deployments/activityInfo/ActivityResourceInformation.vue';
import ActivityAdvancedInformation from '@/frontend/components/deployments/activityInfo/ActivityAdvancedInformation.vue';
import ActivityTimingInformation from '@/frontend/components/deployments/activityInfo/ActivityTimingInformation.vue';
export default {
  components: {
    ViewportRelativeResizableWindow,
    ActivityStatusInformation,
    ActivityResourceInformation,
    ActivityAdvancedInformation,
    ActivityTimingInformation,
  },
  props: {
    canvasID: String,
    metaData: Object,
    instance: Object,
    selectedElement: Object,
    title: String,
    deployment: Object,
    selectedVersion: Object,
    location: Object,
    milestones: Array,
    selectedToken: Object,
  },
  data() {
    return {
      tab: 0,
      cardItems: ['Status', 'Advanced', 'Timing', 'Assignments', 'Resources'],
    };
  },
  computed: {
    windowMeasurements() {
      return this.$store.getters['userPreferencesStore/getStatusWindowMeasurementsProjectView'];
    },
    cardSize() {
      const activityCardWidth = this.convertVwToPixel(
        this.windowMeasurements.width.substring(0, this.windowMeasurements.width.indexOf('vw'))
      );
      return activityCardWidth >= 700 ? 'large' : 'small';
    },
    initialMeasurements() {
      const storedTopValueInVh = parseFloat(
        this.windowMeasurements.top.substring(0, this.windowMeasurements.top.indexOf('vh'))
      );

      return {
        top: `${Math.max(storedTopValueInVh, this.convertPixelToVh(100))}vh`,
        right: this.windowMeasurements.right,
        width: this.windowMeasurements.width,
        height: this.windowMeasurements.height,
      };
    },
    canvas() {
      const canvas = document.getElementById(this.canvasID).getBoundingClientRect();
      return {
        top: canvas.top + 100,
      };
    },
  },
  methods: {
    convertVwToPixel(valueInVw) {
      return (valueInVw / 100) * window.innerWidth;
    },
    convertPixelToVh(valueInPixel) {
      return 100 * (valueInPixel / window.innerHeight);
    },
    emitWindowMeasurements(changes) {
      this.$store.dispatch('userPreferencesStore/setStatusWindowMeasurementsProjectView', changes);
    },
  },
  watch: {
    selectedToken: {
      async handler(newTokenSelection) {
        if (newTokenSelection) {
          this.tab = 1;
        }
      },
      immediate: true,
    },
  },
};
</script>

<style lang="scss" scoped>
#activityCard {
  overflow-y: auto;
  height: calc(100% - 48px); // minus height for toolbar as header
}
</style>
