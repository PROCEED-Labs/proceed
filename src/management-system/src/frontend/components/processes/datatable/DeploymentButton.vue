<template>
  <v-tooltip bottom>
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        small
        v-on="on"
        v-bind="attrs"
        class="mr-2 my-1"
        color="primary"
        @click="$emit('deploy')"
      >
        {{ deploymentMethod }}
      </v-btn>
    </template>
    {{ deploymentMethod.charAt(0).toUpperCase() + deploymentMethod.slice(1) }} Deployment
  </v-tooltip>
</template>
<script>
export default {
  props: {
    deploymentMethod: { type: String },
  },
};
</script>
