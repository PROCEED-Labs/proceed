<template>
  <div>
    <v-list-item-group v-model="expiration" color="primary">
      <v-list-item :value="true" :disabled="getUser.id !== share.sharedBy">
        <template v-slot:default="{ active }">
          <v-list-item-action>
            <v-checkbox
              :input-value="active"
              :disabled="getUser.id !== share.sharedBy"
            ></v-checkbox>
          </v-list-item-action>
          <v-list-item-content>
            <v-list-item-title>Expiration date</v-list-item-title>
          </v-list-item-content>
        </template>
      </v-list-item>
    </v-list-item-group>
    <v-list-item active-class="white-bg" v-if="expiration">
      <v-list-item-action>
        <v-icon>mdi-clock</v-icon>
      </v-list-item-action>
      <v-list-item-content>
        <v-menu
          v-model="menu"
          :value="new Date().toISOString().slice(0, 10)"
          :close-on-content-click="false"
          transition="scale-transition"
          offset-y
          min-width="auto"
          left
        >
          <template v-slot:activator="{ on, attrs }">
            <v-text-field
              label="Expiration"
              outlined
              readonly
              dense
              hide-details
              clearable
              v-bind="attrs"
              v-on="on"
              :append-icon="'mdi-arrow-right'"
              @click:append="$emit('update')"
              :value="share.expiredAt ? share.expiredAt.substr(0, 10) : ''"
              @click:clear="share.expiredAt = null"
            ></v-text-field>
          </template>
          <v-date-picker
            @change="share.expiredAt = new Date($event).toISOString()"
            @input="menu = false"
          ></v-date-picker>
        </v-menu>
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
      menu: false,
      expiration: false,
    };
  },
  computed: {
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
  },
  created() {
    if (this.share.expiredAt) {
      this.expiration = true;
    }
  },
};
</script>

<style scoped>
.white-bg {
  color: white !important;
}
</style>
