/* eslint-disable linebreak-style */
/* global document */
// eslint-disable-next-line padded-blocks
(function templateChanges() {
  /*
   * main:
   * - link longname to name
   * - link JS types to MDN
   */
  class Trimmer {
    constructor(elements) {
      this.elements = elements;
    }

    trim() {
      for (let i = 0; i < this.elements.length; i += 1) {
        if (this.elements[i].textContent.includes('module:')) {
          const longn = this.elements[i].textContent.split('.');
          this.elements[i].textContent = longn[longn.length - 1];
        }
      }
    }
  }

  class Linker extends Trimmer {
    linkToMDN() {
      const jsTypes = [
        'String',
        'Object',
        'Array',
        'Boolean',
        'Function',
        'Null',
        'Promise',
        'Number',
      ];
      const mdn =
        'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/';
      for (let i = 0; i < this.elements.length; i += 1) {
        for (let j = 0; j < jsTypes.length; j += 1) {
          if (this.elements[i].textContent.toLowerCase() === jsTypes[j].toLowerCase()) {
            const mdnLink = document.createElement('a');
            mdnLink.href = mdn + jsTypes[j];
            mdnLink.innerHTML = jsTypes[j];
            this.elements[i].textContent = '';
            this.elements[i].appendChild(mdnLink);
          }
        }
      }
    }
  }

  const main = document.getElementById('main');
  const types = main.querySelectorAll('.param-type');
  const links = main.querySelectorAll('a');
  const linkMod = new Trimmer(links);
  linkMod.trim();
  const typesMod = new Linker(types);
  typesMod.linkToMDN();
  typesMod.trim();

  /*
   * nav: highlight active link
   */
  const navDiv = document.querySelector('nav');
  const navAs = navDiv.querySelectorAll(':scope a');
  for (let i = 0; i < navAs.length; i += 1) {
    // eslint-disable-next-line eqeqeq
    if (document.URL == navAs[i]) {
      navAs[i].setAttribute('style', 'color:#0095dd');
    }
  }
})();
