<template>
  <div>
    <v-row>
      <v-col cols="10">
        <div class="d-flex flex-column">
          <v-slider
            v-if="settingProgress && !readOnly"
            :thumb-size="20"
            dense
            hide-details
            :value="currentProgress.value"
            @change="changeAssumedProgressSlider"
          >
            <template v-slot:append>
              <span class="font-weight-medium">{{ currentProgress.value }}%</span>
            </template>
          </v-slider>
          <v-progress-linear v-else class="mb-2" height="20" :value="currentProgress.value">
            <template v-slot:default="{ value }">
              <strong class="white--text">{{ value }}%</strong>
            </template>
          </v-progress-linear>
          <div class="d-flex align-center">
            <span class="mr-2">Manual</span>
            <v-simple-checkbox
              class="ma-0"
              v-ripple
              hide-details
              dense
              :disabled="!settingProgress"
              :value="currentProgress.manual"
              @input="setProgressManually"
            ></v-simple-checkbox>
          </div>
        </div>
      </v-col>
      <v-col cols="2">
        <div v-if="!readOnly">
          <v-icon v-if="settingProgress" @click="submitProgress()" dense>mdi-send</v-icon>
          <v-icon v-else @click="settingProgress = true" dense>mdi-pencil</v-icon>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  props: {
    initialProgress: Object,
    readOnly: Boolean,
  },
  data() {
    return {
      settingProgress: false,
      currentProgress: { value: 0, manual: false },
    };
  },
  computed: {},
  methods: {
    changeAssumedProgressSlider(value) {
      this.currentProgress.value = value;
      this.currentProgress.manual = true;
    },
    setProgressManually(manualVal) {
      this.currentProgress.manual = manualVal;
      // reset to milestone calculated progress if progress is no longer set manually
      if (!manualVal) {
        this.currentProgress.value = this.initialProgress.milestoneCalculatedProgress;
      }
    },
    async submitProgress() {
      this.settingProgress = false;
      this.$emit('submitProgress', this.currentProgress);
    },
  },
  watch: {
    initialProgress: {
      handler(newInitialProgress) {
        this.currentProgress.value = newInitialProgress.value;
        this.currentProgress.manual = newInitialProgress.manual;
      },
      immediate: true,
    },
  },
};
</script>

<style lang="scss" scoped>
.v-slider--horizontal {
  margin: 0 !important;

  .v-slider__track-container {
    height: 8px !important;
  }
}
.v-input__append-outer {
  margin-top: 6px !important;
}
</style>
