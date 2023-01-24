<template>
  <div>
    <v-dialog
      v-model="changePasswordDialog"
      max-width="400px"
      scrollable
      @keydown.esc="
        $emit('cancel');
        reset();
      "
      @click:outside="
        $emit('cancel');
        reset();
      "
    >
      <v-card>
        <v-card-title>
          <span class="headline mx-0">Change Password</span>
        </v-card-title>
        <v-card-text class="mt-3">
          <v-form ref="form" v-model="valid">
            <v-text-field
              tabindex="1"
              :autofocus="true"
              v-model="password1"
              :append-icon="show1 ? 'mdi-eye' : 'mdi-eye-off'"
              :rules="[...passwordRules, emailRule, usernameRule]"
              :type="show1 ? 'text' : 'password'"
              :label="isSelf ? 'New Password*' : 'Temporary Password*'"
              required
              @click:append="show1 = !show1"
              @keydown.enter="updatePassword"
            ></v-text-field>
            <v-text-field
              tabindex="2"
              v-model="password2"
              :append-icon="show2 ? 'mdi-eye' : 'mdi-eye-off'"
              :rules="[password1 === password2 || `Passwords don't match`]"
              :type="show2 ? 'text' : 'password'"
              :label="isSelf ? 'Repeat Password*' : 'Repeat Temporary Password*'"
              required
              @click:append="show2 = !show2"
              @keydown.enter="updatePassword"
            ></v-text-field>
            <small>*indicates required field</small>
            <v-card-actions class="px-0 pt-4">
              <v-spacer></v-spacer>
              <v-btn
                class="text-end"
                @click.prevent="
                  $emit('cancel');
                  reset();
                "
              >
                Cancel
              </v-btn>
              <v-btn
                class="text-end"
                color="primary"
                @click.prevent="updatePassword"
                :disabled="!valid"
              >
                Save
              </v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
    <AlertWindow :popupData="alertData" />
  </div>
</template>

<script>
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import { alert } from '@/frontend/mixins/alert.js';
import { mapGetters } from 'vuex';
import { iamInterface as api } from '@/frontend/backend-api/index.js';

export default {
  components: {
    AlertWindow,
  },
  props: {
    user: {
      type: [String, Object],
      required: true,
    },
    changePasswordDialog: {
      type: Boolean,
      required: true,
    },
  },
  mixins: [alert],
  data: () => ({
    valid: false,
    show1: false,
    show2: false,
    passwordRules: [
      (v) => !!v || 'Password is required.',
      (v) => (v && v.length >= 8) || 'Password must be at least 8 characters long',
      (v) => /(?=.*[a-z])/.test(v) || 'Must have one lowercase character.',
      (v) => /(?=.*[A-Z])/.test(v) || 'Must have one uppercase character.',
      (v) => /(?=.*\d)/.test(v) || 'Must have one number.',
      (v) =>
        /([!"#$%&'()*+,-./:;<=>?\[\]@\\^_`{|}~])/.test(v) ||
        'Must have one special character: !\\"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~', // special characters list from OWASP: https://owasp.org/www-community/password-special-characters
    ],
    password1: '',
    password2: '',
  }),
  computed: {
    ...mapGetters({
      getUser: 'authStore/getUser',
    }),
    isSelf() {
      return this.getUser.id === this.user.id;
    },
    emailRule() {
      return () =>
        !(this.password1 === this.user.email) || "Password can't be the same as the email.";
    },
    usernameRule() {
      return () =>
        !(this.password1 === this.user.username) || "Password can't be the same as the username.";
    },
  },
  methods: {
    // resets the add user form
    reset() {
      this.password1 = '';
      this.password2 = '';
      this.$refs.form.reset();
      this.$refs.form.resetValidation();
    },
    async updatePassword() {
      try {
        const id = await api.updatePassword(this.user.id, this.password1);
        if (id) {
          this.openPopup('Password successfully updated', 'success');
        }
      } catch (e) {
        this.openPopup('Something went wrong', 'error');
      }
    },
  },
};
</script>

<style scoped></style>
