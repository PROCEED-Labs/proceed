<template>
  <v-card v-if="Array.isArray(variables)">
    <v-card-title primary-title> Variables </v-card-title>
    <v-card-text>
      <ul v-if="variables.length">
        <li v-for="(variable, index) in variables" :key="index">
          {{ variable.name }}: {{ variable.oldValue ? variable.oldValue : 'undefined' }} ->
          {{ variable.newValue }}
        </li>
      </ul>
      <em v-else>Nothing found</em>
    </v-card-text>
  </v-card>
</template>
<script>
export default {
  props: {
    variables: Array,
  },
};
</script>
