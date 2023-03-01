<template>
  <v-dialog :value="show" max-width="750px" @input="cancel" scrollable>
    <v-card>
      <v-card-title>
        <span class="headline">{{ title }}</span>
      </v-card-title>
      <v-card-text>
        <v-container grid-list-md>
          <v-form ref="duration-event-form" lazy-validation @submit.prevent>
            <v-row>
              <v-col cols="2">
                <v-text-field
                  type="number"
                  min="0"
                  :rules="[yearsRule]"
                  v-model="years"
                  label="Years"
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  type="number"
                  min="0"
                  :rules="[monthsRule]"
                  v-model="months"
                  label="Months"
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  type="number"
                  min="0"
                  :rules="[daysRule]"
                  v-model="days"
                  label="Days"
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  type="number"
                  min="0"
                  :rules="[hoursRule]"
                  v-model="hours"
                  label="Hours"
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  type="number"
                  min="0"
                  :rules="[minutesRule]"
                  v-model="minutes"
                  label="Minutes"
                />
              </v-col>
              <v-col cols="2">
                <v-text-field
                  type="number"
                  min="0"
                  :rules="[secondsRule]"
                  v-model="seconds"
                  label="Seconds"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-container>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="calculateTimeFormalExpression">Ok</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { parseISODuration } from '@proceed/bpmn-helper';
export default {
  name: 'DurationForm',
  props: {
    formalExpression: { type: String },
    title: { type: String },
    show: { type: Boolean, required: true },
  },
  data() {
    return {
      years: null,
      months: null,
      days: null,
      hours: null,
      minutes: null,
      seconds: null,
      yearsRule: (v) => {
        if (v >= 0) return true;
        return 'Year should be a positive number';
      },
      monthsRule: (v) => {
        if (v >= 0 && v <= 12) return true;
        return 'Months should be between 0 and 12';
      },
      daysRule: (v) => {
        if (v >= 0 && v <= 366) return true;
        return 'Days should be between 0 and 31';
      },
      hoursRule: (v) => {
        if (v >= 0 && v <= 24) return true;
        return 'Hours should be between 0 and 24';
      },
      minutesRule: (v) => {
        if (v >= 0 && v <= 60) return true;
        return 'Minutes should be between 0 and 60';
      },
      secondsRule: (v) => {
        if (v >= 0 && v <= 60) return true;
        return 'Seconds should be between 0 and 60';
      },
    };
  },
  methods: {
    cancel() {
      this.$emit('close');
      this.init();
    },
    calculateTimeFormalExpression() {
      const dateFormal = `${this.years ? this.years + 'Y' : ''}${
        this.months ? this.months + 'M' : ''
      }${this.days ? this.days + 'D' : ''}`;

      let timeFormal = '';
      if (this.hours || this.minutes || this.seconds) {
        timeFormal = `T${this.hours ? this.hours + 'H' : ''}${
          this.minutes ? this.minutes + 'M' : ''
        }${this.seconds ? this.seconds + 'S' : ''}`;
      }

      let formalExpression = '';
      if (dateFormal.length > 0 || timeFormal.length > 0) {
        formalExpression = `P${dateFormal}${timeFormal}`;
      }

      this.$emit('save', {
        formalExpression,
      });
    },
    init() {
      const { years, months, days, hours, minutes, seconds } = parseISODuration(
        this.formalExpression
      );
      this.years = years;
      this.months = months;
      this.days = days;
      this.hours = hours;
      this.minutes = minutes;
      this.seconds = seconds;
    },
  },
  watch: {
    formalExpression: {
      handler(newExpression) {
        if (typeof newExpression === 'string') {
          this.init();
        }
      },
      immediate: true,
    },
  },
};
</script>
