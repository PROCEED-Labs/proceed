<template>
  <iframe
    :srcdoc="html"
    id="html-preview-frame"
    frameborder="0"
    scrolling="no"
    @load="resize()"
  ></iframe>
</template>
<script>
export default {
  props: ['html'],
  methods: {
    /**
     * Resizes the iframe to fit the content
     * see: https://stackoverflow.com/a/9976309
     */
    resize() {
      const iframe = document.getElementById('html-preview-frame');
      iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + 'px';
    },
  },
};
</script>
