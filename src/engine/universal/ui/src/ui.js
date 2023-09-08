/* eslint-disable no-undef */
const { network } = require('@proceed/system');
const DisplayItem = require('./display-item.js');
const uiHTML = require('./uiHTML.js');

function hasWindow() {
  // window global is present and we are allowed to use it
  return typeof window === 'object' && !window.PROCEED_DONT_WRITE_WINDOW;
}

function escapeScriptTags(s) {
  // https://stackoverflow.com/questions/14780858/escape-in-script-tag-contents
  return s.replace(/<\/script>/gi, '</scr\\ipt>');
}

function generateUI(displayItems) {
  const nav = `<ul id="nav">
  ${displayItems
    .map(
      (dI) =>
        `<li class="item" data-key="${dI.key}"><span>${dI.title}</span><span class="badge">${dI.badge}</span></li>`,
    )
    .join('\n')}
  </ul>`;

  return uiHTML.header + nav + uiHTML.content;
}

function validateEndpointArgs(method, path, body, query) {
  if (!path || typeof path !== 'string') {
    throw new Error('Path is required to be a string!');
  }
  if (path.length < 3 || path.indexOf('/', 1) === -1) {
    throw new Error('Path has to be of form `/key/[endpoint]`!');
  }
  if (method === 'get' && body !== null) {
    throw new Error('A body payload with GET requests is not supported!');
  }
  if (query && typeof query !== 'object') {
    throw new Error('Query has to be an object!');
  }
}

/**
 * @module @proceed/ui
 */
