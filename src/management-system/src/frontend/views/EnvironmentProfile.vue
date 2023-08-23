<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>
        {{ `Environment Profile${environmentID ? ` (ID: ${environmentID})` : ''}` }}
      </v-toolbar-title>
      <v-spacer />
    </v-toolbar>
    <popup style="left: 37vw" :popupData="popupData" />
    <confirmation
      :title="'leave the environment profile page?'"
      :text="'You have unsaved changes.'"
      :show="showUnsavedOnCloseDialog"
      maxWidth="335px"
      @cancel="
        showUnsavedOnCloseDialog = false;
        confirm = false;
      "
      @continue="
        confirm = true;
        next();
      "
    />
    <v-container fluid>
      <v-row justify="center" id="wrapper">
        <v-col class="text-center centered">
          <v-card>
            <v-card-title></v-card-title>
            <v-form class="profileForm" @submit.prevent>
              <v-row class="mb-n4 mt-2 v-label theme--light">
                Choose one of the following profiles or make your own.
              </v-row>
              <v-radio-group v-model="chosenProfileName" :mandatory="false">
                <div v-for="profile in customProfiles" :key="profile.id" style="display: flex">
                  <v-radio :value="profile.name" v-on:change="allSaved = false">
                    <template v-slot:label>
                      <div>
                        <h4>{{ profile.name }}</h4>
                      </div>
                    </template>
                  </v-radio>
                  <div>
                    <v-icon color="primary" @click="editProfile(profile)">mdi-pencil</v-icon>
                    <v-icon
                      v-if="!premadeProfiles.includes(profile)"
                      @click="deleteProfile(profile)"
                      color="error"
                    >
                      mdi-delete
                    </v-icon>
                  </div>
                </div>
              </v-radio-group>
              <div class="addButtonWrapper">
                <v-btn small class="addButton" color="success" @click="openNewProfile()">
                  <v-icon left>mdi-plus</v-icon> Add Profile
                </v-btn>
                <span class="errorSpan" v-if="tooManyProfiles">
                  You cannot add more than 8 custom profiles.
                </span>
              </div>
            </v-form>
            <v-card-actions>
              <v-spacer />
              <v-btn color="error" :disabled="!chosenProfileName" @click="chosenProfileName = null">
                Reset Choice
              </v-btn>
              <v-btn color="primary" @click="saveProfileToServer()">Save</v-btn>
            </v-card-actions>
          </v-card>
          <ProfileEditor
            :show="showConstraintModal"
            :title="'Create a Custom Environment Profile'"
            :level="'environment'"
            @cancel="showConstraintModal = false"
          />
          <ProfileEditor
            :show="showEditingConstraintModal"
            :title="'Edit Environment Profile'"
            :level="'environment'"
            @cancel="showEditingConstraintModal = false"
            :isEditing="true"
            :envProfile="profileToBeEdited"
            :profileType="typeOfProfileToBeEdited"
          />
          <ProfilesCard @delete="deleteProfile" @add="addCustomProfile" @edit="editProfile" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import axios from 'axios';
import { mapState } from 'vuex';
import { environmentPerformance as performance } from '@/frontend/assets/constraintProfiles.js';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import ProfileEditor from '@/frontend/components/profiles/ProfileEditor.vue';
import ProfilesCard from '@/frontend/components/profiles/ProfilesCard.vue';
import confirmation from '@/frontend/components/universal/Confirmation.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:EnvironmentProfile
 *
 * @vue-prop {string} environmentID - id of the environment
 */
