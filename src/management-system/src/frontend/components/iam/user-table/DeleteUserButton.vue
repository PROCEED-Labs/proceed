<template>
  <div>
    <v-list-item link @click.prevent="$emit('userToDelete')">
      <v-list-item-icon>
        <v-icon color="error">mdi-delete</v-icon>
      </v-list-item-icon>
      <v-list-item-title>Delete User</v-list-item-title>
    </v-list-item>
  </div>
</template>
