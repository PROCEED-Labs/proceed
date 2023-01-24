<template>
  <div>
    <v-dialog
      v-model="addNewUserDialog"
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
          <span class="headline mx-0">New User</span>
        </v-card-title>
        <v-card-text class="mt-3">
          <v-form ref="form" v-model="valid">
            <v-text-field
              tabindex="1"
              :autofocus="true"
              v-model="newUserFirstName"
              :counter="20"
              :rules="firstNameRules"
              label="First Name*"
              required
              ref="firstName"
              @keydown.enter="createUser"
            ></v-text-field>
            <v-text-field
              tabindex="2"
              v-model="newUserLastName"
              :counter="20"
              :rules="lastNameRules"
              label="Last Name*"
              required
              @keydown.enter="createUser"
            ></v-text-field>
            <v-text-field
              tabindex="3"
              v-model="newUserUsername"
              :rules="[...usernameRules, sameUsernameRule]"
              label="Username*"
              :counter="20"
              required
            ></v-text-field>
            <v-text-field
              tabindex="4"
              v-model="newUserEmail"
              :rules="[...emailRules, sameEmailRule]"
              label="E-mail*"
              required
              @keydown.enter="createUser"
            ></v-text-field>
            <v-text-field
              tabindex="5"
              v-model="password1"
              :append-icon="show1 ? 'mdi-eye' : 'mdi-eye-off'"
              :rules="[...passwordRules, emailRule, usernameRule]"
              :type="show1 ? 'text' : 'password'"
              label="Temporary Password*"
              required
              @click:append="show1 = !show1"
              @keydown.enter="createUser"
            ></v-text-field>
            <v-text-field
              tabindex="6"
              v-model="password2"
              :append-icon="show2 ? 'mdi-eye' : 'mdi-eye-off'"
              :rules="[password1 === password2 || `Passwords don't match`]"
              :type="show2 ? 'text' : 'password'"
              label="Repeat Temporary Password*"
              required
              @click:append="show2 = !show2"
              @keydown.enter="createUser"
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
                @click.prevent="createUser"
                :disabled="!valid"
              >
                Create
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
import { iamInterface as api } from '@/frontend/backend-api/index.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import { alert } from '@/frontend/mixins/alert.js';

export default {
  components: {
    AlertWindow,
  },
  props: {
    addNewUserDialog: {
      type: Boolean,
      required: true,
    },
    users: {
      type: Array,
      required: true,
    },
  },
  mixins: [alert],
  data: () => ({
    valid: false,
    newUserEmail: '',
    newUserFirstName: '',
    newUserLastName: '',
    newUserUsername: '',
    show1: false,
    show2: false,
    firstNameRules: [
      (v) => !!v || 'Name is required',
      (v) => (v && v.length <= 20) || 'Name must be less than 20 characters',
    ],
    lastNameRules: [
      (v) => !!v || 'Name is required',
      (v) => (v && v.length <= 20) || 'Name must be less than 20 characters',
    ],
    emailRules: [
      (v) => !!v || 'E-mail is required',
      (v) => /.+@.+\..+/.test(v) || 'E-mail must be valid',
    ],
    usernameRules: [
      (v) => !!v || 'Name is required',
      (v) => (v && v.length <= 20) || 'Name must be less than 20 characters',
    ],
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
    emailRule() {
      return () =>
        !(this.password1 === this.newUserEmail) || "Password can't be the same as the email.";
    },
    usernameRule() {
      return () =>
        !(this.password1 === this.newUserUsername) || "Password can't be the same as the username.";
    },
    sameUsernameRule() {
      return () =>
        !this.users.some((user) => user.username === this.newUserUsername) ||
        'Username already exists.';
    },
    sameEmailRule() {
      return () =>
        !this.users.some((user) => user.email === this.newUserEmail) ||
        'Email address already exists.';
    },
  },
  methods: {
    // resets the add user form
    reset() {
      this.newUserEmail = '';
      this.newUserFirstName = '';
      this.newUserLastName = '';
      this.password1 = '';
      this.password2 = '';
      this.$refs.form.reset();
      this.$refs.form.resetValidation();
    },
    // creates a completely new user
    async createUser() {
      if (this.valid && this.password1 === this.password2) {
        try {
          const userOrUserId = await api.addUser({
            firstName: this.newUserFirstName,
            lastName: this.newUserLastName,
            email: this.newUserEmail,
            password: this.password1,
            username: this.newUserUsername,
          });
          if (typeof userOrUserId === 'string') {
            const user = await api.getUserById(userOrUserId);
            this.openPopup('User successfully added', 'success');
            this.$emit('userAdded', user);
            this.reset();
          } else {
            this.openPopup('User successfully added', 'success');
            this.$emit('userAdded', userOrUserId);
            this.reset();
          }
        } catch (error) {
          this.openPopup('Something went wrong', 'error');
        }
      }
    },
  },
};
</script>

<style scoped></style>
