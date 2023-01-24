<template>
  <v-list-item link @click.prevent="$emit('roleToEdit')">
    <v-list-item-icon>
      <v-icon>mdi-clipboard-text-outline</v-icon>
    </v-list-item-icon>
    <v-list-item-title>Edit Role</v-list-item-title>
  </v-list-item>
</template>
