<template>
  <div>
    <v-toolbar>
      <v-toolbar-title>User Settings</v-toolbar-title>
      <v-spacer />
      <v-btn color="primary" @click="saveChanges = true">Save</v-btn>
    </v-toolbar>

    <AlertWindow :popupData="resetUIPreferencesPopupData" />
    <confirmation
      title="reset your current UI-Preferences?"
      text="Changes can't be restored!"
      continueButtonText="Reset"
      continueButtonColor="error"
      :show="isResetUIPreferencesConfirmationVisible"
      maxWidth="500px"
      @cancel="isResetUIPreferencesConfirmationVisible = false"
      @continue="resetUIPreferences"
    />

    <v-container fluid>
      <v-row justify="center">
        <v-col class="text-center centered">
          <v-card>
            <v-tabs grow>
              <v-tab>User Preferences</v-tab>
              <v-tab-item>
                <settings-list
                  :settings="userConfig"
                  :save="saveChanges"
                  @valueChanged="commitChange($event)"
                />
                <v-btn
                  class="mb-3"
                  color="error"
                  :disabled="!userConfig.useUserPreferences"
                  @click="isResetUIPreferencesConfirmationVisible = true"
                  >Reset UI-Preferences</v-btn
                >
              </v-tab-item>
            </v-tabs>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script>
import SettingsList from '@/frontend/components/settings/SettingsList.vue';
import AlertWindow from '@/frontend/components/universal/Alert.vue';
import Confirmation from '@/frontend/components/universal/Confirmation.vue';

/**
 * @module views
 */
/**
 * @memberof module:views
 * @module Vue:UserSettings
 *
 * @vue-computed userConfig
 */
export default {
  components: { SettingsList, AlertWindow, Confirmation },
  data() {
    return {
      /** */
      saveChanges: false,
      /** */
      isResetUIPreferencesConfirmationVisible: false,
      /** */
      resetUIPreferencesPopupData: {
        body: 'Changes saved',
        display: 'none',
        color: 'success',
      },
    };
  },
  computed: {
    userConfig() {
      return this.$store.getters['userPreferencesStore/getUserConfig'];
    },
  },
  methods: {
    /** */
    openPopup() {
      this.resetUIPreferencesPopupData.display = 'block';
      setTimeout(() => {
        this.resetUIPreferencesPopupData.display = 'none';
      }, 2500);
    },
    /** */
    resetUIPreferences() {
      this.isResetUIPreferencesConfirmationVisible = false;
      this.$store.dispatch('userPreferencesStore/resetUIPreferences');
    },
    /**
     * Saves changes to user config
     */
    async commitChange(updatedValues) {
      await this.$store.dispatch('userPreferencesStore/updateUserConfig', updatedValues);
      this.saveChanges = false;
      this.openPopup();
    },
  },
};
</script>
<style lang="scss" scoped></style>
