<template>
  <v-card>
    <v-card-title class="headline font-weight-light grey lighten-2" primary-title>
      {{ title }}
    </v-card-title>
    <v-card-text>
      <div class="mb-2" v-for="(pair, index) in toBePrinted" :key="index">
        <span class="font-weight-medium">{{ pair.name }}: </span>
        <ul v-if="Array.isArray(pair.value)">
          <li v-for="(entry, index) in pair.value" :key="pair.name + index">
            <a v-if="typeof entry === 'object'" @click="handleInternalObject(entry)">
              {{ entry }}
            </a>
            <div v-else>{{ entry }}</div>
          </li>
        </ul>
        <div v-else>
          <a v-if="typeof pair.value === 'object'" @click="handleInternalObject(pair.value)">
            {{ pair.value }}
          </a>
          <div v-else>{{ pair.value }}</div>
        </div>
      </div>
    </v-card-text>
    <v-divider />
    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" text @click="$emit('cancel')">Close</v-btn>
    </v-card-actions>
  </v-card>
</template>
<script>
export default {
  props: {
    title: String,
    information: Object, // object that contains the information to be printed
    filter: Array, // optional: can be used to change what is dislayed in in which order
    map: Object, // optional: aliases that are to be printed instead of keys
  },

  computed: {
    toBePrinted() {
      const printPairs = [];
      const map = this.map || {};

      const keys = Object.keys(this.information);
      const filtered = this.filter ? this.filter.filter((key) => keys.includes(key)) : keys;

      filtered.forEach((key) => {
        const pair = { name: map[key] || key, value: this.information[key] };

        if (pair.value) {
          printPairs.push(pair);
        }
      });

      return printPairs;
    },
  },
  methods: {
    handleInternalObject(object) {
      this.$emit('clicked-object', object);
    },
  },
};
</script>
<style scoped></style>
