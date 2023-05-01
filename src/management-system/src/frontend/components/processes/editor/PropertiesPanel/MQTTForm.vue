<template>
  <v-container>
    <p class="font-weight-medium">MQTT Server</p>
    <v-row>
      <v-col cols="12">
        <v-row>
          <v-col cols="6">
            <v-text-field
              label="Server URL"
              :value="currentServerInfo.url"
              :rules="[inputRules.notEmpty, inputRules.validURL]"
              background-color="white"
              @blur="
                updateServer({
                  ...currentServerInfo,
                  url: $event.target.value,
                })
              "
              filled
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Topic"
              :value="currentServerInfo.topic"
              :rules="[inputRules.notEmpty]"
              background-color="white"
              @blur="
                updateServer({
                  ...currentServerInfo,
                  topic: $event.target.value,
                })
              "
              filled
            />
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6">
            <v-text-field
              label="User"
              :value="currentServerInfo.user"
              :rules="[inputRules.notEmpty]"
              background-color="white"
              @blur="
                updateServer({
                  ...currentServerInfo,
                  user: $event.target.value,
                })
              "
              filled
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              label="Password"
              :value="currentServerInfo.password"
              background-color="white"
              @blur="
                updateServer({
                  ...currentServerInfo,
                  password: $event.target.value,
                })
              "
              filled
            />
          </v-col>
        </v-row>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  components: {},
  props: ['storedServerInfo'],
  data() {
    return {
      currentServerInfo: {
        url: '',
        topic: '',
        user: '',
        password: '',
      },
      inputRules: {
        notEmpty: (v) => !!v || 'Value must not be empty',
        validURL: (url) => {
          try {
            const URLObj = new URL(url);
            if (URLObj.protocol !== 'mqtt:' && URLObj.protocol !== 'mqtts:') {
              return 'MQTT URL is not valid';
            }
          } catch (err) {
            return 'MQTT URL is not valid';
          }
          return true;
        },
      },
    };
  },
  computed: {},
  methods: {
    validateInput(currentServerInfo) {
      if (
        !currentServerInfo ||
        !currentServerInfo.url ||
        currentServerInfo.url.length === 0 ||
        !currentServerInfo.user ||
        currentServerInfo.user.length === 0 ||
        !currentServerInfo.topic ||
        currentServerInfo.topic.length === 0
      ) {
        return false;
      }

      try {
        const URLObj = new URL(currentServerInfo.url);
        if (URLObj.protocol !== 'mqtt:' && URLObj.protocol !== 'mqtts:') {
          return false;
        }
      } catch (err) {
        return false;
      }

      return true;
    },
    updateServer(updatedServerInfo) {
      this.currentServerInfo = { ...updatedServerInfo };
      if (this.validateInput(updatedServerInfo)) {
        this.$emit('change', updatedServerInfo);
      }
    },
  },
  watch: {
    storedServerInfo: {
      immediate: true,
      handler(updatedServerInfo) {
        this.currentServerInfo = { ...updatedServerInfo };
      },
    },
  },
};
</script>
