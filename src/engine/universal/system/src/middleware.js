/**
 * Recursive implementation of the query string parser (should only be called through parseRequestedEntries function)
 *
 * @param {string} queryEntryString
 * @returns {Array<number,object>} the number of elements parsed for the current list and the elements parsed from the current list
 */
function parseRequestedEntriesRecursive(queryEntryString) {
  const queriedEntries = {};

  let entryName = '';
  let entryValue = true;
  let currentChar = 0;

  // iterate through the string character by character
  for (currentChar = 0; currentChar < queryEntryString.length; ++currentChar) {
    const char = queryEntryString[currentChar];
    if (char === ',') {
      // we reached the end of the current entry which should be saved and the parsing information should be reset
      queriedEntries[entryName] = entryValue;
      entryName = '';
      entryValue = true;
    } else if (char === '(') {
      // we reached the start of a nested list => recursively parse the entries in the nested list
      let skip = 0;
      [skip, entryValue] = parseRequestedEntriesRecursive(
        queryEntryString.substring(currentChar + 1),
      );
      // forward the pointer to the char at the end of the sublist
      currentChar += skip + 1;
    } else if (char === ')') {
      // we reached the end of the nested list => break out of the loop and return the information
      break;
    } else {
      // we are still parsing the same entry => add char to the parsing information
      entryName += char;
    }
  }
  // add the element at the end of the list (since it is not followed by a ',')
  queriedEntries[entryName] = entryValue;
  // return the current position for cases where we are parsing a nested list (needed to forward the pointer in the calling function)
  return [currentChar, queriedEntries];
}

/**
 * Parses a query string that might be provided by a client so it can be used to filter the response to the request
 *
 * @param {String} queryEntryString the query string provided by the requesting party
 * @returns {Object} an object containing information about the entries that should be returned as a result of the request
 */
function parseRequestedEntries(queryEntryString) {
  return parseRequestedEntriesRecursive(queryEntryString)[1];
}

/**
 * Will filter the given information using the (possibly nested) list of requested attributes
 *
 * @param {object} fullInformation an object containing information returned by the handler of an endpoint
 * @param {object} requestedAttributes an object containing the entries that should be returned from the information object
 * @returns {object} an object containing the parts of the full information that are mentioned in the requestedAttributes
 */
function filterRequestedEntries(fullInformation, requestedAttributes) {
  // any primitive type cannot be filtered
  if (!fullInformation || typeof fullInformation !== 'object') {
    return fullInformation;
  } else if (Array.isArray(fullInformation)) {
    // if the element is an array => try to filter each of its entries
    return fullInformation.map((entry) => filterRequestedEntries(entry, requestedAttributes));
  } else {
    // filter the object
    return Object.fromEntries(
      Object.entries(fullInformation).reduce((final, [key, val]) => {
        if (requestedAttributes[key]) {
          // recursively filter any entries that have a nested list in the requestedAttributes
          if (typeof requestedAttributes[key] === 'object') {
            val = filterRequestedEntries(val, requestedAttributes[key]);
          }

          final.push([key, val]);
        }

        return final;
      }, []),
    );
  }
}

module.exports = {
  /**
   * Will enclose the handling function of an endpoint in another function that filters its return value
   * based on a user provided filtering
   *
   * Will execute the callback and return its result without any changes if no filtering is requested by the user
   *
   * @param {function} next the actual handler for the current endpoint
   * @returns {function} a function that will execute the endpoint handler with filtering of the returned values
   */
  wrapInFilterResponseMiddleware(next) {
    return async (req, ...args) => {
      const { entries } = req.query;

      if (entries) {
        req.requestedEntries = parseRequestedEntries(entries);
      }

      // execute the endpoint handler
      let ret = await next(req, ...args);

      // the value returned by the request handlers might either be the response itself or an object containing the response and information like the mime type and status code
      let response = ret;
      if (typeof ret === 'object') {
        ({ response } = ret);
      }

      // check if the response value is an object
      try {
        if (req.requestedEntries) {
          let parsedResponse = JSON.parse(response);

          parsedResponse = filterRequestedEntries(parsedResponse, req.requestedEntries);

          response = JSON.stringify(parsedResponse);
        }
      } catch (err) {}

      // if the returned value was an object => insert the filtered response
      if (typeof ret === 'object') {
        ret.response = response;
      } else {
        ret = response;
      }

      return ret;
    };
  },
};
