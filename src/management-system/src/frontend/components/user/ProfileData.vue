<template>
  <div
    class="d-flex flex-column mt-6"
    ref="container"
    style="overflow-y: auto; overflow-x: hidden; max-height: 500px"
  >
    <v-row class="ma-0 pa-0">
      <v-col cols="6" class="py-0 pl-0">
        <v-text-field dense v-model="user.firstName" filled label="First Name"></v-text-field>
      </v-col>
      <v-col cols="6" class="py-0 pr-0">
        <v-text-field dense v-model="user.lastName" filled label="Last Name"></v-text-field>
      </v-col>
    </v-row>
    <v-row class="ma-0 pa-0">
      <v-col cols="6" class="py-0 pl-0">
        <v-text-field dense v-model="user.username" filled label="Username"></v-text-field>
      </v-col>
      <v-col cols="6" class="py-0 pr-0">
        <v-text-field dense v-model="user.email" filled label="Email"></v-text-field>
      </v-col>
    </v-row>
  </div>
</template>

<script>
export default {
  props: {
    user: {
      type: Object,
      required: true,
    },
  },
};
</script>

<style></style>
