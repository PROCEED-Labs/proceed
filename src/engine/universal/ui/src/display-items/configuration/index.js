/* global window document console PROCEED_DATA */
import '../pure-base-min.css';
import '../pure-grids-min.css';
import '../style-buttons.css';
import '../style-colors.css';
import '../style-forms.css';
import './style.css';

import { appendElem } from '../helpers.js';

//global Vars
let currentConfig;
let rootElem = document.getElementById('root');

//API calls

function onDeleteUserConfig() {
  PROCEED_DATA.post('/configuration/api/config').then((data) => initRenderJSON(data));
}

window.onDeleteUserConfig = onDeleteUserConfig;

/**
 * Sends updated config to the engine
 */
function onWriteUserConfig() {
  PROCEED_DATA.post('/configuration/api/config', currentConfig).then((data) =>
    initRenderJSON(data)
  );
}

// expose function to html
window.onWriteUserConfig = onWriteUserConfig;

/**
 * Gets current config values from engine and builds dom from it
 */
function onRefreshData() {
  if (rootElem) {
    PROCEED_DATA.get('/configuration/api/config', {}).then((data) => initRenderJSON(data));
  }
}

// expose function to html
window.onRefreshData = onRefreshData;

//Render DOM

/**
 * Initializes the dom tree that represents the config ui
 *
 * @param {Object} config the config values as gotten from the engine
 */
function initRenderJSON(config) {
  currentConfig = config;
  rootElem.innerHTML = '';
  // const configContainer = appendElem(rootElem, 'div', { class: 'container' });
  renderFirstLayerJSON(rootElem, currentConfig, []);
}

/**
 * Actually the same functionality as in renderJSON(), but
 * that it puts the input elements first and then the configuration objects.
 * Needed to put 'name' and 'description' before all other configs.
 *
 * @param {Object} parentNode the node inside which the current tree should be build (might be the root or some encapsulating config tree)
 * @param {Object} configObject the config for which the ui should be build
 */
function renderFirstLayerJSON(parentNode, configObject) {
  Object.entries(configObject)
    .filter(([configKey, configValue]) => typeof configValue !== 'object')
    .forEach(([configKey, configValue]) => {
      // changes overwrite current config object
      const changeCallback = (newValue) => {
        configObject[configKey] = newValue;
      };

      // create a new label and input element
      inputElement(parentNode, configKey, configValue, changeCallback);
    });
  Object.entries(configObject)
    .filter(([configKey, configValue]) => configValue && typeof configValue === 'object')
    .forEach(([configKey, configValue]) => {
      // we need more complex (recursive) rendering if value is an object and not null
      if (Array.isArray(configValue)) {
        arrayElement(parentNode, configKey, configValue);
      } else {
        // recursively render the subobject
        subObjectElement(parentNode, configKey, configValue);
      }
    });
}

/**
 * (Recursively) builds the ui which allows editing the given config
 *
 * @param {Object} parentNode the node inside which the current tree should be build (might be the root or some encapsulating config tree)
 * @param {Object} configObject the config for which the ui should be build
 */
function renderJSON(parentNode, configObject) {
  Object.entries(configObject).forEach(([configKey, configValue]) => {
    // we need more complex (recursive) rendering if value is an object and not null
    if (configValue && typeof configValue === 'object') {
      if (Array.isArray(configValue)) {
        arrayElement(parentNode, configKey, configValue);
      } else {
        // recursively render the subobject
        subObjectElement(parentNode, configKey, configValue);
      }
    } else {
      // create an input for the user to change a value and handle changes

      // changes overwrite current config object
      const changeCallback = (newValue) => {
        configObject[configKey] = newValue;
      };

      // create a new input element and
      inputElement(parentNode, configKey, configValue, changeCallback);
    }
  });
}

/**
 * Sets up dom elements (input etc.) and callbacks for a specific config entry
 *
 * @param {Object} parentElement the DOM element the new elements should be placed in
 * @param {String} key the key of the entry we want to set up the input for
 * @param {String|Boolean|Number} valueBefore the current value of the entry
 * @param {Function} callback the callback that is supposed to be called on change
 * @returns {Object} the newly created line containing the input elements
 */
function inputElement(parentElement, key, valueBefore, callback) {
  let inputElem;

  const id = key;

  const inputLine = appendElem(parentElement, 'div', { class: 'input-line pure-g' });

  if (key) {
    const labelCell = appendElem(inputLine, 'label', {
      class: 'input-label-cell pure-u-1-2',
      for: id,
    });
    labelCell.textContent = `${key}:`;
  }

  const inputCell = appendElem(inputLine, 'div', { class: 'input-input-cell pure-u-1-2' });

  // enable input element to take whole width
  if (!key) {
    inputCell.style.maxWidth = '100%';
  }

  function renderInput(val) {
    switch (typeof val) {
      case 'boolean':
        inputElem = appendElem(inputCell, 'input', {
          type: 'checkbox',
          class: 'booleanInput',
          id,
        });
        if (val) {
          inputElem.setAttribute('checked', true);
        }
        inputElem.onchange = function () {
          callback(Boolean(inputElem.checked));
        };
        break;
      case 'string':
        inputElem = appendElem(inputCell, 'input', {
          type: 'text',
          class: 'stringInput',
          value: val,
          id,
        });
        inputElem.onchange = function () {
          callback(String(inputElem.value));
        };
        break;
      case 'number':
        inputElem = appendElem(inputCell, 'input', {
          type: 'number',
          class: 'numberInput',
          value: val,
          id,
        });
        inputElem.onchange = function () {
          callback(Number(inputElem.value));
        };
        break;
      default:
    }
  }
  renderInput(valueBefore); //initially render input
  return inputLine;
}

