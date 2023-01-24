export const alert = {
  data() {
    return {
      alertData: {
        body: '',
        display: 'none',
        color: '',
      },
    };
  },
  methods: {
    openPopup(message, color) {
      this.alertData.body = message;
      this.alertData.color = color;
      this.alertData.display = 'block';
      setTimeout(() => {
        this.alertData.display = 'none';
        this.alertData.body = '';
        this.alertData.color = '';
      }, 2500);
    },
  },
};
