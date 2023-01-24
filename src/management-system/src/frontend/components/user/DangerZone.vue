<template>
  <div>
    <v-card
      class="theme--dark v-alert--prominent v-alert--text error--text px-4 mt-6 d-flex align-center"
      elevation="0"
    >
      <v-col class="grow px-0 py-4">
        <p class="font-weight-medium mb-1">Delete Account</p>
        <p class="text-body-2 my-auto">
          This account will be removed permanently and you will no longer have access to the
          application.
        </p>
      </v-col>
      <v-col class="shrink px-0">
        <v-btn color="error" @click.prevent="$emit('userToDelete')">Delete</v-btn>
      </v-col>
    </v-card>
    <v-card
      class="theme--dark v-alert--prominent v-alert--text error--text px-4 mt-2 d-flex align-center"
      elevation="0"
    >
      <v-col class="grow px-0 py-4">
        <p class="font-weight-medium mb-1">Change Password</p>
        <p class="text-body-2 my-auto">
          Once you change your password, you will no longer be able to log in using your previous
          password.
        </p>
      </v-col>
      <v-col class="shrink px-0">
        <v-btn color="error" @click.prevent="$emit('passwordToChange')">Change</v-btn>
      </v-col>
    </v-card>
  </div>
</template>

<script>
export default {};
</script>

<style></style>