function expandContentOrMakeRoot(parentNode, element) {
  const body = element.querySelector('.content-container');
  body.classList.toggle('show');
  body.classList.toggle('noshow');

  // prevent nested elements getting too small by making element the root if the parent node doesn't provide enough space
  // dont allow the following setup be done twice for the same element
  const width = parentNode.getBoundingClientRect().width;
  if (width > 720 || rootElem.firstChild === element) {
    return;
  }

  const oldRoot = rootElem.querySelector('div');
  const oldParent = element.parentNode;
  const oldIndex = Array.prototype.indexOf.call(oldParent.children, element);

  rootElem.removeChild(oldRoot);
  rootElem.appendChild(element);

  const titleContainer = element.querySelector('.title-container');
  const title = titleContainer.querySelector('.title');
  const backArrow = document.createElement('div');
  backArrow.classList.add('back-arrow');
  backArrow.innerHTML = '&larr;';
  titleContainer.insertBefore(backArrow, title);

  backArrow.onclick = (event) => {
    rootElem.removeChild(element);
    rootElem.appendChild(oldRoot);

    // append element back to old parent or insert if it wasn't the last child
    if (oldIndex === oldParent.children.length) {
      oldParent.appendChild(element);
    } else {
      const nextSibling = Array.from(oldParent.children)[oldIndex];
      oldParent.insertBefore(element, nextSibling);
    }

    titleContainer.removeChild(backArrow);
    body.classList.remove('show');
    event.stopPropagation();
  };
}

/**
 * Sets up recursive rendering of a config sub object inside the parent element
 *
 * @param {Object} parentNode the element the subobject nodes should be placed in
 * @param {String} objName key of the config subobject
 * @param {Object} subObject an object inside a config object
 */
function subObjectElement(parentNode, objName, subObject) {
  const subObjNode = appendElem(parentNode, 'div', {
    class: 'container config-sub-object',
  });

  const subObjTitle = appendElem(subObjNode, 'div', {
    class: 'title-container config-sub-object-title',
  });
  const title = appendElem(subObjTitle, 'div', { class: 'title' });
  title.textContent = objName;
  const menuIconArrowDown = appendElem(title, 'span', { class: 'menuIconArrowDown' });
  menuIconArrowDown.textContent = '▾';

  const subObjBody = appendElem(subObjNode, 'div', {
    class: 'content-container config-sub-object-body noshow',
  });

  subObjTitle.onclick = () => {
    expandContentOrMakeRoot(parentNode, subObjNode);
  };

  renderJSON(subObjBody, subObject);
}

function arrayElement(parentNode, arrayName, array) {
  const arrayNode = appendElem(parentNode, 'div', {
    class: 'container array-node pure-g',
  });

  const arrayTitle = appendElem(arrayNode, 'div', {
    class: 'title-container array-node-title pure-u-1',
  });
  const title = appendElem(arrayTitle, 'div', { class: 'title' });
  title.textContent = arrayName;
  const menuIconArrowDown = appendElem(title, 'span', { class: 'menuIconArrowDown' });
  menuIconArrowDown.textContent = '▾';

  const arrayBody = appendElem(arrayNode, 'div', {
    class: 'content-container array-node-body pure-u-1 noshow',
  });

  arrayTitle.onclick = () => {
    expandContentOrMakeRoot(parentNode, arrayNode);
  };

  const arrayContent = appendElem(arrayBody, 'div', {
    class: 'array-node-content',
  });

  const addElementNode = appendElem(arrayBody, 'div', {
    class: 'array-node-add',
  });
  addElementNode.textContent = '[+]';

  // mapping from the original index of an element to the current one
  // indices might change due to elements being removed
  let indexMap = [];

  // add a new element to the ui array
  const addEntry = function (index, mapIndex, startValue) {
    // store the original index values in the indexMap
    indexMap[mapIndex] = index;

    // changes overwrite the element at the mapped position in the given array
    const changeCallback = (newValue) => {
      array[indexMap[mapIndex]] = newValue;
    };

    // create a new input element for the array entry
    const inputLine = inputElement(arrayContent, undefined, startValue, changeCallback);

    // allow user to delete an entry
    const removeNode = appendElem(inputLine, 'div', {
      class: 'input-remove-cell pure-u-3-24',
    });
    removeNode.textContent = 'x';

    removeNode.onclick = () => {
      arrayContent.removeChild(inputLine);
      // remove entry from array in the config
      array.splice(indexMap[mapIndex], 1);
      // update index map for all indices bigger than the deleted one
      indexMap = indexMap.map((i) => (i > indexMap[mapIndex] ? --i : i));
    };
  };

  // add each array element to the ui
  array.forEach((value, index) => {
    addEntry(index, index, value);
  });

  // allow user to add new elements
  addElementNode.onclick = () => {
    const index = array.length;
    const mapIndex = indexMap.length;

    indexMap.push(index);
    array.push('');

    addEntry(index, mapIndex, '');
  };
}

onRefreshData();