const ui = {
  /**
   * The display items the UI module is managing.
   * @type {module:@proceed/ui.DisplayItem[]}
   * @memberof module:@proceed/ui
   * @private
   */
  _displayItems: [],

  /**
   * An endpoint object for specifying both a GET and a POST function for one
   * path.
   * @typedef {Object} EndpointObject
   * @property {Function} get The endpoint function for GET requests
   * @property {Function} post The endpoint function for POST requests
   * @memberof module:@proceed/ui
   */

  /**
   * Endpoints of a display item consisting of a path and the corresponding
   * function (or a EndpointObject with GET and POST functions) which the UI
   * module can provide to the SPA in order to retrieve some data.
   * @typedef {Object} Endpoints
   * @property {(Function|module:@proceed/ui.EndpointObject)} {path} {path} is
   * the string identifying the route to this endpoint (prepended by the display
   * item's key). The value is either a function (for only GET requests) or an
   * EndpointObject for specifying both, a GET and a POST function for this
   * path.
   * @memberof module:@proceed/ui
   */

  /**
   * The endpoints that belong to the registered display items. Keys are the
   * display item keys, values their endpoints array. Retrieved by calling the
   * getEndpoints() method on the display items.
   * @type {Map<String,module:@proceed/ui.Endpoints>}
   * @memberof module:@proceed/ui
   * @private
   */
  _endpoints: new Map(),

  /**
   * Boolean indicating whether the UI module has already been initialilzed or
   * not.
   * @type {Boolean}
   * @memberof module:@proceed/ui
   * @private
   */
  _displayed: false,

  /**
   * Initialize the UI module. This method generates the HTML/CSS/JS needed to
   * display the SPA with all the registered display items. It automatically
   * checks if a window object is present (WebView environment) and directly
   * manipulates it or it opens HTTP endpoints (other environment). It is
   * (currently) not possible to add display items after the init() call was
   * made.
   * @memberof module:@proceed/ui
   */
  init() {
    this._displayed = true;

    const html = generateUI(this._displayItems);
    const { script, css: uiStyle } = uiHTML;

    // Set the content data as an object
    const content = {};
    this._displayItems.forEach((dI) => {
      // Set the getter for each display item to avoid copying all the contents
      // Important: enumerable: true for JSON.stringify in non-WebView case
      Object.defineProperty(content, dI.key, { enumerable: true, get: () => dI.content });
    });

    if (hasWindow()) {
      // Directly manipulate the window object of the browser environment this
      // engine is running in.
      const style = window.document.createElement('style');
      style.type = 'text/css';
      if (style.styleSheet) {
        // IE
        style.styleSheet.cssText = uiStyle;
      } else {
        style.innerHTML = uiStyle;
      }
      window.document.head.appendChild(style);

      const viewport = window.document.createElement('meta');
      viewport.name = 'viewport';
      viewport.content = 'width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no';
      window.document.head.appendChild(viewport);

      window.document.body.innerHTML = html;

      // Insert the content data
      window.PROCEED_UI_CONTENTS = content;

      window.PROCEED_DATA = {
        get: (path, query) => this._handleEndpointRequest('get', path, null, query),
        post: (path, body, query) => this._handleEndpointRequest('post', path, body, query),
        put: (path, body, query) => this._handleEndpointRequest('put', path, body, query),
      };

      // Execute site script
      script();
    } else {
      // No WebView environment, open HTTP endpoints instead.
      this._endpoints.forEach((endpoints, key) => {
        Object.entries(endpoints).forEach(([path, endpoint]) => {
          if (typeof endpoint === 'function' || typeof endpoint.get === 'function') {
            const cb = typeof endpoint === 'function' ? endpoint : endpoint.get;
            network.get(`/${key + path}`, { cors: true }, (req) =>
              cb(req.query).then(JSON.stringify),
            );
          }
          if (typeof endpoint.post === 'function') {
            network.post(`/${key + path}`, { cors: true }, (req) =>
              endpoint.post(req.body, req.query).then(JSON.stringify),
            );
          }

          if (typeof endpoint.put === 'function') {
            network.put(`/${key + path}`, { cors: true }, (req) =>
              endpoint.put(req.body, req.query).then(JSON.stringify),
            );
          }
        });
      });

      // Wrap with a html skeleton
      const wrapper = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=no">
          <meta
            name="description"
            content="This is the tasklist from the PROCEED BPMS where you can see and work on your tasks."
          />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <link rel="icon" type="image/png" sizes="32x32" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAB3BAMAAAAeDIOYAAAAD1BMVEUAAABZWVlgYGBmZmZsbGy1A1kgAAAAAXRSTlMAQObYZgAAAAlwSFlzAAC4jAAAuIwBzPa7LwAAAWRJREFUaN7tmu0NgzAMRMPHAEAYAFoGCBsA+w/VDQqW41wSLv8tWSfn9ZHaudvTj+qzONXZ1Q14XQOtPoJD18GqbmCGR+DQESjHsFE3MOkaqOEmKiPo9BEEwogwIozKh9FJGNUAo4C+iRthtKAjIIwyhFH3uT3BFkayEgMYnbKS+GbUy0oM5HCXlcSHUScrMYDRKioxgFErKznRERjASBgBYWRgRoTRk8keCKOsYNQTRi81o29lMBp0ZmTwZrQTRjQjmtGTyfa2MEJrQXI3nOQzcJjOwAoegTb1JfCZkTA5CCfdHYz+dSL0gfg/hg8idZZG1KWG0Ph6CAXx/5K2b8ayACqAkJLChBAggM0UQhfahtEyXIAJeZqQ5deIEEIXGkKIAOo2oQd2Hfd5cMpNBApbZooPocJ2SC5wAPA9oiY6hArbJYOv9q6EEDYAQggdQFs+hWdCiBDCBkATogkRQlgR+AOhHxPPunGOG5/7AAAAAElFTkSuQmCC" />
          <title>PROCEED Tasklist</title>
          <script type="text/javascript">
            ${validateEndpointArgs.toString()}
            window.PROCEED_UI_CONTENTS = ${escapeScriptTags(JSON.stringify(content))};
            window.PROCEED_DATA = {
              get: async (path, query) => {
                ${validateEndpointArgs.name}('get', path, null, query);
                return new Promise((resolve, reject) => {
                  const xhr = new XMLHttpRequest();
                  xhr.addEventListener('loadend', (req) => {resolve(JSON.parse(req.target.responseText)); });
                  const url = query ? path + '?' + Object.entries(query).map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&') : path;
                  xhr.open('GET', url, true);
                  xhr.send();
                });
              },
              post: async (path, body, query) => {
                ${validateEndpointArgs.name}('post', path, body, query);
                return new Promise((resolve, reject) => {
                  const xhr = new XMLHttpRequest();
                  xhr.addEventListener('loadend', (req) => {resolve(JSON.parse(req.target.responseText)); });
                  const url = query ? path + '?' + Object.entries(query).map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&') : path;
                  xhr.open('POST', url, true);
                  xhr.setRequestHeader('Content-Type', 'application/json');
                  xhr.send(JSON.stringify(body));
                });
              },
              put: async (path, body, query) => {
                ${validateEndpointArgs.name}('put', path, body, query);
                return new Promise((resolve, reject) => {
                  const xhr = new XMLHttpRequest();
                  xhr.addEventListener('loadend', (req) => {resolve(JSON.parse(req.target.responseText)); });
                  const url = query ? path + '?' + Object.entries(query).map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&') : path;
                  xhr.open('PUT', url, true);
                  xhr.setRequestHeader('Content-Type', 'application/json');
                  xhr.send(JSON.stringify(body));
                });
              }
            };
          </script>
          <style type="text/css">${uiStyle}</style>
        </head>
        <body>
          ${html}
          <script type="text/javascript">(${
            /* Make the script an IIFE */ script.toString()
          })()</script>
        </body>
      </html>`;

      // Serve as root page
      network.get('/', async () => ({ response: wrapper, mimeType: 'html' }));
    }
  },

  /**
   * Add a display item to the UI module.
   * @param {module:@proceed/ui.DisplayItem} displayItem The display item which
   * has to be an instance of the DisplayItem class
   * @memberof module:@proceed/ui
   */
  addDisplayItem(displayItem) {
    if (this._displayed) {
      throw new Error(
        "Trying to add a display item after the UI module's init() call!\nDynamically adding display items is not yet supported!",
      );
    }
    if (!displayItem) {
      throw new Error('No display item was given!');
    }
    if (!(displayItem instanceof DisplayItem)) {
      throw new Error('The given argument is not an instance of DisplayItem!');
    }
    if (this._displayItems.some((dI) => dI.key === displayItem.key)) {
      throw new Error(`There already exists a display item with that key! (${displayItem.key})`);
    }

    this._displayItems.push(displayItem);

    const newEndpoints = displayItem.getEndpoints();

    if (!newEndpoints || typeof newEndpoints !== 'object') {
      throw new Error('Endpoints have to be an object!');
    }

    this._endpoints.set(displayItem.key, newEndpoints);
  },

  /**
   * Handle an endpoint request. This method finds and executes the endpoint
   * function that was given by a registered display item for the `path`
   * parameter.
   * @param {String} method Either `get` or `post`
   * @param {String} path The path for the requested endpoint (including the
   * display item's key)
   * @param {object} [body] The optional body object
   * @param {object} [query] The optional query for the endpoint
   * @memberof module:@proceed/ui
   */
  async _handleEndpointRequest(method, path, body, query) {
    if (!method || typeof method !== 'string' || !['get', 'post', 'put'].includes(method)) {
      throw new Error('Method has to be either `get` or `post`!');
    }

    validateEndpointArgs(method, path, body, query);

    const key = path.substring(1, path.indexOf('/', 1));
    const endpoints = this._endpoints.get(key);

    if (!endpoints) {
      throw new Error(`There are no endpoints registered for \`${key}!\``);
    }

    const endpointPath = path.substring(key.length + 1, path.length);
    const endpoint = endpoints[endpointPath];

    if (!endpoint || (typeof endpoint !== 'function' && typeof endpoint[method] !== 'function')) {
      throw new Error(`No function for the requested endpoint \`${path}\` registered!`);
    }
    if (
      method !== 'get' &&
      (typeof endpoint === 'function' || typeof endpoint[method] !== 'function')
    ) {
      throw new Error(
        `No function for the requested \`${method}\` endpoint \`${path}\` registered!`,
      );
    }

    const endpointFunc = typeof endpoint === 'function' ? endpoint : endpoint[method];
    if (body === null) {
      return endpointFunc(query);
    }
    return endpointFunc(body, query);
  },
};

module.exports = ui;
