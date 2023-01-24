<template>
  <div>
    <v-list-item-group v-model="password" color="primary">
      <v-list-item :value="true" :disabled="getUser.id !== share.sharedBy">
        <template v-slot:default="{ active }">
          <v-list-item-action>
            <v-checkbox
              :input-value="active"
              :disabled="getUser.id !== share.sharedBy"
            ></v-checkbox>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Password protected</v-list-item-title>
          </v-list-item-content>
        </template>
      </v-list-item>
    </v-list-item-group>
    <v-list-item active-class="white-bg" v-if="password">
      <v-list-item-action>
        <v-icon>mdi-lock</v-icon>
      </v-list-item-action>
      <v-list-item-content>
        <v-text-field
          label="Password"
          outlined
          dense
          hide-details
          :type="type"
          required
          v-model="passwordValue"
          @input="share.password = $event"
          @click="
            passwordValue = '';
            type = 'text';
          "
          @blur="
            passwordValue = 'password';
            type = 'password';
          "
        >
          <template slot="append">
            <v-icon
              @click.prevent="
                $emit('update');
                type = 'password';
                passwordValue = 'password';
              "
              >mdi-arrow-right</v-icon
            >
          </template>
        </v-text-field>
      </v-list-item-content>
    </v-list-item>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  props: {
    share: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      password: false,
      passwordValue: '',
      type: 'password',
    };
  },
  computed: {
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
  },
  created() {
    if (this.share.password) {
      this.password = true;
      this.passwordValue = 'password';
    }
  },
};
</script>

<style scoped>
.white-bg {
  color: white !important;
}
</style>
