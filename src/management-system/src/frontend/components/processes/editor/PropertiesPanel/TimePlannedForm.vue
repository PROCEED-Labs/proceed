<template>
  <div>
    <DurationForm
      title="Planned Duration"
      :show="showDurationFormDialog"
      :formalExpression="meta.timePlannedDuration || ''"
      @save="emitPlannedDuration($event.formalExpression)"
      @close="showDurationFormDialog = false"
    />
    <v-dialog v-model="showDateTimePickerDialog" width="unset">
      <date-time-picker
        v-if="showDateTimePickerDialog"
        @pick="emitPlannedDateTime($event.pickedDate, $event.pickedTime)"
      ></date-time-picker>
    </v-dialog>
    <v-row class="mb-4" align="center" justify="center" v-if="processType === 'project'">
      <v-btn-toggle
        v-model="selectedTimeFields"
        multiple
        max="2"
        @change="changeSelectedTimeFields()"
      >
        <v-btn
          class="mx-0"
          value="timePlannedOccurrence"
          :disabled="
            selectedTimeFields.length === 2 && !selectedTimeFields.includes('timePlannedOccurrence')
          "
        >
          Start Time
        </v-btn>
        <v-btn
          class="mx-0"
          value="timePlannedDuration"
          :disabled="
            selectedTimeFields.length === 2 && !selectedTimeFields.includes('timePlannedDuration')
          "
        >
          Duration
        </v-btn>
        <v-btn
          class="mx-0"
          value="timePlannedEnd"
          :disabled="
            selectedTimeFields.length === 2 && !selectedTimeFields.includes('timePlannedEnd')
          "
        >
          End Time
        </v-btn>
      </v-btn-toggle>
    </v-row>

    <v-text-field
      v-if="processType === 'project' && selectedTimeFields.includes('timePlannedOccurrence')"
      label="Planned Start"
      ref="timePlannedOccurrence"
      :disabled="disableEditing"
      :placeholder="
        meta.timePlannedOccurrence ? meta.timePlannedOccurrence : 'e.g.2015-06-26T09:54:00'
      "
      :value="meta.timePlannedOccurrence"
      @click="showDateTimePicker('timePlannedOccurrence')"
      background-color="white"
      filled
    />
    <v-text-field
      v-if="processType === 'project' && selectedTimeFields.includes('timePlannedEnd')"
      label="Planned End"
      ref="timePlannedEnd"
      :disabled="disableEditing"
      :placeholder="meta.timePlannedEnd ? meta.timePlannedEnd : 'e.g.2015-09-26T09:54:00'"
      :value="meta.timePlannedEnd"
      background-color="white"
      @click="showDateTimePicker('timePlannedEnd')"
      filled
    />
    <v-text-field
      v-if="
        processType !== 'project' ||
        (processType === 'project' && selectedTimeFields.includes('timePlannedDuration'))
      "
      label="Planned Duration"
      ref="timePlannedDuration"
      :disabled="disableEditing"
      :placeholder="
        meta.timePlannedDuration
          ? meta.timePlannedDuration
          : 'e.g. PT2H30M, P2M10D, P1Y2M3DT4H30M12S'
      "
      :value="meta.timePlannedDuration"
      background-color="white"
      @click="showDurationFormDialog = true"
      filled
    />
  </div>
</template>

<script>
import { getTimeZone } from '@/shared-frontend-backend/helpers/javascriptHelpers.js';
import DateTimePicker from '@/frontend/components/universal/DateTimePicker.vue';
import DurationForm from '@/frontend/components/processes/editor/DurationForm';
export default {
  name: 'TimePlannedForm',
  components: { DateTimePicker, DurationForm },
  props: ['processType', 'element', 'meta', 'disableEditing'],
  data() {
    return {
      showDateTimePickerDialog: false,
      showDurationFormDialog: false,
      allTimeFields: ['timePlannedEnd', 'timePlannedOccurrence', 'timePlannedDuration'],
      selectedTimeFields: [],
      selectedDateTimePicker: null, // 'timePlannedEnd' | 'timePlannedOccurrence' | null
    };
  },
  computed: {},
  methods: {
    changeSelectedTimeFields() {
      this.allTimeFields.forEach((timeField) => {
        if (!this.selectedTimeFields.includes(timeField) && this.meta[timeField]) {
          this.$emit('change', {
            [timeField]: undefined,
          });
        }
      });
    },
    showDateTimePicker(selectedField) {
      this.selectedDateTimePicker = selectedField;
      this.showDateTimePickerDialog = true;
    },
    emitPlannedDuration(duration) {
      this.showDurationFormDialog = false;
      this.$emit('change', {
        timePlannedDuration: duration,
      });
    },
    emitPlannedDateTime(pickedDate, pickedTime) {
      const pickedDateTime = `${pickedDate}T${pickedTime}${getTimeZone()}`;
      this.$emit('change', {
        [this.selectedDateTimePicker]: pickedDateTime,
      });
      this.selectedDateTimePicker = null;
      this.showDateTimePickerDialog = false;
    },
  },
  watch: {
    element: {
      immediate: true,
      handler() {
        this.selectedTimeFields = [];
        if (this.meta) {
          this.allTimeFields.forEach((timeField) => {
            if (this.meta[timeField]) {
              this.selectedTimeFields.push(timeField);
            }
          });
        }
      },
    },
    meta(newMeta) {
      this.selectedTimeFields = [];
      if (newMeta) {
        this.allTimeFields.forEach((timeField) => {
          if (newMeta[timeField]) {
            this.selectedTimeFields.push(timeField);
          }
        });
      }
    },
  },
};
</script>
