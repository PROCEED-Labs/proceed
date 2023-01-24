<template>
  <iframe
    id="check-session-iframe"
    :src="process.env.VUE_APP_CHECK_SESSION_ENDPOINT"
    style="display: none"
    @load="checkSession"
  ></iframe>
</template>

<script>
import { mapGetters } from 'vuex';
import { oauthClient } from '@/frontend/backend-api/index.js';

export default {
  data: () => ({
    idpBaseUrl: `https://${new URL(process.env.VUE_APP_BASE_AUTH_URL).host}`,
  }),
  computed: {
    ...mapGetters({
      getSession: 'authStore/getSession',
    }),
  },
  methods: {
    /**
     * adds event listener to listen on idp postMessages
     */
    async checkSession() {
      const childWindow = document.getElementById('check-session-iframe').contentWindow;
      window.addEventListener(
        'message',
        (message) => {
          if (message.source !== childWindow) {
            return; // Skip message in this event listener
          } else {
            return this.receivePostMessage(message);
          }
        },
        false
      );
      await this.checkSessionStatus();
      setInterval(async () => await this.checkSessionStatus(), 1000 * 60);
    },

    /**
     * sends postMessage to idp iframe to check current user session status
     */
    async checkSessionStatus() {
      const clientId = 'proceed-ms-backend';
      const sessionState = this.getSession.session_state;
      const message = clientId + ' ' + sessionState;
      const iframe = document.getElementById('check-session-iframe');
      await iframe.contentWindow.postMessage(message, this.idpBaseUrl);
    },

    /**
     * reacts to postMessage from idp and starts logout flow is current user session is closed
     */
    async receivePostMessage(event) {
      if (event.origin !== this.idpBaseUrl) {
        // Origin did not come from the OP; this message must be rejected
        return;
      }
      // user logged out
      if (event.data === 'changed') {
        await oauthClient.logout();
      }
    },
  },
};
</script>

<style></style>
