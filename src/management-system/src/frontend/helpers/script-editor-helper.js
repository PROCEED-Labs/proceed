/**
 * @module helpers
 */

/**
 * @module script-editor-helper
 * @memberof module:helpers
 */

/**
 * Returns a function, that, as long as it continues to be invoked, will not
 * be triggered. The function will be called after it stops being called for
 * N milliseconds. If `immediate` is passed, trigger the function on the
 * leading edge, instead of the trailing.
 * Taken from UnderscoreJS, modified slightly.
 *
 * @param func
 * @param wait
 * @param immediate
 * @returns {Function}
 */
export function debounce(func, wait, immediate) {
  let timeout;
  return (...args) => {
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

/**
 * Returns how many lines exist in the text passed.
 *
 * @param text
 * @returns {*}
 */
export function countLineNumbers(text) {
  return text.split(/\r\n|\r|\n/).length;
}

/**
 * Parses a parameter string and returns an array of parameter names.
 *
 * @param paramString
 * @returns {Array}
 */
export function parseParamString(paramString) {
  const regex = /['"]?([\w:/.\-_?&+%]+)['"]?\s*:/gm;
  let m;
  const params = [];

  do {
    m = regex.exec(paramString);

    if (m !== null && m.index === regex.lastIndex) {
      regex.lastIndex += 1;
    }

    // parameter name is in second group, if it exists
    if (m !== null && m[1]) {
      params.push(m[1]);
    }
  } while (m !== null);

  return params;
}

/**
 * Parse the javascript code to find out which
 * capabilites are being used.
 *
 * @param code
 * @returns {Array}
 */
export function parseCapabilitiesFromCode(code) {
  // regex to find capabilities
  // matching both startCapability and startTask for now!
  // eslint-disable-next-line max-len
  const regex =
    /\(\)\.(?:startCapability|startTask)\(\s*['"]([\w.?&_\-:/]+)['"]\s*(?:(?:,\s*{\s*((?:.|\n)*?)\s*}\s*)|.+)?\s*\);/gm;
  const capabilities = [];
  let m;
  // find all capabilities
  do {
    m = regex.exec(code);

    if (m !== null && m.index === regex.lastIndex) {
      regex.lastIndex += 1;
    }

    if (m !== null && m[1]) {
      const capabilityName = m[1];

      // add capability to capabilities object
      const capability = {
        name: capabilityName,
        parameters: [],
        line: countLineNumbers(code.substring(0, m.index)),
      };

      // parse parameters, try to find which ones are used
      if (m[2]) {
        capability.parameters = parseParamString(m[2]);
      }

      // add to all
      capabilities.push(capability);
    }
  } while (m);

  return capabilities;
}
/**
 * is there a getService('{service}') in the code
 */
function isServiceAdded(code, service) {
  return code.includes(`getService('${service}')`);
}
/**
 * Creates a string of a sample parameter object for a given capability.
 * Uses default values wherever possible.
 *
 * @param capability
 * @returns {string}
 */
export function createCapabilityParameterString(capability) {
  return capability.parameters.length
    ? `{\n${capability.parameters.map((e) => getSingleParameterString(e)).join(',\n')}\n}`
    : '';
}

/**
 * Help function to create a string of a single parameter
 * @param {*} capability
 */
function getSingleParameterString(e) {
  let paramString = `\t${e.schema ? `'${e.schema}'` : e.name}: `;
  if (e.subTypes) {
    paramString = `${paramString}{ `;
    e.subTypes.forEach((subType) => {
      paramString = `${paramString}${subType.schema ? `'${subType.schema}'` : subType.name}: ${
        subType.default
      }, `;
    });
    paramString = paramString.substring(0, paramString.length - 2);
    paramString = `${paramString} }`;
    return paramString;
  } else {
    return `${paramString}${e.default ? e.default : 'null'}`;
  }
}
/**
 * Returns the function call for the capability, ready to be pasted into an editor.
 *
 * @param capability
 * @returns {string}
 */
export function createCapabilityFunctionString(capability, code) {
  const result = isServiceAdded(code || '', 'capabilities')
    ? ''
    : `const capabilities = getService('capabilities');\n`;
  const params = createCapabilityParameterString(capability);
  return `${result}
const ${
    capability.name.charAt(0).toLowerCase() + capability.name.slice(1)
  }Result = await capabilities.startCapability('${
    capability.schema ? capability.schema : capability.name
  }'${params ? `, ${params}` : ''});`;
}

/**
 * Checks if the given set of parameters satisfies a capability.
 *
 * @param capability: object describing capability
 * @param parameters: array of strings of parameter names
 * @return boolean
 */
export function isCapabilitySuitableForParameters(capability, parameters) {
  // check what parameters are required
  const requiredParameters = capability.parameters
    ? capability.parameters.filter((param) => param.required)
    : [];

  // if no parameters required, it's a candidate
  if (requiredParameters.length === 0) {
    return true;
  }

  // check if parameters have every single required one
  return requiredParameters.every(
    (requiredParameter) =>
      parameters.includes(requiredParameter.name) || parameters.includes(requiredParameter.schema)
  );
}

/**
 * Create the string to be pasted into the editor to get a process variable.
 *
 * @param variable
 * @returns {string}
 */
export function createVariableGetFunctionString() {
  return `variable.get('');\n`;
}

/**
 * Create the string to be pasted into the editor to set a process variable.
 *
 * @param variable
 * @returns {string}
 */
export function createVariableSetFunctionString(variable) {
  return `variable.set('', );\n`;
}

/**
 * Check if the code has a "next()" function call.
 *
 * @param code
 * @returns Boolean
 */
export function hasNextCall(code) {
  const res = /next\s*?\((?:.|\n)*?\);?/gm.exec(code);
  return res && res.length;
}

/**
 * Returns the capability element which matches either the name or the schema URI.
 *
 * @param capabilities
 * @param name
 * @returns {*}
 */
export function findCapabilitiesByName(capabilities, name) {
  // name can be PhotographAction => capability.name or https://www.schema.org/PhotographAction => capability.schema
  return capabilities.filter(
    (capability) => capability.name === name || capability.schema === name
  );
}
