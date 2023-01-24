<template>
  <div
    class="d-flex justify-center align-center"
    style="width: 100%; height: 100%; position: fixed; left: 0; z-index: 9999; pointer-events: none"
  >
    <v-alert
      text
      dense
      type="warning"
      icon="mdi-alert-octagon-outline"
      border="left"
      style="width: 50%; background: floralwhite !important; pointer-events: auto"
    >
      <span class="font-weight-bold d-block">No connection</span>
      <span
        >It was not possible to establish a connection to the Authorization Server. This may happen
        for several reasons. Please contact the support, or in case you are in a local development
        environment and want to enable Authentication and Authorization, visit the
        <a
          class="text-decoration-none font-weight-medium"
          color="primary"
          href="https://gitlab.com/dBPMS-PROCEED/proceed/-/wikis/home"
          target="_blank"
          >project documentation <v-icon small color="primary">mdi-open-in-new</v-icon></a
        >.</span
      >
    </v-alert>
  </div>
</template>

<script>
export default {};
</script>

<style></style>
