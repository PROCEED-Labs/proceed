/* eslint-disable linebreak-style */
/**
 * @module plugins/categories
 */

const name = 'category';
const options = {
  mustHaveValue: true,
  canHaveName: true,
  onTagged(doclet, tag) {
    doclet.category = tag.value.name;
  },
};

exports.defineTags = (dictionary) => {
  dictionary.defineTag(name, options);
};

/*
 newDoclet is fired when a new doclet has been created.
 This means that a JSDoc comment or a symbol has been processed,
 and the actual doclet that will be passed to the template has been created.
*/

const env = require('jsdoc/env');
const path = require('path');

const { sep } = path;
const { categoryByPath } = env.opts;
const categories = Object.keys(categoryByPath);

exports.handlers = {
  newDoclet(e) {
    if (!e.doclet.undocumented && e.doclet.category === undefined) {
      categories.forEach((c) => {
        const cpath = `${sep}${categoryByPath[c]}`;
        if (e.doclet.meta.path.includes(cpath)) {
          e.doclet.category = c;
        }
      });
    }
  },
};
