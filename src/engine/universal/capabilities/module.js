const _ = require('lodash');

const NativeCapability = require('@proceed/system').capability;
const capabilitiesRoute = require('./routes/capabilitesRoute');

const parameterAndOutputParser = require('./parser/parameterAndOutputParser');
const createExpandedList = require('./parser/listParser/listParser');
const processDescriptionParser = require('./parser/listParser/processDescriptionParser');
const itemExists = require('./parser/listParser/itemExists');
const potentialAction = require('./parser/potentialActionParser');
const { ConfigurationError } = require('./error/configurationError');
const { NotFoundError } = require('./error/notFoundError');

/**
 * @module @proceed/capabilities
 */
const capabilities = {
  /**
   * For testing purposes init() function is used, so that the capabilities module
   * can be tested with several capability lists.
   *
   * @param {*} capabilityList
   * @memberof module:@proceed/capabilities
   * @private
   */
  init(capabilityList) {
    this.capabilityList = capabilityList;
    // this.capability = new NativeCapability();
  },

  /**
   * An async function that starts the capability module, gets the capability list
   * of the engine, checks for double occurences and calls the endpoint in order to
   * see all the capabilities of the engine
   *
   * @memberof module:@proceed/capabilities
   */
  async start() {
    this.capabilityList = await NativeCapability.getAllCapabilities();
    await this.checkDoubleOccurences();
    // eslint-disable-next-line max-len
    // new NativeCapability().registerForNewOrRemovedCapabilities(await this.capabilityListUpdate());
    capabilitiesRoute(this);
  },

  /**
   * A registered callback for registerForNewOrRemovedCapabilities which check if an item is
   * included or removed to the capability list
   * of the engine, if an item is tried to be added during runtime, a message is raised.
   *
   * @memberof module:@proceed/capabilities
   */

  async capabilityListUpdate(err, capabilityItem, status) {
    if (err) return;
    if (
      (await Promise.resolve(itemExists(capabilityItem, this.capabilityList))) &&
      status === 'new'
    ) {
      // eslint-disable-next-line no-console
      console.log('You cannnot add a new capability during runtime');
    }
    if (status === 'new') {
      this.capabilityList.push(capabilityItem);
    } else {
      this.capabilityList.splice(this.capabilityList.indexOf(capabilityItem), 1);
    }
  },

  /**
    A Function that checks for multiple occurences of the same capability item
    @param {list} capabilityList
    throw a configuration error and stops the engine in case there are multiple occurences

    @memberof module:@proceed/capabilities
  */

  async checkDoubleOccurences() {
    const expandedList = await Promise.all(createExpandedList(this.capabilityList));
    const flattenedList = _.flatten(expandedList.map((capabilityItem) => capabilityItem.expanded));
    const potentialActions = potentialAction.getPotentialActions(flattenedList);
    const uniqActions = _.uniq(potentialActions);
    if (potentialActions.length !== uniqActions.length) {
      throw new ConfigurationError(
        'The engine needs to stop! One machine can have only one capability for the same concept'
      );
    }
  },

  /**
    A Function that receives an capabilityName, arguments for the native function and a callback
    @param {string} capabilityName the URI of the capability name or only the action name
    @param {object} args the arguments needed for native function, parameter names
    are given as described in the semantic description
    @returns {object} the return item of the native function in the parsed form as described
    in the semantic description if there is there a callback from the native function then
    the function returns null

    @memberof module:@proceed/capabilities
  */

  async startCapability(capabilityName, args, callback) {
    const capObject = await potentialAction.findIdAndDesc(capabilityName, this.capabilityList);
    if (_.isEmpty(capObject)) {
      throw new NotFoundError(`${capabilityName} is not found. Please check your script task!`);
    }
    const mappedArgs = parameterAndOutputParser.parseArguments(args, capObject.expanded);
    const { identifier } = capObject;
    const output = await NativeCapability.executeNativeCapability(identifier, mappedArgs, callback);
    if (callback) {
      return null;
    }
    const { expanded } = capObject;
    return parameterAndOutputParser.parseOutput(expanded, output);
  },

  /**
      A Function that receives a processDescription and a capability desciption of an engine
      and checks whether the process description can be executed in the engine with the given
      capability description
      @param {list} processDescription
      @param {list} capabilityDescription
      @return boolean

      @memberof module:@proceed/capabilities
    */

  async isCapabilityExecutable(processDescription, capabilityDescription) {
    const expandedProcessDesc = await Promise.resolve(processDescriptionParser(processDescription));
    const processAction = potentialAction.getPotentialActions(expandedProcessDesc).find(() => true);
    const capObject = await potentialAction.findIdAndDesc(processAction, capabilityDescription);
    if (_.isEmpty(capObject)) {
      return false;
    }
    const allProcessParams = parameterAndOutputParser.getParams(expandedProcessDesc, false);
    const allCapObjectParams = parameterAndOutputParser.getParams(capObject.expanded, false);
    const reqProcessParams = parameterAndOutputParser.getParams(expandedProcessDesc, true);
    const reqCapObjectParams = parameterAndOutputParser.getParams(capObject.expanded, true);
    const processParamsCheck = _.difference(reqProcessParams, allCapObjectParams).length === 0;
    const capObjectParamsCheck = _.difference(reqCapObjectParams, allProcessParams).length === 0;
    if (processParamsCheck && capObjectParamsCheck) {
      if (parameterAndOutputParser.checkOutput(expandedProcessDesc, capObject.expanded)) {
        return true;
      }
    }
    return false;
  },

  /**
    A Function that receives a processDescription and checks whether the process
    is executable locally
    @param {list} processDescription
    @return boolean

    @memberof module:@proceed/capabilities
  */
  async isCapabilityLocallyExecutable(processDescription) {
    const executable = await Promise.resolve(
      this.isCapabilityExecutable(processDescription, this.capabilityList)
    );
    return executable;
  },
};

/*
 * not marked as module, because only the methods of the class are exported
 */
module.exports = capabilities;
