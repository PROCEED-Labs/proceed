<template>
  <div>
    <tooltip-button @click="showExportDialog">
      <template #tooltip-text>Export</template>
      mdi-export
    </tooltip-button>
    <export-modal
      :loading="exportRunning"
      title="Export selected process"
      text="Please select a format for the file export"
      error="Please select a format"
      :max="max"
      :show="isExportDialogVisible"
      @cancel="isExportDialogVisible = false"
      @continue="exportSelected"
    />
  </div>
</template>
<script>
import ExportModal from '@/frontend/components/processes/ExportModal.vue';
import TooltipButton from '@/frontend/components/universal/TooltipButton.vue';

import { exportSelectedProcesses } from '@/frontend/helpers/process-export/process-export.js';
import { getMaximumResolution } from '@/frontend/helpers/process-export/process-max-resolution.js';

export default {
  components: { ExportModal, TooltipButton },
  props: {
    process: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      isExportDialogVisible: false,
      exportRunning: false,

      max: 10,
    };
  },
  methods: {
    async showExportDialog() {
      this.max = await getMaximumResolution([this.process]);
      this.isExportDialogVisible = true;
    },

    async exportSelected(selectedOption) {
      if (!selectedOption) {
        this.exportSelectedProcessesDialog = true;
        return;
      }

      this.exportRunning = true;
      const allProcesses = await this.$store.getters['processStore/processes'];
      await exportSelectedProcesses(allProcesses, [{ ...this.process }], selectedOption);
      this.exportSelectedProcessesDialog = false;
      this.exportRunning = false;
    },
  },
};
</script>
