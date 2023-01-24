<template>
  <v-hover v-slot="{ hover }">
    <div
      class="d-flex rounded pa-8"
      style="width: 100%"
      :class="hover ? '' : 'grey lighten-4'"
      :style="hover ? 'cursor: pointer; background-color: rgba(25, 118, 210, 0.12)' : ''"
      @click.prevent="
        $emit(
          'roleSelected',
          roles.find((role) => !!role.default === true)
        )
      "
    >
      <div class="d-flex rounded-circle pa-2" :class="hover ? 'primary' : 'grey lighten-2'">
        <v-icon
          style="height: 2rem; width: 2rem; transition: none"
          :color="hover ? 'white' : 'grey darken-2'"
          >mdi-account-multiple</v-icon
        >
      </div>
      <div class="d-flex justify-space-between" style="width: 100%">
        <div class="d-flex flex-column justify-center ml-4" :class="hover ? 'primary--text' : ''">
          <p class="ma-0 font-weight-bold text-subtitle-2">Default permissions</p>
          <p class="ma-0 text-caption">@everyone - for all authenticated PROCEED users</p>
        </div>
        <v-icon class="text-right" :color="hover ? 'primary' : ''" style="transition: none">
          mdi-chevron-right
        </v-icon>
      </div>
    </div>
  </v-hover>
</template>

<script>
export default {
  props: {
    roles: {
      type: Array,
      required: true,
    },
  },
};
</script>

<style scoped></style>
