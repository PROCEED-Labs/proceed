<template>
  <div>
    <v-avatar class="mx-n2" v-if="user.email">
      <img :src="gravatar" alt="Name" class="pa-2" />
    </v-avatar>
    <v-avatar color="blue-grey lighten-4" size="40" v-else
      ><v-icon dark color="white"> mdi-account-circle </v-icon></v-avatar
    >
    <span class="ml-2">
      {{ getName }}
    </span>
  </div>
</template>

<script>
import md5 from 'js-md5';

export default {
  props: ['user'],
  computed: {
    gravatar() {
      const hash = md5(this.user.email.trim().toLowerCase());
      return `https://www.gravatar.com/avatar/${hash}`;
    },
    getName() {
      if (this.user.firstName) {
        return this.user.firstName + ' ' + this.user.lastName;
      }
      if (this.user.given_name) {
        return this.user.given_name + ' ' + this.user.family_name;
      }
      return 'Not defined';
    },
  },
};
</script>

<style scoped></style>
