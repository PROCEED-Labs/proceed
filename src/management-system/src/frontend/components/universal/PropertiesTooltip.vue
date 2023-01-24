<template>
  <v-tooltip bottom>
    <template v-slot:activator="{ on }">
      <span :class="removeStyling ? '' : 'activator'" v-on="on">{{
        object[activatorProperty]
      }}</span>
    </template>
    <div v-for="key in Object.keys(objectWithPrimitiveProperties).sort()" :key="key">
      <strong>{{ firstLetterToUpperCase(key) }}: </strong>{{ object[key] }}
    </div>
  </v-tooltip>
</template>

<script>
export default {
  name: 'PropertiesTooltip',
  props: {
    object: {
      type: Object,
      required: true,
    },
    activatorProperty: {
      type: String,
      required: false,
      default: 'id',
    },
    removeStyling: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  computed: {
    objectWithPrimitiveProperties() {
      const mappedObject = {};
      for (const key in this.object) {
        if (typeof this.object[key] !== 'object') {
          mappedObject[key] = this.object[key];
        }
      }
      return mappedObject;
    },
  },
  methods: {
    firstLetterToUpperCase(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    },
  },
};
</script>

<style scoped>
.activator {
  cursor: default;
  text-decoration: underline dotted black;
}
</style>
