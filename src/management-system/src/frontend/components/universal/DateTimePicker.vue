<template>
  <div>
    <v-date-picker v-if="!pickedDate" v-model="pickedDate" scrollable></v-date-picker>
    <v-time-picker
      v-else
      v-model="pickedTime"
      scrollable
      use-seconds
      format="24hr"
      @click:second="emitPick()"
    ></v-time-picker>
  </div>
</template>

<script>
export default {
  name: 'DateTimePicker',
  props: {},
  methods: {
    emitPick() {
      this.$emit('pick', { pickedDate: this.pickedDate, pickedTime: this.pickedTime });
    },
  },
  computed: {},
  data() {
    return {
      pickedDate: null,
      pickedTime: null,
    };
  },
};
</script>