export default {
  name: 'EnvironmentProfile',
  props: {
    environmentID: { type: String },
  },
  components: {
    popup: AlertWindow,
    ProfileEditor,
    ProfilesCard,
    confirmation,
  },
  data: () => ({
    /** */
    customProfiles: [],
    /** */
    chosenProfileName: null,
    /** */
    showConstraintModal: false,
    /** */
    showEditingConstraintModal: false,
    /** */
    showUnsavedOnCloseDialog: false,
    /** */
    editingProfile: null,
    /** */
    profileToBeEdited: {},
    /** */
    typeOfProfileToBeEdited: '',
    /** */
    tooManyProfiles: false,
    /** */
    otherEnvironments: {
      headers: [
        { text: '', value: 'data-table-expand' },
        { text: 'Name', value: 'name', align: 'center' },
        { text: 'ID', value: 'id', align: 'center' },
        { text: 'Type', value: 'type', align: 'center' },
        { text: 'Actions', value: 'action', align: 'center' },
      ],
      environments: [],
    },
    popupData: {
      body: '',
      display: 'none',
      color: 'error',
    },
    confirm: false,
    allSaved: true,
    next: null,
  }),
  computed: mapState({
    premadeProfiles() {
      return [performance];
    },
    profiles() {
      return this.$store.getters['environmentStore/environmentProfiles'];
    },
    chosenProfile() {
      return this.profiles.find((p) => p.name === this.chosenProfileName);
    },
  }),
  mounted() {
    this.getSelectedEnvironmentProfile();
  },
  beforeRouteLeave(to, from, next) {
    if (!this.allSaved) {
      this.showUnsavedOnCloseDialog = true;
      this.next = next;
      if (this.confirm) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  },
  methods: {
    /** */
    async editProfile(profile) {
      const profileString = await this.$store.getters['environmentStore/profileJSONById'](
        profile.id,
      );
      this.profileToBeEdited = profileString;
      this.typeOfProfileToBeEdited = profile.type;

      this.showEditingConstraintModal = true;
    },
    /** */
    openConstraintModal(profileIndex) {
      if (profileIndex) this.chosenProfileName = this.profiles[profileIndex - 1].name;
      this.editingProfile = profileIndex;
      this.showConstraintModal = true;
    },
    /** */
    openNewProfile() {
      this.chosenProfileName = null;
      this.openConstraintModal();
    },
    /** */
    addCustomProfile(input) {
      const profile = { ...input };
      if (this.editingProfile && this.editingProfile > this.premadeProfiles.length) {
        this.profiles[this.editingProfile - 1] = profile;
      } else {
        if (this.customProfiles.length >= 8) {
          this.tooManyProfiles = true;
          return;
        }
        // modify profile name if it already exists
        profile.name = this.getUniqueProfileName(
          profile.name,
          this.profiles.map((p) => p.name),
        );
        this.customProfiles.push(profile);
      }

      this.editingProfile = null;
      this.chosenProfileName = profile.name;
      this.allSaved = false;
    },
    /** */
    deleteProfile(profile) {
      this.tooManyProfiles = false;
      // const customIndex = profileIndex - this.premadeProfiles.length;
      // this.customProfiles = this.customProfiles.filter((cp, i) => i !== customIndex);
      this.$store.dispatch('environmentStore/remove', { id: profile.id, type: profile.type });
      this.allSaved = false;
    },
    /** */
    getUniqueProfileName(name, existingNames) {
      if (existingNames.every((n) => n !== name)) return name;
      const newName = `${name}1`;
      if (existingNames.every((n) => n !== newName)) return newName;
      return this.getUniqueProfileName(newName, existingNames);
    },
    /** */
    getSelectedEnvironmentProfile() {
      if (!this.environmentID) {
        this.displayError('Could not get environment profile. No environment ID specified.');
        return;
      }

      axios
        .get(`/profile/environment/${this.environmentID}`)
        .then((result) => {
          if (!result || !result.data) {
            this.displayError('Could not get environment profile.');
          }
          this.addCustomProfile(result.data.profile);
        })
        .catch((e) => {
          this.displayError(e);
        });
    },
    /** */
    saveProfileToServer() {
      if (!this.environmentID) {
        this.displayError('Could not save environment profile. No ID environment specified.');
      }

      axios
        .put(`/profile/environment/${this.environmentID}`, this.chosenProfile)
        .then((result) => {
          if (!result || !result.data) this.displayError('Profile could not be saved.');
          this.allSaved = true;
        })
        .catch((e) => {
          this.$logger.debug(e);
        });
    },
    /** */
    displayError(message) {
      this.popupData.display = 'block';
      this.popupData.body = message;
    },
  },
};
</script>

<style lang="scss">
/* https://sass-lang.com/documentation/syntax#scss */

#secondCard {
  margin-top: 20px;
  padding-bottom: 10px;
}

.addButton {
  width: 140px;
  margin-left: -8px;
}

.profileForm {
  margin: -1.4rem 2.2rem 0;
}

.addButtonWrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: -20px;
}
</style>
