<template>
  <v-tooltip bottom>
    <template v-slot:activator="{ on }">
      <span v-on="on">{{ activatorText }}</span>
    </template>
    <div class="d-flex align-center pb-2">
      <v-icon class="pr-1" color="white">mdi-clock</v-icon>
      <strong>{{ time }}</strong>
    </div>
    <div class="d-flex align-center">
      <v-icon class="pr-1" color="white">mdi-calendar</v-icon>
      <strong>{{ date }}</strong>
    </div>
  </v-tooltip>
</template>

<script>
export default {
  name: 'DateTooltip',
  props: {
    dateTime: {
      type: [Number, String, Date],
      required: true,
    },
    showTime: {
      type: Boolean,
      required: false,
      default: false,
    },
    hideDate: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  computed: {
    internalDateTime() {
      if (typeof this.dateTime === 'string' || typeof this.dateTime === 'number') {
        return new Date(this.dateTime);
      } else {
        return this.dateTime;
      }
    },
    time() {
      return this.internalDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    date() {
      return this.internalDateTime.toLocaleDateString();
    },
    activatorText() {
      const elements = [];
      if (this.showTime) {
        elements.push(this.time);
      }

      if (!this.hideDate) {
        elements.push(this.date);
      }

      return elements.join(' ');
    },
  },
};
</script>
