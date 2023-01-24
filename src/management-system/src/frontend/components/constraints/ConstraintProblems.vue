<template>
  <v-dialog :value="show" max-width="500px" @input="$emit('goBack')" persistent scrollable>
    <v-card>
      <v-card-title>
        <v-icon class="mr-2">mdi-alert</v-icon>
        Errors and Warnings
      </v-card-title>
      <v-card-text>
        <div class="my-3">
          These are the following errors and warnings in your constraint list. If you have any
          errors, you have to go back and correct them. You can still keep your changes, if you have
          warnings, however we do not recommend this.
        </div>
        <div>
          <span class="font-weight-medium">Warnings:</span>
          <span v-if="warnings.length == 0"> None </span>
          <v-row class="ml-3" v-for="w in warnings" :key="w">
            {{ w }}
          </v-row>
        </div>
        <div>
          <span class="font-weight-medium">Errors:</span>
          <span v-if="errors.length == 0"> None </span>
          <v-row class="ml-3" v-for="e in errors" :key="e">
            {{ e }}
          </v-row>
        </div>
      </v-card-text>
      <v-card-actions><v-btn @click="$emit('goBack')">Go back</v-btn></v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    errors: Array,
    warnings: Array,
    show: {
      type: Boolean,
      required: true,
    },
  },
};
</script>
